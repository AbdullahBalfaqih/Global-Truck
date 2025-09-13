
"use client";

import type { Parcel, Branch, PaymentType } from '@/types';
import { QRCodeCanvas } from 'qrcode.react';
import React from 'react';

interface ParcelLabelProps {
    parcel: Parcel;
    originBranch: Branch | null;
    destinationBranch: Branch | null;
}

const toWords = (num: number): string => {
    const a = [
        '', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة',
        'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'
    ];
    const b = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const c = ['', 'مئة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
    const d = ['', 'ألف', 'مليون', 'مليار', 'تريليون'];

    if (num === 0) return 'صفر';

    const numStr = Math.floor(num).toString();
    const chunks = [];
    for (let i = numStr.length; i > 0; i -= 3) {
        chunks.unshift(numStr.substring(Math.max(0, i - 3), i));
    }

    const convertChunk = (chunk: string): string => {
        let n = parseInt(chunk, 10);
        if (n === 0) return '';
        const parts = [];
        const hundreds = Math.floor(n / 100);
        if (hundreds > 0) {
            parts.push(c[hundreds]);
            n %= 100;
        }
        if (n > 0) {
            if (parts.length > 0) parts.push('و');
            if (n < 20) {
                parts.push(a[n]);
            } else {
                const tens = Math.floor(n / 10);
                const units = n % 10;
                if (units > 0) {
                    parts.push(a[units]);
                    parts.push('و');
                }
                parts.push(b[tens]);
            }
        }
        return parts.join(' ');
    };

    const result = chunks.map((chunk, i) => {
        const numChunk = parseInt(chunk, 10);
        if (numChunk === 0) return '';
        const chunkWords = convertChunk(chunk);
        if (i < chunks.length - 1) {
            const thousands = d[chunks.length - 1 - i];
            if (numChunk === 1 && thousands === 'ألف') return thousands;
            if (numChunk === 2 && thousands === 'ألف') return 'ألفان';
            if (numChunk >= 3 && numChunk <= 10 && thousands === 'ألف') return `${a[numChunk]} آلاف`;
            return `${chunkWords} ${thousands}`;
        }
        return chunkWords;
    }).filter(Boolean).join(' و ');

    return result.trim();
};

export const ParcelLabel = React.forwardRef<HTMLDivElement, ParcelLabelProps>(
    ({ parcel, originBranch, destinationBranch }, ref) => {

        const paymentTypeMap: Record<PaymentType, string> = {
            COD: 'عند الاستلام',
            Prepaid: 'مدفوع',
            Postpaid: 'آجل'
        };
        const paymentTypeArabic = paymentTypeMap[parcel?.PaymentType ?? 'COD'] || parcel?.PaymentType || 'غير محدد';
        const shippingCost = parcel?.ShippingCost ?? 0;
        const shippingCostInWords = toWords(shippingCost);

        const headerBranchInfo = `
        <div class="space-y-0 text-[9px]">
            <h1 class="text-2xl font-bold">افرع المكتب</h1>
        </div><br>
        <div class="space-y-0 text-[9px]">
            <p>فرع سيئون - شارع الجزائر - قبلي محطة الخير خلف عمارة بن حيدرة سابقاً: <span class="font-mono">775273851-782485551</span></p>
            <p>فرع القطن - خط المرقدة - شرقي مركز الوديعة: <span class="font-mono">778393933-782485552</span></p>
            <p>فرع المسافر - داخل مجمع البريكي: <span class="font-mono">718212313-781466300</span></p>
            <p>فرع عدن - مقابل بنك التضامن - جوار فندق الخليج: <span class="font-mono">775661241-782485553</span></p>
        </div>
    `;

        return (
            <div ref={ref} className="manifest-print-area bg-white text-black font-almarai p-4 mx-auto max-w-4xl print:max-w-full print:p-2" dir="rtl">
                <header className="flex justify-between items-start w-full mb-4">
                    <div className="w-1/3 text-right">
                        <h1 className="text-xl font-bold">مكتب الجعيدي</h1>
                        <p className="text-[10px]">لخدمات النقل السريع لنقل البضائع</p>
                        <p className="text-[10px]">والطرود إلى جميع المحافظات</p>
                        <p className="text-[9px] mt-1">فرع المكلا - مقابل جامع الشرج - جهة باجعمان</p>
                        <p className="text-[9px] font-mono">05-310743 - 782775566 - 714402958</p>
                    </div>
                    <div className="w-1/3 flex flex-col items-center">
                        <img
                            src="/images/logo.png"
                            alt="شعار الشركة"
                            className="h-20 print:h-16 object-contain"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <div className="text-center mt-2 border-2 border-black rounded-md px-4 py-1">
                            <h2 className="text-lg font-bold">سند استلام</h2>
                        </div>
                    </div>
                    <div className="w-1/3 text-[9px] text-right" dangerouslySetInnerHTML={{ __html: headerBranchInfo }} />
                </header>

                <div className="border-2 border-black rounded-md px-4 py-1 mt-1 flex justify-between items-center">
                    <p className="font-bold text-lg">نوع الدفع: <span className="text-red-600">{paymentTypeArabic}</span></p>
                    <p className="font-mono text-xl font-bold text-red-600">{parcel?.TrackingNumber ?? 'غير محدد'}</p>
                    <p className="font-bold text-lg">المبلغ: <span className="text-red-600">{shippingCost.toFixed(0)} ريال</span></p>
                </div>

                <main className="border-2 border-black rounded-lg mt-4 p-4 min-h-[300px] text-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-baseline mb-3">
                            <span className="font-bold">استلمت من الأخ /</span>
                            <p className="flex-grow border-b border-dotted border-black mx-2 text-center font-medium">{parcel?.SenderName ?? 'غير محدد'}</p>
                        </div>
                        <div className="flex items-baseline mb-3">
                            <span className="font-bold">المبلغ:</span>
                            <p className="flex-grow border-b border-dotted border-black mx-2 text-center font-medium">{shippingCostInWords} ريال يمني فقط لا غير.</p>
                        </div>
                        <div className="flex items-baseline mb-3 bg-gray-100 p-2 rounded-sm">
                            <span className="font-bold">وذلك مقابل /</span>
                            <p className="flex-grow mx-2 text-center font-medium">{parcel?.Notes ?? '............................'}</p>
                        </div>
                        <div className="flex items-baseline mb-3">
                            <span className="font-bold">مرسلة للأخ /</span>
                            <p className="flex-grow border-b border-dotted border-black mx-2 text-center font-medium">{parcel?.ReceiverName ?? 'غير محدد'}</p>
                        </div>
                        <div className="flex justify-between items-baseline mb-4">
                            <div>
                                <span className="font-bold">من:</span>
                                <span className="border-b border-dotted border-black mx-2 px-4 text-center font-medium">{originBranch?.Name ?? 'غير محدد'}</span>
                            </div>
                            <div>
                                <span className="font-bold">الى:</span>
                                <span className="border-b border-dotted border-black mx-2 px-4 text-center font-medium">{destinationBranch?.Name ?? parcel?.ReceiverDistrict ?? 'غير محدد'}</span>
                            </div>
                            <div>
                                <span className="font-bold">رقم الجوال:</span>
                                <span className="border-b border-dotted border-black mx-2 px-4 text-center font-medium">{parcel?.ReceiverPhone ?? 'غير محدد'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-end">
                        <div className="text-[9px] space-y-1">
                            <p>نحن غير مسؤلين عن الإجراءات الأمنية الخارجية عن إرادتنا.</p>
                            <p>نحن غير مسؤلين عن الأشياء الثمينة الممنوع إرسالها في الطرد.</p>
                            <p>نحن غير مسؤلين عن بقاء الطرد لاكثر من شهر.</p>
                            <p>نحن غير مسؤلين عن الأشياء غير المذكورة أعلاه.</p>
                            <p>نحن غير مسؤلين عن الحوادث والحريق.</p>
                        </div>
                        <div className="text-center">
                            <QRCodeCanvas value={`http://localhost:9003/track/${parcel?.TrackingNumber ?? ''}`} size={75} />
                            <p className="font-semibold mt-1">لتتبع شحنتك<br />امسح الباركود</p>
                        </div>
                        <div className="text-center">
                            <p className="font-bold">مدير المكتب</p>
                            <p>............................</p>
                        </div>
                    </div>
                </main>
            </div>
        );
    });

ParcelLabel.displayName = 'ParcelLabel';
