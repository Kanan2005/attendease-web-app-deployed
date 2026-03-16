import { z } from "zod"

import { attendanceModeSchema } from "./academic"

const isoDateTimeSchema = z.string().datetime()

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

export const attendanceSessionHistoryListQuerySchema = z
  .object({
    classroomId: z.string().min(1).optional(),
    classId: z.string().min(1).optional(),
    sectionId: z.string().min(1).optional(),
    subjectId: z.string().min(1).optional(),
    mode: attendanceModeSchema.optional(),
    status: attendanceSessionStatusSchema.optional(),
    from: isoDateTimeSchema.optional(),
    to: isoDateTimeSchema.optional(),
  })
  .refine(
    (value) =>
      value.from === undefined ||
      value.to === undefined ||
      new Date(value.from) <= new Date(value.to),
    {
      message: "The history start date must be before or equal to the end date.",
      path: ["to"],
    },
  )
export type AttendanceSessionHistoryListQuery = z.infer<
  typeof attendanceSessionHistoryListQuerySchema
>

export const attendanceSessionHistoryItemSchema = z.object({
  id: z.string().min(1),
  classroomId: z.string().min(1),
  classroomCode: z.string().min(1),
  classroomDisplayTitle: z.string().min(1),
  lectureId: z.string().nullable(),
  lectureTitle: z.string().nullable(),
  lectureDate: isoDateTimeSchema.nullable(),
  teacherAssignmentId: z.string().min(1),
  mode: attendanceModeSchema,
  status: attendanceSessionStatusSchema,
  startedAt: isoDateTimeSchema.nullable(),
  scheduledEndAt: isoDateTimeSchema.nullable(),
  endedAt: isoDateTimeSchema.nullable(),
  editableUntil: isoDateTimeSchema.nullable(),
  classId: z.string().min(1),
  classCode: z.string().min(1),
  classTitle: z.string().min(1),
  sectionId: z.string().min(1),
  sectionCode: z.string().min(1),
  sectionTitle: z.string().min(1),
  subjectId: z.string().min(1),
  subjectCode: z.string().min(1),
  subjectTitle: z.string().min(1),
  presentCount: z.number().int().nonnegative(),
  absentCount: z.number().int().nonnegative(),
  editability: attendanceSessionEditabilitySchema,
})
export type AttendanceSessionHistoryItem = z.infer<typeof attendanceSessionHistoryItemSchema>

export const attendanceSessionHistoryResponseSchema = z.array(attendanceSessionHistoryItemSchema)
export type AttendanceSessionHistoryResponse = z.infer<
  typeof attendanceSessionHistoryResponseSchema
>

export const studentAttendanceHistoryListQuerySchema = z
  .object({
    classroomId: z.string().min(1).optional(),
    subjectId: z.string().min(1).optional(),
    mode: attendanceModeSchema.optional(),
    from: isoDateTimeSchema.optional(),
    to: isoDateTimeSchema.optional(),
  })
  .refine(
    (value) =>
      value.from === undefined ||
      value.to === undefined ||
      new Date(value.from) <= new Date(value.to),
    {
      message: "The history start date must be before or equal to the end date.",
      path: ["to"],
    },
  )
export type StudentAttendanceHistoryListQuery = z.infer<
  typeof studentAttendanceHistoryListQuerySchema
>

export const studentAttendanceHistoryItemSchema = z.object({
  attendanceRecordId: z.string().min(1),
  sessionId: z.string().min(1),
  classroomId: z.string().min(1),
  classroomCode: z.string().min(1),
  classroomDisplayTitle: z.string().min(1),
  lectureId: z.string().nullable(),
  lectureTitle: z.string().nullable(),
  lectureDate: isoDateTimeSchema.nullable(),
  mode: attendanceModeSchema,
  sessionStatus: attendanceSessionStatusSchema,
  attendanceStatus: attendanceRecordStatusSchema,
  markSource: attendanceMarkSourceSchema.nullable(),
  markedAt: isoDateTimeSchema.nullable(),
  startedAt: isoDateTimeSchema.nullable(),
  endedAt: isoDateTimeSchema.nullable(),
  subjectId: z.string().min(1),
  subjectCode: z.string().min(1),
  subjectTitle: z.string().min(1),
})
export type StudentAttendanceHistoryItem = z.infer<typeof studentAttendanceHistoryItemSchema>

export const studentAttendanceHistoryResponseSchema = z.array(studentAttendanceHistoryItemSchema)
export type StudentAttendanceHistoryResponse = z.infer<
  typeof studentAttendanceHistoryResponseSchema
>

export const attendanceSessionDetailSchema = attendanceSessionSummarySchema.extend({
  classroomCode: z.string().min(1),
  classroomDisplayTitle: z.string().min(1),
  lectureTitle: z.string().nullable(),
  lectureDate: isoDateTimeSchema.nullable(),
  teacherId: z.string().min(1),
  teacherDisplayName: z.string().min(1),
  teacherEmail: z.string().email(),
  semesterCode: z.string().min(1),
  semesterTitle: z.string().min(1),
  classCode: z.string().min(1),
  classTitle: z.string().min(1),
  sectionCode: z.string().min(1),
  sectionTitle: z.string().min(1),
  subjectCode: z.string().min(1),
  subjectTitle: z.string().min(1),
  editability: attendanceSessionEditabilitySchema,
  suspiciousAttemptCount: z.number().int().nonnegative(),
  blockedUntrustedDeviceCount: z.number().int().nonnegative(),
  locationValidationFailureCount: z.number().int().nonnegative(),
  bluetoothValidationFailureCount: z.number().int().nonnegative(),
  revokedDeviceAttemptCount: z.number().int().nonnegative(),
})
export type AttendanceSessionDetail = z.infer<typeof attendanceSessionDetailSchema>

export const attendanceSessionStudentSummarySchema = z.object({
  attendanceRecordId: z.string().min(1),
  enrollmentId: z.string().min(1),
  studentId: z.string().min(1),
  studentDisplayName: z.string().min(1),
  studentEmail: z.string().email(),
  studentRollNumber: z.string().nullable(),
  status: attendanceRecordStatusSchema,
  markedAt: isoDateTimeSchema.nullable(),
})
export type AttendanceSessionStudentSummary = z.infer<typeof attendanceSessionStudentSummarySchema>

export const attendanceSessionStudentsResponseSchema = z.array(
  attendanceSessionStudentSummarySchema,
)
export type AttendanceSessionStudentsResponse = z.infer<
  typeof attendanceSessionStudentsResponseSchema
>

export const liveAttendanceSessionDiscoveryQuerySchema = z.object({
  classroomId: z.string().min(1).optional(),
  lectureId: z.string().min(1).optional(),
  mode: attendanceModeSchema.optional(),
})
export type LiveAttendanceSessionDiscoveryQuery = z.infer<
  typeof liveAttendanceSessionDiscoveryQuerySchema
>

export const liveAttendanceSessionSummarySchema = z.object({
  id: z.string().min(1),
  classroomId: z.string().min(1),
  classroomCode: z.string().min(1),
  classroomDisplayTitle: z.string().min(1),
  lectureId: z.string().nullable(),
  lectureTitle: z.string().nullable(),
  lectureDate: isoDateTimeSchema.nullable(),
  classId: z.string().min(1),
  classCode: z.string().min(1),
  classTitle: z.string().min(1),
  sectionId: z.string().min(1),
  sectionCode: z.string().min(1),
  sectionTitle: z.string().min(1),
  subjectId: z.string().min(1),
  subjectCode: z.string().min(1),
  subjectTitle: z.string().min(1),
  mode: attendanceModeSchema,
  status: attendanceSessionStatusSchema,
  startedAt: isoDateTimeSchema.nullable(),
  scheduledEndAt: isoDateTimeSchema.nullable(),
  presentCount: z.number().int().nonnegative(),
  absentCount: z.number().int().nonnegative(),
})
export type LiveAttendanceSessionSummary = z.infer<typeof liveAttendanceSessionSummarySchema>

export const liveAttendanceSessionsResponseSchema = z.array(liveAttendanceSessionSummarySchema)
export type LiveAttendanceSessionsResponse = z.infer<typeof liveAttendanceSessionsResponseSchema>

export const manualAttendanceActionValues = ["MARK_PRESENT", "MARK_ABSENT"] as const
export const manualAttendanceActionSchema = z.enum(manualAttendanceActionValues)
export type ManualAttendanceAction = z.infer<typeof manualAttendanceActionSchema>

export const manualAttendanceActionToStatusMap = {
  MARK_PRESENT: "PRESENT",
  MARK_ABSENT: "ABSENT",
} as const satisfies Record<ManualAttendanceAction, AttendanceRecordStatus>

export const manualAttendanceStudentUpdateSchema = z.object({
  attendanceRecordId: z.string().min(1),
  enrollmentId: z.string().min(1),
  studentId: z.string().min(1),
  action: manualAttendanceActionSchema,
})
export type ManualAttendanceStudentUpdate = z.infer<typeof manualAttendanceStudentUpdateSchema>

export const manualAttendanceUpdateRequestSchema = z
  .object({
    updates: z.array(manualAttendanceStudentUpdateSchema).min(1).max(500),
  })
  .superRefine((value, context) => {
    const seen = new Set<string>()

    value.updates.forEach((update, index) => {
      if (seen.has(update.attendanceRecordId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Each attendance record can appear only once in a manual attendance request.",
          path: ["updates", index, "attendanceRecordId"],
        })
        return
      }

      seen.add(update.attendanceRecordId)
    })
  })
export type ManualAttendanceUpdateRequest = z.infer<typeof manualAttendanceUpdateRequestSchema>

export const updateAttendanceSessionStudentChangeSchema = z.object({
  attendanceRecordId: z.string().min(1),
  status: attendanceRecordStatusSchema,
})
export type UpdateAttendanceSessionStudentChange = z.infer<
  typeof updateAttendanceSessionStudentChangeSchema
>

export const updateAttendanceSessionAttendanceRequestSchema = z
  .object({
    changes: z.array(updateAttendanceSessionStudentChangeSchema).min(1).max(500),
  })
  .superRefine((value, context) => {
    const seen = new Set<string>()

    value.changes.forEach((change, index) => {
      if (seen.has(change.attendanceRecordId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Each attendance record can appear only once in a manual edit request.",
          path: ["changes", index, "attendanceRecordId"],
        })
        return
      }

      seen.add(change.attendanceRecordId)
    })
  })
export type UpdateAttendanceSessionAttendanceRequest = z.infer<
  typeof updateAttendanceSessionAttendanceRequestSchema
>

export const updateAttendanceSessionAttendanceResponseSchema = z.object({
  appliedChangeCount: z.number().int().nonnegative(),
  session: attendanceSessionDetailSchema,
  students: attendanceSessionStudentsResponseSchema,
})
export type UpdateAttendanceSessionAttendanceResponse = z.infer<
  typeof updateAttendanceSessionAttendanceResponseSchema
>

export const manualAttendanceUpdateResponseSchema = updateAttendanceSessionAttendanceResponseSchema
export type ManualAttendanceUpdateResponse = z.infer<typeof manualAttendanceUpdateResponseSchema>

export const createQrSessionRequestSchema = z.object({
  classroomId: z.string().min(1),
  lectureId: z.string().min(1).optional(),
  lectureDate: isoDateTimeSchema.optional(),
  lectureTitle: z.string().trim().min(1).max(120).optional(),
  scheduleSlotId: z.string().min(1).optional(),
  scheduleExceptionId: z.string().min(1).optional(),
  sessionDurationMinutes: z.coerce.number().int().min(1).max(240).optional(),
  gpsRadiusMeters: z.coerce.number().int().min(1).max(5000).optional(),
  anchorType: attendanceLocationAnchorTypeSchema.default("TEACHER_SELECTED"),
  anchorLatitude: z.coerce.number().min(-90).max(90),
  anchorLongitude: z.coerce.number().min(-180).max(180),
  anchorLabel: z.string().trim().min(1).max(160).optional(),
})
export type CreateQrSessionRequest = z.infer<typeof createQrSessionRequestSchema>

export const attendanceSessionParamsSchema = z.object({
  sessionId: z.string().min(1),
})
export type AttendanceSessionParams = z.infer<typeof attendanceSessionParamsSchema>

export const qrSessionCreateResponseSchema = attendanceSessionSummarySchema
export type QrSessionCreateResponse = z.infer<typeof qrSessionCreateResponseSchema>

export const endAttendanceSessionResponseSchema = attendanceSessionSummarySchema
export type EndAttendanceSessionResponse = z.infer<typeof endAttendanceSessionResponseSchema>

export const createBluetoothSessionRequestSchema = z.object({
  classroomId: z.string().min(1),
  lectureId: z.string().min(1).optional(),
  lectureDate: isoDateTimeSchema.optional(),
  lectureTitle: z.string().trim().min(1).max(120).optional(),
  scheduleSlotId: z.string().min(1).optional(),
  scheduleExceptionId: z.string().min(1).optional(),
  sessionDurationMinutes: z.coerce.number().int().min(1).max(240).optional(),
})
export type CreateBluetoothSessionRequest = z.infer<typeof createBluetoothSessionRequestSchema>

export const bluetoothAdvertiserConfigSchema = z.object({
  sessionId: z.string().min(1),
  serviceUuid: z.string().uuid(),
  publicId: z.string().min(8),
  protocolVersion: z.number().int().positive(),
  rotationWindowSeconds: z.number().int().positive(),
  seed: z.string().min(16),
  currentPayload: z.string().min(8),
  currentPayloadExpiresAt: isoDateTimeSchema,
})
export type BluetoothAdvertiserConfig = z.infer<typeof bluetoothAdvertiserConfigSchema>

export const bluetoothSessionCreateResponseSchema = z.object({
  session: attendanceSessionSummarySchema,
  advertiser: bluetoothAdvertiserConfigSchema,
})
export type BluetoothSessionCreateResponse = z.infer<typeof bluetoothSessionCreateResponseSchema>

export const markQrAttendanceRequestSchema = z.object({
  qrPayload: z.string().trim().min(16),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accuracyMeters: z.coerce.number().positive(),
  deviceTimestamp: isoDateTimeSchema.optional(),
})
export type MarkQrAttendanceRequest = z.infer<typeof markQrAttendanceRequestSchema>

export const markBluetoothAttendanceRequestSchema = z.object({
  detectedPayload: z.string().trim().min(16),
  rssi: z.coerce.number().int().min(-127).max(20).optional(),
  deviceTimestamp: isoDateTimeSchema.optional(),
})
export type MarkBluetoothAttendanceRequest = z.infer<typeof markBluetoothAttendanceRequestSchema>

export const markQrAttendanceResponseSchema = z.object({
  success: z.literal(true),
  sessionId: z.string().min(1),
  attendanceRecordId: z.string().min(1),
  attendanceStatus: attendanceRecordStatusSchema,
  markSource: attendanceMarkSourceSchema,
  markedAt: isoDateTimeSchema,
  presentCount: z.number().int().nonnegative(),
  absentCount: z.number().int().nonnegative(),
  distanceMeters: z.number().nonnegative(),
  accuracyMeters: z.number().positive(),
})
export type MarkQrAttendanceResponse = z.infer<typeof markQrAttendanceResponseSchema>

export const markBluetoothAttendanceResponseSchema = z.object({
  success: z.literal(true),
  sessionId: z.string().min(1),
  attendanceRecordId: z.string().min(1),
  attendanceStatus: attendanceRecordStatusSchema,
  markSource: attendanceMarkSourceSchema,
  markedAt: isoDateTimeSchema,
  presentCount: z.number().int().nonnegative(),
  absentCount: z.number().int().nonnegative(),
  detectionRssi: z.number().int().nullable(),
  detectionSlice: z.number().int().nonnegative(),
})
export type MarkBluetoothAttendanceResponse = z.infer<typeof markBluetoothAttendanceResponseSchema>
