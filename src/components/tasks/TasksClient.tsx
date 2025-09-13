
"use client";

import { useState, useMemo, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Printer, User, CheckCheck, XCircle, FileDown, Loader2, Building } from 'lucide-react';
import type { Driver, DeliveryManifest, Parcel, ParcelStatus, Branch } from '@/types';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { updateManifestStatus } from '@/actions/manifests';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PackageSearch } from "lucide-react";

interface TasksClientProps {
    drivers: Driver[];
    manifests: DeliveryManifest[];
    branches: Branch[];

}

const ALL_BRANCHES_VALUE = "_all_";

export function TasksClient({ drivers, manifests: initialManifests, branches }: TasksClientProps) {
    const [selectedBranchId, setSelectedBranchId] = useState<string>(ALL_BRANCHES_VALUE);
    const [selectedDriverId, setSelectedDriverId] = useState<string>('');
    const [updatableManifests, setUpdatableManifests] = useState<DeliveryManifest[]>(initialManifests);
    const [isUpdatingStatus, startStatusUpdateTransition] = useTransition();
    const [isDownloading, setIsDownloading] = useState<string | null>(null);

    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        setUpdatableManifests(JSON.parse(JSON.stringify(initialManifests)));
    }, [initialManifests]);

    const filteredDrivers = useMemo(() => {
        if (selectedBranchId === ALL_BRANCHES_VALUE) {
            return drivers;
        }
        return drivers.filter(d => d.BranchID.toString() === selectedBranchId);
    }, [selectedBranchId, drivers]);

    useEffect(() => {
        setSelectedDriverId(''); // Reset driver selection when branch changes
    }, [selectedBranchId]);

    const driverManifests = useMemo(() => {
        if (!selectedDriverId) {
            return [];
        }
        return updatableManifests.filter(m => m.DriverID === selectedDriverId);
    }, [selectedDriverId, updatableManifests]);

    const selectedDriverName = useMemo(() => {
        return drivers.find(d => d.DriverID === selectedDriverId)?.Name || '';
    }, [selectedDriverId, drivers]);

    const handlePrintManifest = (manifest: DeliveryManifest) => {
        router.push(`/tasks/manifest/${manifest.ManifestID}/print`);
    };

    const handleUpdateManifestStatus = async (manifestId: string, newStatus: 'مكتمل' | 'ملغي') => {
        startStatusUpdateTransition(async () => {
            const result = await updateManifestStatus(manifestId, newStatus);
            if (result.success) {
                toast({
                    title: "نجاح",
                    description: result.message,
                });
                setUpdatableManifests(prevManifests =>
                    prevManifests.map(m =>
                        m.ManifestID === manifestId
                            ? { ...m, Status: newStatus, UpdatedAt: new Date().toString() }
                            : m
                    )
                );
            } else {
                toast({
                    title: "خطأ",
                    description: result.message || "فشل تحديث حالة الكشف.",
                    variant: "destructive",
                });
            }
        });
    };

    const handleDownloadDocx = async (manifest: DeliveryManifest) => {
        setIsDownloading(manifest.ManifestID);

        try {
            const response = await fetch('/api/generate-manifest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(manifest),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate document');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            // تحديد اسم الملف بنفس رقم الكشف
            const fileName = `${manifest.ManifestID}.docx`;

            const a = document.createElement('a');
            a.href = url;
            a.download = fileName; // هنا تم ضبط اسم الملف
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            toast({
                title: 'نجاح',
                description: `تم تحميل كشف العمليات رقم ${manifest.ManifestID} بنجاح.`,
            });

        } catch (error) {
            console.error("Download error:", error);
            toast({
                title: 'خطأ',
                description: `فشل تحميل الملف: ${error instanceof Error ? error.message : 'Unknown error'}`,
                variant: 'destructive',
            });
        } finally {
            setIsDownloading(null);
        }
    };


    const getManifestStatusArabicName = (status: DeliveryManifest['Status']): string => {
        switch (status) {
            case 'قيد المعالجة': return 'قيد الانتظار';
            case 'تم الطباعة': return 'تمت الطباعة';
            case 'قيد التوصيل': return 'قيد التوصيل';
            case 'مكتمل': return 'مكتمل';
            case 'ملغي': return 'ملغى';
            default: return status;
        }
    }

    const getParcelStatusArabicName = (status: ParcelStatus): string => {
        switch (status) {
            case 'قيد المعالجة': return 'قيد الانتظار';
            case 'قيد التوصيل': return 'قيد النقل';
            case 'تم التوصيل': return 'تم التوصيل';
            case 'تم التسليم': return 'تم التسليم';
            default: return status;
        }
    }

    return (
        <div className="space-y-6">
            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle>عرض مهام السائق</CardTitle>
                    <CardDescription>اختر سائقًا لعرض كشوفات التوصيل والطرود المعينة له.</CardDescription>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label htmlFor="branch-filter" className="block text-sm font-medium text-foreground mb-1">الفرع</label>
                        <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                            <SelectTrigger id="branch-filter">
                                <SelectValue placeholder="اختر فرعًا" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL_BRANCHES_VALUE}>جميع الفروع</SelectItem>
                                {branches.map(branch => (
                                    <SelectItem key={branch.BranchID} value={branch.BranchID.toString()}>{branch.Name} </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label htmlFor="driver-filter" className="block text-sm font-medium text-foreground mb-1">السائق</label>
                        <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                            <SelectTrigger id="driver-filter">
                                <SelectValue placeholder="اختر سائقًا" />
                            </SelectTrigger>
                            <SelectContent>
                                {drivers.map(driver => (
                                    <SelectItem key={driver.DriverID} value={driver.DriverID}>{driver.Name} </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {selectedDriverId && driverManifests.length === 0 && (
                <Card className="shadow-lg rounded-lg">
                    <CardContent className="p-6 text-center">
                        <PackageSearch className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">لا توجد كشوفات توصيل نشطة معينة للسائق {selectedDriverName} حاليًا.</p>
                    </CardContent>
                </Card>
            )}

            {selectedDriverId && driverManifests.length > 0 && (
                <Accordion type="single" collapsible className="w-full space-y-4">
                    {driverManifests.map(manifest => (
                        <AccordionItem value={manifest.ManifestID} key={manifest.ManifestID} className="border bg-card shadow-md rounded-lg">
                            <div className="flex items-center justify-between p-4 hover:bg-muted/50 rounded-t-lg">
                                <AccordionTrigger className="flex-1 p-0 text-left hover:no-underline [&>svg]:me-auto">
                                    <div>
                                        <h3 className="font-semibold text-lg">كشف: {manifest.ManifestID} ({manifest.City})</h3>
                                        <p className="text-sm text-muted-foreground">
                                            تاريخ الإنشاء: {format(new Date(manifest.PrintDate), 'PPp', { locale: arSA })} -
                                            الحالة: {getManifestStatusArabicName(manifest.Status)} -
                                            عدد الطرود: {manifest.Parcels.length}
                                        </p>
                                    </div>
                                </AccordionTrigger>
                                <div className="ps-4 flex flex-col sm:flex-row gap-2 items-center">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => { e.stopPropagation(); handlePrintManifest(manifest); }}
                                    >
                                        <Printer className="me-2 h-4 w-4" /> معاينة الطباعة
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={(e) => { e.stopPropagation(); handleDownloadDocx(manifest); }}
                                        disabled={isDownloading === manifest.ManifestID}
                                    >
                                        {isDownloading === manifest.ManifestID ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <FileDown className="me-2 h-4 w-4" />}
                                        {isDownloading === manifest.ManifestID ? 'جاري التحضير...' : 'تحميل (Word)'}
                                    </Button>
                                    {manifest.Status !== 'مكتمل' && manifest.Status !== 'ملغي' && (
                                        <>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={(e) => { e.stopPropagation(); handleUpdateManifestStatus(manifest.ManifestID, 'مكتمل'); }}
                                                disabled={isUpdatingStatus}
                                                className="bg-green-500 hover:bg-green-600 text-white"
                                            >
                                                {isUpdatingStatus ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <CheckCheck className="me-2 h-4 w-4" />}
                                                تحديد كمكتمل
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={(e) => { e.stopPropagation(); handleUpdateManifestStatus(manifest.ManifestID, 'ملغي'); }}
                                                disabled={isUpdatingStatus}
                                            >
                                                {isUpdatingStatus ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <XCircle className="me-2 h-4 w-4" />}
                                                إلغاء الكشف
                                            </Button>
                                        </>
                                    )}
                                    {manifest.Status === 'مكتمل' && (
                                        <span className="text-sm font-medium text-green-600 flex items-center"><CheckCheck className="me-1 h-4 w-4" /> مكتمل</span>
                                    )}
                                    {manifest.Status === 'ملغي' && (
                                        <span className="text-sm font-medium text-red-600 flex items-center"><XCircle className="me-1 h-4 w-4" /> ملغى</span>
                                    )}
                                </div>
                            </div>
                            <AccordionContent className="p-0">
                                <div className="border-t p-4">
                                    <h4 className="font-medium mb-2 text-md"> تفاصيل الطرود في الكشف:</h4>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="text-center bg-primary text-primary-foreground">
                                                <TableRow>
                                                    <TableHead className="text-center bg-primary text-primary-foreground">رقم التتبع</TableHead>
                                                    <TableHead className="text-center bg-primary text-primary-foreground">المستلم</TableHead>
                                                    <TableHead className="text-center bg-primary text-primary-foreground">الحي/المنطقة</TableHead>
                                                    <TableHead className="text-center bg-primary text-primary-foreground">هاتف المستلم</TableHead>
                                                    <TableHead className="text-center bg-primary text-primary-foreground">حالة الطرد</TableHead>
                                                    <TableHead className="text-center bg-primary text-primary-foreground">ملاحظات</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {manifest.Parcels.map(parcel => (
                                                    <TableRow key={parcel.ParcelID}>
                                                        <TableCell className="font-medium text-center">{parcel.TrackingNumber}</TableCell>
                                                        <TableCell className="text-center"> {parcel.ReceiverName}</TableCell>
                                                        <TableCell className="text-center">{parcel.ReceiverDistrict}</TableCell>
                                                        <TableCell className="text-center">{parcel.ReceiverPhone}</TableCell>
                                                        <TableCell className="text-center">{getParcelStatusArabicName(parcel.Status)}</TableCell>
                                                        <TableCell className="max-w-xs truncate text-center">{parcel.Notes || '-'}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            )}
        </div>
    );
}
