"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, Suspense, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { PrintableManifest } from '@/components/tasks/PrintableManifest';
import type { DeliveryManifest } from '@/types';
import { ArrowRight, Printer as PrinterIcon, Loader2, AlertCircle, Share2 } from 'lucide-react';
import { getManifestById } from '@/actions/manifests'; // تأكد من وجود هذه الدالة
import { toPng } from 'html-to-image';
import { useToast } from '@/hooks/use-toast';

export default function PrintManifestPage() {
    const params = useParams();
    const router = useRouter();
    const manifestId = params.manifestId as string;
    const [manifest, setManifest] = useState<DeliveryManifest | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const manifestRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    // دالة لطباعة الكشف
    const triggerPrint = useCallback(() => {
        setTimeout(() => {
            window.print();
        }, 500); // تأخير للسماح بالعرض
    }, []);
    const handleShare = useCallback(async () => {
        if (!manifestRef.current) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'لا يمكن العثور على محتوى الكشف للمشاركة.' });
            return;
        }
        if (!navigator.share) {
            toast({ variant: 'destructive', title: 'غير مدعوم', description: 'متصفحك لا يدعم ميزة المشاركة.' });
            return;
        }

        try {
            const dataUrl = await toPng(manifestRef.current, {
                quality: 1,           // أعلى جودة JPEG/PNG
                pixelRatio: 3,        // مضاعفة الدقة (2 أو 3 لصور أوضح)
                cacheBust: true,      // لتجنب مشاكل التخزين المؤقت
                backgroundColor: '#ffffff', // يمكن تحديد خلفية بيضاء إذا الشفافية تسبب مشاكل
            });
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], `${manifestId}.png`, { type: blob.type });

            await navigator.share({
                title: `كشف توصيل رقم: ${manifestId}`,
                text: `كشف توصيل للسائق: ${manifest?.DriverName}`,
                files: [file],
            });
        } catch (err: any) {
            console.error('Share error:', err);
            toast({ variant: 'destructive', title: 'فشل المشاركة', description: `حدث خطأ أثناء محاولة مشاركة الكشف: ${err.message}` });
        }
    }, [manifestId, manifest?.DriverName, toast]);

    useEffect(() => {
        const fetchManifest = async () => {
            setIsLoading(true);
            const fetchedManifest = await getManifestById(manifestId);
            console.log("Fetched Manifest:", fetchedManifest); // تحقق من البيانات
            setManifest(fetchedManifest);
            setIsLoading(false);
        };

        fetchManifest();
    }, [manifestId]);

    useEffect(() => {
        if (manifest && !isLoading) {
            triggerPrint();
        }
    }, [manifest, isLoading, triggerPrint]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
                <p>جاري تحميل الكشف للطباعة...</p>
            </div>
        );
    }

    if (!manifest) {
        return (
            <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)] text-center p-4">
                <h1 className="text-xl font-semibold mb-2">لم يتم العثور على الكشف</h1>
                <p>عذرًا، لم نتمكن من العثور على كشف بالمعرف: {manifestId}</p>
                <Button onClick={() => router.back()} className="mt-4 print:hidden">
                    <ArrowRight className="me-2 h-4 w-4" />
                    العودة
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 print:py-0 print:mx-0 print:container-none">
            <div className="flex justify-between items-center mb-6 print:hidden">
                <h1 className="text-2xl font-bold">معاينة طباعة الكشف</h1>
                <div className="flex gap-2">
                    <Button onClick={triggerPrint} variant="default">
                        <PrinterIcon className="me-2 h-4 w-4" />
                        طباعة الكشف مرة أخرى
                    </Button>
                    <Button onClick={handleShare} variant="secondary">
                        <Share2 className="me-2 h-4 w-4" />
                        مشاركة
                    </Button>
                    <Button onClick={() => router.back()} variant="outline">
                        <ArrowRight className="me-2 h-4 w-4" />
                        العودة إلى المهام
                    </Button>
                </div>
            </div>
            <div ref={manifestRef}>
                <PrintableManifest manifest={manifest} />
            </div>
        </div>
    );
}