"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLngExpression } from "leaflet";
import type { Branch, DriverLocation } from "@/types";
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: iconUrl.src,         // <-- لاحظ .src هنا
    iconRetinaUrl: iconRetinaUrl.src,
    shadowUrl: shadowUrl.src,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;


L.Marker.prototype.options.icon = DefaultIcon;

const driverIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/8308/8308444.png", // Bus icon from Flaticon
    iconSize: [40, 40],
    iconAnchor: [20, 40], // Bottom-center anchor
    popupAnchor: [0, -40], // Position of the popup above the icon
});



const YemenCenter: LatLngExpression = [15.5527, 48.5164];

interface RouteMapProps {
    originBranch?: Branch | null;
    destinationBranch?: Branch | null;
    driverLocation?: DriverLocation | null;
}

export default function RouteMap({ originBranch, destinationBranch, driverLocation }: RouteMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const leafletMap = useRef<L.Map>();

    const parseCoords = (text?: string | null): [number, number] | null => {
        if (!text) return null;
        const parts = text.split(",");
        if (parts.length === 2) {
            const lat = parseFloat(parts[0].trim());
            const lng = parseFloat(parts[1].trim());
            if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
        }
        return null;
    };

    useEffect(() => {
        if (!mapRef.current) return;

        if (leafletMap.current) {
            leafletMap.current.remove();
        }

        leafletMap.current = L.map(mapRef.current).setView(YemenCenter, 6);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(leafletMap.current);

        const markers: L.Marker[] = [];

        const originCoords = parseCoords(originBranch?.GoogleMapsLink || "");
        const destCoords = parseCoords(destinationBranch?.GoogleMapsLink || "");

        if (originCoords) markers.push(L.marker(originCoords).bindPopup(`فرع المصدر: ${originBranch?.Name}`));
        if (destCoords) markers.push(L.marker(destCoords).bindPopup(`فرع الوجهة: ${destinationBranch?.Name}`));

        if (driverLocation) {
            markers.push(
                L.marker([driverLocation.Latitude, driverLocation.Longitude], { icon: driverIcon }).bindPopup(
                    `السائق: ${driverLocation.DriverName}`
                )
            );
        }

        markers.forEach((m) => m.addTo(leafletMap.current!));

        // طلب المسار من OSRM المجاني
        const drawRoute = async () => {
            if (originCoords && destCoords) {
                const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originCoords[1]},${originCoords[0]};${destCoords[1]},${destCoords[0]}?overview=full&geometries=geojson`;
                const res = await fetch(osrmUrl);
                const data = await res.json();
                if (data.routes && data.routes.length > 0) {
                    const route = data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]]); // [lat, lng]
                    L.polyline(route, { color: "blue", weight: 4, opacity: 0.7 }).addTo(leafletMap.current!);
                    leafletMap.current!.fitBounds(L.polyline(route).getBounds().pad(0.5));
                }
            } else if (markers.length > 0) {
                const group = L.featureGroup(markers);
                leafletMap.current!.fitBounds(group.getBounds().pad(0.5));
            }
        };

        drawRoute();
    }, [originBranch, destinationBranch, driverLocation]);

    return <div ref={mapRef} className="w-full h-full" style={{ height: "400px" }} />;
}
