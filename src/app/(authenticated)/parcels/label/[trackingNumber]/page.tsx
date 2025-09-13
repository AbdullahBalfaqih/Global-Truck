"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ParcelLabel } from '@/components/parcels/ParcelLabel';
import { getParcelByTrackingNumber } from '@/actions/getparcels';
import { getAllBranches } from '@/actions/branches';
import type { Parcel, Branch } from '@/types';
import { Printer, ArrowRight, Loader2, Share2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { toPng } from 'html-to-image';

function LabelContent() {
    const params = useParams();
    const { toast } = useToast();
    const trackingNumber = params.trackingNumber as string;
    const [parcel, setParcel] = useState<Parcel | null>(null);
    const [originBranch, setOriginBranch] = useState<Branch | null>(null);
    const [destinationBranch, setDestinationBranch] = useState<Branch | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const labelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchParcelData = async () => {
            if (!trackingNumber) {
                setError("رقم التتبع غير متوفر.");
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const parcelData = await getParcelByTrackingNumber(trackingNumber);

                if (parcelData?.parcel) {
                    const branchesData = await getAllBranches();
                    const p = parcelData.parcel;
                    setParcel(p);
                    setOriginBranch(branchesData.find(b => b.BranchID === p.OriginBranchID) || null);
                    setDestinationBranch(branchesData.find(b => b.BranchID === p.DestinationBranchID) || null);
                } else {
                    setError(`لم يتم العثور على طرد برقم التتبع: ${trackingNumber}`);
                    setParcel(null);
                }
            } catch (err: any) {
                console.error("Error fetching parcel data:", err);
                setError("حدث خطأ أثناء جلب بيانات الطرد.");
                setParcel(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchParcelData();
    }, [trackingNumber]);

    const handlePrint = () => {
        const printUrl = `/parcels/label/print?trackingNumber=${trackingNumber}`;
        window.open(printUrl, '_blank');
    };

    const handleShare = useCallback(async () => {
        if (!labelRef.current) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'لا يمكن العثور على محتوى الملصق للمشاركة.' });
            return;
        }
        if (!navigator.share) {
            toast({ variant: 'destructive', title: 'غير مدعوم', description: 'متصفحك لا يدعم ميزة المشاركة.' });
            return;
        }

        try {
            toast({ title: 'جاري تحضير الصورة...', description: 'قد تستغرق هذه العملية بضع ثوان.' });

            const dataUrl = await toPng(labelRef.current, {
                quality: 1,          // أعلى جودة للـ PNG (0-1 فقط، 1 هو الأفضل)
                cacheBust: true,     // لتجنب التخزين المؤقت عند تحميل الموارد
                pixelRatio: 3,       // زيادة دقة الصورة (2.5 → 3 أو أعلى حسب حاجتك)
                skipFonts: true,     // لتجنب أخطاء CORS مع الخطوط الخارجية
                backgroundColor: '#ffffff', // ضمان خلفية بيضاء واضحة
            });


            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], `label_${trackingNumber}.png`, { type: blob.type });

            await navigator.share({
                title: `ملصق شحن: ${trackingNumber}`,
                text: `ملصق شحن للطرد رقم ${trackingNumber}`,
                files: [file],
            });
        } catch (err: any) {
            console.error('Share error:', err);
            if (err.name !== 'AbortError') {
                let errorMessage = `حدث خطأ أثناء محاولة مشاركة الملصق: ${err.message}`;
                if (err.message.includes('cors')) {
                    errorMessage = 'فشل تحميل بعض الموارد الخارجية (مثل الخطوط) بسبب قيود أمنية. قد تظهر الصورة بشكل مختلف.';
                }
                toast({ variant: 'destructive', title: 'فشل المشاركة', description: errorMessage });
            }
        }
    }, [trackingNumber, toast]);

    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)]">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p>جاري تحميل بيانات الملصق...</p>
            </div>
        );
    }

    if (error || !parcel) {
        return (
            <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)] text-center">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-destructive">خطأ في عرض الملصق</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>{error || `عذرًا، لم نتمكن من العثور على طرد برقم التتبع: ${trackingNumber}`}</p>
                        <Button asChild className="mt-4">
                            <Link href="/parcels/list">
                                <ArrowRight className="me-2 h-4 w-4" />
                                العودة إلى قائمة الطرود
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6">
            <div className="flex justify-between items-center mb-6 print:hidden">
                <h1 className="text-2xl font-bold">ملصق الشحن</h1>
                <div className="flex gap-2">
                    <Button asChild variant="outline">
                        <Link href="/parcels/list">
                            <ArrowRight className="me-2 h-4 w-4" />
                            رجوع
                        </Link>
                    </Button>
                    <Button onClick={handleShare} variant="secondary">
                        <Share2 className="me-2 h-4 w-4" /> مشاركة
                    </Button>
                    <Button onClick={handlePrint}>
                        <Printer className="me-2 h-4 w-4" /> طباعة الملصق
                    </Button>
                </div>
            </div>
            <div ref={labelRef}>
                <ParcelLabel parcel={parcel} originBranch={originBranch} destinationBranch={destinationBranch} />
            </div>
        </div>
    );
}

export default function ParcelLabelViewPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <LabelContent />
        </Suspense>
    );
}
