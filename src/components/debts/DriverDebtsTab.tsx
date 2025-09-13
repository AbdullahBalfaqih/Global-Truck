
"use client";

import { useState, useMemo, useTransition } from 'react';
import type { Debt, Driver, UserRole, BranchForSelect } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, FileText, Trash2, AlertCircle, Loader2, Info, PlusCircle, Edit, ArrowUp, ArrowDown } from 'lucide-react';
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
import { Input } from '../ui/input';

interface DriverDebtsTabProps {
    debts: Debt[];
    drivers: Driver[];
    branches: BranchForSelect[];
    onDebtChange: () => void;
    userRole: UserRole;
    currentUserBranchId?: number | null;
}

const formatCurrencyYER = (value: number) => {
    return new Intl.NumberFormat('ar-YE', { style: 'currency', currency: 'YER', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

const ALL_DRIVERS = "_all_";
const ALL_BRANCHES = "_all_";

export function DriverDebtsTab({ debts, drivers, branches, onDebtChange, userRole, currentUserBranchId }: DriverDebtsTabProps) {
    const [selectedDriverId, setSelectedDriverId] = useState<string>(ALL_DRIVERS);
    const [selectedBranchId, setSelectedBranchId] = useState<string>(
        userRole === 'BranchEmployee' ? String(currentUserBranchId) : ALL_BRANCHES
    );
    const [searchTerm, setSearchTerm] = useState('');
    const [debtToPay, setDebtToPay] = useState<Debt | null>(null);
    const [debtToDelete, setDebtToDelete] = useState<Debt | null>(null);
    const [debtToEdit, setDebtToEdit] = useState<Debt | null>(null);
    const [isPaying, startPayingTransition] = useTransition();
    const [isDeleting, startDeletingTransition] = useTransition();
    const [isAddDebtOpen, setIsAddDebtOpen] = useState(false);
    const { toast } = useToast();
    const router = useRouter();


    const filteredDebts = useMemo(() => {
        return debts.filter(debt => {
            const isDriverMatch = selectedDriverId === ALL_DRIVERS || debt.DebtorID === selectedDriverId;
            const isBranchMatch = selectedBranchId === ALL_BRANCHES || debt.InitiatingBranchID === parseInt(selectedBranchId);
            const isSearchMatch = !searchTerm ||
                debt.DebtorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (debt.Notes && debt.Notes.toLowerCase().includes(searchTerm.toLowerCase()));
            return isDriverMatch && isBranchMatch && isSearchMatch;
        });
    }, [debts, selectedDriverId, selectedBranchId, searchTerm]);

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
        params.append('debtorType', 'Driver');
        if (selectedDriverId !== ALL_DRIVERS) {
            params.append('debtorId', selectedDriverId);
        }
        window.open(`/reports/debts?${params.toString()}`, '_blank');
        toast({ title: 'نجاح', description: 'تم فتح تقرير ديون السائقين في تبويب جديد.' });
    };

    return (
        <div className="space-y-4 pt-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className='flex flex-wrap gap-2 flex-grow'>
                    {(userRole === 'Admin' || userRole === 'Developer') && (
                        <div className="w-full sm:w-auto flex-grow sm:flex-grow-0 sm:min-w-[200px]">
                            <label htmlFor="branch-filter-driver" className="sr-only">فلترة حسب الفرع</label>
                            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                                <SelectTrigger id="branch-filter-driver">
                                    <SelectValue placeholder="اختر فرعًا..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL_BRANCHES}>جميع الفروع</SelectItem>
                                    {branches.map(branch => (
                                        <SelectItem key={branch.BranchID} value={String(branch.BranchID)}>
                                            {branch.Name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="w-full sm:w-auto flex-grow sm:flex-grow-0 sm:min-w-[200px]">
                        <label htmlFor="driver-filter" className="sr-only">فلترة حسب السائق</label>
                        <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                            <SelectTrigger id="driver-filter">
                                <SelectValue placeholder="اختر سائقًا لعرض ديونه..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL_DRIVERS}>جميع السائقين</SelectItem>
                                {drivers.map(driver => (
                                    <SelectItem key={driver.DriverID} value={driver.DriverID}>
                                        {driver.Name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-full sm:w-auto flex-grow sm:flex-grow-0 sm:min-w-[200px]">
                        <Input
                            placeholder="ابحث بالاسم أو بالملاحظات..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex gap-2">
                    <Dialog open={isAddDebtOpen} onOpenChange={setIsAddDebtOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="me-2 h-4 w-4" />
                                إضافة ذمة جديدة
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>إضافة ذمة يدوية على سائق</DialogTitle>
                                <DialogDescription>
                                    أدخل تفاصيل الذمة التي تريد تسجيلها على السائق.
                                </DialogDescription>
                            </DialogHeader>
                            <AddManualDebtForm
                                debtorType="Driver"
                                debtors={drivers.map(d => ({ id: d.DriverID, name: d.Name }))}
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
                            <TableHead className="text-center text-primary-foreground">السائق</TableHead>
                            <TableHead className="text-center text-primary-foreground">نوع الذمة</TableHead>
                            <TableHead className="text-center text-primary-foreground">متعلق بـ (طرد/سبب)</TableHead>
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
                                        <Badge variant={debt.DebtMovementType === 'Creditor' ? 'destructive' : 'default'} className={debt.DebtMovementType === 'Debtor' ? 'bg-green-100 text-green-700' : ''}>
                                            {debt.DebtMovementType === 'Creditor' ? <ArrowDown className="me-1 h-3 w-3" /> : <ArrowUp className="me-1 h-3 w-3" />}
                                            {debt.DebtMovementType === 'Creditor' ? 'مدين (له)' : 'دائن (عليه)'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center align-middle">
                                        {debt.ParcelID ? `طرد ${debt.ParcelID}` : (debt.Notes || '-')}
                                    </TableCell>
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
                                    لا توجد ديون مسجلة للسائقين تطابق الفلترة الحالية.
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
                                {" "}على السائق{" "}
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
