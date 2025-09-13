'use client';

import { useActionState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createBranch, updateBranch } from '@/actions/branches';
import type { Branch } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

// نوع الحالة
type BranchFormState = {
    message?: string;
    errors?: {
        Name?: string[];
        City?: string[];
        Address?: string[];
        Phone?: string[];
        GoogleMapsLink?: string[];
        _form?: string[];
    };
    success?: boolean;
};

interface AddBranchFormProps {
    onSuccess: () => void;
    editingBranch: Branch | null;
    onCancelEdit: () => void;
}

export function AddBranchForm({
    onSuccess,
    editingBranch,
    onCancelEdit,
}: AddBranchFormProps) {
    const formAction = editingBranch ? updateBranch : createBranch;
    const [state, submitAction, isPending] = useActionState(
        formAction,
        undefined
    );
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);
    const lastMessageRef = useRef<string | null>(null); // ✅ لتفادي التكرار

    useEffect(() => {
        if (!state) return;

        if (state.success) {
            if (state.message && lastMessageRef.current !== state.message) {
                toast({ title: 'نجاح', description: state.message });
                lastMessageRef.current = state.message;
            }
            formRef.current?.reset();
            onSuccess();
        } else if (state.message && !state.success) {
            if (lastMessageRef.current !== state.message) {
                toast({
                    variant: 'destructive',
                    title: 'خطأ',
                    description: state.message,
                });
                lastMessageRef.current = state.message;
            }
        }
    }, [state, toast, onSuccess]);

    const initialData = editingBranch
        ? {
            Name: editingBranch.Name,
            City: editingBranch.City,
            Address: editingBranch.Address,
            Phone: editingBranch.Phone || '',
            GoogleMapsLink: editingBranch.GoogleMapsLink || '',
        }
        : {};

    return (
        <form ref={formRef} action={submitAction} className="space-y-6">
            {editingBranch && (
                <input
                    type="hidden"
                    name="BranchID"
                    value={editingBranch.BranchID}
                />
            )}

            <div className="grid sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="Name">اسم الفرع</Label>
                    <Input
                        id="Name"
                        name="Name"
                        placeholder="مثال: فرع سيئون المركزي"
                        defaultValue={initialData.Name}
                        required
                    />
                    {state?.errors?.Name && (
                        <p className="text-sm text-destructive mt-1">
                            {state.errors.Name[0]}
                        </p>
                    )}
                </div>
                <div>
                    <Label htmlFor="City">المدينة</Label>
                    <Input
                        id="City"
                        name="City"
                        placeholder="مثال: سيئون"
                        defaultValue={initialData.City}
                        required
                    />
                    {state?.errors?.City && (
                        <p className="text-sm text-destructive mt-1">
                            {state.errors.City[0]}
                        </p>
                    )}
                </div>
            </div>

            <div>
                <Label htmlFor="Address">العنوان</Label>
                <Input
                    id="Address"
                    name="Address"
                    placeholder="مثال: شارع الجزائر، بجانب مسجد النور"
                    defaultValue={initialData.Address}
                    required
                />
                {state?.errors?.Address && (
                    <p className="text-sm text-destructive mt-1">
                        {state.errors.Address[0]}
                    </p>
                )}
            </div>

            <div>
                <Label htmlFor="Phone">رقم الهاتف (اختياري)</Label>
                <Input
                    id="Phone"
                    name="Phone"
                    type="tel"
                    placeholder="مثال: 05xxxxxxx"
                    defaultValue={initialData.Phone}
                />
                {state?.errors?.Phone && (
                    <p className="text-sm text-destructive mt-1">
                        {state.errors.Phone[0]}
                    </p>
                )}
            </div>

            <div>
                <Label htmlFor="GoogleMapsLink">
                    رابط جوجل ماب أو الإحداثيات (اختياري)
                </Label>
                <Input
                    id="GoogleMapsLink"
                    name="GoogleMapsLink"
                    type="text"
                    placeholder="مثال: 14.5340, 49.1269"
                    defaultValue={initialData.GoogleMapsLink}
                />
                {state?.errors?.GoogleMapsLink && (
                    <p className="text-sm text-destructive mt-1">
                        {state.errors.GoogleMapsLink[0]}
                    </p>
                )}
            </div>

            <div className="flex gap-2">
                <Button type="submit" disabled={isPending}>
                    {isPending && (
                        <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    )}
                    {editingBranch ? 'حفظ التعديلات' : 'إضافة الفرع'}
                </Button>
                {editingBranch && (
                    <Button
                        type="button"
                        className="border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                        onClick={onCancelEdit}
                        disabled={isPending}
                    >
                        إلغاء التعديل
                    </Button>
                )}
            </div>

            {state?.errors?._form && (
                <p className="text-sm font-medium text-destructive">
                    {state.errors._form.join(', ')}
                </p>
            )}
        </form>
    );
}
