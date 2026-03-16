import { z } from "zod"

import {
  academicScopeSchema,
  attendanceModeSchema,
  classroomMutableStatusSchema,
  classroomStatusSchema,
  courseOfferingStatusSchema,
  enrollmentSourceSchema,
  enrollmentStatusSchema,
} from "./academic.core"
import {
  classroomCodeFieldSchema,
  classroomTitleFieldSchema,
  fieldsMatch,
  isoDateTimeSchema,
} from "./academic.internal"
import {
  classroomJoinCodeSummarySchema,
  scheduleExceptionSummarySchema,
  scheduleSlotSummarySchema,
} from "./academic.schedule"

export const classroomCrudPermissionsSchema = z.object({
  canEdit: z.boolean(),
  canArchive: z.boolean(),
  canEditCourseInfo: z.boolean(),
  canEditAcademicScope: z.boolean(),
  canReassignTeacher: z.boolean(),
})
export type ClassroomCrudPermissions = z.infer<typeof classroomCrudPermissionsSchema>

export const classroomSummarySchema = academicScopeSchema.extend({
  id: z.string().min(1),
  primaryTeacherId: z.string().min(1),
  primaryTeacherDisplayName: z.string().min(1).nullable().optional(),
  createdByUserId: z.string().min(1),
  code: z.string().min(1),
  courseCode: z.string().min(1).optional(),
  displayTitle: z.string().min(1),
  classroomTitle: z.string().min(1).optional(),
  semesterCode: z.string().min(1).nullable().optional(),
  semesterTitle: z.string().min(1).nullable().optional(),
  classCode: z.string().min(1).nullable().optional(),
  classTitle: z.string().min(1).nullable().optional(),
  sectionCode: z.string().min(1).nullable().optional(),
  sectionTitle: z.string().min(1).nullable().optional(),
  subjectCode: z.string().min(1).nullable().optional(),
  subjectTitle: z.string().min(1).nullable().optional(),
  status: courseOfferingStatusSchema,
  defaultAttendanceMode: attendanceModeSchema,
  defaultGpsRadiusMeters: z.number().int().positive(),
  defaultSessionDurationMinutes: z.number().int().positive(),
  qrRotationWindowSeconds: z.number().int().positive(),
  bluetoothRotationWindowSeconds: z.number().int().positive(),
  timezone: z.string().min(1),
  requiresTrustedDevice: z.boolean(),
  archivedAt: isoDateTimeSchema.nullable(),
  activeJoinCode: classroomJoinCodeSummarySchema.nullable(),
  permissions: classroomCrudPermissionsSchema.optional(),
})
export type ClassroomSummary = z.infer<typeof classroomSummarySchema>

export const classroomDetailSchema = classroomSummarySchema.extend({
  scheduleSlots: z.array(scheduleSlotSummarySchema),
  scheduleExceptions: z.array(scheduleExceptionSummarySchema),
})
export type ClassroomDetail = z.infer<typeof classroomDetailSchema>

export const adminClassroomGovernanceSchema = z.object({
  activeStudentCount: z.number().int().nonnegative(),
  pendingStudentCount: z.number().int().nonnegative(),
  blockedStudentCount: z.number().int().nonnegative(),
  droppedStudentCount: z.number().int().nonnegative(),
  attendanceSessionCount: z.number().int().nonnegative(),
  liveAttendanceSessionCount: z.number().int().nonnegative(),
  presentRecordCount: z.number().int().nonnegative(),
  absentRecordCount: z.number().int().nonnegative(),
  latestAttendanceAt: isoDateTimeSchema.nullable(),
  canArchiveNow: z.boolean(),
  archiveEffectLabel: z.string().min(1),
  archiveEffectMessage: z.string().min(1),
  historyPreservedNote: z.string().min(1),
})
export type AdminClassroomGovernance = z.infer<typeof adminClassroomGovernanceSchema>

export const adminClassroomGovernanceSummarySchema = classroomSummarySchema.extend({
  governance: adminClassroomGovernanceSchema,
})
export type AdminClassroomGovernanceSummary = z.infer<typeof adminClassroomGovernanceSummarySchema>

export const adminClassroomGovernanceDetailSchema = classroomDetailSchema.extend({
  governance: adminClassroomGovernanceSchema,
})
export type AdminClassroomGovernanceDetail = z.infer<typeof adminClassroomGovernanceDetailSchema>

export const adminClassroomGovernanceSearchQuerySchema = z.object({
  query: z.string().trim().min(1).optional(),
  semesterId: z.string().min(1).optional(),
  status: classroomStatusSchema.optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
})
export type AdminClassroomGovernanceSearchQuery = z.infer<
  typeof adminClassroomGovernanceSearchQuerySchema
>

export const adminClassroomGovernanceResponseSchema = z.array(adminClassroomGovernanceSummarySchema)
export type AdminClassroomGovernanceResponse = z.infer<
  typeof adminClassroomGovernanceResponseSchema
>

export const adminArchiveClassroomRequestSchema = z.object({
  reason: z.string().trim().min(3).max(280),
})
export type AdminArchiveClassroomRequest = z.infer<typeof adminArchiveClassroomRequestSchema>

export const studentClassroomMembershipSummarySchema = academicScopeSchema.extend({
  id: z.string().min(1),
  classroomId: z.string().min(1).optional(),
  primaryTeacherId: z.string().min(1),
  code: z.string().min(1),
  displayTitle: z.string().min(1),
  classroomStatus: courseOfferingStatusSchema,
  defaultAttendanceMode: attendanceModeSchema,
  timezone: z.string().min(1),
  requiresTrustedDevice: z.boolean(),
  enrollmentId: z.string().min(1),
  membershipId: z.string().min(1).optional(),
  enrollmentStatus: enrollmentStatusSchema,
  membershipStatus: enrollmentStatusSchema.optional(),
  enrollmentSource: enrollmentSourceSchema,
  membershipSource: enrollmentSourceSchema.optional(),
  joinedAt: isoDateTimeSchema,
  droppedAt: isoDateTimeSchema.nullable(),
})
export type StudentClassroomMembershipSummary = z.infer<
  typeof studentClassroomMembershipSummarySchema
>

export const studentClassroomSummarySchema = studentClassroomMembershipSummarySchema
export type StudentClassroomSummary = z.infer<typeof studentClassroomSummarySchema>

export const studentClassroomListQuerySchema = academicScopeSchema.partial().extend({
  courseOfferingId: z.string().min(1).optional(),
  classroomId: z.string().min(1).optional(),
  classroomStatus: courseOfferingStatusSchema.optional(),
  enrollmentStatus: enrollmentStatusSchema.optional(),
  membershipStatus: enrollmentStatusSchema.optional(),
})
export type StudentClassroomListQuery = z.infer<typeof studentClassroomListQuerySchema>

export const studentClassroomsQuerySchema = studentClassroomListQuerySchema
export type StudentClassroomsQuery = z.infer<typeof studentClassroomsQuerySchema>

export const studentClassroomsResponseSchema = z.array(studentClassroomMembershipSummarySchema)
export type StudentClassroomsResponse = z.infer<typeof studentClassroomsResponseSchema>

export const studentClassroomSummariesResponseSchema = studentClassroomsResponseSchema
export type StudentClassroomSummariesResponse = z.infer<
  typeof studentClassroomSummariesResponseSchema
>

export const classroomListQuerySchema = z.object({
  semesterId: z.string().min(1).optional(),
  classId: z.string().min(1).optional(),
  sectionId: z.string().min(1).optional(),
  subjectId: z.string().min(1).optional(),
  status: courseOfferingStatusSchema.optional(),
  primaryTeacherId: z.string().min(1).optional(),
})
export type ClassroomListQuery = z.infer<typeof classroomListQuerySchema>

export const createClassroomRequestSchema = academicScopeSchema
  .extend({
    primaryTeacherId: z.string().min(1).optional(),
    code: classroomCodeFieldSchema.optional(),
    courseCode: classroomCodeFieldSchema.optional(),
    displayTitle: classroomTitleFieldSchema.optional(),
    classroomTitle: classroomTitleFieldSchema.optional(),
    defaultAttendanceMode: attendanceModeSchema.optional(),
    defaultGpsRadiusMeters: z.coerce.number().int().min(10).max(5000).optional(),
    defaultSessionDurationMinutes: z.coerce.number().int().min(1).max(480).optional(),
    qrRotationWindowSeconds: z.coerce.number().int().min(5).max(300).optional(),
    bluetoothRotationWindowSeconds: z.coerce.number().int().min(5).max(180).optional(),
    timezone: z.string().trim().min(3).max(100).optional(),
    requiresTrustedDevice: z.boolean().optional(),
  })
  .superRefine((value, context) => {
    if (value.code === undefined && value.courseCode === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["courseCode"],
        message: "Course code is required.",
      })
    }

    if (!fieldsMatch(value.code, value.courseCode)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["courseCode"],
        message: "Course code must match the classroom code when both are provided.",
      })
    }

    if (value.displayTitle === undefined && value.classroomTitle === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["classroomTitle"],
        message: "Classroom title is required.",
      })
    }

    if (!fieldsMatch(value.displayTitle, value.classroomTitle)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["classroomTitle"],
        message: "Classroom title must match the display title when both are provided.",
      })
    }
  })
export type CreateClassroomRequest = z.infer<typeof createClassroomRequestSchema>

export const updateClassroomRequestSchema = z
  .object({
    semesterId: z.string().min(1).optional(),
    classId: z.string().min(1).optional(),
    sectionId: z.string().min(1).optional(),
    subjectId: z.string().min(1).optional(),
    primaryTeacherId: z.string().min(1).optional(),
    code: classroomCodeFieldSchema.optional(),
    courseCode: classroomCodeFieldSchema.optional(),
    displayTitle: classroomTitleFieldSchema.optional(),
    classroomTitle: classroomTitleFieldSchema.optional(),
    status: classroomMutableStatusSchema.optional(),
    defaultAttendanceMode: attendanceModeSchema.optional(),
    defaultGpsRadiusMeters: z.coerce.number().int().min(10).max(5000).optional(),
    defaultSessionDurationMinutes: z.coerce.number().int().min(1).max(480).optional(),
    qrRotationWindowSeconds: z.coerce.number().int().min(5).max(300).optional(),
    bluetoothRotationWindowSeconds: z.coerce.number().int().min(5).max(180).optional(),
    timezone: z.string().trim().min(3).max(100).optional(),
    requiresTrustedDevice: z.boolean().optional(),
  })
  .superRefine((value, context) => {
    if (Object.keys(value).length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one classroom field must be provided.",
      })
    }

    if (!fieldsMatch(value.code, value.courseCode)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["courseCode"],
        message: "Course code must match the classroom code when both are provided.",
      })
    }

    if (!fieldsMatch(value.displayTitle, value.classroomTitle)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["classroomTitle"],
        message: "Classroom title must match the display title when both are provided.",
      })
    }
  })
export type UpdateClassroomRequest = z.infer<typeof updateClassroomRequestSchema>

export const classroomParamsSchema = z.object({
  classroomId: z.string().min(1),
})
export type ClassroomParams = z.infer<typeof classroomParamsSchema>

export const classroomsResponseSchema = z.array(classroomSummarySchema)
export type ClassroomsResponse = z.infer<typeof classroomsResponseSchema>
