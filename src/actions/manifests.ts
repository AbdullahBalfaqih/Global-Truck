// src/actions/manifests.ts
"use server";

import { z } from "zod";
import { supabase } from "@/lib/db";
import type { DeliveryManifest, Parcel, ParcelStatus, UserRole } from '@/types';
import { getSystemSettings } from "./systemSettings";
import { revalidatePath } from "next/cache";
import { getSession } from "@/actions/auth";

const CreateManifestSchema = z.object({
    ManifestID: z.string().min(1, "معرف الكشف مطلوب.").max(50),
    DriverID: z.string().min(1, "معرف السائق مطلوب.").max(50),
    City: z.string().min(1, "اسم المدينة مطلوب.").max(100),
    ParcelIDs: z.array(z.string().min(1).max(50)).min(1, "يجب تحديد طرد واحد على الأقل."),
    Status: z.enum(['قيد المعالجة', 'تم الطباعة', 'قيد التوصيل', 'مكتمل', 'ملغي']).default('تم الطباعة'),
});

export type ManifestFormState = {
    message?: string;
    errors?: { [key: string]: string[] | undefined };
    success?: boolean;
    manifest?: DeliveryManifest;
};

export async function createDeliveryManifest(
    driverId: string,
    city: string,
    parcelIds: string[]
): Promise<ManifestFormState> {
    const session = await getSession();
    // @ts-ignore
    const userBranchId = session?.branchId;
    if (!userBranchId) {
        return { success: false, message: "لا يمكن إنشاء كشف بدون فرع محدد للمستخدم." };
    }

    try {
        // Step 1: Get system settings to generate the next manifest ID
        const settings = await getSystemSettings(userBranchId);
        if (!settings || !settings.ManifestPrefix || !settings.NextManifestSequence) {
            return { success: false, message: "فشل إنشاء الكشف: لم يتم تكوين إعدادات ترقيم الكشوفات في النظام." };
        }
        const manifestId = `${settings.ManifestPrefix}${settings.NextManifestSequence}`;

        // Step 2: Insert the new manifest
        const { error: manifestError } = await supabase.from('DeliveryManifests').insert({
            ManifestID: manifestId,
            DriverID: driverId,
            City: city,
            Status: 'تم الطباعة',
            BranchID: userBranchId,
            PrintDate: new Date().toISOString()
        });

        if (manifestError) {
            if (manifestError.code === '23505') { // unique_violation
                return { success: false, message: `فشل إنشاء الكشف: معرف الكشف المولد '${manifestId}' موجود بالفعل. الرجاء محاولة مرة أخرى.` };
            }
            throw manifestError;
        }

        // Step 3 & 4: Link parcels and update their status
        const parcelUpdates = parcelIds.map(parcelId =>
            supabase.from('Parcels').update({
                Status: 'قيد النقل',
                AssignedDriverID: driverId
            }).eq('ParcelID', parcelId)
        );
        const manifestParcelLinks = parcelIds.map(parcelId => ({
            ManifestID: manifestId,
            ParcelID: parcelId
        }));

        const [updateResults, linkResult] = await Promise.all([
            Promise.all(parcelUpdates),
            supabase.from('ManifestParcels').insert(manifestParcelLinks)
        ]);

        const updateError = updateResults.find(res => res.error);
        if (updateError) throw updateError.error;
        if (linkResult.error) throw linkResult.error;

        // Step 5: Update the next manifest sequence number
        const newSequence = settings.NextManifestSequence + 1;
        const { error: settingsError } = await supabase
            .from('SystemSettings')
            .update({ NextManifestSequence: newSequence })
            .eq('TenantID', settings.TenantID);

        if (settingsError) {
            console.error("Error updating manifest sequence, but manifest was created:", settingsError);
            // Non-critical, proceed but log the error
        }

        revalidatePath("/operations");
        const createdManifest = await getManifestDetailsForPrint(manifestId);

        return { success: true, message: `تم إنشاء كشف التوصيل ${manifestId} بنجاح.`, manifest: createdManifest || undefined };

    } catch (error: any) {
        console.error("Error creating delivery manifest:", error);
        return { success: false, message: `فشل إنشاء كشف التوصيل: ${error.message}` };
    }
}


export async function getAllManifestsWithDetails(branchId?: number | null): Promise<DeliveryManifest[]> {
    try {
        let query = supabase
            .from('DeliveryManifests')
            .select(`
                *,
                Drivers ( Name ),
                ManifestParcels ( Parcels ( * ) )
            `)
            .order('CreatedAt', { ascending: false });

        if (branchId !== undefined && branchId !== null) {
            query = query.eq('BranchID', branchId);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Transform the data to match the expected DeliveryManifest structure
        return data.map(item => ({
            ...item,
            DriverName: item.Drivers?.Name || 'غير معروف',
            Parcels: item.ManifestParcels.map((mp: any) => mp.Parcels)
        })) as DeliveryManifest[];

    } catch (error: any) {
        console.error("Database error fetching all manifests with details:", error);
        return [];
    }
}

export async function getAllActiveManifests(branchId?: number | null, userRole?: UserRole): Promise<DeliveryManifest[]> {
    try {
        let query = supabase
            .from('DeliveryManifests')
            .select(`
                *,
                Drivers ( Name ),
                ManifestParcels ( Parcels ( * ) )
            `)
            .not('Status', 'in', '("مكتمل", "ملغي")')
            .order('CreatedAt', { ascending: false });

        if ((userRole === 'BranchEmployee' || userRole === 'Admin') && branchId) {
            query = query.eq('BranchID', branchId);
        }

        const { data, error } = await query;
        if (error) throw error;

        return data.map(item => ({
            ...item,
            DriverName: item.Drivers?.Name || 'غير معروف',
            Parcels: item.ManifestParcels.map((mp: any) => mp.Parcels)
        })) as DeliveryManifest[];

    } catch (error) {
        console.error("Error in getAllActiveManifests:", error);
        return [];
    }
}

export async function getManifestById(manifestId: string): Promise<DeliveryManifest | null> {
    try {
        const { data, error } = await supabase
            .from('DeliveryManifests')
            .select(`
                *,
                Drivers ( Name ),
                ManifestParcels ( Parcels ( * ) )
            `)
            .eq('ManifestID', manifestId)
            .single();

        if (error) throw error;
        if (!data) return null;

        return {
            ...data,
            DriverName: data.Drivers?.Name || 'غير معروف',
            Parcels: data.ManifestParcels.map((mp: any) => mp.Parcels)
        } as DeliveryManifest;

    } catch (error) {
        console.error("Error fetching manifest by ID:", error);
        return null;
    }
}

export async function updateManifestStatus(manifestId: string, newStatus: 'مكتمل' | 'ملغي'): Promise<ManifestFormState> {
    try {
        // الخطوة 1: الحصول على معرفات الطرود المرتبطة بالكشف
        const { data: manifestParcels, error: parcelsError } = await supabase
            .from('ManifestParcels')
            .select('ParcelID')
            .eq('ManifestID', manifestId);

        if (parcelsError) throw parcelsError;
        if (!manifestParcels || manifestParcels.length === 0) {
            return { success: false, message: `لم يتم العثور على طرود مرتبطة بالكشف رقم ${ manifestId }.` };
        }

        const parcelIds = manifestParcels.map(p => p.ParcelID);

        // الخطوة 2: تحديد حالة الطرد الجديدة بناءً على حالة الكشف
        const newParcelStatus = newStatus === 'مكتمل' ? 'تم التوصيل' : 'قيد المعالجة';

        // الخطوة 3: تحديث حالة الطرود
        const { error: updateParcelsError } = await supabase
            .from('Parcels')
            .update({ 
                Status: newParcelStatus,
                // إزالة تعيين السائق إذا تم إلغاء الكشف
                AssignedDriverID: newStatus === 'ملغي' ? null : undefined
            })
            .in('ParcelID', parcelIds);

        if (updateParcelsError) throw updateParcelsError;

        // الخطوة 4: تحديث حالة الكشف
        const { error: updateManifestError } = await supabase
            .from('DeliveryManifests')
            .update({ Status: newStatus })
            .eq('ManifestID', manifestId);

        if (updateManifestError) throw updateManifestError;

        revalidatePath("/operations");
        const updatedManifest = await getManifestDetailsForPrint(manifestId);
        return { success: true, message: `تم تحديث حالة الكشف ${ manifestId } بنجاح.`, manifest: updatedManifest || undefined };

    } catch (error: any) {
        console.error("Error updating manifest status:", error);
        return { success: false, message: `فشل تحديث حالة الكشف: ${ error.message } ` };
    }
}

// ---

export async function getManifestDetailsForPrint(manifestId: string): Promise<DeliveryManifest | null> {
    try {
        const { data, error } = await supabase
            .from('DeliveryManifests')
            .select(`
    *,
    Drivers(Name),
    ManifestParcels(Parcels( * ))
        `)
            .eq('ManifestID', manifestId)
            .single();

        if (error) throw error;
        if (!data) return null;

        return {
            ...data,
            DriverName: data.Drivers?.Name || 'غير معروف',
            Parcels: data.ManifestParcels.map((mp: any) => mp.Parcels)
        } as DeliveryManifest;
    } catch (error: any) {
        console.error(`Database error fetching manifest ${ manifestId } for print.Full error object: `, error);
        return null;
    }
}

export async function deleteDeliveryManifest(manifestId: string): Promise<{ success: boolean; message: string }> {
    if (!manifestId) return { success: false, message: "معرف الكشف غير صالح." };

    try {
        // الخطوة 1: الحصول على الطرود المرتبطة بالكشف
        const { data: manifestParcels, error: parcelsError } = await supabase
            .from('ManifestParcels')
            .select('ParcelID')
            .eq('ManifestID', manifestId);

        if (parcelsError) throw parcelsError;
        const parcelIds = manifestParcels.map(p => p.ParcelID);

        // الخطوة 2: إعادة حالة الطرود إلى "قيد المعالجة" وإزالة تعيين السائق
        const { error: revertParcelsError } = await supabase
            .from('Parcels')
            .update({ Status: 'قيد المعالجة', AssignedDriverID: null })
            .in('ParcelID', parcelIds);

        if (revertParcelsError) throw revertParcelsError;

        // الخطوة 3: حذف الروابط بين الكشف والطرود
        const { error: deleteLinksError } = await supabase
            .from('ManifestParcels')
            .delete()
            .eq('ManifestID', manifestId);

        if (deleteLinksError) throw deleteLinksError;

        // الخطوة 4: حذف الكشف نفسه
        const { error: deleteManifestError } = await supabase
            .from('DeliveryManifests')
            .delete()
            .eq('ManifestID', manifestId);

        if (deleteManifestError) throw deleteManifestError;

        revalidatePath("/operations");
        return { success: true, message: `تم حذف الكشف رقم ${ manifestId } وإعادة الطرود للحالة السابقة بنجاح.` };

    } catch (error: any) {
        console.error("Delete Manifest DB Error:", error);
        return { success: false, message: `فشل حذف الكشف: ${ error.message } ` };
    }
}