import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const {
            TrackingNumber,
            CreatedAt,
            ShippingCost,
            SenderName,
            ReceiverPhone,
            DestinationBranchID,
            OriginBranchID,
        } = req.body;

        const content = fs.readFileSync(path.resolve('./templates/shipping_template.docx'), 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        doc.render({
            TrackingNumber,
            CreatedAt,
            ShippingCost,
            SenderName,
            ReceiverPhone,
            DestinationBranchID,
            OriginBranchID,
        });

        const buf = doc.getZip().generate({ type: 'nodebuffer' });

        res.setHeader('Content-Disposition', `attachment; filename=shipping_${TrackingNumber}.docx`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.send(buf);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate document' });
    }
}
