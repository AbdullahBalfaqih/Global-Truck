
import { FinancialsClient } from "@/components/financials/FinancialsClient";
import { getAllParcels } from "@/actions/getparcels";
import { getAllExpenses } from "@/actions/expenses";
import { getAllActiveDrivers } from "@/actions/drivers";
import { getAllBranches } from "@/actions/branches"; // For branch filter
import type { Parcel, Expense, Driver, Branch } from "@/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TrendingUp, AlertCircle } from "lucide-react";
import { Suspense } from "react";
async function FinancialsData() {
    let parcels: Parcel[] = [];
    let expenses: Expense[] = [];
    let drivers: Driver[] = [];
    let branches: Branch[] = [];

    let errorLoadingData: string | null = null;

    try {
        console.log("FinancialsPage: Fetching financial data...");
        [parcels, expenses, drivers, branches] = await Promise.all([
            getAllParcels(),
            getAllExpenses(),
            getAllActiveDrivers(),
            getAllBranches(), // Fetch branches for the filter
        ]);
         console.log(`FinancialsPage: Fetched ${parcels.length} parcels, ${expenses.length} expenses, ${drivers.length} drivers, and ${branches.length} branches.`);
    } catch (error) {
        console.error("Error fetching data for FinancialsPage:", error);
        errorLoadingData = "حدث خطأ أثناء تحميل البيانات المالية. يرجى المحاولة مرة أخرى لاحقًا.";
        parcels = [];
        expenses = [];
        drivers = [];
        branches = [];
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

    return <FinancialsClient parcels={parcels} expenses={expenses} drivers={drivers} branches={branches} />;
}


export default function FinancialsPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-7 w-7 text-primary" />
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">الملخص المالي</h1>
                </div>
            </div>
            <p className="text-muted-foreground">
                نظرة عامة على الإيرادات، المصروفات، والعمولات المتعلقة بعمليات الشحن.
            </p>
            <Suspense fallback={<p className="text-center py-4">جاري تحميل البيانات المالية...</p>}>
                <FinancialsData />
            </Suspense>
        </div>
    );
}

