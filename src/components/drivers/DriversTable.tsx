"use client";

import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit3, Trash2, Save, X } from "lucide-react";
import type { Driver, Branch } from "@/types";
import { updateDriver, deleteDriver } from "@/actions/drivers";
import { Checkbox } from "@/components/ui/checkbox";

interface DriversTableProps {
    drivers: Driver[];
    branches: Branch[];
}

const getBranchName = (branchId: number, branches: Branch[]): string => {
    const branch = branches.find(b => b.BranchID === branchId);
    return branch ? `${branch.Name} ` : `فرع غير معروف (${branchId})`;
};

export function DriversTable({ drivers, branches }: DriversTableProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<Driver>>({});
    const [currentDrivers, setCurrentDrivers] = useState(drivers);

    const startEdit = (driver: Driver) => {
        setEditingId(driver.DriverID);
        setEditData(driver);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditData({});
    };

    const handleChange = (field: keyof Driver, value: any) => {
        setEditData(prev => ({ ...prev, [field]: value }));
    };

    const saveChanges = async () => {
        if (!editingId || !editData.DriverID) return;
        try {
            await updateDriver(editingId, editData);
            setCurrentDrivers(prev =>
                prev.map(d => (d.DriverID === editData.DriverID ? { ...d, ...editData } : d))
            );
            cancelEdit();
        } catch (err) {
            alert("حدث خطأ أثناء حفظ التعديلات.");
            console.error(err);
        }
    };
    const handleDelete = async (driverId: string) => {
        if (!confirm("هل أنت متأكد من حذف هذا السائق؟")) return;
        try {
            await deleteDriver(driverId);
            setCurrentDrivers(prev => prev.filter(d => d.DriverID !== driverId));
        } catch (err) {
            alert("حدث خطأ أثناء حذف السائق.");
            console.error(err);
        }
    };

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader className="bg-primary text-primary-foreground">
                    <TableRow>{/* ✅ تأكد أن <TableRow> هي الطفل المباشر لـ <TableHeader> بدون أي مسافات أو فواصل أسطر */}
                        <TableHead className="text-center text-primary-foreground">اسم السائق</TableHead>
                        <TableHead className="text-center text-primary-foreground">رقم الهاتف</TableHead>
                        <TableHead className="text-center text-primary-foreground">رقم الرخصة</TableHead>
                        <TableHead className="text-center text-primary-foreground">الفرع</TableHead>
                        <TableHead className="text-center text-primary-foreground">الحالة</TableHead>
                        <TableHead className="text-center text-primary-foreground">الإجراءات</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {currentDrivers.map(driver => {
                        const isEditing = editingId === driver.DriverID;
                        return (
                            <TableRow key={driver.DriverID}>
                                <TableCell className="text-center">
                                    {isEditing ? (
                                        <input
                                            value={editData.Name || ""}
                                            onChange={e => handleChange("Name", e.target.value)}
                                            className="input input-bordered w-full"
                                        />
                                    ) : (
                                        driver.Name
                                    )}
                                </TableCell>
                                <TableCell className="text-center">
                                    {isEditing ? (
                                        <input
                                            value={editData.Phone || ""}
                                            onChange={e => handleChange("Phone", e.target.value)}
                                            className="input input-bordered w-full"
                                        />
                                    ) : (
                                        driver.Phone || "-"
                                    )}
                                </TableCell>
                                <TableCell className="text-center">
                                    {isEditing ? (
                                        <input
                                            value={editData.LicenseNumber || ""}
                                            onChange={e => handleChange("LicenseNumber", e.target.value)}
                                            className="input input-bordered w-full"
                                        />
                                    ) : (
                                        driver.LicenseNumber || "-"
                                    )}
                                </TableCell>
                                <TableCell className="text-center">
                                    {isEditing ? (
                                        <select
                                            value={editData.BranchID || driver.BranchID}
                                            onChange={e => handleChange("BranchID", Number(e.target.value))}
                                            className="select select-bordered w-full"
                                        >
                                            {branches.map(branch => (
                                                <option key={branch.BranchID} value={branch.BranchID}>
                                                    {branch.Name} ({branch.City})
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        getBranchName(driver.BranchID, branches)
                                    )}
                                </TableCell>
                                <TableCell className="text-center">
                                    {isEditing ? (
                                        <div className="flex justify-center items-center gap-2">
                                            <Checkbox
                                                id={`isActive-${driver.DriverID}`}
                                                checked={!!editData.IsActive}
                                                onCheckedChange={checked => handleChange("IsActive", checked)}
                                            />
                                            <label
                                                htmlFor={`isActive-${driver.DriverID}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                            >
                                                {editData.IsActive ? "نشط" : "غير نشط"}
                                            </label>
                                        </div>
                                    ) : (
                                        <Badge
                                            variant={driver.IsActive ? "default" : "secondary"}
                                            className={driver.IsActive ? "bg-green-500" : "bg-red-500"}
                                        >
                                            {driver.IsActive ? "نشط" : "غير نشط"}
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-center space-x-1">
                                    {isEditing ? (
                                        <>
                                            <Button size="icon" variant="outline" onClick={saveChanges} title="حفظ">
                                                <Save className="w-4 h-4 text-green-600" />
                                            </Button>
                                            <Button size="icon" variant="outline" onClick={cancelEdit} title="إلغاء">
                                                <X className="w-4 h-4 text-gray-500" />
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button size="icon" variant="ghost" onClick={() => startEdit(driver)} title="تعديل">
                                                <Edit3 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => handleDelete(driver.DriverID)}
                                                title="حذف"
                                            >
                                                <Trash2 className="h-4 w-4 text-red-600" />
                                            </Button>
                                        </>
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
