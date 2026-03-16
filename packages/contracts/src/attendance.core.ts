import { z } from "zod"

import { attendanceModeSchema } from "./academic"
import { isoDateTimeSchema } from "./attendance.internal"

export const attendanceLocationAnchorTypeValues = [
  "CLASSROOM_FIXED",
  "CAMPUS_ZONE",
  "TEACHER_SELECTED",
] as const
export const attendanceLocationAnchorTypeSchema = z.enum(attendanceLocationAnchorTypeValues)
export type AttendanceLocationAnchorType = z.infer<typeof attendanceLocationAnchorTypeSchema>

export const attendanceSessionStatusValues = [
  "DRAFT",
  "ACTIVE",
  "ENDED",
  "CANCELLED",
  "EXPIRED",
] as const
export const attendanceSessionStatusSchema = z.enum(attendanceSessionStatusValues)
export type AttendanceSessionStatus = z.infer<typeof attendanceSessionStatusSchema>

export const attendanceSessionEditabilityStateValues = [
  "PENDING_SESSION_END",
  "OPEN",
  "LOCKED",
] as const
export const attendanceSessionEditabilityStateSchema = z.enum(
  attendanceSessionEditabilityStateValues,
)
export type AttendanceSessionEditabilityState = z.infer<
  typeof attendanceSessionEditabilityStateSchema
>

export const attendanceRecordStatusValues = ["PRESENT", "ABSENT"] as const
export const attendanceRecordStatusSchema = z.enum(attendanceRecordStatusValues)
export type AttendanceRecordStatus = z.infer<typeof attendanceRecordStatusSchema>

export const attendanceMarkSourceValues = ["QR_GPS", "BLUETOOTH", "MANUAL"] as const
export const attendanceMarkSourceSchema = z.enum(attendanceMarkSourceValues)
export type AttendanceMarkSource = z.infer<typeof attendanceMarkSourceSchema>

export const qrTokenValidationReasonValues = ["INVALID", "EXPIRED", "SESSION_MISMATCH"] as const
export const qrTokenValidationReasonSchema = z.enum(qrTokenValidationReasonValues)
export type QrTokenValidationReason = z.infer<typeof qrTokenValidationReasonSchema>

export const bluetoothTokenValidationReasonValues = [
  "INVALID",
  "EXPIRED",
  "SESSION_MISMATCH",
] as const
export const bluetoothTokenValidationReasonSchema = z.enum(bluetoothTokenValidationReasonValues)
export type BluetoothTokenValidationReason = z.infer<typeof bluetoothTokenValidationReasonSchema>

export const gpsValidationReasonValues = [
  "MISSING_ANCHOR",
  "MISSING_LOCATION",
  "ACCURACY_TOO_LOW",
  "OUT_OF_RADIUS",
] as const
export const gpsValidationReasonSchema = z.enum(gpsValidationReasonValues)
export type GpsValidationReason = z.infer<typeof gpsValidationReasonSchema>

export const rollingQrTokenPayloadSchema = z.object({
  v: z.literal(1),
  sid: z.string().min(1),
  ts: z.number().int().nonnegative(),
  sig: z.string().min(16),
})
export type RollingQrTokenPayload = z.infer<typeof rollingQrTokenPayloadSchema>

export const rollingBluetoothTokenPayloadSchema = z.object({
  v: z.number().int().positive(),
  pid: z.string().min(8),
  ts: z.number().int().nonnegative(),
  eid: z.string().min(16),
})
export type RollingBluetoothTokenPayload = z.infer<typeof rollingBluetoothTokenPayloadSchema>

export const attendanceSessionSummarySchema = z.object({
  id: z.string().min(1),
  classroomId: z.string().min(1),
  lectureId: z.string().nullable(),
  teacherAssignmentId: z.string().min(1),
  mode: attendanceModeSchema,
  status: attendanceSessionStatusSchema,
  startedAt: isoDateTimeSchema.nullable(),
  scheduledEndAt: isoDateTimeSchema.nullable(),
  endedAt: isoDateTimeSchema.nullable(),
  editableUntil: isoDateTimeSchema.nullable(),
  durationSeconds: z.number().int().positive().nullable(),
  anchorType: attendanceLocationAnchorTypeSchema.nullable(),
  anchorLatitude: z.number().min(-90).max(90).nullable(),
  anchorLongitude: z.number().min(-180).max(180).nullable(),
  anchorLabel: z.string().nullable(),
  gpsRadiusMeters: z.number().int().positive().nullable(),
  qrRotationWindowSeconds: z.number().int().positive().nullable(),
  bluetoothRotationWindowSeconds: z.number().int().positive().nullable().default(null),
  blePublicId: z.string().nullable().default(null),
  bleProtocolVersion: z.number().int().positive().nullable().default(null),
  rosterSnapshotCount: z.number().int().nonnegative(),
  presentCount: z.number().int().nonnegative(),
  absentCount: z.number().int().nonnegative(),
  currentQrPayload: z.string().nullable(),
  currentQrExpiresAt: isoDateTimeSchema.nullable(),
})
export type AttendanceSessionSummary = z.infer<typeof attendanceSessionSummarySchema>

export const attendanceSessionEditabilitySchema = z.object({
  isEditable: z.boolean(),
  state: attendanceSessionEditabilityStateSchema,
  endedAt: isoDateTimeSchema.nullable(),
  editableUntil: isoDateTimeSchema.nullable(),
})
export type AttendanceSessionEditability = z.infer<typeof attendanceSessionEditabilitySchema>
