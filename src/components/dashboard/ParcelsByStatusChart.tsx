"use client"

import { TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip } from "recharts"

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    ChartContainer,
    ChartTooltipContent,
} from "@/components/ui/chart"
import type { ParcelsByStatusData, ParcelStatus } from "@/types";

interface ParcelsByStatusChartProps {
    data: ParcelsByStatusData[];
}

// استخدام المفاتيح العربية لتتوافق مع ParcelStatus الحالي
const chartConfig: Record<ParcelStatus | 'count', { label: string; color?: string }> = {
    count: { label: "الطرود" },

    // القيم العربية
    "قيد المعالجة": { label: "قيد المعالجة", color: "hsl(var(--chart-1))" },
    "قيد التوصيل": { label: "قيد التوصيل", color: "hsl(var(--chart-2))" },
    "تم التوصيل": { label: "تم التوصيل", color: "hsl(var(--chart-3))" },
    "تم التسليم": { label: "تم التسليم", color: "hsl(var(--chart-4))" },
    "ملغى": { label: "ملغى", color: "hsl(var(--chart-5))" },

    // القيم الإنجليزية
    Pending: { label: "قيد المعالجة", color: "hsl(var(--chart-1))" },
    InTransit: { label: "قيد التوصيل", color: "hsl(var(--chart-2))" },
    Delivered: { label: "تم التوصيل", color: "hsl(var(--chart-3))" },
    Cancelled: { label: "تم التسليم", color: "hsl(var(--chart-4))" },
};

export function ParcelsByStatusChart({ data }: ParcelsByStatusChartProps) {

    const processedData = data.map(item => {
        const color = chartConfig[item.status]?.color || "hsl(var(--primary))";
        return {
            ...item,
            fill: color,
        };
    });

    const filteredData = processedData.filter(item => chartConfig[item.status]);

    return (
        <Card className="shadow-lg rounded-lg">
            <CardHeader>
                <CardTitle>الطرود حسب الحالة</CardTitle>
                <CardDescription>توزيع الطرود عبر الحالات المختلفة</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                    <BarChart data={filteredData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis
                            dataKey="status"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tickFormatter={(value: ParcelStatus) => chartConfig[value]?.label || value}
                        />
                        <YAxis allowDecimals={false} />
                        <RechartsTooltip
                            cursor={{ fill: 'hsl(var(--muted))' }}
                            content={<ChartTooltipContent />}
                        />
                        <Bar
                            dataKey="count"
                            radius={4}
                            fill="fill"
                        />
                    </BarChart>
                </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col items-start gap-2 text-sm">
                <div className="flex gap-2 font-medium leading-none">
                    إجمالي الطرود: {data.reduce((acc, curr) => acc + curr.count, 0)}
                    <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <div className="leading-none text-muted-foreground">
                    عرض البيانات المتاحة من قاعدة البيانات.
                </div>
            </CardFooter>
        </Card>
    )
}
