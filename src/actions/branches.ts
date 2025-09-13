
"use server";

import type { Branch, BranchForSelect } from "@/types";
import { z } from "zod";
import { supabase } from "@/lib/db";
import { revalidatePath } from "next/cache";

const BranchSchema = z.object({
    Name: z.string().min(3, "يجب أن لا يقل اسم الفرع عن 3 أحرف."),
    City: z.string().min(2, "يجب أن لا تقل اسم المدينة عن حرفين."),
    Address: z.string().min(5, "يجب أن لا يقل العنوان عن 5 أحرف."),
    Phone: z.string().regex(/^\d{9,15}$/, "يجب أن يكون رقم الهاتف صالحًا ويتكون من 9 إلى 15 رقمًا.").optional().or(z.literal('')),
    GoogleMapsLink: z.string().refine(
        (val) =>
            val === '' ||
            !val ||
            /^https?:\/\/.+/.test(val) || // URL
            /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(val), // Coordinates
        {
            message: 'يرجى إدخال رابط صحيح أو إحداثيات بصيغة: 15.3367, 44.1910',
        }
    ).optional().or(z.literal('')),
});

type BranchFormState = {
    message?: string;
    errors?: {
        Name?: string[];
        City?: string[];
        Address?: string[];
        Phone?: string[];
        GoogleMapsLink?: string[];
        _form?: string[];
    };
    success?: boolean;
};

export async function createBranch(prevState: BranchFormState | undefined, formData: FormData): Promise<BranchFormState> {
    const rawFormData = Object.fromEntries(formData.entries());
    const validatedFields = BranchSchema.safeParse({
        Name: rawFormData.Name,
        City: rawFormData.City,
        Address: rawFormData.Address,
        Phone: rawFormData.Phone,
        GoogleMapsLink: rawFormData.GoogleMapsLink,
    });

    if (!validatedFields.success) {
        return {
            message: "مدخلات غير صالحة. يرجى التحقق من الحقول.",
            errors: validatedFields.error.flatten().fieldErrors,
            success: false,
        };
    }

    const { Name, City, Address, Phone, GoogleMapsLink } = validatedFields.data;

    const { error } = await supabase.from('Branches').insert({
        Name,
        City,
        Address,
        Phone: Phone || null,
        GoogleMapsLink: GoogleMapsLink || null,
    });

    if (error) {
        console.error("Supabase error creating branch:", error);
        return { message: `فشل إنشاء الفرع: ${error.message}`, success: false, errors: { _form: [error.message] } };
    }

    revalidatePath('/branches');
    return { message: `تمت إضافة الفرع "${Name}" بنجاح.`, success: true };
}

export async function updateBranch(prevState: BranchFormState | undefined, formData: FormData): Promise<BranchFormState> {
    const branchId = formData.get('BranchID');
    if (!branchId) {
        return { success: false, message: "معرف الفرع مفقود." };
    }

    const rawFormData = Object.fromEntries(formData.entries());
    const validatedFields = BranchSchema.safeParse(rawFormData);

    if (!validatedFields.success) {
        return {
            success: false,
            message: "مدخلات غير صالحة. يرجى التحقق من الحقول.",
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { Name, City, Address, Phone, GoogleMapsLink } = validatedFields.data;

    const { error } = await supabase
        .from('Branches')
        .update({
            Name,
            City,
            Address,
            Phone: Phone || null,
            GoogleMapsLink: GoogleMapsLink || null,
            UpdatedAt: new Date().toISOString(),
        })
        .eq('BranchID', branchId);

    if (error) {
        return { success: false, message: `فشل تحديث الفرع: ${error.message}` };
    }

    revalidatePath('/branches');
    return { success: true, message: `تم تحديث الفرع "${Name}" بنجاح.` };
}

export async function getAllBranches(): Promise<Branch[]> {
    const { data, error } = await supabase.from('Branches').select('*').order('Name');
    if (error) {
        console.error("Supabase error fetching all branches:", error);
        return [];
    }
    return data as Branch[];
}

export async function getBranchesForSelect(): Promise<BranchForSelect[]> {
    const { data, error } = await supabase.from('Branches').select('BranchID, Name, City').order('Name');
    if (error) {
        console.error("Supabase error fetching branches for select:", error);
        return [];
    }
    return data as BranchForSelect[];
}

export async function deleteBranch(branchID: number): Promise<{ success: boolean; message: string; }> {
    const { data, error } = await supabase
        .from('Parcels')
        .select('ParcelID')
        .or(`OriginBranchID.eq.${branchID},DestinationBranchID.eq.${branchID}`)
        .limit(1);

    if (error) {
        return { success: false, message: `خطأ عند التحقق من الطرود: ${error.message}` };
    }
    if (data && data.length > 0) {
        return { success: false, message: "لا يمكن حذف الفرع لوجود طرود مرتبطة به." };
    }

    const { error: deleteError } = await supabase.from('Branches').delete().eq('BranchID', branchID);

    if (deleteError) {
        return { success: false, message: `فشل حذف الفرع: ${deleteError.message}` };
    }

    revalidatePath('/branches');
    return { success: true, message: "تم حذف الفرع بنجاح." };
}
