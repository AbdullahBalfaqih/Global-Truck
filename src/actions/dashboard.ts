
"use server";

import { getSession } from "@/actions/auth";
import type { Stat, ParcelsByStatusData, ParcelStatus, UserRole } from '@/types';
import { supabase } from "@/lib/db";

// دالة مساعدة لتنسيق العملة
const formatCurrencyYER = (value: number | undefined | null) => {
    if (value === undefined || value === null || isNaN(value)) return '0 ر.ي';
    return new Intl.NumberFormat('ar-YE', { style: 'currency', currency: 'YER', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

export async function getDashboardStatsData(branchId?: number | null, userRole?: UserRole): Promise<Stat[]> {
    const stats: Omit<Stat, 'icon'>[] = []; // Omit icon as it's a UI concern

    try {
        // --- Parcel Counts ---
        let parcelQuery = supabase.from('Parcels').select('*', { count: 'exact', head: true });
        let pendingQuery = supabase.from('Parcels').select('*', { count: 'exact', head: true }).eq('Status', 'قيد المعالجة');
        let inTransitQuery = supabase.from('Parcels').select('*', { count: 'exact', head: true }).eq('Status', 'قيد النقل');

        if (userRole === 'BranchEmployee' && branchId) {
            parcelQuery = parcelQuery.or(`OriginBranchID.eq.${branchId},DestinationBranchID.eq.${branchId}`);
            pendingQuery = pendingQuery.eq('OriginBranchID', branchId);
            inTransitQuery = inTransitQuery.or(`OriginBranchID.eq.${branchId},DestinationBranchID.eq.${branchId}`);
        }

        const [
            totalParcelsResult,
            pendingParcelsResult,
            inTransitParcelsResult
        ] = await Promise.all([
            parcelQuery,
            pendingQuery,
            inTransitQuery
        ]);

        stats.push({ title: 'إجمالي الطرود', value: String(totalParcelsResult.count || 0) });
        stats.push({ title: 'طرود قيد المعالجة', value: String(pendingParcelsResult.count || 0) });
        stats.push({ title: 'طرود قيد التوصيل', value: String(inTransitParcelsResult.count || 0) });

        // --- Financial Stats ---
        if (userRole === 'Admin' || userRole === 'Developer') {
            const { data: totalRevenue, error: totalRevenueError } = await supabase
                .from('Parcels')
                .select('ShippingCost')
                .eq('IsPaid', true);

            if (totalRevenueError) throw totalRevenueError;
            const total = totalRevenue.reduce((sum, item) => sum + item.ShippingCost, 0);
            stats.push({ title: 'إجمالي الإيرادات', value: formatCurrencyYER(total) });
        }

        if (branchId) {
            const { data: branchRevenue, error: branchRevenueError } = await supabase
                .from('Parcels')
                .select('ShippingCost')
                .eq('IsPaid', true)
                .eq('OriginBranchID', branchId);

            if (branchRevenueError) throw branchRevenueError;
            const total = branchRevenue.reduce((sum, item) => sum + item.ShippingCost, 0);
            stats.push({ title: 'إيرادات فرعك', value: formatCurrencyYER(total) });
        }

    } catch (error: any) {
        console.error("Database error fetching dashboard stats:", error);
        stats.push({ title: 'خطأ في التحميل', value: 'DB Error' });
    }

    // Icons will be added in the UI component, not here in the server action.
    // This casting is safe because we know the UI will add the icon.
    return stats as Stat[];
}


export async function getParcelsByStatusChartData(branchId?: number | null, userRole?: UserRole): Promise<ParcelsByStatusData[]> {
    try {
        let query = supabase.from('Parcels').select('Status');

        if (userRole === 'BranchEmployee' && branchId) {
            query = query.or(`OriginBranchID.eq.${branchId},DestinationBranchID.eq.${branchId}`);
        }

        const { data, error } = await query;

        if (error) throw error;
        if (!data) return [];

        // Manual grouping in JavaScript with explicit typing for the accumulator's argument
        const statusCounts = data.reduce((acc, { Status }: { Status: ParcelStatus }) => {
            if (Status) {
                acc[Status] = (acc[Status] || 0) + 1;
            }
            return acc;
        }, {} as Record<ParcelStatus, number>);


        return Object.entries(statusCounts).map(([status, count]) => ({
            status: status as ParcelStatus,
            count: count,
            fill: status === 'Pending' || status === 'قيد المعالجة' ? 'var(--color-chart-1)' :
                status === 'InTransit' || status === 'قيد النقل' ? 'var(--color-chart-2)' :
                    status === 'Delivered' || status === 'تم التوصيل' ? 'var(--color-chart-4)' :
                        status === 'Cancelled' || status === 'ملغى' ? 'var(--color-chart-5)' :
                            'var(--color-chart-3)'
        }));

    } catch (error: any) {
        console.error("Database error fetching parcels by status chart data:", error);
        return [];
    }
}
