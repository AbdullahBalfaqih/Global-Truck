
"use client";

import { useActionState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import { updateDebt } from "@/actions/debts";
import type { Debt, ManualDebtFormState } from "@/types";

interface EditDebtFormProps {
  debt: Debt;
  onSuccess: () => void;
}

const formSchema = z.object({
  Amount: z.coerce.number().positive("المبلغ يجب أن يكون رقمًا موجبًا."),
  Notes: z.string().min(3, "يجب ألا تقل الملاحظات عن 3 أحرف.").max(255, "الملاحظات طويلة جدًا."),
});

type FormValues = z.infer<typeof formSchema>;

export function EditDebtForm({ debt, onSuccess }: EditDebtFormProps) {
  const [state, formAction, isPending] = useActionState<ManualDebtFormState, FormData>(updateDebt, undefined);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      Amount: debt.Amount,
      Notes: debt.Notes || '',
    },
  });

  useEffect(() => {
    if (state?.success) {
      toast({ title: "نجاح", description: state.message });
      onSuccess();
    } else if (state?.message && !state.success) {
      toast({ variant: "destructive", title: "خطأ", description: state.message });
       if(state.errors) {
        Object.entries(state.errors).forEach(([key, value]) => {
            if (value && value.length > 0) {
                form.setError(key as keyof FormValues, { message: value.join(', ') });
            }
        });
      }
    }
  }, [state, toast, onSuccess, form]);

  return (
    <form action={formAction} className="space-y-4">
        <input type="hidden" name="DebtID" value={debt.DebtID} />
        
        <div className="space-y-1">
            <Label htmlFor="Amount">المبلغ (ر.ي)</Label>
            <Input id="Amount" type="number" {...form.register("Amount")} placeholder="أدخل المبلغ" name="Amount" />
            {form.formState.errors.Amount && <p className="text-sm font-medium text-destructive">{form.formState.errors.Amount.message}</p>}
        </div>

        <div className="space-y-1">
            <Label htmlFor="Notes">السبب / ملاحظات</Label>
            <Textarea id="Notes" {...form.register("Notes")} placeholder="مثال: سلفة نقدية، قيمة وقود..." name="Notes" />
            {form.formState.errors.Notes && <p className="text-sm font-medium text-destructive">{form.formState.errors.Notes.message}</p>}
        </div>

        <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
                {isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
            </Button>
        </div>
    </form>
  );
}
