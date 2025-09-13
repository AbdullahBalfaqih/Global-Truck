"use client";

import { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { EmployeesTable } from "@/components/employees/EmployeesTable";
import { AddEmployeeForm } from "@/components/employees/AddEmployeeForm";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

import type { Employee, Branch } from "@/types";
import {
    getAllEmployees,
    createEmployee,
    deleteEmployee,
    updateEmployee,
} from "@/actions/employees";
import { getAllBranches } from "@/actions/branches";

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const { toast } = useToast();

    // جلب الفروع والموظفين
    useEffect(() => {
        const fetchData = async () => {
            const fetchedBranches = await getAllBranches();
            setBranches(fetchedBranches);

            const fetchedEmployees = await getAllEmployees();
            setEmployees(fetchedEmployees);
        };

        fetchData();
    }, []);

    // عند إضافة موظف جديد
    const handleAddEmployee = async (newEmployeeData: Omit<Employee, "EmployeeID" | "CreatedAt" | "UpdatedAt"> & { IsActive: boolean }) => {
        const formData = new FormData();
        formData.append("Name", newEmployeeData.Name || ""); // Provide default value
        formData.append("JobTitle", newEmployeeData.JobTitle || ""); // Provide default value
        formData.append("Salary", (newEmployeeData.Salary ?? 0).toString()); // Ensure Salary is defined

        if (newEmployeeData.ContactPhone) {
            formData.append("ContactPhone", newEmployeeData.ContactPhone);
        }

        if (newEmployeeData.BranchID !== undefined && newEmployeeData.BranchID !== null) {
            formData.append("BranchID", newEmployeeData.BranchID.toString());
        }

        if (newEmployeeData.HireDate) {
            formData.append("HireDate", new Date(newEmployeeData.HireDate).toString());
        }

        formData.append("IsActive", newEmployeeData.IsActive ? "on" : "off"); // Ensure IsActive is set

        const result = await createEmployee({}, formData);

        if (result.success) {
            setEmployees((prev) => [
                {
                    EmployeeID: Date.now().toString(), // مؤقت حتى يتم إعادة الجلب من قاعدة البيانات
                    ...newEmployeeData,
                    CreatedAt: new Date().toString(),
                    UpdatedAt: new Date().toString(),
                } as Employee,
                ...prev,
            ]);
            toast({
                title: "تمت إضافة الموظف بنجاح!",
                description: `تمت إضافة ${newEmployeeData.Name} إلى النظام.`,
            });
        } else {
            toast({
                title: "فشل في إضافة الموظف",
                description: result.message || "حدث خطأ أثناء الإضافة.",
                variant: "destructive",
            });
        }
    };

    // عند حذف موظف
    const handleDeleteEmployee = async (employee: Employee) => {
        const result = await deleteEmployee(employee.EmployeeID.toString());

        if (result.success) {
            setEmployees((prev) => prev.filter(emp => emp.EmployeeID !== employee.EmployeeID)); // تحديث قائمة الموظفين
            toast({
                title: "تم الحذف بنجاح",
                description: `تم حذف الموظف ${employee.Name}`,
            });
        } else {
            toast({
                title: "فشل الحذف",
                description: result.message || "حدث خطأ أثناء الحذف.",
                variant: "destructive",
            });
        }
    };

    // عند تعديل موظف
    const handleUpdateEmployee = async (
        updatedEmployee: Omit<Employee, "CreatedAt" | "UpdatedAt">
    ) => {
        const formData = new FormData();
        formData.append("Name", updatedEmployee.Name || ""); // Provide default value
        formData.append("JobTitle", updatedEmployee.JobTitle || ""); // Provide default value
        formData.append("Salary", (updatedEmployee.Salary ?? 0).toString()); // Ensure Salary is defined

        if (updatedEmployee.ContactPhone) {
            formData.append("ContactPhone", updatedEmployee.ContactPhone);
        }

        if (updatedEmployee.BranchID !== undefined && updatedEmployee.BranchID !== null) {
            formData.append("BranchID", updatedEmployee.BranchID.toString());
        }

        if (updatedEmployee.HireDate) {
            formData.append("HireDate", new Date(updatedEmployee.HireDate).toString());
        }

        formData.append("IsActive", updatedEmployee.IsActive ? "on" : "off"); // Ensure IsActive is set

        const result = await updateEmployee(
            updatedEmployee.EmployeeID.toString(),
            {
                ...updatedEmployee,
                IsActive: updatedEmployee.IsActive ?? true, // Ensure IsActive has a default value
            }
        );

        if (result.success) {
            toast({
                title: "تم التحديث بنجاح",
                description: `تم تحديث بيانات ${updatedEmployee.Name}.`,
            });
        } else {
            toast({
                title: "فشل في التحديث",
                description: result.message || "حدث خطأ أثناء التحديث.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
                إدارة الموظفين
            </h1>
            <p className="text-muted-foreground">
                إدارة بيانات الموظفين، بما في ذلك المسميات الوظيفية والرواتب والبيانات الأخرى ذات الصلة.
            </p>

            {/* نموذج إضافة موظف جديد */}
            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle>إضافة موظف جديد</CardTitle>
                    <CardDescription>أدخل بيانات الموظف الجديد.</CardDescription>
                </CardHeader>
                <CardContent>
                    <AddEmployeeForm branches={branches} onSubmit={handleAddEmployee} />
                </CardContent>
            </Card>

            <Separator />

            {/* جدول عرض الموظفين */}
            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle>قائمة الموظفين</CardTitle>
                    <CardDescription>
                        قائمة بجميع الموظفين المسجلين في النظام.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <EmployeesTable
                        employees={employees}
                        branches={branches}
                        onUpdate={handleUpdateEmployee}
                        onDelete={handleDeleteEmployee}
                    />
                </CardContent>
            </Card>
        </div>
    );
}