
import { createClient } from '@supabase/supabase-js';
import Dexie, { type Table } from 'dexie';
import type { Parcel, Branch, Driver, User, Expense, CashTransaction, Debt, SystemSetting, DeliveryCity, District, Employee, Payslip, ManualDriverCommission, BackupItemDB, ParcelLog, DeliveryManifest, ManifestParcel } from '@/types';


// --- Supabase Client (for online data) ---
// The connection is configured using environment variables.
// Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env.local file.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create a single, reusable Supabase client for the entire application
export const supabase = createClient(supabaseUrl, supabaseAnonKey);


// --- Dexie Client (for offline data) ---
// This remains the same as it handles the in-browser local database for offline capabilities.

export class LocalDatabase extends Dexie {
    parcels!: Table<Parcel>;
    branches!: Table<Branch>;
    drivers!: Table<Driver>;
    users!: Table<User>;
    expenses!: Table<Expense>;
    cashTransactions!: Table<CashTransaction>;
    debts!: Table<Debt>;
    systemSettings!: Table<SystemSetting>;
    deliveryCities!: Table<DeliveryCity>;
    districts!: Table<District>;
    employees!: Table<Employee>;
    payslips!: Table<Payslip>;
    manualCommissions!: Table<ManualDriverCommission>;
    backups!: Table<BackupItemDB>;
    parcelLogs!: Table<ParcelLog>;
    deliveryManifests!: Table<DeliveryManifest>;
    manifestParcels!: Table<ManifestParcel>;
    constructor() {
        super('GlobalTrackDB');
        this.version(5).stores({ // Incremented version for new schema
            parcels: '++ParcelID, TrackingNumber, Status, OriginBranchID, DestinationBranchID, CreatedAt, isSynced',
               branches: '&BranchID, Name, isSynced',
            drivers: '&DriverID, Name, BranchID, isSynced',
            users: '&UserID, &Email, BranchID, isSynced',
            expenses: '++ExpenseID, BranchID, DateSpent, isSynced',
            cashTransactions: '++TransactionID, BranchID, TransactionDate, isSynced',
            debts: '++DebtID, DebtorType, DebtorID, Status, isSynced',
            systemSettings: '&TenantID, isSynced',
            deliveryCities: '&CityID, Name, isSynced',
            districts: '++DistrictID, CityID, isSynced',
            employees: '&EmployeeID, Name, BranchID, isSynced',
            payslips: '&PayslipID, EmployeeID, isSynced',
            manualCommissions: '++CommissionID, DriverID, isSynced',
            backups: '&BackupID',
            parcelLogs: '++ParcelLogID, ParcelID, Timestamp, isSynced',
            deliveryManifests: '&ManifestID, DriverID, Status, isSynced',
            manifestParcels: '[ManifestID+ParcelID], isSynced',

        });
    }
}

export const db = new LocalDatabase();
