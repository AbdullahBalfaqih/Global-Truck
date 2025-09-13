"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ReportFilters } from '@/components/reports/ReportFilters';
import ReportDisplay from '@/components/reports/ReportDisplay';
import { getAllBranches } from "@/actions/branches";
import { getParcels } from "@/actions/getparcels";
import { getAllDrivers } from "@/actions/drivers";
import { getAllExpenses } from "@/actions/expenses";
import { getAllUsers } from "@/actions/users";
import { getAllActiveManifests } from "@/actions/manifests";

import type { Driver, Branch, Parcel, Expense, User, DeliveryManifest, ParcelStatus } from '@/types';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { Loader2, AlertTriangle, FileText } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle as ShadcnAlertTitle } from "@/components/ui/alert";

const ALL_FILTER_VALUE = "_all_";

interface ReportFilterOptions {
    drivers: { id: string; name: string }[];
    branches: { id: number; name: string }[];
}

interface ReportData {
    type: 'table' | 'chart' | 'text' | 'financial_summary' | 'driver_performance_summary';
    data: any;
    options?: any;
    title?: string;
    description?: string;
}

const formatCurrencyYER = (value: number | undefined | null) => {
    if (value === undefined || value === null || isNaN(value)) return 'غير متوفر';
    return new Intl.NumberFormat('ar-YE', { style: 'currency', currency: 'YER', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

const getParcelStatusArabic = (status: ParcelStatus): string => {
    const map: Record<ParcelStatus, string> = {
         "قيد المعالجة": 'قيد المعالجة',
        "قيد التوصيل": 'قيد التوصيل',
        "تم التوصيل": 'تم التوصيل',
        "تم التسليم": 'تم التسليم',
    };
    return map[status] || status;
};

export default function ReportsPage() {
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filterOptions, setFilterOptions] = useState<ReportFilterOptions | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const branches: Branch[] = await getAllBranches();
                const drivers: Driver[] = await getAllDrivers();

                setFilterOptions({
                    drivers: drivers.map(d => ({ id: d.DriverID, name: d.Name })),
                    branches: branches.map(b => ({ id: b.BranchID, name: `${b.Name} (${b.City})` })),
                });
            } catch (error) {
                console.error("Error fetching filter options:", error);
            }
        };

        fetchData();
    }, []);

    const handleGenerateReport = async (filters: any) => {
        setIsLoading(true);
        setReportData(null);
        setError(null);
        console.log("Generating report with filters:", filters);

        try {
            const parcels = await getParcels(); // جلب الطرود
            let generatedTitle = "تقرير مخصص";
            let generatedDescription = `تم إنشاء هذا التقرير بتاريخ ${format(new Date(), "PPpp", { locale: arSA })}`;
            let reportType: ReportData['type'] = 'table';
            let dataForReport: any = { headers: ["معلومة", "قيمة"], rows: [["لا توجد بيانات تطابق الفلتر", "-"]] };

            const startDate = filters.startDate ? new Date(filters.startDate) : null;
            const endDate = filters.endDate ? new Date(filters.endDate) : null;

            const filterByDateRange = (itemDate: string | Date) => {
                const date = typeof itemDate === 'string' ? parseISO(itemDate) : itemDate;
                if (startDate && date < startDate) return false;
                if (endDate && date > new Date(endDate.getTime() + 24 * 60 * 60 * 1000 - 1)) return false; // include full end day
                return true;
            };

            const periodString = startDate && endDate ? `للفترة من ${format(startDate, "P", { locale: arSA })} إلى ${format(endDate, "P", { locale: arSA })}` : "لكل الأوقات";

            switch (filters.reportType) {
                case 'parcels_by_status':
                    generatedTitle = `تقرير الطرود حسب الحالة ${periodString}`;
                    generatedDescription = `يعرض هذا التقرير توزيع الطرود حسب حالتها ${filters.branchId !== ALL_FILTER_VALUE ? ` لفرع ${filterOptions?.branches.find(b => b.id.toString() === filters.branchId)?.name}` : 'لجميع الفروع'}.`;
                    const statusCounts: Record<string, number> = {};
                    parcels
                        .filter(p => filterByDateRange(p.CreatedAt))
                        .filter(p => filters.branchId === ALL_FILTER_VALUE || p.OriginBranchID.toString() === filters.branchId || p.DestinationBranchID.toString() === filters.branchId)
                        .forEach(p => {
                            statusCounts[p.Status] = (statusCounts[p.Status] || 0) + 1;
                        });
                    dataForReport = {
                        headers: ["الحالة", "عدد الطرود"],
                        rows: Object.entries(statusCounts).map(([status, count]) => [getParcelStatusArabic(status as ParcelStatus), count])
                    };
                    break;

                case 'branch_activity':
                    const branchIdNum = filters.branchId !== ALL_FILTER_VALUE ? parseInt(filters.branchId) : null;
                    const branchName = branchIdNum ? filterOptions?.branches.find(b => b.id === branchIdNum)?.name : 'جميع الفروع';
                    generatedTitle = `تقرير نشاط الفرع: ${branchName} ${periodString}`;
                    generatedDescription = `تفاصيل الطرود الصادرة والواردة لفرع ${branchName}.`;
                    dataForReport = {
                        headers: ["رقم التتبع", "المرسل", "المستلم", "الفرع المصدر", "الفرع الوجهة", "الحالة", "تاريخ الإنشاء"],
                        rows: parcels
                            .filter(p => filterByDateRange(p.CreatedAt))
                            .filter(p => !branchIdNum || p.OriginBranchID === branchIdNum || p.DestinationBranchID === branchIdNum)
                            .map(p => [
                                p.TrackingNumber, p.SenderName, p.ReceiverName,
                                filterOptions?.branches.find(b => b.id === p.OriginBranchID)?.name || p.OriginBranchID,
                                filterOptions?.branches.find(b => b.id === p.DestinationBranchID)?.name || p.DestinationBranchID,
                                getParcelStatusArabic(p.Status), format(parseISO(p.CreatedAt), "P", { locale: arSA })
                            ])
                    };
                    break;

                // يمكنك إضافة المزيد من حالات التقارير هنا

                default:
                    setError("نوع التقرير المختار غير مدعوم حاليًا.");
                    setIsLoading(false);
                    return;
            }

            setReportData({
                type: reportType,
                data: dataForReport,
                title: generatedTitle,
                description: generatedDescription,
            });

        } catch (e: any) {
            console.error("Error generating report:", e);
            setError(e.message || "حدث خطأ غير متوقع أثناء إنشاء التقرير.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <FileText className="h-7 w-7 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight text-foreground">إنشاء التقارير</h1>
            </div>

            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle>تحديد معايير التقرير</CardTitle>
                    <CardDescription>اختر الفلاتر المناسبة لإنشاء تقريرك.</CardDescription>
                </CardHeader>
                <CardContent>
                    {filterOptions ? (
                        <ReportFilters
                            onApplyFilters={handleGenerateReport}
                            filterOptions={filterOptions}
                            isLoading={isLoading}
                        />
                    ) : (
                        <p>جاري تحميل خيارات الفلترة...</p>
                    )}
                </CardContent>
            </Card>

            {isLoading && (
                <Card className="shadow-lg rounded-lg">
                    <CardContent className="p-6 text-center flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary me-2" />
                        <p>جاري إنشاء التقرير...</p>
                    </CardContent>
                </Card>
            )}

            {error && !isLoading && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <ShadcnAlertTitle>خطأ في إنشاء التقرير</ShadcnAlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {!isLoading && !error && reportData && (
                <ReportDisplay reportData={reportData} />
            )}
            {!isLoading && !error && !reportData && (
                <Card className="shadow-lg rounded-lg">
                    <CardContent className="p-6 text-center">
                        <p className="text-muted-foreground">الرجاء تحديد معايير التقرير والضغط على "إنشاء التقرير".</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}