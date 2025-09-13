import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
    try {
        const backupFolder = "C:\\Users\\Abdullah\\Downloads\\gar"; // ✅ صيغة صحيحة
        const dbName = "global";
        const dbUser = "sa";
        const dbPassword = "Abdullah123@";
        const serverName = "REDMI8";

        if (!fs.existsSync(backupFolder)) {
            fs.mkdirSync(backupFolder, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const fileName = `backup-${timestamp}.bak`;
        const fullPath = path.join(backupFolder, fileName);

        const sql = `BACKUP DATABASE [${dbName}] TO DISK = N'${fullPath}' WITH NOFORMAT, NOINIT, NAME = N'Full Backup', SKIP, NOREWIND, NOUNLOAD, STATS = 10`;
        const command = `sqlcmd -S ${serverName} -U ${dbUser} -P ${dbPassword} -Q "${sql}"`;

        const { stdout, stderr } = await execAsync(command);

        if (stderr && stderr.trim()) {
            throw new Error(stderr);
        }

        return NextResponse.json({ message: `✅ تم إنشاء النسخة الاحتياطية بنجاح في: ${fullPath}` });
    } catch (error: any) {
        return NextResponse.json({ message: `❌ فشل النسخ الاحتياطي: ${error.message}` }, { status: 500 });
    }
}
