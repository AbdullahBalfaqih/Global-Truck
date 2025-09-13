
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
import { useToast } from '@/hooks/use-toast'; 
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

const addAdminSchema = z.object({
  username: z.string().min(3, {
    message: 'اسم المستخدم يجب أن لا يقل عن 3 أحرف.',
  }),
  password: z.string().min(8, {
    message: 'كلمة المرور يجب أن لا تقل عن 8 أحرف.',
  }),
});

type AddAdminFormValues = z.infer<typeof addAdminSchema>;

interface AddAdminFormProps {
  onAdminAdded: (data: AddAdminFormValues) => void; 
}

export function AddAdminForm({ onAdminAdded }: AddAdminFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<AddAdminFormValues>({
    resolver: zodResolver(addAdminSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  async function onSubmit(values: AddAdminFormValues) {
    setIsLoading(true);
    console.log('محاولة إضافة مدير (محاكاة):', values);

    // محاكاة استدعاء API
    await new Promise(resolve => setTimeout(resolve, 1000));

    // في تطبيق حقيقي، هنا ستقوم باستدعاء API لإضافة المدير
    // const response = await fetch('/api/developer/admins', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(values),
    // });

    // if (response.ok) {
      toast({
        title: 'نجاح!',
        description: `تم إنشاء حساب المدير ${values.username} (محاكاة).`,
      });
      form.reset(); 
      onAdminAdded(values); 
    // } else {
    //   toast({
    //     title: 'خطأ',
    //     description: 'فشل في إنشاء حساب المدير (محاكاة).',
    //     variant: 'destructive',
    //   });
    // }
    setIsLoading(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>اسم مستخدم المدير</FormLabel>
              <FormControl>
                <Input placeholder="مثال: admin_user" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>كلمة المرور</FormLabel>
              <FormControl>
                <Input type="password" placeholder="********" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {isLoading ? 'جاري الإنشاء...' : 'إنشاء حساب المدير'}
        </Button>
      </form>
    </Form>
  );
}
