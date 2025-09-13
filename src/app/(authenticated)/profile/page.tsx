
"use client";

import { useState, useEffect, useActionState, useRef } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getAllBranches } from "@/actions/branches";
import { updateUserProfile, changeUserPassword, type UserFormActionState } from "@/actions/users";
import { getSession } from "@/actions/auth";
import type { User, Branch, UserRole } from "@/types";
import {
    KeyRound,
    UserCircle,
    Save,
    ShieldAlert,
    Loader2,
} from "lucide-react";

const getBranchName = (branchId: number | undefined | null, branchesList: Branch[]): string => {
    if (!branchId || !branchesList || branchesList.length === 0) return 'غير محدد';
    const branch = branchesList.find(b => b.BranchID === branchId);
    return branch ? `${branch.Name} ` : `فرع غير معروف (${branchId})`;
};

const getRoleArabicName = (role: UserRole | undefined): string => {
    if (!role) return 'غير محدد';
    switch (role) {
        case 'Admin': return 'مدير نظام';
        case 'BranchEmployee': return 'موظف فرع';
        case 'Developer': return 'مطور';
        default: return role;
    }
}

// Helper component for displaying form messages
function FormMessage({ children }: { children: React.ReactNode }) {
    if (!children) return null;
    return <p className="text-sm font-medium text-destructive pt-1">{children}</p>;
}

export default function ProfilePage() {
    const { toast } = useToast();

    const [session, setSession] = useState<any>(null);
    const [status, setStatus] = useState('loading');
    const [branches, setBranches] = useState<Branch[]>([]);

    const [name, setName] = useState<string>("");
    const [email, setEmail] = useState<string>("");

    const [currentPassword, setCurrentPassword] = useState<string>("");
    const [newPassword, setNewPassword] = useState<string>("");
    const [confirmNewPassword, setConfirmNewPassword] = useState<string>("");

    const passwordFormRef = useRef<HTMLFormElement>(null);

    const [profileUpdateState, profileUpdateFormAction, isProfileUpdatePending] = useActionState<UserFormActionState, FormData>(updateUserProfile, undefined);
    const [passwordChangeState, passwordChangeFormAction, isPasswordChangePending] = useActionState<UserFormActionState, FormData>(changeUserPassword, undefined);


    useEffect(() => {
        async function fetchData() {
            try {
                const [fetchedBranches, sessionData] = await Promise.all([
                    getAllBranches(),
                    getSession()
                ]);
                setBranches(fetchedBranches);
                setSession(sessionData);
                if (sessionData) {
                    setName(sessionData.name || "");
                    setEmail(sessionData.email || "");
                }
            } catch (error) {
                toast({
                    variant: "destructive",
                    title: "خطأ",
                    description: "فشل في تحميل البيانات الأولية.",
                });
            } finally {
                setStatus('idle');
            }
        }
        fetchData();
    }, [toast]);

    useEffect(() => {
        if (profileUpdateState?.success) {
            toast({ title: "نجاح", description: profileUpdateState.message });
            // Optionally, re-fetch session if name/email change should reflect everywhere immediately
            // For now, local state change is enough for immediate UI feedback.
            if (profileUpdateState.updatedUser) {
                setName(profileUpdateState.updatedUser.Name || name);
                setEmail(profileUpdateState.updatedUser.Email || email);
            }
        } else if (profileUpdateState?.message) {
            toast({ variant: "destructive", title: "خطأ في تحديث الملف", description: profileUpdateState.message });
        }
    }, [profileUpdateState, toast, name, email]);

    useEffect(() => {
        if (passwordChangeState?.success) {
            toast({ title: "نجاح", description: passwordChangeState.message });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmNewPassword("");
            if (passwordFormRef.current) {
                passwordFormRef.current.reset();
            }
        } else if (passwordChangeState?.message) {
            toast({ variant: "destructive", title: "خطأ في تغيير كلمة المرور", description: passwordChangeState.message });
        }
    }, [passwordChangeState, toast]);

    if (status === "loading") {
        return (
            <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ms-2">جاري تحميل بيانات الملف الشخصي...</p>
            </div>
        );
    }

    if (!session) {
        return <p className="text-center text-destructive">الرجاء تسجيل الدخول لعرض الملف الشخصي.</p>;
    }

    const currentUser = session;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">الملف الشخصي</h1>

            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <UserCircle className="h-6 w-6 text-primary" />
                        <CardTitle>معلومات الحساب</CardTitle>
                    </div>
                    <CardDescription>عرض وتعديل معلومات حسابك.</CardDescription>
                </CardHeader>
                <form action={profileUpdateFormAction}>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <Label className="text-sm text-muted-foreground">المعرف (UserID)</Label>
                                <p className="text-lg font-medium text-foreground">{currentUser.userId}</p>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-sm text-muted-foreground">الدور (Role)</Label>
                                <p className="text-lg font-medium text-foreground">{getRoleArabicName(currentUser.role)}</p>
                            </div>
                            {currentUser.role !== 'Developer' && currentUser.branchId && (
                                <div className="space-y-1">
                                    <Label className="text-sm text-muted-foreground">الفرع (BranchID)</Label>
                                    <p className="text-lg font-medium text-foreground">
                                        {getBranchName(currentUser.branchId, branches)}
                                    </p>
                                </div>
                            )}
                        </div>
                        <Separator />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="Name">الاسم (Name)</Label>
                                <Input
                                    id="Name"
                                    name="Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="اسمك الكامل"
                                />
                                {profileUpdateState?.errors?.Name && <FormMessage>{profileUpdateState.errors.Name.join(', ')}</FormMessage>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="Email">البريد الإلكتروني (Email)</Label>
                                <Input
                                    id="Email"
                                    name="Email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="m@example.com"
                                />
                                {profileUpdateState?.errors?.Email && <FormMessage>{profileUpdateState.errors.Email.join(', ')}</FormMessage>}
                            </div>
                        </div>
                        {profileUpdateState?.errors?._form && <FormMessage>{profileUpdateState.errors._form.join(', ')}</FormMessage>}
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isProfileUpdatePending}>
                            {isProfileUpdatePending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                            <Save className="me-2 h-4 w-4" />
                            حفظ تغييرات الحساب
                        </Button>
                    </CardFooter>
                </form>
            </Card>

            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <KeyRound className="h-6 w-6 text-primary" />
                        <CardTitle>تغيير كلمة المرور</CardTitle>
                    </div>
                    <CardDescription>
                        اختر كلمة مرور قوية لا تقل عن 6 أحرف.
                        <span className="block text-xs text-yellow-600 mt-1 flex items-center gap-1">
                            <ShieldAlert size={14} /> للحماية، سيتم تسجيل خروجك من جميع الجلسات الأخرى بعد تغيير كلمة المرور.
                        </span>
                    </CardDescription>
                </CardHeader>
                <form ref={passwordFormRef} action={passwordChangeFormAction}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="currentPassword">كلمة المرور الحالية</Label>
                            <Input
                                id="currentPassword"
                                name="currentPassword"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="********"
                            />
                            {passwordChangeState?.errors?.currentPassword && <FormMessage>{passwordChangeState.errors.currentPassword.join(', ')}</FormMessage>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                            <Input
                                id="newPassword"
                                name="newPassword"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="********"
                            />
                            {passwordChangeState?.errors?.newPassword && <FormMessage>{passwordChangeState.errors.newPassword.join(', ')}</FormMessage>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmNewPassword">تأكيد كلمة المرور الجديدة</Label>
                            <Input
                                id="confirmNewPassword"
                                name="confirmNewPassword" // Should match the field if it's part of schema, or just for client validation
                                type="password"
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                placeholder="********"
                            />
                            {passwordChangeState?.errors?.newPassword && passwordChangeState.message?.includes('متطابقين') && (
                                <FormMessage>{passwordChangeState.message}</FormMessage>
                            )}
                        </div>
                        {passwordChangeState?.errors?._form && <FormMessage>{passwordChangeState.errors._form.join(', ')}</FormMessage>}
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isPasswordChangePending}>
                            {isPasswordChangePending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                            <Save className="me-2 h-4 w-4" />
                            تغيير كلمة المرور
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}

