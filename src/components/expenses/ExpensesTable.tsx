
"use client";

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Expense, Branch } from '@/types';
import { ClientFormattedDate } from '@/components/utils/ClientFormattedDate';
import { arSA } from 'date-fns/locale';
import { Button } from "../ui/button";
import { Edit3, Trash2 } from "lucide-react";


interface ExpensesTableProps {
    expenses: Expense[];
    branches: Pick<Branch, 'BranchID' | 'Name'>[];
}

const formatCurrencyYER = (value: number) => {
    return new Intl.NumberFormat('ar-YE', { style: 'currency', currency: 'YER', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

const getBranchName = (branchId: number | undefined | null, branches: Pick<Branch, 'BranchID' | 'Name'  >[]): string => {
    if (!branchId) return 'مصروف عام';
    const branch = branches.find(b => b.BranchID === branchId);
    return branch ? `${branch.Name} ` : `فرع غير معروف (${branchId})`;
};


export function ExpensesTable({ expenses, branches }: ExpensesTableProps) {
    if (!expenses || expenses.length === 0) {
        return <p className="text-center text-muted-foreground py-4">لا توجد مصروفات لعرضها حاليًا.</p>;
    }

    return (
        <div className="overflow-x-auto border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow className="bg-primary hover:bg-primary/90">
                        <TableHead className="text-center text-primary-foreground">الوصف</TableHead>
                        <TableHead className="text-center text-primary-foreground">المبلغ</TableHead>
                        <TableHead className="text-center text-primary-foreground">التاريخ</TableHead>
                        <TableHead className="text-center text-primary-foreground">الفرع</TableHead>
                        <TableHead className="text-center text-primary-foreground">أضيف بواسطة</TableHead>
                        <TableHead className="text-center text-primary-foreground">إجراءات</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {expenses.map((expense) => (
                        <TableRow key={expense.ExpenseID}>
                            <TableCell className="font-medium text-center">{expense.Description}</TableCell>
                            <TableCell className="text-center">{formatCurrencyYER(expense.Amount)}</TableCell>
                            <TableCell className="text-center">
                                <ClientFormattedDate dateString={expense.DateSpent} formatString="PPP" locale={arSA} />
                            </TableCell>
                            <TableCell className="text-center">{getBranchName(expense.BranchID, branches)}</TableCell>
                            <TableCell className="text-center">{expense.AddedByUserName || `مستخدم (${expense.AddedByUserID})`}</TableCell>
                            <TableCell className="text-center space-x-1 rtl:space-x-reverse">
                                <Button variant="outline" size="sm" title="تعديل (قيد الإنشاء)" disabled>
                                    <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" title="حذف (قيد الإنشاء)" className="text-destructive hover:bg-destructive/10" disabled>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
