
'use client';

import type { DeliveryManifest, PaymentType } from '@/types';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface PrintableManifestProps {
    manifest: DeliveryManifest;
}

const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null || isNaN(value)) return '0';
    return new Intl.NumberFormat('ar-YE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

function calculateRevenue(totalShippingCost: number, totalShippingTax: number) {
    const revenueBeforeCommission = totalShippingCost - totalShippingTax;
    const driverCommissionTotal = revenueBeforeCommission * 0.70;
    const officeRevenueTotal = revenueBeforeCommission * 0.30;
    const roundToNearestThousand = (value: number) => Math.round(value / 1000) * 1000;
    const driverCommissionRounded = roundToNearestThousand(driverCommissionTotal);
    const officeRevenueRounded = roundToNearestThousand(officeRevenueTotal);
    return { driverCommissionRounded, officeRevenueRounded };
}


export function PrintableManifest({ manifest }: PrintableManifestProps) {
    const systemName = typeof window !== 'undefined' ? localStorage.getItem('SystemName') || "مكتب الجعيدي" : "مكتب الجعيدي";
    const systemMotto = typeof window !== 'undefined' ? localStorage.getItem('SystemMotto') || "لخدمات النقل السريع لنقل البضائع والطرود إلى جميع المحافظات" : "لخدمات النقل السريع لنقل البضائع والطرود إلى جميع المحافظات";
    const logoUrl = typeof window !== 'undefined' ? localStorage.getItem('SystemLogo') || "/images/logo.png" : "/images/logo.png";
    const paymentTypeMap: Record<string, string> = { COD: 'عند الاستلام', Prepaid: 'مدفوع', Postpaid: 'مدفوع' };
    const totalShippingCost = manifest.Parcels.reduce((sum, parcel) => sum + (parcel.ShippingCost || 0), 0);
    const totalShippingTax = manifest.Parcels.reduce((sum, parcel) => sum + (parcel.ShippingTax || 0), 0);
    const { driverCommissionRounded, officeRevenueRounded } = calculateRevenue(totalShippingCost, totalShippingTax);

    const totalReceivedAmount = manifest.Parcels.reduce((sum, parcel) => {
        if (parcel.PaymentType !== 'COD' || parcel.IsPaid) {
            return sum + (parcel.ShippingCost || 0);
        }
        return sum;
    }, 0);
    const createdAt = new Date(manifest.CreatedAt);

    // تحويل الوقت إلى توقيت اليمن UTC+3
    const yemeniDate = new Date(createdAt.getTime() + 3 * 60 * 60 * 1000);

     

    return (
        <div className="manifest-print-area bg-white text-black font-sans p-4 mx-auto max-w-4xl" dir="rtl">
            {/* Header */}
            <header className="flex justify-between items-center w-full">
                {/* Right Column */}
                <div className="w-1/3 text-right space-y-1 text-[10px]">
                    <h1 className="text-2xl font-bold">{systemName}</h1>
                    <p className="font-semibold">{systemMotto}</p>

                    {/* الفروع */}
                    <div className="flex justify-start gap-x-4">
                        <span className="font-semibold">فرع المكلا</span>
                        <span className="font-mono">05-310743-782775566-714402958</span>
                    </div>
                    <div className="flex justify-start gap-x-4">
                        <span className="font-semibold">فرع القطن</span>
                        <span className="font-mono">782485552-778393933</span>
                    </div>
                    <div className="flex justify-start gap-x-4">
                        <span className="font-semibold">فرع سيئون</span>
                        <span className="font-mono">782485551-775273851</span>
                    </div>
                    <div className="flex justify-start gap-x-4">
                        <span className="font-semibold">فرع المسافر</span>
                        <span className="font-mono">718212313-781466300</span>
                    </div>
                    <div className="flex justify-start gap-x-4">
                        <span className="font-semibold">فرع عدن</span>
                        <span className="font-mono">782485553-775661241</span>
                    </div>
                </div>


                {/* Middle Column */}
                <div className="w-1/3 flex justify-center items-center">
                    {logoUrl && (
                        <img src={logoUrl} alt="شعار الشركة" className="h-20 object-contain" data-ai-hint="company logo" />
                    )}
                </div>
                {/* Left Column */}
                <div className="w-1/3 flex justify-end items-center">
                    <div className="flex flex-col items-center">
                        <h2 className="text-2xl font-bold">كشف الرسائل</h2>
                        <div className="flex gap-1 mt-1">
                            <div className="text-center border border-black rounded px-2 py-0.5">
                                <p className="text-[9px]">التاريخ</p>
                                <p className="text-xs font-semibold">{format(new Date(manifest.CreatedAt), 'yyyy/MM/dd')}</p>
                            </div>
                            <div className="text-center border border-black rounded px-2 py-0.5">
                                <p className="text-[9px]">اليوم</p>
                                <p className="text-xs font-semibold">
                                    {format(yemeniDate, 'eeee', { locale: ar })}
                                </p>
                            </div>

                        </div>
                        <div className="text-center border border-black rounded px-2 py-0.5 mt-1 w-full">
                            <p className="text-[9px]">الرقم</p>
                            <p className="text-sm font-bold text-red-600">{manifest.ManifestID}</p>
                        </div>
                    </div>
                    
                </div>
            </header>

            <div className="border-b-2 border-black my-2"></div>

            <div className="text-xs font-bold">
                <p>اسم السائق: {manifest.DriverName || manifest.DriverID}</p>
            </div>

            <div className="mt-1">
                <table className="w-full text-xs border-collapse">
                    <thead>
                        <tr className="bg-blue-100">
                            <th className="border border-black p-1 font-semibold w-[3%]">#</th>
                            <th className="border border-black p-1 font-semibold w-[12%]">رقم التتبع</th>
                            <th className="border border-black p-1 font-semibold w-[15%]">المرسل</th>
                            <th className="border border-black p-1 font-semibold w-[15%]">المستلم</th>
                            <th className="border border-black p-1 font-semibold w-[10%]">رقم المستلم</th>
                            <th className="border border-black p-1 font-semibold w-[10%]">المدينة</th>
                            <th className="border border-black p-1 font-semibold w-[8%]">الكلفة</th>
                            <th className="border border-black p-1 font-semibold w-[8%]">التأمين</th>
                            <th className="border border-black p-1 font-semibold w-[8%]">نوع الدفع</th>
                            <th className="border border-black p-1 font-semibold w-[8%]">حاله الدفع</th>
                            <th className="border border-black p-1 font-semibold w-[11%]">التوقيع</th>
                        </tr>
                    </thead>
                    <tbody>
                        {manifest.Parcels.map((parcel, index) => (
                            <tr key={parcel.ParcelID} className="break-inside-avoid">
                                <td className="border border-black p-1 text-center">{index + 1}</td>
                                <td className="border border-black p-1 font-mono text-center">{parcel.TrackingNumber}</td>
                                <td className="border border-black p-1">{parcel.SenderName}</td>
                                <td className="border border-black p-1">{parcel.ReceiverName}</td>
                                <td className="border border-black p-1 text-center">{parcel.ReceiverPhone || '-'}</td>
                                <td className="border border-black p-1">{parcel.ReceiverDistrict}</td>
                                <td className="border border-black p-1 text-center">{formatCurrency(parcel.ShippingCost)}</td>
                                <td className="border border-black p-1 text-center">{formatCurrency(parcel.ShippingTax)}</td>
                                <td className="border border-black p-1 text-center">{paymentTypeMap[parcel.PaymentType] || '-'}</td>
                                <td className="border border-black p-1">{parcel.SenderName}</td>

                                 <td className="border border-black p-1 h-10"></td>
                            </tr>
                        ))}
                        {/* Add empty rows to fill the page if less than 20 parcels */}
                        {Array.from({ length: Math.max(0, 18 - manifest.Parcels.length) }).map((_, index) => (
                            <tr key={`empty-${index}`} className="break-inside-avoid">
                                <td className="border border-black p-1 text-center h-8">{manifest.Parcels.length + index + 1}</td>
                                <td className="border border-black p-1"></td>
                                <td className="border border-black p-1"></td>
                                <td className="border border-black p-1"></td>
                                <td className="border border-black p-1"></td>
                                <td className="border border-black p-1"></td>
                                <td className="border border-black p-1"></td>
                                <td className="border border-black p-1"></td>
                                <td className="border border-black p-1"></td>
                                <td className="border border-black p-1"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <footer className="flex justify-between items-end mt-4 text-xs">
                <div className="w-1/3 space-y-1">
                    <p className="font-bold">ملخص مالي:</p>
                    <p>إجمالي المبالغ المستلمة: <span>{formatCurrency(totalReceivedAmount)}</span></p>
                    <p>عمولة المكتب: <span>{formatCurrency(officeRevenueRounded)}</span></p>
                    <p>إجمالي التأمينات: <span>{formatCurrency(totalShippingTax)}</span></p>
                    <p>عمولة السائق: <span>{formatCurrency(driverCommissionRounded)}</span></p>
                </div>
                <div className="text-center">
                    <p className="font-bold">السيارة</p>
                    <p className="mt-8 border-t border-gray-400 pt-1">رقم السيارة ونوعها</p>
                </div>
                <div className="text-center">
                    <p className="font-bold">مسؤول المكتب</p>
                    <p className="mt-8 border-t border-gray-400 pt-1">الاسم والتوقيع</p>
                </div>
            </footer>
        </div>
    );
}

