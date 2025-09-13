
"use server";

import { z } from "zod";
import { format } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { supabase } from "@/lib/db";
import { getSession } from "@/actions/auth";
import type { BackupItemDB } from "@/types";

// This file is now for managing backup HISTORY metadata and EXPORTING data from Supabase.
// The actual server-side backup/restore functionality provided by SQL Server is replaced
// by client-side downloadable data dumps from Supabase.

type BackupActionResult = {
    success: boolean;
    message: string;
    backupRecord?: BackupItemDB;
};

// This function now only logs that a backup event was performed by the user.
// The actual data export is handled by getFullDatabaseData and triggered on the client.
export async function logBackupEvent(fileName: string, notes: string): Promise<BackupActionResult> {
    const session = await getSession();
    // @ts-ignore
    if (!session || (session.role !== 'Admin' && session.role !== 'Developer')) {
        return { success: false, message: "غير مصرح لك بالقيام بهذا الإجراء." };
    }

    try {
        const { error } = await supabase.from('DatabaseBackups').insert({
            FileName: fileName,
            Status: 'Completed',
            Notes: notes,
            PerformedByUserID: session.userId,
        });

        if (error) throw error;

        revalidatePath('/database-backup');

        return {
            success: true,
            message: `تم تسجيل حدث النسخ الاحتياطي بنجاح: ${fileName}`,
        };

    } catch (error: any) {
        console.error("❌ Database backup logging error:", error);
        return { success: false, message: `فشل تسجيل النسخة الاحتياطية: ${error.message}` };
    }
}


export async function getBackupHistory(): Promise<BackupItemDB[]> {
    try {
        const { data, error } = await supabase
            .from('DatabaseBackups')
            .select(`
                BackupID, FileName, BackupDate, FileSizeMB, Status, Notes,
                Users ( Name )
            `)
            .order('BackupDate', { ascending: false });

        if (error) throw error;

        // @ts-ignore
        return data.map(item => ({
            ...item,
            // @ts-ignore
            PerformedByUserName: item.Users?.Name || 'غير معروف'
        })) as BackupItemDB[];
    } catch (error: any) {
        console.error("Database error fetching backup history:", error);
        if (error.message.includes("relation \"DatabaseBackups\" does not exist")) {
            console.error("======> The 'DatabaseBackups' table does not exist. Please create it to see backup history. <=======");
        }
        return [];
    }
}

// NOTE: Full database restore is a highly sensitive operation and is NOT exposed as a server action.
// It should be done manually via the Supabase dashboard from a backup file for safety.
// This function is left as a placeholder to show the concept but is not used.
export async function performRestoreAction(backupFileName: string): Promise<BackupActionResult> {
    return { success: false, message: "الاستعادة المباشرة من الخادم غير مدعومة. يرجى استخدام واجهة Supabase." };
}

// New function to get all data from specified tables for client-side backup
export async function getFullDatabaseData(): Promise<{ success: boolean; data?: Record<string, any[]>; message?: string }> {
    const session = await getSession();
    // @ts-ignore
    if (!session || (session.role !== 'Admin' && session.role !== 'Developer')) {
        return { success: false, message: "غير مصرح لك بالقيام بهذا الإجراء." };
    }

    const tablesToBackup = [
        'Branches', 'Users', 'Drivers', 'DeliveryCities', 'Districts', 'Parcels',
        'ParcelLogs', 'Expenses', 'CashTransactions', 'Debts', 'Employees', 'Payslips',
        'SystemSettings', 'DatabaseBackups', 'ManifestParcels', 'DeliveryManifests'
    ];

    try {
        const backupData: Record<string, any[]> = {};
        for (const tableName of tablesToBackup) {
            const { data, error } = await supabase.from(tableName).select('*');
            if (error) {
                // Log a warning but continue with other tables
                console.warn(`Could not back up table ${tableName}:`, error.message);
            } else {
                backupData[tableName] = data;
            }
        }
        return { success: true, data: backupData };
    } catch (error: any) {
        console.error("Error fetching full database data:", error);
        return { success: false, message: `فشل جلب بيانات قاعدة البيانات: ${error.message}` };
    }
}


// NEW: Function to sync local data to Supabase
export async function syncLocalData(localData: Record<string, any[]>): Promise<{ success: boolean; message: string; details?: any[] }> {
    const session = await getSession();
    if (!session) {
        return { success: false, message: "غير مصرح لك. يجب تسجيل الدخول." };
    }

    const errors: any[] = [];
    const tableSyncOrder = [
        'Branches', 'Users', 'Drivers', 'DeliveryCities', 'Districts', 'Parcels',
        'ParcelLogs', 'Expenses', 'CashTransactions', 'Debts', 'Employees', 'Payslips',
        'SystemSettings', 'DeliveryManifests', 'ManifestParcels'
    ];

    console.log("Starting sync process on server for tables:", Object.keys(localData));

    for (const tableName of tableSyncOrder) {
        if (localData[tableName] && localData[tableName].length > 0) {
            console.log(`Syncing ${localData[tableName].length} items for table: ${tableName}`);

            // Remove the isSynced flag before sending to Supabase
            const dataToSync = localData[tableName].map(item => {
                const { isSynced, ...rest } = item;
                return rest;
            });

            // Determine the primary key for the current table to use in onConflict
            // This is a simplified approach. A more robust solution might use a schema definition.
            const primaryKey = ['BranchID', 'UserID', 'DriverID', 'CityID', 'DistrictID', 'ParcelID', 'ExpenseID', 'TransactionID', 'DebtID', 'EmployeeID', 'PayslipID', 'ManifestID', 'BackupID', 'ParcelLogID'].find(pk => pk in dataToSync[0]);

            if (!primaryKey) {
                console.error(`No primary key found for table ${tableName}. Skipping upsert.`);
                errors.push({ table: tableName, message: "No primary key could be determined for upsert." });
                continue;
            }

            const { error } = await supabase.from(tableName).upsert(dataToSync, {
                onConflict: primaryKey,
            });

            if (error) {
                console.error(`Error syncing table ${tableName}:`, error);
                errors.push({ table: tableName, message: error.message, details: error.details });
            } else {
                console.log(`Successfully synced table: ${tableName}`);
            }
        }
    }

    if (errors.length > 0) {
        return { success: false, message: "حدثت أخطاء أثناء مزامنة بعض البيانات. راجع الكونسول لمزيد من التفاصيل.", details: errors };
    }

    revalidatePath('/', 'layout'); // Revalidate all paths to reflect changes
    return { success: true, message: "تمت مزامنة البيانات المحلية مع السيرفر بنجاح." };
}
