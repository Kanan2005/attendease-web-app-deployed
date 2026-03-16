import { z } from "zod"

import { attendanceModeSchema } from "./academic"
import {
  attendanceMarkSourceSchema,
  attendanceRecordStatusSchema,
  attendanceSessionEditabilitySchema,
  attendanceSessionStatusSchema,
  attendanceSessionSummarySchema,
} from "./attendance.core"
import { isoDateTimeSchema } from "./attendance.internal"

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
