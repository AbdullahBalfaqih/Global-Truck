"use client";

import { useEffect, useState } from "react";
import { PayrollClient } from "@/components/payroll/PayrollClient";
import {
    getAllEmployees,
    createEmployee,
    deleteEmployee,
    updateEmployee,
} from "@/actions/employees";
import { getPayslipDetails } from '@/actions/payroll';
import type { Employee } from '@/types'; // Import the Employee type

export default function PayrollPage() {
    const [employees, setEmployees] = useState<Employee[]>([]); // Specify the type as Employee[]
    const [isLoading, setIsLoading] = useState(true); // State for loading

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const employeeData = await getAllEmployees(); // Call the function to fetch data
                setEmployees(employeeData); // Update state with fetched data
            } catch (error) {
                console.error("Error fetching employees:", error);
            } finally {
                setIsLoading(false); // Set loading to false after fetching
            }
        };

        fetchEmployees(); // Execute the fetch function
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">إدارة الرواتب</h1>
                {/* يمكنك إضافة أزرار إجراءات عامة هنا إذا لزم الأمر */}
            </div>
            {isLoading ? (
                <p>جاري تحميل البيانات...</p> // Loading message
            ) : (
                <PayrollClient
                    employees={employees} // Pass the fetched employees
                />
            )}
        </div>
    );
}