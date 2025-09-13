// src/app/(authenticated)/parcels/add/page.tsx

import { AddParcelForm } from "@/components/parcels/AddParcelForm";
import { getBranchesForSelect } from "@/actions/branches";
import { getAllDeliveryCitiesWithDistricts } from "@/actions/deliveryLocations";
import { getSystemSettings } from "@/actions/systemSettings";
import { addParcel } from "@/actions/parcels";
import type { BranchForSelect, DeliveryCityForSelect, SystemSetting } from "@/types"; // ✅ تأكد من استيراد SystemSettings
import { getSession } from "@/actions/auth";


export default async function AddParcelPage() {
    let branches: BranchForSelect[] = [];
    let deliveryCities: DeliveryCityForSelect[] = [];
    let systemSettings: SystemSetting | null = null; // ✅ تعريف متغير لإعدادات النظام
    let errorLoadingData: string | null = null;
    const session = await getSession();
    // @ts-ignore
    const userBranchId = session?.branchId
    try {
        branches = await getBranchesForSelect();
        deliveryCities = await getAllDeliveryCitiesWithDistricts();
        // ✅ جلب إعدادات النظام وتخزينها في متغير
        systemSettings = await getSystemSettings(userBranchId);
    } catch (error) {
        console.error("Error fetching initial data for AddParcelPage:", error);
        errorLoadingData = "حدث خطأ أثناء تحميل بيانات الفروع والمدن. يرجى المحاولة مرة أخرى.";
    }

    return (
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-6">إضافة طرد جديد</h1>
            {errorLoadingData && (
                <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 border border-red-400 rounded-md">
                    {errorLoadingData}
                </div>
            )}
            <AddParcelForm
                branches={branches}
                deliveryCities={deliveryCities}
                formAction={addParcel}
                userBranchId={userBranchId}
                systemSettings={systemSettings} // ✅ تمرير إعدادات النظام كـ prop
            />
        </div>
    );
}