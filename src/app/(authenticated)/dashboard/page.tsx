
import { StatCard } from "@/components/dashboard/StatCard";
import { ParcelsByStatusChart } from "@/components/dashboard/ParcelsByStatusChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { getDashboardStatsData, getParcelsByStatusChartData } from "@/actions/dashboard";
import type { Stat, ParcelsByStatusData, UserRole } from "@/types";
import { AlertCircle, PackageSearch, LayoutDashboard, Package, Truck, Send, DollarSign } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getSession } from "@/actions/auth";

// Map server data to UI components including icons
const addIconsToStats = (stats: Omit<Stat, 'icon'>[]): Stat[] => {
    const iconMap: { [key: string]: React.ElementType } = {
        'إجمالي الطرود': Package,
        'طرود قيد المعالجة': Send,
        'طرود قيد التوصيل': Truck,
        'إجمالي الإيرادات': DollarSign,
        'إيرادات فرعك': DollarSign,
        'خطأ في التحميل': AlertCircle,
    };

    return stats.map(stat => ({
        ...stat,
        icon: iconMap[stat.title] || LayoutDashboard, // Default icon
    }));
};


export default async function DashboardPage() {
    const session = await getSession();
    // @ts-ignore
    const userRole: UserRole = session?.role;
    // @ts-ignore
    const userBranchId: number | null = session?.branchId;

    let stats: Stat[] = [];
    let chartData: ParcelsByStatusData[] = [];
    let errorLoadingData: string | null = null;

    try {
        console.log("DashboardPage: Fetching dashboard data...");

        const [statsWithoutIcons, fetchedChartData] = await Promise.all([
            getDashboardStatsData(userBranchId, userRole),
            getParcelsByStatusChartData(userBranchId, userRole)
        ]);

        stats = addIconsToStats(statsWithoutIcons);
        chartData = fetchedChartData;

        console.log("DashboardPage: Data fetched successfully.", { statsCount: stats.length, chartDataCount: chartData.length });

    } catch (error) {
        console.error("Error fetching dashboard data for DashboardPage:", error);
        errorLoadingData = "حدث خطأ أثناء تحميل بيانات لوحة التحكم. يرجى المحاولة مرة أخرى لاحقًا.";
        stats = [{ title: 'خطأ في التحميل', value: '!', icon: AlertCircle }];
        chartData = [];
    }


    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">لوحة التحكم</h1>
            </div>

            {errorLoadingData && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>خطأ في تحميل البيانات</AlertTitle>
                    <AlertDescription>{errorLoadingData}</AlertDescription>
                </Alert>
            )}

            {stats.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {stats.map((stat, index) => (
                        <StatCard key={index} stat={stat} />
                    ))}
                </div>
            ) : !errorLoadingData ? (
                <Alert>
                    <PackageSearch className="h-4 w-4" />
                    <AlertTitle>لا توجد بيانات إحصائية</AlertTitle>
                    <AlertDescription>
                        لا توجد بيانات إحصائية لعرضها حاليًا. قد يكون السبب عدم وجود طرود أو مشكلة في الاتصال بقاعدة البيانات.
                    </AlertDescription>
                </Alert>
            ) : null}


            <div className="grid gap-6 md:grid-cols-2">
                {chartData.length > 0 ? (
                    <ParcelsByStatusChart data={chartData} />
                ) : !errorLoadingData ? (
                    <Card className="shadow-lg rounded-lg">
                        <CardHeader>
                            <CardTitle>الطرود حسب الحالة</CardTitle>
                            <CardDescription>توزيع الطرود عبر الحالات المختلفة</CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-center min-h-[200px]">
                            <p className="text-muted-foreground">لا توجد بيانات للرسم البياني حاليًا.</p>
                        </CardContent>
                    </Card>
                ) : null}

                <Card className="shadow-lg rounded-lg">
                    <CardHeader>
                        <CardTitle>النشاط الأخير (مثال)</CardTitle>
                        <CardDescription>نظرة عامة على آخر تحديثات الطرود وأحداث النظام (بيانات ثابتة للعرض).</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* TODO: This section should eventually fetch real recent activity logs */}
                        <ul className="space-y-3">
                            {[
                                { id: 1, text: "تم تحديث الطرد GT1000001 إلى 'قيد النقل'", time: "منذ دقيقتين" },
                                { id: 2, text: "تم إنشاء مستخدم جديد 'موظف فرع س'", time: "منذ ساعة" },
                                { id: 3, text: "حالة الطرد GT1000002 'تم التوصيل'", time: "منذ 3 ساعات" },
                            ].map((item) => (
                                <li key={item.id} className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-muted/50">
                                    <span>{item.text}</span>
                                    <span className="text-muted-foreground">{item.time}</span>
                                </li>
                            ))}
                            {/* Add a message if no activity to show */}
                            {/* <li className="text-center text-muted-foreground">لا يوجد نشاط لعرضه.</li> */}
                        </ul>
                    </CardContent>
                </Card>
            </div>
        
        </div>
    );
}

