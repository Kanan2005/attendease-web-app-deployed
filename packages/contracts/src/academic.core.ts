import { z } from "zod"

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
