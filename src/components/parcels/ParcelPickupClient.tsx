
"use client";

import { useState, useEffect, useMemo, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { PackageCheck, CheckCircle, MessageSquare, Info, Filter, Eye, Archive, Send, Search as SearchIcon, DollarSign as DollarSignIcon, Truck, Loader2 } from 'lucide-react';
import type { Parcel, Branch, PaymentType, ParcelStatus, UserRole } from '@/types';
import { useToast } from '@/hooks/use-toast';
 import { ar } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { markParcelAsPickedUp, markParcelAsPaid } from "@/actions/getparcels";
import { useRouter } from "next/navigation";
import {
    Tooltip,
    TooltipTrigger,
    TooltipContent,
    TooltipProvider
} from "@/components/ui/tooltip";
import { FaWhatsapp } from "react-icons/fa";
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
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from "date-fns";
import { arSA } from "date-fns/locale"; 
interface ParcelPickupClientProps {
    initialParcels: Parcel[];
    branches: Branch[];
    userRole: UserRole;
    userBranchId: number | null;
}

const ALL_BRANCHES_VALUE = "_all_";

const getStatusBadgeVariant = (status: ParcelStatus) => {
    switch (status) {
        case 'تم التوصيل':
        case 'Delivered':
            return 'default';
        case 'قيد التوصيل':
        case 'InTransit':
            return 'secondary';
        case 'قيد المعالجة':
        case 'Pending':
            return 'outline';
        case 'تم التسليم':
            return 'default'; // تم التسليم بنجاح
        default:
            return 'destructive';
    }
};

const getStatusArabicName = (status: ParcelStatus): string => {
    switch (status) {
        case 'Pending': return 'قيد الانتظار';
        case 'InTransit': return 'قيد النقل';
        case 'Delivered': return 'وصل الفرع';
        case 'Cancelled': return 'ملغى';
        case 'تم التسليم': return 'تم التسليم للعميل';
        default: return status;
    }
}

export function ClientFormattedDate({ date }: { date: string | Date }) {
    const parsed = new Date(date);
    return (
        <span>
            {format(parsed, "PPpp", { locale: arSA })}
        </span>
    );
}
export function ParcelPickupClient({ initialParcels, branches, userRole, userBranchId }: ParcelPickupClientProps) {
    const [parcels, setParcels] = useState<Parcel[]>(initialParcels);
    const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
        if (userRole === 'BranchEmployee' && userBranchId) {
            return String(userBranchId);
        }
        return ALL_BRANCHES_VALUE;
    });
    const [showPickedUpParcels, setShowPickedUpParcels] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const { toast } = useToast();
    const [dialogState, setDialogState] = useState<{ type: string | null, parcel: Parcel | null }>({ type: null, parcel: null });
    const [isUpdating, startUpdateTransition] = useTransition();
    const router = useRouter();
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    useEffect(() => {
        setParcels(initialParcels);
    }, [initialParcels]);

    useEffect(() => {
        if (userRole === 'BranchEmployee' && userBranchId) {
            setSelectedBranchId(String(userBranchId));
        }
    }, [userRole, userBranchId]);


    const getBranchName = (branchId: number): string => {
        const branch = branches.find(b => b.BranchID === branchId);
        return branch ? `${branch.Name}` : `فرع غير معروف (${branchId})`;
    };

    const getPaymentTypeArabic = (paymentType: PaymentType): string => {
        switch (paymentType) {
            case 'COD':
                return 'الدفع عند الاستلام';
            case 'Prepaid':
                return 'مدفوع مسبقًا';
            case 'Postpaid':
                return 'آجل';
            default:
                return 'غير محدد';
        }
    }

    const parcelsAwaitingPickup = useMemo(() => {
        const selectedId = Number(selectedBranchId);
        let filtered = parcels.filter(p =>
            (p.Status === 'Delivered' || p.Status === 'تم التوصيل') && !p.IsPickedUpByReceiver &&
            (selectedBranchId === ALL_BRANCHES_VALUE || p.DestinationBranchID === selectedId)
        );

        if (searchTerm) {
            filtered = filtered.filter(p =>
                p.TrackingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.ReceiverName?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return filtered;
    }, [parcels, selectedBranchId, searchTerm]);

    const pickedUpParcels = useMemo(() => {
        const selectedId = Number(selectedBranchId);
        let filtered = parcels.filter(p =>
            p.IsPickedUpByReceiver &&
            (selectedBranchId === ALL_BRANCHES_VALUE || p.DestinationBranchID === selectedId)
        );

        if (dateRange?.from) {
            filtered = filtered.filter(p => new Date(p.UpdatedAt) >= dateRange.from!);
        }
        if (dateRange?.to) {
            const toDate = new Date(dateRange.to);
            toDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(p => new Date(p.UpdatedAt) <= toDate);
        }
        if (searchTerm) {
            filtered = filtered.filter(p =>
                p.TrackingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.ReceiverName?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        return filtered;
    }, [parcels, selectedBranchId, searchTerm, dateRange]);

    const displayedParcels = showPickedUpParcels ? pickedUpParcels : parcelsAwaitingPickup;

    const handleConfirmAction = () => {
        if (!dialogState.parcel) return;

        const parcelId = dialogState.parcel!.ParcelID;

        startUpdateTransition(async () => {
            let result: { success: boolean; message: string; } | undefined;
            try {
                if (dialogState.type === 'pay') {
                    result = await markParcelAsPaid(parcelId);
                } else if (dialogState.type === 'pickup') {
                    if (dialogState.parcel?.PaymentType === 'COD' && !dialogState.parcel?.IsPaid) {
                        toast({ variant: 'destructive', title: 'خطأ', description: 'يجب تسجيل الدفع أولاً قبل تأكيد الاستلام.' });
                        setDialogState({ type: null, parcel: null });
                        return;
                    }
                    result = await markParcelAsPickedUp(parcelId);
                }

                if (result?.success) {
                    toast({ title: 'نجاح', description: result.message });
                    router.refresh();
                } else if (result) {
                    toast({ variant: 'destructive', title: 'خطأ', description: result.message });
                }
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'خطأ',
                    description: `حدث خطأ أثناء العملية: ${error.message}`
                });
            } finally {
                setDialogState({ type: null, parcel: null });
            }
        });
    };

    const handleSendWhatsApp = (parcel: Parcel) => {
        if (!parcel.ReceiverPhone) {
            toast({
                title: 'خطأ',
                description: 'رقم هاتف المستلم غير متوفر.',
                variant: 'destructive',
            });
            return;
        }

        const destinationBranchName = getBranchName(parcel.DestinationBranchID);
        let message = `عزيزي ${parcel.ReceiverName}، نود إعلامك بأن طردك برقم تتبع ${parcel.TrackingNumber} قد وصل إلى فرعنا في ${destinationBranchName}.`;

        if (parcel.PaymentType === 'COD' && !parcel.IsPaid) {
            message += ` يرجى العلم بأن قيمة الطرد (${parcel.ShippingCost.toFixed(0)} ريال) مستحقة الدفع عند الاستلام.`;
        }

        message += " يرجى الحضور لاستلامه. جلوبال تراك.";

        const phoneWithCountryCode = `967${parcel.ReceiverPhone.replace(/^0/, '')}`;
        const whatsappUrl = `https://wa.me/${phoneWithCountryCode}?text=${encodeURIComponent(message)}`;

        window.open(whatsappUrl, '_blank');
    };

    const handleBulkWhatsApp = () => {
        const recipientsToNotify = parcelsAwaitingPickup.filter(p =>
            ((p.PaymentType === 'COD' && !p.IsPaid) || p.PaymentType === 'Prepaid') && !!p.ReceiverPhone
        );

        if (recipientsToNotify.length === 0) {
            toast({
                variant: "destructive",
                title: "لا يوجد مستلمين",
                description: "لا توجد طرود تنتظر الاستلام لإرسال إشعارات جماعية لها حاليًا.",
            });
            return;
        }

        recipientsToNotify.forEach(p => {
            const destinationBranchName = getBranchName(p.DestinationBranchID);
            let message = `عزيزي ${p.ReceiverName}، طردك ${p.TrackingNumber} جاهز للاستلام في فرع ${destinationBranchName}.`;

            if (p.PaymentType === 'COD' && !p.IsPaid) {
                message += ` قيمة الطرد ${p.ShippingCost.toFixed(2)} ريال للدفع عند الاستلام.`;
            }

            message += " يرجى الحضور لاستلامه. جلوبال تراك.";

            const phoneWithCountryCode = `967${p.ReceiverPhone!.replace(/^/, '')}`;
            const whatsappUrl = `https://wa.me/${phoneWithCountryCode}?text=${encodeURIComponent(message)}`;

            window.open(whatsappUrl, '_blank');
        });

        toast({
            title: "تم إرسال إشعارات WhatsApp",
            description: `تم إرسال إشعارات إلى ${recipientsToNotify.length} مستلم.`,
        });
    };
    function handleDriverDelivery(parcel: Parcel) {
        if (!parcel.ReceiverPhone) {
            toast({
                title: 'خطأ',
                description: 'رقم هاتف المستلم غير متوفر.',
                variant: 'destructive',
            });
            return;
        }

        const destinationBranchName = getBranchName(parcel.DestinationBranchID);

        let message = `عزيزي ${parcel.ReceiverName}، تم تسليم طردك برقم ${parcel.TrackingNumber} بواسطة السائق.`;
        message += ` الرجاء التأكد من الاستلام.`;

        if (parcel.PaymentType === 'COD' && !parcel.IsPaid) {
            message += ` يرجى العلم بأن قيمة الطرد (${parcel.ShippingCost.toFixed(0)} ريال) مستحقة الدفع عند الاستلام.`;
        }

        message += " جلوبال تراك.";

        // إضافة كود الدولة اليمنية 967
        const phoneWithCountryCode = `967${parcel.ReceiverPhone!.replace(/^0/, '')}`;
        const whatsappUrl = `https://wa.me/${phoneWithCountryCode}?text=${encodeURIComponent(message)}`;

        // فتح نافذة جديدة لإرسال الرسالة
        window.open(whatsappUrl, '_blank');

        // ❌ تمت إزالة هذا السطر لعدم تغيير حالة الطرد في قاعدة البيانات
        // markParcelAsPickedUp(parcel.ParcelID).then(() => {
        //     console.log(`تم تحديث حالة الطرد ${parcel.TrackingNumber} كـ "تم التسليم بواسطة السائق"`);
        // });

        toast({
            title: "تم إرسال إشعار تسليم السائق",
            description: `تم فتح WhatsApp لإرسال رسالة تسليم الطرد ${parcel.TrackingNumber}.`
        });
    } 
    return (
        <TooltipProvider>
            <div className="space-y-6">
                <Card className="shadow-lg rounded-lg">
                    <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                            <CardTitle>فلترة الطرود وعرضها</CardTitle>
                            <CardDescription>
                                اختر الفرع ونوع العرض (بانتظار الاستلام أو مستلمة).
                            </CardDescription>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <Button onClick={() => setShowPickedUpParcels(!showPickedUpParcels)} variant="outline" className="w-full sm:w-auto">
                                {showPickedUpParcels ? <Eye className="me-2 h-4 w-4" /> : <Archive className="me-2 h-4 w-4" />}
                                {showPickedUpParcels ? "عرض الطرود بانتظار الاستلام" : "عرض الطرود المستلمة"}
                            </Button>
                            {!showPickedUpParcels && (
                                <Button onClick={handleBulkWhatsApp} variant="outline" className="w-full sm:w-auto">
                                    <Send className="me-2 h-4 w-4" />
                                    إرسال WhatsApp جماعي للمنتظرين
                                </Button>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                            <div>
                                <Label htmlFor="branch-filter" className="block text-sm font-medium text-foreground mb-1">
                                    اختر الفرع
                                </Label>
                                <Select
                                    value={selectedBranchId}
                                    onValueChange={setSelectedBranchId}
                                    disabled={userRole === 'BranchEmployee'} // ✅ معطل للموظف الفرعي
                                >
                                    <SelectTrigger id="branch-filter">
                                        <SelectValue placeholder="عرض كل الفروع" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={ALL_BRANCHES_VALUE}>كل الفروع</SelectItem>
                                        {branches.map((branch) => (
                                            <SelectItem key={branch.BranchID} value={branch.BranchID.toString()}>
                                                {branch.Name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="date-range-picker">فلترة حسب تاريخ التحديث</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            id="date-range-picker"
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !dateRange && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="me-2 h-4 w-4" />
                                            {dateRange?.from ? (
                                                dateRange.to ? (
                                                    <>
                                                        {format(dateRange.from, "LLL dd, y", { locale: ar })} -{" "}
                                                        {format(dateRange.to, "LLL dd, y", { locale: ar })}
                                                    </>
                                                ) : (
                                                    format(dateRange.from, "LLL dd, y", { locale: ar })
                                                )
                                            ) : (
                                                <span>اختر فترة زمنية</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={dateRange?.from}
                                            selected={dateRange}
                                            onSelect={setDateRange}
                                            numberOfMonths={2}
                                            locale={ar}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div>
                                <Label htmlFor="search-term" className="block text-sm font-medium text-foreground mb-1">
                                    بحث في النتائج المعروضة
                                </Label>
                                <div className="relative">
                                    <SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground rtl:right-2.5 rtl:left-auto" />
                                    <Input
                                        id="search-term"
                                        placeholder="ابحث برقم التتبع أو اسم المستلم..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="ps-8 rtl:pr-8"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>



                {initialParcels.length > 0 && displayedParcels.length === 0 && (
                    <Alert variant="default" className="shadow-md rounded-lg bg-yellow-50 border-yellow-200">
                        <Filter className="h-4 w-4 text-yellow-600" />
                        <AlertTitle className="text-yellow-700">لا توجد طرود تطابق الفلترة الحالية</AlertTitle>
                        <AlertDescription className="text-yellow-600">
                            لا توجد طرود {showPickedUpParcels ? 'مستلمة' : 'تنتظر الاستلام'} في الفرع المحدد{searchTerm ? ` أو تطابق بحثك "${searchTerm}"` : ''}.
                        </AlertDescription>
                    </Alert>
                )}

                {displayedParcels.length > 0 && (
                    <Card className="shadow-lg rounded-lg">
                        <CardHeader>
                            <CardTitle>
                                {showPickedUpParcels ? "الطرود التي تم استلامها من الفرع" : "الطرود الجاهزة للاستلام من الفرع"}
                            </CardTitle>
                            <CardDescription>
                                {showPickedUpParcels
                                    ? `قائمة بالطرود التي استلمها العملاء من الفرع المحدد. (${displayedParcels.length} طرد)`
                                    : `قائمة بالطرود التي وصلت إلى الفرع المحدد وتنتظر استلام العميل. (${displayedParcels.length} طرد)`}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-primary text-primary-foreground">
                                    <TableRow>
                                        <TableHead className="text-center bg-primary text-primary-foreground">رقم التتبع</TableHead>
                                        <TableHead className="text-center bg-primary text-primary-foreground">المستلم</TableHead>
                                        <TableHead className="text-center bg-primary text-primary-foreground">هاتف المستلم</TableHead>
                                        <TableHead className="text-center   bg-primary text-primary-foreground">نوع الدفع</TableHead>
                                        <TableHead className="text-center bg-primary text-primary-foreground" >حالة الدفع</TableHead>
                                        <TableHead className="text-center bg-primary text-primary-foreground">كلفة الإرسال</TableHead>
                                        <TableHead className="text-center bg-primary text-primary-foreground">حالة الطرد</TableHead>
                                        <TableHead className="text-center bg-primary text-primary-foreground">
                                            {showPickedUpParcels ? "تاريخ الاستلام" : "تاريخ وصول الفرع"}
                                        </TableHead>
                                        <TableHead className="text-center bg-primary text-primary-foreground" >فرع الوجهة</TableHead>
                                        {!showPickedUpParcels && (
                                            <TableHead className="text-center bg-primary text-primary-foreground">إجراءات</TableHead>
                                        )}
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {displayedParcels.map((parcel) => (
                                        <TableRow key={parcel.ParcelID}>
                                            <TableCell className="font-medium text-center ">{parcel.TrackingNumber}</TableCell>
                                            <TableCell className="text-center">{parcel.ReceiverName}</TableCell>
                                            <TableCell className="text-center">{parcel.ReceiverPhone}</TableCell>

                                            <TableCell className="text-center">
                                                <Badge variant={parcel.PaymentType === 'COD' ? 'secondary' : 'outline'}>
                                                    {getPaymentTypeArabic(parcel.PaymentType)}
                                                </Badge>
                                            </TableCell>

                                            <TableCell className="text-center">
                                                <Badge
                                                    variant={parcel.IsPaid ? 'default' : 'destructive'}
                                                    className={parcel.IsPaid
                                                        ? 'bg-green-500 hover:bg-green-600'
                                                        : 'bg-red-500 hover:bg-red-600'}>
                                                    {parcel.IsPaid
                                                        ? 'مدفوع'
                                                        : 'بانتظار الدفع'}
                                                </Badge>
                                            </TableCell>

                                            <TableCell className="text-center">{parcel.ShippingCost.toFixed(0)} ريال</TableCell>

                                            <TableCell className="text-center">
                                                <Badge
                                                    variant={getStatusBadgeVariant(parcel.Status)}
                                                    className={
                                                        parcel.Status === 'تم التوصيل'
                                                            ? 'bg-green-500 hover:bg-green-600 text-white'
                                                            : parcel.Status === 'قيد التوصيل'
                                                                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                                                : parcel.Status === 'قيد المعالجة'
                                                                    ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                                                                    : ''
                                                    }>
                                                    {getStatusArabicName(parcel.Status)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <ClientFormattedDate date={parcel.UpdatedAt} />
                                            </TableCell>





                                            <TableCell className="text-center">{getBranchName(parcel.DestinationBranchID)}</TableCell>

                                            {!showPickedUpParcels && (
                                                <TableCell className="text-center">
                                                    <div className="flex justify-center flex-wrap gap-1">
                                                        {parcel.PaymentType === 'COD' && !parcel.IsPaid && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => setDialogState({ type: 'pay', parcel })}
                                                                        className="text-green-600 hover:bg-green-100"
                                                                    >
                                                                        <DollarSignIcon className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>تسجيل الدفع</TooltipContent>
                                                            </Tooltip>
                                                        )}



                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost" size="icon" onClick={() => setDialogState({ type: 'pickup', parcel })} disabled={parcel.PaymentType === 'COD' && !parcel.IsPaid} className="text-white bg-green-500 hover:bg-green-600 disabled:bg-gray-300">
                                                                    <CheckCircle className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>تسجيل استلام العميل للطرد</TooltipContent>
                                                        </Tooltip>

                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="outline" size="icon" onClick={() => handleSendWhatsApp(parcel)} title="إرسال واتساب" className="text-green-600 hover:bg-green-100">
                                                                    <FaWhatsapp className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>إرسال رسالة WhatsApp للعميل</TooltipContent>
                                                        </Tooltip>

                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleDriverDelivery(parcel)}
                                                                    title="إبلاغ العميل بالاستلام من السائق"
                                                                >
                                                                    <Truck className="me-1 h-4 w-4" />
                                                                    تسليم السائق
                                                                </Button>

                                                            </TooltipTrigger>
                                                            <TooltipContent>تسجيل تسليم الطرد بواسطة السائق وإبلاغ العميل</TooltipContent>
                                                        </Tooltip>
                                                    </div>
                                                </TableCell>
                                            )}

                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>

                    </Card>
                )}
                <AlertDialog open={!!dialogState.type} onOpenChange={() => setDialogState({ type: null, parcel: null })}>
                    <AlertDialogContent dir="rtl">
                        <AlertDialogHeader>
                            <AlertDialogTitle>تأكيد الإجراء</AlertDialogTitle>
                            <AlertDialogDescription>
                                {dialogState.type === 'pay' && `هل أنت متأكد أنك استلمت مبلغ ${dialogState.parcel?.ShippingCost.toFixed(2)} ريال للطرد ${dialogState.parcel?.TrackingNumber}؟`}
                                {dialogState.type === 'pickup' && `هل أنت متأكد أن العميل استلم الطرد ${dialogState.parcel?.TrackingNumber} بنجاح؟`}
                                {dialogState.type === 'driverDelivery' && `هل أنت متأكد أنك تريد تأكيد تسليم الطرد ${dialogState.parcel?.TrackingNumber} عبر السائق وإبلاغ العميل؟`}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isUpdating}>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={handleConfirmAction} disabled={isUpdating}>
                                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "نعم، تأكيد"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </TooltipProvider>
    );
}

