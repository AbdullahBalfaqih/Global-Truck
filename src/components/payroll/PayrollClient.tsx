"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Employee } from '@/types';
import { getAllEmployees } from "@/actions/employees";
import { createPayslip, getAllPayslips, deletePayslip } from '@/actions/payroll';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Printer, User, CalendarDays, PlusCircle, MinusCircle, FileText } from 'lucide-react';
import { format } from 'date-fns';

const formatCurrencyYER = (value: number | string) => {
    const numberValue = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("ar-YE", {
        style: "currency",
        currency: "YER",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(numberValue);
};

interface PayrollClientProps {
    employees: Employee[];
}

interface PayslipFormData {
    employeeId: string;
    payPeriodStart: string;
    payPeriodEnd: string;
    paymentDate: string;
    baseSalary: number;
    bonuses: number;
    deductions: number;
    notes?: string;
}


export function PayrollClient({ employees }: PayrollClientProps) {
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [formData, setFormData] = useState<Partial<PayslipFormData>>({});
    const [netSalary, setNetSalary] = useState<number | null>(null);
    const [payslips, setPayslips] = useState<any[]>([]);
    const { toast } = useToast();
    const router = useRouter();
    
    useEffect(() => {
        async function fetchPayslips() {
            const result = await getAllPayslips();
            setPayslips(result);
        }
        fetchPayslips();
    }, []);

    useEffect(() => {
        if (selectedEmployeeId) {
            const employee = employees.find(e => e.EmployeeID === selectedEmployeeId);
            setSelectedEmployee(employee || null);
            if (employee) {
                const today = new Date();
                const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

                setFormData({
                    employeeId: employee.EmployeeID,
                    baseSalary: employee.Salary,
                    bonuses: 0,
                    deductions: 0,
                    payPeriodStart: format(firstDayOfMonth, 'yyyy-MM-dd'),
                    payPeriodEnd: format(lastDayOfMonth, 'yyyy-MM-dd'),
                    paymentDate: format(today, 'yyyy-MM-dd'),
                    notes: '',
                });
            }
        } else {
            setSelectedEmployee(null);
            setFormData({});
        }
    }, [selectedEmployeeId, employees]);

    useEffect(() => {
        if (
            typeof formData.baseSalary === 'number' &&
            typeof formData.bonuses === 'number' &&
            typeof formData.deductions === 'number'
        ) {
            setNetSalary(formData.baseSalary + formData.bonuses - formData.deductions);
        } else {
            setNetSalary(null);
        }
    }, [formData.baseSalary, formData.bonuses, formData.deductions]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'bonuses' || name === 'deductions' || name === 'baseSalary' ? parseFloat(value) || 0 : value,
        }));
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleGeneratePayslip = async () => {
        if (!selectedEmployee || !formData.employeeId || formData.baseSalary === undefined) {
            toast({ variant: "destructive", title: "خطأ", description: "الرجاء اختيار موظف وتعبئة بيانات الراتب." });
            return;
        }

        try {
            const newPayslip = {
                PayslipID: `PS${Date.now()}`,
                EmployeeID: selectedEmployee.EmployeeID,
                PayPeriodStart: new Date(formData.payPeriodStart!),
                PayPeriodEnd: new Date(formData.payPeriodEnd!),
                PaymentDate: new Date(formData.paymentDate!),
                BaseSalary: formData.baseSalary!,
                Bonuses: formData.bonuses || 0,
                Deductions: formData.deductions || 0,
                NetSalary: netSalary ?? 0,
                GeneratedByUserID: 1,
                Notes: formData.notes,
                BranchID: selectedEmployee.BranchID, // ✅ أضف هذا السطر
            };

           

            const result = await createPayslip(newPayslip);

            if (result.success) {
                toast({
                    title: "تم إنشاء قسيمة الراتب بنجاح",
                    description: `قسيمة الراتب للموظف ${selectedEmployee.Name} جاهزة للطباعة.`,
                });
                localStorage.setItem('currentPayslipToPrint', JSON.stringify(newPayslip));
                router.push(`/payroll/payslip/${newPayslip.PayslipID}/print`);
            } else {
                toast({
                    variant: "destructive",
                    title: "خطأ",
                    description: result.message,
                });
            }
        } catch (error) {
            console.error("Error creating payslip:", error);
            toast({
                variant: "destructive",
                title: "خطأ في إنشاء قسيمة الراتب",
                description: "حدث خطأ أثناء إنشاء قسيمة الراتب. حاول مرة أخرى.",
            });
        }
    };
    return (
        <div className="space-y-6">
            <Card className="mt-8">
                <CardHeader>
                    <CardTitle><FileText className="inline me-2" />سجل قسائم الرواتب</CardTitle>
                </CardHeader>
                <CardContent>
                    {payslips.length === 0 ? (
                        <p className="text-muted-foreground text-sm">لا توجد قسائم حتى الآن.</p>
                    ) : (
                        <div className="overflow-x-auto">
                                <table className="min-w-full text-sm text-right border border-gray-200 rounded-lg">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="p-2 border">الموظف</th>
                                            <th className="p-2 border">تاريخ الدفع</th>
                                            <th className="p-2 border">الراتب الأساسي</th>
                                            <th className="p-2 border">العلاوات</th>
                                            <th className="p-2 border">الخصومات</th>
                                            <th className="p-2 border">الراتب الصافي</th>
                                            <th className="p-2 border">ملاحظات</th>
                                            <th className="p-2 border">الإجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payslips.map((payslip) => (
                                            <tr key={payslip.PayslipID} className="border-t">
                                                <td className="p-2 border">{payslip.EmployeeName}</td>
                                                <td className="p-2 border">{format(new Date(payslip.PaymentDate), 'yyyy-MM-dd')}</td>
                                                <td className="p-2 border">{formatCurrencyYER(payslip.BaseSalary)}</td>
                                                <td className="p-2 border">{formatCurrencyYER(payslip.Bonuses)}</td>
                                                <td className="p-2 border">{formatCurrencyYER(payslip.Deductions)}</td>
                                                <td className="p-2 border font-semibold text-green-600">{formatCurrencyYER(payslip.NetSalary)}</td>
                                                <td className="p-2 border text-muted-foreground">{payslip.Notes || '-'}</td>
                                                <td className="p-2 border text-center">
                                                    <button
                                                        onClick={async () => {
                                                            const confirmed = confirm("هل أنت متأكد أنك تريد حذف قسيمة الراتب؟");
                                                            if (!confirmed) return;

                                                            try {
                                                                await deletePayslip(payslip.PayslipID);
                                                                toast({
                                                                    title: "تم الحذف",
                                                                    description: "تم حذف قسيمة الراتب بنجاح.",
                                                                });
                                                                // تحديث القائمة بعد الحذف
                                                            } catch (error) {
                                                                toast({
                                                                    title: "حدث خطأ",
                                                                    description: "تعذر حذف قسيمة الراتب.",
                                                                    variant: "destructive",
                                                                });
                                                            }
                                                        }}
                                                        className="text-red-600 hover:underline"
                                                    >
                                                        حذف
                                                    </button>

                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                        </div>
                    )}
                </CardContent>
            </Card>
            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle>معالجة راتب موظف</CardTitle>
                    <CardDescription>اختر موظفًا لمعالجة راتبه وإنشاء قسيمة دفع.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <Label htmlFor="employee-select" className="flex items-center mb-1">
                            <User className="me-2 h-4 w-4 text-primary" /> اختر الموظف
                        </Label>
                        <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                            <SelectTrigger id="employee-select">
                                <SelectValue placeholder="اختر موظفًا" />
                            </SelectTrigger>
                            <SelectContent>
                                {employees.map(emp => (
                                    <SelectItem key={emp.EmployeeID} value={emp.EmployeeID}>{emp.Name} ({emp.JobTitle})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedEmployee && formData.baseSalary !== undefined && (
                        <div className="space-y-4 pt-4 border-t">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">اسم الموظف</p>
                                    <p className="text-lg font-semibold">{selectedEmployee.Name}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">المسمى الوظيفي</p>
                                    <p className="text-lg font-semibold">{selectedEmployee.JobTitle}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">الراتب الأساسي</p>
                                  <p className="text-lg font-semibold">{formatCurrencyYER(selectedEmployee.Salary)}</p>
                                </div>
                            </div>

                            <h3 className="text-md font-semibold pt-2 border-b pb-1">تفاصيل فترة الدفع</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="payPeriodStart" className="flex items-center mb-1"><CalendarDays className="me-2 h-4 w-4 text-primary" /> بداية الفترة</Label>
                                    <Input type="date" id="payPeriodStart" name="payPeriodStart" value={formData.payPeriodStart || ''} onChange={handleDateChange} />
                                </div>
                                <div>
                                    <Label htmlFor="payPeriodEnd" className="flex items-center mb-1"><CalendarDays className="me-2 h-4 w-4 text-primary" /> نهاية الفترة</Label>
                                    <Input type="date" id="payPeriodEnd" name="payPeriodEnd" value={formData.payPeriodEnd || ''} onChange={handleDateChange} />
                                </div>
                                <div>
                                    <Label htmlFor="paymentDate" className="flex items-center mb-1"><CalendarDays className="me-2 h-4 w-4 text-primary" /> تاريخ الدفع</Label>
                                    <Input type="date" id="paymentDate" name="paymentDate" value={formData.paymentDate || ''} onChange={handleDateChange} />
                                </div>
                            </div>

                            <h3 className="text-md font-semibold pt-2 border-b pb-1">العلاوات والخصومات</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="bonuses" className="flex items-center mb-1"><PlusCircle className="me-2 h-4 w-4 text-green-500" /> العلاوات / الإضافات</Label>
                                    <Input type="number" id="bonuses" name="bonuses" value={formData.bonuses || 0} onChange={handleInputChange} placeholder="0.00" />
                                </div>
                                <div>
                                    <Label htmlFor="deductions" className="flex items-center mb-1"><MinusCircle className="me-2 h-4 w-4 text-red-500" /> الخصومات</Label>
                                    <Input type="number" id="deductions" name="deductions" value={formData.deductions || 0} onChange={handleInputChange} placeholder="0.00" />
                                </div>
                            </div>

                            {netSalary !== null && (
                                <div className="pt-4">
                                    <p className="text-lg font-semibold text-muted-foreground">الراتب الصافي المستحق:</p>
                                    <p className="text-3xl font-bold text-primary">
                                        {formatCurrencyYER(netSalary)}
                                    </p>
                                </div>
                            )}

                            <div>
                                <Label htmlFor="notes" className="flex items-center mb-1"><FileText className="me-2 h-4 w-4 text-primary" /> ملاحظات (اختياري)</Label>
                                <Textarea id="notes" name="notes" value={formData.notes || ''} onChange={handleInputChange} placeholder="أي ملاحظات إضافية لقسيمة الراتب" />
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button
                        onClick={handleGeneratePayslip}
                        disabled={!selectedEmployee || formData.baseSalary === undefined}
                    >
                        <Printer className="me-2 h-4 w-4" /> إنشاء وطباعة قسيمة الراتب
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
