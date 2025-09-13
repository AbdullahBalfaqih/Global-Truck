
"use server";

import type { Debt, ManualDebtFormState, DebtMovementType, UserRole, BranchForSelect, DebtStatus, DebtorType } from "@/types";
import { z } from 'zod';
import { revalidatePath } from "next/cache";
import { getSession } from "./auth";
import { supabase } from "@/lib/db";
import { getBranchesForSelect } from "./branches";
import { format } from 'date-fns';

const ManualDebtSchema = z.object({
    DebtorID: z.string().min(1, "الرجاء اختيار الطرف الآخر."),
    Amount: z.coerce.number().positive("المبلغ يجب أن يكون رقمًا موجبًا."),
    Notes: z.string().min(3, "يجب ألا تقل الملاحظات عن 3 أحرف.").max(255),
    DebtorType: z.enum(['Driver', 'Branch', 'Customer'], { errorMap: () => ({ message: "نوع الطرف غير صالح." }) }),
    DebtorName: z.string().min(1, "اسم الطرف الآخر مطلوب."),
    DebtMovementType: z.enum(['Debtor', 'Creditor'], { errorMap: () => ({ message: "يجب تحديد نوع الحركة (مدين/دائن)." }) }) as z.ZodType<DebtMovementType>,
});

const UpdateDebtSchema = z.object({
    DebtID: z.coerce.number().int().positive(),
    Amount: z.coerce.number().positive("المبلغ يجب أن يكون رقمًا موجبًا."),
    Notes: z.string().min(3, "يجب ألا تقل الملاحظات عن 3 أحرف.").max(255),
});

export async function createManualDebt(
    prevState: ManualDebtFormState,
    formData: FormData
): Promise<ManualDebtFormState> {
    const session = await getSession();
    if (!session?.userId) {
        return { success: false, message: "غير مصرح لك. يجب تسجيل الدخول." };
    }

    const currentUserID = session.userId;
    const currentUserRole: UserRole = session.role;
    let currentUserBranchID: number | null = session.branchId || null;

    if (currentUserRole !== 'Developer' && currentUserRole !== 'Admin' && currentUserBranchID === null) {
        return { success: false, message: "لا يمكنك القيام بهذا الإجراء. لم يتم تحديد فرع لحسابك." };
    }

    const validatedFields = ManualDebtSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return {
            success: false,
            message: "مدخلات غير صالحة. يرجى التحقق من الحقول.",
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { DebtorID, Amount, Notes, DebtorType, DebtorName, DebtMovementType } = validatedFields.data;

    try {
        if (DebtorType === 'Branch') {
            const otherBranchId = parseInt(DebtorID, 10);
            if (otherBranchId === currentUserBranchID) {
                return { success: false, message: "لا يمكن تسجيل دين لفرع مع نفسه." };
            }

            const branches = await getBranchesForSelect();
            const otherBranchName = branches.find(b => b.BranchID === otherBranchId)?.Name || 'فرع غير معروف';
            const currentUserBranchName = branches.find(b => b.BranchID === currentUserBranchID)?.Name || 'فرع غير معروف';

            // 1. تسجيل الدين للفرع الحالي (فرعك)
            const { data: myDebt, error: myDebtError } = await supabase.from('Debts').insert({
                DebtorType: 'Branch',
                DebtorID: String(currentUserBranchID),
                DebtorName: currentUserBranchName,
                Amount,
                DebtMovementType: DebtMovementType,
                Notes,
                Status: 'Outstanding',
                InitiatingBranchID: currentUserBranchID,
                InitiatorUserID: currentUserID
            }).select().single();
            if (myDebtError) throw myDebtError;

            // 2. تسجيل الدين للفرع الآخر
            const { data: otherDebt, error: otherDebtError } = await supabase.from('Debts').insert({
                DebtorType: 'Branch',
                DebtorID: String(otherBranchId),
                DebtorName: otherBranchName,
                Amount,
                DebtMovementType: DebtMovementType === 'Debtor' ? 'Creditor' : 'Debtor',
                Notes,
                Status: 'Outstanding',
                PairedDebtID: myDebt.DebtID,
                InitiatingBranchID: currentUserBranchID,
                InitiatorUserID: currentUserID,
            }).select().single();
            if (otherDebtError) throw otherDebtError;

            // 3. تحديث الدين الأول ليرتبط بالدين الثاني
            const { error: updateMyDebtError } = await supabase.from('Debts').update({ PairedDebtID: otherDebt.DebtID }).eq('DebtID', myDebt.DebtID);
            if (updateMyDebtError) throw updateMyDebtError;

            // 4. تسجيل الحركات النقدية - التصحيح النهائي للوصف
            const cashTransactions = [
                // حركة الفرع الحالي (فرعك)
                {
                    TransactionType: DebtMovementType === 'Debtor' ? 'Expense' : 'Income',
                    Amount,
                    Description: DebtMovementType === 'Debtor'
                        ? `دفع قرض ل ${otherBranchName} (دين: ${Notes})`
                        : `استلام قرض من  ${otherBranchName} (دين: ${Notes})`,
                    BranchID: currentUserBranchID,
                    AddedByUserID: currentUserID,
                    TransactionDate: new Date().toISOString()
                },
                // حركة الفرع الآخر
                {
                    TransactionType: DebtMovementType === 'Debtor' ? 'Income' : 'Expense',
                    Amount,
                    Description: DebtMovementType === 'Debtor'
                        ? `استلام قرض من  ${currentUserBranchName} (دين: ${Notes})`
                        : `دفع قرض ل ${currentUserBranchName} (دين: ${Notes})`,
                    BranchID: otherBranchId,
                    AddedByUserID: currentUserID,
                    TransactionDate: new Date().toISOString()
                }
            ];
            const { error: cashError } = await supabase.from('CashTransactions').insert(cashTransactions);
            if (cashError) throw cashError;

        } else { // Driver or Customer
            const { error: debtError } = await supabase.from('Debts').insert({
                DebtorType, DebtorID, DebtorName, Amount, DebtMovementType, Notes, Status: 'Outstanding', InitiatingBranchID: currentUserBranchID, InitiatorUserID: currentUserID
            });
            if (debtError) throw debtError;

            const cashTransactionType = DebtMovementType === 'Debtor' ? 'Expense' : 'Income';
            const debtorTypeArabic = DebtorType === 'Driver' ? 'سائق' : 'عميل';
            const cashboxDescription = DebtMovementType === 'Debtor'
                ? `دفع ذمة لـ ${DebtorName} (${debtorTypeArabic}): ${Notes}`
                : `استلام ذمة من ${DebtorName} (${debtorTypeArabic}): ${Notes}`;

            const { error: cashError } = await supabase.from('CashTransactions').insert({
                TransactionType: cashTransactionType,
                Amount,
                Description: cashboxDescription,
                BranchID: currentUserBranchID,
                AddedByUserID: currentUserID,
                TransactionDate: new Date().toISOString()
            });
            if (cashError) throw cashError;
        }

        revalidatePath("/debts");
        revalidatePath("/cashbox");

        const successMessage = DebtMovementType === 'Debtor'
            ? `تم تسجيل ذمة مدينة (عليه) على ${DebtorName} بنجاح.`
            : `تم تسجيل ذمة دائنة (له) على ${DebtorName} بنجاح.`;

        return { success: true, message: successMessage };

    } catch (error: any) {
        console.error("Database error creating manual debt:", error);
        return { success: false, message: `فشل تسجيل الذمة: ${error.message}` };
    }
}
export async function getDebts(branchId?: number | null): Promise<Debt[]> {
    try {
        // أولاً: جلب جميع الديون
        const { data: debts, error } = await supabase
            .from('Debts')
            .select('*')
            .order('CreatedAt', { ascending: false });

        if (error) {
            console.error("Supabase error fetching debts:", error);
            return [];
        }

        // ثانياً: جلب أسماء الفروع لكل دين
        const debtsWithBranchNames = await Promise.all(
            debts.map(async (debt) => {
                let otherPartyBranchName = null;
                let initiatingBranchName = null;

                // جلب اسم الفرع المبدئ
                if (debt.InitiatingBranchID) {
                    const { data: branch } = await supabase
                        .from('Branches')
                        .select('Name')
                        .eq('BranchID', debt.InitiatingBranchID)
                        .single();

                    initiatingBranchName = branch?.Name || null;
                }

                // جلب اسم الطرف الآخر للديون بين الفروع
                if (debt.PairedDebtID && debt.DebtorType === 'Branch') {
                    const { data: otherDebt } = await supabase
                        .from('Debts')
                        .select('DebtorName')
                        .eq('DebtID', debt.PairedDebtID)
                        .single();

                    otherPartyBranchName = otherDebt?.DebtorName || null;
                }

                return {
                    ...debt,
                    OtherPartyBranchName: otherPartyBranchName,
                    InitiatingBranchName: initiatingBranchName
                };
            })
        );

        if (branchId === undefined || branchId === null) {
            return debtsWithBranchNames as Debt[];
        }

        // التصفية حسب الفرع
        return debtsWithBranchNames.filter(d => {
            if (d.DebtorType !== 'Branch') {
                return d.InitiatingBranchID === branchId;
            }
            return String(d.DebtorID) === String(branchId);
        }) as Debt[];

    } catch (error: any) {
        console.error("General error fetching debts:", error);
        return [];
    }
}

export async function getDebtsForReport(filters: { branchId?: number | null; debtorType?: DebtorType | null; status?: DebtStatus | null; search?: string | null; debtorName?: string | null; }): Promise<Debt[]> {
    try {
        let query = supabase.from('Debts').select('*');

        if (filters.debtorType) {
            query = query.eq('DebtorType', filters.debtorType);
        }
        if (filters.status) {
            query = query.eq('Status', filters.status);
        }
        if (filters.search) {
            query = query.or(`DebtorName.ilike.%${filters.search}%,Notes.ilike.%${filters.search}%,ParcelID.ilike.%${filters.search}%`);
        }
        if (filters.debtorName) {
            query = query.eq('DebtorName', filters.debtorName);
        }

        let { data: debts, error } = await query.order('CreatedAt', { ascending: false });
        if (error) throw error;

        if (!debts) return [];

        // تعريف الأنواع بشكل صريح
        const branchIds: number[] = [...new Set(debts.map(d => d.InitiatingBranchID).filter((id): id is number => id !== null))] as number[];
        let branchNames: Record<number, string> = {};

        if (branchIds.length > 0) {
            const { data: branches } = await supabase
                .from('Branches')
                .select('BranchID, BranchName')
                .in('BranchID', branchIds);

            if (branches) {
                branchNames = branches.reduce((acc: Record<number, string>, branch) => {
                    acc[branch.BranchID] = branch.BranchName;
                    return acc;
                }, {});
            }
        }

        // جلب أسماء الديون المزدوجة للفروع
        const pairedDebtIds: number[] = debts
            .filter(d => d.PairedDebtID && d.DebtorType === 'Branch')
            .map(d => d.PairedDebtID as number);

        let pairedDebtNames: Record<number, string> = {};

        if (pairedDebtIds.length > 0) {
            const { data: pairedDebts } = await supabase
                .from('Debts')
                .select('DebtID, DebtorName')
                .in('DebtID', pairedDebtIds);

            if (pairedDebts) {
                pairedDebtNames = pairedDebts.reduce((acc: Record<number, string>, debt) => {
                    acc[debt.DebtID] = debt.DebtorName;
                    return acc;
                }, {});
            }
        }

        let processedData = debts.map(d => {
            let otherPartyName = null;

            if (d.DebtorType === 'Branch') {
                otherPartyName = d.PairedDebtID ? pairedDebtNames[d.PairedDebtID] || null : null;
            } else {
                otherPartyName = d.InitiatingBranchID ? branchNames[d.InitiatingBranchID] || null : null;
            }

            return {
                ...d,
                OtherPartyBranchName: otherPartyName,
                InitiatingBranchName: d.InitiatingBranchID ? branchNames[d.InitiatingBranchID] || null : null
            };
        }) as Debt[];

        if (filters.branchId) {
            processedData = processedData.filter(d => {
                if (d.DebtorType !== 'Branch') {
                    return d.InitiatingBranchID === filters.branchId;
                }
                return String(d.DebtorID) === String(filters.branchId);
            });
        }

        return processedData;

    } catch (error: any) {
        console.error("Error fetching debts for report:", error);
        return [];
    }
}
export async function getInvoiceDebts(filters?: { status?: DebtStatus | null; search?: string | null }): Promise<Debt[]> {
    try {
        let query = supabase
            .from('Debts')
            .select('*')
            .not('ParcelID', 'is', null);

        if (filters?.status) {
            query = query.eq('Status', filters.status);
        }
        if (filters?.search) {
            query = query.or(`DebtorName.ilike.%${filters.search}%,ParcelID.ilike.%${filters.search}%`);
        }

        query = query.order('CreatedAt', { ascending: false });

        const { data, error } = await query;
        if (error) {
            console.error("Database error fetching invoice debts:", error);
            return [];
        }

        return data as Debt[];
    } catch (error: any) {
        console.error("General error fetching invoice debts:", error);
        return [];
    }
}
export async function markDebtAsPaid(debtId: number): Promise<{ success: boolean; message: string }> {
    const session = await getSession();
    if (!session?.userId) {
        return { success: false, message: "غير مصرح لك. يجب تسجيل الدخول." };
    }

    const currentUserID = session.userId;
    const currentUserBranchID: number | null = session.branchId || null;

    try {
        const { data: debt, error: fetchError } = await supabase.from('Debts').select('*').eq('DebtID', debtId).single();
        if (fetchError || !debt) {
            return { success: false, message: "لم يتم العثور على الدين." };
        }

        if (debt.Status === 'Paid') {
            return { success: false, message: `الدين رقم ${debtId} مسجل كمدفوع بالفعل.` };
        }

        const idsToUpdate = [debt.DebtID];
        if (debt.PairedDebtID) {
            idsToUpdate.push(debt.PairedDebtID);
        }

        const { error: updateError } = await supabase
            .from('Debts')
            .update({ Status: 'Paid', PaidAt: new Date().toISOString(), UpdatedAt: new Date().toISOString(), SettledByUserID: currentUserID })
            .in('DebtID', idsToUpdate);

        if (updateError) throw updateError;

        // ✅ تسجيل الحركات عند السداد
        if (debt.DebtorType === 'Branch') {
            const { data: pairedDebt, error: pairedError } = await supabase.from('Debts').select('*').eq('DebtID', debt.PairedDebtID).single();
            if (pairedError || !pairedDebt) throw pairedError || new Error("لم يتم العثور على الدين المقترن.");

            const initialCreditorDebt = debt.DebtMovementType === 'Creditor' ? debt : pairedDebt;
            const initialDebtorDebt = debt.DebtMovementType === 'Debtor' ? debt : pairedDebt;

            // عند السداد: عكس الحركات
            await supabase.from('CashTransactions').insert([
                {
                    TransactionType: 'Expense', // كان Creditor (دخل)، الآن عند السداد يصير عكسه
                    Amount: initialCreditorDebt.Amount,
                    Description: ` تسوية دين ودفع إلى ${initialDebtorDebt.DebtorName}`,
                    BranchID: parseInt(initialCreditorDebt.DebtorID, 10),
                    TransactionDate: new Date().toISOString(),
                    AddedByUserID: currentUserID
                },
                {
                    TransactionType: 'Income', // كان Debtor (خسارة)، الآن عند السداد يرجع له دخل
                    Amount: initialDebtorDebt.Amount,
                    Description: ` تسوية دين واستلام من ${initialCreditorDebt.DebtorName}`,
                    BranchID: parseInt(initialDebtorDebt.DebtorID, 10),
                    TransactionDate: new Date().toISOString(),
                    AddedByUserID: currentUserID
                }
            ]);
        } else {
            if (currentUserBranchID) {
                const debtorTypeArabic = debt.DebtorType === 'Driver' ? 'السائق' : 'العميل';

                // ✅ عكس نوع الحركة عند السداد
                const cashTransactionType = debt.DebtMovementType === 'Debtor' ? 'Income' : 'Expense';

                const cashboxDescription = `تسوية دين ${cashTransactionType === 'Income' ? 'مدين' : 'دائن'} من ${debt.DebtorName} (${debtorTypeArabic}) - دين رقم: ${debt.DebtID}`;

                await supabase.from('CashTransactions').insert({
                    TransactionType: cashTransactionType,
                    Amount: debt.Amount,
                    Description: cashboxDescription,
                    BranchID: currentUserBranchID,
                    TransactionDate: new Date().toISOString(),
                    AddedByUserID: currentUserID
                });
            }
        }

        revalidatePath("/debts");
        revalidatePath("/cashbox");
        return { success: true, message: `تم تسجيل الدين رقم ${debtId} كمدفوع.` };

    } catch (error: any) {
        console.error("Database error marking debt as paid:", error);
        return { success: false, message: `فشل تحديث حالة الدين: ${error.message}` };
    }
}
export async function updateDebt(
    prevState: ManualDebtFormState,
    formData: FormData
): Promise<ManualDebtFormState> {
    const validatedFields = UpdateDebtSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return { success: false, message: "مدخلات غير صالحة. يرجى التحقق من الحقول.", errors: validatedFields.error.flatten().fieldErrors };
    }

    const { DebtID, Amount, Notes } = validatedFields.data;

    try {
        const { data: debt, error: fetchError } = await supabase.from('Debts').select('PairedDebtID').eq('DebtID', DebtID).single();
        if (fetchError) throw fetchError;
        if (!debt) return { success: false, message: "لم يتم العثور على الدين." };

        const updates = { Amount, Notes, UpdatedAt: new Date().toISOString() };

        await supabase.from('Debts').update(updates).eq('DebtID', DebtID);

        if (debt.PairedDebtID) {
            await supabase.from('Debts').update(updates).eq('DebtID', debt.PairedDebtID);
        }

        revalidatePath("/debts");
        return { success: true, message: "تم تحديث الدين بنجاح." };
    } catch (error: any) {
        console.error("Database error updating debt:", error);
        return { success: false, message: `فشل تحديث الدين: ${error.message}` };
    }
}


export async function deleteDebt(debtId: number): Promise<{ success: boolean; message: string }> {
    try {
        const { data: debt, error: fetchError } = await supabase.from('Debts').select('PairedDebtID').eq('DebtID', debtId).single();
        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

        if (!debt) return { success: true, message: "الدين محذوف بالفعل." };

        const debtsToDelete = [debtId];
        if (debt.PairedDebtID) {
            debtsToDelete.push(debt.PairedDebtID);
        }

        const { error: deleteError } = await supabase.from('Debts').delete().in('DebtID', debtsToDelete);
        if (deleteError) throw deleteError;

        revalidatePath("/debts");
        return { success: true, message: `تم حذف الدين بنجاح.` };

    } catch (error: any) {
        console.error("Database error deleting debt:", error);
        return { success: false, message: `فشل حذف الدين: ${error.message}` };
    }
}

