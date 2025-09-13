"use client";

import React, { useState } from "react";
import {
    Table,
    TableHeader,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Edit3, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import type { DeliveryCity } from "@/types";

interface Props {
    cities: DeliveryCity[];
    onDelete: (id: number) => void;
    onToggleActive: (city: DeliveryCity) => void;
    onEdit: (city: DeliveryCity) => void;
}

export function DeliveryCitiesTable({
    cities,
    onDelete,
    onToggleActive,
    onEdit,
}: Props) {
    // حالة لمربع الحوار: هل هو مفتوح ومعرف المدينة المراد حذفها
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [cityToDeleteId, setCityToDeleteId] = useState<number | null>(null);

    // دالة لفتح مربع الحوار
    const openDeleteDialog = (cityId: number) => {
        setCityToDeleteId(cityId);
        setIsDeleteDialogOpen(true);
    };

    // دالة لتأكيد الحذف
    const confirmDelete = () => {
        if (cityToDeleteId !== null) {
            onDelete(cityToDeleteId);
            setIsDeleteDialogOpen(false); // إغلاق مربع الحوار بعد الحذف
            setCityToDeleteId(null);
        }
    };

    if (!cities.length) {
        return (
            <p className="text-center text-muted-foreground py-4">
                لا توجد مدن توصيل لعرضها حاليًا.
            </p>
        );
    }

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader className="bg-primary text-primary-foreground">
                    <TableRow>
                        <TableHead className="text-center text-primary-foreground">اسم المدينة</TableHead>
                        <TableHead className="text-center text-primary-foreground">المناطق</TableHead>
                        <TableHead className="text-center text-primary-foreground">الحالة</TableHead>
                        <TableHead className="text-center text-primary-foreground">الإجراءات</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {cities.map((city) => (
                        <TableRow key={city.CityID}>
                            <TableCell className="text-center">{city.Name}</TableCell>
                            <TableCell className="text-center">
                                {(city.Districts ?? [])
                                    .map((d) => d.Name)
                                    .join(", ") || "لا توجد مناطق"}
                            </TableCell>
                            <TableCell className="text-center">
                                <Badge variant={city.IsActive ? "default" : "secondary"}>
                                    {city.IsActive ? "نشط" : "غير نشط"}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-center space-x-2">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => onEdit(city)}
                                    title="تعديل"
                                >
                                    <Edit3 />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => onToggleActive(city)}
                                    title={city.IsActive ? "تعطيل" : "تفعيل"}
                                >
                                    {city.IsActive ? <ToggleLeft /> : <ToggleRight />}
                                </Button>
                                {/* عند النقر، نفتح مربع الحوار بدلًا من الحذف مباشرة */}
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => openDeleteDialog(city.CityID)}
                                    title="حذف"
                                    className="text-destructive"
                                >
                                    <Trash2 />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            {/* مربع حوار التأكيد */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>هل أنت متأكد؟</DialogTitle>
                        <DialogDescription>
                            هذا الإجراء لا يمكن التراجع عنه. سيتم حذف المدينة وكافة المناطق المرتبطة بها نهائيًا.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
                        <Button
                            variant="secondary"
                            onClick={() => setIsDeleteDialogOpen(false)}
                        >
                            إلغاء
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                        >
                            حذف
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
