// src/actions/deliveryLocations.ts
"use server";

import type { DeliveryCityFormState, DeliveryCity, DeliveryCityForSelect, District } from "@/types";
import { z } from "zod";
import { supabase } from "@/lib/db";
import { revalidatePath } from "next/cache";

// Zod Schemas
const DistrictSchema = z.object({
    Name: z.string().min(1, "اسم المنطقة مطلوب."),
});

const DeliveryCitySchema = z.object({
    CityID: z.number().optional(),
    Name: z.string().min(2, "اسم المدينة مطلوب وبحد أدنى حرفين."),
    IsActive: z.boolean(),
});

// Get All Cities + Districts
export async function getAllDeliveryCitiesWithDistricts(): Promise<DeliveryCity[]> {
    try {
        const { data, error } = await supabase
            .from('DeliveryCities')
            .select(`
                *,
                Districts(*)
            `)
            .order('Name', { ascending: true })
            .order('Name', { foreignTable: 'Districts', ascending: true });

        if (error) {
            console.error("Supabase error fetching delivery cities with districts:", error);
            return [];
        }

        return data.map(city => ({
            ...city,
            Districts: city.Districts || []
        })) as DeliveryCity[];

    } catch (error) {
        console.error("Error in getAllDeliveryCitiesWithDistricts:", error);
        return [];
    }
}

// Create
export async function createDeliveryCityWithDistricts(
    formData: FormData
): Promise<DeliveryCityFormState> {
    const rawName = (formData.get("Name") as string || "").trim();
    const rawIsActive = formData.get("IsActive") === "on";
    const rawDistricts: { Name: string }[] = [];
    let i = 0;

    while (formData.has(`Districts[${i}].Name`)) {
        const name = (formData.get(`Districts[${i}].Name`) as string || "").trim();
        if (name) rawDistricts.push({ Name: name });
        i++;
    }

    const cityVal = DeliveryCitySchema.safeParse({
        Name: rawName,
        IsActive: rawIsActive,
    });

    if (!cityVal.success) {
        return {
            success: false,
            message: "بيانات المدينة غير صالحة.",
            errors: cityVal.error.flatten().fieldErrors,
        };
    }

    const distVal = z.array(DistrictSchema).safeParse(rawDistricts);
    if (!distVal.success) {
        const districtErrors: string[] = [];
        distVal.error.issues.forEach(issue => {
            if (issue.path[0] === 'Districts' && issue.path[2] === 'Name') {
                districtErrors.push(`المنطقة ${parseInt(issue.path[1] as string) + 1}: ${issue.message}`);
            } else {
                districtErrors.push(issue.message);
            }
        });

        return {
            success: false,
            message: "بيانات المناطق غير صالحة.",
            errors: { Districts: districtErrors.length > 0 ? districtErrors : ["تحقق من أسماء المناطق."] },
        };
    }

    try {
        const { data: newCity, error: cityError } = await supabase
            .from('DeliveryCities')
            .insert({ Name: rawName, IsActive: rawIsActive })
            .select('CityID')
            .single();

        if (cityError) {
            console.error("Supabase error creating city:", cityError);
            return { success: false, message: `فشل إضافة المدينة: ${cityError.message}` };
        }

        const cityId = newCity.CityID;

        if (rawDistricts.length > 0) {
            const districtsToInsert = rawDistricts.map(d => ({
                CityID: cityId,
                Name: d.Name
            }));

            const { error: districtsError } = await supabase
                .from('Districts')
                .insert(districtsToInsert);

            if (districtsError) {
                console.error("Supabase error creating districts:", districtsError);
                // Attempt to roll back the city creation
                await supabase.from('DeliveryCities').delete().eq('CityID', cityId);
                return { success: false, message: `فشل إضافة المناطق: ${districtsError.message}` };
            }
        }

        revalidatePath('/delivery-locations');
        return { success: true, message: `تمت إضافة المدينة "${rawName}" بنجاح.` };

    } catch (error: any) {
        console.error("Unexpected error in createDeliveryCityWithDistricts:", error);
        return { success: false, message: "حدث خطأ غير متوقع." };
    }
}

// Update
export async function updateDeliveryCityWithDistricts(
    formData: FormData
): Promise<DeliveryCityFormState> {
    const rawId = parseInt((formData.get("CityID") as string) || "0", 10);
    const rawName = (formData.get("Name") as string || "").trim();
    const rawIsActive = formData.get("IsActive") === "on";
    const rawDistricts: { Name: string }[] = [];
    let i = 0;

    while (formData.has(`Districts[${i}].Name`)) {
        const name = (formData.get(`Districts[${i}].Name`) as string || "").trim();
        if (name) rawDistricts.push({ Name: name });
        i++;
    }

    const cityVal = DeliveryCitySchema.partial({ CityID: true }).safeParse({
        CityID: rawId,
        Name: rawName,
        IsActive: rawIsActive,
    });

    if (!cityVal.success) {
        return {
            success: false,
            message: "بيانات المدينة غير صالحة.",
            errors: cityVal.error.flatten().fieldErrors,
        };
    }

    const distVal = z.array(DistrictSchema).safeParse(rawDistricts);
    if (!distVal.success) {
        const districtErrors: string[] = [];
        distVal.error.issues.forEach(issue => {
            if (issue.path[0] === 'Districts' && issue.path[2] === 'Name') {
                districtErrors.push(`المنطقة ${parseInt(issue.path[1] as string) + 1}: ${issue.message}`);
            } else {
                districtErrors.push(issue.message);
            }
        });

        return {
            success: false,
            message: "بيانات المناطق غير صالحة.",
            errors: { Districts: districtErrors.length > 0 ? districtErrors : ["تحقق من أسماء المناطق."] },
        };
    }

    try {
        const { error: cityError } = await supabase
            .from('DeliveryCities')
            .update({
                Name: rawName,
                IsActive: rawIsActive,
                UpdatedAt: new Date().toISOString()
            })
            .eq('CityID', rawId);

        if (cityError) {
            console.error("Supabase error updating city:", cityError);
            return { success: false, message: `فشل تحديث المدينة: ${cityError.message}` };
        }

        // Delete old districts
        const { error: deleteError } = await supabase
            .from('Districts')
            .delete()
            .eq('CityID', rawId);

        if (deleteError) {
            console.error("Supabase error deleting old districts:", deleteError);
            return { success: false, message: `فشل حذف المناطق القديمة: ${deleteError.message}` };
        }

        // Insert new districts
        if (rawDistricts.length > 0) {
            const districtsToInsert = rawDistricts.map(d => ({
                CityID: rawId,
                Name: d.Name
            }));
            const { error: insertError } = await supabase
                .from('Districts')
                .insert(districtsToInsert);

            if (insertError) {
                console.error("Supabase error inserting new districts:", insertError);
                return { success: false, message: `فشل إضافة المناطق الجديدة: ${insertError.message}` };
            }
        }

        revalidatePath('/delivery-locations');
        return { success: true, message: "تم التحديث بنجاح." };

    } catch (error: any) {
        console.error("Unexpected error in updateDeliveryCityWithDistricts:", error);
        return { success: false, message: "حدث خطأ غير متوقع." };
    }
}

// Delete
export async function deleteDeliveryCity(cityId: number): Promise<{ success: boolean; message: string }> {
    try {
        const { error: deleteDistrictsError } = await supabase
            .from('Districts')
            .delete()
            .eq('CityID', cityId);

        if (deleteDistrictsError) {
            console.error("Supabase error deleting districts:", deleteDistrictsError);
            return { success: false, message: `فشل حذف المناطق: ${deleteDistrictsError.message}` };
        }

        const { error: deleteCityError } = await supabase
            .from('DeliveryCities')
            .delete()
            .eq('CityID', cityId);

        if (deleteCityError) {
            console.error("Supabase error deleting city:", deleteCityError);
            return { success: false, message: `فشل حذف المدينة: ${deleteCityError.message}` };
        }

        revalidatePath('/delivery-locations');
        return { success: true, message: "تم الحذف بنجاح." };
    } catch (error: any) {
        console.error("Unexpected error in deleteDeliveryCity:", error);
        return { success: false, message: "حدث خطأ غير متوقع." };
    }
}

// Toggle Active
export async function toggleCityActive(cityId: number): Promise<{ success: boolean; message: string }> {
    try {
        const { data, error } = await supabase
            .from('DeliveryCities')
            .select('IsActive')
            .eq('CityID', cityId)
            .single();

        if (error || !data) {
            console.error("Supabase error fetching city active status:", error);
            return { success: false, message: `فشل العثور على المدينة: ${error?.message}` };
        }

        const newIsActive = !data.IsActive;

        const { error: updateError } = await supabase
            .from('DeliveryCities')
            .update({ IsActive: newIsActive, UpdatedAt: new Date().toISOString() })
            .eq('CityID', cityId);

        if (updateError) {
            console.error("Supabase error toggling city active status:", updateError);
            return { success: false, message: `فشل تبديل حالة المدينة: ${updateError.message}` };
        }

        revalidatePath('/delivery-locations');
        return { success: true, message: "تم التبديل بنجاح." };

    } catch (error: any) {
        console.error("Unexpected error in toggleCityActive:", error);
        return { success: false, message: "حدث خطأ غير متوقع." };
    }
}

// Get Active Cities (for select/dropdowns)
export async function getActiveCities(): Promise<DeliveryCityForSelect[]> {
    try {
        const { data, error } = await supabase
            .from('DeliveryCities')
            .select('CityID, Name')
            .eq('IsActive', true)
            .order('Name', { ascending: true });

        if (error) {
            console.error("Supabase error fetching active cities:", error);
            return [];
        }

        return data as DeliveryCityForSelect[];

    } catch (error) {
        console.error("Error in getActiveCities:", error);
        return [];
    }
}