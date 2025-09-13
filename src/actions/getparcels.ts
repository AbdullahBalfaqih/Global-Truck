
"use server";

import { z } from "zod";
import type { AddParcelFormState, PaymentType, ParcelStatus, Parcel, Branch, UserRole, ParcelsByStatusData } from "@/types";
import { revalidatePath } from "next/cache";
import { getSession } from "@/actions/auth";
import { supabase } from "@/lib/db";


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
    ShippingTax: z.coerce.number().nonnegative(),
    PaymentType: z.string().min(1),
    IsPaid: z.coerce.boolean(),
    AssignedDriverID: z.any().optional(),
    IsPickedUpByReceiver: z.coerce.boolean(),
});


const UpdateParcelSchema = ParcelSchema.extend({
    ParcelID: z.string().min(1, "معرف الطرد مطلوب للتحديث."),
});

export async function addParcel(
    prevState: AddParcelFormState,
    formData: FormData
): Promise<AddParcelFormState> {
    const rawFormData = Object.fromEntries(formData.entries());

    if (rawFormData.ShippingTax === "") rawFormData.ShippingTax = "0";
    if (rawFormData.Notes === "") delete rawFormData.Notes;
    if (rawFormData.SenderPhone === "") delete rawFormData.SenderPhone;
    if (rawFormData.ReceiverPhone === "") delete rawFormData.ReceiverPhone;

    const validatedFields = ParcelSchema.safeParse(rawFormData);
    if (!validatedFields.success) {
        return {
            message: "فشلت عملية التحقق من البيانات. يرجى مراجعة الحقول.",
            errors: validatedFields.error.flatten().fieldErrors,
            success: false,
        };
    }

    const session = await getSession();
    // @ts-ignore
    const currentUserID = session?.userId ? parseInt(session.userId, 10) : null;
    if (!currentUserID) {
        return { success: false, message: "المستخدم غير مسجل الدخول أو أن الجلسة غير صالحة." };
    }

    const data = validatedFields.data;
    const isParcelPaid = data.PaymentType === "Prepaid";
    const driverCommission = data.ShippingCost * 0.70;

    const parcelDataForDB = {
        ParcelID: data.TrackingNumber,
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
        DriverCommission: driverCommission,
        PaymentType: data.PaymentType as PaymentType,
        IsPaid: isParcelPaid,
        AssignedDriverID: data.AssignedDriverID ?? null,
        IsPickedUpByReceiver: false,
        AddedByUserID: currentUserID,
    };

    const { error: parcelError } = await supabase.from('Parcels').insert(parcelDataForDB);

    if (parcelError) {
        console.error("Supabase error adding parcel:", parcelError);
        if (parcelError.code === '23505') { // Unique key violation
            return {
                message: `رقم التتبع ${parcelDataForDB.TrackingNumber} موجود بالفعل.`,
                errors: { TrackingNumber: [`رقم التتبع ${parcelDataForDB.TrackingNumber} موجود بالفعل.`] },
                success: false,
            };
        }
        return {
            message: `فشل إضافة الطرد: ${parcelError.message}`,
            success: false,
        };
    }

    if (data.PaymentType === "Postpaid") {
        const { error: debtError } = await supabase.from('Debts').insert({
            ParcelID: parcelDataForDB.ParcelID,
            DebtorType: "Customer",
            DebtorID: data.SenderName,
            DebtorName: data.SenderName,
            Amount: data.ShippingCost,
            Status: "Outstanding",
            DebtMovementType: 'Debtor'
        });
        if (debtError) console.error("Supabase error adding debt:", debtError);
    }

    if (isParcelPaid) {
        const { error: cashError } = await supabase.from('CashTransactions').insert({
            TransactionType: 'Income',
            Amount: data.ShippingCost,
            Description: `إيراد طرد: ${parcelDataForDB.ParcelID}`,
            BranchID: parcelDataForDB.OriginBranchID,
            TransactionDate: new Date().toISOString(),
            AddedByUserID: currentUserID
        });
        if (cashError) console.error("Supabase error adding cash transaction:", cashError);
    }

    revalidatePath("/parcels/list");
    revalidatePath("/cashbox");
    revalidatePath("/debts");

    return {
        message: `تمت إضافة الطرد برقم تتبع ${data.TrackingNumber} بنجاح.`,
        success: true,
        trackingNumber: data.TrackingNumber,
    };
}

export async function updateParcel(prevState: AddParcelFormState, formData: FormData): Promise<AddParcelFormState> {
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

    const { error } = await supabase
        .from('Parcels')
        .update({
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
            DriverCommission: data.ShippingCost * 0.70, // Recalculate
            PaymentType: data.PaymentType as PaymentType,
            IsPaid: data.PaymentType === 'Prepaid',
            UpdatedAt: new Date().toISOString()
        })
        .eq('ParcelID', data.ParcelID);

    if (error) {
        console.error("Supabase error updating parcel:", error);
        return { success: false, message: `فشل تحديث الطرد: ${error.message}` };
    }

    revalidatePath("/parcels/list");
    return { success: true, message: `تم تحديث الطرد ${data.TrackingNumber} بنجاح.` };
}

export async function getAllParcels(): Promise<Parcel[]> {
    const { data, error } = await supabase.from('Parcels').select('*').order('CreatedAt', { ascending: false });
    if (error) {
        console.error("Supabase error fetching all parcels:", error);
        return [];
    }
    return data as Parcel[];
}

export async function getParcelsForAssignment(userBranchId: number | null, userRole: UserRole): Promise<Parcel[]> {
    let query = supabase.from('Parcels').select('*').eq('Status', 'قيد المعالجة').is('AssignedDriverID', null);

    if ((userRole === 'Admin' || userRole === 'BranchEmployee') && userBranchId) {
        query = query.eq('OriginBranchID', userBranchId);
    }

    const { data, error } = await query.order('CreatedAt', { ascending: false });

    if (error) {
        console.error("Supabase error fetching parcels for assignment:", error);
        return [];
    }
    return data as Parcel[];
}

export async function getParcelByTrackingNumber(trackingNumber: string): Promise<{
    parcel: Parcel | null,
    originBranch: Branch | null,
    destinationBranch: Branch | null
}> {
    const { data: parcel, error } = await supabase
        .from('Parcels')
        .select('*')
        .or(`TrackingNumber.eq.${trackingNumber},ParcelID.eq.${trackingNumber}`)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error("Supabase error getting parcel by tracking number:", error);
        return { parcel: null, originBranch: null, destinationBranch: null };
    }

    if (!parcel) {
        return { parcel: null, originBranch: null, destinationBranch: null };
    }

    // ✅ جلب الفرع الأصلي
    const { data: originBranch } = await supabase
        .from('Branches')
        .select('*')
        .eq('BranchID', parcel.OriginBranchID)
        .single();

    // ✅ جلب فرع الوجهة
    const { data: destinationBranch } = await supabase
        .from('Branches')
        .select('*')
        .eq('BranchID', parcel.DestinationBranchID)
        .single();

    return {
        parcel: parcel as Parcel,
        originBranch: originBranch as Branch,
        destinationBranch: destinationBranch as Branch
    };
}


export async function getParcelForCustomer(trackingNumber: string, receiverPhone: string): Promise<Parcel | null> {
    const { data, error } = await supabase.from('Parcels').select('*').or(`TrackingNumber.eq.${trackingNumber},ParcelID.eq.${trackingNumber}`).eq('ReceiverPhone', receiverPhone).single();
    if (error && error.code !== 'PGRST116') {
        console.error("Supabase error getting parcel for customer:", error);
    }
    return data || null;
}

export async function deleteParcel(parcelID: string): Promise<{ success: boolean; message: string; }> {
    const { error } = await supabase.from('Parcels').delete().eq('ParcelID', parcelID);
    if (error) {
        console.error("Supabase error deleting parcel:", error);
        return { success: false, message: `فشل حذف الطرد: ${error.message}` };
    }
    revalidatePath("/parcels/list");
    return { success: true, message: "تم حذف الطرد بنجاح." };
}

export async function markParcelAsPaid(parcelId: string): Promise<{ success: boolean; message: string; }> {
    const session = await getSession();
    // @ts-ignore
    const userId = session?.userId;
    if (!userId) {
        return { success: false, message: "المستخدم غير مسجل دخول." };
    }

    const { data: parcel, error: fetchError } = await supabase.from('Parcels').select('*').eq('ParcelID', parcelId).single();
    if (fetchError || !parcel) {
        return { success: false, message: "لم يتم العثور على الطرد." };
    }
    if (parcel.IsPaid) {
        return { success: false, message: "هذا الطرد مسجل كمدفوع مسبقاً." };
    }

    const { error: updateError } = await supabase.from('Parcels').update({ IsPaid: true, UpdatedAt: new Date().toISOString() }).eq('ParcelID', parcelId);
    if (updateError) {
        return { success: false, message: `فشل تحديث حالة الدفع: ${updateError.message}` };
    }

    if (parcel.PaymentType === 'COD') {
        const { error: cashError } = await supabase.from('CashTransactions').insert({
            TransactionType: 'Income',
            Amount: parcel.ShippingCost,
            Description: `تحصيل مبلغ الطرد رقم: ${parcel.TrackingNumber}`,
            BranchID: parcel.DestinationBranchID,
            TransactionDate: new Date().toISOString(),
            AddedByUserID: userId
        });
        if (cashError) console.error("Supabase error adding cash transaction on COD payment:", cashError);
    }

    revalidatePath("/(authenticated)/parcels/pickup", "page");
    revalidatePath("/cashbox");
    return { success: true, message: `تم تسجيل دفع الطرد ${parcelId} بنجاح.` };
}

export async function markParcelAsPickedUp(parcelID: string): Promise<{ success: boolean; message: string }> {
    const { error } = await supabase.from('Parcels').update({ IsPickedUpByReceiver: true, Status: 'تم التسليم', UpdatedAt: new Date().toISOString() }).eq('ParcelID', parcelID);
    if (error) {
        return { success: false, message: `فشل تحديث حالة الاستلام: ${error.message}` };
    }
    revalidatePath("/(authenticated)/parcels/pickup", "page");
    return { success: true, message: "تم تحديث حالة الطرد إلى (تم التسليم)" };
}

export async function updateParcelStatus(parcelId: string, newStatus: ParcelStatus, newAssignedDriverId?: string | null): Promise<{ success: boolean; message: string }> {
    const updateData: Partial<Parcel> = { Status: newStatus, UpdatedAt: new Date().toISOString() };
    if (newAssignedDriverId !== undefined) {
        updateData.AssignedDriverID = newAssignedDriverId;
    }

    const { error } = await supabase.from('Parcels').update(updateData).eq('ParcelID', parcelId);
    if (error) {
        return { success: false, message: `فشل تحديث حالة الطرد: ${error.message}` };
    }
    revalidatePath("/operations", "page");
    return { success: true, message: `تم تحديث حالة الطرد ${parcelId} بنجاح.` };
}

export async function searchParcels(searchTerm: string): Promise<Parcel[]> {
    const { data, error } = await supabase.from('Parcels').select('*').or(`TrackingNumber.ilike.%${searchTerm}%,SenderName.ilike.%${searchTerm}%,ReceiverName.ilike.%${searchTerm}%`).order('CreatedAt', { ascending: false });
    if (error) {
        console.error("Supabase search error:", error);
        return [];
    }
    return data as Parcel[];
}

export async function getParcelsStatusCounts(): Promise<any[]> {
    const { data, error } = await supabase.from('parcels_status_counts').select('*');
    if (error) {
        console.error("Supabase error getting status counts:", error);
        return [];
    }
    return data.map(item => ({
        status: item.Status,
        count: item.count
    }));
}
