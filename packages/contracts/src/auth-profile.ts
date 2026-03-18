import { z } from "zod"

import { enrollmentSummarySchema, teacherAssignmentSummarySchema } from "./academic"
import { authenticatedUserSchema } from "./auth"

export const authMeResponseSchema = z.object({
  user: authenticatedUserSchema,
  assignments: z.array(teacherAssignmentSummarySchema),
  enrollments: z.array(enrollmentSummarySchema),
})
export type AuthMeResponse = z.infer<typeof authMeResponseSchema>

export const updateProfileRequestSchema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  avatarUrl: z.string().url().max(2048).nullish(),
  department: z.string().max(120).nullish(),
  designation: z.string().max(120).nullish(),
  employeeCode: z.string().max(60).nullish(),
  rollNumber: z.string().max(60).nullish(),
  degree: z.string().max(30).nullish(),
  branch: z.string().max(30).nullish(),
})
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>

export const profileResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  department: z.string().nullable(),
  designation: z.string().nullable(),
  employeeCode: z.string().nullable(),
  rollNumber: z.string().nullable(),
  degree: z.string().nullable(),
  branch: z.string().nullable(),
  createdAt: z.string(),
})
export type ProfileResponse = z.infer<typeof profileResponseSchema>
