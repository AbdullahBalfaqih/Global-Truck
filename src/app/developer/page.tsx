"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AddAdminForm } from '@/components/developer/AddAdminForm';
// ✅ هذه هي سطور الاستيراد التي كانت مفقودة
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
// import { useSession } from 'next-auth/react'; // Assuming next-auth for session management
// import { useRouter } from 'next/navigation'; 

interface AdminAccount {
    id: string;
    username: string;
}

export default function DeveloperPage() {
    // const { data: session, status } = useSession(); // For actual authentication
    // const router = useRouter();
    const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);

    // Placeholder for developer role check - In a real app, this would be robust
    const isDeveloper = true; // Assume true for now for development access

    useEffect(() => {
        // if (status === 'unauthenticated' || (status === 'authenticated' && session?.user?.role !== 'Developer')) {
        //   router.push('/dashboard'); // Redirect if not a developer
        // } else 
        if (isDeveloper) {
            fetchAdminAccounts();
        } else {
            // router.push('/dashboard'); // Or an unauthorized page
        }
    }, [isDeveloper /*, status, session, router*/]);

    const fetchAdminAccounts = async () => {
        // In a real app, fetch from your API
        // For now, it's an empty array or could be mock data
        // Simulating an API call
        console.log("Fetching admin accounts (simulated)...");
        setAdminAccounts([
            // Example data:
            // { id: 'admin1', username: 'superadmin' },
            // { id: 'admin2', username: 'testadmin' },
        ]);
    };

    const handleAdminAdded = (newAdmin: { username: string }) => {
        // Simulate adding to the list and re-fetching
        // In a real app, this would likely involve a backend update and then re-fetch
        setAdminAccounts(prev => [...prev, { id: `adm-${Date.now()}`, username: newAdmin.username }]);
        setShowAddForm(false);
    };

    // Simulate session status for development
    const status = 'authenticated';

    if (status === 'authenticated' && !isDeveloper) {
        return <div className="flex justify-center items-center min-h-screen"><p>جاري التحميل...</p></div>;
    }

    if (!isDeveloper) {
        // This part would ideally redirect or show an "Unauthorized" page.
        // For now, we'll just return null if not a developer and not loading.
        if (status !== 'loading') {
            // router.push('/dashboard'); // Example redirect
            return <div className="flex justify-center items-center min-h-screen"><p>غير مصرح لك بالوصول لهذه الصفحة.</p></div>;
        }
        return null;
    }

    return (
        <div className="container mx-auto py-10 p-4 sm:p-6" dir="rtl">
            <Card className="mb-6 shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-semibold">واجهة المطور</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        هذه الواجهة مخصصة للمطور الرئيسي للنظام لإدارة الإعدادات المتقدمة وحسابات المسؤولين.
                    </p>
                </CardContent>
            </Card>

            <Card className="mb-6 shadow-lg rounded-lg">
                <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle>إدارة حسابات مدراء النظام (Admins)</CardTitle>
                    <Button onClick={() => setShowAddForm(!showAddForm)} variant="outline">
                        {showAddForm ? 'إلغاء إضافة مدير' : 'إضافة مدير جديد'}
                    </Button>
                </CardHeader>
                <CardContent>
                    {showAddForm && (
                        <div className="my-4 p-4 border rounded-md bg-card">
                            <h3 className="text-lg font-medium mb-2">إنشاء حساب مدير جديد</h3>
                            <AddAdminForm onAdminAdded={handleAdminAdded} />
                        </div>
                    )}
                    {adminAccounts.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>معرف الحساب</TableHead>
                                    <TableHead>اسم مستخدم المدير</TableHead>
                                    {/* Add more headers if needed (e.g., actions like delete, edit permissions) */}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {adminAccounts.map((account) => (
                                    <TableRow key={account.id}>
                                        <TableCell className="font-mono">{account.id}</TableCell>
                                        <TableCell>{account.username}</TableCell>
                                        {/* Add more cells for actions */}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-center text-muted-foreground py-4">
                            {showAddForm ? "لا توجد حسابات مدراء حاليًا. قم بإضافة حساب جديد." : "لا توجد حسابات مدراء لعرضها. اضغط على 'إضافة مدير جديد' للبدء."}
                        </p>
                    )}
                </CardContent>
            </Card>

            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle>إعدادات تخصيص النظام للعملاء (قيد الإنشاء)</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        سيتم هنا إضافة خيارات للمطور لتفعيل/إدارة كيفية تخصيص العملاء (ملاك النظام) لشعارهم واسم نظامهم.
                    </p>
                    <div className="mt-4 space-y-2">
                        <div>
                            <Label htmlFor="customer-logo-upload">رفع شعار العميل (مثال)</Label>
                            <Input id="customer-logo-upload" type="file" disabled />
                        </div>
                        <div>
                            <Label htmlFor="customer-system-name">اسم نظام العميل (مثال)</Label>
                            <Input id="customer-system-name" placeholder="اسم النظام الخاص بالعميل" disabled />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}