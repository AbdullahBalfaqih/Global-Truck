
import { CashboxClient } from "@/components/cashbox/CashboxClient";
import { getAllBranches } from "@/actions/branches";
import { getAllUsers } from "@/actions/users";
import { getCashTransactions, getCashboxBalance } from "@/actions/cashbox";
import { Suspense } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Wallet, AlertCircle } from "lucide-react";
import { Loader2 } from 'lucide-react';

async function CashboxData() {
    let branches: any[] = [];
    let users: any[] = [];
    let transactions: any[] = [];
    let balance: number = 0;
    let errorLoadingData: string | null = null;
    const errorMessages: string[] = [];

    try {
        // We fetch initial data for the default view (e.g., first branch or all)
        // The client component will handle subsequent fetches on filter change.
        const initialBranchId = branches.length > 0 ? branches[0].BranchID : undefined;

        [branches, users, transactions, balance] = await Promise.all([
            getAllBranches(),
            getAllUsers(),
            getCashTransactions(initialBranchId),
            getCashboxBalance(initialBranchId)
        ]);
    } catch (e: any) {
        console.error("Error fetching initial data for CashboxPage:", e);
        errorMessages.push("فشل تحميل البيانات الأولية للصندوق.");
    }

    if (errorMessages.length > 0) {
        errorLoadingData = errorMessages.join(' ');
    }

    if (errorLoadingData) {
        return (
            <Alert variant="destructive" className="my-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>خطأ في تحميل البيانات</AlertTitle>
                <AlertDescription>{errorLoadingData}</AlertDescription>
            </Alert>
        );
    }

    return (
        <CashboxClient
            initialBranches={branches}
            initialUsers={users}
            initialTransactions={transactions}
            initialBalance={balance}
        />
    );
}

export default function CashboxPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <Wallet className="h-7 w-7 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight text-foreground">الصندوق المحاسبي</h1>
            </div>
            <p className="text-muted-foreground">
                إدارة الحركات النقدية للصندوق من إيرادات ومصروفات، ومتابعة الرصيد الحالي لكل فرع.
            </p>
            <Suspense fallback={<div className="flex items-center justify-center p-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ms-2">جاري تحميل بيانات الصندوق...</p></div>}>
                <CashboxData />
            </Suspense>
        </div>
    );
}
