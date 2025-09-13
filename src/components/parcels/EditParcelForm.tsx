"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react"; // Import useTransition
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FormField, FormItem, FormControl, FormMessage, Form, FormLabel as RHFFormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateParcel } from "@/actions/parcels";
import type { BranchForSelect, DeliveryCityForSelect, District, Parcel, AddParcelFormState, PaymentType } from "@/types";

interface EditParcelFormProps {
    parcel: Parcel;
    branches: BranchForSelect[];
    deliveryCities: DeliveryCityForSelect[];
    onSuccess: () => void;
    onCancel: () => void;
}

const clientUpdateParcelSchema = z.object({
    ParcelID: z.string(),
    TrackingNumber: z.string().min(5, "رقم التتبع مطلوب.").max(50, "رقم التتبع طويل جدًا."),
    SenderName: z.string().min(3, "يجب أن لا يقل اسم المرسل عن 3 أحرف."),
    SenderPhone: z.string().regex(/^7\d{8}$/, "يجب أن يكون رقم هاتف المرسل صالحًا ويبدأ بـ 7 ويتكون من 9 أرقام.").optional().or(z.literal('')),
    ReceiverName: z.string().min(3, "يجب أن لا يقل اسم المستلم عن 3 أحرف."),
    ReceiverPhone: z.string().regex(/^7\d{8}$/, "يجب أن يكون رقم هاتف المستلم صالحًا ويبدأ بـ 7 ويتكون من 9 أرقام.").optional().or(z.literal('')),
    ReceiverCity: z.string().min(1, "الرجاء اختيار مدينة المستلم."),
    ReceiverDistrict: z.string().min(1, "الرجاء اختيار منطقة المستلم."),
    OriginBranchID: z.string().min(1, "الرجاء اختيار فرع مصدر صالح."),
    DestinationBranchID: z.string().min(1, "الرجاء اختيار فرع وجهة صالح."),
    Notes: z.string().max(255, "الملاحظات طويلة جدًا (الحد الأقصى 255 حرفًا).").optional(),
    PaymentType: z.enum(['Prepaid', 'COD', 'Postpaid'], { required_error: "الرجاء تحديد نوع الدفع." }) as z.ZodType<PaymentType>,
    ShippingCost: z.string().min(1, "كلفة الإرسال إلزامية.").refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, { message: "كلفة الإرسال يجب أن تكون رقمًا موجبًا." }),
    ShippingTax: z.string().optional().refine(val => val === "" || val === undefined || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), { message: "ضريبة الشحن يجب أن تكون رقمًا غير سالب." }).transform(val => val === "" || val === undefined ? "0" : val),
});

type ClientParcelFormValues = z.infer<typeof clientUpdateParcelSchema>;

export function EditParcelForm({ parcel, branches, deliveryCities, onSuccess, onCancel }: EditParcelFormProps) {
    const [state, formAction] = useActionState<AddParcelFormState, FormData>(
        updateParcel,
        { success: false, message: "" } // Initial state now matches AddParcelFormState
    );
    // Use useTransition to get isPending and startTransition
    const [isPendingTransition, startTransition] = useTransition();

    // Combine isPending from useActionState and useTransition
    const combinedIsPending = isPendingTransition || state.isPending; // state.isPending is typically handled by useActionState itself

    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);

    const [availableDistricts, setAvailableDistricts] = useState<Pick<District, 'DistrictID' | 'Name'>[]>([]);

    const form = useForm<ClientParcelFormValues>({
        resolver: zodResolver(clientUpdateParcelSchema),
        defaultValues: {
            ParcelID: parcel.ParcelID,
            TrackingNumber: parcel.TrackingNumber,
            SenderName: parcel.SenderName,
            SenderPhone: parcel.SenderPhone || "",
            ReceiverName: parcel.ReceiverName,
            ReceiverPhone: parcel.ReceiverPhone || "",
            ReceiverCity: parcel.ReceiverCity,
            ReceiverDistrict: parcel.ReceiverDistrict,
            OriginBranchID: String(parcel.OriginBranchID),
            DestinationBranchID: String(parcel.DestinationBranchID),
            Notes: parcel.Notes || "",
            PaymentType: parcel.PaymentType,
            ShippingCost: String(parcel.ShippingCost),
            ShippingTax: String(parcel.ShippingTax || "0"),
        },
    });

    useEffect(() => {
        const city = deliveryCities.find(c => c.Name === parcel.ReceiverCity);
        if (city) {
            setAvailableDistricts(city.Districts || []);
        }
    }, [deliveryCities, parcel.ReceiverCity]);

    useEffect(() => {
        // Ensure ReceiverDistrict is valid for the selected city or reset it
        if (parcel.ReceiverCity) {
            const city = deliveryCities.find(c => c.Name === parcel.ReceiverCity);
            if (city) {
                const districtsInCity = city.Districts || [];
                setAvailableDistricts(districtsInCity);
                if (!districtsInCity.some(d => d.Name === parcel.ReceiverDistrict)) {
                    form.setValue("ReceiverDistrict", "", { shouldValidate: true });
                }
            }
        }
    }, [deliveryCities, parcel.ReceiverCity, parcel.ReceiverDistrict, form]);


    useEffect(() => {
        if (state?.success) {
            toast({ title: "نجاح", description: state.message });
            onSuccess();
        } else if (state?.message) {
            const description = state.errors && Object.keys(state.errors).length > 0
                ? Object.values(state.errors).flat().join(". ")
                : state.message;
            toast({ title: "خطأ", description: description, variant: "destructive" });
        }
    }, [state, toast, onSuccess]);

    const handleCityChange = (cityName: string) => {
        form.setValue("ReceiverCity", cityName, { shouldValidate: true });
        const city = deliveryCities.find(c => c.Name === cityName);
        setAvailableDistricts(city?.Districts || []);
        form.setValue("ReceiverDistrict", "", { shouldValidate: true });
    };

    const onSubmit = (data: ClientParcelFormValues) => {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(key, String(value));
            }
        });

        // FIX: Wrap formAction call in startTransition
        startTransition(() => {
            formAction(formData);
        });
    };

    return (
        <Form {...form}>
            <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
                <input type="hidden" name="ParcelID" value={form.watch("ParcelID")} />

                <div className="grid sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="TrackingNumber" render={({ field }) => (<FormItem> <RHFFormLabel>رقم التتبع</RHFFormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem>)} />
                    <FormField control={form.control} name="SenderName" render={({ field }) => (<FormItem> <RHFFormLabel>اسم المرسل</RHFFormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem>)} />
                    <FormField control={form.control} name="SenderPhone" render={({ field }) => (<FormItem> <RHFFormLabel>هاتف المرسل</RHFFormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem>)} />
                    <FormField control={form.control} name="ReceiverName" render={({ field }) => (<FormItem> <RHFFormLabel>اسم المستلم</RHFFormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem>)} />
                    <FormField control={form.control} name="ReceiverPhone" render={({ field }) => (<FormItem> <RHFFormLabel>هاتف المستلم</RHFFormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem>)} />
                    <FormField control={form.control} name="ReceiverCity" render={({ field }) => (<FormItem> <RHFFormLabel>مدينة المستلم</RHFFormLabel> <Select onValueChange={handleCityChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{deliveryCities.map(c => <SelectItem key={c.CityID} value={c.Name}>{c.Name}</SelectItem>)}</SelectContent></Select> <FormMessage /> </FormItem>)} />
                    <FormField control={form.control} name="ReceiverDistrict" render={({ field }) => (<FormItem> <RHFFormLabel>منطقة المستلم</RHFFormLabel> <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{availableDistricts.map(d => <SelectItem key={d.Name} value={d.Name}>{d.Name}</SelectItem>)}</SelectContent></Select> <FormMessage /> </FormItem>)} />
                    <FormField control={form.control} name="OriginBranchID" render={({ field }) => (<FormItem> <RHFFormLabel>فرع المصدر</RHFFormLabel> <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{branches.map(b => <SelectItem key={b.BranchID} value={String(b.BranchID)}>{b.Name}</SelectItem>)}</SelectContent></Select> <FormMessage /> </FormItem>)} />
                    <FormField control={form.control} name="DestinationBranchID" render={({ field }) => (<FormItem> <RHFFormLabel>فرع الوجهة</RHFFormLabel> <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{branches.map(b => <SelectItem key={b.BranchID} value={String(b.BranchID)}>{b.Name}</SelectItem>)}</SelectContent></Select> <FormMessage /> </FormItem>)} />
                    <FormField control={form.control} name="ShippingCost" render={({ field }) => (<FormItem> <RHFFormLabel>كلفة الشحن</RHFFormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem>)} />
                    <FormField control={form.control} name="ShippingTax" render={({ field }) => (<FormItem> <RHFFormLabel>تامين الشحن</RHFFormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem>)} />
                </div>
                <FormField control={form.control} name="PaymentType" render={({ field }) => (<FormItem> <RHFFormLabel>نوع الدفع</RHFFormLabel> <FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4"><FormItem><FormControl><RadioGroupItem value="Prepaid" /></FormControl><RHFFormLabel>مدفوع مسبقًا</RHFFormLabel></FormItem><FormItem><FormControl><RadioGroupItem value="COD" /></FormControl><RHFFormLabel>عند الاستلام</RHFFormLabel></FormItem><FormItem><FormControl><RadioGroupItem value="Postpaid" /></FormControl><RHFFormLabel>آجل</RHFFormLabel></FormItem></RadioGroup></FormControl> <FormMessage /> </FormItem>)} />
                <FormField control={form.control} name="Notes" render={({ field }) => (<FormItem> <RHFFormLabel>ملاحظات</RHFFormLabel> <FormControl><Textarea {...field} /></FormControl> <FormMessage /> </FormItem>)} />

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={combinedIsPending}>إلغاء</Button>
                    <Button type="submit" disabled={combinedIsPending}>
                        {combinedIsPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                        <Save className="me-2 h-4 w-4" />
                        حفظ التعديلات
                    </Button>
                </div>
            </form>
        </Form>
    );
}