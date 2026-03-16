import { z } from "zod"

import { enrollmentSummarySchema, teacherAssignmentSummarySchema } from "./academic"
import { authenticatedUserSchema } from "./auth"

export const authMeResponseSchema = z.object({
  user: authenticatedUserSchema,
  assignments: z.array(teacherAssignmentSummarySchema),
  enrollments: z.array(enrollmentSummarySchema),
})
export type AuthMeResponse = z.infer<typeof authMeResponseSchema>
