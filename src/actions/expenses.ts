
"use server";

import { z } from "zod";
import { format } from 'date-fns';
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/db";
import { getSession } from "./auth";
import type { Expense } from '@/types';

const ExpenseSchema = z.object({
    Description: z.string().min(2, "الوصف يجب أن لا يقل عن حرفين.").max(200),
    Amount: z.coerce.number().positive("المبلغ يجب أن يكون رقمًا موجبًا."),
    DateSpent: z.date({ required_error: "تاريخ الصرف مطلوب.", coerce: true }),
    BranchID: z.coerce.number().int().positive().optional().nullable(),
    AddedByUserID: z.coerce.number().int().positive("معرف المستخدم الذي أضاف المصروف مطلوب."),
});

type ExpenseFormState = {
    message?: string;
    errors?: { [key: string]: string[] | undefined };
    success?: boolean;
};

export async function createExpense(prevState: ExpenseFormState, formData: FormData): Promise<ExpenseFormState> {
    const session = await getSession();
    // @ts-ignore
    const currentUserID = session?.userId ? parseInt(session.userId, 10) : null;

    if (!currentUserID) {
        return { success: false, message: "المستخدم غير مسجل الدخول أو أن الجلسة غير صالحة." };
    }

    const rawData = Object.fromEntries(formData.entries());
    const dataToValidate = {
        Description: rawData.Description,
        Amount: rawData.Amount ? parseFloat(rawData.Amount as string) : undefined,
        DateSpent: rawData.DateSpent && (rawData.DateSpent as string).trim() !== "" ? new Date(rawData.DateSpent as string) : undefined,
        BranchID: rawData.BranchID && rawData.BranchID !== "_no_branch_" ? parseInt(rawData.BranchID as string, 10) : null,
        AddedByUserID: currentUserID,
    };

    const validatedFields = ExpenseSchema.safeParse(dataToValidate);
    if (!validatedFields.success) {
        return { success: false, message: "مدخلات غير صالحة.", errors: validatedFields.error.flatten().fieldErrors };
    }
    const { Description, Amount, DateSpent, BranchID, AddedByUserID } = validatedFields.data;

    try {
        const { error: expenseError } = await supabase.from('Expenses').insert({
            Description, Amount, DateSpent: format(DateSpent, 'yyyy-MM-dd'), BranchID, AddedByUserID
        });
        if (expenseError) throw expenseError;

        // Also add to cash transactions
        const { error: cashError } = await supabase.from('CashTransactions').insert({
            TransactionType: 'Expense',
            Amount: Amount,
            Description: `مصروف: ${Description}`,
            BranchID: BranchID,
            TransactionDate: format(DateSpent, 'yyyy-MM-dd'),
            AddedByUserID: AddedByUserID
        });
        if (cashError) console.error("Supabase cash transaction error:", cashError); // Log but don't fail the whole operation

        revalidatePath('/expenses');
        revalidatePath('/cashbox');
        return { success: true, message: `تمت إضافة المصروف "${Description}" بنجاح.` };

    } catch (error: any) {
        console.error("Error creating expense:", error);
        return { success: false, message: `فشل إضافة المصروف: ${error.message}` };
    }
}

export async function getAllExpenses(): Promise<Expense[]> {
    const { data, error } = await supabase
        .from('Expenses')
        .select(`
            *,
            Users ( Name )
        `)
        .order('DateSpent', { ascending: false });

    if (error) {
        console.error("Supabase error fetching expenses:", error);
        return [];
    }

    // @ts-ignore
    return data.map(item => ({
        ...item,
        AddedByUserName: item.Users?.Name || 'غير معروف'
    })) as Expense[];
}
