
"use client";

import { useState, useMemo, useEffect, useTransition, useCallback } from 'react';
import type { CashTransaction, Branch, User } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AddTransactionForm } from './AddTransactionForm';
import { TransactionsTable } from './TransactionsTable';
import { getCashboxBalance, getCashTransactions } from '@/actions/cashbox';
import { Loader2, CalendarIcon, Filter, FileText } from 'lucide-react';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface CashboxClientProps {
    initialBranches: Branch[];
    initialUsers: User[];
    initialTransactions: CashTransaction[];
    initialBalance: number;
}

const formatCurrencyYER = (value: number) => {
    return new Intl.NumberFormat('ar-YE', { style: 'currency', currency: 'YER', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

const ALL_BRANCHES_VALUE = "all";

export function CashboxClient({
    initialBranches,
    initialUsers,
    initialTransactions,
    initialBalance
}: CashboxClientProps) {
    const [balance, setBalance] = useState(initialBalance);
    const [transactions, setTransactions] = useState<CashTransaction[]>(initialTransactions);
    const [selectedBranchId, setSelectedBranchId] = useState<string>(initialBranches.length > 0 ? String(initialBranches[0].BranchID) : ALL_BRANCHES_VALUE);
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [isFetching, startFetchingTransition] = useTransition();
    const router = useRouter();

    useEffect(() => {
        startFetchingTransition(async () => {
            try {
                let branchIdParam: number | null | undefined = undefined;
                if (selectedBranchId !== ALL_BRANCHES_VALUE) {
                    branchIdParam = parseInt(selectedBranchId, 10);
                }

                const startDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
                const endDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;

                const [newBalance, newTransactions] = await Promise.all([
                    getCashboxBalance(branchIdParam),
                    getCashTransactions(branchIdParam, startDate, endDate)
                ]);

                setBalance(newBalance);
                setTransactions(newTransactions);
            } catch (error) {
                console.error("Failed to refetch cashbox data:", error);
            }
        });
    }, [selectedBranchId, dateRange]);


    const handleDownloadStatement = () => {
        const params = new URLSearchParams();
        params.append('branchId', selectedBranchId);
        if (dateRange?.from) params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
        if (dateRange?.to) params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));

        const url = `/cashbox/statement?${params.toString()}`;
        window.open(url, '_blank');
    }

    const totalIncome = useMemo(() => {
        return transactions
            .filter(t => t.TransactionType === 'Income')
            .reduce((sum, t) => sum + t.Amount, 0);
    }, [transactions]);

    const totalExpense = useMemo(() => {
        return transactions
            .filter(t => t.TransactionType === 'Expense')
            .reduce((sum, t) => sum + t.Amount, 0);
    }, [transactions]);

    const selectedBranchName = useMemo(() => {
        if (selectedBranchId === ALL_BRANCHES_VALUE) return "الإجمالي (كل الفروع)";
        const branch = initialBranches.find(b => b.BranchID.toString() === selectedBranchId);
        return branch ? `فرع: ${branch.Name}` : "غير محدد";
    }, [selectedBranchId, initialBranches]);

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>فلترة الصندوق</CardTitle>
                    <CardDescription>اختر الصندوق والفترة الزمنية لعرض الحركات.</CardDescription>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
                    <div className="w-full">
                        <Label htmlFor="branch-filter">اختر الصندوق</Label>
                        <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                            <SelectTrigger id="branch-filter">
                                <SelectValue placeholder="اختر صندوقًا..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL_BRANCHES_VALUE}>الصندوق الإجمالي (كل الفروع)</SelectItem>
                                {initialBranches.map(branch => (
                                    <SelectItem key={branch.BranchID} value={String(branch.BranchID)}>
                                        صندوق فرع: {branch.Name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="date-range-picker">اختر فترة زمنية</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="date-range-picker"
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !dateRange && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="me-2 h-4 w-4" />
                                    {dateRange?.from ? (
                                        dateRange.to ? (
                                            <>
                                                {format(dateRange.from, "LLL dd, y", { locale: arSA })} -{" "}
                                                {format(dateRange.to, "LLL dd, y", { locale: arSA })}
                                            </>
                                        ) : (
                                            format(dateRange.from, "LLL dd, y", { locale: arSA })
                                        )
                                    ) : (
                                        <span>اختر تاريخًا</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateRange?.from}
                                    selected={dateRange}
                                    onSelect={setDateRange}
                                    numberOfMonths={2}
                                    locale={arSA}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="flex gap-2">
                        {/* The filter is now applied automatically by useEffect */}
                        <Button onClick={handleDownloadStatement} variant="outline" className="flex-grow">
                            <FileText className="me-2 h-4 w-4" />
                            طباعة الكشف
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-3 mt-6">
                <div className="lg:col-span-1 space-y-6">
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle>الرصيد الحالي ({selectedBranchName})</CardTitle>
                            <CardDescription>هذا الرصيد يعكس كل الحركات حتى اليوم.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isFetching ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    <span>جاري الحساب...</span>
                                </div>
                            ) : (
                                <p className="text-4xl font-bold text-primary">{formatCurrencyYER(balance)}</p>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>ملخص الحركات للفترة المحددة</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">إجمالي الإيرادات:</span>
                                <span className="font-medium text-green-600">{formatCurrencyYER(totalIncome)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">إجمالي المصروفات:</span>
                                <span className="font-medium text-red-600">{formatCurrencyYER(totalExpense)}</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle>إضافة حركة جديدة</CardTitle>
                            <CardDescription>تسجيل إيراد أو مصروف نقدي في صندوق فرع محدد.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AddTransactionForm
                                branches={initialBranches.map(b => ({ BranchID: b.BranchID, Name: b.Name }))}
                            />
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle>سجل الحركات ({selectedBranchName})</CardTitle>
                            <CardDescription>قائمة بجميع الحركات النقدية المسجلة في الصندوق والفترة المحددة.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isFetching ? (
                                <div className="flex items-center justify-center h-48 gap-2">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    <span>جاري تحميل الحركات...</span>
                                </div>
                            ) : (
                                <TransactionsTable
                                    transactions={transactions}
                                    users={initialUsers}
                                    branches={initialBranches}
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}
