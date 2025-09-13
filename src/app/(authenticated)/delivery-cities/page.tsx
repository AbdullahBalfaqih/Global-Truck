"use client";

import { useState, useEffect, useTransition } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AddDeliveryCityForm } from "@/components/delivery-cities/AddDeliveryCityForm";
import { DeliveryCitiesTable } from "@/components/delivery-cities/DeliveryCitiesTable";
import type { DeliveryCity } from "@/types";
import { useToast } from "@/hooks/use-toast";
import {
    getAllDeliveryCitiesWithDistricts,
    createDeliveryCityWithDistricts,
    updateDeliveryCityWithDistricts,
    deleteDeliveryCity,
    toggleCityActive,
} from "@/actions/deliveryLocations";
import { Loader2 } from "lucide-react";
import {
    Alert,
    AlertDescription,
    AlertTitle as ShadcnAlertTitle,
} from "@/components/ui/alert";

export default function DeliveryCitiesPage() {
    const [cities, setCities] = useState<DeliveryCity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorLoading, setErrorLoading] = useState<string | null>(null);
    const [editingCity, setEditingCity] = useState<DeliveryCity | null>(null);
    const { toast } = useToast();

    const [isPending, startTransition] = useTransition();

    const fetchCities = async () => {
        setIsLoading(true);
        setErrorLoading(null);
        try {
            const data = await getAllDeliveryCitiesWithDistricts();
            setCities(data);
        } catch {
            setErrorLoading("فشل تحميل قائمة المدن.");
            toast({ title: "خطأ", description: "فشل تحميل قائمة المدن.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchCities(); }, []);

    const onAddSuccess = () => {
        fetchCities();
        toast({ title: "نجاح", description: "تم إضافة المدينة." });
    };

    const onUpdateSuccess = () => {
        fetchCities();
        setEditingCity(null);
        toast({ title: "نجاح", description: "تم تعديل المدينة." });
    };

    const handleDelete = (id: number) => {
        startTransition(async () => {
            const res = await deleteDeliveryCity(id);
            if (res.success) {
                fetchCities();
                toast({ title: "تم الحذف", description: res.message });
            } else {
                toast({ title: "خطأ", description: res.message, variant: "destructive" });
            }
        });
    };

    const handleToggle = (city: DeliveryCity) => {
        startTransition(async () => {
            const res = await toggleCityActive(city.CityID);
            if (res.success) {
                fetchCities();
                toast({ title: "تم التحديث", description: res.message });
            }
        });
    };

    return (
        <div className="space-y-6">
            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle>{editingCity ? 'تعديل مدينة' : 'إضافة مدينة'}</CardTitle>
                </CardHeader>
                <CardContent>
                    <AddDeliveryCityForm
                        initialData={editingCity || undefined}
                        onSubmit={editingCity ? updateDeliveryCityWithDistricts : createDeliveryCityWithDistricts}
                        onSuccess={editingCity ? onUpdateSuccess : onAddSuccess}
                    />
                </CardContent>
            </Card>
            <Separator />
            <Card className="shadow-lg rounded-lg">
                <CardHeader><CardTitle>قائمة مدن التوصيل</CardTitle></CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-4"><Loader2 className="animate-spin" /></div>
                    ) : errorLoading ? (
                        <Alert variant="destructive">
                            <ShadcnAlertTitle>خطأ</ShadcnAlertTitle>
                            <AlertDescription>{errorLoading}</AlertDescription>
                        </Alert>
                    ) : (
                        <DeliveryCitiesTable
                            cities={cities}
                            onDelete={handleDelete}
                            onToggleActive={handleToggle}
                            onEdit={setEditingCity}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}  