"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Map, RefreshCw, Loader2 } from "lucide-react";
import { getAllBranches } from "@/actions/branches";
import { getAllDriverLocations } from "@/actions/drivers";
import type { Branch, DriverLocation } from '@/types';
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function RouteMapPage() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [driverLocations, setDriverLocations] = useState<DriverLocation[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const mapRef = useRef<HTMLDivElement>(null);
    const leafletMap = useRef<L.Map>();

    const driverIcon = new L.Icon({
        iconUrl: "https://cdn-icons-png.flaticon.com/512/8308/8308444.png",
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40],
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [allBranches, allDrivers] = await Promise.all([
                getAllBranches(),
                getAllDriverLocations()
            ]);
            setBranches(allBranches);
            setDriverLocations(allDrivers);

            if (!leafletMap.current) return;

            // إزالة الطبقات القديمة (الـ markers و polyline)
            leafletMap.current.eachLayer((layer) => {
                if ((layer as any)._url === undefined) leafletMap.current?.removeLayer(layer);
            });

            const markers: L.Marker[] = [];
            const polylinePoints: [number, number][] = [];

            // رسم الفروع
            allBranches.forEach((branch) => {
                const coords = branch.GoogleMapsLink?.split(",").map(Number);
                if (coords && coords.length === 2) {
                    polylinePoints.push([coords[0], coords[1]]);
                    const marker = L.marker([coords[0], coords[1]], {
                        icon: L.icon({
                            iconUrl: "https://cdn-icons-png.flaticon.com/128/252/252025.png",
                            iconSize: [25, 41],
                            iconAnchor: [12, 41],
                            popupAnchor: [1, -34],
                            shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
                            shadowSize: [41, 41],
                        })
                    }).bindPopup(`<b>${branch.Name}</b><br/>${branch.City}<br/>${branch.Address}`);
                    marker.addTo(leafletMap.current!);
                    markers.push(marker);
                }
            });

            // رسم السائقين
            allDrivers.forEach((driver) => {
                if (driver.Latitude && driver.Longitude) {
                    const marker = L.marker([driver.Latitude, driver.Longitude], { icon: driverIcon })
                        .bindPopup(`<b>${driver.DriverName}</b><br/>آخر تحديث: ${new Date(driver.Timestamp).toLocaleString()}`);
                    marker.addTo(leafletMap.current!);
                    markers.push(marker);
                }
            });

            // رسم المسار بين الفروع باستخدام OSRM
            if (polylinePoints.length > 1) {
                const coordsString = polylinePoints.map(p => `${p[1]},${p[0]}`).join(";");
                const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`;

                const res = await fetch(osrmUrl);
                const data = await res.json();
                if (data.routes && data.routes.length > 0) {
                    const route = data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
                    L.polyline(route, { color: "blue", weight: 4, opacity: 0.7 }).addTo(leafletMap.current!);
                }
            }

            if (markers.length > 0) {
                const group = L.featureGroup(markers);
                leafletMap.current.fitBounds(group.getBounds().pad(0.5));
            }

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (mapRef.current && !leafletMap.current) {
            leafletMap.current = L.map(mapRef.current).setView([15.5527, 48.5164], 6);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }).addTo(leafletMap.current);
        }
        fetchData();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                    <Map className="h-7 w-7 text-primary" />
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">الخريطة التفاعلية للفروع والسائقين</h1>
                </div>
                <Button variant="outline" onClick={fetchData} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    تحديث البيانات
                </Button>
            </div>

            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle>الخريطة</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div ref={mapRef} className="w-full h-[600px]" />
                </CardContent>
            </Card>
        </div>
    );
}
