// actions/getNextTrackingNumberFromDB.ts
"use server";

import { getConnection } from "@/lib/db";

export const getNextTrackingNumberFromDB = async (): Promise<string> => {
  const pool = await getConnection();

  // الحصول على الإعدادات الحالية
  const result = await pool.request().query(`
    SELECT TOP 1 TrackingPrefix, NextTrackingSequence
    FROM SystemSettings
    ORDER BY LastUpdatedAt DESC
  `);

  if (result.recordset.length === 0) {
    throw new Error("لم يتم العثور على الإعدادات.");
  }

  const { TrackingPrefix, NextTrackingSequence } = result.recordset[0];

  const nextNumber = `${TrackingPrefix}${NextTrackingSequence}`;

  // تحديث الرقم التالي
  await pool.request().query(`
    UPDATE SystemSettings
    SET NextTrackingSequence = NextTrackingSequence + 1,
        LastUpdatedAt = GETDATE()
  `);

  return nextNumber;
};
