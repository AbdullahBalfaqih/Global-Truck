
"use client";

import { useActionState, useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { createCashTransaction } from '@/actions/cashbox';
import type { CashboxFormState, Branch } from '@/types';
import { Loader2, CalendarIcon, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getSession } from "@/actions/auth";

const formSchema = z.object({
    TransactionType: z.enum(['Income', 'Expense'], { required_error: "الرجاء تحديد نوع الحركة." }),
    Amount: z.coerce.number().positive("المبلغ يجب أن يكون رقمًا موجبًا."),
    Description: z.string().min(2, "الوصف مطلوب.").max(255),
    BranchID: z.string().min(1, "الرجاء اختيار فرع لإضافة الحركة إليه."),
    TransactionDate: z.date().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddTransactionFormProps {
    branches: Pick<Branch, 'BranchID' | 'Name'>[];
}

export function AddTransactionForm({ branches }: AddTransactionFormProps) {
    const [session, setSession] = useState<any>(null);
    const [state, formAction, isPending] = useActionState<CashboxFormState, FormData>(createCashTransaction, undefined);
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            TransactionType: 'Expense',
            Amount: 0,
            Description: '',
            BranchID: '',
            TransactionDate: new Date(),
        },
    });

    useEffect(() => {
        const fetchSession = async () => {
            const sessionData = await getSession();
            setSession(sessionData);
            if (sessionData?.branchId && branches.some(b => b.BranchID === sessionData.branchId)) {
                form.setValue('BranchID', String(sessionData.branchId));
            }
        };
        fetchSession();
    }, [branches, form]);

    useEffect(() => {
        if (!state) return;

        if (state.success) {
            toast({ title: "نجاح", description: state.message });
            form.reset({
                TransactionType: 'Expense',
                Amount: 0,
                Description: '',
                BranchID: session?.branchId ? String(session.branchId) : '',
                TransactionDate: new Date(),
            });
            // revalidatePath on server action handles data refresh.
        } else if (state.message) {
            toast({ variant: "destructive", title: "خطأ", description: state.message });
        }
    }, [state, toast, form, session]);

    return (
        <form
            ref={formRef}
            action={(formData) => {
                const date = form.getValues('TransactionDate');
                if (date) {
                    formData.set('TransactionDate', format(date, 'yyyy-MM-dd'));
                }
                formAction(formData);
            }}
            className="space-y-4"
        >
            <Controller
                name="TransactionType"
                control={form.control}
                render={({ field }) => (
                    <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="grid grid-cols-2 gap-4"
                        name={field.name}
                    >
                        <Label htmlFor="expense-radio" className={cn("flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer", field.value === 'Expense' && "border-primary")}>
                            <RadioGroupItem value="Expense" id="expense-radio" className="sr-only" />
                            <ArrowDownCircle className="mb-3 h-6 w-6 text-red-500" />
                            مصروف
                        </Label>
                        <Label htmlFor="income-radio" className={cn("flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer", field.value === 'Income' && "border-primary")}>
                            <RadioGroupItem value="Income" id="income-radio" className="sr-only" />
                            <ArrowUpCircle className="mb-3 h-6 w-6 text-green-500" />
                            إيراد
                        </Label>
                    </RadioGroup>
                )}
            />

            <div className="space-y-1">
                <Label htmlFor="Amount">المبلغ (ر.ي)</Label>
                <Input id="Amount" type="number" {...form.register("Amount")} name="Amount" placeholder="أدخل المبلغ" />
                {form.formState.errors.Amount && <p className="text-sm font-medium text-destructive">{form.formState.errors.Amount.message}</p>}
            </div>

            <div className="space-y-1">
                <Label htmlFor="Description">الوصف / السبب</Label>
                <Textarea id="Description" {...form.register("Description")} name="Description" placeholder="مثال: شراء أدوات مكتبية, إيداع يومي..." />
                {form.formState.errors.Description && <p className="text-sm font-medium text-destructive">{form.formState.errors.Description.message}</p>}
            </div>

            <div className="space-y-1">
                <Label htmlFor="BranchID">الفرع (صندوق الفرع المتأثر)</Label>
                <Controller
                    name="BranchID"
                    control={form.control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value} name={field.name}>
                            <SelectTrigger id="BranchID">
                                <SelectValue placeholder="اختر فرعًا..." />
                            </SelectTrigger>
                            <SelectContent>
                                {branches.map(branch => (
                                    <SelectItem key={branch.BranchID} value={String(branch.BranchID)}>
                                        {branch.Name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
                {form.formState.errors.BranchID && <p className="text-sm font-medium text-destructive">{form.formState.errors.BranchID.message}</p>}
            </div>

            <div className="space-y-1">
                <Label htmlFor="TransactionDate">تاريخ الحركة</Label>
                <Controller
                    name="TransactionDate"
                    control={form.control}
                    render={({ field }) => (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="me-2 h-4 w-4" />
                                    {field.value ? format(field.value, "PPP", { locale: arSA }) : <span>اختر تاريخًا</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    initialFocus
                                    locale={arSA}
                                />
                            </PopoverContent>
                        </Popover>
                    )}
                />
            </div>


            <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    {isPending ? "جاري الحفظ..." : "حفظ الحركة"}
                </Button>
            </div>
        </form>
    );
}
