import { getBackupHistory } from "@/actions/databaseBackup";
import type { BackupItemDB } from "@/types";
import { DatabaseBackupClient } from "@/components/backup/DatabaseBackupClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Suspense } from "react";

async function BackupData() {
    let backupHistory: BackupItemDB[] = [];
    let errorLoadingData: string | null = null;
    try {
        backupHistory = await getBackupHistory();
    } catch (error) {
        console.error("Error fetching backup history for page:", error);
        errorLoadingData = "حدث خطأ أثناء تحميل سجل النسخ الاحتياطي. يرجى المحاولة مرة أخرى لاحقًا.";
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

    return <DatabaseBackupClient initialHistory={backupHistory} />;
}


export default function DatabaseBackupPage() {
    return (
        <Suspense fallback={<p className="text-center py-4">جاري تحميل صفحة النسخ الاحتياطي...</p>}>
            <BackupData />
        </Suspense>
    );
}
