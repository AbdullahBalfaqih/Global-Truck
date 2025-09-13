
"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddBranchForm } from "@/components/branches/AddBranchForm";
import { BranchesTable } from "@/components/branches/BranchesTable";
import type { Branch } from "@/types";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getAllBranches, deleteBranch } from "@/actions/branches";
import { Loader2, AlertCircle, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle as ShadcnAlertTitle } from "@/components/ui/alert";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export default function BranchesPage() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);
    const [isDeleting, startDeleteTransition] = useTransition();
    const { toast } = useToast();


    const fetchBranches = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const fetchedBranches = await getAllBranches();
            setBranches(fetchedBranches);
        } catch (err: any) {
            console.error("Error fetching branches:", err);
            setError("فشل تحميل قائمة الفروع. يرجى المحاولة مرة أخرى.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBranches();
    }, []);

    const handleFormSuccess = () => {
        setEditingBranch(null);
        // No need to call fetchBranches() here, revalidatePath will handle it.
    };

    const handleEditClick = (branch: Branch) => {
        setEditingBranch(branch);
        // Scroll to form for better UX
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingBranch(null);
    };

    const handleDeleteClick = (branch: Branch) => {
        setDeletingBranch(branch);
    }

    const confirmDelete = () => {
        if (!deletingBranch) return;
        startDeleteTransition(async () => {
            const result = await deleteBranch(deletingBranch.BranchID);
            if (result.success) {
                toast({ title: 'نجاح', description: result.message });
                // No need to call fetchBranches manually
            } else {
                toast({ variant: 'destructive', title: 'خطأ', description: result.message });
            }
            setDeletingBranch(null);
        });
    }


    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">إدارة الفروع</h1>
            <p className="text-muted-foreground">
                إدارة بيانات الفروع الفعلية لشركة الشحن، بما في ذلك مواقعها ومعلومات الاتصال.
            </p>
            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle>{editingBranch ? "تعديل فرع" : "إضافة فرع جديد"}</CardTitle>
                    <CardDescription>
                        {editingBranch ? `أنت تقوم بتعديل بيانات فرع: ${editingBranch.Name}` : "أدخل بيانات الفرع الجديد."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AddBranchForm
                        key={editingBranch ? editingBranch.BranchID : 'new'}
                        onSuccess={handleFormSuccess}
                        editingBranch={editingBranch}
                        onCancelEdit={handleCancelEdit}
                    />
                </CardContent>
            </Card>

            <Separator />

            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle>قائمة الفروع الحالية</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading && (
                        <div className="flex justify-center items-center py-4">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="ms-2">جاري تحميل الفروع...</p>
                        </div>
                    )}
                    {error && !isLoading && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <ShadcnAlertTitle>خطأ في التحميل</ShadcnAlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    {!isLoading && !error && (
                        <BranchesTable
                            branches={branches}
                            onEditClick={handleEditClick}
                            onDeleteClick={handleDeleteClick}
                        />
                    )}
                </CardContent>
            </Card>

            {deletingBranch && (
                <AlertDialog open={!!deletingBranch} onOpenChange={() => setDeletingBranch(null)}>
                    <AlertDialogContent dir="rtl">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                                <Trash2 className="h-6 w-6 text-destructive" />
                                تأكيد الحذف
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                هل أنت متأكد أنك تريد حذف فرع "{deletingBranch.Name}"؟ <br />
                                <strong className="text-destructive">لا يمكن التراجع عن هذا الإجراء.</strong>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                                {isDeleting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : "نعم، قم بالحذف"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    );
}
