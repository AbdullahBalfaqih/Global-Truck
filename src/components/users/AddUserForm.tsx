'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
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
import type { Branch, UserRole } from '@/types';
import { useEffect } from 'react';
import { useActionState } from 'react';
import { createUserByAdmin } from '@/actions/users';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { UserFormActionState } from '@/actions/users';


const userRolesArray: [UserRole, ...UserRole[]] = ["Admin", "BranchEmployee", "Developer"];
const phoneRegex = /^(70|71|73|77|78)\d{7}$/;

const addUserByAdminSchema = z.object({
    Name: z.string().min(2, { message: 'يجب أن لا يقل الاسم عن حرفين.' }),
    Email: z.string().email({ message: 'الرجاء إدخال بريد إلكتروني صالح.' }),
    Phone: z.string().regex(phoneRegex, "يجب أن يكون رقم الهاتف يمنيًا صالحًا."),
    Password: z.string().min(6, { message: 'يجب أن لا تقل كلمة المرور عن 6 أحرف.' }),
    Role: z.enum(userRolesArray, { errorMap: () => ({ message: "الرجاء اختيار دور صالح." }) }),
    BranchID: z.coerce.number().int().positive().optional().nullable(),
    IsActive: z.boolean().default(true),
}).refine(data => data.Role !== 'BranchEmployee' || (data.Role === 'BranchEmployee' && data.BranchID != null), {
    message: "يجب اختيار فرع لموظف الفرع.",
    path: ["BranchID"],
});


type AddUserByAdminFormValues = z.infer<typeof addUserByAdminSchema>;

interface AddUserFormProps {
    branches: Pick<Branch, 'BranchID' | 'Name' | 'City'>[];
    onSuccess: () => void;
}

const NO_BRANCH_SELECTED_VALUE = "_none_";

export function AddUserForm({ branches, onSuccess }: AddUserFormProps) {
    const [state, formAction, isPending] = useActionState<UserFormActionState, FormData>(createUserByAdmin, {});
    const { toast } = useToast();

    const form = useForm<AddUserByAdminFormValues>({
        resolver: zodResolver(addUserByAdminSchema),
        defaultValues: {
            Name: '',
            Email: '',
            Phone: '',
            Password: '',
            Role: undefined,
            BranchID: null,
            IsActive: true,
        },
    });

    const selectedRole = form.watch('Role');

    useEffect(() => {
        if (state?.success) {
            toast({ title: "نجاح", description: state.message });
            form.reset();
            onSuccess();
        } else if (state?.message && !state.success) {
            toast({ variant: "destructive", title: "خطأ", description: state.message });
            if (state.errors) {
                Object.entries(state.errors).forEach(([key, value]) => {
                    if (value) {
                        form.setError(key as keyof AddUserByAdminFormValues, { message: value.join(', ') });
                    }
                });
            }
        }
    }, [state, toast, form, onSuccess]);

    useEffect(() => {
        if (selectedRole !== 'BranchEmployee') {
            form.setValue('BranchID', null, { shouldValidate: true });
        }
    }, [selectedRole, form]);

    return (
        <Form {...form}>
            <form action={formAction} className="space-y-6">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField
                        control={form.control}
                        name="Name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>الاسم</FormLabel>
                                <FormControl>
                                    <Input placeholder="الاسم الكامل" {...field} name="Name" />
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
                                    <Input type="email" placeholder="user@example.com" {...field} name="Email" />
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
                                <FormLabel>كلمة المرور</FormLabel>
                                <FormControl>
                                    <Input type="password" placeholder="********" {...field} name="Password" />
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
                                <Select
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    name="Role"
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="اختر دورًا" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {userRolesArray.map((role) => (
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

                    {selectedRole === 'BranchEmployee' && (
                        <FormField
                            control={form.control}
                            name="BranchID"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>الفرع</FormLabel>
                                    <Select
                                        onValueChange={(value) => field.onChange(value === NO_BRANCH_SELECTED_VALUE ? null : Number(value))}
                                        value={field.value?.toString() || NO_BRANCH_SELECTED_VALUE}
                                        name="BranchID"
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="اختر الفرع لموظف الفرع" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value={NO_BRANCH_SELECTED_VALUE}>-- اختر الفرع --</SelectItem>
                                            {branches.map((branch) => (
                                                <SelectItem key={branch.BranchID} value={branch.BranchID.toString()}>
                                                    {branch.Name} 
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
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm col-span-1 sm:col-span-2 lg:col-span-1">
                                <div className="space-y-0.5">
                                    <FormLabel>الحالة</FormLabel>
                                    <p className="text-xs text-muted-foreground">
                                        {field.value ? "نشط" : "غير نشط"}
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
                <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    إضافة المستخدم
                </Button>
            </form>
        </Form>
    );
}