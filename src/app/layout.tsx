
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import 'leaflet/dist/leaflet.css';

export const metadata: Metadata = {
    title: 'الجعيدي للنقل',
    description: 'نظام شامل لتتبع الطرود',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ar" dir="rtl">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&display=swap" rel="stylesheet" />
            </head>
            <body className="antialiased font-almarai">
                <main>{children}</main>
                <Toaster />
            </body>
        </html>
    );
}
