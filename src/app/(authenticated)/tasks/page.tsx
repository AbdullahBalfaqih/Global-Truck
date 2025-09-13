
import { TasksClient } from "@/components/tasks/TasksClient";
import { getAllActiveDrivers } from "@/actions/drivers";
import { getAllActiveManifests } from "@/actions/manifests";
import { getAllBranches } from "@/actions/branches";
import type { Driver, DeliveryManifest, Branch, UserRole } from "@/types";
import { Suspense } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UserCog, ClipboardList, AlertCircle } from "lucide-react";
import { getSession } from "@/actions/auth";

async function TasksData() {
    const session = await getSession();
    // @ts-ignore
    const userRole: UserRole = session?.role || "BranchEmployee";
    let drivers: Driver[] = [];
    let manifests: DeliveryManifest[] = [];
    let branches: Branch[] = [];
    let errorLoadingData: string | null = null;

    try {
        console.log("TasksPage: Fetching drivers, manifests, and branches data...");
        [drivers, manifests, branches] = await Promise.all([
            getAllActiveDrivers(),
            getAllActiveManifests(),
            getAllBranches()
        ]);
        console.log(`TasksPage: Fetched ${drivers.length} active drivers, ${manifests.length} active manifests, and ${branches.length} branches.`);
    } catch (error) {
        console.error("Error fetching data for TasksPage:", error);
        errorLoadingData = "حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى لاحقًا.";
        drivers = [];
        manifests = [];
        branches = [];
    }

    if (errorLoadingData) {
        return (
            <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>خطأ في تحميل البيانات</AlertTitle>
                <AlertDescription>{errorLoadingData}</AlertDescription>
            </Alert>
        );
    }

    if (drivers.length === 0) {
        return (
            <Alert className="mt-4">
                <UserCog className="h-4 w-4" />
                <AlertTitle>لا يوجد سائقون نشطون</AlertTitle>
                <AlertDescription>
                    لا يوجد سائقون نشطون مسجلون في النظام حاليًا لتعيين مهام لهم.
                </AlertDescription>
            </Alert>
        );
    }

    // Ensure branches are loaded before rendering client
    if (branches.length === 0) {
        return (
            <Alert className="mt-4">
                <UserCog className="h-4 w-4" />
                <AlertTitle>لا توجد فروع</AlertTitle>
                <AlertDescription>
                    لا يمكن عرض المهام لأنه لا توجد فروع معرفة في النظام.
                </AlertDescription>
            </Alert>
        );
    }

    return <TasksClient drivers={drivers} manifests={manifests} branches={branches} />;
}

export default function TasksPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">مهام السائقين اليومية</h1>
            </div>
            <Suspense fallback={<p className="text-center py-4">جاري تحميل بيانات المهام...</p>}>
                <TasksData />
            </Suspense>
        </div>
    );
}
