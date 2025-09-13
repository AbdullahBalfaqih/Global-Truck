"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import "leaflet-routing-machine";

import type { LatLng, LatLngExpression } from "leaflet";
import type { Branch } from "@/types";
import { Button } from "@/components/ui/button";
import { renderToStaticMarkup } from 'react-dom/server';
import { Phone, MapPin, ExternalLink } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";


// Fix for default icon issue with Leaflet and React
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconRetinaUrl: iconRetinaUrl.src,
    iconUrl: iconUrl.src,
    shadowUrl: shadowUrl.src,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom icon for user's location
const userIcon = L.divIcon({
    html: '<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-md"></div>',
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
});


const YemenCenter: LatLngExpression = [15.5527, 48.5164];

interface InteractiveBranchesMapProps {
    branches: Branch[];
}

const BranchPopup = ({ branch }: { branch: Branch }) => (
    <div className="p-1 font-almarai" dir="rtl">
        <h3 className="font-bold text-lg mb-2 text-foreground">{branch.Name}</h3>
        <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
            <MapPin size={14} className="text-primary" /> {branch.City} - {branch.Address}
        </p>
        <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
            <Phone size={14} className="text-primary" /> {branch.Phone}
        </p>
        <a href={`https://www.google.com/maps/search/?api=1&query=${branch.GoogleMapsLink}`} target="_blank" rel="noopener noreferrer">
            <Button size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                افتح خرائط جوجل <ExternalLink size={16} className="ms-2" />
            </Button>
        </a>
    </div>
);

// Define handle types for ref
export interface MapHandles {
    findNearestBranch: () => void;
}

const InteractiveBranchesMap = forwardRef<MapHandles, InteractiveBranchesMapProps>(({ branches }, ref) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<L.Map | null>(null);
    const routingControl = useRef<L.Routing.Control | null>(null);
    const userMarker = useRef<L.Marker | null>(null);
    const { toast } = useToast();

    const parseCoords = (linkOrCoords?: string | null): L.LatLng | null => {
        if (!linkOrCoords) return null;
        const coordMatch = linkOrCoords.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
        if (coordMatch) {
            return L.latLng(parseFloat(coordMatch[1]), parseFloat(coordMatch[2]));
        }
        return null;
    };

    useImperativeHandle(ref, () => ({
        findNearestBranch() {
            if (!navigator.geolocation) {
                toast({ title: "خطأ", description: "متصفحك لا يدعم تحديد المواقع.", variant: "destructive" });
                return;
            }

            toast({ title: "جاري تحديد موقعك...", description: "يرجى الانتظار." });

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userLatLng = L.latLng(position.coords.latitude, position.coords.longitude);
                    let nearestBranch: Branch | null = null;
                    let minDistance = Infinity;

                    branches.forEach((branch: Branch) => { // Explicitly type branch
                        const branchLatLng = parseCoords(branch.GoogleMapsLink);
                        if (branchLatLng) {
                            const distance = userLatLng.distanceTo(branchLatLng);
                            if (distance < minDistance) {
                                minDistance = distance;
                                nearestBranch = branch;
                            }
                        }
                    });

                    if (userMarker.current) {
                        userMarker.current.setLatLng(userLatLng);
                    } else if (mapInstance.current) {
                        userMarker.current = L.marker(userLatLng, { icon: userIcon }).addTo(mapInstance.current).bindPopup("موقعك الحالي");
                    }

                    if (nearestBranch && mapInstance.current) {
                        toast({ title: "تم العثور على أقرب فرع", description: `أقرب فرع لك هو: ${nearestBranch.Name}` });

                        if (routingControl.current) {
                            mapInstance.current.removeControl(routingControl.current);
                        }

                        const nearestBranchLatLng = parseCoords(nearestBranch.GoogleMapsLink)!;

                        routingControl.current = L.Routing.control({
                            waypoints: [userLatLng, nearestBranchLatLng],
                            routeWhileDragging: true,
                            show: true,
                            lineOptions: {
                                styles: [{ color: '#FBBF24', opacity: 1, weight: 5 }],
                                extendToWaypoints: true,
                                missingRouteTolerance: 100 // a high tolerance
                            },
                            createMarker: function () { return null; }
                        }).addTo(mapInstance.current);

                    } else {
                        toast({ title: "خطأ", description: "لم نتمكن من حساب أقرب فرع.", variant: "destructive" });
                    }
                },
                (error) => {
                    toast({ title: "خطأ في تحديد الموقع", description: error.message, variant: "destructive" });
                }
            );
        }
    }));

    useEffect(() => {
        if (mapRef.current && !mapInstance.current) {
            mapInstance.current = L.map(mapRef.current, { zoomControl: false }).setView(YemenCenter, 6);
            L.control.zoom({ position: 'topleft' }).addTo(mapInstance.current);

            L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 20
            }).addTo(mapInstance.current);
        }
    }, []);

    useEffect(() => {
        if (!mapInstance.current) return;

        const markersLayer = L.layerGroup().addTo(mapInstance.current);
        const branchCoords: LatLng[] = branches.map(b => parseCoords(b.GoogleMapsLink)).filter((c): c is LatLng => c !== null);

        branches.forEach(branch => {
            const coords = parseCoords(branch.GoogleMapsLink);
            if (coords) {
                L.marker(coords)
                    .addTo(markersLayer)
                    .bindPopup(renderToStaticMarkup(<BranchPopup branch={branch} />));
            }
        });

        if (branchCoords.length > 1 && routingControl.current === null) {
            L.Routing.control({
                waypoints: branchCoords,
                routeWhileDragging: false,
                show: false,
                addWaypoints: false,
                lineOptions: {
                    styles: [{ color: 'rgba(251, 191, 36, 0.5)', weight: 2, dashArray: '5, 10' }],
                    extendToWaypoints: true,
                    missingRouteTolerance: 100
                },
                createMarker: () => null,
            }).addTo(mapInstance.current);
        }

        if (markersLayer.getLayers().length > 0) {
            const featureGroup = L.featureGroup(markersLayer.getLayers());
            mapInstance.current.fitBounds(featureGroup.getBounds().pad(0.2));
        }

        return () => {
            markersLayer.clearLayers();
            if (routingControl.current && mapInstance.current) {
                mapInstance.current.removeControl(routingControl.current);
                routingControl.current = null;
            }
            if (userMarker.current && mapInstance.current) {
                mapInstance.current.removeLayer(userMarker.current);
                userMarker.current = null;
            }
        };
    }, [branches]);

    return <div ref={mapRef} className="w-full h-[500px]" />;
});

InteractiveBranchesMap.displayName = "InteractiveBranchesMap";
export default InteractiveBranchesMap;
