
"use client";

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/actions/auth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { CashTransaction, User, Branch } from '@/types';
import { ClientFormattedDate } from '@/components/utils/ClientFormattedDate';
import { arSA } from 'date-fns/locale';
import { ArrowUp, ArrowDown, Trash2, Printer, Loader2, AlertCircle } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteCashTransaction } from '@/actions/cashbox';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface TransactionsTableProps {
    transactions: CashTransaction[];
    users: User[];
    branches: Branch[];
}

const formatCurrencyYER = (value: number) => {
    return new Intl.NumberFormat('ar-YE', { style: 'currency', currency: 'YER', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

export function TransactionsTable({ transactions, users, branches }: TransactionsTableProps) {
    const router = useRouter();
    const [session, setSession] = useState<any>(null);
    const { toast } = useToast();

    const [transactionToDelete, setTransactionToDelete] = useState<CashTransaction | null>(null);

    const [isDeleting, startDeleteTransition] = useTransition();

    useEffect(() => {
        const fetchSession = async () => {
            const sessionData = await getSession();
            setSession(sessionData);
        };
        fetchSession();
    }, []);

    const userRole = session?.role;

    const getUserName = (userId: number) => users.find(u => u.UserID === userId)?.Name || `مستخدم ${userId}`;
    const getBranchName = (branchId: number | null | undefined) => {
        if (!branchId) return 'N/A';
        return branches.find(b => b.BranchID === branchId)?.Name || `فرع ${branchId}`;
    };

    const handlePrint = (transactionId: number) => {
        router.push(`/cashbox/voucher/print?id=${transactionId}`);
    };

    const handleDelete = () => {
        if (!transactionToDelete) return;
        startDeleteTransition(async () => {
            const result = await deleteCashTransaction(transactionToDelete.TransactionID);
            if (result.success) {
                toast({ title: 'نجاح', description: result.message });
                // The page will be revalidated by the server action
            } else {
                toast({ variant: 'destructive', title: 'خطأ', description: result.message });
            }
            setTransactionToDelete(null);
        });
    };

    return (
        <TooltipProvider>
            <div className="overflow-x-auto border rounded-lg">
                <Table>
                    <TableHeader className="bg-primary text-primary-foreground">
                        <TableRow>
                            <TableHead className="text-center text-primary-foreground">النوع</TableHead>
                            <TableHead className="text-center text-primary-foreground">المبلغ</TableHead>
                            <TableHead className="text-center text-primary-foreground">الوصف</TableHead>
                            <TableHead className="text-center text-primary-foreground">التاريخ</TableHead>
                            <TableHead className="text-center text-primary-foreground">الفرع</TableHead>
                            <TableHead className="text-center text-primary-foreground">أضيف بواسطة</TableHead>
                            <TableHead className="text-center text-primary-foreground">إجراءات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.length > 0 ? (
                            transactions.map(t => (
                                <TableRow key={t.TransactionID} className="hover:bg-muted/20">
                                    <TableCell className="text-center">
                                        <Badge variant={t.TransactionType === 'Income' ? 'default' : 'destructive'} className={t.TransactionType === 'Income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                            {t.TransactionType === 'Income' ? <ArrowUp className="me-1 h-3 w-3" /> : <ArrowDown className="me-1 h-3 w-3" />}
                                            {t.TransactionType === 'Income' ? 'إيراد' : 'مصروف'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className={`text-center font-semibold text-lg ${t.TransactionType === 'Income' ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatCurrencyYER(t.Amount)}
                                    </TableCell>
                                    <TableCell className="text-center">{t.Description}</TableCell>
                                    <TableCell className="text-center">
                                        <ClientFormattedDate dateString={t.TransactionDate} formatString="P" locale={arSA} />
                                    </TableCell>
                                    <TableCell className="text-center">{getBranchName(t.BranchID)}</TableCell>
                                    <TableCell className="text-center">{getUserName(t.AddedByUserID)}</TableCell>
                                    <TableCell className="text-center space-x-1 rtl:space-x-reverse">
                                        <Tooltip>
                                            <TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => handlePrint(t.TransactionID)}><Printer className="h-4 w-4" /></Button></TooltipTrigger>
                                            <TooltipContent><p>طباعة السند</p></TooltipContent>
                                        </Tooltip>
                                        {userRole === 'Admin' && (
                                            <Tooltip>
                                                <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => setTransactionToDelete(t)} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button></TooltipTrigger>
                                                <TooltipContent><p>حذف نهائي (للمدير فقط)</p></TooltipContent>
                                            </Tooltip>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                    لا توجد حركات مسجلة تطابق الفلترة الحالية.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                {transactionToDelete && (
                    <AlertDialog open={!!transactionToDelete} onOpenChange={() => setTransactionToDelete(null)}>
                        <AlertDialogContent dir="rtl">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                    <AlertCircle className="h-6 w-6 text-destructive" />
                                    تأكيد الحذف النهائي
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    هل أنت متأكد أنك تريد حذف هذه الحركة نهائيًا؟ لا يمكن التراجع عن هذا الإجراء.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                                    {isDeleting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : "نعم، قم بالحذف النهائي"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
        </TooltipProvider>
    );
}
