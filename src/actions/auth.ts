
"use server";

import { z } from "zod";
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import type { User } from '@/types';
import * as jose from 'jose';
import { supabase } from "@/lib/db";
import bcrypt from 'bcryptjs';

// Define a secret key for signing the session token. This should be in your .env file.
const SECRET_KEY = process.env.SESSION_SECRET || 'a-very-strong-and-long-secret-key-for-development-and-testing-purposes';
const key = new TextEncoder().encode(SECRET_KEY);

const LoginSchema = z.object({
    identifier: z.string().min(1, "رقم الهاتف مطلوب."),
    password: z.string().min(1, "كلمة المرور مطلوبة."),
});

// This will be the state for the login form
export type LoginActionState = {
    success: boolean;
    message: string;
};

// This is the new loginUser function. It performs the DB check and sets a secure cookie on success.
export async function loginUser(
    prevState: LoginActionState | undefined,
    formData: FormData
): Promise<LoginActionState> {
    const rawData = Object.fromEntries(formData.entries());

    const validatedFields = LoginSchema.safeParse({
        identifier: rawData.identifier,
        password: rawData.password,
    });

    if (!validatedFields.success) {
        return { success: false, message: "مدخلات غير صالحة. يرجى التحقق من الحقول." };
    }

    const { identifier, password } = validatedFields.data;

    try {
        // We are now only logging in with Phone number
        let query = supabase.from('Users').select('UserID, Name, Email, Phone, PasswordHash, Role, BranchID, IsActive');
        query = query.eq('Phone', identifier);

        const { data: users, error } = await query;

        if (error) {
            console.error("Login Supabase Error:", error);
            return { success: false, message: `خطأ في قاعدة البيانات: ${error.message}` };
        }

        if (!users || users.length === 0) {
            return { success: false, message: "رقم الهاتف أو كلمة المرور غير صحيحة." };
        }

        const user = users[0] as User;

        if (!user.IsActive) {
            return { success: false, message: "حساب المستخدم هذا غير نشط. يرجى الاتصال بالمسؤول." };
        }

        if (!user.PasswordHash) {
            return { success: false, message: "حساب المستخدم غير مهيأ بشكل صحيح (لا توجد كلمة مرور)." };
        }

        const passwordMatch = await bcrypt.compare(password, user.PasswordHash);
        if (!passwordMatch) {
            return { success: false, message: "رقم الهاتف أو كلمة المرور غير صحيحة." };
        }

        // Password is correct, create a session.
        const sessionPayload = {
            userId: user.UserID,
            name: user.Name,
            email: user.Email,
            phone: user.Phone,
            role: user.Role,
            branchId: user.BranchID,
        };

        const sessionToken = await new jose.SignJWT(sessionPayload)
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h') // Set session to expire in 24 hours
            .sign(key);

        (await cookies()).set('session', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24, // 24 hours
            path: '/',
        });

    } catch (error: any) {
        console.error("Login Action Error:", error.message);
        return { success: false, message: `خطأ غير متوقع: ${error.message}` };
    }

    // Redirect to dashboard on successful login
    redirect('/dashboard');
}


export async function getSession(): Promise<any | null> {
    const sessionCookie = (await cookies()).get('session')?.value;
    if (!sessionCookie) return null;

    try {
        const { payload } = await jose.jwtVerify(sessionCookie, key, {
            algorithms: ['HS256'],
        });
        return payload;
    } catch (error) {
        console.error("Failed to verify session token:", error);
        return null;
    }
}

export async function logout() {
    (await cookies()).set('session', '', { expires: new Date(0), path: '/' });
    redirect('/');
}

// Define the response type for handleForgotPassword
export interface ForgotPasswordResponse {
    message?: string;
    error?: string;
    userVerified?: boolean;
    email?: string;
    passwordChanged?: boolean;
}

// Added the missing handleForgotPassword function
export async function handleForgotPassword(
    prevState: ForgotPasswordResponse | undefined,
    formData: FormData
): Promise<ForgotPasswordResponse> {
    const stage = formData.get("stage") as string;
    const email = formData.get("email") as string;

    if (stage === "verifyEmail") {
        if (!email) {
            return { error: "البريد الإلكتروني مطلوب." };
        }
        const { data, error } = await supabase.from('Users').select('Email').eq('Email', email).single();
        if (error || !data) {
            return { error: "البريد الإلكتروني غير موجود في النظام." };
        }
        return { userVerified: true, email: email, message: "تم التحقق من البريد الإلكتروني. أدخل كلمة المرور الجديدة." };
    }

    if (stage === "resetPassword") {
        const verifiedEmail = formData.get("verifiedEmail") as string;
        const newPassword = formData.get("newPassword") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        if (!newPassword || !confirmPassword) {
            return { error: "يرجى ملء جميع حقول كلمة المرور.", email: verifiedEmail, userVerified: true };
        }
        if (newPassword.length < 6) {
            return { error: "يجب أن لا تقل كلمة المرور الجديدة عن 6 أحرف.", email: verifiedEmail, userVerified: true };
        }
        if (newPassword !== confirmPassword) {
            return { error: "كلمة المرور الجديدة وتأكيدها غير متطابقين.", email: verifiedEmail, userVerified: true };
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const { error } = await supabase.from('Users').update({ PasswordHash: hashedPassword }).eq('Email', verifiedEmail);

        if (error) {
            return { error: "فشل تحديث كلمة المرور في قاعدة البيانات.", email: verifiedEmail, userVerified: true };
        }

        return { passwordChanged: true, message: "تم تغيير كلمة المرور بنجاح!" };
    }

    return { error: "إجراء غير صالح." };
}
