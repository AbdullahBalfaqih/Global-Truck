"use client";

import { useState, useEffect, useMemo } from "react";
import { getSession } from "@/actions/auth";
import { ParcelsTable } from "@/components/parcels/ParcelsTable";
import { getAllParcels } from "@/actions/getparcels";
import { getAllBranches } from "@/actions/branches";
import { getAllDeliveryCitiesWithDistricts } from "@/actions/deliveryLocations";
import type { Parcel, Branch, DeliveryCityForSelect, UserRole } from "@/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PackageSearch, AlertCircle, Loader2, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { EditParcelForm } from "@/components/parcels/EditParcelForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const ALL_BRANCHES_VALUE = "_all_";

function ParcelsData() {
    const [parcels, setParcels] = useState<Parcel[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [deliveryCities, setDeliveryCities] = useState<DeliveryCityForSelect[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [parcelToEdit, setParcelToEdit] = useState<Parcel | null>(null);

    const [userRole, setUserRole] = useState<UserRole | undefined>();
    const [userBranchId, setUserBranchId] = useState<number | null | undefined>();
    const [selectedBranchId, setSelectedBranchId] = useState<string>('');

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const session = await getSession();
            setUserRole(session?.role as UserRole | undefined);
            setUserBranchId(session?.branchId as number | null | undefined);

            const [parcelsData, branchesData, deliveryCitiesData] = await Promise.all([
                getAllParcels(),
                getAllBranches(),
                getAllDeliveryCitiesWithDistricts()
            ]);
            setParcels(parcelsData);
            setBranches(branchesData);
            setDeliveryCities(deliveryCitiesData);
        } catch (err: any) {
            console.error("Error fetching data for ParcelsListPage:", err);
            setError("حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى لاحقًا.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (!isLoading) {
            if (userRole === 'BranchEmployee' && typeof userBranchId === 'number') {
                setSelectedBranchId(String(userBranchId));
            } else if (userRole) {
                setSelectedBranchId(ALL_BRANCHES_VALUE);
            }
        }
    }, [isLoading, userRole, userBranchId]);

    const filteredParcels = useMemo(() => {
        if (!selectedBranchId || selectedBranchId === ALL_BRANCHES_VALUE) {
            return parcels;
        }
        const branchIdNum = parseInt(selectedBranchId, 10);
        return parcels.filter(p => p.OriginBranchID === branchIdNum || p.DestinationBranchID === branchIdNum);
    }, [parcels, selectedBranchId]);

    const handleEditClick = (parcel: Parcel) => {
        setParcelToEdit(parcel);
    };

    const handleUpdateSuccess = () => {
        setParcelToEdit(null);
        fetchData();
    };

    const isBranchSelectDisabled = userRole === 'BranchEmployee';

    const currentBranchName = useMemo(() => {
        if (selectedBranchId === ALL_BRANCHES_VALUE) {
            return "جميع الفروع";
        }
        const branch = branches.find(b => String(b.BranchID) === selectedBranchId);
        return branch ? `${branch.Name} (${branch.City})` : "غير معروف";
    }, [selectedBranchId, branches]);

    if (isLoading || !selectedBranchId) {
        return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ms-2">جاري تحميل قائمة الطرود...</p></div>;
    }

    if (error) {
        return (
            <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>خطأ في تحميل البيانات</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" /> فلترة الطرود
                    </CardTitle>
                    <CardDescription>اختر فرعًا لعرض الطرود الصادرة منه أو الواردة إليه.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="w-full sm:w-1/2 md:w-1/3">
                        <Label htmlFor="branch-filter">فلترة حسب الفرع</Label>
                        <Select
                            value={selectedBranchId}
                            onValueChange={setSelectedBranchId}
                            disabled={isBranchSelectDisabled}
                        >
                            <SelectTrigger id="branch-filter">
                                <SelectValue placeholder="اختر فرعًا..." />
                            </SelectTrigger>
                            <SelectContent>
                                {(userRole === 'Admin' || userRole === 'Developer') && (
                                    <SelectItem value={ALL_BRANCHES_VALUE}>جميع الفروع</SelectItem>
                                )}
                                {branches.map(branch => (
                                    <SelectItem key={branch.BranchID} value={String(branch.BranchID)}>
                                        {branch.Name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {userRole === 'BranchEmployee' && (
                            <p className="text-xs text-muted-foreground mt-1">يتم عرض طرود فرعك فقط: **{currentBranchName}**</p>
                        )}
                        {(userRole === 'Admin' || userRole === 'Developer') && (
                            <p className="text-xs text-muted-foreground mt-1">
                                {selectedBranchId === ALL_BRANCHES_VALUE ?
                                    "يتم عرض الطرود من جميع الفروع." :
                                    `يتم عرض الطرود لفرع: ${currentBranchName}`
                                }
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {filteredParcels.length > 0 ? (
                <ParcelsTable parcels={filteredParcels} branches={branches} onEditClick={handleEditClick} />
            ) : (
                <Alert className="mt-4">
                    <PackageSearch className="h-4 w-4" />
                    <AlertTitle>لا توجد طرود</AlertTitle>
                    <AlertDescription>
                        لا توجد طرود تطابق الفلترة الحالية في النظام.
                    </AlertDescription>
                </Alert>
            )}

            <Dialog open={!!parcelToEdit} onOpenChange={(isOpen) => !isOpen && setParcelToEdit(null)}>
                <DialogContent className="sm:max-w-[800px]">
                    <DialogHeader>
                        <DialogTitle>تعديل بيانات الطرد: {parcelToEdit?.TrackingNumber}</DialogTitle>
                        <DialogDescription>
                            قم بتحديث تفاصيل الطرد أدناه.
                        </DialogDescription>
                    </DialogHeader>
                    {parcelToEdit && (
                        <EditParcelForm
                            parcel={parcelToEdit}
                            branches={branches}
                            deliveryCities={deliveryCities}
                            onSuccess={handleUpdateSuccess}
                            onCancel={() => setParcelToEdit(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

export default function ParcelsListPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <PackageSearch className="h-7 w-7 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight text-foreground">قائمة وعرض الطرود</h1>
            </div>
            <ParcelsData />
        </div>
    );
}
