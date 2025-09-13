
import { Suspense } from "react";
import { getSystemSettings } from "@/actions/systemSettings";
import { getAllBranches } from "@/actions/branches";
import { getSession } from "@/actions/auth";
import type { SystemSetting, Branch } from "@/types";
import { SystemSettingsClient } from "@/components/settings/SystemSettingsClient";
import { Loader2, Settings as SettingsIconLucide } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";


async function SettingsData() {
    const session = await getSession();
    // @ts-ignore
    const userBranchId = session?.branchId;

    const [settings, branches] = await Promise.all([
        getSystemSettings(userBranchId),
        getAllBranches()
    ]);

    if (!settings) {
        return (
            <Alert variant="destructive" className="my-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>خطأ في تحميل الإعدادات</AlertTitle>
                <AlertDescription>لم نتمكن من تحميل إعدادات النظام. يرجى المحاولة مرة أخرى لاحقًا.</AlertDescription>
            </Alert>
        );
    }

    return (
        <SystemSettingsClient
            initialSettings={settings}
            branches={branches}
            currentBranchName={branches.find(b => b.BranchID === userBranchId)?.Name || "النظام العام"}
        />
    )
}

export default function SystemSettingsPage() {
    return (
        <div className="space-y-8">
            <div className="flex items-center gap-2">
                <SettingsIconLucide className="h-7 w-7 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight text-foreground">إعدادات النظام</h1>
            </div>
            <Suspense fallback={
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ms-2">جاري تحميل الإعدادات...</p>
                </div>
            }>
                <SettingsData />
            </Suspense>
        </div>
    );
}
