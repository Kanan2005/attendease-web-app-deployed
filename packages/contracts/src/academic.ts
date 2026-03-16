import { z } from "zod"

import { userStatusSchema } from "./auth"

const isoDateTimeSchema = z.string().datetime()
const minuteOfDaySchema = z.coerce.number().int().min(0).max(1440)
const weekdaySchema = z.coerce.number().int().min(1).max(7)
const classroomCodeFieldSchema = z.string().trim().min(3).max(64)
const classroomTitleFieldSchema = z.string().trim().min(3).max(120)

function fieldsMatch(left?: string, right?: string) {
  return left === undefined || right === undefined || left.trim() === right.trim()
}

export const semesterStatusValues = ["DRAFT", "ACTIVE", "CLOSED", "ARCHIVED"] as const
export const semesterStatusSchema = z.enum(semesterStatusValues)
export type SemesterStatus = z.infer<typeof semesterStatusSchema>

export const teacherAssignmentStatusValues = ["ACTIVE", "REVOKED", "ARCHIVED"] as const
export const teacherAssignmentStatusSchema = z.enum(teacherAssignmentStatusValues)
export type TeacherAssignmentStatus = z.infer<typeof teacherAssignmentStatusSchema>

export const courseOfferingStatusValues = ["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"] as const
export const courseOfferingStatusSchema = z.enum(courseOfferingStatusValues)
export type CourseOfferingStatus = z.infer<typeof courseOfferingStatusSchema>
export const classroomStatusValues = courseOfferingStatusValues
export const classroomStatusSchema = courseOfferingStatusSchema
export type ClassroomStatus = CourseOfferingStatus

export const classroomMutableStatusValues = ["DRAFT", "ACTIVE", "COMPLETED"] as const
export const classroomMutableStatusSchema = z.enum(classroomMutableStatusValues)
export type ClassroomMutableStatus = z.infer<typeof classroomMutableStatusSchema>

export const enrollmentStatusValues = ["ACTIVE", "PENDING", "DROPPED", "BLOCKED"] as const
export const enrollmentStatusSchema = z.enum(enrollmentStatusValues)
export type EnrollmentStatus = z.infer<typeof enrollmentStatusSchema>
export const studentMembershipStatusValues = enrollmentStatusValues
export const studentMembershipStatusSchema = enrollmentStatusSchema
export type StudentMembershipStatus = EnrollmentStatus

export const enrollmentSourceValues = ["JOIN_CODE", "IMPORT", "MANUAL", "ADMIN"] as const
export const enrollmentSourceSchema = z.enum(enrollmentSourceValues)
export type EnrollmentSource = z.infer<typeof enrollmentSourceSchema>
export const studentMembershipSourceValues = enrollmentSourceValues
export const studentMembershipSourceSchema = enrollmentSourceSchema
export type StudentMembershipSource = EnrollmentSource

export const joinCodeStatusValues = ["ACTIVE", "EXPIRED", "REVOKED"] as const
export const joinCodeStatusSchema = z.enum(joinCodeStatusValues)
export type JoinCodeStatus = z.infer<typeof joinCodeStatusSchema>

export const announcementPostTypeValues = [
  "ANNOUNCEMENT",
  "SCHEDULE_UPDATE",
  "ATTENDANCE_REMINDER",
  "IMPORT_RESULT",
] as const
export const announcementPostTypeSchema = z.enum(announcementPostTypeValues)
export type AnnouncementPostType = z.infer<typeof announcementPostTypeSchema>

export const announcementVisibilityValues = ["TEACHER_ONLY", "STUDENT_AND_TEACHER"] as const
export const announcementVisibilitySchema = z.enum(announcementVisibilityValues)
export type AnnouncementVisibility = z.infer<typeof announcementVisibilitySchema>

export const rosterImportStatusValues = [
  "UPLOADED",
  "PROCESSING",
  "REVIEW_REQUIRED",
  "APPLIED",
  "FAILED",
] as const
export const rosterImportStatusSchema = z.enum(rosterImportStatusValues)
export type RosterImportStatus = z.infer<typeof rosterImportStatusSchema>

export const rosterImportRowStatusValues = [
  "PENDING",
  "VALID",
  "INVALID",
  "APPLIED",
  "SKIPPED",
  "FAILED",
] as const
export const rosterImportRowStatusSchema = z.enum(rosterImportRowStatusValues)
export type RosterImportRowStatus = z.infer<typeof rosterImportRowStatusSchema>

export const scheduleSlotStatusValues = ["ACTIVE", "ARCHIVED"] as const
export const scheduleSlotStatusSchema = z.enum(scheduleSlotStatusValues)
export type ScheduleSlotStatus = z.infer<typeof scheduleSlotStatusSchema>

export const scheduleExceptionTypeValues = ["CANCELLED", "RESCHEDULED", "ONE_OFF"] as const
export const scheduleExceptionTypeSchema = z.enum(scheduleExceptionTypeValues)
export type ScheduleExceptionType = z.infer<typeof scheduleExceptionTypeSchema>

export const lectureStatusValues = [
  "PLANNED",
  "OPEN_FOR_ATTENDANCE",
  "COMPLETED",
  "CANCELLED",
] as const
export const lectureStatusSchema = z.enum(lectureStatusValues)
export type LectureStatus = z.infer<typeof lectureStatusSchema>
export const classSessionStatusValues = lectureStatusValues
export const classSessionStatusSchema = lectureStatusSchema
export type ClassSessionStatus = LectureStatus

export const attendanceModeValues = ["QR_GPS", "BLUETOOTH", "MANUAL"] as const
export const attendanceModeSchema = z.enum(attendanceModeValues)
export type AttendanceMode = z.infer<typeof attendanceModeSchema>

export const academicScopeSchema = z.object({
  semesterId: z.string().min(1),
  classId: z.string().min(1),
  sectionId: z.string().min(1),
  subjectId: z.string().min(1),
})
export type AcademicScope = z.infer<typeof academicScopeSchema>

export const teacherAssignmentSummarySchema = academicScopeSchema.extend({
  id: z.string().min(1),
  teacherId: z.string().min(1),
  semesterCode: z.string().min(1).nullable().optional(),
  semesterTitle: z.string().min(1).nullable().optional(),
  classCode: z.string().min(1).nullable().optional(),
  classTitle: z.string().min(1).nullable().optional(),
  sectionCode: z.string().min(1).nullable().optional(),
  sectionTitle: z.string().min(1).nullable().optional(),
  subjectCode: z.string().min(1).nullable().optional(),
  subjectTitle: z.string().min(1).nullable().optional(),
  status: teacherAssignmentStatusSchema,
  canSelfCreateCourseOffering: z.boolean(),
})
export type TeacherAssignmentSummary = z.infer<typeof teacherAssignmentSummarySchema>

export const teacherAssignmentListQuerySchema = academicScopeSchema.partial()
export type TeacherAssignmentListQuery = z.infer<typeof teacherAssignmentListQuerySchema>

export const teacherAssignmentParamsSchema = z.object({
  assignmentId: z.string().min(1),
})
export type TeacherAssignmentParams = z.infer<typeof teacherAssignmentParamsSchema>

export const teacherAssignmentsResponseSchema = z.array(teacherAssignmentSummarySchema)
export type TeacherAssignmentsResponse = z.infer<typeof teacherAssignmentsResponseSchema>

export const courseOfferingSummarySchema = academicScopeSchema.extend({
  id: z.string().min(1),
  primaryTeacherId: z.string().min(1),
  code: z.string().min(1),
  displayTitle: z.string().min(1),
  status: courseOfferingStatusSchema,
  requiresTrustedDevice: z.boolean(),
})
export type CourseOfferingSummary = z.infer<typeof courseOfferingSummarySchema>

export const semesterSummarySchema = z.object({
  id: z.string().min(1),
  academicTermId: z.string().min(1),
  code: z.string().min(1),
  title: z.string().min(1),
  ordinal: z.number().int().nullable(),
  status: semesterStatusSchema,
  startDate: isoDateTimeSchema,
  endDate: isoDateTimeSchema,
  attendanceCutoffDate: isoDateTimeSchema.nullable(),
})
export type SemesterSummary = z.infer<typeof semesterSummarySchema>

export const semesterListQuerySchema = z.object({
  academicTermId: z.string().min(1).optional(),
  status: semesterStatusSchema.optional(),
})
export type SemesterListQuery = z.infer<typeof semesterListQuerySchema>

export const semesterParamsSchema = z.object({
  semesterId: z.string().min(1),
})
export type SemesterParams = z.infer<typeof semesterParamsSchema>

export const createSemesterRequestSchema = z
  .object({
    academicTermId: z.string().min(1),
    code: z.string().trim().min(3).max(64),
    title: z.string().trim().min(3).max(120),
    ordinal: z.coerce.number().int().positive().max(32).optional(),
    startDate: isoDateTimeSchema,
    endDate: isoDateTimeSchema,
    attendanceCutoffDate: isoDateTimeSchema.optional(),
  })
  .refine((value) => new Date(value.startDate) <= new Date(value.endDate), {
    message: "Semester start date must be before or equal to the end date.",
    path: ["endDate"],
  })
  .refine(
    (value) =>
      value.attendanceCutoffDate === undefined ||
      (new Date(value.attendanceCutoffDate) >= new Date(value.startDate) &&
        new Date(value.attendanceCutoffDate) <= new Date(value.endDate)),
    {
      message: "Attendance cutoff date must fall inside the semester window.",
      path: ["attendanceCutoffDate"],
    },
  )
export type CreateSemesterRequest = z.infer<typeof createSemesterRequestSchema>

export const updateSemesterRequestSchema = z
  .object({
    code: z.string().trim().min(3).max(64).optional(),
    title: z.string().trim().min(3).max(120).optional(),
    ordinal: z.coerce.number().int().positive().max(32).nullable().optional(),
    startDate: isoDateTimeSchema.optional(),
    endDate: isoDateTimeSchema.optional(),
    attendanceCutoffDate: isoDateTimeSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one semester field must be provided.",
  })
export type UpdateSemesterRequest = z.infer<typeof updateSemesterRequestSchema>

export const semestersResponseSchema = z.array(semesterSummarySchema)
export type SemestersResponse = z.infer<typeof semestersResponseSchema>

export const classroomJoinCodeSummarySchema = z.object({
  id: z.string().min(1),
  courseOfferingId: z.string().min(1),
  classroomId: z.string().min(1).optional(),
  code: z.string().min(1),
  status: joinCodeStatusSchema,
  expiresAt: isoDateTimeSchema,
})
export type ClassroomJoinCodeSummary = z.infer<typeof classroomJoinCodeSummarySchema>

export const resetClassroomJoinCodeRequestSchema = z.object({
  expiresAt: isoDateTimeSchema.optional(),
})
export type ResetClassroomJoinCodeRequest = z.infer<typeof resetClassroomJoinCodeRequestSchema>

export const joinClassroomRequestSchema = z.object({
  code: z
    .string()
    .trim()
    .min(4)
    .max(32)
    .transform((value) => value.toUpperCase()),
})
export type JoinClassroomRequest = z.infer<typeof joinClassroomRequestSchema>

export const scheduleSlotSummarySchema = z.object({
  id: z.string().min(1),
  courseOfferingId: z.string().min(1),
  classroomId: z.string().min(1).optional(),
  weekday: weekdaySchema,
  startMinutes: minuteOfDaySchema,
  endMinutes: minuteOfDaySchema,
  locationLabel: z.string().nullable(),
  status: scheduleSlotStatusSchema,
})
export type ScheduleSlotSummary = z.infer<typeof scheduleSlotSummarySchema>

export const scheduleExceptionSummarySchema = z.object({
  id: z.string().min(1),
  courseOfferingId: z.string().min(1),
  classroomId: z.string().min(1).optional(),
  scheduleSlotId: z.string().nullable(),
  exceptionType: scheduleExceptionTypeSchema,
  effectiveDate: isoDateTimeSchema,
  startMinutes: minuteOfDaySchema.nullable(),
  endMinutes: minuteOfDaySchema.nullable(),
  locationLabel: z.string().nullable(),
  reason: z.string().nullable(),
})
export type ScheduleExceptionSummary = z.infer<typeof scheduleExceptionSummarySchema>

export const classroomScheduleSchema = z.object({
  classroomId: z.string().min(1),
  scheduleSlots: z.array(scheduleSlotSummarySchema),
  scheduleExceptions: z.array(scheduleExceptionSummarySchema),
})
export type ClassroomSchedule = z.infer<typeof classroomScheduleSchema>

export const createScheduleSlotRequestSchema = z
  .object({
    weekday: weekdaySchema,
    startMinutes: minuteOfDaySchema,
    endMinutes: minuteOfDaySchema,
    locationLabel: z.string().trim().min(1).max(120).nullable().optional(),
  })
  .refine((value) => value.startMinutes < value.endMinutes, {
    message: "Schedule slot start time must be before the end time.",
    path: ["endMinutes"],
  })
export type CreateScheduleSlotRequest = z.infer<typeof createScheduleSlotRequestSchema>

export const updateScheduleSlotRequestSchema = z
  .object({
    weekday: weekdaySchema.optional(),
    startMinutes: minuteOfDaySchema.optional(),
    endMinutes: minuteOfDaySchema.optional(),
    locationLabel: z.string().trim().min(1).max(120).nullable().optional(),
    status: scheduleSlotStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one schedule slot field must be provided.",
  })
export type UpdateScheduleSlotRequest = z.infer<typeof updateScheduleSlotRequestSchema>

export const scheduleSlotParamsSchema = z.object({
  classroomId: z.string().min(1),
  slotId: z.string().min(1),
})
export type ScheduleSlotParams = z.infer<typeof scheduleSlotParamsSchema>

export const createScheduleExceptionRequestSchema = z
  .object({
    scheduleSlotId: z.string().min(1).optional(),
    exceptionType: scheduleExceptionTypeSchema,
    effectiveDate: isoDateTimeSchema,
    startMinutes: minuteOfDaySchema.nullable().optional(),
    endMinutes: minuteOfDaySchema.nullable().optional(),
    locationLabel: z.string().trim().min(1).max(120).nullable().optional(),
    reason: z.string().trim().min(1).max(280).nullable().optional(),
  })
  .refine((value) => value.exceptionType === "ONE_OFF" || value.scheduleSlotId !== undefined, {
    message: "Cancelled and rescheduled entries must target an existing weekly slot.",
    path: ["scheduleSlotId"],
  })
  .refine(
    (value) =>
      value.exceptionType === "CANCELLED" ||
      (value.startMinutes !== undefined &&
        value.startMinutes !== null &&
        value.endMinutes !== undefined &&
        value.endMinutes !== null &&
        value.startMinutes < value.endMinutes),
    {
      message: "One-off and rescheduled entries must provide a valid start and end time.",
      path: ["endMinutes"],
    },
  )
export type CreateScheduleExceptionRequest = z.infer<typeof createScheduleExceptionRequestSchema>

export const updateScheduleExceptionRequestSchema = z
  .object({
    scheduleSlotId: z.string().min(1).nullable().optional(),
    exceptionType: scheduleExceptionTypeSchema.optional(),
    effectiveDate: isoDateTimeSchema.optional(),
    startMinutes: minuteOfDaySchema.nullable().optional(),
    endMinutes: minuteOfDaySchema.nullable().optional(),
    locationLabel: z.string().trim().min(1).max(120).nullable().optional(),
    reason: z.string().trim().min(1).max(280).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one schedule exception field must be provided.",
  })
export type UpdateScheduleExceptionRequest = z.infer<typeof updateScheduleExceptionRequestSchema>

export const scheduleExceptionParamsSchema = z.object({
  classroomId: z.string().min(1),
  exceptionId: z.string().min(1),
})
export type ScheduleExceptionParams = z.infer<typeof scheduleExceptionParamsSchema>

export const scheduleSlotUpdateOperationSchema = z
  .object({
    slotId: z.string().min(1),
    weekday: weekdaySchema.optional(),
    startMinutes: minuteOfDaySchema.optional(),
    endMinutes: minuteOfDaySchema.optional(),
    locationLabel: z.string().trim().min(1).max(120).nullable().optional(),
    status: scheduleSlotStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 1, {
    message: "At least one schedule slot update field must be provided.",
  })
export type ScheduleSlotUpdateOperation = z.infer<typeof scheduleSlotUpdateOperationSchema>

export const scheduleExceptionUpdateOperationSchema = z
  .object({
    exceptionId: z.string().min(1),
    scheduleSlotId: z.string().min(1).nullable().optional(),
    exceptionType: scheduleExceptionTypeSchema.optional(),
    effectiveDate: isoDateTimeSchema.optional(),
    startMinutes: minuteOfDaySchema.nullable().optional(),
    endMinutes: minuteOfDaySchema.nullable().optional(),
    locationLabel: z.string().trim().min(1).max(120).nullable().optional(),
    reason: z.string().trim().min(1).max(280).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 1, {
    message: "At least one schedule exception update field must be provided.",
  })
export type ScheduleExceptionUpdateOperation = z.infer<
  typeof scheduleExceptionUpdateOperationSchema
>

export const saveAndNotifyScheduleRequestSchema = z
  .object({
    weeklySlotCreates: z.array(createScheduleSlotRequestSchema).optional(),
    weeklySlotUpdates: z.array(scheduleSlotUpdateOperationSchema).optional(),
    exceptionCreates: z.array(createScheduleExceptionRequestSchema).optional(),
    exceptionUpdates: z.array(scheduleExceptionUpdateOperationSchema).optional(),
    note: z.string().trim().min(1).max(500).optional(),
  })
  .refine(
    (value) =>
      (value.weeklySlotCreates?.length ?? 0) +
        (value.weeklySlotUpdates?.length ?? 0) +
        (value.exceptionCreates?.length ?? 0) +
        (value.exceptionUpdates?.length ?? 0) >
      0,
    {
      message: "At least one schedule change must be provided.",
    },
  )
export type SaveAndNotifyScheduleRequest = z.infer<typeof saveAndNotifyScheduleRequestSchema>

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

export const lectureSummarySchema = z.object({
  id: z.string().min(1),
  courseOfferingId: z.string().min(1),
  classroomId: z.string().min(1).optional(),
  scheduleSlotId: z.string().nullable(),
  scheduleExceptionId: z.string().nullable(),
  createdByUserId: z.string().nullable(),
  title: z.string().nullable(),
  lectureDate: isoDateTimeSchema,
  plannedStartAt: isoDateTimeSchema.nullable(),
  plannedEndAt: isoDateTimeSchema.nullable(),
  actualStartAt: isoDateTimeSchema.nullable(),
  actualEndAt: isoDateTimeSchema.nullable(),
  status: lectureStatusSchema,
})
export type LectureSummary = z.infer<typeof lectureSummarySchema>
export const classSessionSummarySchema = lectureSummarySchema
export type ClassSessionSummary = LectureSummary

export const lectureListQuerySchema = z
  .object({
    status: lectureStatusSchema.optional(),
    fromDate: isoDateTimeSchema.optional(),
    toDate: isoDateTimeSchema.optional(),
  })
  .refine(
    (value) =>
      value.fromDate === undefined ||
      value.toDate === undefined ||
      new Date(value.fromDate) <= new Date(value.toDate),
    {
      message: "Lecture range start must be before or equal to the range end.",
      path: ["toDate"],
    },
  )
export type LectureListQuery = z.infer<typeof lectureListQuerySchema>
export const classSessionListQuerySchema = lectureListQuerySchema
export type ClassSessionListQuery = LectureListQuery

export const createLectureRequestSchema = z
  .object({
    scheduleSlotId: z.string().min(1).optional(),
    scheduleExceptionId: z.string().min(1).optional(),
    title: z.string().trim().min(1).max(140).optional(),
    lectureDate: isoDateTimeSchema,
    plannedStartAt: isoDateTimeSchema.optional(),
    plannedEndAt: isoDateTimeSchema.optional(),
    status: lectureStatusSchema.optional(),
  })
  .refine(
    (value) =>
      (value.plannedStartAt === undefined && value.plannedEndAt === undefined) ||
      (value.plannedStartAt !== undefined &&
        value.plannedEndAt !== undefined &&
        new Date(value.plannedStartAt) < new Date(value.plannedEndAt)),
    {
      message:
        "Planned lecture start and end times must be provided together and the start must be before the end.",
      path: ["plannedEndAt"],
    },
  )
export type CreateLectureRequest = z.infer<typeof createLectureRequestSchema>
export const createClassSessionRequestSchema = createLectureRequestSchema
export type CreateClassSessionRequest = CreateLectureRequest

export const lecturesResponseSchema = z.array(lectureSummarySchema)
export type LecturesResponse = z.infer<typeof lecturesResponseSchema>
export const classSessionsResponseSchema = lecturesResponseSchema
export type ClassSessionsResponse = LecturesResponse

export const enrollmentSummarySchema = academicScopeSchema.extend({
  id: z.string().min(1),
  courseOfferingId: z.string().min(1),
  classroomId: z.string().min(1).optional(),
  membershipId: z.string().min(1).optional(),
  studentId: z.string().min(1),
  status: enrollmentStatusSchema,
  membershipStatus: enrollmentStatusSchema.optional(),
  source: enrollmentSourceSchema,
  membershipSource: enrollmentSourceSchema.optional(),
})
export type EnrollmentSummary = z.infer<typeof enrollmentSummarySchema>
export const studentMembershipSummarySchema = enrollmentSummarySchema
export type StudentMembershipSummary = EnrollmentSummary

export const enrollmentListQuerySchema = academicScopeSchema.partial().extend({
  courseOfferingId: z.string().min(1).optional(),
  classroomId: z.string().min(1).optional(),
  status: enrollmentStatusSchema.optional(),
  membershipStatus: enrollmentStatusSchema.optional(),
})
export type EnrollmentListQuery = z.infer<typeof enrollmentListQuerySchema>
export const studentMembershipListQuerySchema = enrollmentListQuerySchema
export type StudentMembershipListQuery = EnrollmentListQuery

export const enrollmentParamsSchema = z.object({
  enrollmentId: z.string().min(1),
})
export type EnrollmentParams = z.infer<typeof enrollmentParamsSchema>
export const studentMembershipParamsSchema = enrollmentParamsSchema
export type StudentMembershipParams = EnrollmentParams

export const enrollmentsResponseSchema = z.array(enrollmentSummarySchema)
export type EnrollmentsResponse = z.infer<typeof enrollmentsResponseSchema>
export const studentMembershipsResponseSchema = enrollmentsResponseSchema
export type StudentMembershipsResponse = EnrollmentsResponse

export const classroomStudentActionsSchema = z.object({
  canBlock: z.boolean(),
  canRemove: z.boolean(),
  canReactivate: z.boolean(),
})
export type ClassroomStudentActions = z.infer<typeof classroomStudentActionsSchema>

export const classroomRosterMemberSummarySchema = enrollmentSummarySchema.extend({
  studentEmail: z.string().email(),
  studentDisplayName: z.string().min(1),
  studentName: z.string().min(1),
  studentIdentifier: z.string().min(1),
  studentStatus: userStatusSchema,
  rollNumber: z.string().nullable(),
  universityId: z.string().nullable(),
  attendanceDisabled: z.boolean(),
  joinedAt: isoDateTimeSchema,
  memberSince: isoDateTimeSchema,
  droppedAt: isoDateTimeSchema.nullable(),
  membershipState: enrollmentStatusSchema,
  actions: classroomStudentActionsSchema,
})
export type ClassroomRosterMemberSummary = z.infer<typeof classroomRosterMemberSummarySchema>

export const classroomStudentSummarySchema = classroomRosterMemberSummarySchema
export type ClassroomStudentSummary = z.infer<typeof classroomStudentSummarySchema>

export const classroomRosterListQuerySchema = z
  .object({
    status: enrollmentStatusSchema.optional(),
    membershipStatus: enrollmentStatusSchema.optional(),
    search: z.string().trim().min(1).max(120).optional(),
  })
  .superRefine((value, context) => {
    if (!fieldsMatch(value.status, value.membershipStatus)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["membershipStatus"],
        message: "Membership status must match status when both are provided.",
      })
    }
  })
export type ClassroomRosterListQuery = z.infer<typeof classroomRosterListQuerySchema>

export const classroomStudentListQuerySchema = classroomRosterListQuerySchema
export type ClassroomStudentListQuery = z.infer<typeof classroomStudentListQuerySchema>

export const createClassroomRosterMemberRequestSchema = z
  .object({
    studentId: z.string().min(1).optional(),
    studentEmail: z.string().email().optional(),
    studentIdentifier: z.string().trim().min(1).max(120).optional(),
    studentRollNumber: z.string().trim().min(1).max(64).optional(),
    studentUniversityId: z.string().trim().min(1).max(64).optional(),
    status: z.enum(["ACTIVE", "PENDING"]).optional(),
    membershipStatus: z.enum(["ACTIVE", "PENDING"]).optional(),
  })
  .superRefine((value, context) => {
    if (
      value.studentId === undefined &&
      value.studentEmail === undefined &&
      value.studentIdentifier === undefined &&
      value.studentRollNumber === undefined &&
      value.studentUniversityId === undefined
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["studentIdentifier"],
        message:
          "A student id, student email, or student identifier is required to add a classroom student.",
      })
    }

    if (!fieldsMatch(value.status, value.membershipStatus)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["membershipStatus"],
        message: "Membership status must match status when both are provided.",
      })
    }
  })
export type CreateClassroomRosterMemberRequest = z.infer<
  typeof createClassroomRosterMemberRequestSchema
>

export const addClassroomStudentRequestSchema = createClassroomRosterMemberRequestSchema
export type AddClassroomStudentRequest = z.infer<typeof addClassroomStudentRequestSchema>

export const updateClassroomRosterMemberRequestSchema = z
  .object({
    status: enrollmentStatusSchema.optional(),
    membershipStatus: enrollmentStatusSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.status === undefined && value.membershipStatus === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["membershipStatus"],
        message: "A classroom-student membership status is required.",
      })
    }

    if (!fieldsMatch(value.status, value.membershipStatus)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["membershipStatus"],
        message: "Membership status must match status when both are provided.",
      })
    }
  })
export type UpdateClassroomRosterMemberRequest = z.infer<
  typeof updateClassroomRosterMemberRequestSchema
>

export const updateClassroomStudentRequestSchema = updateClassroomRosterMemberRequestSchema
export type UpdateClassroomStudentRequest = z.infer<typeof updateClassroomStudentRequestSchema>

export const classroomRosterMemberParamsSchema = classroomParamsSchema.extend({
  enrollmentId: z.string().min(1),
})
export type ClassroomRosterMemberParams = z.infer<typeof classroomRosterMemberParamsSchema>

export const classroomRosterResponseSchema = z.array(classroomRosterMemberSummarySchema)
export type ClassroomRosterResponse = z.infer<typeof classroomRosterResponseSchema>

export const classroomStudentsResponseSchema = classroomRosterResponseSchema
export type ClassroomStudentsResponse = z.infer<typeof classroomStudentsResponseSchema>

export const announcementSummarySchema = z.object({
  id: z.string().min(1),
  courseOfferingId: z.string().min(1),
  classroomId: z.string().min(1).optional(),
  authorUserId: z.string().min(1),
  authorDisplayName: z.string().min(1),
  postType: announcementPostTypeSchema,
  visibility: announcementVisibilitySchema,
  title: z.string().nullable(),
  body: z.string().min(1),
  shouldNotify: z.boolean(),
  createdAt: isoDateTimeSchema,
  editedAt: isoDateTimeSchema.nullable(),
})
export type AnnouncementSummary = z.infer<typeof announcementSummarySchema>

export const announcementListQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
})
export type AnnouncementListQuery = z.infer<typeof announcementListQuerySchema>

export const createAnnouncementRequestSchema = z.object({
  postType: announcementPostTypeSchema.optional(),
  visibility: announcementVisibilitySchema.optional(),
  title: z.string().trim().min(1).max(140).nullable().optional(),
  body: z.string().trim().min(1).max(2000),
  shouldNotify: z.boolean().optional(),
})
export type CreateAnnouncementRequest = z.infer<typeof createAnnouncementRequestSchema>

export const announcementsResponseSchema = z.array(announcementSummarySchema)
export type AnnouncementsResponse = z.infer<typeof announcementsResponseSchema>

export const rosterImportRowInputSchema = z
  .object({
    studentEmail: z.string().email().optional(),
    studentRollNumber: z.string().trim().min(1).max(64).optional(),
    parsedName: z.string().trim().min(1).max(140).optional(),
  })
  .refine((value) => value.studentEmail !== undefined || value.studentRollNumber !== undefined, {
    message: "Each roster import row requires a student email or roll number.",
    path: ["studentEmail"],
  })
export type RosterImportRowInput = z.infer<typeof rosterImportRowInputSchema>

export const createRosterImportJobRequestSchema = z.object({
  sourceFileName: z.string().trim().min(1).max(160),
  sourceFileKey: z.string().trim().min(1).max(255).optional(),
  rows: z.array(rosterImportRowInputSchema).min(1).max(1000),
})
export type CreateRosterImportJobRequest = z.infer<typeof createRosterImportJobRequestSchema>

export const rosterImportJobSummarySchema = z.object({
  id: z.string().min(1),
  courseOfferingId: z.string().min(1),
  classroomId: z.string().min(1).optional(),
  requestedByUserId: z.string().min(1),
  sourceFileKey: z.string().min(1),
  sourceFileName: z.string().min(1),
  status: rosterImportStatusSchema,
  totalRows: z.number().int().nonnegative(),
  validRows: z.number().int().nonnegative(),
  invalidRows: z.number().int().nonnegative(),
  appliedRows: z.number().int().nonnegative(),
  startedAt: isoDateTimeSchema.nullable(),
  completedAt: isoDateTimeSchema.nullable(),
  reviewedAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
})
export type RosterImportJobSummary = z.infer<typeof rosterImportJobSummarySchema>

export const rosterImportRowSummarySchema = z.object({
  id: z.string().min(1),
  jobId: z.string().min(1),
  rowNumber: z.number().int().positive(),
  studentEmail: z.string().email().nullable(),
  studentRollNumber: z.string().nullable(),
  parsedName: z.string().nullable(),
  status: rosterImportRowStatusSchema,
  errorMessage: z.string().nullable(),
  resolvedStudentId: z.string().nullable(),
})
export type RosterImportRowSummary = z.infer<typeof rosterImportRowSummarySchema>

export const rosterImportJobDetailSchema = rosterImportJobSummarySchema.extend({
  rows: z.array(rosterImportRowSummarySchema),
})
export type RosterImportJobDetail = z.infer<typeof rosterImportJobDetailSchema>

export const rosterImportJobListQuerySchema = z.object({
  status: rosterImportStatusSchema.optional(),
})
export type RosterImportJobListQuery = z.infer<typeof rosterImportJobListQuerySchema>

export const rosterImportJobsResponseSchema = z.array(rosterImportJobSummarySchema)
export type RosterImportJobsResponse = z.infer<typeof rosterImportJobsResponseSchema>

export const rosterImportJobParamsSchema = classroomParamsSchema.extend({
  jobId: z.string().min(1),
})
export type RosterImportJobParams = z.infer<typeof rosterImportJobParamsSchema>
