"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { PrintableVoucher } from '@/components/cashbox/PrintableVoucher';
import { getCashTransactionById } from '@/actions/cashbox';
import { getAllUsers } from '@/actions/users';
import { getAllBranches } from '@/actions/branches';
import type { CashTransaction, User, Branch } from '@/types';
import { ArrowRight, Printer as PrinterIcon, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function VoucherContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const transactionIdParam = searchParams.get('id');
    const transactionId = transactionIdParam ? parseInt(transactionIdParam, 10) : NaN;

    const [transaction, setTransaction] = useState<CashTransaction | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const triggerPrint = useCallback(() => {
        setTimeout(() => window.print(), 500);
    }, []);

    useEffect(() => {
        async function fetchData() {
            if (isNaN(transactionId)) {
                setError("معرف الحركة غير صالح.");
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            setError(null);
            try {
                const [fetchedTransaction, fetchedUsers, fetchedBranches] = await Promise.all([
                    getCashTransactionById(transactionId),
                    getAllUsers(),
                    getAllBranches(),
                ]);

                if (fetchedTransaction) {
                    setTransaction(fetchedTransaction);
                    setUsers(fetchedUsers);
                    setBranches(fetchedBranches);
                } else {
                    setError(`لم يتم العثور على حركة بالمعرف: ${transactionId}`);
                }
            } catch (err) {
                console.error("Error fetching data for voucher:", err);
                setError("حدث خطأ أثناء جلب بيانات السند للطباعة.");
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, [transactionId]);

    useEffect(() => {
        if (transaction && !isLoading && !error) {
            triggerPrint();
        }
    }, [transaction, isLoading, error, triggerPrint]);

    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p>جاري تحميل السند للطباعة...</p>
            </div>
        );
    }

    if (error || !transaction) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen text-center p-4">
                <Alert variant="destructive" className="max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>خطأ في عرض السند</AlertTitle>
                    <AlertDescription>{error || "لا يمكن عرض السند المطلوب."}</AlertDescription>
                </Alert>
                <Button onClick={() => router.back()} className="mt-6 print:hidden">
                    <ArrowRight className="me-2 h-4 w-4" />
                    العودة إلى الصندوق
                </Button>
            </div>
        );
    }
    return (
        <div className="container mx-auto py-6 print:py-0 print:mx-0 print:container-none">
            <div className="flex justify-between items-center mb-6 print:hidden">
                <h1 className="text-2xl font-bold">معاينة طباعة السند</h1>
                <div className="flex gap-2">
                    <Button onClick={triggerPrint} variant="default">
                        <PrinterIcon className="me-2 h-4 w-4" />
                        طباعة السند مرة أخرى
                    </Button>
                    <Button onClick={() => router.back()} variant="outline">
                        <ArrowRight className="me-2 h-4 w-4" />
                        العودة إلى الصندوق
                    </Button>
                </div>
            </div>
            <PrintableVoucher
                transaction={transaction}
                users={users}
                branches={branches}
            />
        </div>
    );
}

export default function PrintVoucherPage() {
    return (
        <Suspense fallback={<div className="flex flex-col justify-center items-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p>جاري تحميل الصفحة...</p>
        </div>}>
            <VoucherContent />
        </Suspense>
    )
}
