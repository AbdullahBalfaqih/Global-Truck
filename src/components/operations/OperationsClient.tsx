"use client"; // تأكد من وجود هذا السطر في الأعلى

import { useState, useEffect, useMemo, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Filter, UserCheck, AlertCircle, Truck, Info, XCircle, PackageSearch, Loader2, Home } from 'lucide-react';
import type { DeliveryCityForSelect, Driver, Parcel, DeliveryManifest, ParcelStatus, UserRole } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { createDeliveryManifest, getAllActiveManifests, updateManifestStatus as updateManifestStatusAction, deleteDeliveryManifest } from '@/actions/manifests';
import { getAllParcels } from '@/actions/parcels';
import { parse } from "date-fns";
import { Trash2 } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";


// هنا، في واجهة OperationsClientProps، أضف userBranchId
interface OperationsClientProps {
    availableCities: DeliveryCityForSelect[];
    availableDrivers: Driver[];
    initialParcelsForAssignment: Parcel[];
    allManifests: DeliveryManifest[];
    currentBranchName: string | null;
    userRole: UserRole;
    userBranchId: number | null; // ✅ أضف هذا السطر
    session: any;

}

const ALL_CITIES_VALUE = "_all_";

export function OperationsClient({
    availableCities,
    availableDrivers,
    initialParcelsForAssignment: initialAssignable,
    allManifests: initialAllManifests,
    currentBranchName,
    userRole,
    userBranchId, // ✅ تأكد من استقبال الـ prop هنا أيضًا
}: OperationsClientProps) {
    const [selectedDriverId, setSelectedDriverId] = useState<string>('');
    const [selectedParcels, setSelectedParcels] = useState<Record<string, boolean>>({});
    const [selectedCity, setSelectedCity] = useState<string>(ALL_CITIES_VALUE);

    const [assignableParcels, setAssignableParcels] = useState<Parcel[]>(initialAssignable);
    const [managedManifests, setManagedManifests] = useState<DeliveryManifest[]>(initialAllManifests);

    const [isAssigning, startAssignTransition] = useTransition();
    const [isUpdatingStatus, startStatusUpdateTransition] = useTransition();

    const { toast } = useToast(); // ✅ تأكد من تعريف useToast هنا قبل استخدامه
    const router = useRouter();

    // حالات جديدة لإدارة النوافذ المنبثقة
    const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [manifestToProcess, setManifestToProcess] = useState<string | null>(null);


    const fetchAndSetManagedManifests = async () => {
        try {
            const manifests = await getAllActiveManifests();
            setManagedManifests(manifests);
        } catch (error) {
            toast({ variant: "destructive", title: "خطأ", description: "فشل تحميل الكشوفات النشطة." });
        }
    };


    useEffect(() => {
        setAssignableParcels(initialAssignable);
        setManagedManifests(initialAllManifests);
    }, [initialAssignable, initialAllManifests]);


    const filteredAssignableParcels = useMemo(() => {
        if (selectedCity === ALL_CITIES_VALUE) {
            return assignableParcels;
        }
        return assignableParcels.filter(p => p.ReceiverCity === selectedCity);
    }, [assignableParcels, selectedCity]);

    const handleSelectParcel = (parcelId: string, checked: boolean) => {
        setSelectedParcels(prev => ({ ...prev, [parcelId]: checked }));
    };

    const getSelectedParcelIds = (): string[] => {
        return Object.keys(selectedParcels).filter(parcelId => selectedParcels[parcelId]);
    };

    const countSelectedParcels = () => {
        return getSelectedParcelIds().length;
    }

    const handleAssignAndPrint = () => {
        const parcelIdsToAssign = getSelectedParcelIds();
        const driver = availableDrivers.find(d => d.DriverID.toString() === selectedDriverId);

        if (!driver) {
            toast({ variant: "destructive", title: "خطأ", description: "الرجاء اختيار سائق." });
            return;
        }
        if (parcelIdsToAssign.length === 0) {
            toast({ variant: "destructive", title: "خطأ", description: "الرجاء تحديد طرد واحد على الأقل." });
            return;
        }

        const cityForManifest = selectedCity === ALL_CITIES_VALUE ? "طرود متعددة" : selectedCity;

        const manifestId = `A-${Date.now()}`;

        startAssignTransition(async () => {
            const result = await createDeliveryManifest(driver.DriverID.toString(), cityForManifest, parcelIdsToAssign);
            if (result.success && result.manifest) {
                toast({
                    title: "تم التعيين بنجاح",
                    description: result.message,
                });
                // Refetch data to update UI

                setAssignableParcels(prev => prev.filter(p => !parcelIdsToAssign.includes(p.ParcelID)));
                fetchAndSetManagedManifests();
                setSelectedParcels({});
                router.push(`/tasks/manifest/${result.manifest.ManifestID}/print`);

            } else {
                toast({
                    variant: "destructive",
                    title: "خطأ في التعيين",
                    description: result.message || "فشل إنشاء كشف التوصيل.",
                });
            }
        });
    };

    // الدوال الجديدة لفتح النوافذ المنبثقة
    const handleOpenCancelAlert = (manifestId: string) => {
        setManifestToProcess(manifestId);
        setIsCancelAlertOpen(true);
    };

    const handleOpenDeleteAlert = (manifestId: string) => {
        setManifestToProcess(manifestId);
        setIsDeleteAlertOpen(true);
    };

    const handleConfirmCancel = () => {
        if (!manifestToProcess) return;
        setIsCancelAlertOpen(false);
        startStatusUpdateTransition(async () => {
            const result = await updateManifestStatusAction(manifestToProcess, 'ملغي');
            if (result.success) {
                toast({
                    title: "نجاح",
                    description: result.message,
                });
                fetchAndSetManagedManifests();
                if ('ملغي') {
                    toast({ title: "تنبيه", description: "قد تحتاج لتحديث الصفحة لرؤية الطرود الملغاة في قائمة التعيين." })
                }
            } else {
                toast({
                    title: "خطأ",
                    description: result.message || "فشل تحديث حالة الكشف.",
                    variant: "destructive",
                });
            }
        });
    };

    const handleConfirmDelete = async () => {
        if (!manifestToProcess) return;
        setIsDeleteAlertOpen(false);

        try {
            const res = await deleteDeliveryManifest(manifestToProcess);
            if (res.success) {
                toast({
                    title: "تم حذف الكشف بنجاح",
                    description: res.message,
                    variant: "default",
                });
                fetchAndSetManagedManifests();
            } else {
                toast({
                    title: "فشل في حذف الكشف",
                    description: res.message || "يرجى المحاولة مرة أخرى.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "حدث خطأ أثناء الحذف",
                description: "يرجى التحقق من الاتصال أو المحاولة لاحقًا.",
                variant: "destructive",
            });
            console.error("Delete Manifest Error:", error);
        }
    };

    // تم استبدال دالة handleUpdateManifestStatus و handleDeleteManifest
    // ليتم استدعاء النوافذ المنبثقة أولًا

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

    const totalParcelsGloballyForAssignment = initialAssignable.length; // ✅ هذا المتغير لم يكن مستخدمًا، لكنه لا يسبب مشكلة.

    return (
        <div className="space-y-6">
            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle>فلترة الطرود للتعيين</CardTitle>
                    <CardDescription>يتم عرض الطرود الجاهزة للشحن من فرعك الحالي.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800 md:col-span-2">
                        <Home className="h-4 w-4 text-blue-700" />
                        <AlertTitle className="text-blue-900">الفرع الحالي</AlertTitle>
                        <AlertDescription>
                            {userRole === "Developer"
                                ? "أنت تعرض الطرود من جميع الفروع."
                                : currentBranchName
                                    ? `أنت تعرض الطرود من فرع: ${currentBranchName}`
                                    : "لم يتم تحديد فرع لك."}
                        </AlertDescription>
                    </Alert>
                    <div>
                        <label htmlFor="city-filter" className="block text-sm font-medium text-foreground mb-1">فلترة حسب المدينة</label>
                        <Select value={selectedCity} onValueChange={setSelectedCity}>
                            <SelectTrigger id="city-filter" className="w-full">
                                <SelectValue placeholder="اختر مدينة..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL_CITIES_VALUE}>كل المدن</SelectItem>
                                {availableCities?.map(city => (
                                    <SelectItem key={city.CityID} value={city.Name}>{city.Name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {filteredAssignableParcels.length === 0 && (
                <Alert variant="default" className="shadow-md rounded-lg bg-blue-50 border-blue-200">
                    <Truck className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-700">لا توجد طرود للتعيين</AlertTitle>
                    <AlertDescription className="text-blue-600">
                        لا توجد طرود بحالة 'قيد المعالجة' وغير معينة لسائق في فرعك حاليًا تطابق الفلترة.
                    </AlertDescription>
                </Alert>
            )}

            {assignableParcels.length > 0 && (
                <Card className="shadow-lg rounded-lg">
                    <CardHeader>
                        <CardTitle>قائمة الطرود المتاحة للتعيين</CardTitle>
                        <CardDescription>حدد الطرود لتعيينها لسائق. ({countSelectedParcels()} طرود محددة)</CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-primary text-primary-foreground">
                                <TableRow>
                                    <TableHead className="w-[50px] bg-primary text-primary-foreground">تحديد</TableHead>
                                    <TableHead className="text-center bg-primary text-primary-foreground">رقم التتبع</TableHead>
                                    <TableHead className="text-center bg-primary text-primary-foreground">المستلم</TableHead>
                                    <TableHead className="text-center bg-primary text-primary-foreground">المدينة</TableHead>
                                    <TableHead className="text-center bg-primary text-primary-foreground" >الحي/المنطقة</TableHead >
                                    <TableHead className="text-center bg-primary text-primary-foreground">الحالة</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAssignableParcels.map(parcel => (
                                    <TableRow key={parcel.ParcelID} data-state={selectedParcels[parcel.ParcelID] ? "selected" : ""}>
                                        <TableCell className="text-center">
                                            <Checkbox
                                                id={`select-${parcel.ParcelID}`}
                                                checked={selectedParcels[parcel.ParcelID] || false}
                                                onCheckedChange={(checked) => handleSelectParcel(parcel.ParcelID.toString(), !!checked)}
                                                aria-label={`تحديد الطرد ${parcel.TrackingNumber}`}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium text-center">{parcel.TrackingNumber}</TableCell>
                                        <TableCell className="text-center">{parcel.ReceiverName}</TableCell>
                                        <TableCell className="text-center">{parcel.ReceiverCity}</TableCell>
                                        <TableCell className="text-center">{parcel.ReceiverDistrict}</TableCell>
                                        <TableCell className="text-center">{parcel.Status}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <CardFooter className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
                        <div className="flex-grow">
                            <label htmlFor="driver-select" className="block text-sm font-medium text-foreground mb-1">اختر السائق</label>
                            <Select value={selectedDriverId} onValueChange={setSelectedDriverId} disabled={availableDrivers.length === 0}>
                                <SelectTrigger id="driver-select" className="w-full sm:w-[250px]">
                                    <SelectValue placeholder={availableDrivers.length === 0 ? "لا يوجد سائقون نشطون" : "اختر سائقًا"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableDrivers.map(driver => (
                                        <SelectItem key={driver.DriverID} value={driver.DriverID.toString()}>{driver.Name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            onClick={handleAssignAndPrint}
                            disabled={countSelectedParcels() === 0 || !selectedDriverId || isAssigning}
                            className="w-full sm:w-auto self-end mt-2 sm:mt-0"
                        >
                            {isAssigning && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                            <UserCheck className="me-2 h-4 w-4" /> {isAssigning ? "جاري التعيين..." : "تعيين للسائق وطباعة الكشف"}
                        </Button>
                    </CardFooter>
                </Card>
            )}

            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle>الكشوفات المعينة حالياً للسائقين (النشطة)</CardTitle>
                    <CardDescription>عرض الكشوفات النشطة التي تم تعيينها للسائقين ولم تكتمل أو تُلغى بعد.</CardDescription>
                </CardHeader>
                <CardContent>
                    {managedManifests.length === 0 ? (
                        <Alert variant="default" className="bg-blue-50 border-blue-200">
                            <PackageSearch className="h-4 w-4 text-blue-600" />
                            <AlertTitle className="text-blue-700">لا توجد كشوفات نشطة معينة حالياً</AlertTitle>
                            <AlertDescription className="text-blue-600">
                                لا توجد كشوفات توصيل نشطة معينة للسائقين في النظام.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-primary text-primary-foreground">
                                    <TableRow>
                                        <TableHead className="text-center bg-primary text-primary-foreground">معرف الكشف</TableHead>
                                        <TableHead className="text-center bg-primary text-primary-foreground">اسم السائق</TableHead>
                                        <TableHead className="text-center bg-primary text-primary-foreground">المدينة</TableHead>
                                        <TableHead className="text-center bg-primary text-primary-foreground">عدد الطرود</TableHead>
                                        <TableHead className="text-center bg-primary text-primary-foreground">تاريخ الإنشاء</TableHead>
                                        <TableHead className="text-center bg-primary text-primary-foreground">الحالة</TableHead>
                                        <TableHead className="text-center bg-primary text-primary-foreground">إجراءات</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {managedManifests.map(manifest => (
                                        <TableRow key={manifest.ManifestID}>
                                            <TableCell className="font-medium text-center">{manifest.ManifestID}</TableCell>
                                            <TableCell className="text-center">{manifest.DriverName || manifest.DriverID}</TableCell>
                                            <TableCell className="text-center">{manifest.City}</TableCell>
                                            <TableCell className="text-center">{manifest.Parcels?.length || 0}</TableCell>
                                            <TableCell className="text-center">
                                                {manifest.CreatedAt ? (
                                                    (() => {
                                                        try {
                                                            const parsed = parse(manifest.CreatedAt, "yyyy-MM-dd HH:mm:ss", new Date());
                                                            const date = isNaN(parsed.getTime())
                                                                ? new Date(manifest.CreatedAt)
                                                                : parsed;

                                                            return format(date, "PPp", { locale: arSA });
                                                        } catch {
                                                            return "-";
                                                        }
                                                    })()
                                                ) : (
                                                    "-"
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">{getManifestStatusArabicName(manifest.Status)}</TableCell>
                                            <TableCell className="text-center space-x-2 rtl:space-x-reverse">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                                    onClick={() => handleOpenCancelAlert(manifest.ManifestID)}
                                                    disabled={isUpdatingStatus || manifest.Status === 'مكتمل' || manifest.Status === 'ملغي'}
                                                >
                                                    <XCircle className="me-1 h-4 w-4" />
                                                    إلغاء الكشف
                                                </Button>

                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleOpenDeleteAlert(manifest.ManifestID)}
                                                    disabled={isUpdatingStatus || manifest.Status === 'مكتمل'}
                                                >
                                                    <Trash2 className="me-1 h-4 w-4" />
                                                    حذف الكشف
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* نافذة التأكيد لإلغاء الكشف */}
            <AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>هل أنت متأكد من الإلغاء؟</AlertDialogTitle>
                        <AlertDialogDescription>
                            سيتم إلغاء الكشف رقم **{manifestToProcess}**، وستعود جميع الطرود المرتبطة به إلى حالة 'قيد المعالجة' ليتم تعيينها مرة أخرى.
                            هل تريد المتابعة؟
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmCancel} className="bg-destructive hover:bg-red-700">
                            نعم، إلغاء الكشف
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* نافذة التأكيد لحذف الكشف */}
            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>تنبيه: حذف نهائي!</AlertDialogTitle>
                        <AlertDialogDescription>
                            أنت على وشك حذف الكشف رقم **{manifestToProcess}** بشكل نهائي.
                            **لا يمكن التراجع عن هذه العملية.**
                            هل أنت متأكد أنك تريد المتابعة؟
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-red-700">
                            نعم، احذف الكشف نهائياً
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}