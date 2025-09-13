"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/db";
// Dexie is no longer needed here, it's a client-side library
// import { db } from "@/lib/db"; 
import type { AddParcelFormState, PaymentType, ParcelStatus, Parcel } from "@/types";
import { getSession } from "./auth";


// Zod schemas for validation
const ParcelSchema = z.object({
    TrackingNumber: z.string().min(1),
    SenderName: z.string().min(1),
    SenderPhone: z.string().min(1),
    ReceiverName: z.string().min(1),
    ReceiverPhone: z.string().min(1),
    ReceiverCity: z.string().min(1),
    ReceiverDistrict: z.string().min(1),
    OriginBranchID: z.coerce.number().int().positive(),
    DestinationBranchID: z.coerce.number().int().positive(),
    Notes: z.string().optional(),
    ShippingCost: z.coerce.number().nonnegative(),
    ShippingTax: z.coerce.number().nonnegative().optional().nullable(),
    PaymentType: z.string().min(1) as z.ZodType<PaymentType>,
    IsPaid: z.coerce.boolean(),
    AssignedDriverID: z.any().optional(),
    IsPickedUpByReceiver: z.coerce.boolean(),
});

const UpdateParcelSchema = ParcelSchema.extend({
    ParcelID: z.string().min(1, "معرف الطرد مطلوب للتحديث."),
});


export async function getAllParcels(): Promise<Parcel[]> {
    // This function will now only fetch from Supabase.
    // The client-side component will be responsible for handling offline fallback.
    const { data, error } = await supabase
        .from('Parcels')
        .select('*')
        .order('CreatedAt', { ascending: false });

    if (error) {
        console.error("Supabase fetch failed for parcels:", error.message);
        // Throw the error so the client can catch it and use Dexie
        throw new Error(`Supabase fetch failed: ${error.message}`);
    }

    return data as Parcel[];
}


export async function addParcel(
    formData: FormData
): Promise<AddParcelFormState> {
    const rawFormData = Object.fromEntries(formData.entries());

    // Clean up empty strings before validation
    if (rawFormData.ShippingTax === "") rawFormData.ShippingTax = "0";
    if (rawFormData.Notes === "") delete rawFormData.Notes;
    if (rawFormData.SenderPhone === "") delete rawFormData.SenderPhone;
    if (rawFormData.ReceiverPhone === "") delete rawFormData.ReceiverPhone;

    const validatedFields = ParcelSchema.safeParse(rawFormData);
    if (!validatedFields.success) {
        console.error("Add Parcel (Server Action): Zod validation error", validatedFields.error.flatten().fieldErrors);
        return {
            message: "فشلت عملية التحقق من البيانات. يرجى مراجعة الحقول.",
            errors: validatedFields.error.flatten().fieldErrors,
            success: false,
        };
    }

    const session = await getSession();
    // @ts-ignore
    const currentUserID = session?.userId;
    if (!currentUserID) {
        return { success: false, message: "الجلسة غير صالحة. الرجاء تسجيل الدخول مرة أخرى." };
    }

    const data = validatedFields.data;

    const parcelDataForDB = {
        ParcelID: data.TrackingNumber, // Using tracking number as primary key
        TrackingNumber: data.TrackingNumber,
        SenderName: data.SenderName,
        SenderPhone: data.SenderPhone || null,
        ReceiverName: data.ReceiverName,
        ReceiverPhone: data.ReceiverPhone || null,
        ReceiverCity: data.ReceiverCity,
        ReceiverDistrict: data.ReceiverDistrict,
        OriginBranchID: data.OriginBranchID,
        DestinationBranchID: data.DestinationBranchID,
        Status: "قيد المعالجة" as ParcelStatus,
        Notes: data.Notes || null,
        ShippingCost: data.ShippingCost,
        ShippingTax: data.ShippingTax ?? 0,
        DriverCommission: data.ShippingCost * 0.70,
        PaymentType: data.PaymentType,
        IsPaid: data.PaymentType === "Prepaid" || data.PaymentType === "Postpaid",
        AssignedDriverID: data.AssignedDriverID ?? null,
        IsPickedUpByReceiver: false,
        // Let Supabase handle timestamps CreatedAt and UpdatedAt
    };

    try {
        // Step 1: Insert the new parcel into the 'Parcels' table.
        const { error: parcelError } = await supabase.from('Parcels').insert(parcelDataForDB);

        if (parcelError) {
            console.error("Add Parcel (Server Action): Supabase error inserting parcel:", parcelError);
            if (parcelError.code === '23505') { // Unique key violation
                return { message: `رقم التتبع ${parcelDataForDB.TrackingNumber} موجود بالفعل.`, errors: { TrackingNumber: [`رقم التتبع ${parcelDataForDB.TrackingNumber} موجود بالفعل.`] }, success: false, };
            }
            return { message: `فشل إضافة الطرد: ${parcelError.message}`, success: false, };
        }

        // Step 2: On successful parcel insertion, update the tracking number sequence.
        const trackingNumberNumeric = parseInt(data.TrackingNumber.match(/\d+$/)?.[0] || '0', 10);
        const newNextSequence = trackingNumberNumeric + 1;

        const { error: settingsError } = await supabase
            .from('SystemSettings')
            .update({ NextTrackingSequence: newNextSequence })
            .eq('TenantID', data.OriginBranchID) 
 // ✅ تم التعديل إلى 'TenantID' (بحرف D كبير) والقيمة إلى 3.

        if (settingsError) {
            console.error("Add Parcel (Server Action): Supabase error updating system settings:", settingsError);
            // We return success here because the parcel was added successfully.
            // The tracking number sequence update is a secondary, non-critical operation for the user's immediate request.
        }

        // Handle related tables (Debts, CashTransactions)
        if (data.PaymentType === "Postpaid") {
            const { error: debtError } = await supabase
                .from('Debts')
                .insert({
                    ParcelID: parcelDataForDB.ParcelID,
                    DebtorType: "Customer",
                    DebtorID: parcelDataForDB.SenderName,
                    DebtorName: parcelDataForDB.SenderName,
                    Amount: data.ShippingCost,
                    Status: "Outstanding",
                    DebtMovementType: 'Debtor',
                    CreatedAt: new Date().toISOString(),
                    InitiatingBranchID: data.OriginBranchID, // معرف الفرع الحالي أو الفرع الذي أضاف العميل
                });

            if (debtError) console.error("Supabase error inserting debt:", debtError);
        }
        if (data.PaymentType === "Postpaid" || data.PaymentType === "Prepaid") {
            const { error: cashError } = await supabase
                .from('CashTransactions')
                .insert({
                    TransactionType: 'Income',
                    Amount: data.ShippingCost,
                    Description: `إيراد طرد: ${parcelDataForDB.ParcelID}`,
                    BranchID: parcelDataForDB.OriginBranchID,
                    TransactionDate: new Date().toISOString(),
                    AddedByUserID: currentUserID,
                });
            if (cashError) console.error("Supabase error inserting cash transaction:", cashError);
        }

        revalidatePath("/parcels/list");
        revalidatePath("/cashbox");
        revalidatePath("/debts");

        return {
            message: `تمت إضافة الطرد بنجاح.`,
            success: true,
            trackingNumber: data.TrackingNumber,
        };

    } catch (error: any) {
        console.error("Add Parcel (Server Action): Unexpected error", error);
        return { message: `حدث خطأ غير متوقع: ${error.message}`, success: false, };
    }
}


export async function updateParcel(
    prevState: AddParcelFormState,
    formData: FormData
): Promise<AddParcelFormState> {
    // This action should also be adapted for offline-first, but we'll focus on create first.
    // For now, it remains online-only.
    const rawFormData = Object.fromEntries(formData.entries());

    if (rawFormData.ShippingTax === "") rawFormData.ShippingTax = "0";
    if (rawFormData.Notes === "") delete rawFormData.Notes;
    if (rawFormData.SenderPhone === "") delete rawFormData.SenderPhone;
    if (rawFormData.ReceiverPhone === "") delete rawFormData.ReceiverPhone;

    const validatedFields = UpdateParcelSchema.safeParse(rawFormData);
    if (!validatedFields.success) {
        return {
            message: "فشلت عملية التحقق من البيانات. يرجى مراجعة الحقول.",
            errors: validatedFields.error.flatten().fieldErrors,
            success: false,
        };
    }
    const data = validatedFields.data;
    const updateData: Partial<Parcel> = {
        TrackingNumber: data.TrackingNumber,
        SenderName: data.SenderName,
        SenderPhone: data.SenderPhone || null,
        ReceiverName: data.ReceiverName,
        ReceiverPhone: data.ReceiverPhone || null,
        ReceiverCity: data.ReceiverCity,
        ReceiverDistrict: data.ReceiverDistrict,
        OriginBranchID: data.OriginBranchID,
        DestinationBranchID: data.DestinationBranchID,
        Notes: data.Notes || null,
        ShippingCost: data.ShippingCost,
        ShippingTax: data.ShippingTax ?? 0,
        DriverCommission: data.ShippingCost * 0.70,
        PaymentType: data.PaymentType,
        IsPaid: data.PaymentType === 'Prepaid' || data.PaymentType === 'Postpaid',
        UpdatedAt: new Date().toISOString(),
    };

    try {
        const { error } = await supabase
            .from('Parcels')
            .update(updateData)
            .eq('ParcelID', data.ParcelID);

        if (error) {
            throw error;
        }

        revalidatePath("/parcels/list");

        return { success: true, message: `تم تحديث الطرد ${data.TrackingNumber} بنجاح.` };

    } catch (error: any) {
        console.error("Update Parcel Action: Unexpected error updating parcel.", error);
    }
}
