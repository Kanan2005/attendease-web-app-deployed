import { z } from "zod"

import { type AttendanceRecordStatus, attendanceRecordStatusSchema } from "./attendance.core"
import {
  attendanceSessionDetailSchema,
  attendanceSessionStudentsResponseSchema,
} from "./attendance.history"

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
