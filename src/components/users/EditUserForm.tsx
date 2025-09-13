
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { Branch, User, UserRole } from '@/types';
import { useActionState, useEffect } from 'react';
import { updateUserByAdmin } from '@/actions/users';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const userRolesArray: [UserRole, ...UserRole[]] = ["Admin", "BranchEmployee", "Developer"];
const phoneRegex = /^(70|71|73|77|78)\d{7}$/;

const updateUserFormSchema = z.object({
    UserID: z.coerce.number().int().positive(),
    Name: z.string().min(2, "يجب أن لا يقل الاسم عن حرفين."),
    Email: z.string().email("البريد الإلكتروني غير صالح."),
    Phone: z.string().regex(phoneRegex, "يجب أن يكون رقم الهاتف يمنيًا صالحًا.").optional().or(z.literal('')),
    Password: z.string().min(6, "كلمة المرور يجب أن لا تقل عن 6 أحرف.").optional().or(z.literal('')),
    Role: z.enum(userRolesArray, { errorMap: () => ({ message: "يرجى اختيار دور صالح." }) }),
    BranchID: z.coerce.number().int().positive().optional().nullable(),
    IsActive: z.boolean().default(true),
}).refine(data => {
    const rolesRequiringBranch = ['Admin', 'BranchEmployee'];
    return !rolesRequiringBranch.includes(data.Role) || (rolesRequiringBranch.includes(data.Role) && data.BranchID != null);
}, {
    message: "يجب اختيار فرع لهذا الدور.",
    path: ["BranchID"],
});

type UpdateUserFormValues = z.infer<typeof updateUserFormSchema>;

interface EditUserFormProps {
    user: User;
    branches: Pick<Branch, 'BranchID' | 'Name' | 'City'>[];
    onSuccess: () => void;
    onCancel: () => void;
}

const NO_BRANCH_SELECTED_VALUE = "_none_";

export function EditUserForm({ user, branches, onSuccess, onCancel }: EditUserFormProps) {
    const [state, formAction, isPending] = useActionState(updateUserByAdmin, undefined);
    const { toast } = useToast();

    const form = useForm<UpdateUserFormValues>({
        resolver: zodResolver(updateUserFormSchema),
        defaultValues: {
            UserID: user.UserID,
            Name: user.Name || '',
            Email: user.Email || '',
            Phone: user.Phone || '',
            Password: '',
            Role: user.Role,
            BranchID: user.BranchID || null,
            IsActive: user.IsActive,
        },
    });

    const selectedRole = form.watch('Role');
    const rolesRequiringBranch = ['Admin', 'BranchEmployee'];

    useEffect(() => {
        if (state?.success) {
            toast({ title: "نجاح", description: state.message });
            onSuccess();
        } else if (state?.message && !state.success) {
            toast({ variant: "destructive", title: "خطأ", description: state.message });
            if (state.errors) {
                Object.entries(state.errors).forEach(([key, value]) => {
                    if (value) {
                        form.setError(key as keyof UpdateUserFormValues, { message: value.join(', ') });
                    }
                });
            }
        }
    }, [state, toast, onSuccess, form]);

    useEffect(() => {
        if (!rolesRequiringBranch.includes(selectedRole as string)) {
            form.setValue('BranchID', null, { shouldValidate: true });
        }
    }, [selectedRole, form]);

    return (
        <Form {...form}>
            <form action={formAction} className="space-y-6">
                <input type="hidden" name="UserID" value={user.UserID} />
                <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="Name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>الاسم</FormLabel>
                                <FormControl>
                                    <Input {...field} name="Name" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="Email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>البريد الإلكتروني</FormLabel>
                                <FormControl>
                                    <Input type="email" {...field} name="Email" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="Phone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>رقم الهاتف</FormLabel>
                                <FormControl>
                                    <Input
                                        type="tel" // نوع "tel" يحسن تجربة المستخدم على الأجهزة المحمولة
                                        placeholder="مثال: 7xxxxxxxx"
                                        {...field}
                                        maxLength={9} // ✅ تحديد أقصى طول للحقل في HTML
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="Password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>كلمة المرور الجديدة (اختياري)</FormLabel>
                                <FormControl>
                                    <Input type="password" placeholder="اتركه فارغًا لعدم التغيير" {...field} name="Password" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="Role"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>الدور</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} name="Role">
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="اختر دورًا" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {userRolesArray.map(role => (
                                            <SelectItem key={role} value={role}>
                                                {role === 'Admin' ? 'مدير نظام' : role === 'BranchEmployee' ? 'موظف فرع' : 'مطور'}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {rolesRequiringBranch.includes(selectedRole) && (
                        <FormField
                            control={form.control}
                            name="BranchID"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>الفرع</FormLabel>
                                    <Select onValueChange={(value) => field.onChange(value === NO_BRANCH_SELECTED_VALUE ? null : Number(value))} value={field.value?.toString() || NO_BRANCH_SELECTED_VALUE} name="BranchID">
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="اختر الفرع" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value={NO_BRANCH_SELECTED_VALUE}>-- اختر فرعًا --</SelectItem>
                                            {branches.map(branch => (
                                                <SelectItem key={branch.BranchID} value={String(branch.BranchID)}>
                                                    {branch.Name} ({branch.City})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                    <FormField
                        control={form.control}
                        name="IsActive"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm sm:col-span-2">
                                <div className="space-y-0.5">
                                    <FormLabel>الحالة</FormLabel>
                                    <p className="text-xs text-muted-foreground">
                                        {field.value ? "الحساب نشط" : "الحساب غير نشط"}
                                    </p>
                                </div>
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        name="IsActive"
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>إلغاء</Button>
                    <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                        حفظ التغييرات
                    </Button>
                </div>
            </form>
        </Form>
    );
}
