"use client";

import { useActionState, useEffect, useRef, useTransition } from "react"; // ✅ Added useTransition
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import { createManualDebt } from "@/actions/debts";
import type { ManualDebtFormState, DebtMovementType } from "@/types";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { cn } from "@/lib/utils";
import { Form as UIForm, FormField, FormControl, FormMessage, FormItem } from '@/components/ui/form';

interface Debtor {
    id: string | number;
    name: string;
}

interface AddManualDebtFormProps {
    debtorType: 'Driver' | 'Branch' | 'Customer';
    debtors: Debtor[];
    onSuccess: () => void;
}

const formSchema = z.object({
    DebtorID: z.string().min(1, "الرجاء اختيار الطرف الآخر."),
    Amount: z.coerce.number().positive("المبلغ يجب أن يكون رقمًا موجبًا."),
    Notes: z.string().min(3, "يجب أن لا تقل الملاحظات عن 3 أحرف.").max(255, "الملاحظات طويلة جدًا."),
    DebtMovementType: z.enum(['Debtor', 'Creditor'], { required_error: "يجب تحديد نوع الحركة." }) as z.ZodType<DebtMovementType>,
});

type FormValues = z.infer<typeof formSchema>;

export function AddManualDebtForm({ debtorType, debtors, onSuccess }: AddManualDebtFormProps) {
    const [state, formAction, isPendingAction] = useActionState<ManualDebtFormState, FormData>(createManualDebt, undefined);
    const { toast } = useToast();
    const [isPendingTransition, startTransition] = useTransition(); // ✅ Initialized useTransition

    // Combine pending states from useActionState and useTransition
    const isPending = isPendingAction || isPendingTransition;

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            DebtorID: "",
            Amount: 0,
            Notes: "",
            DebtMovementType: 'Debtor'
        },
    });

    useEffect(() => {
        if (state?.success) {
            toast({ title: "نجاح", description: state.message });
            form.reset();
            onSuccess();
        } else if (state?.message && !state.success) {
            toast({ variant: "destructive", title: "خطأ", description: state.message });
            if (state.errors) {
                Object.entries(state.errors).forEach(([key, value]) => {
                    if (value && value.length > 0) {
                        form.setError(key as keyof FormValues, { message: value.join(', ') });
                    }
                });
            }
        }
    }, [state, toast, onSuccess, form]);

    const handleSubmit = (data: FormValues) => {
        const formData = new FormData();
        const debtorName = debtors.find(d => String(d.id) === data.DebtorID)?.name || '';

        formData.append('DebtorID', data.DebtorID);
        formData.append('Amount', String(data.Amount));
        formData.append('Notes', data.Notes);
        formData.append('DebtMovementType', data.DebtMovementType);
        formData.append('DebtorType', debtorType);
        formData.append('DebtorName', debtorName);

        // ✅ Wrap the formAction call in startTransition
        startTransition(() => {
            formAction(formData);
        });
    };

    const debtorLabel = debtorType === 'Driver' ? 'السائق' : debtorType === 'Branch' ? 'الفرع' : 'العميل';

    return (
        <UIForm {...form}>
            <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-4"
            >
                {/* Hidden inputs to pass extra data to the server action */}
                {/* These are now redundant as formData is constructed manually in handleSubmit */}
                {/* <input type="hidden" name="DebtorType" value={debtorType} />
                <input type="hidden" name="DebtorName" value={selectedDebtorName} /> */}

                <FormField
                    control={form.control}
                    name="DebtMovementType"
                    render={({ field }) => (
                        <FormItem className="space-y-2">
                            <Label>نوع الحركة</Label>
                            <FormControl>
                                <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="grid grid-cols-2 gap-4"
                                    name={field.name}
                                >
                                    <Label htmlFor="creditor-radio" className={cn("flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer", field.value === 'Creditor' && "border-primary")}>
                                        <RadioGroupItem value="Creditor" id="creditor-radio" className="sr-only" />
                                        مدين (له)
                                        <span className="text-xs text-muted-foreground">(سلفة/دين على الطرف الآخر)</span>
                                    </Label>
                                    <Label htmlFor="debtor-radio" className={cn("flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer", field.value === 'Debtor' && "border-primary")}>
                                        <RadioGroupItem value="Debtor" id="debtor-radio" className="sr-only" />
                                        دائن (عليه)
                                        <span className="text-xs text-muted-foreground">(أمانة/مبلغ للطرف الآخر)</span>
                                    </Label>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="DebtorID"
                    render={({ field }) => (
                        <FormItem>
                            <Label>{debtorLabel}</Label>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={`اختر ${debtorLabel}...`} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {debtors.map(debtor => (
                                        <SelectItem key={debtor.id} value={String(debtor.id)}>
                                            {debtor.name}
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
                    name="Amount"
                    render={({ field }) => (
                        <FormItem>
                            <Label>المبلغ (ر.ي)</Label>
                            <FormControl>
                                <Input type="number" placeholder="أدخل المبلغ" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="Notes"
                    render={({ field }) => (
                        <FormItem>
                            <Label>السبب / ملاحظات</Label>
                            <FormControl>
                                <Textarea placeholder="مثال: سلفة نقدية، قيمة وقود..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={isPending}>
                        {isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
                        {isPending ? "جاري الحفظ..." : "حفظ الذمة"}
                    </Button>
                </div>
            </form>
        </UIForm>
    );
}
