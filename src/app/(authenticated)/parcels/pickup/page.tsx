import { ParcelPickupClient } from "@/components/parcels/ParcelPickupClient";
import { getAllParcels } from "@/actions/parcels";
import { getAllBranches } from "@/actions/branches";
import type { Parcel, Branch, UserRole } from "@/types";
import { Suspense } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PackageSearch, AlertCircle } from "lucide-react";
import { getSession } from "@/actions/auth";

async function PickupData() {
    const session = await getSession();
    // @ts-ignore
    const userRole: UserRole = session?.role || "BranchEmployee";
    // @ts-ignore
    const userBranchId: number | null = session?.branchId || null;

    let initialParcels: Parcel[] = [];
    let branches: Branch[] = [];
    let errorLoadingData: string | null = null;

    try {
        console.log("ParcelPickupPage: Fetching parcels and branches data...");

        // Fetch all parcels initially. Filtering will now happen on the client
        // based on the logged-in user's branch ID. This is a reasonable approach
        // for a moderate number of total "delivered" parcels. For very large scale,
        // the action itself would be modified to accept a branch ID.
        [initialParcels, branches] = await Promise.all([
            getAllParcels(),
            getAllBranches()
        ]);
        console.log(`ParcelPickupPage: Fetched ${initialParcels.length} total parcels and ${branches.length} branches.`);

        // Pre-filter parcels that are potentially available for pickup
        initialParcels = initialParcels.filter(p => p.Status === 'تم التوصيل' || p.Status === 'Delivered' || p.Status === 'تم التسليم');
        console.log(`ParcelPickupPage: Filtered to ${initialParcels.length} 'Delivered' or 'Picked Up' parcels.`);

    } catch (error) {
        console.error("Error fetching data for ParcelPickupPage:", error);
        errorLoadingData = "حدث خطأ أثناء تحميل بيانات الطرود أو الفروع. يرجى المحاولة مرة أخرى لاحقًا.";
        initialParcels = [];
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

    return <ParcelPickupClient
        initialParcels={initialParcels}
        branches={branches}
        userRole={userRole}
        userBranchId={userBranchId}
    />;
}


export default function ParcelPickupPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">إدارة استلام الطرود من الفرع</h1>
            <p className="text-muted-foreground">
                عرض الطرود التي وصلت إلى الفرع وتنتظر استلامها من قبل العميل النهائي، أو عرض الطرود التي تم استلامها بالفعل.
            </p>
            <Suspense fallback={<p className="text-center py-4">جاري تحميل بيانات استلام الطرود...</p>}>
                <PickupData />
            </Suspense>
        </div>
    );
}