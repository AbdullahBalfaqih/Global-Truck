"use client";

import type { Payslip, Employee } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface PrintablePayslipProps {
    payslip: Payslip;
    employee: Employee;
}

const formatCurrency = (amount: number | null | undefined) => {
    return amount !== null && amount !== undefined
        ? amount.toLocaleString('ar-YE', { style: 'currency', currency: 'YER' })
        : 'غير متوفر';
};


export function PrintablePayslip({ payslip, employee }: PrintablePayslipProps) {
    return (
        <div className="payslip-print-area p-4 print:p-2 bg-white">
            <Card className="print:shadow-none print:border print:border-gray-300">
                <CardHeader className="print:pb-2 text-center">
                    <img src="https://placehold.co/150x50.png?text=GlobalTrack+Logo" alt="شعار الشركة" className="mx-auto mb-4 h-12 print:h-10" data-ai-hint="company logo" />
                    <CardTitle className="text-2xl print:text-xl font-bold">قسيمة راتب</CardTitle>
                    <CardDescription className="print:text-xs">
                        الفترة: {format(new Date(payslip.PayPeriodStart), 'PPP', { locale: arSA })} - {format(new Date(payslip.PayPeriodEnd), 'PPP', { locale: arSA })}
                    </CardDescription>
                </CardHeader>
                <CardContent className="print:pt-2 text-sm print:text-xs">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-4 print:mb-3">
                        <div>
                            <p><strong>معرف الموظف:</strong> {employee.EmployeeID}</p>
                            <p><strong>اسم الموظف:</strong> {employee.Name}</p>
                            <p><strong>المسمى الوظيفي:</strong> {employee.JobTitle}</p>
                        </div>
                        <div className="text-left print:text-right">
                            <p><strong>معرف القسيمة:</strong> {payslip.PayslipID}</p>
                            <p><strong>تاريخ الدفع:</strong> {format(new Date(payslip.PaymentDate), 'PPP', { locale: arSA })}</p>
                            {employee.BranchID && <p><strong>الفرع:</strong> {employee.BranchID}</p>} {/* TODO: Get branch name */}
                        </div>
                    </div>

                    <Separator className="my-3 print:my-2" />

                    <h3 className="font-semibold text-md print:text-sm mb-2">تفاصيل الراتب:</h3>
                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <span>الراتب الأساسي:</span>
                            <span className="font-medium">{formatCurrency(payslip.BaseSalary)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>العلاوات / الإضافات:</span>
                            <span className="font-medium text-green-600">{formatCurrency(payslip.Bonuses)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>الخصومات:</span>
                            <span className="font-medium text-red-600">({formatCurrency(payslip.Deductions)})</span>
                        </div>
                    </div>

                    <Separator className="my-3 print:my-2" />

                    <div className="flex justify-between font-bold text-lg print:text-md mb-4 print:mb-3">
                        <span>الراتب الصافي المستحق:</span>
                        <span>{formatCurrency(payslip.NetSalary)}</span>
                    </div>

                    {payslip.Notes && (
                        <>
                            <Separator className="my-3 print:my-2" />
                            <div>
                                <h4 className="font-semibold print:text-sm">ملاحظات:</h4>
                                <p className="whitespace-pre-wrap text-xs">{payslip.Notes}</p>
                            </div>
                        </>
                    )}

                    <div className="mt-8 print:mt-6 grid grid-cols-2 gap-8 text-xs">
                        <div>
                            <p className="mb-6">توقيع الموظف: _________________________</p>
                            <p>التاريخ: ____ / ____ / ________</p>
                        </div>
                        <div className="text-left print:text-right">
                            <p className="mb-6">توقيع مسؤول الرواتب: _________________________</p>
                            <p>ختم الشركة:</p>
                        </div>
                    </div>
                    <p className="mt-6 text-center text-gray-500 text-xs print:text-[8pt]">
                        هذا المستند تم إنشاؤه بواسطة نظام جلوبال تراك.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}