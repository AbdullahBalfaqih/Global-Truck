"use client";

import { useState, useEffect, useRef, useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  LogIn,
  MapPin,
  CheckCircle,
  XCircle,
  Satellite,
  UserCheck,
} from "lucide-react";
import type { Driver } from "@/types";
import { verifyDriver, updateDriverLocation } from "@/actions/drivers";

type VerificationState = {
  success: boolean;
  message: string;
  driver?: Driver;
};

export default function DriverTrackingPage() {
  const { toast } = useToast();
  const [isTracking, setIsTracking] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>("غير فعال");
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [verifiedDriver, setVerifiedDriver] = useState<Driver | null>(null);
  const trackingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [verificationState, formAction, isVerifying] = useActionState<VerificationState, FormData>(verifyDriver, undefined);

  useEffect(() => {
    if (verificationState?.success && verificationState.driver) {
      setVerifiedDriver(verificationState.driver);
      toast({
        title: "تم التحقق بنجاح",
        description: `مرحبًا بك، ${verificationState.driver.Name}!`,
      });
    } else if (verificationState && !verificationState.success) {
      toast({
        variant: "destructive",
        title: "فشل التحقق",
        description: verificationState.message,
      });
    }
  }, [verificationState, toast]);
  
  useEffect(() => {
    // Cleanup interval on component unmount
    return () => {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
      }
    };
  }, []);

  const handleStartTracking = () => {
    if (!navigator.geolocation) {
      setLocationStatus("المتصفح لا يدعم تحديد المواقع.");
      toast({ variant: "destructive", title: "خطأ", description: "متصفحك لا يدعم خدمة تحديد المواقع." });
      return;
    }
    
    setIsTracking(true);
    setLocationStatus("جاري البحث عن إشارة GPS...");
    
    // Immediate first update
    updateLocation();

    // Set up interval for repeated updates
      trackingIntervalRef.current = setInterval(updateLocation, 900000); // 600000ms = 10 minutes

    
    toast({ title: "بدء التتبع", description: "تم بدء تتبع موقعك بنجاح." });
  };
  
  const updateLocation = () => {
    if (!verifiedDriver) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentCoords({ lat: latitude, lng: longitude });
        setLocationStatus(`تم التحديث في: ${new Date().toLocaleTimeString('ar-SA')}`);
        
        // Send to server action
        const result = await updateDriverLocation(verifiedDriver.DriverID, latitude, longitude);
        if(!result.success){
           toast({ variant: "destructive", title: "فشل تحديث الموقع", description: result.message });
        }
      },
      (error) => {
        let errorMessage = "حدث خطأ أثناء تحديد الموقع.";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "تم رفض إذن الوصول للموقع.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "معلومات الموقع غير متاحة.";
            break;
          case error.TIMEOUT:
            errorMessage = "انتهت مهلة طلب الموقع.";
            break;
        }
        setLocationStatus(errorMessage);
        toast({ variant: "destructive", title: "خطأ في الموقع", description: errorMessage });
        handleStopTracking(); // Stop tracking on error
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleStopTracking = () => {
    setIsTracking(false);
    setLocationStatus("متوقف");
    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current);
      trackingIntervalRef.current = null;
    }
    toast({ title: "تم إيقاف التتبع", description: "تم إيقاف تحديث موقعك." });
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
       {!verifiedDriver ? (
            <Card className="w-full max-w-sm mx-auto shadow-xl">
            <CardHeader className="space-y-1 text-center">
                <div className="flex justify-center items-center gap-2 mb-4">
                    <MapPin className="h-8 w-8 text-primary" />
                    <CardTitle className="text-3xl font-bold">
                    صفحة تتبع السائق
                    </CardTitle>
                </div>
                <CardDescription>
                الرجاء إدخال رقم هاتفك ورقم الرخصة للتحقق من هويتك.
                </CardDescription>
            </CardHeader>
            <form action={formAction}>
                <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="phone">رقم الهاتف</Label>
                    <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="7xxxxxxxx"
                    required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="licenseNumber">رقم الرخصة</Label>
                    <Input
                    id="licenseNumber"
                    name="licenseNumber"
                    type="text"
                    placeholder="رقم الرخصة المسجل بالنظام"
                    required
                    />
                </div>
                </CardContent>
                <CardFooter>
                <Button type="submit" className="w-full" disabled={isVerifying}>
                    {isVerifying ? (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    ) : (
                    <LogIn className="me-2 h-4 w-4" />
                    )}
                    {isVerifying ? "جاري التحقق..." : "تحقق وتسجيل دخول"}
                </Button>
                </CardFooter>
            </form>
            </Card>
      ) : (
        <Card className="shadow-lg rounded-lg max-w-lg mx-auto w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center items-center gap-2 text-2xl font-bold">
              <UserCheck className="h-8 w-8 text-primary" />
              مرحبًا بك، <span className="text-primary">{verifiedDriver.Name}</span>
            </div>
            <CardDescription>
              أنت الآن مسجل دخول. يمكنك بدء أو إيقاف تتبع موقعك.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant={isTracking ? "default" : "destructive"} className={isTracking ? "bg-green-50 border-green-300 text-green-800" : ""}>
                <div className="flex items-start gap-3">
                    {isTracking ? <CheckCircle className="h-5 w-5 text-green-600 mt-1" /> : <XCircle className="h-5 w-5 text-destructive mt-1" />}
                    <div className="flex-1">
                        <AlertTitle className="font-bold text-lg">{isTracking ? "التتبع نشط" : "التتبع متوقف"}</AlertTitle>
                        <AlertDescription>
                            الحالة الحالية: {locationStatus}
                        </AlertDescription>
                    </div>
                </div>
            </Alert>
             {currentCoords && (
                <div className="text-center text-sm text-muted-foreground">
                    آخر إحداثيات مسجلة: {currentCoords.lat.toFixed(4)}, {currentCoords.lng.toFixed(4)}
                </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-center gap-4">
            {!isTracking ? (
              <Button onClick={handleStartTracking} size="lg" className="bg-primary hover:bg-primary/90">
                <Satellite className="me-2 h-5 w-5" />
                بدء تتبع موقعي
              </Button>
            ) : (
              <Button onClick={handleStopTracking} size="lg" variant="destructive">
                <XCircle className="me-2 h-5 w-5" />
                إيقاف التتبع
              </Button>
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
