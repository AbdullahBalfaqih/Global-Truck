
"use client";

// This page is now intended for general system settings if any, 
// or can be repurposed/removed if all settings are moved to developer or admin-specific pages.
// For now, its main content (System Identity and Current Branch) has been moved.

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Settings as SettingsIconLucide } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <SettingsIconLucide className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight text-foreground">إعدادات النظام (عامة)</h1>
      </div>
      
      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle>لا توجد إعدادات عامة حاليًا</CardTitle>
          <CardDescription>
            تم نقل تخصيص هوية النظام إلى "واجهة المطور".
            <br />
            تم نقل تحديد الفرع الحالي وإعدادات التتبع إلى "الإعدادات" (للمدير).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            يمكن استخدام هذه الصفحة لاحقًا لأي إعدادات أخرى على مستوى النظام لا تناسب الأقسام الأخرى.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
