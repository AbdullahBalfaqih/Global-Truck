
import { NextRequest, NextResponse } from 'next/server';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import type { PaymentType } from '@/types';

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

// Custom parser to handle double curly braces, e.g. {{tag}}
const angularParser = (tag: string) => {
    const expr = tag.replace(/’/g, "'");
    return {
        get: (scope: any) => {
            if (expr === '.') {
                return scope;
            }
            try {
                // This allows accessing nested properties if needed, e.g., {{parcel.SenderName}}
                return expr.split('.').reduce((acc, key) => acc[key], scope);
            } catch (error) {
                return undefined;
            }
        },
    };
};

const getPaymentTypeArabic = (paymentType: PaymentType, isPaid: boolean): string => {
    switch (paymentType) {
        case 'Prepaid': return 'مدفوع مسبقًا';
        case 'COD': return isPaid ? 'تم الدفع عند الاستلام' : 'الدفع عند الاستلام';
        case 'Postpaid': return 'آجل';
        default: return paymentType;
    }
}


export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Path to the template file in the `templates` directory
        const templatePath = path.resolve(process.cwd(), 'templates', 'shipping-label.docx');

        if (!fs.existsSync(templatePath)) {
            console.error(`Template file not found at path: ${templatePath}`);
            return new NextResponse(JSON.stringify({ error: 'Template file not found', details: `Path does not exist: ${templatePath}` }), {
                status: 500, headers: { 'Content-Type': 'application/json' },
            });
        }

        const content = fs.readFileSync(templatePath, 'binary');
        const zip = new PizZip(content);

        const doc = new Docxtemplater(zip, {
            parser: angularParser,
            paragraphLoop: true,
            linebreaks: true,
        });

        const formattedDate = format(new Date(body.CreatedAt), 'yyyy/MM/dd');
        const costInWords = body.ShippingCost ? toWords(body.ShippingCost) + ' ريال' : '';
        const paymentTypeArabic = getPaymentTypeArabic(body.PaymentType, body.IsPaid);

        // Data to be rendered in the template - ensure keys match the template's placeholders
        const renderData = {
            TrackingNumber: body.TrackingNumber,
            CreatedAt: formattedDate,
            ShippingCost: body.ShippingCost,
            ShippingCostInWords: costInWords,
            SenderName: body.SenderName,
            ReceiverName: body.ReceiverName,
            ReceiverPhone: body.ReceiverPhone,
            ReceiverCity: body.ReceiverCity,
            ReceiverDistrict: body.ReceiverDistrict,
            OriginBranchName: body.OriginBranchName,
            PaymentType: paymentTypeArabic, // Added PaymentType
            Notes: body.Notes || ''
        };

        // Render the document with the data
        doc.render(renderData);

        const buf = doc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE',
        });

        // Send the generated document as a response
        return new NextResponse(buf, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="shipping_${body.TrackingNumber}.docx"`,
            },
        });
    } catch (error: any) {
        // Log the full error for debugging
        console.error('Error generating DOCX file:', error);

        // Send a structured error response
        return new NextResponse(JSON.stringify({
            error: 'Failed to generate document',
            details: error.message,
            stack: error.stack,
            properties: error.properties // docxtemplater specific errors
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
