
"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { getCashTransactions } from '@/actions/cashbox';
import { getAllBranches } from '@/actions/branches';
import type { CashTransaction, Branch } from '@/types';
import { Loader2, Printer as PrinterIcon, ArrowRight, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PrintableCashboxStatement } from '@/components/cashbox/PrintableCashboxStatement';

export default function CashboxStatementPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [transactions, setTransactions] = useState<CashTransaction[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const branchId = searchParams.get('branchId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const triggerPrint = useCallback(() => {
        setTimeout(() => window.print(), 500);
    }, []);

    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            setError(null);
            try {
                let branchIdParam: number | null | undefined = undefined;
                if (branchId === 'general') {
                    branchIdParam = null;
                } else if (branchId && branchId !== 'all') {
                    branchIdParam = parseInt(branchId, 10);
                }

                const [fetchedTransactions, fetchedBranches] = await Promise.all([
                    getCashTransactions(branchIdParam, startDate || undefined, endDate || undefined),
                    getAllBranches(),
                ]);

                setTransactions(fetchedTransactions);
                setBranches(fetchedBranches);

            } catch (err) {
                console.error("Error fetching data for statement:", err);
                setError("حدث خطأ أثناء جلب بيانات الكشف.");
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, [branchId, startDate, endDate]);

    useEffect(() => {
        // Trigger print only when data is successfully loaded
        if (transactions.length > 0 && !isLoading && !error) {
            triggerPrint();
        }
    }, [transactions, isLoading, error, triggerPrint]);

    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p>جاري تحضير الكشف...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen text-center p-4">
                <Alert variant="destructive" className="max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>خطأ في عرض الكشف</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                <Button onClick={() => router.back()} className="mt-6 print:hidden">
                    <ArrowRight className="me-2 h-4 w-4" />
                    العودة
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 print:py-0 print:mx-0 print:container-none">
            <div className="flex justify-between items-center mb-6 print:hidden">
                <h1 className="text-2xl font-bold">معاينة طباعة الكشف</h1>
                <div className="flex gap-2">
                    <Button onClick={triggerPrint} variant="default">
                        <PrinterIcon className="me-2 h-4 w-4" />
                        طباعة
                    </Button>
                    <Button onClick={() => router.back()} variant="outline">
                        <ArrowRight className="me-2 h-4 w-4" />
                        العودة إلى الصندوق
                    </Button>
                </div>
            </div>
            <PrintableCashboxStatement
                transactions={transactions}
                branches={branches}
                filters={{ branchId, startDate, endDate }}
            />
        </div>
    );
}

