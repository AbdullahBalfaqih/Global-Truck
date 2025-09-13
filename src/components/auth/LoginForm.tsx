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
import { loginUser, type LoginActionState } from "@/actions/auth";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Truck } from "lucide-react";

export function LoginForm() {
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg(null);

        const formData = new FormData(e.currentTarget);
        const result: LoginActionState = await loginUser(undefined, formData);

        setLoading(false);

        if (!result.success) {
            setErrorMsg(result.message);
            toast({
                variant: "destructive",
                title: "فشل تسجيل الدخول",
                description: result.message,
            });
        }
        // النجاح يتم من خلال redirect من server action
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="w-full max-w-sm mx-auto shadow-xl">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center items-center gap-2 mb-4">
                        <CardTitle className="text-3xl font-bold">الجعيدي للنقل</CardTitle>
                        <Truck className="h-8 w-8 text-primary" />
                    </div>
                    <CardDescription>
                        أدخل رقم هاتفك أدناه لتسجيل الدخول إلى حسابك
                    </CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="identifier">رقم الهاتف</Label>
                            <Input
                                id="identifier"
                                name="identifier"
                                type="tel"
                                placeholder="7XXXXXXXX"
                                required
                                pattern="^(70|71|73|77|78)[0-9]{7}$"
                                maxLength={9}
                                minLength={9}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">كلمة المرور</Label>
                            <Input id="password" name="password" type="password" required />
                        </div>
                    </CardContent>

                    <CardFooter className="flex flex-col gap-4">
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                            {loading ? "جاري التحقق..." : "تسجيل الدخول"}
                        </Button>

                        {errorMsg && <p className="text-sm font-medium text-destructive">{errorMsg}</p>}

                        <div className="text-center text-sm">
                            <Link href="/forgot-password" className="underline hover:text-primary">
                                نسيت كلمة المرور؟
                            </Link>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
