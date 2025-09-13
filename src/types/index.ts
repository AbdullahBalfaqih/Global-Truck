

 import React from 'react';

// A flag to indicate sync status for offline-capable records
interface Syncable {
  isSynced?: boolean;
}

// تعريف دور المستخدم
export type UserRole = 'Admin' | 'BranchEmployee' | 'Developer';

// Matches Users table
export interface User extends Syncable {
  UserID: number;
  Name: string;
  Email: string;
  Phone?: string | null;
  PasswordHash?: string;
  Role: UserRole;
  BranchID?: number | null;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

// For Debts functionality
export type DebtorType = 'Customer' | 'Driver' | 'Branch';
export type DebtStatus = 'Outstanding' | 'Paid' | 'PendingSettlement';
export type DebtMovementType = 'Debtor' | 'Creditor'; // مدين (له) أو دائن (عليه)
export interface Debt extends Syncable {
    DebtID: number;
    ParcelID: string | null;
    DebtorType: DebtorType;
    DebtorID: string;
    DebtorName: string;
    Amount: number;
    DebtMovementType: DebtMovementType;
    DueDate?: string | null;
    Status: DebtStatus;
    Notes?: string | null;
    CreatedAt: string;
    UpdatedAt: string;
    PaidAt?: string | null;
    PairedDebtID?: number | null;
    OtherPartyBranchName?: string | null;
    InitiatingBranchID?: number | null;
    InitiatorUserID?: number | null;
    InitiatorUserName?: string | null;
    SettledByUserID?: number | null;
    PairedDebt?: { // For eager loading
        DebtID: number;
        DebtorName: string;
        DebtMovementType: DebtMovementType;
    } | null;
}
// Matches Branches table
export interface Branch extends Syncable {
    BranchID: number;
    Name: string;
    City: string;
    Address: string;
    Phone?: string | null;
    GoogleMapsLink?: string | null;
    CreatedAt: string; // DATETIME2 in SQL, ISO string in TS
    UpdatedAt: string; // DATETIME2 in SQL, ISO string in TS
}


// Matches Employees table
export interface Employee extends Syncable {
    EmployeeID: string;
    Name: string;
    JobTitle: string;
    Salary: number;
    BranchID?: number | null;
    ContactPhone?: string | null;
    HireDate?: string | null;
    UserID?: number | null;
    DriverID?: string | null;
    IsActive: boolean;
    CreatedAt: string;
    UpdatedAt: string;
}

// Matches Drivers table
export interface Driver extends Syncable {
    DriverID: string;
    Name: string;
    Phone?: string | null;
    LicenseNumber?: string | null;
    BranchID: number;
    IsActive: boolean;
    CreatedAt: string;
    UpdatedAt: string;
}

// Matches DeliveryCities table
export interface DeliveryCity extends Syncable {
    CityID: number;
    Name: string;
    IsActive: boolean;
    CreatedAt: string;
    UpdatedAt: string;
    Districts?: District[];
}

// Matches Districts table
export interface District extends Syncable {
    DistrictID: number;
    Name: string;
    CityID: number;
    CreatedAt: string;
    UpdatedAt: string;
}

export type ParcelStatus = 'قيد المعالجة' | 'قيد التوصيل' | 'تم التوصيل' | 'ملغى' | 'Pending' | 'InTransit' | 'Delivered' | 'Cancelled' | 'تم التسليم';
export type PaymentType = 'Prepaid' | 'COD' | 'Postpaid';

// Matches Parcels table
export interface Parcel extends Syncable {
  ParcelID: string;
  TrackingNumber: string;
  SenderName: string;
  SenderPhone?: string | null;
  ReceiverName: string;
  ReceiverPhone?: string | null;
  ReceiverCity: string;
  ReceiverDistrict: string;
  OriginBranchID: number;
  DestinationBranchID: number;
  Status: ParcelStatus;
  Notes?: string | null;
  ShippingCost: number;
  ShippingTax?: number | null;
  DriverCommission: number;
  PaymentType: PaymentType;
  IsPaid: boolean;
  IsPickedUpByReceiver: boolean;
  AssignedDriverID?: string | null; 
  CreatedAt: string;
  UpdatedAt: string;
  AddedByUserID?: number;
}


// Matches ParcelLogs table
export interface ParcelLog extends Syncable {
    ParcelLogID: number;
    ParcelID: string;
    Status: ParcelStatus;
    Note?: string | null;
    Timestamp: string;
    UpdatedByUserID?: number | null;
    UpdatedByUserName?: string;
}

// Matches Expenses table
export interface Expense extends Syncable {
    ExpenseID: number;
    Description: string;
    Amount: number;
    DateSpent: string;
    BranchID?: number | null;
    AddedByUserID: number;
    CreatedAt: string;
    AddedByUserName?: string;
}

// Matches DeliveryManifests table
export interface DeliveryManifest extends Syncable {
    ManifestID: string;
    DriverID: string;
    DriverName?: string;
    City: string;
    PrintDate: string;
    Status: 'قيد المعالجة' | 'تم الطباعة' | 'قيد التوصيل' | 'مكتمل' | 'ملغي';
    Parcels: Parcel[];
    CreatedAt: string;
    UpdatedAt: string;
    BranchID?: number;
}


// Conceptual for ManifestParcels
export interface ManifestParcel extends Syncable {
    ManifestID: string;
    ParcelID: string;
}

// Matches Payslips table
export interface Payslip extends Syncable {
    PayslipID: string;
    EmployeeID: string;
    EmployeeName?: string;
    EmployeeJobTitle?: string; // For display on payslip
    EmployeeBranchID?: number | null;
    PayPeriodStart: string;
    PayPeriodEnd: string;
    PaymentDate: string;
    BaseSalary: number;
    Bonuses?: number | null;
    Deductions?: number | null;
    NetSalary: number;
    Notes?: string | null;
    GeneratedByUserID: number;
    GeneratedByUserName?: string;
    CreatedAt?: string;
}
export interface BackupItemDB {
    BackupID: number;
    FileName: string;
    BackupDate: string;
    FileSizeMB?: number | null;
    Status: string;
    Notes?: string | null;
    PerformedByUserID?: number | null;
    PerformedByUserName?: string;
}

// Matches SystemSettings table
export interface SystemSetting extends Syncable {
    TenantID: string;
    SystemName: string;
    LogoURL?: string | null;
    LabelInstructions?: string | null;
    TrackingPrefix?: string | null;
    NextTrackingSequence?: number | null;
    ManifestPrefix?: string | null;
    NextManifestSequence?: number | null;
    DefaultOriginBranchID?: number | null;
    LastUpdatedAt: string;
    UpdatedByUserID?: number | null;
    UpdatedByUserName?: string | null;

}

export interface Stat {
    title: string;
    value: string;
    icon: React.ElementType | string;
    trend?: string;
}

export interface ParcelsByStatusData {
    status: ParcelStatus;
    count: number;
    fill: string;
}

export type AddParcelFormState = {
    message?: string;
    errors?: {
        TrackingNumber?: string[];
        SenderName?: string[];
        SenderPhone?: string[];
        ReceiverName?: string[];
        ReceiverPhone?: string[];
        ReceiverCity?: string[];
        ReceiverDistrict?: string[];
        OriginBranchID?: string[];
        DestinationBranchID?: string[];
        Notes?: string[];
        ShippingCost?: string[];
        ShippingTax?: string[];
        PaymentType?: string[];
        _form?: string[];
      };
    success?: boolean;
    trackingNumber?: string;
} | undefined;


export type DriverLocation = {
    DriverID: string;
    DriverName: string;
    Latitude: number;
    Longitude: number;
    Timestamp: string; // Should be ISO string for consistency
};
export type CashTransactionType = 'Income' | 'Expense';

export interface CashTransaction extends Syncable {
    TransactionID: number;
    TransactionType: CashTransactionType;
    Amount: number;
    Description: string;
    BranchID: number | null;
    TransactionDate: string;
    AddedByUserID: number;
    CreatedAt: string;
    AddedByUserName?: string;
}

export type CashboxFormState = {
    message?: string;
    errors?: { [key: string]: string[] | undefined };
    success?: boolean;
} | undefined;

export type DeliveryCityFormState = {
    success: boolean;
    message: string;
    errors?: {
        Name?: string[];
        IsActive?: string[];
        Districts?: string[];
        _form?: string[];
        [key: string]: string[] | undefined;
    };
} | undefined;

export type ManualDebtFormState = {
    message?: string;
    errors?: {
        DebtorID?: string[];
        Amount?: string[];
        Notes?: string[];
        DebtorType?: string[];
        DebtorName?: string[];
        DebtMovementType?: string[];
        _form?: string[];
    };
    success?: boolean;
} | undefined;
export interface ManualDriverCommission extends Syncable {
    CommissionID?: number;
    DriverID: number;
    Amount: number;
    CommissionDate: string;
    Notes?: string | null;
    AddedByUserID: number;
    CreatedAt?: string;
}

export type ManualCommissionFormState = {
    message?: string;
    errors?: {
        DriverID?: string[];
        Amount?: string[];
        CommissionDate?: string[];
        Notes?: string[];
        _form?: string[];
    };
    success?: boolean;
} | undefined;

export interface BranchForSelect extends Pick<Branch, 'BranchID' | 'Name' | 'City'> { }

export interface DeliveryCityForSelect extends Pick<DeliveryCity, 'CityID' | 'Name' | 'IsActive'> {
    Districts?: Pick<District, 'DistrictID' | 'Name'>[];
}
