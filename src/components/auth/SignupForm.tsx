
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { signupUser } from "@/actions/auth";
import { useFormStatus } from "react-dom";
import { useActionState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Truck } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "جاري إنشاء الحساب..." : "إنشاء حساب"}
    </Button>
  );
}

export function SignupForm() {
  const [state, formAction] = useActionState(signupUser, undefined);
  const { toast } = useToast();

  useEffect(() => {
    if (state?.error) {
      toast({
        variant: "destructive",
        title: "فشل إنشاء الحساب",
        description: state.error,
      });
    }
  }, [state, toast]);
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm mx-auto shadow-xl">
        <CardHeader className="space-y-1 text-center">
           <div className="flex justify-center items-center gap-2 mb-4">
            <Truck className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold">جلوبال تراك</CardTitle>
          </div>
          <CardDescription>أدخل بياناتك لإنشاء حساب</CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">الاسم</Label>
              <Input id="name" name="name" placeholder="الاسم الكامل" required />
               {state?.details?.name?._errors && (
                <p className="text-xs text-destructive">{state.details.name._errors.join(', ')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input id="email" name="email" type="email" placeholder="m@example.com" required />
              {state?.details?.email?._errors && (
                <p className="text-xs text-destructive">{state.details.email._errors.join(', ')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input id="password" name="password" type="password" required />
              {state?.details?.password?._errors && (
                <p className="text-xs text-destructive">{state.details.password._errors.join(', ')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">الدور</Label>
              <Select name="role" defaultValue="BranchEmployee">
                <SelectTrigger id="role">
                  <SelectValue placeholder="اختر دورًا" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">مدير</SelectItem>
                  <SelectItem value="BranchEmployee">موظف فرع</SelectItem>
                  <SelectItem value="Developer">مطور</SelectItem>
                </SelectContent>
              </Select>
              {state?.details?.role?._errors && (
                <p className="text-xs text-destructive">{state.details.role._errors.join(', ')}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <SubmitButton />
            <div className="text-center text-sm">
              لديك حساب بالفعل؟{" "}
              <Link href="/" className="underline hover:text-primary">
                تسجيل الدخول
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
