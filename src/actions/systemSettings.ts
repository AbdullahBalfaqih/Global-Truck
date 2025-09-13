
"use server";

import type { SystemSetting } from "@/types";
import { z } from "zod";
import { supabase } from "@/lib/db";
import { getSession } from "@/actions/auth";
import { revalidatePath } from "next/cache";

const SystemSettingsSchema = z.object({
    SystemName: z.string().min(1, "اسم النظام مطلوب.").max(100),
    LogoURL: z.string().url("رابط الشعار غير صالح.").or(z.literal('')).nullable().optional(),
    LabelInstructions: z.string().max(500).optional().nullable(),
    TrackingPrefix: z.string().max(10, "بادئة التتبع طويلة جدًا (الحد الأقصى 10 أحرف).").optional().nullable(),
    ManifestPrefix: z.string().max(10, "بادئة الكشف طويلة جدًا (الحد الأقصى 10 أحرف).").optional().nullable(),
    NextTrackingSequence: z.coerce.number().int().positive("الرقم التسلسلي للتتبع يجب أن يكون موجبًا.").optional().nullable(),
    NextManifestSequence: z.coerce.number().int().positive("الرقم التسلسلي للكشف يجب أن يكون موجبًا.").optional().nullable(),
    DefaultOriginBranchID: z.coerce.number().int().positive().optional().nullable(),
});

type SystemSettingsFormState = {
    message?: string;
    errors?: { [key: string]: string[] | undefined };
    success?: boolean;
    settings?: SystemSetting | null;
} | undefined;

export async function getSystemSettings(branchId?: number | null): Promise<SystemSetting | null> {
    const tenantId = branchId ? String(branchId) : 'default_tenant';
    try {
        const { data, error } = await supabase
            .from('SystemSettings')
            .select('*, Users(Name)')
            .eq('TenantID', tenantId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows were found, which is not a fatal error here.
            throw error;
        }

        if (data) {
            console.log(`Fetched system settings for tenant ${tenantId}.`);
            const settings = data as any;
            return {
                ...settings,
                UpdatedByUserName: settings.Users?.Name || 'غير معروف'
            } as SystemSetting;
        }

        console.log(`No system settings found for tenant ${tenantId}. Returning defaults.`);
        // Fallback to default settings if no record is found.
        return {
            TenantID: tenantId,
            SystemName: "جلوبال تراك",
            LogoURL: null,
            LabelInstructions: "يرجى التعامل مع الطرد بعناية.",
            TrackingPrefix: "GT",
            ManifestPrefix: "MAN",
            NextTrackingSequence: 100001,
            NextManifestSequence: 1,
            DefaultOriginBranchID: branchId || null,
            LastUpdatedAt: new Date().toISOString(),
            UpdatedByUserID: null,
            UpdatedByUserName: null
        };
    } catch (error: any) {
        console.error(`Database error fetching system settings for tenant ${tenantId}:`, error);
        if (error.message.includes("relation \"SystemSettings\" does not exist")) {
            console.error("======> The 'SystemSettings' table does not exist. Please create it. <=======");
        }
        return null;
    }
}

export async function updateSystemSettings(
    prevState: SystemSettingsFormState,
    formData: FormData
): Promise<SystemSettingsFormState> {
    const session = await getSession();
    // @ts-ignore
    if (!session?.userId) {
        return { success: false, message: "غير مصرح لك. يجب تسجيل الدخول." };
    }
    // @ts-ignore
    const currentUserId = session.userId;
    // @ts-ignore
    const userBranchId = session.branchId;

    const tenantId = userBranchId ? String(userBranchId) : 'default_tenant';

    const rawFormData = Object.fromEntries(formData.entries());

    const dataToValidate = {
        ...rawFormData,
        NextTrackingSequence: rawFormData.NextTrackingSequence ? Number(rawFormData.NextTrackingSequence) : null,
        NextManifestSequence: rawFormData.NextManifestSequence ? Number(rawFormData.NextManifestSequence) : null,
        DefaultOriginBranchID: rawFormData.DefaultOriginBranchID === "_none_" || !rawFormData.DefaultOriginBranchID ? null : Number(rawFormData.DefaultOriginBranchID),
        LogoURL: rawFormData.LogoURL === "" ? null : rawFormData.LogoURL,
        LabelInstructions: rawFormData.LabelInstructions === "" ? null : rawFormData.LabelInstructions,
        TrackingPrefix: rawFormData.TrackingPrefix === "" ? null : rawFormData.TrackingPrefix,
        ManifestPrefix: rawFormData.ManifestPrefix === "" ? null : rawFormData.ManifestPrefix,
    };

    const validatedFields = SystemSettingsSchema.safeParse(dataToValidate);

    if (!validatedFields.success) {
        return {
            success: false,
            message: "مدخلات غير صالحة. يرجى التحقق من الحقول.",
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { SystemName, LogoURL, LabelInstructions, TrackingPrefix, ManifestPrefix, NextTrackingSequence, NextManifestSequence, DefaultOriginBranchID } = validatedFields.data;

    const settingsDataToUpsert = {
        TenantID: tenantId,
        SystemName,
        LogoURL,
        LabelInstructions,
        TrackingPrefix,
        ManifestPrefix,
        NextTrackingSequence,
        NextManifestSequence,
        DefaultOriginBranchID,
        LastUpdatedAt: new Date().toISOString(),
        UpdatedByUserID: currentUserId,
    };

    try {
        const { error } = await supabase
            .from('SystemSettings')
            .upsert(settingsDataToUpsert, { onConflict: 'TenantID' });

        if (error) throw error;

        revalidatePath("/(authenticated)/tracking-settings", "page");

        const updatedSettings = await getSystemSettings(userBranchId);
        return { success: true, message: "تم تحديث إعدادات النظام بنجاح.", settings: updatedSettings };

    } catch (error: any) {
        console.error("Database error updating system settings:", error);
        return { success: false, message: `فشل تحديث الإعدادات: ${error.message}` };
    }
}
