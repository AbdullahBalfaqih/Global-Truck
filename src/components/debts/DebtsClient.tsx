"use client";

import { useState, useEffect } from 'react';
import type { Debt, Driver, BranchForSelect, UserRole } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerDebtsTab } from './CustomerDebtsTab';
import { DriverDebtsTab } from './DriverDebtsTab';
import { BranchDebtsTab } from './BranchDebtsTab';
import { getDebts } from '@/actions/debts';
import { getSession } from '@/actions/auth';
import { useRouter } from 'next/navigation';

interface DebtsClientProps {
    initialDebts: Debt[];
    drivers: Driver[];
    branches: BranchForSelect[];
    userRole: UserRole;
    session: any;
}

export function DebtsClient({ initialDebts, drivers, branches, userRole, session }: DebtsClientProps) {
    const [debts, setDebts] = useState<Debt[]>(initialDebts);
    const [currentUserBranchId, setCurrentUserBranchId] = useState<number | null>(session?.branchId || null);
    const router = useRouter();

    // This effect ensures that if the initial data from the server changes (e.g., due to revalidation),
    // the client state is updated accordingly.
    useEffect(() => {
        setDebts(initialDebts);
    }, [initialDebts]);

    const handleDebtChange = () => {
        // We no longer need to manually refetch. 
        // revalidatePath from the server action will trigger a page re-render with fresh data.
        // This function is kept for potential future optimistic updates.
        router.refresh();
    };


    const customerDebts = debts.filter(d => d.DebtorType === 'Customer');
    const driverDebts = debts.filter(d => d.DebtorType === 'Driver');
    const branchDebts = debts.filter(d => d.DebtorType === 'Branch');

    return (
        <Card>
            <CardHeader>
                <CardTitle>سجلات الديون</CardTitle>
                <CardDescription>اختر الفئة لعرض الديون المستحقة.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="customers" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="customers">ديون العملاء</TabsTrigger>
                        <TabsTrigger value="drivers">ديون السائقين</TabsTrigger>
                        <TabsTrigger value="branches">ديون الفروع</TabsTrigger>
                    </TabsList>
                    <TabsContent value="customers">
                        <CustomerDebtsTab
                            debts={customerDebts}
                            branches={branches}
                            onDebtChange={handleDebtChange}
                            userRole={userRole}
                            currentUserBranchId={currentUserBranchId}
                        />
                    </TabsContent>
                    <TabsContent value="drivers">
                        <DriverDebtsTab
                            debts={driverDebts}
                            drivers={drivers}
                            branches={branches}
                            onDebtChange={handleDebtChange}
                            userRole={userRole}
                            currentUserBranchId={currentUserBranchId}
                        />
                    </TabsContent>
                    <TabsContent value="branches">
                        <BranchDebtsTab
                            debts={branchDebts}
                            branches={branches}
                            onDebtChange={handleDebtChange}
                            userRole={userRole}
                            session={session}
                        />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
