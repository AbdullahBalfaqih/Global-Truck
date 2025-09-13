
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Branch } from '@/types';

const employeeFormSchema = z.object({
  Name: z.string().min(3, { message: 'يجب أن لا يقل الاسم عن 3 أحرف.' }),
  JobTitle: z.string().min(2, { message: 'يجب أن لا يقل المسمى الوظيفي عن حرفين.' }),
  Salary: z.coerce.number().positive({ message: 'الراتب يجب أن يكون رقمًا موجبًا.' }),
  BranchID: z.coerce.number().int().positive().optional(),
  ContactPhone: z.string().regex(/^7\d{8}$/, { message: 'يجب أن يكون رقم الهاتف صالحًا ويبدأ بـ 7 ويتكون من 9 أرقام.' }).optional().or(z.literal('')),
  HireDate: z.date().optional(),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

interface AddEmployeeFormProps {
  branches: Branch[];
  onSubmit: (data: Omit<EmployeeFormValues, 'HireDate'> & { HireDate?: string }) => void;
}

const NO_BRANCH_SELECTED_VALUE = "_no_branch_"; // Define a constant for clarity

export function AddEmployeeForm({ branches, onSubmit }: AddEmployeeFormProps) {
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      Name: '',
      JobTitle: '',
      Salary: 0,
      ContactPhone: '',
      // BranchID will default to undefined
      // HireDate will default to undefined
    },
  });

  function handleFormSubmit(data: EmployeeFormValues) {
    const submissionData = {
        ...data,
        HireDate: data.HireDate ? data.HireDate.toISOString() : undefined,
    };
    onSubmit(submissionData);
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="Name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>اسم الموظف</FormLabel>
                <FormControl>
                  <Input placeholder="مثال: عبدالله السالم" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="JobTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>المسمى الوظيفي</FormLabel>
                <FormControl>
                  <Input placeholder="مثال: مدير عمليات" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="Salary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>الراتب (ريال)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="مثال: 5000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="ContactPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>رقم الاتصال (اختياري)</FormLabel>
                <FormControl>
                        <Input type="tel" maxLength={9} // 👈 إضافة خاصية maxLength
 placeholder="مثال: 7xxxxxxxx" {...field} />
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
                <FormLabel>الفرع (اختياري)</FormLabel>
                <Select
                  value={field.value?.toString() || NO_BRANCH_SELECTED_VALUE} // Ensure value matches one of SelectItem
                  onValueChange={(value) => {
                    if (value === NO_BRANCH_SELECTED_VALUE) {
                      field.onChange(undefined);
                    } else {
                      field.onChange(Number(value));
                    }
                  }}
                  defaultValue={field.value?.toString()} // defaultValue is for initial render before RHF takes over
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الفرع" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_BRANCH_SELECTED_VALUE}>لا يوجد فرع محدد</SelectItem>
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
          <FormField
            control={form.control}
            name="HireDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>تاريخ التعيين (اختياري)</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="me-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP", { locale: arSA }) : <span>اختر تاريخًا</span>}
                      </Button>
                    </FormControl>
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
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit">إضافة الموظف</Button>
      </form>
    </Form>
  );
}
