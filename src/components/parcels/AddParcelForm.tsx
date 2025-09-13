// src/components/parcels/AddParcelForm.tsx

"use client";

import {
    Percent, Home, CreditCard, Barcode, Wallet, StickyNote, Banknote,
    Printer, PackagePlus, RotateCcw, Loader2, User, Phone, MapPin, Package, DollarSign, CreditCard as CreditCardIcon, Wand2
} from "lucide-react";

import { useActionState, useEffect, useRef, useState, startTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter,
} from "@/components/ui/card";
import { FormField, FormItem, FormControl, FormMessage, Form, FormLabel as RHFFormLabel, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { addParcel } from "@/actions/parcels";
import type {
    BranchForSelect,
    DeliveryCityForSelect,
    District,
    Parcel as ParcelType,
    AddParcelFormState,
    PaymentType,
    SystemSetting
} from "@/types";
import { ParcelLabel } from "./ParcelLabel";
import { cn } from "@/lib/utils";

interface AddParcelFormProps {
    branches: BranchForSelect[];
    deliveryCities: DeliveryCityForSelect[];
    formAction: (formData: FormData) => Promise<any>;
    userBranchId?: number | null;
    systemSettings: SystemSetting | null; // ✅ تمت إضافة الخاصية الجديدة
}

const clientAddParcelSchema = z.object({
    SenderName: z.string().min(3, "يجب أن لا يقل اسم المرسل عن 3 أحرف."),
    SenderPhone: z.string().regex(/^(70|71|73|77|78)\d{7}$/, "يجب أن يكون رقم الهاتف مكونًا من 9 أرقام ويبدأ بـ 70, 71, 73, 77, أو 78.").optional().or(z.literal('')),
    ReceiverName: z.string().min(3, "يجب أن لا يقل اسم المستلم عن 3 أحرف."),
    ReceiverPhone: z.string().regex(/^(70|71|73|77|78)\d{7}$/, "يجب أن يكون رقم الهاتف مكونًا من 9 أرقام ويبدأ بـ 70, 71, 73, 77, أو 78.").optional().or(z.literal('')),
    ReceiverCity: z.string().min(1, "الرجاء اختيار مدينة المستلم."),
    ReceiverDistrict: z.string().min(1, "الرجاء اختيار منطقة المستلم."),
    TrackingNumber: z.string().min(5, "رقم التتبع مطلوب.").max(50, "رقم التتبع طويل جدًا."),
    OriginBranchID: z.string().min(1, "الرجاء اختيار فرع مصدر صالح."),
    DestinationBranchID: z.string().min(1, "الرجاء اختيار فرع وجهة صالح."),
    Notes: z.string().optional(),
    PaymentType: z.enum(['Prepaid', 'COD', 'Postpaid'], { required_error: "الرجاء تحديد نوع الدفع." }) as z.ZodType<PaymentType>,
    ShippingCost: z.string().min(1, "كلفة الإرسال إلزامية.").refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, { message: "كلفة الإرسال يجب أن تكون رقمًا موجبًا." }),
    ShippingTax: z.string().optional().refine(val => val === "" || val === undefined || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), { message: "ضريبة الشحن يجب أن تكون رقمًا غير سالب." }),
});

type ClientParcelFormValues = z.infer<typeof clientAddParcelSchema>;

// ✅ تم حذف دالة getNextTrackingNumber التي كانت تستخدم localStorage

export function AddParcelForm({ branches = [], deliveryCities = [], userBranchId, systemSettings }: AddParcelFormProps) {
    const actionWrapper = async (
        _state: AddParcelFormState,
        formData: FormData
    ): Promise<AddParcelFormState> => {
        const result = await addParcel(formData);

        if (!result) {
            return {
                success: false,
                message: 'حدث خطأ: لم يتم استلام استجابة من الخادم',
            };
        }

        if (result.success) {
            // ✅ تم حذف التحديث من localStorage
            return {
                success: true,
                message: result.message ?? 'تمت إضافة الطرد بنجاح',
                trackingNumber: result.trackingNumber,
            };
        } else {
            return {
                success: false,
                errors: result.errors,
                message: result.message ?? 'حدث خطأ أثناء إضافة الطرد',
            };
        }
    };

    const [state, formAction, isPending] = useActionState<AddParcelFormState, FormData>(
        actionWrapper,
        {} as AddParcelFormState
    );

    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);
    const [selectedCityName, setSelectedCityName] = useState<string | undefined>(undefined);
    const [availableDistricts, setAvailableDistricts] = useState<Pick<District, 'DistrictID' | 'Name'>[]>([]);
    const [currentTrackingNumber, setCurrentTrackingNumber] = useState<string>("");
    const [isOriginBranchDisabled, setIsOriginBranchDisabled] = useState(false);
    const [parcelForLabel, setParcelForLabel] = useState<ParcelType | null>(null);
    const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);

    const activeDeliveryCities = deliveryCities.filter(city => city.IsActive);

    useEffect(() => {
        console.log("AddParcelForm received branches:", branches);
        console.log("AddParcelForm received deliveryCities:", deliveryCities);
        console.log("Active delivery cities for dropdown:", activeDeliveryCities);
    }, [branches, deliveryCities, activeDeliveryCities]);


    const form = useForm<ClientParcelFormValues>({
        resolver: zodResolver(clientAddParcelSchema),
        defaultValues: {
            SenderName: "", SenderPhone: "", ReceiverName: "", ReceiverPhone: "",
            ReceiverCity: "", ReceiverDistrict: "", TrackingNumber: "",
            OriginBranchID: "", DestinationBranchID: "", Notes: "", PaymentType: 'Prepaid',
            ShippingCost: "", ShippingTax: "",
        },
    });

    // ✅ تم تحديث دالة توليد رقم التتبع لاستخدام prop
    const handleGenerateTrackingNumber = () => {
        if (systemSettings?.TrackingPrefix && systemSettings?.NextTrackingSequence) {
            const newTrackingNumber = `${systemSettings.TrackingPrefix}${systemSettings.NextTrackingSequence}`;
            form.setValue("TrackingNumber", newTrackingNumber, { shouldValidate: true });
            setCurrentTrackingNumber(newTrackingNumber);
        } else {
            console.error("Tracking number settings are not available from server.");
            setCurrentTrackingNumber("");
        }
    };

    // ✅ تم تحديث دالة تعيين الفرع المرسل لاستخدام userBranchId
    const setSystemOriginBranch = () => {
        if (userBranchId) {
            const branchExists = branches.some(b => b.BranchID === userBranchId);
            if (branchExists) {
                form.setValue("OriginBranchID", userBranchId.toString(), { shouldValidate: true });
                setIsOriginBranchDisabled(true);
            } else {
                setIsOriginBranchDisabled(false);
            }
        } else {
            setIsOriginBranchDisabled(false);
        }
    };

    useEffect(() => {
        handleGenerateTrackingNumber();
        setSystemOriginBranch();
    }, [branches, userBranchId, systemSettings]); // ✅ تم إضافة userBranchId و systemSettings كاعتماديات


    useEffect(() => {
        if (state?.message) {
            toast({
                title: state.success ? "نجاح" : "خطأ في الإدخال",
                description: state.message,
                variant: state.success ? "default" : "destructive",
            });
            if (state.success && state.trackingNumber) {
                const formDataValues = form.getValues();
                const originBranch = branches.find(b => b.BranchID.toString() === formDataValues.OriginBranchID);
                const destinationBranch = branches.find(b => b.BranchID.toString() === formDataValues.DestinationBranchID);
                const options = {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                };


                const newParcel: ParcelType = {
                    ParcelID: state.trackingNumber,
                    TrackingNumber: state.trackingNumber,
                    SenderName: formDataValues.SenderName,
                    SenderPhone: formDataValues.SenderPhone || null,
                    ReceiverName: formDataValues.ReceiverName,
                    ReceiverPhone: formDataValues.ReceiverPhone || null,
                    ReceiverCity: formDataValues.ReceiverCity,
                    ReceiverDistrict: formDataValues.ReceiverDistrict,
                    OriginBranchID: parseInt(formDataValues.OriginBranchID),
                    DestinationBranchID: parseInt(formDataValues.DestinationBranchID),
                    Status: 'قيد المعالجة',
                    Notes: formDataValues.Notes || null,
                    ShippingCost: parseFloat(formDataValues.ShippingCost),
                    ShippingTax: formDataValues.ShippingTax ? parseFloat(formDataValues.ShippingTax) : 0,
                    DriverCommission: parseFloat(formDataValues.ShippingCost) * 0.7,
                    PaymentType: formDataValues.PaymentType,
                    IsPaid: formDataValues.PaymentType === 'Prepaid',
                    IsPickedUpByReceiver: false,
                    CreatedAt: new Date().toString(),
                    UpdatedAt: new Date().toString(),
                };
                setParcelForLabel(newParcel);
                setIsLabelModalOpen(true);

                form.reset({
                    SenderName: "", SenderPhone: "", ReceiverName: "", ReceiverPhone: "",
                    ReceiverCity: "", ReceiverDistrict: "", TrackingNumber: "",
                    OriginBranchID: "", DestinationBranchID: "", Notes: "", PaymentType: 'Prepaid',
                    ShippingCost: "", ShippingTax: "",
                });
                setSelectedCityName(undefined);
                setAvailableDistricts([]);
                setCurrentTrackingNumber("");
                handleGenerateTrackingNumber();
                setSystemOriginBranch();
            } else if (state.errors) {
                console.log("Validation errors (client-side form state):", state.errors);
                (Object.keys(state.errors) as Array<keyof ClientParcelFormValues>).forEach((key) => {
                    const fieldErrors = state.errors![key];
                    if (fieldErrors && fieldErrors.length > 0) {
                        form.setError(key, { type: 'server', message: fieldErrors.join(', ') });
                    }
                });
            }
        }
    }, [state, toast, form, branches]);

    const handleCityChange = (cityName: string) => {
        form.setValue("ReceiverCity", cityName, { shouldValidate: true });
        setSelectedCityName(cityName);
        const city = activeDeliveryCities.find(c => c.Name === cityName);
        setAvailableDistricts(city?.Districts || []);
        form.setValue("ReceiverDistrict", "", { shouldValidate: true });
    };


    const onSubmit = (data: ClientParcelFormValues) => {
        if (!data.TrackingNumber) {
            toast({ title: "خطأ", description: "رقم التتبع مفقود", variant: "destructive" });
            return;
        }

        const formData = new FormData();

        Object.entries(data).forEach(([key, value]) => {
            if (["OriginBranchID", "DestinationBranchID"].includes(key)) {
                formData.append(key, value ? String(Number(value)) : "");
            } else {
                formData.append(key, value ?? "");
            }
        });

        startTransition(() => {
            formAction(formData);
        });
    };

    const printModalContent = () => {
        const modalContent = document.getElementById('parcel-label-modal-content');
        if (modalContent) {
            const printWindow = window.open('', '', 'height=600,width=800');
            if (printWindow) {
                const styles = Array.from(document.styleSheets)
                    .map(styleSheet => {
                        try {
                            return Array.from(styleSheet.cssRules)
                                .map(rule => rule.cssText)
                                .join('\n');
                        } catch (e) {
                            if (styleSheet.href) {
                                return `<link rel="stylesheet" href="${styleSheet.href}">`;
                            }
                            return '';
                        }
                    })
                    .filter(Boolean)
                    .join('\n');

                printWindow.document.write('<html><head><title>طباعة الملصق</title>');
                printWindow.document.write(`<style>${styles}</style>`);
                printWindow.document.write(`
          <style>
            body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
            .parcel-label-print-container { transform: scale(1.5); }
          </style>
        `);
                printWindow.document.write('</head><body>');
                printWindow.document.write(modalContent.innerHTML);
                printWindow.document.write('<script>setTimeout(function(){ window.print(); window.close(); }, 500);</script>');
                printWindow.document.write('</body></html>');
                printWindow.document.close();
            }
        }
    };

    return (
        <>
            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle className="text-2xl flex items-center gap-2">
                        <PackagePlus className="h-7 w-7 text-primary" />
                        إضافة طرد جديد
                    </CardTitle>
                    <CardDescription>يرجى تعبئة الحقول أدناه لإضافة طرد جديد إلى النظام.</CardDescription>
                </CardHeader>
                <Form {...form}>
                    <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <CardContent className="space-y-8 pt-6">

                            {/* بيانات المرسل */}
                            <section className="space-y-4 p-4 border rounded-md shadow-sm">
                                <h3 className="text-xl font-semibold text-primary border-b pb-2 mb-4 flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    بيانات المرسل
                                </h3>
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="SenderName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <RHFFormLabel htmlFor="SenderName" className="flex items-center gap-1"><User size={16} />اسم المرسل</RHFFormLabel>
                                                <FormControl>
                                                    <Input id="SenderName" placeholder="مثال: خالد الأحمدي" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="SenderPhone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <RHFFormLabel htmlFor="SenderPhone" className="flex items-center gap-1"><Phone size={16} />هاتف المرسل</RHFFormLabel>
                                                <FormControl>
                                                    <Input
                                                        id="SenderPhone"
                                                        type="tel"
                                                        placeholder="مثال: 7xxxxxxxx (9 أرقام)"
                                                        maxLength={9}
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </section>

                            {/* بيانات المستلم */}
                            <section className="space-y-4 p-4 border rounded-md shadow-sm">
                                <h3 className="text-xl font-semibold text-primary border-b pb-2 mb-4 flex items-center gap-2">
                                    <MapPin className="h-5 w-5" />
                                    بيانات المستلم
                                </h3>
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="ReceiverName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <RHFFormLabel htmlFor="ReceiverName" className="flex items-center gap-1"><User size={16} />اسم المستلم</RHFFormLabel>
                                                <FormControl>
                                                    <Input id="ReceiverName" placeholder="مثال: احمد محمد الحداد" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="ReceiverPhone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <RHFFormLabel htmlFor="ReceiverPhone" className="flex items-center gap-1"><Phone size={16} />هاتف المستلم</RHFFormLabel>
                                                <FormControl>
                                                    <Input id="ReceiverPhone" type="tel" maxLength={9}
                                                        placeholder="مثال: 7xxxxxxxx (9 أرقام)" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="ReceiverCity"
                                        render={({ field }) => (
                                            <FormItem>
                                                <RHFFormLabel htmlFor="ReceiverCity" className="flex items-center gap-1"><MapPin size={16} />وجهة الرحلة</RHFFormLabel>
                                                <Select
                                                    onValueChange={(value) => handleCityChange(value)}
                                                    value={field.value || ""}
                                                    disabled={activeDeliveryCities.length === 0}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger id="ReceiverCity">
                                                            <SelectValue placeholder={activeDeliveryCities.length === 0 ? "لا توجد مدن توصيل معرفة" : "اختر مدينة المستلم"} />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {activeDeliveryCities.map((city) => (
                                                            <SelectItem key={city.CityID} value={city.Name}>
                                                                {city.Name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="ReceiverDistrict"
                                        render={({ field }) => (
                                            <FormItem>
                                                <RHFFormLabel htmlFor="ReceiverDistrict" className="flex items-center gap-1"><MapPin size={16} />مدينة المستلم (الحي)</RHFFormLabel>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    value={field.value || ""}
                                                    disabled={!selectedCityName || availableDistricts.length === 0}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger id="ReceiverDistrict">
                                                            <SelectValue placeholder={!selectedCityName ? "اختر مدينة أولاً" : availableDistricts.length === 0 ? "لا توجد مناطق لهذه المدينة" : "اختر منطقة المستلم"} />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {availableDistricts.map((district) => (
                                                            <SelectItem key={district.DistrictID} value={district.Name}>
                                                                {district.Name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </section>

                            {/* تفاصيل الشحنة */}
                            <section className="space-y-4 p-4 border rounded-md shadow-sm">
                                <h3 className="text-xl font-semibold text-primary border-b pb-2 mb-4 flex items-center gap-2">
                                    <Package className="h-5 w-5" />
                                    تفاصيل الشحنة
                                </h3>

                                <div className="grid sm:grid-cols-2 gap-6">

                                    {/* الفرع المرسل (Origin) - يتم تعيينه تلقائيًا */}
                                    <FormField
                                        control={form.control}
                                        name="OriginBranchID"
                                        render={({ field }) => (
                                            <FormItem>
                                                <RHFFormLabel htmlFor="OriginBranchID" className="flex items-center gap-1">
                                                    <Home size={16} /> الفرع المرسل
                                                </RHFFormLabel>
                                                <Select disabled value={field.value?.toString()} >
                                                    <FormControl>
                                                        <SelectTrigger id="OriginBranchID">
                                                            <SelectValue placeholder="يتم التعيين تلقائيًا" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {branches.map(branch => (
                                                            <SelectItem key={branch.BranchID} value={branch.BranchID.toString()}>
                                                                {branch.Name} - {branch.City}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />


                                    <FormField name="DestinationBranchID" control={form.control} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>فرع الوجهة</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {branches.map(b => (
                                                        <SelectItem key={b.BranchID} value={b.BranchID.toString()}>{b.Name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />


                                    {/* رقم التتبع */}
                                    <FormField
                                        control={form.control}
                                        name="TrackingNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <RHFFormLabel htmlFor="TrackingNumber" className="flex items-center gap-1">
                                                    <Barcode size={16} /> رقم التتبع
                                                </RHFFormLabel>
                                                <FormControl>
                                                    <Input
                                                        id="TrackingNumber"
                                                        value={currentTrackingNumber}
                                                        readOnly
                                                        placeholder="سيتم توليده تلقائيًا"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* الملاحظات */}
                                    <FormField
                                        control={form.control}
                                        name="Notes"
                                        render={({ field }) => (
                                            <FormItem className="sm:col-span-2">
                                                <RHFFormLabel htmlFor="Notes" className="flex items-center gap-1">
                                                    <StickyNote size={16} /> نوع الشحنة | ملاحظات 
                                                </RHFFormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        id="Notes"
                                                        placeholder="أدخل  نوع وأي تفاصيل إضافية تخص الشحنة..."
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </section>


                            {/* التفاصيل المالية */}
                            <section className="space-y-4 p-4 border rounded-md shadow-sm">
                                <h3 className="text-xl font-semibold text-primary border-b pb-2 mb-4 flex items-center gap-2">
                                    <DollarSign className="h-5 w-5" />
                                    التفاصيل المالية
                                </h3>
                                <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                    <FormField
                                        control={form.control}
                                        name="ShippingCost"
                                        render={({ field }) => (
                                            <FormItem>
                                                <RHFFormLabel htmlFor="ShippingCost" className="flex items-center gap-1"><DollarSign size={16} />كلفة الإرسال (ر.ي)</RHFFormLabel>
                                                <FormControl>
                                                    <Input id="ShippingCost" type="number" step="0.01" placeholder="مثال: 2500" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="ShippingTax"
                                        render={({ field }) => (
                                            <FormItem>
                                                <RHFFormLabel htmlFor="ShippingTax" className="flex items-center gap-1"><Percent size={16} />ضريبة التأمين (ر.ي) (اختياري)</RHFFormLabel>
                                                <FormControl>
                                                    <Input id="ShippingTax" type="number" step="0.01" placeholder="مثال: 150 أو 0" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="PaymentType"
                                        render={({ field }) => (
                                            <FormItem className="md:col-span-2 space-y-3">
                                                <RHFFormLabel className="flex items-center gap-1"><CreditCardIcon size={16} />نوع الدفع</RHFFormLabel>
                                                <FormControl>
                                                    <RadioGroup
                                                        onValueChange={field.onChange}
                                                        defaultValue={field.value}
                                                        className="flex flex-col sm:flex-row gap-4"
                                                    >
                                                        <FormItem className="flex-1">
                                                            <FormControl>
                                                                <RadioGroupItem value="Prepaid" id="prepaid" className="sr-only" />
                                                            </FormControl>
                                                            <RHFFormLabel htmlFor="prepaid" className={cn("flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer", field.value === 'Prepaid' && "border-primary")}>
                                                                <Banknote className="mb-3 h-6 w-6" />
                                                                مدفوع مسبقًا
                                                            </RHFFormLabel>
                                                        </FormItem>
                                                        <FormItem className="flex-1">
                                                            <FormControl>
                                                                <RadioGroupItem value="COD" id="cod" className="sr-only" />
                                                            </FormControl>
                                                            <RHFFormLabel htmlFor="cod" className={cn("flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer", field.value === 'COD' && "border-primary")}>
                                                                <Wallet className="mb-3 h-6 w-6" />
                                                                الدفع عند الاستلام
                                                            </RHFFormLabel>
                                                        </FormItem>
                                                        <FormItem className="flex-1">
                                                            <FormControl>
                                                                <RadioGroupItem value="Postpaid" id="postpaid" className="sr-only" />
                                                            </FormControl>
                                                            <RHFFormLabel htmlFor="postpaid" className={cn("flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer", field.value === 'Postpaid' && "border-primary")}>
                                                                <CreditCard className="mb-3 h-6 w-6" />
                                                                دفع آجل
                                                            </RHFFormLabel>
                                                        </FormItem>
                                                    </RadioGroup>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </section>

                        </CardContent>
                        <CardFooter className="flex flex-col sm:flex-row justify-start items-start sm:items-center gap-2 pt-6 border-t">
                            <Button type="submit" className="w-full sm:w-auto" disabled={isPending || !form.watch("TrackingNumber")}>
                                {isPending ? (
                                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <PackagePlus className="me-2 h-4 w-4" />
                                )}
                                {isPending ? "جاري الإضافة..." : "إضافة الطرد"}
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                className="w-full sm:w-auto"
                                onClick={() => {
                                    form.reset({
                                        SenderName: "", SenderPhone: "", ReceiverName: "", ReceiverPhone: "",
                                        ReceiverCity: "", ReceiverDistrict: "", TrackingNumber: "",
                                        OriginBranchID: isOriginBranchDisabled && form.getValues("OriginBranchID") ? form.getValues("OriginBranchID") : "",
                                        DestinationBranchID: "", Notes: "", PaymentType: 'Prepaid',
                                        ShippingCost: "", ShippingTax: "0"
                                    });
                                    setSelectedCityName(undefined);
                                    setAvailableDistricts([]);
                                    setCurrentTrackingNumber("");
                                    handleGenerateTrackingNumber();
                                }}
                                disabled={isPending}
                            >
                                <RotateCcw className="me-2 h-4 w-4" />
                                إعادة تعيين
                            </Button>
                        </CardFooter>
                    </form>
                </Form>

            </Card>
            <Dialog open={isLabelModalOpen} onOpenChange={setIsLabelModalOpen}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden" id="parcel-label-modal-content">
                    <DialogHeader className="p-4 pb-0">
                        <DialogTitle>معاينة ملصق الشحن</DialogTitle>
                    </DialogHeader>

                    <div className="p-4 flex justify-center items-center">
                        {parcelForLabel && (
                            <ParcelLabel
                                parcel={parcelForLabel}
                                originBranch={{
                                    ...(branches.find(b => b.BranchID === parcelForLabel.OriginBranchID)!),
                                    Address: "",
                                    CreatedAt: new Date().toLocaleString(),
                                    UpdatedAt: new Date().toLocaleString()
                                }}
                                destinationBranch={{
                                    ...(branches.find(b => b.BranchID === parcelForLabel.DestinationBranchID)!),
                                    Address: "",
                                    CreatedAt: new Date().toLocaleString(),
                                    UpdatedAt: new Date().toLocaleString()
                                }}
                            />
                        )}
                    </div>

                    <DialogFooter className="p-4 pt-0 border-t">
                        <Button type="button" variant="outline" onClick={() => setIsLabelModalOpen(false)}>إغلاق</Button>
                        <Button type="button" onClick={printModalContent}>
                            <Printer className="me-2 h-4 w-4" /> طباعة
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </>
    );
}
