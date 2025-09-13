"use client";

import React, { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit3, Trash2, Save } from 'lucide-react';
import type { Employee, Branch } from '@/types';
import { ClientFormattedDate } from '@/components/utils/ClientFormattedDate';
import { arSA } from 'date-fns/locale';

interface EmployeesTableProps {
    employees: Employee[];
    branches: Branch[];
    onUpdate: (updatedEmployee: Omit<Employee, "CreatedAt" | "UpdatedAt"> & { EmployeeID: string }) => Promise<void>;
    onDelete: (employee: Employee) => void;
}

const getBranchName = (
    branchId: number | null | undefined,
    branches: Branch[]
): string => {
    if (!branchId) return 'غير محدد';
    const branch = branches.find((b) => b.BranchID === branchId);
    return branch ? `${branch.Name} ` : `فرع غير معروف (${branchId})`;
};

export function EmployeesTable({ employees, branches, onDelete, onUpdate }: EmployeesTableProps) {
    const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
    const [editedData, setEditedData] = useState<Partial<Employee>>({});
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
    const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

    const handleEditClick = (employee: Employee) => {
        setEditingEmployeeId(employee.EmployeeID.toString());
        setEditedData(employee);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditedData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        try {
            if (!editingEmployeeId) return;

            // تحقق من وجود بيانات معدّلة
            if (Object.keys(editedData).length === 0) {
                console.warn("لا توجد تغييرات لحفظها.");
                return;
            }

            // تأكد من أن IsActive دائماً موجود
            const updatedEmployee: Omit<Employee, "CreatedAt" | "UpdatedAt"> & { EmployeeID: string } = {
                ...editedData,
                EmployeeID: editingEmployeeId,
                IsActive: editedData.IsActive ?? true, // اجعل IsActive دائماً موجود
                Name: editedData.Name ?? "", // Ensure Name is not undefined
                JobTitle: editedData.JobTitle ?? "", // Ensure JobTitle is not undefined
                Salary: editedData.Salary ?? 0, // Ensure Salary is defined
            };

            // استدعاء دالة التحديث
            await onUpdate(updatedEmployee);

            // إعادة تعيين الحالة بعد الحفظ
            setEditingEmployeeId(null);
            setEditedData({});
        } catch (error) {
            console.error("حدث خطأ أثناء حفظ التعديلات:", error);
        }
    };

    const handleDeleteClick = (employee: Employee) => {
        setEmployeeToDelete(employee);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (employeeToDelete) {
            onDelete(employeeToDelete);
            setShowDeleteConfirm(false);
            setEmployeeToDelete(null);
        }
    };

    const handleCancelDelete = () => {
        setShowDeleteConfirm(false);
        setEmployeeToDelete(null);
    };

    if (!employees || employees.length === 0) {
        return (
            <p className="text-center text-muted-foreground py-4">
                لا يوجد موظفون لعرضهم حاليًا.
            </p>
        );
    }

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader className="bg-primary text-primary-foreground">
                    <TableRow>
                        <TableHead className="text-center bg-primary text-primary-foreground">معرف الموظف</TableHead>
                        <TableHead className="text-center bg-primary text-primary-foreground">الاسم</TableHead>
                        <TableHead className="text-center bg-primary text-primary-foreground">المسمى الوظيفي</TableHead>
                        <TableHead className="text-center bg-primary text-primary-foreground">الراتب (ريال)</TableHead>
                        <TableHead className="text-center bg-primary text-primary-foreground">الفرع</TableHead>
                        <TableHead className="text-center bg-primary text-primary-foreground">رقم الاتصال</TableHead>
                        <TableHead className="text-center bg-primary text-primary-foreground">تاريخ التعيين</TableHead>
                        <TableHead className="text-center bg-primary text-primary-foreground">إجراءات</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {employees.map((employee) => {
                        const isEditing = editingEmployeeId === employee.EmployeeID.toString();

                        return (
                            <TableRow key={employee.EmployeeID}>
                                <TableCell className="font-mono text-center">{employee.EmployeeID}</TableCell>

                                <TableCell className="text-center">
                                    {isEditing ? (
                                        <Input
                                            name="Name"
                                            value={editedData.Name || ''}
                                            onChange={handleChange}
                                        />
                                    ) : (
                                        employee.Name
                                    )}
                                </TableCell>

                                <TableCell className="text-center">
                                    {isEditing ? (
                                        <Input
                                            name="JobTitle"
                                            value={editedData.JobTitle || ''}
                                            onChange={handleChange}
                                        />
                                    ) : (
                                        employee.JobTitle
                                    )}
                                </TableCell>

                                <TableCell className="text-center">
                                    {isEditing ? (
                                        <Input
                                            name="Salary"
                                            type="number"
                                            value={editedData.Salary?.toString() || ''}
                                            onChange={handleChange}
                                        />
                                    ) : (
                                        employee.Salary.toLocaleString('ar-SA', {
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 0,
                                        })
                                    )}
                                </TableCell>

                                <TableCell className="text-center">
                                    {getBranchName(employee.BranchID, branches)}
                                </TableCell>

                                <TableCell className="text-center">
                                    {isEditing ? (
                                        <Input
                                            name="ContactPhone"
                                            value={editedData.ContactPhone || ''}
                                            onChange={handleChange}
                                        />
                                    ) : (
                                        employee.ContactPhone || '-'
                                    )}
                                </TableCell>

                                <TableCell className="text-center">
                                    {employee.HireDate ? (
                                        <ClientFormattedDate
                                            dateString={employee.HireDate}
                                            formatString="P"
                                            locale={arSA}
                                        />
                                    ) : (
                                        '-'
                                    )}
                                </TableCell>

                                <TableCell className="text-center space-x-2">
                                    {isEditing ? (
                                        <Button variant="default" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSave}>
                                            <Save className="h-4 w-4 me-1" /> حفظ
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            title="تعديل"
                                            onClick={() => handleEditClick(employee)}
                                        >
                                            <Edit3 className="h-4 w-4 me-1" /> تعديل
                                        </Button>
                                    )}

                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        title="حذف"
                                        onClick={() => handleDeleteClick(employee)}
                                    >
                                        <Trash2 className="h-4 w-4 me-1" /> حذف
                                    </Button>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>

            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-bold text-center">تأكيد الحذف</h3>
                        <p className="text-center text-muted-foreground mt-2">
                            هل أنت متأكد أنك تريد حذف الموظف {employeeToDelete?.Name}؟
                        </p>
                        <div className="flex justify-center space-x-4 mt-4">
                            <Button variant="destructive" onClick={handleConfirmDelete}>حذف</Button>
                            <Button variant="outline" onClick={handleCancelDelete}>إلغاء</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
