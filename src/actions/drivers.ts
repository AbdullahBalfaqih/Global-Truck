
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { Driver, DriverLocation } from '@/types';
import { supabase } from "@/lib/db";

const DriverSchema = z.object({
    DriverID: z.string().max(50).optional(),
    Name: z.string().min(3, "يجب أن لا يقل اسم السائق عن 3 أحرف."),
    Phone: z.string().regex(/^7\d{8}$/, "رقم الهاتف غير صحيح.").optional().or(z.literal('')),
    LicenseNumber: z.string().max(50).optional().or(z.literal('')),
    BranchID: z.coerce.number().int().positive("الرجاء اختيار فرع."),
    IsActive: z.boolean().default(true),
});

const VerifyDriverSchema = z.object({
    phone: z.string().min(1, "رقم الهاتف مطلوب."),
    licenseNumber: z.string().min(1, "رقم الرخصه مطلوب."),
});

type DriverFormState = {
    message?: string;
    errors?: { [key: string]: string[] | undefined };
    success?: boolean;
};

export async function createDriver(prevState: DriverFormState, formData: FormData): Promise<DriverFormState> {
    const rawData = Object.fromEntries(formData.entries());

    const dataToValidate = {
        ...rawData,
        BranchID: rawData.BranchID ? parseInt(rawData.BranchID as string, 10) : undefined,
        IsActive: rawData.IsActive === 'on',
    };

    const validatedFields = DriverSchema.safeParse(dataToValidate);
    if (!validatedFields.success) {
        return { success: false, message: "البيانات غير صالحة.", errors: validatedFields.error.flatten().fieldErrors };
    }

    const { Name, Phone, LicenseNumber, BranchID, IsActive } = validatedFields.data;

    // Use a generated UUID for the driver ID to ensure uniqueness.
    const driverDataForDB = {
        DriverID: crypto.randomUUID(),
        Name,
        Phone: Phone || null,
        LicenseNumber: LicenseNumber || null,
        BranchID,
        IsActive,
    };

    try {
        const { error } = await supabase.from('Drivers').insert(driverDataForDB);

        if (error) {
            throw error;
        }

        revalidatePath('/drivers');
        return { success: true, message: `تمت إضافة السائق ${Name} بنجاح.` };

    } catch (error: any) {
        console.error("Error creating driver:", error);
        if (error.code === '23505') { // Unique key violation
            return { success: false, message: `معرف السائق موجود بالفعل.` };
        }
        return { success: false, message: `حدث خطأ غير متوقع: ${error.message}` };
    }
}
export async function getAllDrivers(): Promise<Driver[]> {
    try {
        const { data, error } = await supabase
            .from('Drivers')
            .select('*')
            .order('Name', { ascending: true });

        if (error) {
            throw error;
        }

        return data as Driver[];
    } catch (err: any) {
        console.error("Error in getAllDrivers:", err.message);
        return [];
    }
}

export async function updateDriver(driverId: string, formData: Record<string, any>): Promise<DriverFormState> {
    const dataToValidate = {
        ...formData,
        BranchID: formData.BranchID ? parseInt(formData.BranchID, 10) : undefined,
        IsActive: formData.IsActive === 'on' || formData.IsActive === true,
    };

    const validatedFields = DriverSchema.partial().safeParse(dataToValidate);
    if (!validatedFields.success) {
        return { success: false, message: "مدخلات غير صالحة.", errors: validatedFields.error.flatten().fieldErrors };
    }

    const updateData = { ...validatedFields.data, UpdatedAt: new Date().toISOString() };

    try {
        const { error } = await supabase.from('Drivers').update(updateData).eq('DriverID', driverId);
        if (error) throw error;

        revalidatePath('/drivers');
        return { success: true, message: "تم تحديث بيانات السائق بنجاح." };
    } catch (error: any) {
        console.error("Unexpected error updating driver:", error);
        return { success: false, message: `حدث خطأ غير متوقع: ${error.message}` };
    }
}

export async function getAllActiveDrivers(): Promise<Driver[]> {
    const allDrivers = await getAllDrivers();
    return allDrivers.filter(d => d.IsActive);
}

export async function getAllDriverLocations(): Promise<any[]> {
    try {
        const { data, error } = await supabase
            .from('DriverLocations')
            .select('*, Drivers(Name)') // Using foreign key relationship for join
            .order('Timestamp', { ascending: false });

        if (error) {
            console.error("Supabase error fetching driver locations:", error);
            return [];
        }

        return data.map(record => ({
            DriverID: record.DriverID,
            DriverName: record.Drivers.Name,
            Latitude: record.Latitude,
            Longitude: record.Longitude,
            Timestamp: record.Timestamp,
        }));
    } catch (error) {
        console.error("Error in getAllDriverLocations:", error);
        return [];
    }
}

export async function deleteDriver(driverId: string): Promise<{ success: boolean; message?: string }> {
    try {
        // Delete from Supabase first
        const { error } = await supabase
            .from('Drivers')
            .delete()
            .eq('DriverID', driverId);

        if (error) {
            console.error("Supabase error deleting driver:", error);
            return { success: false, message: `فشل حذف السائق: ${error.message}` };
        }

        revalidatePath('/drivers');
        return { success: true, message: "تم حذف السائق بنجاح." };
    } catch (error: any) {
        console.error("Unexpected error deleting driver:", error);
        return { success: false, message: `حدث خطأ غير متوقع: ${error.message}` };
    }
}

export async function verifyDriver(
    prevState: any,
    formData: FormData
): Promise<{ success: boolean; message: string; driver?: Driver }> {
    const validatedFields = VerifyDriverSchema.safeParse(
        Object.fromEntries(formData)
    );

    if (!validatedFields.success) {
        return { success: false, message: "البيانات المدخلة غير صالحة." };
    }

    const { phone, licenseNumber } = validatedFields.data;

    try {
        const { data, error } = await supabase
            .from('Drivers')
            .select('*')
            .eq('Phone', phone)
            .eq('LicenseNumber', licenseNumber)
            .eq('IsActive', true)
            .limit(1);

        if (error) {
            console.error("Supabase error verifying driver:", error);
            return { success: false, message: "خطأ في قاعدة البيانات أثناء التحقق." };
        }

        if (data.length === 0) {
            return { success: false, message: "بيانات السائق غير صحيحة أو الحساب غير نشط." };
        }

        return {
            success: true,
            message: "تم التحقق من السائق بنجاح.",
            driver: data[0] as Driver,
        };
    } catch (error: any) {
        console.error("Unexpected error in verifyDriver:", error);
        return { success: false, message: "خطأ غير متوقع أثناء التحقق." };
    }
}

export async function updateDriverLocation(
    driverId: string,
    latitude: number,
    longitude: number
): Promise<{ success: boolean; message: string }> {
    console.log(
        `Updating location for Driver ${driverId}: Lat ${latitude}, Lng ${longitude}`
    );

    const newLocation = {
        DriverID: driverId,
        Latitude: latitude,
        Longitude: longitude,
        Timestamp: new Date().toISOString(),
    };

    try {
        const { error } = await supabase
            .from('DriverLocations')
            .upsert(newLocation, { onConflict: 'DriverID' });

        if (error) {
            console.error("Supabase error updating driver location:", error);
            return { success: false, message: "فشل تحديث الموقع في قاعدة البيانات." };
        }

        return { success: true, message: "تم تحديث الموقع." };
    } catch (error: any) {
        console.error("Unexpected error in updateDriverLocation:", error);
        return { success: false, message: "حدث خطأ غير متوقع." };
    }
}

export async function getDriverLocation(driverId: string): Promise<DriverLocation | null> {
    try {
        const { data, error } = await supabase
            .from('DriverLocations')
            .select('*, Drivers(Name)')
            .eq('DriverID', driverId)
            .limit(1);

        if (error) {
            console.error("Supabase error fetching driver location:", error);
            return null;
        }

        if (data.length === 0) {
            return null;
        }

        const record = data[0];
        return {
            DriverID: record.DriverID,
            DriverName: record.Drivers.Name,
            Latitude: record.Latitude,
            Longitude: record.Longitude,
            Timestamp: record.Timestamp,
        };

    } catch (error) {
        console.error("Unexpected error in getDriverLocation:", error);
        return null;
    }
}

