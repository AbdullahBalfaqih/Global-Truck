// /app/driver-location/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function DriverLocationUpdater() {
    const searchParams = useSearchParams();
    const driverId = searchParams.get("driverId");

    const [status, setStatus] = useState("🟡 جاري تحديد الموقع...");
    const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);

    useEffect(() => {
        if (!driverId) {
            setStatus("❌ لم يتم تحديد معرف السائق.");
            return;
        }

        const updateLocation = async (lat: number, lng: number) => {
            try {
                const res = await fetch("/api/drivers/update-location", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        driverId, // ✅ أرسلها كما هي (نص)
                        latitude: lat,
                        longitude: lng,
                    })
,
                });

                if (!res.ok) throw new Error("فشل الإرسال");

                setStatus("✅ تم تحديث الموقع");
            } catch (error) {
                setStatus("❌ فشل التحديث");
            }
        };

        const startTracking = () => {
            navigator.geolocation.watchPosition(
                (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    setPosition({ lat, lng });
                    updateLocation(lat, lng);
                },
                (err) => {
                    setStatus("❌ لم يتم السماح بالحصول على الموقع");
                    console.error(err);
                },
                { enableHighAccuracy: true }
            );
        };

        if ("geolocation" in navigator) {
            startTracking();
        } else {
            setStatus("❌ المتصفح لا يدعم تحديد الموقع");
        }
    }, [driverId]);

    return (
        <main className="flex flex-col items-center justify-center min-h-screen text-center p-6 space-y-4">
            <h1 className="text-2xl font-bold">📍 تحديث موقع السائق</h1>
            <p>{status}</p>
            {position && (
                <div className="text-sm text-muted-foreground">
                    <p>Latitude: {position.lat.toFixed(6)}</p>
                    <p>Longitude: {position.lng.toFixed(6)}</p>
                </div>
            )}
            {!position && <p className="text-sm text-muted">جاري تحديد الموقع...</p>}
        </main>
    );
}
