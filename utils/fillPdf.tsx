// utils/fillPdf.ts
import { readFile } from 'fs/promises';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import path from 'path';

export async function fillPdf(data: {
    name: string;
    phone: string;
    date: string;
}) {
    const templatePath = path.resolve(process.cwd(), 'templates', 'shipping-label.pdf');
    const existingPdfBytes = await readFile(templatePath);

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const page = pages[0];

    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // ⚠️ حدد المواقع بدقة بناءً على تصميم قالبك
    page.drawText(data.name, {
        x: 100,
        y: 700,
        size: 14,
        font,
        color: rgb(0, 0, 0),
    });

    page.drawText(data.phone, {
        x: 100,
        y: 670,
        size: 14,
        font,
        color: rgb(0, 0, 0),
    });

    page.drawText(data.date, {
        x: 100,
        y: 640,
        size: 14,
        font,
        color: rgb(1, 0, 0), // لون أحمر للتاريخ
    });

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
}
