"use client";

import type { CashTransaction, User, Branch } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

// --- Integrated number-to-words function ---
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
            if (parts.length > 0) {
                parts.push('و');
            }
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
// --- End of integrated function ---

interface PrintableVoucherProps {
    transaction: CashTransaction | null;
    users: User[];
    branches: Branch[];
}

const formatCurrencyYER = (amount: number) => {
    return new Intl.NumberFormat('ar-YE', {
        style: 'currency',
        currency: 'YER',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

export function PrintableVoucher({ transaction, users, branches }: PrintableVoucherProps) {
    const systemName = typeof window !== 'undefined' ? localStorage.getItem('SystemName') || "مــكــتــب الــجــعــيــدي" : "مــكــتــب الــجــعــيــدي";

    if (!transaction) {
        return (
            <div className="printable-report-area p-4 bg-white text-black">
                <Card className="border border-red-500">
                    <CardContent className="text-center py-8">
                        <p className="text-red-600 font-bold text-lg">خطأ في عرض السند</p>
                        <p>معرف الحركة غير صالح أو غير موجود.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const voucherType = transaction.TransactionType === 'Income' ? 'سند قبض' : 'سند صرف';
    const voucherVerb = transaction.TransactionType === 'Income' ? 'استلمنا من' : 'اصرفوا إلى';
    const amountInWords = toWords(transaction.Amount);

    const addedByUser = users.find(u => u.UserID === transaction.AddedByUserID)?.Name || 'مستخدم غير معروف';
    const branchName = transaction.BranchID ?
        (branches.find(b => b.BranchID === transaction.BranchID)?.Name || `فرع ${transaction.BranchID}`) :
        'عام';

    return (
        <div className="printable-report-area p-4 print:p-0 bg-white text-black print:block print:w-full print:h-full print:fixed print:inset-0 print:z-[9999]">
            <Card className="print:shadow-none print:border print:border-gray-300">
                <CardHeader className="print:pb-2 text-center border-b border-gray-300">
                    <div className="flex justify-between items-center mb-2">
                        <img
                            src="/images/logo.png"
                            alt="شعار الشركة"
                            className="h-20 print:h-16 object-contain"
                            data-ai-hint="company logo"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                        <div className="text-center">
                            <h1 className="text-xl print:text-lg font-bold">{systemName}</h1>
                            <h2 className="text-2xl print:text-xl font-bold mt-1">{voucherType}</h2>
                        </div>
                        <div className="text-left print:text-xs">
                            <p>رقم السند: {transaction.TransactionID || 'غير معروف'}</p>
                            <p>التاريخ: {format(new Date(transaction.TransactionDate), 'yyyy/MM/dd')}</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="print:pt-4 text-sm print:text-base space-y-6">
                    <div className="flex justify-between items-center bg-gray-100 p-2 rounded-md">
                        <span className="font-bold text-lg">{voucherVerb}:</span>
                        <div className="font-semibold text-lg flex-grow mx-4 border-b border-dotted border-gray-500 text-center">
                            {transaction.Description || 'غير محدد'}
                        </div>
                    </div>
                    <div className="flex justify-between items-center bg-gray-100 p-2 rounded-md">
                        <span className="font-bold text-lg">مبلغ وقدره:</span>
                        <div className="font-semibold text-lg flex-grow mx-4 border-b border-dotted border-gray-500 text-center">
                            {amountInWords} ريال يمني فقط لا غير.
                        </div>
                        <div className="border-2 border-black p-2 rounded-md font-bold text-lg bg-white">
                            {formatCurrencyYER(transaction.Amount)}
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-semibold">وذلك عن:</span>
                        <div className="flex-grow mx-4 border-b border-dotted border-gray-500 text-center">
                            {transaction.Description || 'غير محدد'}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 pt-12 text-center font-semibold">
                        <div>
                            <p>المستلم</p>
                            <p className="mt-8 border-t border-gray-400 pt-1">الاسم والتوقيع</p>
                        </div>
                        <div>
                            <p>المحاسب</p>
                            <p className="mt-8 border-t border-gray-400 pt-1">{addedByUser}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
