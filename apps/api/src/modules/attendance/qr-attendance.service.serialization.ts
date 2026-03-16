import {
  type AttendanceSessionSummary,
  attendanceSessionSummarySchema,
} from "@attendease/contracts"

import type { AttendanceSessionRecord } from "./qr-attendance.service.types.js"
import type { QrTokenService } from "./qr-token.service.js"

export function toAttendanceSessionSummary(
  qrTokenService: QrTokenService,
  input: AttendanceSessionRecord,
): AttendanceSessionSummary {
  const currentQr =
    input.status === "ACTIVE" &&
    input.mode === "QR_GPS" &&
    input.qrSeed &&
    input.qrRotationWindowSeconds
      ? qrTokenService.issueToken({
          sessionId: input.id,
          qrSeed: input.qrSeed,
          rotationWindowSeconds: input.qrRotationWindowSeconds,
        })
      : null

  return attendanceSessionSummarySchema.parse({
    id: input.id,
    classroomId: input.courseOfferingId,
    lectureId: input.lectureId,
    teacherAssignmentId: input.teacherAssignmentId,
    mode: input.mode,
    status: input.status,
    startedAt: input.startedAt?.toISOString() ?? null,
    scheduledEndAt: input.scheduledEndAt?.toISOString() ?? null,
    endedAt: input.endedAt?.toISOString() ?? null,
    editableUntil: input.editableUntil?.toISOString() ?? null,
    durationSeconds: input.durationSeconds,
    anchorType: input.gpsAnchorType,
    anchorLatitude: toNullableNumber(input.gpsCenterLatitude),
    anchorLongitude: toNullableNumber(input.gpsCenterLongitude),
    anchorLabel: input.gpsAnchorLabel,
    gpsRadiusMeters: input.gpsRadiusMeters,
    qrRotationWindowSeconds: input.qrRotationWindowSeconds,
    bluetoothRotationWindowSeconds: input.bluetoothRotationWindowSeconds,
    blePublicId: input.blePublicId,
    bleProtocolVersion: input.bleProtocolVersion,
    rosterSnapshotCount: input.rosterSnapshotCount,
    presentCount: input.presentCount,
    absentCount: input.absentCount,
    currentQrPayload: currentQr?.payload ?? null,
    currentQrExpiresAt: currentQr?.expiresAt.toISOString() ?? null,
  })
}

export function toNullableNumber(value: { toNumber: () => number } | null): number | null {
  return value ? value.toNumber() : null
}
