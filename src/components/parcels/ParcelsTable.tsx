"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Parcel, Branch, ParcelStatus } from "@/types";
import { arSA } from "date-fns/locale";
import { FileText, Edit, Trash2 } from "lucide-react";
import { ClientFormattedDate } from "@/components/utils/ClientFormattedDate";
import { deleteParcel } from "@/actions/getparcels"; // استيراد الدالة هنا

interface ParcelsTableProps {
    parcels: Parcel[];
    branches: Branch[];
    onEditClick: (parcel: Parcel) => void;
}

const getBranchName = (branchId: number, branches: Branch[]): string => {
    const branch = branches.find(b => b.BranchID === branchId);
    return branch ? `${branch.Name} ` : `فرع غير معروف (${branchId})`;
};

const getStatusBadgeVariant = (status: ParcelStatus) => {
    switch (status) {
        case 'تم التسليم': return 'default';
        case 'تم التوصيل': return 'destructive';
        case 'قيد التوصيل': return 'secondary';
        case 'قيد المعالجة': return 'outline';
        default: return 'secondary';
    }
};

const getStatusArabicName = (status: ParcelStatus): string => {
    switch (status) {
        case 'قيد المعالجة': return 'قيد الانتظار';
        case 'قيد التوصيل': return 'قيد النقل';
        case 'تم التوصيل': return 'تم التوصيل';
        case 'تم التسليم': return 'تم التسليم';
        default: return status;
    }
};

export function ParcelsTable({ parcels, branches, onEditClick }: ParcelsTableProps) {
    const [selectedBranch, setSelectedBranch] = useState<string>("");
    const [selectedStatus, setSelectedStatus] = useState<string>("");
    const [filteredParcels, setFilteredParcels] = useState<Parcel[]>(parcels);

    useEffect(() => {
        let filtered = parcels;

        if (selectedBranch) {
            filtered = filtered.filter(parcel => parcel.OriginBranchID === parseInt(selectedBranch));
        }
        if (selectedStatus) {
            filtered = filtered.filter(parcel => parcel.Status === selectedStatus);
        }

        setFilteredParcels(filtered);
    }, [selectedBranch, selectedStatus, parcels]);

    const handleDelete = async (parcelID: string) => {
        const confirmed = confirm("هل أنت متأكد أنك تريد حذف هذا الطرد؟");
        if (!confirmed) return;

        try {
            await deleteParcel(parcelID);
            alert("تم حذف الطرد بنجاح.");

            // تحديث حالة الطرود بعد الحذف
            setFilteredParcels(prev => prev.filter(parcel => parcel.ParcelID !== parcelID));
        } catch (error) {
            console.error("Error deleting parcel:", error);
            alert("حدث خطأ أثناء محاولة حذف الطرد.");
        }
    };

    return (
        <Card className="shadow-lg rounded-lg">
            <CardHeader>
                <CardTitle>عرض جميع الطرود</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                <div className="flex justify-between mb-4">
                    <Select onValueChange={setSelectedBranch}>
                        <SelectTrigger>
                            <SelectValue placeholder="اختر فرعاً" />
                        </SelectTrigger>
                        <SelectContent>
                            {branches.map(branch => (
                                <SelectItem key={branch.BranchID} value={branch.BranchID.toString()}>
                                    {branch.Name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select onValueChange={setSelectedStatus}>
                        <SelectTrigger>
                            <SelectValue placeholder="اختر الحالة" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="قيد المعالجة">قيد المعالجة</SelectItem>
                            <SelectItem value="قيد التوصيل">قيد التوصيل</SelectItem>
                            <SelectItem value="تم التوصيل">تم التوصيل</SelectItem>
                            <SelectItem value="تم التسليم">تم التسليم</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {filteredParcels.length === 0 ? (
                    <p className="text-center text-muted-foreground">لا توجد طرود لعرضها حالياً.</p>
                ) : (
                    <Table>
                            <TableHeader className="text-center bg-primary">
                                <TableRow>
                                    <TableHead className="text-center text-white">رقم التتبع</TableHead>
                                    <TableHead className="text-center text-white">المرسل</TableHead>
                                    <TableHead className="text-center text-white">رقم المرسل</TableHead>
                            
                                    <TableHead className="text-center text-white">المستلم</TableHead>
                                    <TableHead className="text-center text-white">رقم المستلم</TableHead>
                                    <TableHead className="text-center text-white">مدينة الاستلام</TableHead>
                                    <TableHead className="text-center text-white">فرع المصدر</TableHead>
                                    <TableHead className="text-center text-white">فرع الوجهة</TableHead>
                                    <TableHead className="text-center text-white">الحالة</TableHead>
                                    <TableHead className="text-center text-white">قيمة الارسال</TableHead>
                                    <TableHead className="text-center text-white">نوع الدفع</TableHead>
                                    <TableHead className="text-center text-white">التامين</TableHead>
                                    <TableHead className="text-center text-white">عمولة السائق</TableHead>
                                  
                                    <TableHead className="text-center text-white">آخر تحديث</TableHead>
                                    <TableHead className="text-center text-white">ملاحظات</TableHead>
                                    <TableHead className="text-center text-white">إجراءات</TableHead>
                                </TableRow>
                            </TableHeader>

                        <TableBody>
                            {filteredParcels.map(parcel => (
                                <TableRow key={parcel.ParcelID}>
                                    <TableCell className="text-center font-medium">{parcel.TrackingNumber}</TableCell>
                                    <TableCell className="text-center">{parcel.SenderName}</TableCell>
                                    <TableCell className="text-center">{parcel.SenderPhone}</TableCell>
                                    <TableCell className="text-center">{parcel.ReceiverName}</TableCell>
                                    <TableCell className="text-center">{parcel.ReceiverPhone}</TableCell>
                                    <TableCell className="text-center">{parcel.ReceiverDistrict}</TableCell>
                                    <TableCell className="text-center">{getBranchName(parcel.OriginBranchID, branches)}</TableCell>
                                    <TableCell className="text-center">{getBranchName(parcel.DestinationBranchID, branches)}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={getStatusBadgeVariant(parcel.Status)}>
                                            {getStatusArabicName(parcel.Status)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">{parcel.ShippingCost}</TableCell>
                                    <TableCell className="text-center">
                                        {parcel.PaymentType === "Prepaid"
                                            ? "مدفوع"
                                            : parcel.PaymentType === "COD"
                                                ? "عند الاستلام"
                                                : "آجل"
                                        }

                                    </TableCell>
                                    <TableCell className="text-center">{parcel.ShippingTax}</TableCell>
                                    <TableCell className="text-center">{parcel.DriverCommission}</TableCell>
                                
                                    <TableCell className="text-center">
                                        <ClientFormattedDate dateString={parcel.CreatedAt} formatString="PPp" locale={arSA} />
                                    </TableCell>
                                   
                                    <TableCell className="text-center max-w-xs truncate">{parcel.Notes || 'لا توجد ملاحظات'}</TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Button asChild variant="ghost" size="sm">
                                                <Link href={`/parcels/label/${parcel.TrackingNumber}`} title="عرض/طباعة الملصق">
                                                    <FileText className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                            <Button variant="ghost" size="icon" title="تعديل الطرد" onClick={() => onEditClick(parcel)}>
                                                <Edit className="h-4 w-4 text-blue-600" />
                                            </Button>
                                            <Button variant="destructive" size="sm" onClick={() => handleDelete(parcel.ParcelID.toString())}>
                                                حذف
                                            </Button>
                                        </div>
                                    </TableCell>

                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}