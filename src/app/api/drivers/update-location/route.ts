import { NextRequest, NextResponse } from "next/server";
import sql from "@/actions/coml"; // هذا هو ملف الاتصال بـ MSSQL الذي تستخدمه في مشروعك (يجب أن يحتوي على إعدادات الاتصال)

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { driverId, latitude, longitude } = body;

        if (!driverId || !latitude || !longitude) {
            return NextResponse.json({ error: "البيانات غير مكتملة" }, { status: 400 });
        }

        // تنفيذ MERGE لتحديث أو إدخال الموقع
        const query = `
      MERGE DriverLocations AS target
      USING (SELECT @DriverID AS DriverID) AS source
      ON target.DriverID = source.DriverID
      WHEN MATCHED THEN
        UPDATE SET Latitude = @Latitude, Longitude = @Longitude, UpdatedAt = GETDATE()
      WHEN NOT MATCHED THEN
        INSERT (DriverID, Latitude, Longitude, UpdatedAt)
        VALUES (@DriverID, @Latitude, @Longitude, GETDATE());
    `;

        await sql.query(query, {
            DriverID: driverId,
            Latitude: latitude,
            Longitude: longitude,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("حدث خطأ أثناء تحديث موقع السائق:", error);
        return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
    }
}
