
"use client";

import type { Parcel, Branch, DriverLocation } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Package, Building, Truck, CheckCircle, User, FileText, Weight, StickyNote, Phone, HomeIcon } from 'lucide-react';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import dynamic from 'next/dynamic';

// Dynamically import the map component to avoid SSR issues with Leaflet
const RouteMap = dynamic(() => import('./RouteMap'), {
    ssr: false,
    loading: () => <div className="w-full h-[400px] bg-muted flex justify-center items-center"><p>جاري تحميل الخريطة...</p></div>
});


interface TrackingResultDisplayProps {
    parcel: Parcel;
    originBranch: Branch | null;
    destinationBranch: Branch | null;
    driverLocation: DriverLocation | null;
}

const getStatusBadgeClass = (status: string) => {
    switch (status) {
        case 'قيد التوصيل':
        case 'InTransit':
            return 'bg-blue-500 hover:bg-blue-600';
        case 'تم التوصيل':
        case 'Delivered':
            return 'bg-green-500 hover:bg-green-600';
        case 'ملغى':
        case 'Cancelled':
            return 'bg-red-500 hover:bg-red-600';
        default:
            return 'bg-gray-500 hover:bg-gray-600';
    }
};

const getTimelineSteps = (status: Parcel['Status']) => {
    const steps = [
        { name: 'قيد المعالجة', completed: false },
        { name: 'قيد التوصيل', completed: false },
        { name: 'تم التوصيل', completed: false },
        { name: 'تم التسليم', completed: false },
    ];

    if (status) {
        steps[0].completed = true;
        if (  status === 'قيد التوصيل' || status === 'تم التوصيل' || status === 'تم التسليم') {
            steps[1].completed = true;
        }
        if ( status === 'تم التوصيل' || status === 'تم التسليم') {
            steps[2].completed = true;
        }
        if (status === 'تم التسليم') {
            steps[3].completed = true;
        }
    }

    return steps;
}

export function TrackingResultDisplay({ parcel, originBranch, destinationBranch, driverLocation }: TrackingResultDisplayProps) {
    const timelineSteps = getTimelineSteps(parcel.Status);

    return (
        <div className="space-y-6 mt-8">
            <Card className="shadow-lg rounded-xl overflow-hidden">
                <CardHeader>
                    <CardTitle>مسار الشحنة</CardTitle>
                    <CardDescription>عرض المسار بين فرع المصدر والوجهة.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 h-[400px]">
                    <RouteMap
                        originBranch={originBranch}
                        destinationBranch={destinationBranch}
                        driverLocation={driverLocation}
                    />
                </CardContent>
            </Card>

            <Card className="shadow-lg rounded-xl">
                <CardHeader>
                    <CardTitle>تفاصيل الشحنة</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4 text-center">
                    <div>
                        <p className="text-sm text-muted-foreground">الحالة الحالية</p>
                        <Badge className={`mt-1 text-lg ${getStatusBadgeClass(parcel.Status as string)}`}>{parcel.Status}</Badge>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">المصدر</p>
                        <p className="font-semibold text-lg">{originBranch?.City || 'غير معروف'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">مدينة استلام شحنتك</p>
                        <p className="font-semibold text-lg">{parcel?.ReceiverDistrict || 'غير معروف'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">الوجهة</p>
                        <p className="font-semibold text-lg">{destinationBranch?.City || parcel.ReceiverCity}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">وقت إرسال الشحنة</p>
                        <p className="font-semibold text-lg">{format(new Date(parcel.CreatedAt), "dd MMMM yyyy", { locale: arSA })}</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-lg rounded-xl">
                <CardHeader>
                    <CardTitle>الجدول الزمني للشحنة</CardTitle>
                </CardHeader>
                <CardContent className="pt-8">
                    <div className="relative">
                        {/* الخط الرمادي */}
                        <div className="absolute left-0 top-1/2 w-full h-0.5 bg-gray-200" />

                        {/* الخط الأخضر من اليمين لليسار */}
                        <div
                            className="absolute right-0 top-1/2 h-0.5 bg-primary transition-all duration-500"
                            style={{
                                width: `${((timelineSteps.filter((s) => s.completed).length - 1) /
                                        (timelineSteps.length - 1)) *
                                    100
                                    }%`,
                            }}
                        />

                        {/* النقاط تبقى كما هي */}
                        <div className="relative flex justify-between">
                            {timelineSteps.map((step, index) => (
                                <div
                                    key={index}
                                    className="flex flex-col items-center text-center w-20"
                                >
                                    <div
                                        className={`h-4 w-4 rounded-full border-2 transition-colors ${step.completed
                                                ? "bg-primary border-primary"
                                                : "bg-gray-200 border-gray-300"
                                            }`}
                                    />
                                    <p className="text-xs mt-2 text-muted-foreground">{step.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>


            <Card className="shadow-lg rounded-xl">
                <CardHeader>
                    <CardTitle>بيانات الشحنة</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div className="space-y-3 p-4 bg-muted/50 rounded-md">
                        <h4 className="font-semibold text-md flex items-center gap-2"><User className="text-primary" />بيانات المرسل</h4>
                        <p><span className="font-medium text-muted-foreground">الاسم:</span> {parcel.SenderName}</p>
                        <p><span className="font-medium text-muted-foreground">الهاتف:</span> {parcel.SenderPhone || 'غير متوفر'}</p>
                        <p><span className="font-medium text-muted-foreground">الفرع:</span> {originBranch?.Name || 'غير معروف'}</p>
                    </div>
                    <div className="space-y-3 p-4 bg-muted/50 rounded-md">
                        <h4 className="font-semibold text-md flex items-center gap-2"><HomeIcon className="text-primary" />بيانات المستلم</h4>
                        <p><span className="font-medium text-muted-foreground">الاسم:</span> {parcel.ReceiverName}</p>
                        <p><span className="font-medium text-muted-foreground">الهاتف:</span> {parcel.ReceiverPhone || 'غير متوفر'}</p>
                        <p><span className="font-medium text-muted-foreground">المدينة:</span> {parcel.ReceiverCity} - {parcel.ReceiverDistrict}</p>
                    </div>
                    <div className="space-y-3 p-4 bg-muted/50 rounded-md md:col-span-2">
                        <h4 className="font-semibold text-md flex items-center gap-2"><Package className="text-primary" />بيانات الطرد</h4>
                        <div className="grid grid-cols-2 gap-x-4">
                            <p><span className="font-medium text-muted-foreground">نوع الدفع:</span>    {parcel.PaymentType === "Prepaid"
                                ? "مدفوع"
                                : parcel.PaymentType === "COD"
                                    ? "عند الاستلام"
                                    : "آجل"
                            }</p>
                            <p><span className="font-medium text-muted-foreground">تكلفة الشحن:</span> {parcel.ShippingCost.toFixed(0)} ريال</p>
                            {parcel.Notes && <p className="col-span-2"><span className="font-medium text-muted-foreground">ملاحظات:</span> {parcel.Notes}</p>}
                        </div>
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}
