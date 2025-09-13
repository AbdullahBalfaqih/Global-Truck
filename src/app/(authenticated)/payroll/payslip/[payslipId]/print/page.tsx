"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PrintablePayslip } from '@/components/payroll/PrintablePayslip';
import { getAllEmployees } from "@/actions/employees";
import { getPayslipDetails } from '@/actions/payroll';
import type { Payslip, Employee } from '@/types';
import { ArrowRight, Printer as PrinterIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PrintPayslipPage() {
    const params = useParams();
    const router = useRouter();
    const payslipId = params.payslipId as string;
    const [payslip, setPayslip] = useState<Payslip | null>(null);
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const triggerPrint = useCallback(() => {
        setTimeout(() => {
            window.print();
        }, 500);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (payslipId) {
                setIsLoading(true);
                let foundPayslip: Payslip | null = null;

                try {
                    const storedPayslipData = localStorage.getItem('currentPayslipToPrint');
                    if (storedPayslipData) {
                        const parsedPayslip = JSON.parse(storedPayslipData) as Payslip;
                        if (parsedPayslip.PayslipID === payslipId) {
                            foundPayslip = parsedPayslip;
                        }
                    }

                    if (!foundPayslip) {
                        foundPayslip = await getPayslipDetails(payslipId);
                    }

                    if (foundPayslip) {
                        setPayslip(foundPayslip);
                        const employees = await getAllEmployees();
                        const foundEmployee = employees.find(e => e.EmployeeID === foundPayslip!.EmployeeID);
                        setEmployee(foundEmployee || null);
                    

                    } else {
                        toast({
                            variant: "destructive",
                            title: "خطأ",
                            description: `لم يتم العثور على قسيمة راتب بالمعرف: ${payslipId}`,
                        });
                    }
                } catch (error) {
                    console.error("Error retrieving payslip or employees:", error);
                    toast({
                        variant: "destructive",
                        title: "خطأ",
                        description: "حدث خطأ أثناء استرجاع البيانات.",
                    });
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchData();
    }, [payslipId, toast]);

    useEffect(() => {
        if (payslip && !isLoading) {
            triggerPrint();
        }
    }, [payslip, isLoading, triggerPrint]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
                <p>جاري تحميل قسيمة الراتب للطباعة...</p>
            </div>
        );
    }

    if (!payslip || !employee) {
        return (
            <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)] text-center p-4">
                <h1 className="text-xl font-semibold mb-2">لم يتم العثور على قسيمة الراتب</h1>
                <p>عذرًا، لم نتمكن من العثور على بيانات قسيمة الراتب أو الموظف.</p>
                <Button onClick={() => router.back()} className="mt-4 print:hidden">
                    <ArrowRight className="me-2 h-4 w-4" />
                    العودة
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 print:py-0 print:mx-0 print:container-none">
            <div className="flex justify-between items-center mb-6 print:hidden">
                <h1 className="text-2xl font-bold">معاينة طباعة قسيمة الراتب</h1>
                <div className="flex gap-2">
                    <Button onClick={triggerPrint} variant="default">
                        <PrinterIcon className="me-2 h-4 w-4" />
                        طباعة مرة أخرى
                    </Button>
                    <Button onClick={() => router.back()} variant="outline">
                        <ArrowRight className="me-2 h-4 w-4" />
                        العودة إلى الرواتب
                    </Button>
                </div>
            </div>
            <PrintablePayslip payslip={payslip} employee={employee} />
        </div>
    );
}