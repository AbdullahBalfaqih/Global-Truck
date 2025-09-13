
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { KeyRound, Mail, Eye, EyeOff } from "lucide-react";

// استيراد دالة نسيان كلمة المرور ونوع البيانات من ملف الأكشن
import { handleForgotPassword, type ForgotPasswordResponse } from "@/actions/auth";

function VerifyEmailSubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "جاري التحقق..." : "إرسال رابط إعادة التعيين"}
        </Button>
    );
}

function ResetPasswordSubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "جاري التغيير..." : "تغيير كلمة المرور"}
        </Button>
    );
}

export function ForgotPasswordForm() {
    const [state, formAction] = useActionState<ForgotPasswordResponse | undefined, FormData>(handleForgotPassword, undefined);
    const { toast } = useToast();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        if (state?.error) {
            toast({
                variant: "destructive",
                title: "خطأ",
                description: state.error,
            });
        }
        if (state?.message && state.userVerified && !state.passwordChanged) {
            toast({
                title: "معلومات",
                description: state.message,
            });
        }
        if (state?.message && state.passwordChanged) {
            toast({
                title: "نجاح",
                description: state.message,
            });
        }
    }, [state, toast]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="w-full max-w-sm mx-auto shadow-xl">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center items-center gap-2 mb-4">
                        <KeyRound className="h-8 w-8 text-primary" />
                        <CardTitle className="text-3xl font-bold">نسيت كلمة المرور</CardTitle>
                    </div>
                    <CardDescription>
                        {state?.userVerified && !state.passwordChanged
                            ? `أدخل كلمة المرور الجديدة لحساب ${state.email}`
                            : state?.passwordChanged
                                ? ""
                                : "أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور."}
                    </CardDescription>
                </CardHeader>

                {!state?.userVerified && !state?.passwordChanged && (
                    <form
                        action={(formData: FormData) => {
                            formData.append("stage", "verifyEmail");
                            formAction(formData);
                        }}
                    >
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="flex items-center">
                                    <Mail className="me-2 h-4 w-4 text-muted-foreground" />
                                    البريد الإلكتروني
                                </Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="m@example.com"
                                    required
                                    defaultValue={state?.email || ""}
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-2">
                            <VerifyEmailSubmitButton />
                        </CardFooter>
                    </form>
                )}

                {state?.userVerified && !state?.passwordChanged && (
                    <form
                        action={(formData: FormData) => {
                            formData.append("stage", "resetPassword");
                            if (state.email) {
                                formData.append("verifiedEmail", state.email);
                            }
                            formAction(formData);
                        }}
                    >
                        <input type="hidden" name="verifiedEmail" value={state.email || ""} />
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                                <div className="relative">
                                    <Input
                                        id="newPassword"
                                        name="newPassword"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="********"
                                        required
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 rtl:left-1 rtl:right-auto"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        <span className="sr-only">{showPassword ? "إخفاء" : "إظهار"} كلمة المرور</span>
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">تأكيد كلمة المرور الجديدة</Label>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="********"
                                        required
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 rtl:left-1 rtl:right-auto"
                                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        <span className="sr-only">{showConfirmPassword ? "إخفاء" : "إظهار"} كلمة المرور</span>
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-2">
                            <ResetPasswordSubmitButton />
                        </CardFooter>
                    </form>
                )}

                {state?.passwordChanged && (
                    <CardContent>
                        <div className="text-center text-sm text-green-600 py-4">
                            تم تغيير كلمة مرورك بنجاح. يمكنك الآن تسجيل الدخول.
                        </div>
                    </CardContent>
                )}

                <CardFooter>
                    <div className="mt-4 text-center text-sm w-full">
                        <Link href="/" className="underline hover:text-primary">
                            العودة إلى تسجيل الدخول
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
