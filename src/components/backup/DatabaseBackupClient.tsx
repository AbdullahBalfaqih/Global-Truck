
"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Database, History, HardDrive, AlertTriangle, Loader2, DownloadCloud, UploadCloud, FileJson, RefreshCw, Smartphone, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { logBackupEvent, getBackupHistory, getFullDatabaseData, syncLocalData } from "@/actions/databaseBackup";
import type { BackupItemDB } from "@/types";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { db } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClientFormattedDate } from "../utils/ClientFormattedDate";


interface DatabaseBackupClientProps {
    initialHistory: BackupItemDB[];
}

interface UnsyncedItem {
    type: string;
    id: string;
    createdAt: string;
}

const getTableNameArabic = (tableName: string) => {
    const map: { [key: string]: string } = {
        Parcels: 'طرد',
        Branches: 'فرع',
        Drivers: 'سائق',
        Users: 'مستخدم',
        Expenses: 'مصروف',
        CashTransactions: 'حركة نقدية',
        Debts: 'دين',
        DeliveryCities: 'مدينة توصيل',
        Employees: 'موظف',
    };
    return map[tableName] || tableName;
}

const getItemIdentifier = (item: any, tableName: string) => {
    switch (tableName) {
        case 'Parcels': return item.TrackingNumber || item.ParcelID;
        case 'Branches': return item.Name || item.BranchID;
        case 'Drivers': return item.Name || item.DriverID;
        case 'Users': return item.Name || item.UserID;
        case 'Expenses': return item.Description || item.ExpenseID;
        case 'CashTransactions': return item.Description || item.TransactionID;
        case 'Debts': return item.DebtorName || item.DebtID;
        case 'DeliveryCities': return item.Name || item.CityID;
        case 'Employees': return item.Name || item.EmployeeID;
        default: return item.id || 'N/A';
    }
}


export function DatabaseBackupClient({ initialHistory }: DatabaseBackupClientProps) {
    const { toast } = useToast();
    const restoreSupabaseInputRef = useRef<HTMLInputElement>(null);

    const [isTakingSupabaseBackup, startSupabaseBackupTransition] = useTransition();
    const [isRestoringSupabase, startSupabaseRestoreTransition] = useTransition();
    const [isSyncing, startSyncTransition] = useTransition();

    const [backupHistory, setBackupHistory] = useState<BackupItemDB[]>(initialHistory);
    const [isFetchingHistory, startFetchingHistoryTransition] = useTransition();

    const [unsyncedItems, setUnsyncedItems] = useState<UnsyncedItem[]>([]);
    const [isFetchingUnsynced, startFetchingUnsyncedTransition] = useTransition();

    const fetchUnsyncedData = () => {
        startFetchingUnsyncedTransition(async () => {
            try {
                const allUnsynced: UnsyncedItem[] = [];
                for (const table of db.tables) {
                    if (table.schema.indexes.some(index => index.keyPath === 'isSynced')) {
                        // Correct way to query for 'isSynced: false' or 'isSynced: 0'
                        const items = await table.where('isSynced').equals(0).toArray();
                        items.forEach(item => {
                            allUnsynced.push({
                                type: getTableNameArabic(table.name),
                                id: getItemIdentifier(item, table.name),
                                createdAt: item.CreatedAt || new Date().toISOString(),
                            });
                        });
                    }
                }
                setUnsyncedItems(allUnsynced);
            } catch (error) {
                console.error("Error fetching unsynced data from Dexie:", error);
                toast({ variant: "destructive", title: "خطأ", description: "فشل تحميل البيانات غير المتزامنة من المتصفح." });
            }
        });
    };

    useEffect(() => {
        fetchUnsyncedData();
    }, []);

    useEffect(() => {
        setBackupHistory(initialHistory);
    }, [initialHistory]);

    const fetchHistory = () => {
        startFetchingHistoryTransition(async () => {
            const history = await getBackupHistory();
            setBackupHistory(history);
            toast({ title: "تم التحديث", description: "تم تحديث سجل النسخ الاحتياطي بنجاح." });
        });
    };

    const handleSupabaseBackup = () => {
        startSupabaseBackupTransition(async () => {
            toast({ title: "جاري تحضير النسخة الاحتياطية...", description: "قد تستغرق هذه العملية بعض الوقت حسب حجم البيانات." });
            const result = await getFullDatabaseData();
            if (result.success && result.data) {
                const fileName = `supabase_backup_${format(new Date(), "yyyy-MM-dd_HH-mm-ss")}.json`;
                const jsonString = JSON.stringify(result.data, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                toast({ title: "نجاح!", description: "تم تحميل النسخة الاحتياطية للبيانات بنجاح." });
                await logBackupEvent(fileName, "Supabase JSON data export");
                fetchHistory();
            } else {
                toast({ variant: "destructive", title: "خطأ", description: result.message || "فشل جلب البيانات من قاعدة البيانات." });
            }
        });
    };

    const handleSupabaseRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        startSupabaseRestoreTransition(async () => {
            toast({ title: "جاري استعادة البيانات...", description: "هذه عملية حساسة وقد تستغرق وقتًا." });

            console.log("Simulating Supabase restore from file:", file.name);
            alert("محاكاة استعادة البيانات من ملف JSON. في تطبيق حقيقي، سيتم رفع هذا الملف إلى خادم آمن لمعالجته. انظر إلى الكونسول لمزيد من التفاصيل.");

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target?.result as string;
                    const data = JSON.parse(content);
                    console.log("Data that would be restored:", data);
                    toast({ title: "محاكاة ناجحة", description: "تمت قراءة ملف النسخة الاحتياطية بنجاح (محاكاة)." });
                } catch (err) {
                    toast({ variant: "destructive", title: "خطأ في الملف", description: "الملف المختار ليس ملف JSON صالح." });
                }
            };
            reader.readAsText(file);
        });
        if (event.target) {
            event.target.value = "";
        }
    };

    const handleSync = () => {
        startSyncTransition(async () => {
            try {
                toast({ title: "بدء المزامنة", description: "جاري البحث عن البيانات غير المتزامنة..." });

                const localDataToSync: Record<string, any[]> = {};
                let unsyncedCount = 0;

                for (const table of db.tables) {
                    if (table.schema.indexes.some(index => index.keyPath === 'isSynced')) {
                        const itemsToSync = await table.where('isSynced').equals(0).toArray();
                        if (itemsToSync.length > 0) {
                            localDataToSync[table.name] = itemsToSync;
                            unsyncedCount += itemsToSync.length;
                        }
                    }
                }

                if (unsyncedCount === 0) {
                    toast({ title: "لا توجد بيانات للمزامنة", description: "جميع بياناتك المحلية محدثة مع السيرفر." });
                    fetchUnsyncedData();
                    return;
                }

                toast({ title: "جاري المزامنة مع السيرفر...", description: `تم العثور على ${unsyncedCount} سجل لم تتم مزامنته. جاري الإرسال...` });

                const result = await syncLocalData(localDataToSync);

                if (result.success) {
                    toast({ title: "نجاح!", description: result.message });
                    for (const tableName in localDataToSync) {
                        const primaryKeyName = db.table(tableName).schema.primKey.name;
                        const primaryKeys = localDataToSync[tableName].map(item => item[primaryKeyName]);
                        if (primaryKeys.length > 0) {
                            await db.table(tableName).where(primaryKeyName).anyOf(primaryKeys).modify({ isSynced: 1 });
                        }
                    }
                    toast({ title: "اكتملت المزامنة", description: "تم تحديث حالة السجلات المحلية بنجاح." });
                    fetchUnsyncedData();
                } else {
                    toast({ variant: "destructive", title: "فشل المزامنة", description: result.message, duration: 10000 });
                    console.error("Sync errors:", result.details);
                }
            } catch (error: any) {
                toast({ variant: "destructive", title: "خطأ فادح في المزامنة", description: error.message });
            }
        });
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-2">
                <Database className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight text-foreground">النسخ الاحتياطي والمزامنة</h1>
            </div>
            <p className="text-muted-foreground">
                إدارة عمليات النسخ الاحتياطي لقاعدة البيانات السحابية (Supabase) ومزامنة البيانات المحلية.
            </p>

            <Separator />

            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5" />مزامنة البيانات المحلية (Offline)</CardTitle>
                    <CardDescription>
                        عندما تعود للاتصال بالإنترنت، اضغط على هذا الزر لإرسال كل البيانات التي أدخلتها أثناء العمل بدون اتصال إلى السيرفر الرئيسي.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleSync} size="lg" disabled={isSyncing || unsyncedItems.length === 0}>
                        {isSyncing ? <Loader2 className="me-2 h-5 w-5 animate-spin" /> : <RefreshCw className="me-2 h-5 w-5" />}
                        {isSyncing ? "جاري المزامنة..." : `مزامنة (${unsyncedItems.length}) سجلات الآن`}
                    </Button>
                </CardContent>
                <CardFooter>
                    <p className="text-xs text-muted-foreground">هذه العملية ستقوم بإرسال البيانات التي لم تتم مزامنتها فقط من متصفحك إلى قاعدة البيانات السحابية.</p>
                </CardFooter>
            </Card>

            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle>بيانات تنتظر المزامنة</CardTitle>
                    <CardDescription>
                        هذه هي البيانات التي تم حفظها في المتصفح ولم يتم إرسالها إلى قاعدة البيانات السحابية بعد.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isFetchingUnsynced ? (
                        <div className="flex justify-center items-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="ms-2">جاري تحميل البيانات...</p></div>
                    ) : unsyncedItems.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>نوع البيانات</TableHead>
                                    <TableHead>المعرف</TableHead>
                                    <TableHead>تاريخ الإضافة</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {unsyncedItems.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell><Badge variant="secondary">{item.type}</Badge></TableCell>
                                        <TableCell className="font-mono">{item.id}</TableCell>
                                        <TableCell>
                                            <ClientFormattedDate dateString={item.createdAt} formatString="Pp" locale={arSA} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center text-muted-foreground p-4 flex items-center justify-center gap-2">
                            <Info className="h-5 w-5" />
                            <p>لا توجد بيانات بانتظار المزامنة حاليًا.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" />النسخ الاحتياطي لقاعدة البيانات السحابية (Supabase)</CardTitle>
                    <CardDescription>
                        تصدير البيانات من قاعدة بيانات Supabase إلى ملف JSON على جهازك. الاستعادة يجب أن تتم بحذر عبر لوحة تحكم Supabase.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-4">
                    <Button onClick={handleSupabaseBackup} size="lg" disabled={isTakingSupabaseBackup}>
                        {isTakingSupabaseBackup ? <Loader2 className="me-2 h-5 w-5 animate-spin" /> : <DownloadCloud className="me-2 h-5 w-5" />}
                        {isTakingSupabaseBackup ? "جاري التصدير..." : "تصدير بيانات Supabase الآن"}
                    </Button>
                    <Button onClick={() => restoreSupabaseInputRef.current?.click()} size="lg" variant="destructive" disabled={isRestoringSupabase}>
                        {isRestoringSupabase ? <Loader2 className="me-2 h-5 w-5 animate-spin" /> : <UploadCloud className="me-2 h-5 w-5" />}
                        {isRestoringSupabase ? "جاري التحميل..." : "استعادة إلى Supabase (محاكاة)"}
                    </Button>
                    <input type="file" ref={restoreSupabaseInputRef} onChange={handleSupabaseRestore} accept=".json" className="hidden" />
                </CardContent>
                <CardFooter>
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>تنبيه هام</AlertTitle>
                        <AlertDescription>
                            استعادة قاعدة البيانات هي عملية خطيرة وتؤدي إلى الكتابة فوق البيانات الحالية. يوصى بشدة بتنفيذها من خلال <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline font-semibold">لوحة تحكم Supabase</a> باستخدام النسخ الاحتياطية الرسمية.
                        </AlertDescription>
                    </Alert>
                </CardFooter>
            </Card>

            <Separator />

            <Card className="shadow-lg rounded-lg">
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />سجل عمليات النسخ الاحتياطي</CardTitle>
                        <CardDescription>عرض قائمة بالنسخ الاحتياطية التي تم تسجيلها في النظام.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchHistory} disabled={isFetchingHistory}>
                        {isFetchingHistory ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <RefreshCw className="me-2 h-4 w-4" />}
                        تحديث
                    </Button>
                </CardHeader>
                <CardContent>
                    {isFetchingHistory && <div className="flex justify-center items-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="ms-2">جاري تحديث السجل...</p></div>}
                    {!isFetchingHistory && backupHistory.length === 0 && (
                        <p className="text-center text-muted-foreground text-sm">لا يوجد سجل لعرضه. قد يكون جدول 'DatabaseBackups' فارغًا.</p>
                    )}
                    {!isFetchingHistory && backupHistory.length > 0 && (
                        <div className="space-y-3">
                            {backupHistory.map((backup) => (
                                <div key={backup.BackupID} className="flex justify-between items-center p-3 border rounded-md bg-muted/50">
                                    <div>
                                        <p className="font-medium flex items-center gap-2"><FileJson className="h-4 w-4 text-primary" /> {backup.FileName}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            التاريخ: {format(new Date(backup.BackupDate), "PPpp", { locale: arSA })}
                                            - بواسطة: {backup.PerformedByUserName || 'غير معروف'}
                                            - ملاحظات: {backup.Notes || '-'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

