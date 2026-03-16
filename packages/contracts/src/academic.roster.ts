import { z } from "zod"

import { classroomParamsSchema } from "./academic.classrooms"
import {
  announcementPostTypeSchema,
  announcementVisibilitySchema,
  enrollmentStatusSchema,
  rosterImportRowStatusSchema,
  rosterImportStatusSchema,
} from "./academic.core"
import { fieldsMatch, isoDateTimeSchema } from "./academic.internal"
import { enrollmentSummarySchema } from "./academic.sessions-enrollments"
import { userStatusSchema } from "./auth"

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
