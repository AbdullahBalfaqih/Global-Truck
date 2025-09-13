// src/app/(authenticated)/drivers/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { AddDriverForm } from "@/components/drivers/AddDriverForm";
import { getAllDrivers, createDriver } from "@/actions/drivers";
import { getAllBranches } from "@/actions/branches";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { Driver, Branch } from "@/types";
// ✅ هنا تم تصحيح سطر الاستيراد ليحتوي على DriverFormValues
import type { DriverFormValues } from "@/components/drivers/AddDriverForm";
import { DriversTable } from "@/components/drivers/DriversTable";

export default function DriversPage() {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [errorLoadingData, setErrorLoadingData] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const [driversData, branchesData] = await Promise.all([
                    getAllDrivers(),
                    getAllBranches()
                ]);
                setDrivers(driversData);
                setBranches(branchesData);
            } catch (error) {
                setErrorLoadingData("حدث خطأ أثناء تحميل البيانات.");
            }
        }
        fetchData();
    }, []);

    // ✅ الآن أصبح نوع DriverFormValues معروفًا
    const handleSubmit = async (formData: DriverFormValues): Promise<void> => {
        const data = new FormData();
        data.append('Name', formData.Name || "");
        data.append('BranchID', formData.BranchID?.toString() || "");
        data.append('IsActive', (formData.IsActive ? "true" : "false"));
        data.append('Phone', formData.Phone || '');
        data.append('LicenseNumber', formData.LicenseNumber || '');

        try {
            await createDriver({}, data); // تمرير FormData
        } catch (error) {
            console.error("Error submitting form:", error);
            setErrorLoadingData("حدث خطأ أثناء إضافة السائق.");
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-4xl font-bold">إدارة السائقين</h1>
            {errorLoadingData ? (
                <Alert variant="destructive">
                    <AlertCircle />
                    <AlertTitle>خطأ في تحميل البيانات</AlertTitle>
                    <AlertDescription>{errorLoadingData}</AlertDescription>
                </Alert>
            ) : (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle>إضافة سائق جديد</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <AddDriverForm branches={branches} onSubmit={handleSubmit} setDrivers={setDrivers} />
                        </CardContent>
                    </Card>
                    <Separator />
                    <Card>
                        <CardHeader>
                            <CardTitle>قائمة السائقين</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {drivers.length > 0 ? (
                                <DriversTable drivers={drivers} branches={branches} />
                            ) : (
                                <p>لا يوجد سائقون لعرضهم.</p>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}