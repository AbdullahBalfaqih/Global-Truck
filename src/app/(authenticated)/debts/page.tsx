
import { DebtsClient } from "@/components/debts/DebtsClient";
import { getDebts } from "@/actions/debts";
import { getAllActiveDrivers } from "@/actions/drivers";
import { getBranchesForSelect } from "@/actions/branches";
import { getSession } from "@/actions/auth";
import type { Debt, Driver, BranchForSelect, UserRole } from "@/types";
import { Suspense } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Banknote, AlertCircle } from "lucide-react";

async function DebtsData() {
    const session = await getSession();
    const userRole: UserRole = session?.role || "BranchEmployee";
    const currentUserBranchId: number | null = session?.branchId || null;

    let allDebts: Debt[] = [];
    let allDrivers: Driver[] = [];
    let allBranches: BranchForSelect[] = [];
    let errorLoadingData: string | null = null;

    try {
        console.log(`DebtsPage: Fetching data for user role: ${userRole}, branch: ${currentUserBranchId}`);

        // Fetch all debts first, then filter on the client for branch-specific views
        const debtsPromise = getDebts(currentUserBranchId);

        [allDebts, allDrivers, allBranches] = await Promise.all([
            debtsPromise,
            getAllActiveDrivers(),
            getBranchesForSelect()
        ]);
        console.log(`DebtsPage: Fetched ${allDebts.length} debt records, ${allDrivers.length} drivers, and ${allBranches.length} branches.`);
    } catch (error) {
        console.error("Error fetching data for DebtsPage:", error);
        errorLoadingData = "حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى لاحقًا.";
        allDebts = [];
        allDrivers = [];
        allBranches = [];
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

    return <DebtsClient
        initialDebts={allDebts}
        drivers={allDrivers}
        branches={allBranches}
        userRole={userRole}
        session={session}
    />;
}

export default function DebtsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <Banknote className="h-7 w-7 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight text-foreground">إدارة الديون</h1>
            </div>
            <p className="text-muted-foreground">
                عرض وإدارة الديون المستحقة على العملاء، السائقين، أو الفروع.
            </p>
            <Suspense fallback={<p className="text-center py-4">جاري تحميل بيانات الديون...</p>}>
                <DebtsData />
            </Suspense>
        </div>
    );
}

