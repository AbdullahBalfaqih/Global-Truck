"use client";

import type { Debt, DebtorType, DebtStatus, Branch } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';

interface PrintableDebtsReportProps {
    debts: Debt[];
    filters: {
        debtorType: DebtorType | null;
        debtorId: string | null;
        status: DebtStatus | null;
        search: string | null;
    };
    allBranches: Branch[];
}

const formatCurrencyYER = (value: number) => {
    return new Intl.NumberFormat('ar-YE', {
        style: 'currency',
        currency: 'YER',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
};

const getDebtorTypeArabic = (type: DebtorType | null) => {
    if (!type) return 'الكل';
    switch (type) {
        case 'Customer': return 'العملاء';
        case 'Driver': return 'السائقين';
        case 'Branch': return 'الفروع';
        default: return 'غير معروف';
    }
}

const getStatusArabic = (status: DebtStatus | null): string => {
    if (!status) return 'الكل';
    switch (status) {
        case 'Outstanding': return 'المستحقة';
        case 'Paid': return 'المدفوعة';
        case 'PendingSettlement': return 'بانتظار التأكيد';
        default: return status;
    }
};
const getMovementTypeArabic = (
    type: Debt['DebtMovementType'],
    debtorType?: Debt['DebtorType']
) => {
    if (debtorType === 'Branch') {
        switch (type) {
            case 'Debtor': return 'دائن (عليه)';
            case 'Creditor': return 'مدين (له)';
            default: return type;
        }
    }

    // الحالة العادية (عملاء/سائقين)
    switch (type) {
        case 'Creditor': return 'مدين (له)';
        case 'Debtor': return 'دائن (عليه)';
        default: return type;
    }
};

const getOtherPartyName = (debt: Debt, allBranches: Branch[], debts: Debt[]): string => {
    // للعملاء والسائقين: عرض اسم العميل/السائق (DebtorName) فقط
    if (debt.DebtorType === 'Customer' || debt.DebtorType === 'Driver') {
        return debt.DebtorName;
    }

    // للفروع: نريد اسم الفرع الطرف الآخر (ليس الفرع الحالي)
    if (debt.DebtorType === 'Branch') {
        // إذا كان هناك OtherPartyBranchName (من الخادم) استخدمه
        if (debt.OtherPartyBranchName) {
            return debt.OtherPartyBranchName;
        }

        // إذا كان هناك PairedDebtID، ابحث عن الدين المزدوج
        if (debt.PairedDebtID) {
            const pairedDebt = debts.find(d => d.DebtID === debt.PairedDebtID);
            if (pairedDebt) return pairedDebt.DebtorName;
        }

        // إذا لم يكن هناك دين مزدوج، قد يكون هذا الدين هو الطرف الآخر
        // ابحث عن دين يشير إلى هذا الدين كـ PairedDebtID
        const correspondingDebt = debts.find(d => d.PairedDebtID === debt.DebtID);
        if (correspondingDebt) return correspondingDebt.DebtorName;

        // إذا لم يكن هناك أي من الخيارات السابقة، استخدم اسم الفرع المبدئي
        if (debt.InitiatingBranchID) {
            const initiatingBranch = allBranches.find(b => b.BranchID === debt.InitiatingBranchID);
            return initiatingBranch?.Name || debt.DebtorName;
        }
    }

    return debt.DebtorName;
}

export function PrintableDebtsReport({
    debts,
    filters,
    allBranches,
}: PrintableDebtsReportProps) {
    const outstandingDebts = debts.filter(d => d.Status !== 'Paid');

    const debtorTotal = outstandingDebts
        .filter(debt => debt.DebtMovementType === 'Debtor')
        .reduce((sum, debt) => sum + debt.Amount, 0);

    const creditorTotal = outstandingDebts
        .filter(debt => debt.DebtMovementType === 'Creditor')
        .reduce((sum, debt) => sum + debt.Amount, 0);

    const totalAmount = debtorTotal - creditorTotal;

    const getFilterBranchName = () => {
        if (filters.debtorType === 'Branch' && filters.debtorId) {
            const branch = allBranches.find(b => b.BranchID.toString() === filters.debtorId);
            return branch ? `: ${branch.Name}` : `لفرع ID: ${filters.debtorId}`;
        }
        return '';
    }

    return (
        <div className="printable-report-area bg-white text-black p-4 print:p-2">
            <div className="text-center mb-4">
                <img
                    src="/images/logo.png"
                    alt="شعار الشركة"
                    className="mx-auto mb-2 h-20 print:h-16 object-contain"
                    data-ai-hint="company logo"
                    onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                    }}
                />
                <h1 className="text-2xl font-bold mt-2">مكتب الجعيدي</h1>
                <p className="text-lg font-semibold">تقرير الديون</p>
            </div>

            <div className="flex justify-between items-center text-xs mb-2 border-t border-b py-1 border-black">
                <div>
                    <p><strong>نوع الديون:</strong> {getDebtorTypeArabic(filters.debtorType)} {getFilterBranchName()}</p>
                    <p><strong>حالة الديون:</strong> {getStatusArabic(filters.status)}</p>
                </div>
                <div className="text-right">
                    <p><strong>تاريخ الطباعة:</strong> {format(new Date(), 'PPpp', { locale: arSA })}</p>
                </div>
            </div>

            <div className="overflow-x-auto mt-2 print:mt-1">
                <Table className="print:text-xs min-w-full">
                    <TableHeader>
                        <TableRow className="bg-gray-200 print:bg-gray-200">
                            <TableHead className="print:p-1 w-[3%] border border-black text-black">#</TableHead>
                            <TableHead className="print:p-1 w-[20%] border border-black text-black">الطرف الآخر</TableHead>
                            <TableHead className="print:p-1 w-[12%] border border-black text-black">نوع الحركة</TableHead>
                            <TableHead className="print:p-1 w-[25%] border border-black text-black">السبب/رقم الطرد</TableHead>
                            <TableHead className="print:p-1 w-[10%] border border-black text-black">المبلغ</TableHead>
                            <TableHead className="print:p-1 w-[10%] border border-black text-black">الحالة</TableHead>
                            <TableHead className="print:p-1 w-[10%] border border-black text-black">تاريخ الإنشاء</TableHead>
                            <TableHead className="print:p-1 w-[10%] border border-black text-black">تاريخ السداد</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {debts.length > 0 ? (
                            debts.map((debt, index) => (
                                <TableRow key={debt.DebtID}>
                                    <TableCell className="print:p-1 border border-black text-center">{index + 1}</TableCell>
                                    <TableCell className="font-medium print:p-1 border border-black">
                                        {getOtherPartyName(debt, allBranches, debts)}
                                    </TableCell>
                                    <TableCell className="print:p-1 border border-black">
                                        {getMovementTypeArabic(debt.DebtMovementType, debt.DebtorType)}
                                    </TableCell>
                                    <TableCell className="print:p-1 border border-black">{debt.Notes || debt.ParcelID || '-'}</TableCell>
                                    <TableCell className="print:p-1 border border-black text-center">{formatCurrencyYER(debt.Amount)}</TableCell>
                                    <TableCell className="print:p-1 border border-black text-center">{getStatusArabic(debt.Status)}</TableCell>
                                    <TableCell className="print:p-1 border border-black text-center">{format(new Date(debt.CreatedAt), 'P', { locale: arSA })}</TableCell>
                                    <TableCell className="print:p-1 border border-black text-center">{debt.PaidAt ? format(new Date(debt.PaidAt), 'P', { locale: arSA }) : '-'}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center h-24 border border-black">لا توجد ديون تطابق الفلترة الحالية.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    <TableFooter>
                        {filters.debtorType === 'Branch' ? (
                            <>
                                <TableRow className="font-bold bg-gray-100">
                                    <TableCell colSpan={4} className="text-left print:p-1 border border-black">
                                        إجمالي المدين (له):
                                    </TableCell>
                                    <TableCell
                                        colSpan={4}
                                        className="text-center print:p-1 border border-black text-green-600"
                                    >
                                        {formatCurrencyYER(creditorTotal)} 
                                    </TableCell>
                                </TableRow>
                                <TableRow className="font-bold bg-gray-100">
                                    <TableCell colSpan={4} className="text-left print:p-1 border border-black">
                                        إجمالي الدائن (عليه):
                                    </TableCell>
                                    <TableCell
                                        colSpan={4}
                                        className="text-center print:p-1 border border-black text-red-600"
                                    >
                                        {formatCurrencyYER(debtorTotal)}
                                    </TableCell>
                                </TableRow>
                            </>
                        ) : (
                            <>
                                <TableRow className="font-bold bg-gray-100">
                                    <TableCell colSpan={4} className="text-left print:p-1 border border-black">
                                        إجمالي المدين (له):
                                    </TableCell>
                                    <TableCell
                                        colSpan={4}
                                        className="text-center print:p-1 border border-black text-green-600"
                                    >
                                        {formatCurrencyYER(creditorTotal)}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="font-bold bg-gray-100">
                                    <TableCell colSpan={4} className="text-left print:p-1 border border-black">
                                        إجمالي الدائن (عليه):
                                    </TableCell>
                                    <TableCell
                                        colSpan={4}
                                        className="text-center print:p-1 border border-black text-red-600"
                                    >
                                        {formatCurrencyYER(debtorTotal)}
                                    </TableCell>
                                </TableRow>
                            </>
                        )}

                   
                    </TableFooter>

                </Table>
            </div>

            <div className="report-footer-print mt-6 print:mt-4 text-xs text-center border-t border-black pt-2">
                <p>&copy; {new Date().getFullYear()} مكتب الجعيدي. جميع الحقوق محفوظة.</p>
            </div>
        </div>
    );
}