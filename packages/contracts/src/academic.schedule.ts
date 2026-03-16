import { z } from "zod"

import {
  joinCodeStatusSchema,
  scheduleExceptionTypeSchema,
  scheduleSlotStatusSchema,
} from "./academic.core"
import { isoDateTimeSchema, minuteOfDaySchema, weekdaySchema } from "./academic.internal"

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
