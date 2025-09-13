
"use client";

import { useState, useMemo, useTransition } from 'react';
import type { Debt, BranchForSelect, UserRole, DebtStatus } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, FileText, Trash2, AlertCircle, Loader2, Info, PlusCircle, Edit, ArrowUp, ArrowDown, Timer, CheckCheck } from 'lucide-react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { AddManualDebtForm } from './AddManualDebtForm';
import { EditDebtForm } from './EditDebtForm';
import { useRouter } from 'next/navigation';


interface BranchDebtsTabProps {
    debts: Debt[];
    branches: BranchForSelect[];
    onDebtChange: () => void;
    userRole: UserRole;
    session: any;
}

const formatCurrencyYER = (value: number) => {
    return new Intl.NumberFormat('ar-YE', { style: 'currency', currency: 'YER', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

const ALL_BRANCHES = "_all_";

const getStatusArabic = (status: DebtStatus) => {
    switch (status) {
        case 'Outstanding': return 'مستحق';
        case 'Paid': return 'مدفوع';
        case 'PendingSettlement': return 'بانتظار التأكيد';
        default: return status;
    }
};

export function BranchDebtsTab({ debts, branches, onDebtChange, userRole, session }: BranchDebtsTabProps) {
    const currentUserBranchId = session?.branchId;
    const [selectedOtherBranchId, setSelectedOtherBranchId] = useState<string>(ALL_BRANCHES);
    const [debtToPay, setDebtToPay] = useState<Debt | null>(null);
    const [debtToDelete, setDebtToDelete] = useState<Debt | null>(null);
    const [debtToEdit, setDebtToEdit] = useState<Debt | null>(null);
    const [isPaying, startPayingTransition] = useTransition();
    const [isDeleting, startDeletingTransition] = useTransition();
    const [isAddDebtOpen, setIsAddDebtOpen] = useState(false);
    const { toast } = useToast();
    const router = useRouter();


    const filteredDebts = useMemo(() => {
        let branchDebts = debts.filter(d => d.DebtorType === 'Branch');
        if (selectedOtherBranchId !== ALL_BRANCHES) {
            branchDebts = branchDebts.filter(d => d.OtherPartyBranchName === branches.find(b => b.BranchID.toString() === selectedOtherBranchId)?.Name);
        }
        return branchDebts;
    }, [debts, selectedOtherBranchId, branches]);



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
        params.append('debtorType', 'Branch');
        if (selectedOtherBranchId !== ALL_BRANCHES) {
            const selectedBranch = branches.find(b => b.BranchID.toString() === selectedOtherBranchId);
            if (selectedBranch) {
                params.append('debtorId', selectedBranch.BranchID.toString());
            }
        }
        window.open(`/reports/debts?${params.toString()}`, '_blank');
        toast({ title: 'نجاح', description: 'تم فتح تقرير ديون الفروع في تبويب جديد.' });
    };

    return (
        <div className="space-y-4 pt-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className='flex-grow'>
                    <label htmlFor="branch-filter" className="text-sm font-medium">عرض كشف حساب مع</label>
                    <Select value={selectedOtherBranchId} onValueChange={setSelectedOtherBranchId}>
                        <SelectTrigger id="branch-filter" className="w-full sm:w-[300px]">
                            <SelectValue placeholder="اختر فرعًا..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL_BRANCHES}>جميع الفروع</SelectItem>
                            {branches.filter(b => b.BranchID !== currentUserBranchId).map(branch => (
                                <SelectItem key={branch.BranchID} value={String(branch.BranchID)}>
                                    {branch.Name} ({branch.City})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex gap-2 self-end">
                    <Dialog open={isAddDebtOpen} onOpenChange={setIsAddDebtOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="me-2 h-4 w-4" />
                                إضافة ذمة جديدة
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>إضافة ذمة يدوية على فرع</DialogTitle>
                                <DialogDescription>
                                    أدخل تفاصيل الذمة التي تريد تسجيلها على الفرع.
                                </DialogDescription>
                            </DialogHeader>
                            <AddManualDebtForm
                                debtorType="Branch"
                                debtors={branches.filter(b => String(b.BranchID) !== String(currentUserBranchId)).map(b => ({ id: String(b.BranchID), name: b.Name }))}
                                onSuccess={() => {
                                    setIsAddDebtOpen(false);
                                    onDebtChange();
                                }}
                            />
                        </DialogContent>
                    </Dialog>
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
                            <TableHead className="text-center text-primary-foreground">#</TableHead>
                            <TableHead className="text-center text-primary-foreground">الطرف الآخر</TableHead>
                            <TableHead className="text-center text-primary-foreground">نوع الحركة</TableHead>
                            <TableHead className="text-center text-primary-foreground">السبب (ملاحظات)</TableHead>
                            <TableHead className="text-center text-primary-foreground">المبلغ</TableHead>
                            <TableHead className="text-center text-primary-foreground">الحالة</TableHead>
                            <TableHead className="text-center text-primary-foreground">تاريخ الإنشاء</TableHead>
                            <TableHead className="text-center text-primary-foreground">إجراءات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredDebts.length > 0 ? (
                            filteredDebts.map(debt => (
                                <TableRow key={debt.DebtID}>
                                    <TableCell className="text-center font-mono">{debt.DebtID}</TableCell>
                                    <TableCell className="text-center align-middle font-medium">{debt.OtherPartyBranchName || "فرع غير معروف"}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={debt.DebtMovementType === 'Creditor' ? 'destructive' : 'default'} className={debt.DebtMovementType === 'Creditor' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
                                            {debt.DebtMovementType === 'Creditor' ? <ArrowUp className="me-1 h-3 w-3" /> : <ArrowDown className="me-1 h-3 w-3" />}
                                            {debt.DebtMovementType === 'Creditor' ? 'دين عليك (مدين)' : 'دين لك (دائن)'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center align-middle">{debt.Notes || '-'}</TableCell>
                                    <TableCell className="text-center align-middle font-semibold">{formatCurrencyYER(debt.Amount)}</TableCell>
                                    <TableCell className="text-center align-middle">
                                        <Badge variant={debt.Status === 'Paid' ? 'default' : debt.Status === 'PendingSettlement' ? 'secondary' : 'destructive'} className={debt.Status === 'Paid' ? 'bg-green-500' : debt.Status === 'PendingSettlement' ? 'bg-yellow-500' : ''}>
                                            {getStatusArabic(debt.Status)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center align-middle">
                                        <ClientFormattedDate dateString={debt.CreatedAt} formatString="P" locale={arSA} />
                                    </TableCell>
                                    <TableCell className="text-center align-middle space-x-1 rtl:space-x-reverse">
                                        {debt.Status === 'Outstanding' && (
                                            <Button size="sm" onClick={() => setDebtToPay(debt)} disabled={isPaying}>
                                                <DollarSign className="ms-2 h-4 w-4" />
                                                تسجيل السداد
                                            </Button>
                                        )}

                                        <Dialog open={debtToEdit?.DebtID === debt.DebtID} onOpenChange={(isOpen) => !isOpen && setDebtToEdit(null)}>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm" onClick={() => setDebtToEdit(debt)} disabled={debt.Status !== 'Outstanding'}>
                                                    <Edit className="ms-1 h-4 w-4" />
                                                    تعديل
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
                                        <Button variant="ghost" size="icon" onClick={() => setDebtToDelete(debt)} disabled={isDeleting} title="حذف السجل">
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center h-24">
                                    <Info className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
                                    لا توجد ديون مسجلة بين الفروع تطابق الفلترة الحالية.
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
                                {" "}مع الفرع{" "}
                                <span className="font-bold">{debtToPay.OtherPartyBranchName || debtToPay.DebtorName}</span>؟
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

