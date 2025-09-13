
"use client";

import { useState, useMemo, useTransition } from 'react';
import type { Debt, UserRole, BranchForSelect } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, FileText, Trash2, AlertCircle, Loader2, Info, Edit, ArrowDown, ArrowUp } from 'lucide-react';
import { ClientFormattedDate } from '@/components/utils/ClientFormattedDate';
import { arSA } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { markDebtAsPaid, deleteDebt } from '@/actions/debts';
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Input } from '../ui/input';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { EditDebtForm } from './EditDebtForm';
import { useRouter } from 'next/navigation';

interface CustomerDebtsTabProps {
    debts: Debt[];
    branches: BranchForSelect[];
    onDebtChange: () => void;
    userRole: UserRole;
    currentUserBranchId?: number | null;
}

const formatCurrencyYER = (value: number) => {
    return new Intl.NumberFormat('ar-YE', { style: 'currency', currency: 'YER', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

const ALL_BRANCHES = "_all_";

export function CustomerDebtsTab({ debts, branches, onDebtChange, userRole, currentUserBranchId }: CustomerDebtsTabProps) {
    const [debtToPay, setDebtToPay] = useState<Debt | null>(null);
    const [debtToDelete, setDebtToDelete] = useState<Debt | null>(null);
    const [debtToEdit, setDebtToEdit] = useState<Debt | null>(null);
    const [isPaying, startPayingTransition] = useTransition();
    const [isDeleting, startDeletingTransition] = useTransition();
    const [selectedBranchId, setSelectedBranchId] = useState<string>(
        userRole === 'BranchEmployee' ? String(currentUserBranchId) : ALL_BRANCHES
    );
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();
    const router = useRouter();


    const filteredDebts = useMemo(() => {
        return debts.filter(d => {
            if (d.DebtorType !== 'Customer') return false;

            const isBranchMatch = (userRole === 'Admin' || userRole === 'Developer') || (d.InitiatingBranchID === currentUserBranchId);

            const isSearchMatch = !searchTerm ||
                d.DebtorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (d.ParcelID && d.ParcelID.toLowerCase().includes(searchTerm.toLowerCase()));

            return isBranchMatch && isSearchMatch;
        });
    }, [debts, searchTerm, userRole, currentUserBranchId]);


    const handleConfirmPayment = () => {
        if (!debtToPay) return;
        startPayingTransition(async () => {
            const result = await markDebtAsPaid(debtToPay.DebtID);
            if (result.success) {
                toast({ title: 'نجاح', description: result.message });
                onDebtChange();
            } else {
                toast({ title: 'خطأ', description: result.message, variant: 'destructive' });
            }
            setDebtToPay(null);
        });
    };

    const handleConfirmDelete = () => {
        if (!debtToDelete) return;
        startDeletingTransition(async () => {
            const result = await deleteDebt(debtToDelete.DebtID);
            if (result.success) {
                toast({ title: 'نجاح', description: result.message });
                onDebtChange();
            } else {
                toast({ title: 'خطأ', description: result.message, variant: 'destructive' });
            }
            setDebtToDelete(null);
        });
    };

    const handleExportReport = () => {
        const params = new URLSearchParams();
        params.append('debtorType', 'Customer');
        if (searchTerm) {
            params.append('search', searchTerm);
        }
        router.push(`/reports/debts?${params.toString()}`);
    };


    return (
        <div className="space-y-4 pt-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="w-full sm:w-[300px]">
                    <Input
                        placeholder="ابحث باسم العميل أو رقم الطرد..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 self-end">
                    <Button variant="outline" onClick={handleExportReport} disabled={filteredDebts.length === 0}>
                        <FileText className="me-2 h-4 w-4" />
                        تقرير قابل للطباعة
                    </Button>
                </div>
            </div>
            <div className="border rounded-lg overflow-hidden" dir="rtl">
                <Table>
                    <TableHeader className="bg-primary text-primary-foreground">
                        <TableRow>
                            <TableHead className="text-center text-primary-foreground">العميل</TableHead>
                            <TableHead className="text-center text-primary-foreground">نوع الذمة</TableHead>
                            <TableHead className="text-center text-primary-foreground">رقم الطرد</TableHead>
                            <TableHead className="text-center text-primary-foreground">المبلغ المستحق</TableHead>
                            <TableHead className="text-center text-primary-foreground">الحالة</TableHead>
                            <TableHead className="text-center text-primary-foreground">تاريخ الإنشاء</TableHead>
                            <TableHead className="text-center text-primary-foreground">إجراءات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredDebts.length > 0 ? (
                            filteredDebts.map(debt => (
                                <TableRow key={debt.DebtID}>
                                    <TableCell className="text-center align-middle font-medium">{debt.DebtorName}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={debt.DebtMovementType === 'Debtor' ? 'destructive' : 'default'} className={debt.DebtMovementType === 'Creditor' ? 'bg-green-100 text-green-700' : ''}>
                                            {debt.DebtMovementType === 'Debtor' ? <ArrowDown className="me-1 h-3 w-3" /> : <ArrowUp className="me-1 h-3 w-3" />}
                                            {debt.DebtMovementType === 'Debtor' ? 'مدين (له)' : 'دائن (عليه)'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center align-middle">{debt.ParcelID || '-'}</TableCell>
                                    <TableCell className="text-center align-middle">{formatCurrencyYER(debt.Amount)}</TableCell>
                                    <TableCell className="text-center align-middle">
                                        <Badge variant={debt.Status === 'Paid' ? 'default' : 'destructive'} className={debt.Status === 'Paid' ? 'bg-green-500' : ''}>
                                            {debt.Status === 'Paid' ? 'مدفوع' : 'مستحق'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center align-middle">
                                        <ClientFormattedDate dateString={debt.CreatedAt} formatString="P" locale={arSA} />
                                    </TableCell>
                                    <TableCell className="text-center align-middle space-x-1 rtl:space-x-reverse">
                                        {debt.Status === 'Outstanding' && (
                                            <>
                                                <Button size="sm" onClick={() => setDebtToPay(debt)} disabled={isPaying}>
                                                    <DollarSign className="ms-2 h-4 w-4" />
                                                    تسجيل السداد
                                                </Button>
                                                <Dialog open={debtToEdit?.DebtID === debt.DebtID} onOpenChange={(isOpen) => !isOpen && setDebtToEdit(null)}>
                                                    <DialogTrigger asChild>
                                                        <Button variant="outline" size="sm" onClick={() => setDebtToEdit(debt)}>
                                                            <Edit className="ms-1 h-4 w-4" /> تعديل
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>تعديل الدين</DialogTitle>
                                                        </DialogHeader>
                                                        <EditDebtForm
                                                            debt={debt}
                                                            onSuccess={() => {
                                                                setDebtToEdit(null);
                                                                onDebtChange();
                                                            }}
                                                        />
                                                    </DialogContent>
                                                </Dialog>
                                            </>
                                        )}
                                        <Button variant="ghost" size="icon" onClick={() => setDebtToDelete(debt)} disabled={isDeleting} title="حذف السجل">
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center h-24">
                                    <Info className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
                                    لا توجد ديون مسجلة للعملاء تطابق الفلترة الحالية.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {debtToPay && (
                <AlertDialog open={!!debtToPay} onOpenChange={() => setDebtToPay(null)}>
                    <AlertDialogContent dir="rtl">
                        <AlertDialogHeader>
                            <AlertDialogTitle>تأكيد تسجيل السداد</AlertDialogTitle>
                            <AlertDialogDescription>
                                هل أنت متأكد من تسجيل سداد دين بقيمة{" "}
                                <span className="font-bold">{formatCurrencyYER(debtToPay.Amount)}</span>
                                {" "}على العميل{" "}
                                <span className="font-bold">{debtToPay.DebtorName}</span>؟
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isPaying}>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={handleConfirmPayment} disabled={isPaying}>
                                {isPaying ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : "نعم، تأكيد السداد"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
            {debtToDelete && (
                <AlertDialog open={!!debtToDelete} onOpenChange={() => setDebtToDelete(null)}>
                    <AlertDialogContent dir="rtl">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2"><AlertCircle className="h-6 w-6 text-destructive" />تأكيد الحذف</AlertDialogTitle>
                            <AlertDialogDescription>
                                هل أنت متأكد أنك تريد حذف سجل الدين هذا بشكل نهائي؟
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                                {isDeleting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : "نعم، قم بالحذف"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    );
}

