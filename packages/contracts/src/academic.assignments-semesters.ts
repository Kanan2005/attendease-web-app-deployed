import { z } from "zod"

import {
  academicScopeSchema,
  courseOfferingStatusSchema,
  semesterStatusSchema,
  teacherAssignmentStatusSchema,
} from "./academic.core"
import { isoDateTimeSchema } from "./academic.internal"

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
