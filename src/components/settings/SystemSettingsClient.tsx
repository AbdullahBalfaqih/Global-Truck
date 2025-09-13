
"use client";

import { useState, useEffect, useActionState, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  StickyNote,
  Hash,
  Tag,
  Save,
  MapPin,
  Loader2,
  RefreshCw,
  UserCircle,
  Clock,
    Building,
    ClipboardList,

} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Branch, SystemSetting } from "@/types";
import { updateSystemSettings } from "@/actions/systemSettings";
import { ClientFormattedDate } from "@/components/utils/ClientFormattedDate";
import { arSA } from "date-fns/locale";
import { Alert } from "../ui/alert";
import { AlertTitle } from "@/components/ui/alert";

const NO_BRANCH_VALUE = "_none_";

interface SystemSettingsClientProps {
    initialSettings: SystemSetting;
    branches: Branch[];
    currentBranchName: string;
                                    }

export function SystemSettingsClient({ initialSettings, branches, currentBranchName }: SystemSettingsClientProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SystemSetting>(initialSettings);
  
  const [updateState, formAction, isPending] = useActionState(updateSystemSettings, undefined);

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  useEffect(() => {
    if (updateState?.success) {
      toast({ title: "نجاح", description: updateState.message });
      if(updateState.settings) {
        setSettings(updateState.settings); // Refresh the state with the latest settings from the server
      }
    } else if (updateState?.message) {
      toast({ variant: "destructive", title: "خطأ", description: updateState.message });
    }
  }, [updateState, toast]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <form action={formAction} className="lg:col-span-2 space-y-8">
                <Alert>
                    <Building className="h-4 w-4" />
                    <AlertTitle>الإعدادات الحالية لـ: {currentBranchName}</AlertTitle>
                    <CardDescription>
                        أنت تقوم بتعديل الإعدادات الخاصة بهذا الفرع.
                    </CardDescription>
                </Alert>
                <Card className="shadow-lg rounded-lg">
                    <CardHeader>
                        <CardTitle>تخصيص النظام، أرقام التتبع وتعليمات الملصق</CardTitle>
                        <CardDescription>
                            قم بتعديل الإعدادات العامة للنظام. هذه التغييرات ستؤثر على النظام بأكمله.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="SystemName" className="text-base flex items-center">
                                اسم النظام
                            </Label>
                            <Input
                                id="SystemName"
                                name="SystemName"
                                defaultValue={settings?.SystemName || "GlobalTrack"}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="LogoURL" className="text-base flex items-center">
                                رابط الشعار (URL)
                            </Label>
                            <Input
                                id="LogoURL"
                                name="LogoURL"
                                defaultValue={settings?.LogoURL || ""}
                                placeholder="https://example.com/logo.png"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="LabelInstructions" className="text-base flex items-center">
                                <StickyNote className="me-2 h-5 w-5 text-primary" />
                                تعليمات ملصق الشحن (LabelInstructions)
                            </Label>
                            <Textarea
                                id="LabelInstructions"
                                name="LabelInstructions"
                                defaultValue={settings?.LabelInstructions || "يرجى التعامل مع الطرد بعناية."}
                                placeholder="مثال: قابل للكسر، يرجى الاتصال قبل التسليم..."
                                rows={3}
                            />
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="TrackingPrefix" className="text-base flex items-center">
                                    <Tag className="me-2 h-5 w-5 text-primary" />
                                    بادئة رقم التتبع
                                </Label>
                                <Input
                                    id="TrackingPrefix"
                                    name="TrackingPrefix"
                                    defaultValue={settings?.TrackingPrefix || "GT"}
                                    placeholder="مثال: GT أو AWB"
                                    className="max-w-xs"
                                />
                                <p className="text-xs text-muted-foreground">الحروف الأولى لرقم التتبع.</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="NextTrackingSequence" className="text-base flex items-center">
                                    <Hash className="me-2 h-5 w-5 text-primary" />
                                    التسلسل التالي للتتبع
                                </Label>
                                <Input
                                    id="NextTrackingSequence"
                                    name="NextTrackingSequence"
                                    type="number"
                                    defaultValue={settings?.NextTrackingSequence || 100001}
                                    placeholder="مثال: 100001"
                                    className="max-w-xs"
                                />
                                <p className="text-xs text-muted-foreground">الرقم الذي سيبدأ به عداد التتبع.</p>
                            </div>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="ManifestPrefix" className="text-base flex items-center">
                                    <ClipboardList className="me-2 h-5 w-5 text-primary" />
                                    بادئة معرف الكشف
                                </Label>
                                <Input
                                    id="ManifestPrefix"
                                    name="ManifestPrefix"
                                    defaultValue={settings?.ManifestPrefix || "MAN"}
                                    placeholder="مثال: MAN"
                                    className="max-w-xs"
                                />
                                <p className="text-xs text-muted-foreground">الحروف الأولى لمعرف الكشف.</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="NextManifestSequence" className="text-base flex items-center">
                                    <Hash className="me-2 h-5 w-5 text-primary" />
                                    التسلسل التالي للكشف
                                </Label>
                                <Input
                                    id="NextManifestSequence"
                                    name="NextManifestSequence"
                                    type="number"
                                    defaultValue={settings?.NextManifestSequence || 1}
                                    placeholder="مثال: 1"
                                    className="max-w-xs"
                                />
                                <p className="text-xs text-muted-foreground">الرقم الذي سيبدأ به عداد الكشوفات.</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="DefaultOriginBranchID" className="text-base flex items-center">
                                <MapPin className="me-2 h-5 w-5 text-primary" />
                                فرع الشحن الافتراضي
                            </Label>
                            <Select name="DefaultOriginBranchID" defaultValue={settings?.DefaultOriginBranchID?.toString() || NO_BRANCH_VALUE}>
                                <SelectTrigger id="DefaultOriginBranchID" className="max-w-md">
                                    <SelectValue placeholder="اختر فرعًا..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={NO_BRANCH_VALUE}>لا يوجد فرع افتراضي</SelectItem>
                                    {branches.map((branch) => (
                                        <SelectItem key={branch.BranchID} value={branch.BranchID.toString()}>
                                            {branch.Name} 
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">الفرع الذي سيتم اختياره تلقائيًا عند إضافة طرد جديد.</p>
                        </div>
                    </CardContent>
                    <CardFooter className="gap-2">
                        <Button type="submit" size="lg" disabled={isPending}>
                            {isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
                            حفظ الإعدادات
                        </Button>
                    </CardFooter>
                </Card>
            </form>

            <div className="lg:col-span-1 space-y-4">
                <Card className="shadow-lg rounded-lg">
                    <CardHeader>
                        <CardTitle>معلومات التحديث</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="flex items-center gap-2">
                            <UserCircle className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-muted-foreground">آخر تحديث بواسطة:</p>
                                <p className="font-semibold">{settings?.UpdatedByUserName || 'غير مسجل'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-muted-foreground">تاريخ آخر تحديث:</p>
                                <p className="font-semibold">
                                    {settings?.LastUpdatedAt ? (
                                        <ClientFormattedDate dateString={settings.LastUpdatedAt} formatString="PPpp" locale={arSA} />
                                    ) : 'غير مسجل'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}