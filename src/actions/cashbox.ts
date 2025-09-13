"use server";

import { z } from "zod";
import { format, endOfDay } from 'date-fns';
import { revalidatePath } from "next/cache";
import type { CashTransaction, CashTransactionType, CashboxFormState } from "@/types";
import { supabase } from "@/lib/db";
import { getSession } from "@/actions/auth";

const CashTransactionSchema = z.object({
    TransactionType: z.enum(['Income', 'Expense'], { required_error: "نوع الحركة مطلوب." }),
    Amount: z.coerce.number().positive("المبلغ يجب أن يكون رقمًا موجبًا."),
    Description: z.string().min(2, "الوصف يجب أن لا يقل عن حرفين.").max(255),
    BranchID: z.coerce.number().int().positive("يجب تحديد الفرع المتأثر بالحركة."),
    TransactionDate: z.date({ coerce: true }).optional(),
});

export async function createCashTransaction(
    prevState: CashboxFormState,
    formData: FormData
): Promise<CashboxFormState> {
    const session = await getSession();
    if (!session || !session.userId) {
        return { success: false, message: "غير مصرح لك. يجب تسجيل الدخول." };
    }
    const currentUserID = session.userId;

    const rawData = Object.fromEntries(formData.entries());

    const dataToValidate = {
        ...rawData,
        TransactionDate: rawData.TransactionDate ? new Date(rawData.TransactionDate as string) : new Date(),
        BranchID: rawData.BranchID ? parseInt(rawData.BranchID as string, 10) : undefined,
    };

    const validatedFields = CashTransactionSchema.safeParse(dataToValidate);

    if (!validatedFields.success) {
        return {
            success: false,
            message: "مدخلات غير صالحة. يرجى التحقق من الحقول.",
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { TransactionType, Amount, Description, BranchID, TransactionDate } = validatedFields.data;

    try {
        // إدخال حركة الصندوق
        const { error: cashTransactionError } = await supabase
            .from('CashTransactions')
            .insert({
                TransactionType: TransactionType,
                Amount: Amount,
                Description: Description,
                BranchID: BranchID,
                TransactionDate: TransactionDate ? format(TransactionDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
                AddedByUserID: currentUserID,
                CreatedAt: new Date().toISOString(),
            });

        if (cashTransactionError) throw cashTransactionError;

        // إذا كانت الحركة مصروفًا، نقوم بإدخالها في جدول المصروفات أيضًا
        if (TransactionType === 'Expense') {
            const { error: expenseError } = await supabase
                .from('Expenses')
                .insert({
                    Description: `صندوق: ${Description}`,
                    Amount: Amount,
                    DateSpent: TransactionDate ? format(TransactionDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
                    BranchID: BranchID,
                    AddedByUserID: currentUserID,
                    CreatedAt: new Date().toISOString(),
                });

            if (expenseError) throw expenseError;
        }

        revalidatePath("/cashbox");
        revalidatePath("/expenses");
        return { success: true, message: `تم تسجيل الحركة بنجاح.` };

    } catch (error: any) {
        console.error("Database error creating cash transaction:", error);
        return { success: false, message: `فشل تسجيل الحركة: ${error.message}` };
    }
}

export async function getCashTransactions(branchId?: number | null, startDate?: string, endDate?: string): Promise<CashTransaction[]> {
    try {
        let query = supabase
            .from('CashTransactions')
            .select(`
                *,
                Users:AddedByUserID (Name)
            `)
            .order('TransactionDate', { ascending: false })
            .order('CreatedAt', { ascending: false });

        if (typeof branchId === 'number') {
            query = query.eq('BranchID', branchId);
        }

        if (startDate) {
            query = query.gte('TransactionDate', startDate);
        }
        if (endDate) {
            query = query.lte('TransactionDate', endDate);
        }

        const { data, error } = await query;

        if (error) throw error;

        // تحويل البيانات لتتناسب مع هيكل CashTransaction المتوقع
        return data.map(item => ({
            ...item,
            AddedByUserName: item.Users?.Name || 'غير معروف'
        })) as CashTransaction[];
    } catch (error: any) {
        console.error("Database error fetching cash transactions:", error);
        return [];
    }
}

export async function getCashTransactionById(transactionId: number): Promise<CashTransaction | null> {
    try {
        const { data, error } = await supabase
            .from('CashTransactions')
            .select('*')
            .eq('TransactionID', transactionId)
            .single();

        if (error) throw error;
        return data as CashTransaction;
    } catch (error: any) {
        console.error(`Database error fetching cash transaction by ID ${transactionId}:`, error);
        return null;
    }
}

export async function getCashboxBalance(branchId?: number | null): Promise<number> {
    try {
        let incomeQuery = supabase
            .from('CashTransactions')
            .select('Amount')
            .eq('TransactionType', 'Income');

        let expenseQuery = supabase
            .from('CashTransactions')
            .select('Amount')
            .eq('TransactionType', 'Expense');

        if (typeof branchId === 'number') {
            incomeQuery = incomeQuery.eq('BranchID', branchId);
            expenseQuery = expenseQuery.eq('BranchID', branchId);
        }

        const [{ data: incomeData, error: incomeError }, { data: expenseData, error: expenseError }] = await Promise.all([
            incomeQuery,
            expenseQuery
        ]);

        if (incomeError) throw incomeError;
        if (expenseError) throw expenseError;

        const totalIncome = incomeData?.reduce((sum, item) => sum + (item.Amount || 0), 0) || 0;
        const totalExpense = expenseData?.reduce((sum, item) => sum + (item.Amount || 0), 0) || 0;

        return totalIncome - totalExpense;
    } catch (error: any) {
        console.error("Database error calculating cashbox balance:", error);
        return 0;
    }
}

export async function reverseCashTransaction(transaction: CashTransaction): Promise<{ success: boolean; message: string }> {
    const session = await getSession();
    if (!session || !session.userId) {
        return { success: false, message: "غير مصرح لك. يجب تسجيل الدخول." };
    }
    const currentUserID = session.userId;

    try {
        const reverseType = transaction.TransactionType === 'Income' ? 'Expense' : 'Income';
        const reverseDescription = `تراجع عن حركة رقم ${transaction.TransactionID}: ${transaction.Description}`;

        const { error } = await supabase
            .from('CashTransactions')
            .insert({
                TransactionType: reverseType,
                Amount: transaction.Amount,
                Description: reverseDescription,
                BranchID: transaction.BranchID,
                TransactionDate: format(new Date(), 'yyyy-MM-dd'),
                AddedByUserID: currentUserID,
                CreatedAt: new Date().toISOString(),
            });

        if (error) throw error;

        revalidatePath('/cashbox');
        revalidatePath('/expenses');
        return { success: true, message: 'تم التراجع عن الحركة بنجاح.' };
    } catch (error: any) {
        console.error("Database error reversing cash transaction:", error);
        return { success: false, message: `فشل التراجع عن الحركة: ${error.message}` };
    }
}

export async function deleteCashTransaction(transactionId: number): Promise<{ success: boolean; message: string }> {
    const session = await getSession();
    if (!session || session.role !== 'Admin') {
        return { success: false, message: "غير مصرح لك بالقيام بهذا الإجراء." };
    }

    try {
        const { error, count } = await supabase
            .from('CashTransactions')
            .delete()
            .eq('TransactionID', transactionId);

        if (error) throw error;

        if (count && count > 0) {
            revalidatePath('/cashbox');
            revalidatePath('/expenses');
            return { success: true, message: 'تم حذف الحركة نهائيًا بنجاح.' };
        } else {
            return { success: false, message: 'لم يتم العثور على الحركة لحذفها.' };
        }
    } catch (error: any) {
        console.error("Database error deleting cash transaction:", error);
        return { success: false, message: `فشل حذف الحركة: ${error.message}` };
    }
}