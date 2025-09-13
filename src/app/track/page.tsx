"use client";

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { motion } from "framer-motion";
import { ArrowUpRight, ChevronDown, Menu, X, Handshake, Star, Truck, Zap, ShieldCheck, Globe, LocateFixed, Link as LinkIcon, Mail, PhoneCall } from 'lucide-react';
import { TrackingClient } from '@/components/tracking/TrackingClient';
import dynamic from 'next/dynamic';
import type { Branch } from '@/types';
import { YemenFlag } from '@/components/icons/YemenFlag';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AnimatedCounter } from '@/components/tracking/AnimatedCounter';

const InteractiveBranchesMap = dynamic(() => import('@/components/tracking/InteractiveBranchesMap'), {
    ssr: false,
    loading: () => <div className="w-full h-[500px] bg-gray-900 flex justify-center items-center"><p className="text-white">جاري تحميل الخريطة...</p></div>
});

const branchData: Branch[] = [
    { BranchID: 1, Name: "فرع عدن", City: "عدن", Address: "الشيخ عثمان", Phone: "775661241", GoogleMapsLink: "12.885817607019051, 45.015027921169164", CreatedAt: "", UpdatedAt: "" },
    { BranchID: 2, Name: "فرع القطن", City: "القطن", Address: "الشارع العام", Phone: "778393933", GoogleMapsLink: "15.850349615101031, 48.36998448066863", CreatedAt: "", UpdatedAt: "" },
    { BranchID: 3, Name: "فرع سيئون", City: "سيئون", Address: "شارع الجزائر", Phone: "775273851", GoogleMapsLink: "15.94869512647297, 48.79052996616541", CreatedAt: "", UpdatedAt: "" },
    { BranchID: 4, Name: "فرع المسافر", City: "المسافر", Address: "مجمع البريكي", Phone: "718212313", GoogleMapsLink: "15.365545511068259, 47.00564277633749", CreatedAt: "", UpdatedAt: "" },
    { BranchID: 4, Name: "فرع صنعاء", City: "صنعاء", Address: "الدائري", Phone: "718212314", GoogleMapsLink: "15.355615886662834, 44.21565467557848", CreatedAt: "", UpdatedAt: "" },
    { BranchID: 4, Name: "فرع المكلا", City: "المكلا", Address: "شارع الخور", Phone: "782775566", GoogleMapsLink: "14.533922662014263, 49.12727674478351", CreatedAt: "", UpdatedAt: "" },
];

const stats = [
    { icon: Handshake, value: 30, label: "شركاء شحن", suffix: "" },
    { icon: Truck, value: 40, label: "ألف شحنة شهرية", suffix: "k" },
    { icon: Star, value: 20.3, label: "ألف عميل دائم", suffix: "k" },
];


function TrackingPageContent() {
    const { toast } = useToast();
    const [isNavOpen, setIsNavOpen] = useState(false);
    const [language, setLanguage] = useState<'ar' | 'en'>('ar');
    const heroRef = useRef<HTMLDivElement>(null);
    const whyRef = useRef<HTMLDivElement>(null);
    const branchesRef = useRef<HTMLDivElement>(null);
    const responsibilityRef = useRef<HTMLDivElement>(null);
    const contactRef = useRef<HTMLDivElement>(null);

    const mapRef = useRef<any>(null);

    const searchParams = useSearchParams();
    const trackingNumberFromQuery = searchParams.get('trackingNumber');
    useEffect(() => {
        const consent = localStorage.getItem('cookie_consent');
        if (!consent) {
            toast({
                title: "سياسة الخصوصية والكوكيز",
                description: "نحن نستخدم الكوكيز لتأمين تجربة البحث الخاصة بك. سيتم حظر البحث بعد 3 محاولات خاطئة.",
                duration: 10000,
            });
            localStorage.setItem('cookie_consent', 'true');
        }
    }, [toast]);

    const scrollTo = (ref: React.RefObject<HTMLDivElement>) => {
        ref.current?.scrollIntoView({ behavior: 'smooth' });
        setIsNavOpen(false);
    };

    const handleFindNearest = () => {
        if (mapRef.current) {
            mapRef.current.findNearestBranch();
        } else {
            toast({
                title: "خطأ",
                description: "الخريطة لم يتم تحميلها بالكامل بعد.",
                variant: "destructive"
            });
        }
    };
    const toggleLanguage = () => {
        setLanguage(prev => prev === 'ar' ? 'en' : 'ar');
    };
    const navLinks = [
        { name: "الرئيسية", ref: heroRef },
        { name: "لماذا نحن؟", ref: whyRef },
        { name: "أفرعنا", ref: branchesRef },
        { name: "مسؤوليتنا", ref: responsibilityRef },
        { name: "تواصل", ref: contactRef },
    ];

    const sidebarContent = (
        <>
            <div className="flex-shrink-0 flex items-center mb-12">
                <img
                    src="/images/logo.png"
                    alt="شعار الشركة"
                    className="h-16 w-auto print:h-12 object-contain"
                    data-ai-hint="company logo"
                    onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                    }}
                />
            </div>

            <nav className="flex-1 space-y-4">
                <ul className="space-y-4">
                    {navLinks.map((link) => (
                        <li key={link.name} className="text-lg font-bold text-white hover:text-yellow-400 transition-colors cursor-pointer" onClick={() => scrollTo(link.ref)}>
                            {link.name}
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="mt-auto pt-8">
                <button className="w-full bg-yellow-400 text-black rounded-lg p-4 flex justify-between items-center text-lg font-bold" onClick={() => scrollTo(heroRef)}>
                    <span>تتبع طلبك الآن</span>
                    <ArrowUpRight className="h-6 w-6" />
                </button>
            </div>
        </>
    );

    return (
        <div className="relative min-h-screen w-full bg-black text-white overflow-x-hidden font-almarai">

            <aside className="fixed inset-y-0 right-0 hidden lg:flex flex-col p-8 border-l border-gray-800 w-72 text-right">
                {sidebarContent}
            </aside>

            <header className="fixed top-0 left-0 right-0 z-50 flex lg:hidden justify-between items-center p-4 bg-black/80 backdrop-blur-sm border-b border-gray-800">
                
                    <img
                        src="/images/logo.png"
                        alt="شعار الشركة"
                        className="h-8 w-auto print:h-6 object-contain"
                        data-ai-hint="company logo"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
               
                <button onClick={() => setIsNavOpen(!isNavOpen)} aria-label="Toggle navigation">
                    {isNavOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </header>

            <motion.div
                initial={false}
                animate={{ x: isNavOpen ? 0 : '100%' }}
                transition={{ duration: 0.3 }}
                className="fixed inset-y-0 right-0 w-64 bg-black border-l border-gray-800 p-8 z-40 flex flex-col lg:hidden"
            >
                {sidebarContent}
            </motion.div>

            <main className="flex-1 flex flex-col lg:mr-72">

                <section ref={heroRef} className="flex-1 flex flex-col lg:flex-row min-h-screen border-b border-gray-800">
                    <div className="flex-1 p-8 lg:p-16 flex flex-col justify-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            className="max-w-3xl"
                        >
                            <div className="w-full flex flex-col items-center justify-start pt-8 sm:pt-16 px-4">
                                <h1 className="font-extrabold leading-tight tracking-tighter text-center text-[clamp(2rem,5vw,4rem)]">
                                    اكتشف أفضل طريقة<br />
                                    لشحن طرودك
                                </h1>
                            </div>



                            <p className="mt-6 text-lg text-gray-400 max-w-xl leading-relaxed">
                                الجعيدي للنقل، شريكك الموثوق لشحن الطرود والبضائع في جميع أنحاء الجمهورية اليمنية. سرعة، أمان، ودقة في المواعيد.
                            </p>
                        </motion.div>
                    </div>
                    <div className="flex-1 p-8 lg:p-16 flex flex-col items-center justify-center">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="w-full max-w-md bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 shadow-2xl"
                        >
                            <h2 className="text-3xl font-bold text-center text-white mb-6">تتبع شحنتك</h2>
                            <TrackingClient initialTrackingNumber={trackingNumberFromQuery} />
                        </motion.div>
                    </div>
                </section>

                <section ref={whyRef} className="py-24 px-8 lg:px-16 border-b border-gray-800">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                        {stats.map((stat, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                className="flex flex-col items-center"
                            >
                                <motion.div whileHover={{ scale: 1.2, rotate: -10 }}>
                                    <stat.icon className="h-12 w-12 text-yellow-400" />
                                </motion.div>
                                <AnimatedCounter from={0} to={stat.value} suffix={stat.suffix} />
                                <p className="text-muted-foreground mt-1">{stat.label}</p>
                            </motion.div>
                        ))}
                    </div>
                </section>

                <section ref={branchesRef} className="bg-gray-950 py-24 px-8 lg:px-16 border-b border-gray-800">
                    <div className="container mx-auto">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-12">
                            <div className="text-center md:text-right mb-6 md:mb-0">
                                <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">أفرعنا في خدمتكم</h2>
                                <p className="text-lg text-gray-400 max-w-2xl leading-relaxed">
                                    شبكة فروعنا تغطي المدن الرئيسية لضمان وصول شحناتكم بسرعة وأمان.
                                </p>
                            </div>
                            <Button onClick={handleFindNearest} size="lg" className="bg-yellow-400 text-black hover:bg-yellow-500 font-bold">
                                <LocateFixed className="me-2 h-5 w-5" />
                                حدد لي أقرب فرع
                            </Button>
                        </div>
                        <div className="rounded-xl overflow-hidden shadow-2xl relative">
                            <InteractiveBranchesMap branches={branchData} ref={mapRef} />
                        </div>
                    </div>
                </section>

                <section ref={responsibilityRef} className="py-24 px-8 lg:px-16">
                    <div className="container mx-auto">
                        <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">مسؤوليتنا</h2>
                        <p className="text-lg text-gray-400 max-w-2xl leading-relaxed mb-12">
                            نلتزم بتقديم أفضل خدمة، ويرجى العلم بالشروط التالية لضمان تجربة سلسة للجميع.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[
                                "نحن غير مسؤولين عن الإجراءات الأمنية الخارجة عن إرادتنا.",
                                "نحن غير مسؤولين عن الأشياء الثمينة الممنوع إرسالها في الطرد.",
                                "نحن غير مسؤولين عن بقاء الطرد لأكثر من شهر.",
                                "نحن غير مسؤولين عن الأشياء غير المذكورة أعلاه.",
                                "نحن غير مسؤولين عن الحوادث والحريق."
                            ].map((item, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                    className="bg-gray-900 rounded-xl p-6 border-t-2 border-yellow-400 flex items-start gap-4"
                                >
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-400/20 text-yellow-400 flex items-center justify-center font-bold">{index + 1}</div>
                                    <p className="text-gray-300 text-sm">{item}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                <footer ref={contactRef} className="py-20 px-8 lg:px-16 border-t border-gray-800 bg-gray-950">
                    <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
                        <div className="md:col-span-1">
                            <img
                                src="/images/g.png"
                                alt="شعار الشركة"
                                className="h-28 w-auto print:h-20 object-contain"
                                data-ai-hint="company logo"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />

                            <p className="text-muted-foreground text-sm">جلوبال تراك هو نظام متكامل لإدارة وتتبع الشحنات، مصمم ليكون شريكك اللوجستي الأمثل.</p>
                        </div>
                        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div>
                                <h3 className="font-bold text-lg mb-4 text-yellow-400">أهم المزايا</h3>
                                <ul className="space-y-3 text-sm text-muted-foreground">
                                    <li className="flex items-center gap-3 hover:text-white transition-colors"><Globe size={18} className="text-yellow-400" /> <span>تغطية شاملة لجميع المحافظات</span></li>
                                    <li className="flex items-center gap-3 hover:text-white transition-colors"><Zap size={18} className="text-yellow-400" /> <span>كفاءة تشغيلية وسرعة في التوصيل</span></li>
                                    <li className="flex items-center gap-3 hover:text-white transition-colors"><ShieldCheck size={18} className="text-yellow-400" /> <span>أمان وموثوقية عالية لشحناتك</span></li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg mb-4 text-yellow-400">تواصل معنا</h3>
                                <ul className="space-y-3 text-sm text-muted-foreground">
                                    <li className="flex items-center gap-3 hover:text-white transition-colors"><Mail size={18} className="text-yellow-400" /> <a href="mailto:abdullahbalfaqih0@gmail.com" className="hover:underline">abdullahbalfaqih0@gmail.com</a></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="text-center mt-16 pt-8 border-t border-gray-800">
                        <motion.p
                            className="text-lg font-bold text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]"
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1 }}
                        >
                            GlobalTrack - Your Ultimate Logistics Partner
                        </motion.p>
                        <p className="text-xs text-gray-500 mt-4">
                            جميع الحقوق محفوظة © {new Date().getFullYear()} | تطوير: abdullahbalfaqih0@gmail.com
                        </p>
                    </div>
                </footer>

            </main>
        </div>
    );
}

export default function ParcelTrackingPage() {
    return (
        <Suspense fallback={<div className="bg-black text-white flex justify-center items-center h-screen">Loading...</div>}>
            <TrackingPageContent />
        </Suspense>
    );
}
