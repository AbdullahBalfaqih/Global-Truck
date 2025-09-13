
import { OperationsClient } from "@/components/operations/OperationsClient";
import { getParcelsForAssignment } from "@/actions/getparcels";
import { getAllActiveDrivers } from "@/actions/drivers";
import { getAllActiveManifests } from "@/actions/manifests";
import { getAllBranches } from "@/actions/branches";
import { getSession } from "@/actions/auth";
import type { DeliveryCityForSelect, Driver, Parcel, DeliveryManifest, Branch, UserRole } from "@/types";
import { Suspense } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ClipboardList, AlertCircle, PackageSearch, UserCog } from "lucide-react";
import { getActiveCities } from "@/actions/deliveryLocations";
async function OperationsData() {
    const session = await getSession();
    // @ts-ignore
    const userRole: UserRole = session?.role || "BranchEmployee";
    // @ts-ignore
    const userBranchId: number | null = session?.branchId || null;

    let drivers: Driver[] = [];
    let parcelsForAssignment: Parcel[] = [];
    let allManifests: DeliveryManifest[] = [];
    let allBranches: Branch[] = [];
    let errorLoadingData: string | null = null;
    let currentBranchName: string | null = null;
    let cities: DeliveryCityForSelect[] = [];

    try {
        console.log("OperationsPage: Fetching data for operations...");
        [drivers, parcelsForAssignment, allManifests, allBranches, cities] = await Promise.all([
            getAllActiveDrivers(),
            getParcelsForAssignment(userBranchId, userRole),
            getAllActiveManifests(userBranchId, userRole),
            getAllBranches(),
            getActiveCities() // Fetch active cities
        ]);
        console.log(`OperationsPage: Fetched ${drivers.length} drivers, ${parcelsForAssignment.length} parcels for assignment, and ${allManifests.length} active manifests.`);

        if (userBranchId) {
            currentBranchName = allBranches.find(b => b.BranchID === userBranchId)?.Name || null;
        }

    } catch (error) {
        console.error("Error fetching data for OperationsPage:", error);
        errorLoadingData = "حدث خطأ أثناء تحميل بيانات العمليات. يرجى المحاولة مرة أخرى لاحقًا.";
        drivers = [];
        parcelsForAssignment = [];
        allManifests = [];
        allBranches = [];
        cities = [];
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

    if (drivers.length === 0) {
        return (
            <Alert className="mt-4">
                <UserCog className="h-4 w-4" />
                <AlertTitle>لا يوجد سائقون نشطون</AlertTitle>
                <AlertDescription>
                    لا يمكن تعيين الطرود لأنه لا يوجد سائقون نشطون مسجلون في النظام.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <OperationsClient
            availableDrivers={drivers}
            initialParcelsForAssignment={parcelsForAssignment}
            allManifests={allManifests}
            currentBranchName={currentBranchName}
            userRole={userRole}
            session={session}
            availableCities={cities}
        />
    );
}


export default function OperationsPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">إدارة عمليات التوصيل</h1>
            </div>
            <Suspense fallback={<p className="text-center py-4">جاري تحميل بيانات العمليات...</p>}>
                <OperationsData />
            </Suspense>
        </div>
    );
}
