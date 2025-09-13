
"use server";

import { z } from "zod";
import sql from 'mssql';
import dotenv from 'dotenv';
import type { Payslip, Employee } from '@/types';
import { format } from 'date-fns';
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

dotenv.config();

const dbConfig: sql.config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER as string,
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    requestTimeout: 15000
};

// Schema for creating a payslip
const CreatePayslipSchema = z.object({
    PayslipID: z.string().min(1, "معرف قسيمة الراتب مطلوب.").max(50),
    EmployeeID: z.string().min(1, "معرف الموظف مطلوب.").max(50),
    BranchID: z.coerce.number().int().positive().optional().nullable(),
    PayPeriodStart: z.date({ coerce: true, required_error: "تاريخ بداية الفترة مطلوب." }),
    PayPeriodEnd: z.date({ coerce: true, required_error: "تاريخ نهاية الفترة مطلوب." }),
    PaymentDate: z.date({ coerce: true, required_error: "تاريخ الدفع مطلوب." }),
    BaseSalary: z.coerce.number().nonnegative("الراتب الأساسي يجب أن يكون رقمًا غير سالب."),
    Bonuses: z.coerce.number().nonnegative("العلاوات يجب أن تكون رقمًا غير سالب.").optional().default(0),
    Deductions: z.coerce.number().nonnegative("الخصومات يجب أن تكون رقمًا غير سالب.").optional().default(0),
    NetSalary: z.coerce.number().nonnegative("الراتب الصافي يجب أن يكون رقمًا غير سالب."),
    Notes: z.string().max(500, "الملاحظات طويلة جدًا.").optional().nullable(),
});

type PayslipFormState = {
    message?: string;
    errors?: { [key: string]: string[] | undefined };
    success?: boolean;
    payslip?: Payslip;
};

export async function createPayslip(
 
    payslipData: z.infer<typeof CreatePayslipSchema>
): Promise<PayslipFormState> {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || !session.user || !session.user.id) {
        return { success: false, message: "غير مصرح لك. يجب تسجيل الدخول." };
    }
    // @ts-ignore
    const currentUserID = parseInt(session.user.id, 10);

    const validatedFields = CreatePayslipSchema.safeParse(payslipData);
    if (!validatedFields.success) {
        return { success: false, message: "مدخلات قسيمة الراتب غير صالحة.", errors: validatedFields.error.flatten().fieldErrors };
    }

    const {
        PayslipID, EmployeeID, PayPeriodStart, PayPeriodEnd, PaymentDate,
        BaseSalary, Bonuses, Deductions, NetSalary, Notes, BranchID
    } = validatedFields.data;

    let pool: sql.ConnectionPool | null = null;
    let transaction: sql.Transaction | null = null;

    try {
        pool = await sql.connect(dbConfig);
        transaction = pool.transaction();
        await transaction.begin();

        // 1. Check if PayslipID already exists
        const checkRequest = new sql.Request(transaction);
        checkRequest.input('PayslipIDCheck', sql.NVarChar(50), PayslipID);
        const checkResult = await checkRequest.query('SELECT PayslipID FROM Payslips WHERE PayslipID = @PayslipIDCheck');
        if (checkResult.recordset.length > 0) {
            await transaction.rollback();
            return { success: false, message: `معرف قسيمة الراتب '${PayslipID}' موجود بالفعل.` };
        }

        // 2. Insert into Payslips table
        const payslipRequest = new sql.Request(transaction);
        payslipRequest.input('PayslipID', sql.NVarChar(50), PayslipID);
        payslipRequest.input('EmployeeID', sql.NVarChar(50), EmployeeID);
        payslipRequest.input('PayPeriodStart', sql.Date, format(PayPeriodStart, 'yyyy-MM-dd'));
        payslipRequest.input('PayPeriodEnd', sql.Date, format(PayPeriodEnd, 'yyyy-MM-dd'));
        payslipRequest.input('PaymentDate', sql.Date, format(PaymentDate, 'yyyy-MM-dd'));
        payslipRequest.input('BaseSalary', sql.Decimal(12, 2), BaseSalary);
        payslipRequest.input('Bonuses', sql.Decimal(12, 2), Bonuses);
        payslipRequest.input('Deductions', sql.Decimal(12, 2), Deductions);
        payslipRequest.input('NetSalary', sql.Decimal(12, 2), NetSalary);
        payslipRequest.input('Notes', sql.NVarChar(sql.MAX), Notes);
        payslipRequest.input('GeneratedByUserID', sql.Int, currentUserID);

        await payslipRequest.query(`
      INSERT INTO Payslips (
        PayslipID, EmployeeID, PayPeriodStart, PayPeriodEnd, PaymentDate, 
        BaseSalary, Bonuses, Deductions, NetSalary, Notes, GeneratedByUserID
      ) VALUES (
        @PayslipID, @EmployeeID, @PayPeriodStart, @PayPeriodEnd, @PaymentDate, 
        @BaseSalary, @Bonuses, @Deductions, @NetSalary, @Notes, @GeneratedByUserID
      )
    `);

        // 3. Insert into CashTransactions and Expenses tables for the EMPLOYEE'S branch
        const expenseDescription = `راتب الموظف: ${EmployeeID} للفترة من ${format(PayPeriodStart, 'yyyy-MM-dd')} إلى ${format(PayPeriodEnd, 'yyyy-MM-dd')}`;

        // a. Insert into Expenses
        const expenseRequest = new sql.Request(transaction);
        expenseRequest.input('ExpDesc', sql.NVarChar(200), expenseDescription);
        expenseRequest.input('ExpAmount', sql.Decimal(10, 2), NetSalary);
        expenseRequest.input('ExpDate', sql.Date, format(PaymentDate, 'yyyy-MM-dd'));
        expenseRequest.input('ExpBranchID', sql.Int, BranchID);
        expenseRequest.input('ExpAddedBy', sql.Int, currentUserID);
        await expenseRequest.query(`
      INSERT INTO Expenses (Description, Amount, DateSpent, BranchID, AddedByUserID)
      VALUES (@ExpDesc, @ExpAmount, @ExpDate, @ExpBranchID, @ExpAddedBy)
    `);

        // b. Insert into CashTransactions
        const cashboxRequest = new sql.Request(transaction);
        cashboxRequest.input('CT_Type', sql.NVarChar(20), 'Expense');
        cashboxRequest.input('CT_Amount', sql.Decimal(12, 2), NetSalary);
        cashboxRequest.input('CT_Desc', sql.NVarChar(255), `مصروف راتب: ${EmployeeID}`);
        cashboxRequest.input('CT_BranchID', sql.Int, BranchID);
        cashboxRequest.input('CT_Date', sql.Date, format(PaymentDate, 'yyyy-MM-dd'));
        cashboxRequest.input('CT_AddedBy', sql.Int, currentUserID);

        await cashboxRequest.query(`
      INSERT INTO CashTransactions (TransactionType, Amount, Description, BranchID, TransactionDate, AddedByUserID)
      VALUES (@CT_Type, @CT_Amount, @CT_Desc, @CT_BranchID, @CT_Date, @CT_AddedBy)
    `);

        await transaction.commit();
        revalidatePath("/payroll");
        revalidatePath("/cashbox");
        revalidatePath("/expenses");

        // Optionally fetch the created payslip to return
        const createdPayslip = await getPayslipDetails(PayslipID, pool);

        return { success: true, message: `تم إنشاء قسيمة الراتب ${PayslipID} بنجاح.`, payslip: createdPayslip || undefined };

    } catch (error: any) {
        if (transaction) await transaction.rollback();
        let errorMessage = "فشل إنشاء قسيمة الراتب. الرجاء المحاولة مرة أخرى.";
        if (error?.message?.toLowerCase().includes('failed to connect') || error.message.includes('config.server')) {
            errorMessage = `خطأ في الاتصال بقاعدة البيانات: ${error.message}`;
        } else if (error.message.includes('FOREIGN KEY constraint')) {
            errorMessage = `خطأ في البيانات المرجعية: الموظف أو المستخدم المُنشئ غير موجود.`;
        } else if (error.message && error.message.includes('Violation of PRIMARY KEY constraint')) {
            errorMessage = `معرف قسيمة الراتب '${PayslipID}' موجود بالفعل.`;
        } else {
            errorMessage = `خطأ في قاعدة البيانات: ${error.message}`;
        }
        return { success: false, message: errorMessage };
    } finally {
        if (pool) {
            try {
                await pool.close();
            } catch (err) {
                console.error("Error closing database connection for payslip creation:", err);
            }
        }
    }
}


export async function getPayslipDetails(payslipId: string, existingPool?: sql.ConnectionPool): Promise<Payslip | null> {
    console.log(`getPayslipDetails Action: Fetching payslip ${payslipId}`);
    let poolToUse: sql.ConnectionPool | null = existingPool || null;
    let closePoolAfter = false;

    try {
        if (!poolToUse) {
            if (!process.env.DB_SERVER) {
                console.error("DB_SERVER is not defined.");
                return null;
            }
            poolToUse = await sql.connect(dbConfig);
            closePoolAfter = true;
        }

        const request = poolToUse.request();
        request.input('PayslipIDParam', sql.NVarChar(50), payslipId);

        const result = await request.query(`
      SELECT 
        ps.*, 
        e.Name AS EmployeeName, 
        e.JobTitle AS EmployeeJobTitle, 
        e.BranchID AS EmployeeBranchID
      FROM Payslips ps
      JOIN Employees e ON ps.EmployeeID = e.EmployeeID
      WHERE ps.PayslipID = @PayslipIDParam
    `);

        if (result.recordset.length > 0) {
            console.log(`getPayslipDetails Action: Fetched payslip ${payslipId}.`);
            return result.recordset[0] as Payslip;
        }
        console.log(`getPayslipDetails Action: Payslip ${payslipId} not found.`);
        return null;
    } catch (error: any) {
        console.error(`Database error fetching payslip ${payslipId}. Full error object:`, error);
        return null;
    } finally {
        if (poolToUse && closePoolAfter) {
            await poolToUse.close();
        }
    }
}

export async function getAllPayslips(): Promise<Payslip[]> {
    if (!process.env.DB_SERVER || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) return [];
    let pool: sql.ConnectionPool | null = null;
    try {
        pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
      SELECT ps.*, e.Name AS EmployeeName, e.JobTitle AS EmployeeJobTitle, e.BranchID AS EmployeeBranchID
      FROM Payslips ps
      JOIN Employees e ON ps.EmployeeID = e.EmployeeID
      ORDER BY ps.PaymentDate DESC
    `);
        return result.recordset as Payslip[];
    } catch (error) {
        console.error("Database error fetching all payslips:", error);
        return [];
    } finally {
        if (pool) await pool.close();
    }
}

 

export async function deletePayslip(payslipId: string): Promise<PayslipFormState> {
    if (!process.env.DB_SERVER || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
        return { success: false, message: "خطأ في إعدادات الاتصال بقاعدة البيانات." };
    }
    let pool: sql.ConnectionPool | null = null;
    try {
        pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('PayslipIDParam', sql.NVarChar(50), payslipId)
            .query(`DELETE FROM Payslips WHERE PayslipID = @PayslipIDParam`);

        if (result.rowsAffected[0] === 0) {
            return { success: false, message: `قسيمة الراتب ذات المعرف '${payslipId}' غير موجودة.` };
        }
        return { success: true, message: `تم حذف قسيمة الراتب '${payslipId}' بنجاح.` };
    } catch (error: any) {
        return { success: false, message: `حدث خطأ أثناء حذف قسيمة الراتب: ${error.message}` };
    } finally {
        if (pool) await pool.close();
    }
}
