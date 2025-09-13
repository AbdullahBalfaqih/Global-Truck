
"use client";

import { useState, useEffect, Suspense, useTransition } from "react";
import { AddUserForm } from "@/components/users/AddUserForm";
import { UsersTable } from "@/components/users/UsersTable";
import { EditUserForm } from "@/components/users/EditUserForm";
import type { User, Branch } from "@/types";
import { getAllUsers, deleteUserByAdmin } from "@/actions/users";
import { getAllBranches } from "@/actions/branches";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle as ShadcnAlertTitle } from "@/components/ui/alert";
import { Users as UsersIcon, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";


function UsersData() {
    const [users, setUsers] = useState<User[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, startDeleteTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [usersData, branchesData] = await Promise.all([
                getAllUsers(),
                getAllBranches()
            ]);
            setUsers(usersData);
            setBranches(branchesData);
        } catch (err: any) {
            console.error("Error fetching data for UsersPage:", err);
            setError("حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى لاحقًا.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleEditClick = (user: User) => {
        setUserToEdit(user);
    };

    const handleDeleteClick = (user: User) => {
        setUserToDelete(user);
    };

    const handleCloseDialog = () => {
        setUserToEdit(null);
    };

    const handleUpdateSuccess = () => {
        setUserToEdit(null);
        fetchData();
    };

    const confirmDelete = () => {
        if (!userToDelete) return;
        startDeleteTransition(async () => {
            const result = await deleteUserByAdmin(userToDelete.UserID);
            if (result.success) {
                toast({ title: "نجاح", description: result.message });
                fetchData();
            } else {
                toast({ title: "خطأ في الحذف", description: result.message, variant: "destructive" });
            }
            setUserToDelete(null);
        });
    }

    if (isLoading) {
        return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ms-2">جاري تحميل البيانات...</p></div>;
    }

    if (error) {
        return (
            <Alert variant="destructive" className="my-4">
                <AlertCircle className="h-4 w-4" />
                <ShadcnAlertTitle>خطأ في تحميل البيانات</ShadcnAlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    return (
        <>
            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle>إضافة مستخدم جديد</CardTitle>
                    <CardDescription>أدخل بيانات المستخدم الجديد للنظام.</CardDescription>
                </CardHeader>
                <CardContent>
                    <AddUserForm branches={branches} onSuccess={fetchData} />
                </CardContent>
            </Card>

            <Separator />

            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle>قائمة المستخدمين الحاليين</CardTitle>
                </CardHeader>
                <CardContent>
                    {users.length > 0 ? (
                        <UsersTable users={users} branches={branches} onEditClick={handleEditClick} onDeleteClick={handleDeleteClick} />
                    ) : (
                        <p className="text-center text-muted-foreground">لا يوجد مستخدمون لعرضهم حاليًا.</p>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!userToEdit} onOpenChange={(isOpen) => !isOpen && handleCloseDialog()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>تعديل بيانات المستخدم: {userToEdit?.Name}</DialogTitle>
                        <DialogDescription>
                            قم بتحديث تفاصيل المستخدم أدناه.
                        </DialogDescription>
                    </DialogHeader>
                    {userToEdit && (
                        <EditUserForm
                            user={userToEdit}
                            branches={branches}
                            onSuccess={handleUpdateSuccess}
                            onCancel={handleCloseDialog}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
                <AlertDialogContent dir="rtl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertCircle className="h-6 w-6 text-destructive" />
                            تأكيد الحذف
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            هل أنت متأكد أنك تريد حذف المستخدم "{userToDelete?.Name}"؟ لا يمكن التراجع عن هذا الإجراء.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setUserToDelete(null)} disabled={isDeleting}>
                            إلغاء
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                            {isDeleting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                            نعم، قم بالحذف
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

export default function UsersPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <UsersIcon className="h-7 w-7 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight text-foreground">إدارة مستخدمي النظام</h1>
            </div>
            <Suspense fallback={<div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ms-2">جاري تحميل واجهة المستخدمين...</p></div>}>
                <UsersData />
            </Suspense>
        </div>
    );
}
