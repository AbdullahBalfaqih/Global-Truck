
"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LogOut, UserCircle, Settings } from "lucide-react";
import { useState } from "react";
import { logout } from "@/actions/auth";

interface UserNavProps {
    session: any; // Can be typed more strictly if session payload is consistent
}

export function UserNav({ session }: UserNavProps) {
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);

    if (!session) {
        return null;
    }

    const handleLogout = async () => {
        await logout();
    };

    const userName = session?.name || "مستخدم";
    const userEmail = session?.email || "غير متوفر";
    const userRole = session?.role || "غير محدد";

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                        <Avatar className="h-9 w-9">
                            <AvatarImage src="" alt={`@${userName}`} data-ai-hint="user avatar" />
                            <AvatarFallback><UserCircle className="h-5 w-5" /></AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{userName}</p>
                            <p className="text-xs leading-none text-muted-foreground">
                                {userEmail}
                            </p>
                            <p className="text-xs leading-none text-muted-foreground pt-1">الدور: {userRole}</p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuItem asChild>
                            <Link href="/profile">
                                <UserCircle className="me-2 h-4 w-4" />
                                <span>الملف الشخصي</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/tracking-settings">
                                <Settings className="me-2 h-4 w-4" />
                                <span>الإعدادات</span>
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowLogoutDialog(true)}>
                        <LogOut className="me-2 h-4 w-4" />
                        <span>تسجيل الخروج</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
                <AlertDialogContent dir="rtl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>تأكيد تسجيل الخروج</AlertDialogTitle>
                        <AlertDialogDescription>
                            هل تريد فعلاً تسجيل الخروج؟
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={handleLogout}>تسجيل الخروج</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
