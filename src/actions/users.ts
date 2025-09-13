
"use server";

import { z } from "zod";
import bcrypt from 'bcryptjs';
import { getSession, logout } from "@/actions/auth";
import { revalidatePath } from 'next/cache';
import { supabase } from "@/lib/db";

import type { User, UserRole } from '@/types';

const userRolesArray: [UserRole, ...UserRole[]] = ["Admin", "BranchEmployee", "Developer"];

const phoneRegex = /^(70|71|73|77|78)\d{7}$/;

export type UserFormActionState = {
    message?: string;
    errors?: {
        Name?: string[];
        Email?: string[];
        Phone?: string[];
        Password?: string[];
        Role?: string[];
        BranchID?: string[];
        IsActive?: string[];
        currentPassword?: string[];
        newPassword?: string[];
        _form?: string[];
        [key: string]: string[] | undefined;
    };
    success?: boolean;
    updatedUser?: Partial<Pick<User, 'Name' | 'Email'>>;
} | undefined;

const CreateUserSchema = z.object({
    Name: z.string().min(2, "يجب أن لا يقل الاسم عن حرفين."),
    Email: z.string().email("البريد الإلكتروني غير صالح."),
    Phone: z.string().regex(phoneRegex, "يجب أن يكون رقم الهاتف يمنيًا صالحًا (9 أرقام ويبدأ بـ 70, 71, 73, 77, أو 78).").optional().or(z.literal('')),
    Password: z.string().min(6, "يجب أن لا تقل كلمة المرور عن 6 أحرف."),
    Role: z.enum(userRolesArray),
    BranchID: z.coerce.number().int().positive().optional().nullable(),
    IsActive: z.boolean().default(true),
}).refine(data => {
    const rolesRequiringBranch = ['Admin', 'BranchEmployee'];
    return !rolesRequiringBranch.includes(data.Role) || (rolesRequiringBranch.includes(data.Role) && data.BranchID != null);
}, {
    message: "يجب اختيار فرع لهذا الدور.",
    path: ["BranchID"],
});

const UpdateUserSchema = z.object({
    UserID: z.coerce.number().int().positive("معرف المستخدم غير صالح."),
    Name: z.string().min(2, "يجب أن لا يقل الاسم عن حرفين."),
    Email: z.string().email("البريد الإلكتروني غير صالح."),
    Phone: z.string().regex(phoneRegex, "يجب أن يكون رقم الهاتف يمنيًا صالحًا (9 أرقام ويبدأ بـ 70, 71, 73, 77, أو 78).").optional().or(z.literal('')),
    Password: z.string().min(6, "يجب أن لا تقل كلمة المرور عن 6 أحرف.").optional().or(z.literal('')),
    Role: z.enum(userRolesArray),
    BranchID: z.coerce.number().int().positive().optional().nullable(),
    IsActive: z.boolean().default(true),
}).refine(data => {
    const rolesRequiringBranch = ['Admin', 'BranchEmployee'];
    return !rolesRequiringBranch.includes(data.Role) || (rolesRequiringBranch.includes(data.Role) && data.BranchID != null);
}, {
    message: "يجب اختيار فرع لهذا الدور.",
    path: ["BranchID"],
});

const UpdateProfileSchema = z.object({
    Name: z.string().min(2, "يجب أن لا يقل الاسم عن حرفين."),
    Email: z.string().email("البريد الإلكتروني غير صالح."),
});

const ChangePasswordSchema = z.object({
    currentPassword: z.string().min(1, "كلمة المرور الحالية مطلوبة."),
    newPassword: z.string().min(6, "يجب أن لا تقل كلمة المرور الجديدة عن 6 أحرف."),
}).refine(data => data.currentPassword !== data.newPassword, {
    message: "كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية.",
    path: ["newPassword"],
});


export async function createUserByAdmin(prevState: UserFormActionState | undefined, formData: FormData): Promise<UserFormActionState> {
    const rawData = Object.fromEntries(formData.entries());

    const isActiveValue = String(rawData.IsActive) === 'on';

    const dataToValidate: Record<string, any> = {
        Name: rawData.Name,
        Email: rawData.Email,
        Phone: rawData.Phone,
        Password: rawData.Password,
        Role: rawData.Role,
        IsActive: isActiveValue,
    };

    const rolesRequiringBranch = ['Admin', 'BranchEmployee'];
    if (rolesRequiringBranch.includes(rawData.Role as string) && rawData.BranchID && rawData.BranchID !== "" && rawData.BranchID !== "_none_") {
        dataToValidate.BranchID = parseInt(rawData.BranchID as string, 10);
    } else {
        dataToValidate.BranchID = null;
    }

    const validatedFields = CreateUserSchema.safeParse(dataToValidate);
    if (!validatedFields.success) {
        return { success: false, message: "مدخلات غير صالحة.", errors: validatedFields.error.flatten().fieldErrors };
    }
    const { Name, Email, Phone, Password, Role, BranchID, IsActive } = validatedFields.data;

    try {
        const { data: existingUser, error: existingError } = await supabase
            .from('Users')
            .select('UserID')
            .or(`Email.eq.${Email},Phone.eq.${Phone}`)
            .limit(1);

        if (existingError) throw existingError;
        if (existingUser && existingUser.length > 0) {
            return { success: false, message: "البريد الإلكتروني أو رقم الهاتف مسجل مسبقًا." };
        }

        const hashedPassword = await bcrypt.hash(Password, 10);

        const { error: insertError } = await supabase.from('Users').insert({
            Name, Email, Phone: Phone || null, PasswordHash: hashedPassword, Role, BranchID, IsActive
        });

        if (insertError) throw insertError;

        revalidatePath('/dashboard/users');
        return { success: true, message: `تم إنشاء حساب المستخدم ${Name} بنجاح.` };

    } catch (error: any) {
        console.error("Error creating user by admin:", error);
        return { success: false, message: `فشل إنشاء المستخدم: ${error.message}` };
    }
}

export async function updateUserByAdmin(prevState: UserFormActionState | undefined, formData: FormData): Promise<UserFormActionState> {
    const session = await getSession();
    // @ts-ignore
    const userRole = session?.role;
    if (!session || (userRole !== 'Admin' && userRole !== 'Developer')) {
        return { success: false, message: "غير مصرح لك بالقيام بهذا الإجراء." };
    }

    try {
        const rawData = Object.fromEntries(formData.entries());
        const userId = parseInt(rawData.UserID as string, 10);
        if (isNaN(userId)) {
            return { success: false, message: "معرف المستخدم غير صالح." };
        }

        const isActiveValue = rawData.IsActive === 'on' || String(rawData.IsActive) === 'true';

        const dataToValidate: Record<string, any> = {
            UserID: userId,
            Name: rawData.Name,
            Email: rawData.Email,
            Phone: rawData.Phone,
            Password: rawData.Password,
            Role: rawData.Role,
            IsActive: isActiveValue,
        };

        const rolesRequiringBranch = ['Admin', 'BranchEmployee'];
        if (rolesRequiringBranch.includes(rawData.Role as string) && rawData.BranchID && rawData.BranchID !== "" && rawData.BranchID !== "_none_") {
            dataToValidate.BranchID = parseInt(rawData.BranchID as string, 10);
        } else {
            dataToValidate.BranchID = null;
        }

        const validatedFields = UpdateUserSchema.safeParse(dataToValidate);
        if (!validatedFields.success) {
            return { success: false, message: "مدخلات غير صالحة.", errors: validatedFields.error.flatten().fieldErrors };
        }
        const { UserID, Name, Email, Phone, Password, Role, BranchID, IsActive } = validatedFields.data;

        // Check for uniqueness of email and phone on other users
        const { data: existingEmail, error: emailError } = await supabase.from('Users').select('UserID').eq('Email', Email).neq('UserID', UserID).single();
        if (emailError && emailError.code !== 'PGRST116') throw emailError;
        if (existingEmail) return { success: false, message: "هذا البريد الإلكتروني مستخدم بالفعل.", errors: { Email: ["البريد الإلكتروني مستخدم بالفعل."] } };

        if (Phone) {
            const { data: existingPhone, error: phoneError } = await supabase.from('Users').select('UserID').eq('Phone', Phone).neq('UserID', UserID).single();
            if (phoneError && phoneError.code !== 'PGRST116') throw phoneError;
            if (existingPhone) return { success: false, message: "رقم الهاتف هذا مستخدم بالفعل.", errors: { Phone: ["رقم الهاتف مستخدم بالفعل."] } };
        }

        const updateData: Partial<User> = {
            Name, Email, Phone: Phone || null, Role, BranchID, IsActive, UpdatedAt: new Date().toISOString()
        };

        if (Password) {
            updateData.PasswordHash = await bcrypt.hash(Password, 10);
        }

        const { error: updateError } = await supabase.from('Users').update(updateData).eq('UserID', UserID);
        if (updateError) throw updateError;

        revalidatePath('/dashboard/users');
        return { success: true, message: `تم تحديث بيانات المستخدم ${Name} بنجاح.` };

    } catch (error: any) {
        console.error("Error updating user by admin:", error);
        return { success: false, message: `فشل تحديث المستخدم: ${error.message}` };
    }
}

export async function getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase.from('Users').select('*').order('Name');
    if (error) {
        console.error("Error fetching users:", error);
        return [];
    }
    return data as User[];
}

export async function getUserProfileData(userId: number): Promise<User | null> {
    const { data, error } = await supabase.from('Users').select('UserID, Name, Email, Phone, Role, BranchID, IsActive, CreatedAt, UpdatedAt').eq('UserID', userId).single();
    if (error) {
        console.error("Error fetching user profile data:", error);
        return null;
    }
    return data as User | null;
}

export async function deleteUserByAdmin(userId: number): Promise<UserFormActionState> {
    const session = await getSession();
    // @ts-ignore
    const userRole = session?.role;
    // @ts-ignore
    const currentUserId = session?.userId;

    if (!session || (userRole !== 'Admin' && userRole !== 'Developer')) {
        return { success: false, message: "غير مصرح لك بالقيام بهذا الإجراء." };
    }
    if (currentUserId && Number(currentUserId) === userId) {
        return { success: false, message: "لا يمكنك حذف حسابك الخاص." };
    }

    try {
        const { error } = await supabase.from('Users').delete().eq('UserID', userId);
        if (error) throw error;

        revalidatePath('/dashboard/users');
        return { success: true, message: "تم حذف المستخدم بنجاح." };

    } catch (error: any) {
        console.error("Error deleting user by admin:", error);
        if (error.code === '23503') { // Foreign key violation in Supabase/Postgres
            return { success: false, message: `فشل الحذف: لا يمكن حذف هذا المستخدم لوجود بيانات مرتبطة به في النظام.` };
        }
        return { success: false, message: `فشل الحذف: ${error.message}` };
    }
}

export async function updateUserProfile(prevState: UserFormActionState | undefined, formData: FormData): Promise<UserFormActionState> {
    const session = await getSession();
    if (!session?.userId) {
        return { success: false, message: "غير مصرح لك. يجب تسجيل الدخول.", errors: { _form: ["غير مصرح لك."] } };
    }
    const currentUserId = session.userId;

    try {
        const validatedFields = UpdateProfileSchema.safeParse(Object.fromEntries(formData));
        if (!validatedFields.success) {
            return { success: false, message: "مدخلات غير صالحة.", errors: validatedFields.error.flatten().fieldErrors };
        }
        const { Name, Email } = validatedFields.data;

        // @ts-ignore
        if (Email.toLowerCase() !== session.email?.toLowerCase()) {
            const { data: existingEmail, error: emailError } = await supabase.from('Users').select('UserID').eq('Email', Email).neq('UserID', currentUserId).single();
            if (emailError && emailError.code !== 'PGRST116') throw emailError;
            if (existingEmail) return { success: false, message: "هذا البريد الإلكتروني مستخدم بالفعل.", errors: { Email: ["البريد الإلكتروني مستخدم بالفعل."] } };
        }

        const { error } = await supabase.from('Users').update({ Name, Email, UpdatedAt: new Date().toISOString() }).eq('UserID', currentUserId);
        if (error) throw error;

        revalidatePath(`/profile`);
        return { success: true, message: "تم تحديث الملف الشخصي بنجاح.", updatedUser: { Name, Email } };
    } catch (error: any) {
        console.error("Error updating user profile:", error);
        return { success: false, message: `فشل تحديث الملف الشخصي: ${error.message}` };
    }
}


export async function changeUserPassword(prevState: UserFormActionState | undefined, formData: FormData): Promise<UserFormActionState> {
    const session = await getSession();
    if (!session?.userId) {
        return { success: false, message: "غير مصرح لك. يجب تسجيل الدخول.", errors: { _form: ["غير مصرح لك."] } };
    }
    const currentUserId = session.userId;

    try {
        const validatedFields = ChangePasswordSchema.safeParse(Object.fromEntries(formData));
        if (!validatedFields.success) {
            return { success: false, message: "مدخلات غير صالحة.", errors: validatedFields.error.flatten().fieldErrors };
        }
        const { currentPassword, newPassword } = validatedFields.data;

        const { data: user, error: fetchError } = await supabase.from('Users').select('PasswordHash').eq('UserID', currentUserId).single();
        if (fetchError || !user) {
            return { success: false, message: "المستخدم غير موجود.", errors: { _form: ["المستخدم غير موجود."] } };
        }

        const passwordMatch = await bcrypt.compare(currentPassword, user.PasswordHash!);
        if (!passwordMatch) {
            return { success: false, message: "كلمة المرور الحالية غير صحيحة.", errors: { currentPassword: ["كلمة المرور الحالية غير صحيحة."] } };
        }

        const newHashedPassword = await bcrypt.hash(newPassword, 10);
        const { error: updateError } = await supabase.from('Users').update({ PasswordHash: newHashedPassword, UpdatedAt: new Date().toISOString() }).eq('UserID', currentUserId);
        if (updateError) throw updateError;

        revalidatePath(`/profile`);
        return { success: true, message: "تم تغيير كلمة المرور بنجاح." };

    } catch (error: any) {
        console.error("Error changing user password:", error);
        return { success: false, message: `فشل تغيير كلمة المرور: ${error.message}` };
    }
}

