
"use client";

import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit3, Trash2, ShieldCheck, UserCircle, Building, CheckCircle, XCircle } from 'lucide-react';
import type { User, Branch, UserRole } from '@/types';
import { ClientFormattedDate } from '@/components/utils/ClientFormattedDate';
import { arSA } from 'date-fns/locale';
import { getSession } from '@/actions/auth';

interface UsersTableProps {
    users: User[];
    branches: Pick<Branch, 'BranchID' | 'Name' | 'City'>[];
    onEditClick: (user: User) => void;
    onDeleteClick: (user: User) => void;
}

const getBranchName = (branchId: number | undefined | null, branches: Pick<Branch, 'BranchID' | 'Name' | 'City'>[]): string => {
    if (!branchId) return 'لا ينطبق';
    const branch = branches.find(b => b.BranchID === branchId);
    return branch ? `${branch.Name} (${branch.City})` : `فرع غير معروف (${branchId})`;
};

const getRoleArabicName = (role: UserRole): string => {
    switch (role) {
        case 'Admin': return 'مدير نظام';
        case 'BranchEmployee': return 'موظف فرع';
        case 'Developer': return 'مطور';
        default: return role;
    }
}

const getRoleIcon = (role: UserRole) => {
    switch (role) {
        case 'Admin': return <ShieldCheck className="h-4 w-4 text-red-500" />;
        case 'BranchEmployee': return <Building className="h-4 w-4 text-blue-500" />;
        case 'Developer': return <UserCircle className="h-4 w-4 text-green-500" />;
        default: return <UserCircle className="h-4 w-4 text-gray-500" />;
    }
}

export function UsersTable({ users, branches, onEditClick, onDeleteClick }: UsersTableProps) {
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    useEffect(() => {
        const fetchSession = async () => {
            const session = await getSession();
            if (session?.userId) {
                setCurrentUserId(Number(session.userId));
            }
        };
        fetchSession();
    }, []);

    if (!users || users.length === 0) {
        return <p className="text-center text-muted-foreground py-4">لا يوجد مستخدمون لعرضهم حاليًا.</p>;
    }

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader className="bg-primary text-primary-foreground">
                    {/* ✅ تأكد أن <TableRow> تتبع <TableHeader> مباشرة بدون مسافات بيضاء */}
                    <TableRow>
                        <TableHead className="text-center text-primary-foreground">الاسم </TableHead>
                        <TableHead className="text-center text-primary-foreground">البريد الالكتروني  </TableHead>
                        <TableHead className="text-center text-primary-foreground">رقم الهاتف  </TableHead>
                        <TableHead className="text-center text-primary-foreground">الدور  </TableHead>
                        <TableHead className="text-center text-primary-foreground">الفرع </TableHead>
                        <TableHead className="text-center text-primary-foreground">الحالة  </TableHead>
                        <TableHead className="text-center text-primary-foreground">تاريخ الإنشاء  </TableHead>
                        <TableHead className="text-center text-primary-foreground">إجراءات</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((user) => (
                        <TableRow key={user.UserID}>
                            {/* ✅ تأكد أن <TableCell> تتبع <TableRow> مباشرة بدون مسافات بيضاء */}
                            <TableCell className="text-center font-medium">{user.Name}</TableCell>
                            <TableCell className="text-center">{user.Email}</TableCell>
                            <TableCell>{user.Phone || '-'}</TableCell>
                            <TableCell className="text-center flex items-center justify-center gap-2">
                                {getRoleIcon(user.Role)}
                                {getRoleArabicName(user.Role)}
                            </TableCell>
                            <TableCell className="text-center">{getBranchName(user.BranchID, branches)}</TableCell>
                            <TableCell className="text-center">
                                <Badge variant={user.IsActive ? 'default' : 'destructive'}
                                    className={user.IsActive ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'}
                                >
                                    {user.IsActive ? <CheckCircle className="me-1 h-3.5 w-3.5" /> : <XCircle className="me-1 h-3.5 w-3.5" />}
                                    {user.IsActive ? 'نشط' : 'غير نشط'}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                                <ClientFormattedDate dateString={user.CreatedAt} formatString="P" locale={arSA} />
                            </TableCell>
                            <TableCell className="text-center space-x-1 rtl:space-x-reverse">
                                <Button variant="outline" size="sm" onClick={() => onEditClick(user)}>
                                    <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    title="حذف المستخدم"
                                    className="text-destructive hover:bg-destructive/10"
                                    onClick={() => onDeleteClick(user)}
                                    disabled={currentUserId === user.UserID}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
