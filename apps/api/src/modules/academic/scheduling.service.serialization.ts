import {
  type ClassroomSchedule,
  type ScheduleExceptionSummary,
  type ScheduleSlotSummary,
  classroomScheduleSchema,
  scheduleExceptionSummarySchema,
  scheduleSlotSummarySchema,
} from "@attendease/contracts"

import type {
  ScheduleExceptionRecord,
  ScheduleQueryClient,
  ScheduleSlotRecord,
} from "./scheduling.service.types.js"

export async function loadSchedule(
  client: ScheduleQueryClient,
  classroomId: string,
): Promise<ClassroomSchedule> {
  const [scheduleSlots, scheduleExceptions] = await Promise.all([
    client.courseScheduleSlot.findMany({
      where: {
        courseOfferingId: classroomId,
      },
      orderBy: [{ weekday: "asc" }, { startMinutes: "asc" }],
    }),
    client.courseScheduleException.findMany({
      where: {
        courseOfferingId: classroomId,
      },
      orderBy: [{ effectiveDate: "asc" }, { startMinutes: "asc" }],
    }),
  ])

  return classroomScheduleSchema.parse({
    classroomId,
    scheduleSlots: scheduleSlots.map((slot) => toScheduleSlotSummary(slot)),
    scheduleExceptions: scheduleExceptions.map((exception) =>
      toScheduleExceptionSummary(exception),
    ),
  })
}

export function toScheduleSlotSummary(input: ScheduleSlotRecord): ScheduleSlotSummary {
  return scheduleSlotSummarySchema.parse({
    id: input.id,
    courseOfferingId: input.courseOfferingId,
    classroomId: input.courseOfferingId,
    weekday: input.weekday,
    startMinutes: input.startMinutes,
    endMinutes: input.endMinutes,
    locationLabel: input.locationLabel,
    status: input.status,
  })
}

export function toScheduleExceptionSummary(
  input: ScheduleExceptionRecord,
): ScheduleExceptionSummary {
  return scheduleExceptionSummarySchema.parse({
    id: input.id,
    courseOfferingId: input.courseOfferingId,
    classroomId: input.courseOfferingId,
    scheduleSlotId: input.scheduleSlotId,
    exceptionType: input.exceptionType,
    effectiveDate: input.effectiveDate.toISOString(),
    startMinutes: input.startMinutes,
    endMinutes: input.endMinutes,
    locationLabel: input.locationLabel,
    reason: input.reason,
  })
}
