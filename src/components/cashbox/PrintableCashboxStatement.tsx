"use client";

import type { CashTransaction, Branch } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';

interface PrintableCashboxStatementProps {
    transactions: CashTransaction[];
    branches: Branch[];
    filters: {
        branchId: string | null;
        startDate: string | null;
        endDate: string | null;
    };
}

const formatCurrencyYER = (value: number) => {
    return new Intl.NumberFormat('ar-YE', { style: 'currency', currency: 'YER', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

const getBranchName = (branchId: number | null | undefined, branches: Branch[]): string => {
    if (branchId === null || branchId === undefined) return 'عام';
    const branch = branches.find(b => b.BranchID === branchId);
    return branch ? branch.Name : `فرع ${branchId}`;
};

export function PrintableCashboxStatement({ transactions, branches, filters }: PrintableCashboxStatementProps) {
    const systemName = typeof window !== 'undefined' ? localStorage.getItem('SystemName') || "جلوبال تراك" : "جلوبال تراك";
    const logoUrl = typeof window !== 'undefined' ? localStorage.getItem('SystemLogo') || "" : "";

    const totalIncome = transactions.filter(t => t.TransactionType === 'Income').reduce((sum, t) => sum + t.Amount, 0);
    const totalExpense = transactions.filter(t => t.TransactionType === 'Expense').reduce((sum, t) => sum + t.Amount, 0);
    const netChange = totalIncome - totalExpense;

    let branchName = "الإجمالي (كل الفروع)";
    if (filters.branchId === 'general') {
        branchName = "الصندوق العام";
    } else if (filters.branchId && filters.branchId !== 'all') {
        branchName = getBranchName(parseInt(filters.branchId, 10), branches);
    }

    let dateFilterString = "لكل الأوقات";
    if (filters.startDate && filters.endDate) {
        dateFilterString = `من ${format(new Date(filters.startDate), 'P', { locale: arSA })} إلى ${format(new Date(filters.endDate), 'P', { locale: arSA })}`;
    } else if (filters.startDate) {
        dateFilterString = `من ${format(new Date(filters.startDate), 'P', { locale: arSA })}`;
    } else if (filters.endDate) {
        dateFilterString = `حتى ${format(new Date(filters.endDate), 'P', { locale: arSA })}`;
    }

    return (
        <div className="printable-report-area p-4 print:p-0 bg-white text-black">
            <Card className="print:shadow-none print:border-none">
                <CardHeader className="print:pb-2 text-center border-b border-gray-300">
                    <div className="report-header-print">
                        {logoUrl && (
                            <img src={logoUrl} alt="شعار الشركة" className="mx-auto mb-2 h-12 print:h-10 object-contain" data-ai-hint="company logo" />
                        )}
                        <h1 className="text-2xl font-bold">{systemName}</h1>
                        <h2 className="text-xl font-semibold mt-2">كشف حساب الصندوق</h2>
                    </div>
                </CardHeader>
                <CardContent className="print:pt-2 text-sm print:text-xs">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 my-2 print:my-1 text-xs">
                        <div><strong>الصندوق:</strong> {branchName}</div>
                        <div className="text-left print:text-right"><strong>تاريخ الطباعة:</strong> {format(new Date(), 'PPpp', { locale: arSA })}</div>
                        <div><strong>الفترة:</strong> {dateFilterString}</div>
                    </div>
                    <Separator className="my-2" />
                    <div className="overflow-x-auto mt-2 print:mt-1">
                        <Table className="print:text-xs min-w-full">
                            <TableHeader>
                                <TableRow className="bg-gray-100 print:bg-gray-100">
                                    <TableHead className="print:p-1 border border-gray-300">التاريخ</TableHead>
                                    <TableHead className="print:p-1 border border-gray-300">الوصف</TableHead>
                                    <TableHead className="print:p-1 border border-gray-300">الفرع</TableHead>
                                    <TableHead className="print:p-1 border border-gray-300 text-green-600">إيراد</TableHead>
                                    <TableHead className="print:p-1 border border-gray-300 text-red-600">مصروف</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.length > 0 ? (
                                    transactions.map((t) => (
                                        <TableRow key={t.TransactionID}>
                                            <TableCell className="print:p-1 border border-gray-300">{format(new Date(t.TransactionDate), 'P', { locale: arSA })}</TableCell>
                                            <TableCell className="print:p-1 border border-gray-300">{t.Description}</TableCell>
                                            <TableCell className="print:p-1 border border-gray-300">{getBranchName(t.BranchID, branches)}</TableCell>
                                            <TableCell className="print:p-1 border border-gray-300 text-green-600">
                                                {t.TransactionType === 'Income' ? formatCurrencyYER(t.Amount) : '-'}
                                            </TableCell>
                                            <TableCell className="print:p-1 border border-gray-300 text-red-600">
                                                {t.TransactionType === 'Expense' ? formatCurrencyYER(t.Amount) : '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24 border border-gray-300">لا توجد حركات للفترة المحددة.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="mt-4 print:mt-3 flex justify-end">
                        <div className="text-left w-1/2 md:w-1/3 text-xs space-y-1">
                            <div className="flex justify-between font-semibold">
                                <span>إجمالي الإيرادات:</span>
                                <span className="text-green-600">{formatCurrencyYER(totalIncome)}</span>
                            </div>
                            <div className="flex justify-between font-semibold">
                                <span>إجمالي المصروفات:</span>
                                <span className="text-red-600">{formatCurrencyYER(totalExpense)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-bold text-sm">
                                <span>صافي الحركة:</span>
                                <span className={netChange >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrencyYER(netChange)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="report-footer-print mt-6 print:mt-4 text-xs text-center">
                        <p>&copy; {new Date().getFullYear()} {systemName}. جميع الحقوق محفوظة.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
