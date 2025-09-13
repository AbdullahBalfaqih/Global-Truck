"use server";

import { z } from "zod";
import type { Employee } from '@/types';
import { format } from 'date-fns';
import { supabase } from "@/lib/db";
import { revalidatePath } from "next/cache";

const EmployeeSchema = z.object({
    EmployeeID: z.string().max(50).optional(),
    Name: z.string().min(1, "الاسم مطلوب"),
    JobTitle: z.string().min(2, "يجب أن لا يقل المسمى الوظيفي عن حرفين."),
    Salary: z.coerce.number().positive("الراتب يجب أن يكون رقمًا موجبًا."),
    BranchID: z.coerce.number().int().positive().optional().nullable(),
    ContactPhone: z.string().regex(/^7\d{8}$/, "يجب أن يكون رقم الهاتف صالحًا ويبدأ بـ 7 ويتكون من 9 أرقام.").optional().or(z.literal('')),
    HireDate: z.date().optional().nullable(),
    UserID: z.coerce.number().int().positive().optional().nullable(),
    DriverID: z.string().max(50).optional().nullable(),
    IsActive: z.boolean().default(true),
});

type EmployeeFormState = {
    message?: string;
    errors?: { [key: string]: string[] | undefined };
    success?: boolean;
};

export async function createEmployee(
    prevState: EmployeeFormState,
    formData: FormData
): Promise<EmployeeFormState> {
    const rawData = Object.fromEntries(formData.entries());
    const dataToValidate: Record<string, any> = {
        ...rawData,
        Salary: rawData.Salary ? parseFloat(rawData.Salary as string) : undefined,
        BranchID: rawData.BranchID && rawData.BranchID !== "_no_branch_" ? parseInt(rawData.BranchID as string, 10) : null,
        HireDate: rawData.HireDate ? new Date(rawData.HireDate as string) : null,
        UserID: rawData.UserID && rawData.UserID !== "" ? parseInt(rawData.UserID as string, 10) : undefined,
        DriverID: rawData.DriverID && rawData.DriverID !== "" ? rawData.DriverID.toString().trim() : undefined,
        IsActive: rawData.IsActive === 'on',
    };

    const validatedFields = EmployeeSchema.safeParse(dataToValidate);
    if (!validatedFields.success) {
        console.error("Zod validation error (createEmployee):", validatedFields.error.flatten().fieldErrors);
        return {
            success: false,
            message: "مدخلات غير صالحة.",
            errors: validatedFields.error.flatten().fieldErrors
        };
    }

    const {
        Name,
        JobTitle,
        Salary,
        BranchID,
        ContactPhone,
        HireDate,
        UserID,
        DriverID,
        IsActive
    } = validatedFields.data;

    const newEmployee = {
        EmployeeID: `${Date.now()}`,
        Name,
        JobTitle,
        Salary,
        BranchID,
        ContactPhone,
        HireDate,
        UserID,
        DriverID,
        IsActive
    };

    try {
        const { data, error } = await supabase
            .from('Employees')
            .insert(newEmployee);

        if (error) {
            console.error("Supabase error creating employee:", error);
            if (error.code === '23505') { // PostgreSQL unique_violation error code
                return {
                    success: false,
                    message: "توجد قيمة مكررة في حقل يحتوي على قيد فريد. تحقق من رقم الجوال أو المستخدم أو السائق."
                };
            }
            return { success: false, message: `فشل إضافة الموظف: ${error.message}` };
        }

        revalidatePath('/employees');
        return { success: true, message: `تمت إضافة الموظف ${Name} بنجاح.` };
    } catch (error: any) {
        console.error("Unexpected error in createEmployee:", error);
        return { success: false, message: `حدث خطأ غير متوقع: ${error.message}` };
    }
}

export async function getAllEmployees(): Promise<Employee[]> {
    try {
        const { data, error } = await supabase
            .from('Employees')
            .select('*')
            .order('Name', { ascending: true });

        if (error) {
            console.error("Supabase error fetching all employees:", error);
            return [];
        }

        return data as Employee[];
    } catch (error) {
        console.error("Error in getAllEmployees:", error);
        return [];
    }
}

export async function deleteEmployee(employeeId: string): Promise<EmployeeFormState> {
    try {
        const { error } = await supabase
            .from('Employees')
            .delete()
            .eq('EmployeeID', employeeId);

        if (error) {
            console.error("Supabase error deleting employee:", error);
            return { success: false, message: `فشل حذف الموظف: ${error.message}` };
        }

        revalidatePath('/employees');
        return { success: true, message: "تم حذف الموظف بنجاح." };
    } catch (error: any) {
        console.error("Unexpected error in deleteEmployee:", error);
        return { success: false, message: `حدث خطأ غير متوقع: ${error.message}` };
    }
}

export async function updateEmployee(
    employeeId: string,
    data: Partial<Employee>
): Promise<EmployeeFormState> {
    try {
        const validatedFields = EmployeeSchema.partial().safeParse(data);
        if (!validatedFields.success) {
            return {
                success: false,
                message: "مدخلات غير صالحة.",
                errors: validatedFields.error.flatten().fieldErrors
            };
        }

        const { error } = await supabase
            .from('Employees')
            .update(validatedFields.data)
            .eq('EmployeeID', employeeId);

        if (error) {
            console.error("Supabase error updating employee:", error);
            if (error.code === '23505') {
                return {
                    success: false,
                    message: "توجد قيمة مكررة في حقل يحتوي على قيد فريد."
                };
            }
            return { success: false, message: `فشل تحديث بيانات الموظف: ${error.message}` };
        }

        revalidatePath('/employees');
        return { success: true, message: "تم تحديث بيانات الموظف بنجاح." };
    } catch (error: any) {
        console.error("Unexpected error in updateEmployee:", error);
        return { success: false, message: `حدث خطأ غير متوقع: ${error.message}` };
    }
}
