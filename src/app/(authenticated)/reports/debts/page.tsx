
"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { getDebtsForReport } from '@/actions/debts';
import { getAllBranches } from '@/actions/branches';
import type { Debt, DebtorType, DebtStatus, Branch } from '@/types';
import { Loader2, Printer as PrinterIcon, ArrowRight, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PrintableDebtsReport } from '@/components/reports/PrintableDebtsReport';
import { getSession } from "@/actions/auth";

function DebtsReportContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [session, setSession] = useState<any>(null);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const debtorType = searchParams.get('debtorType') as DebtorType | null;
    const debtorId = searchParams.get('debtorId');
    const status = searchParams.get('status') as DebtStatus | null;
    const search = searchParams.get('search');

    const triggerPrint = useCallback(() => {
        setTimeout(() => window.print(), 500);
    }, []);

    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            try {
                const [sessionData, branchesData] = await Promise.all([
                    getSession(),
                    getAllBranches()
                ]);

                if (!sessionData?.userId) {
                    setError("يجب تسجيل الدخول لعرض التقرير.");
                    setIsLoading(false);
                    return;
                }

                setSession(sessionData);
                setBranches(branchesData);

                const filters = {
                    debtorType,
                    status,
                    search,
                    branchId: debtorType === 'Branch' && debtorId ? parseInt(debtorId, 10) : sessionData.branchId,
                };

                const fetchedDebts = await getDebtsForReport(filters);
                setDebts(fetchedDebts);
            } catch (err) {
                console.error("Error fetching data for report:", err);
                setError("حدث خطأ أثناء جلب بيانات التقرير.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitialData();
    }, [debtorType, debtorId, status, search]);

    useEffect(() => {
        if (!isLoading && !error && debts.length > 0) {
            triggerPrint();
        }
    }, [isLoading, error, debts, triggerPrint]);

    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p>جاري تحضير التقرير...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen text-center p-4">
                <Alert variant="destructive" className="max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>خطأ في عرض التقرير</AlertTitle>
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
                <h1 className="text-2xl font-bold">معاينة طباعة التقرير</h1>
                <div className="flex gap-2">
                    <Button onClick={triggerPrint} variant="default">
                        <PrinterIcon className="me-2 h-4 w-4" />
                        طباعة
                    </Button>
                    <Button onClick={() => router.back()} variant="outline">
                        <ArrowRight className="me-2 h-4 w-4" />
                        العودة إلى الديون
                    </Button>
                </div>
            </div>
            <PrintableDebtsReport
                debts={debts}
                filters={{ debtorType, debtorId, status, search }}
                allBranches={branches}
            />
        </div>
    );
}


export default function DebtsReportPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <DebtsReportContent />
        </Suspense>
    )
}

