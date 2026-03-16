-- CreateEnum
CREATE TYPE "AttendanceLocationAnchorType" AS ENUM (
  'CLASSROOM_FIXED',
  'CAMPUS_ZONE',
  'TEACHER_SELECTED'
);

-- AlterTable
ALTER TABLE "attendance_sessions"
ADD COLUMN "editableUntil" TIMESTAMP(3),
ADD COLUMN "durationSeconds" INTEGER,
ADD COLUMN "qrSeed" TEXT,
ADD COLUMN "gpsAnchorType" "AttendanceLocationAnchorType",
ADD COLUMN "gpsAnchorLabel" TEXT,
ADD COLUMN "gpsAnchorResolvedAt" TIMESTAMP(3);

-- DropConstraint
ALTER TABLE "attendance_sessions"
DROP CONSTRAINT "attendance_sessions_runtime_values_check";

-- AddConstraint
ALTER TABLE "attendance_sessions"
ADD CONSTRAINT "attendance_sessions_runtime_values_check"
CHECK (
  "rosterSnapshotCount" >= 0
  AND "presentCount" >= 0
  AND "absentCount" >= 0
  AND ("gpsRadiusMeters" IS NULL OR "gpsRadiusMeters" > 0)
  AND ("qrRotationWindowSeconds" IS NULL OR "qrRotationWindowSeconds" > 0)
  AND ("bluetoothRotationWindowSeconds" IS NULL OR "bluetoothRotationWindowSeconds" > 0)
  AND ("durationSeconds" IS NULL OR "durationSeconds" > 0)
  AND (
    ("gpsCenterLatitude" IS NULL AND "gpsCenterLongitude" IS NULL)
    OR ("gpsCenterLatitude" IS NOT NULL AND "gpsCenterLongitude" IS NOT NULL)
  )
  AND (
    "gpsAnchorType" IS NULL
    OR ("gpsCenterLatitude" IS NOT NULL AND "gpsCenterLongitude" IS NOT NULL)
  )
  AND ("editableUntil" IS NULL OR "endedAt" IS NULL OR "editableUntil" >= "endedAt")
  AND ("qrSeed" IS NULL OR length("qrSeed") >= 16)
);

-- CreateIndex
CREATE INDEX "attendance_sessions_status_mode_scheduledEndAt_idx"
ON "attendance_sessions"("status", "mode", "scheduledEndAt");
