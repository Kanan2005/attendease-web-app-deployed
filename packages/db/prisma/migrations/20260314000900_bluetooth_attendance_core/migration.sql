ALTER TYPE "SecurityEventType"
ADD VALUE IF NOT EXISTS 'ATTENDANCE_BLUETOOTH_VALIDATION_FAILED';

ALTER TABLE "attendance_sessions"
ADD COLUMN "bleSeed" TEXT,
ADD COLUMN "blePublicId" TEXT,
ADD COLUMN "bleProtocolVersion" INTEGER;

ALTER TABLE "attendance_sessions"
DROP CONSTRAINT "attendance_sessions_runtime_values_check";

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
  AND ("bleProtocolVersion" IS NULL OR "bleProtocolVersion" > 0)
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
  AND ("bleSeed" IS NULL OR length("bleSeed") >= 16)
  AND ("blePublicId" IS NULL OR length("blePublicId") >= 8)
  AND (
    "mode" <> 'BLUETOOTH'
    OR (
      "bleSeed" IS NOT NULL
      AND "blePublicId" IS NOT NULL
      AND "bleProtocolVersion" IS NOT NULL
      AND "bluetoothRotationWindowSeconds" IS NOT NULL
    )
  )
);

CREATE UNIQUE INDEX "attendance_sessions_blePublicId_key"
ON "attendance_sessions"("blePublicId");

CREATE INDEX "attendance_sessions_mode_blePublicId_status_idx"
ON "attendance_sessions"("mode", "blePublicId", "status");
