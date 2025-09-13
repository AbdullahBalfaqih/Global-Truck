"use client";

import { useMemo, useState, useEffect } from 'react';
import type { Parcel, Expense, Driver, Branch } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { StatCard } from "@/components/dashboard/StatCard";
import { DollarSign, TrendingUp, TrendingDown, FileText, Users, CreditCard, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { getAllBranches } from '@/actions/branches'; // استيراد دالة لجلب الفروع

interface FinancialsClientProps {
    parcels: Parcel[];
    expenses: Expense[];
    drivers: Driver[];
    branches: Branch[];
}

interface FinancialSummary {
    totalRevenue: number;
    totalParcelTaxes: number;
    totalParcelCommissions: number;
    totalExpenses: number;
    netIncome: number;
    filteredByBranchName?: string;
}

const ALL_BRANCHES_VALUE = "_all_";

export function FinancialsClient({ parcels = [], expenses = [], drivers = [] }: FinancialsClientProps) {
    const [selectedBranchId, setSelectedBranchId] = useState<string>(ALL_BRANCHES_VALUE);
    const [branches, setBranches] = useState<Branch[]>([]);

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const fetchedBranches = await getAllBranches();
                setBranches(fetchedBranches);
            } catch (error) {
                console.error("Failed to fetch branches:", error);
            }
        };
        fetchBranches();
    }, []);

  

    const summary = useMemo<FinancialSummary>(() => {
        let filteredParcels = parcels;
        let filteredExpenses = expenses;
        let filteredByBranchName = "كل الفروع";

        if (selectedBranchId !== ALL_BRANCHES_VALUE) {
            const branchIdNumber = parseInt(selectedBranchId, 10);
            filteredParcels = parcels.filter(p => p.OriginBranchID === branchIdNumber);
            filteredExpenses = expenses.filter(e => e.BranchID === branchIdNumber);
            const selectedBranch = branches.find(b => b.BranchID === branchIdNumber);
            if (selectedBranch) {
                filteredByBranchName = `${selectedBranch.Name}`;
            } else {
                filteredByBranchName = `فرع غير معروف (ID: ${branchIdNumber})`;
            }
        }

        let totalRevenue = 0;
        let totalParcelTaxes = 0;
        let totalParcelCommissions = 0;

        filteredParcels.forEach(parcel => {
            totalRevenue += parcel.ShippingCost || 0;
            totalParcelTaxes += parcel.ShippingTax || 0;
            totalParcelCommissions += parcel.DriverCommission || 0;
        });

        const totalExpenses = filteredExpenses.reduce((acc, expense) => acc + (expense.Amount || 0), 0);
        const netIncome = totalRevenue - (totalParcelCommissions + totalExpenses);

        return { totalRevenue, totalParcelTaxes, totalParcelCommissions, totalExpenses, netIncome, filteredByBranchName };
    }, [parcels, expenses, selectedBranchId, branches]);

    const formatCurrencyYER = (value: number) => {
        if (isNaN(value)) return 'غير متوفر';
        return new Intl.NumberFormat('ar-YE', { style: 'currency', currency: 'YER', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
    };

    const chartData = [
        { name: 'الإيرادات', value: summary.totalRevenue, fill: 'hsl(var(--chart-1))' },
        { name: 'ضرائب الطرود', value: summary.totalParcelTaxes, fill: 'hsl(var(--chart-3))' },
        { name: 'عمولات الطرود', value: summary.totalParcelCommissions, fill: 'hsl(var(--chart-4))' },
        { name: 'المصروفات', value: summary.totalExpenses, fill: 'hsl(var(--chart-5))' },
        { name: 'صافي الدخل', value: summary.netIncome, fill: 'hsl(var(--chart-2))' },
    ];

    const statCardsData = [
        { title: 'إجمالي الإيرادات', value: formatCurrencyYER(summary.totalRevenue), icon: DollarSign },
        { title: 'إجمالي ضرائب الطرود', value: formatCurrencyYER(summary.totalParcelTaxes), icon: FileText },
        { title: 'إجمالي عمولات الطرود', value: formatCurrencyYER(summary.totalParcelCommissions), icon: Users },
        { title: 'إجمالي المصروفات', value: formatCurrencyYER(summary.totalExpenses), icon: CreditCard },
        { title: 'صافي الدخل', value: formatCurrencyYER(summary.netIncome), icon: summary.netIncome >= 0 ? TrendingUp : TrendingDown, trend: summary.netIncome >= 0 ? 'ربح' : 'خسارة' },
    ];

    return (
        <div className="space-y-8">
            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle>فلترة الملخص المالي حسب الفرع</CardTitle>
                            <CardDescription>اختر فرعًا لعرض الإحصائيات المالية الخاصة به أو اختر "كل الفروع" للعرض الإجمالي.</CardDescription>
                        </div>
                        <div className="w-full sm:w-auto min-w-[200px]">
                            <Label htmlFor="branch-filter" className="sr-only">اختر الفرع</Label>
                            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                                <SelectTrigger id="branch-filter" className="w-full">
                                    <SelectValue placeholder="اختر فرعًا..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL_BRANCHES_VALUE}>
                                        <div className="flex items-center gap-2">
                                            <Filter className="h-4 w-4" />
                                            كل الفروع
                                        </div>
                                    </SelectItem>
                                    {branches.map(branch => (
                                        <SelectItem key={branch.BranchID} value={branch.BranchID.toString()}>
                                            {branch.Name} 
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle>
                        نظرة عامة على الإحصائيات المالية - {summary.filteredByBranchName}
                    </CardTitle>
                    <CardDescription>
                        ملخص للإيرادات، التكاليف، وصافي الدخل
                        {selectedBranchId !== ALL_BRANCHES_VALUE ? ` لفرع ${summary.filteredByBranchName}` : ' لجميع الفروع'}.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                        {statCardsData.map((stat) => (
                            <StatCard key={stat.title} stat={stat} />
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle>
                        نظرة عامة على ماليات الطرود والمصروفات - {summary.filteredByBranchName}
                    </CardTitle>
                    <CardDescription>
                        رسم بياني يوضح توزيع الإيرادات، ضرائب الطرود، عمولات الطرود، المصروفات، وصافي الدخل
                        {selectedBranchId !== ALL_BRANCHES_VALUE ? ` لفرع ${summary.filteredByBranchName}` : ' لجميع الفروع'}.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={{ value: { label: 'المبلغ (ر.ي)' } }} className="min-h-[300px] w-full">
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                                <YAxis allowDecimals={false} tickFormatter={(value) => formatCurrencyYER(value)} />
                                <RechartsTooltip
                                    cursor={{ fill: 'hsl(var(--muted))' }}
                                    content={<ChartTooltipContent
                                        formatter={(value, name, props) => (
                                            <div className="flex flex-col">
                                                <span className="font-bold" style={{ color: props.payload.fill }}>{props.payload.name}</span>
                                                <span>{formatCurrencyYER(Number(value))}</span>
                                            </div>
                                        )}
                                    />}
                                />
                                <Bar dataKey="value" radius={4} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
                <CardFooter>
                    <p className="text-xs text-muted-foreground">
                        البيانات المعروضة تستند إلى الطرود والمصروفات المسجلة في النظام
                        {selectedBranchId !== ALL_BRANCHES_VALUE ? ` والمرتبطة بفرع ${summary.filteredByBranchName}` : ''}.
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}