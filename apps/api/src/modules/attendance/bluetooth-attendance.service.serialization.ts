import {
  type AttendanceSessionSummary,
  attendanceSessionSummarySchema,
} from "@attendease/contracts"

import type { AttendanceSessionRecord } from "./bluetooth-attendance.service.types.js"

export function toAttendanceSessionSummary(
  input: AttendanceSessionRecord,
): AttendanceSessionSummary {
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
    currentQrPayload: null,
    currentQrExpiresAt: null,
  })
}

function toNullableNumber(value: { toNumber: () => number } | null): number | null {
  return value ? value.toNumber() : null
}
