import { useEffect } from 'react';
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
import { toast } from '@/hooks/use-toast';
import type { Branch } from '@/types';
import type { Driver } from '@/types'; // تأكد من أن المسار صحيح

// تعريف مخطط النموذج
const driverFormSchema = z.object({
    Name: z.string().min(3, { message: 'يجب أن لا يقل اسم السائق عن 3 أحرف.' }),
    Phone: z
        .string()
        .refine(val => val === '' || /^(77|78|71|73|70)\d{7}$/.test(val), { // ✅ تم تعديل التعبير العادي هنا
            message: 'يجب أن يبدأ رقم الهاتف بـ 77 أو 78 أو 71 أو 73 أو 70 ويحتوي على 9 أرقام.',
        })
        .refine(val => val === '' || val.length === 9, { // ✅ تم إضافة التحقق من الطول هنا
            message: 'يجب أن يتكون رقم الهاتف من 9 أرقام بالضبط.',
        })
        .optional()
        .or(z.literal('')), // يسمح بالحقل أن يكون فارغًا إذا كان اختياريًا
    LicenseNumber: z.string().min(1, { message: 'رقم الرخصة مطلوب.' }),
    BranchID: z.coerce
        .number()
        .int()
        .positive({ message: 'الرجاء اختيار فرع صالح.' }),
    IsActive: z.boolean().default(true),
});

// تصدير النوع
export type DriverFormValues = z.infer<typeof driverFormSchema>;

interface AddDriverFormProps {
    branches: Branch[];
    onSubmit: (data: DriverFormValues) => Promise<void>; // لا ترجع success أو message
    setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>; // إضافة setDrivers كخاصية
}

export function AddDriverForm({ branches, onSubmit, setDrivers }: AddDriverFormProps) {
    const form = useForm<DriverFormValues>({
        resolver: zodResolver(driverFormSchema),
        defaultValues: {
            Name: "",
            Phone: "",
            LicenseNumber: "",
            BranchID: undefined,
            IsActive: true,
        },
    });

    async function handleFormSubmit(data: DriverFormValues): Promise<void> {
        const newDriver: Driver = {
            DriverID: data.Name, // استخدام الاسم كمعرف (إذا كان DriverID هو الاسم)
            Name: data.Name,
            Phone: data.Phone || null,
            LicenseNumber: data.LicenseNumber || null,
            BranchID: data.BranchID,
            IsActive: data.IsActive,
            CreatedAt: new Date().toISOString(), // تعيين تاريخ الإنشاء
            UpdatedAt: new Date().toISOString(), // تعيين تاريخ التحديث
        };

        await onSubmit(data); // تنفيذ عملية الإضافة
        setDrivers(prev => [...prev, newDriver]); // تحديث القائمة المحلية
        form.reset(); // إعادة تعيين النموذج
        toast({
            title: 'تمت إضافة السائق بنجاح!',
            description: `السائق ${data.Name} أضيف إلى النظام.`,
        });
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="Name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>اسم السائق</FormLabel>
                                <FormControl>
                                    <Input placeholder="مثال: أحمد خالد" {...field} />
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
                                <FormMessage /> {/* هذا سيعرض رسائل خطأ Zod */}
                            </FormItem>
                        )}
                    />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="LicenseNumber"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>رقم الرخصة</FormLabel>
                                <FormControl>
                                    <Input placeholder="مثال: LIC123XYZ" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="BranchID"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>الفرع التابع له</FormLabel>
                                <Select
                                    onValueChange={(value) => field.onChange(Number(value))}
                                    defaultValue={field.value?.toString()}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="اختر الفرع" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
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
                </div>
                <FormField
                    control={form.control}
                    name="IsActive"
                    render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                            <FormLabel>نشط؟</FormLabel>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={(checked) => field.onChange(checked)}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit">إضافة السائق</Button>
            </form>
        </Form>
    );
}
