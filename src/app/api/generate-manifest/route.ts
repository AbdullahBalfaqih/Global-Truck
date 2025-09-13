import { NextRequest, NextResponse } from 'next/server';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

// Define the interface for the incoming request body and data structures
interface Parcel {
    ShippingCost: number;
    ShippingTax: number;
    PaymentType: 'COD' | 'Prepaid' | 'Postpaid';
    ReceiverPhone: string;
    Notes: string;
}

interface ManifestData {
    DriverName: string;
    ManifestID: string;
    Parcels: Parcel[];
}

// Custom parser to handle single curly braces, e.g., {tag}
const angularParser = (tag: string) => {
    const expr = tag.replace(/’/g, "'");
    return {
        get: (scope: any) => {
            if (expr === '.') {
                return scope;
            }
            try {
                return expr.split('.').reduce((acc, key) => acc[key], scope);
            } catch (error) {
                return undefined;
            }
        },
    };
};

// Main API route handler function
export async function POST(req: NextRequest) {
    try {
        const manifestData: ManifestData = await req.json();

        // 1. Load the document template
        const templatePath = path.resolve(process.cwd(), 'templates', 'manifest-template.docx');

        if (!fs.existsSync(templatePath)) {
            console.error(`Template file not found at path: ${templatePath}`);
            return NextResponse.json({ error: 'Template file not found' }, { status: 500 });
        }

        const content = fs.readFileSync(templatePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            parser: angularParser,
            paragraphLoop: true,
            linebreaks: true,
        });

        // 2. Process and calculate data
        const { totalShippingCost, totalShippingTax, formattedParcels } = processParcels(manifestData.Parcels);

        const { driverCommissionRounded, officeRevenueRounded } = calculateRevenue(totalShippingCost, totalShippingTax);

        // 3. Prepare data for rendering
        const renderData = {
            Date: format(new Date(), 'yy/MM/dd'),
            Day: format(new Date(), 'eeee', { locale: arSA }),
            DriverName: manifestData.DriverName,
            ManifestID: manifestData.ManifestID,
            Parcels: formattedParcels,
            TotalShippingCost: totalShippingCost.toFixed(0),
            TotalShippingTax: totalShippingTax.toFixed(0),
            DriverCommissionTotal: driverCommissionRounded.toFixed(0),
            OfficeRevenueTotal: officeRevenueRounded.toFixed(0),
        };

        // 4. Render the document and generate the buffer
        doc.render(renderData);

        const buf = doc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE',
        });

        // 5. Return the generated document
        return new NextResponse(buf, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="manifest_${manifestData.ManifestID}.docx"`,
            },
        });
    } catch (error: any) {
        console.error('Error generating DOCX manifest:', error);
        return NextResponse.json({
            error: 'Failed to generate document',
            details: error.message,
        }, { status: 500 });
    }
}

// Helper function to process parcel data
function processParcels(parcels: Parcel[]) {
    let totalShippingCost = 0;
    let totalShippingTax = 0;

    const formattedParcels = parcels.map((parcel, index) => {
        totalShippingCost += parcel.ShippingCost || 0;
        totalShippingTax += parcel.ShippingTax || 0;

        let paymentTypeArabic = 'لا يوجد';
        switch (parcel.PaymentType) {
            case 'COD':
                paymentTypeArabic = 'عند الاستلام';
                break;
            case 'Prepaid':
                paymentTypeArabic = 'مدفوع';
                break;
            case 'Postpaid':
                paymentTypeArabic = 'مدفوع';
                break;
        }

        return {
            ...parcel,
            Index: index + 1,
            ReceiverPhone: parcel.ReceiverPhone || '-',
            Notes: parcel.Notes || 'لا يوجد',
            PaymentType: paymentTypeArabic,
        };
    });

    return { totalShippingCost, totalShippingTax, formattedParcels };
}

// Helper function to calculate and round revenue
function calculateRevenue(totalShippingCost: number, totalShippingTax: number) {
    const revenueBeforeCommission = totalShippingCost - totalShippingTax;
    const driverCommissionTotal = revenueBeforeCommission * 0.70;
    const officeRevenueTotal = revenueBeforeCommission * 0.30;

    const roundToNearestThousand = (value: number) => Math.round(value / 1000) * 1000;

    const driverCommissionRounded = roundToNearestThousand(driverCommissionTotal);
    const officeRevenueRounded = roundToNearestThousand(officeRevenueTotal);

    return { driverCommissionRounded, officeRevenueRounded };
}