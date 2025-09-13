"use client";

import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, Hash } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getParcelForCustomer } from '@/actions/getparcels';
import { getAllBranches } from '@/actions/branches';
import { getDriverLocation } from '@/actions/drivers';
import type { Parcel, Branch, DriverLocation } from '@/types';
import { TrackingResultDisplay } from './TrackingResultDisplay';
import { YemenFlag } from '../icons/YemenFlag';
import { PackageSearch } from 'lucide-react';
import { InteractiveBarcode } from './InteractiveBarcode';
import { useToast } from '@/hooks/use-toast';

const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 دقائق

export function TrackingClient({ initialTrackingNumber }: { initialTrackingNumber?: string | null }) {
    const { toast } = useToast();
    const [trackingNumber, setTrackingNumber] = useState(initialTrackingNumber || '');
    const [receiverPhone, setReceiverPhone] = useState('');
    const [parcel, setParcel] = useState<Parcel | null>(null);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searched, setSearched] = useState(false);

    // حالة عدد المحاولات والفترة المؤقتة
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [isLockedOut, setIsLockedOut] = useState(false);
    const [lockoutUntil, setLockoutUntil] = useState(0);

    useEffect(() => {
        const attempts = parseInt(localStorage.getItem('failed_search_attempts') || '0', 10);
        const until = parseInt(localStorage.getItem('search_lockout_until') || '0', 10);

        if (until > Date.now()) {
            setIsLockedOut(true);
            setLockoutUntil(until);
        } else {
            setFailedAttempts(attempts);
        }
    }, []);

    const handleFailedAttempt = () => {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        localStorage.setItem('failed_search_attempts', newAttempts.toString());

        if (newAttempts >= MAX_ATTEMPTS) {
            const until = Date.now() + LOCKOUT_DURATION_MS;
            setLockoutUntil(until);
            setIsLockedOut(true);
            localStorage.setItem('search_lockout_until', until.toString());
            toast({
                variant: 'destructive',
                title: "تم حظر البحث",
                description: `لقد تجاوزت الحد الأقصى للمحاولات (${MAX_ATTEMPTS}). حاول مرة أخرى بعد 5 دقائق.`,
                duration: 10000,
            });
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isLockedOut && Date.now() < lockoutUntil) {
            const minutesLeft = Math.ceil((lockoutUntil - Date.now()) / 60000);
            setError(`لقد تجاوزت الحد الأقصى للمحاولات. حاول مرة أخرى بعد ${minutesLeft} دقيقة.`);
            return;
        }

        if (!trackingNumber.trim()) {
            setError("الرجاء إدخال رقم التتبع.");
            return;
        }

        if (!receiverPhone.trim()) {
            setError("الرجاء إدخال رقم هاتف المستلم.");
            return;
        }

        const phoneRegex = /^(70|71|73|77|78)\d{7}$/;
        if (!phoneRegex.test(receiverPhone.trim())) {
            setError("رقم الهاتف غير صالح. يجب أن يبدأ بـ 70,71,73,77,78 ويحتوي على 9 أرقام.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setParcel(null);
        setDriverLocation(null);
        setSearched(true);

        try {
            const foundParcel = await getParcelForCustomer(trackingNumber.trim(), receiverPhone.trim());
            const allBranches = await getAllBranches();

            if (foundParcel) {
                setParcel(foundParcel);
                setBranches(allBranches);

                if (foundParcel.AssignedDriverID && (foundParcel.Status === 'InTransit' || foundParcel.Status === 'قيد التوصيل')) {
                    const location = await getDriverLocation(foundParcel.AssignedDriverID);
                    setDriverLocation(location);
                }

                // إعادة ضبط المحاولات عند النجاح
                localStorage.removeItem('failed_search_attempts');
                localStorage.removeItem('search_lockout_until');
                setFailedAttempts(0);
                setIsLockedOut(false);

            } else {
                setError(`لم يتم العثور على شحنة برقم التتبع ورقم الهاتف المدخلين.`);
                handleFailedAttempt();
            }
        } catch (err) {
            console.error("Tracking search error:", err);
            setError("حدث خطأ أثناء البحث. حاول مرة أخرى.");
            handleFailedAttempt();
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (initialTrackingNumber) {
            const fakeEvent = { preventDefault: () => { } } as React.FormEvent;
            handleSearch(fakeEvent);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialTrackingNumber]);

    const originBranch = useMemo(() => {
        if (!parcel) return null;
        return branches.find(b => b.BranchID === parcel.OriginBranchID) || null;
    }, [parcel, branches]);

    const destinationBranch = useMemo(() => {
        if (!parcel) return null;
        return branches.find(b => b.BranchID === parcel.DestinationBranchID) || null;
    }, [parcel, branches]);

    return (
        <div className="w-full flex flex-col items-center text-center">
            <form onSubmit={handleSearch} className="w-full space-y-4">
                <div className="relative">
                    <InteractiveBarcode />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Hash className="h-5 w-5 text-gray-400 absolute left-3 rtl:right-3" />
                        <Input
                            type="search"
                            value={trackingNumber}
                            onChange={(e) => setTrackingNumber(e.target.value)}
                            placeholder="أدخل رقم التتبع هنا..."
                            className="h-14 text-lg pl-12 rtl:pr-12 w-full bg-transparent border-none text-white placeholder:text-gray-500 focus:ring-0 text-center pointer-events-auto"
                            required
                        />
                    </div>
                </div>
                <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 rtl:right-3 rtl:left-auto pointer-events-none">
                        <YemenFlag className="w-5 h-auto" />
                    </div>
                    <Input
                        type="tel"
                        value={receiverPhone}
                        onChange={(e) => setReceiverPhone(e.target.value)}
                        placeholder="رقم هاتف المستلم"
                        className="h-14 text-lg pl-14 rtl:pr-14 w-full bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-yellow-400 focus:ring-yellow-400"
                        maxLength={9}
                        required
                    />
                </div>

                <Button
                    type="submit"
                    size="lg"
                    disabled={isLoading || isLockedOut || !trackingNumber.trim()}
                    className="w-full h-14 text-lg font-bold bg-yellow-400 text-black hover:bg-yellow-500 flex items-center justify-center gap-2">
                    {isLoading ? "جاري البحث..." : "بحث"}
                    {!isLoading && <Search className="h-6 w-6" />}
                    {isLoading && <Loader2 className="h-6 w-6 animate-spin" />}
                </Button>
            </form>

            <div className="mt-8 w-full">
                {isLoading && (
                    <div className="text-center mt-8">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-yellow-400" />
                        <p className="mt-2 text-gray-400">جاري البحث...</p>
                    </div>
                )}

                {searched && !isLoading && (parcel ? (
                    <TrackingResultDisplay
                        parcel={parcel}
                        originBranch={originBranch}
                        destinationBranch={destinationBranch}
                        driverLocation={driverLocation}
                    />
                ) : (
                    <Alert variant="destructive" className="mt-8 bg-red-900/50 border-red-500 text-red-300">
                        <PackageSearch className="h-4 w-4 text-red-400" />
                        <AlertTitle>خطأ في البحث</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                ))}
            </div>
        </div>
    );
}
