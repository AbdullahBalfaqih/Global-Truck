import { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    const { backupId } = req.body;
    const filePath = `C:\\Backups\\${backupId}.bak`;

    const command = `sqlcmd -S .\\SQLEXPRESS -Q "RESTORE DATABASE [global] FROM DISK='${filePath}' WITH REPLACE"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ message: stderr || 'فشل الاستعادة' });
        }
        return res.status(200).json({ message: 'تمت الاستعادة بنجاح' });
    });
}
