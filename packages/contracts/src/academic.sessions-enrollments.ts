import { z } from "zod"

import {
  academicScopeSchema,
  enrollmentSourceSchema,
  enrollmentStatusSchema,
  lectureStatusSchema,
} from "./academic.core"
import { isoDateTimeSchema } from "./academic.internal"

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
  createdAt: isoDateTimeSchema,
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

export const classroomLectureParamsSchema = z.object({
  classroomId: z.string().min(1),
  lectureId: z.string().min(1),
})
export type ClassroomLectureParams = z.infer<typeof classroomLectureParamsSchema>

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
