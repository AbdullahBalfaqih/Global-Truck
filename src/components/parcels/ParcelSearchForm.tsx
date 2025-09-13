"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Search, RotateCcw, Loader2 } from "lucide-react"; // Added Loader2 for loading state
import { useState, useEffect } from "react";
import type { Parcel } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { searchParcels } from "@/actions/getparcels"; // استيراد الدالة هنا

export function ParcelSearchForm() {
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<Parcel[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Helper to get status badge variant
    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'تم التسليم': return 'default';
            case 'تم التوصيل': return 'destructive';
            case 'قيد التوصيل': return 'secondary';
            case 'قيد المعالجة': return 'outline';
            default: return 'secondary';
        }
    };

    useEffect(() => {
        const fetchResults = async () => {
            if (searchTerm.trim().length === 0) { // Trim to handle whitespace-only input
                setSearchResults([]);
                setIsLoading(false); // Ensure loading is false if search term is empty
                return;
            }
            setIsLoading(true);
            const results = await searchParcels(searchTerm); // استخدام الدالة هنا
            setSearchResults(results);
            setIsLoading(false);
        };

        const delayDebounceFn = setTimeout(fetchResults, 300); // تأخير 300 مللي ثانية

        return () => clearTimeout(delayDebounceFn); // تنظيف التأخير
    }, [searchTerm]);

    const handleReset = () => {
        setSearchTerm("");
        setSearchResults([]);
    };

    return (
        <div className="space-y-6">
            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle>البحث عن طرد</CardTitle>
                </CardHeader>
                <form onSubmit={(e) => e.preventDefault()}>
                    <CardContent className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="trackingNumber">رقم التتبع / المرسل / المستلم</Label>
                                <Input
                                    id="trackingNumber"
                                    placeholder="مثل., GT1000001 او احمد علي"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex gap-2">
                        <Button type="button" onClick={handleReset} disabled={isLoading}>
                            <RotateCcw className="mr-2 h-4 w-4" /> إعادة التعيين
                        </Button>
                    </CardFooter>
                </form>
            </Card>

            {isLoading && searchTerm.length > 0 ? (
                <Card className="shadow-lg rounded-lg">
                    <CardContent className="p-6 flex justify-center items-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="ms-2 text-muted-foreground">جاري البحث عن الطرود...</p>
                    </CardContent>
                </Card>
            ) : searchResults.length > 0 ? (
                <Card className="shadow-lg rounded-lg">
                    <CardHeader>
                        <CardTitle>نتائج البحث</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader className="bg-primary text-primary-foreground"> 
                             
                                <TableRow>
                                    <TableHead className="text-center text-primary-foreground">رقم التتبع #</TableHead>
                                    <TableHead className="text-center text-primary-foreground">المرسل</TableHead>
                                    <TableHead className="text-center text-primary-foreground">المستلم</TableHead>
                                    <TableHead className="text-center text-primary-foreground">حالة الطرد</TableHead>
                                    <TableHead className="text-center text-primary-foreground">آخر تحديث</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {searchResults.map((parcel) => (
                                    <TableRow key={parcel.ParcelID}>
                                 
                                        <TableCell className="font-medium text-center">{parcel.TrackingNumber}</TableCell>
                                        <TableCell className="text-center">{parcel.SenderName}</TableCell>
                                        <TableCell className="text-center">{parcel.ReceiverName}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={getStatusBadgeVariant(parcel.Status)}>
                                                {parcel.Status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">{format(new Date(parcel.UpdatedAt), "PPp")}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ) : searchTerm.length > 0 && !isLoading && searchResults.length === 0 ? ( // Only show "no results" if a search was performed and no results
                <Card className="shadow-lg rounded-lg">
                    <CardContent className="p-6">
                        <p className="text-center text-muted-foreground">لا يوجد طرود، تأكد من بحثك.</p>
                    </CardContent>
                </Card>
            ) : null} {/* Render nothing if searchTerm is empty initially */}
        </div>
    );
}
