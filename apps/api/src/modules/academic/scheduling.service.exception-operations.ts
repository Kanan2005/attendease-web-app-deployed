import type {
  CreateScheduleExceptionRequest,
  LectureStatus,
  UpdateScheduleExceptionRequest,
} from "@attendease/contracts"
import type { PrismaTransactionClient } from "@attendease/db"
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common"

import { minutesToUtcDateTime, toUtcDateOnly } from "./academic.helpers.js"
import type {
  EditableScheduleClassroom,
  ScheduleExceptionRecord,
  ScheduleSlotRecord,
} from "./scheduling.service.types.js"

export async function createScheduleExceptionInTransaction(
  transaction: PrismaTransactionClient,
  classroom: EditableScheduleClassroom,
  classroomId: string,
  request: CreateScheduleExceptionRequest,
  actorUserId: string,
): Promise<ScheduleExceptionRecord> {
  const effectiveDate = toUtcDateOnly(new Date(request.effectiveDate))
  assertEffectiveDateInsideSemester(classroom, effectiveDate)

  const scheduleSlot = await resolveScheduleSlot(transaction, classroomId, request.scheduleSlotId)
  assertScheduleExceptionInput({
    exceptionType: request.exceptionType,
    scheduleSlotId: request.scheduleSlotId ?? null,
    startMinutes: request.startMinutes ?? null,
    endMinutes: request.endMinutes ?? null,
    scheduleSlot,
  })

  const existingException = scheduleSlot
    ? await transaction.courseScheduleException.findFirst({
        where: {
          courseOfferingId: classroomId,
          scheduleSlotId: scheduleSlot.id,
          effectiveDate,
        },
      })
    : null

  if (existingException) {
    throw new ConflictException(
      "A schedule exception already exists for that weekly slot on the selected date.",
    )
  }

  const createdException = await transaction.courseScheduleException.create({
    data: {
      courseOfferingId: classroomId,
      ...(scheduleSlot ? { scheduleSlotId: scheduleSlot.id } : {}),
      exceptionType: request.exceptionType,
      effectiveDate,
      ...(request.startMinutes !== undefined ? { startMinutes: request.startMinutes } : {}),
      ...(request.endMinutes !== undefined ? { endMinutes: request.endMinutes } : {}),
      ...(request.locationLabel !== undefined ? { locationLabel: request.locationLabel } : {}),
      ...(request.reason !== undefined ? { reason: request.reason } : {}),
    },
  })

  await ensureLectureForExceptionInTransaction(
    transaction,
    classroomId,
    createdException,
    actorUserId,
    createdException.exceptionType === "CANCELLED" ? "CANCELLED" : "PLANNED",
  )

  return createdException
}

export async function updateScheduleExceptionInTransaction(
  transaction: PrismaTransactionClient,
  classroom: EditableScheduleClassroom,
  classroomId: string,
  exceptionId: string,
  request: UpdateScheduleExceptionRequest,
  actorUserId: string,
): Promise<ScheduleExceptionRecord> {
  const existingException = await transaction.courseScheduleException.findFirst({
    where: {
      id: exceptionId,
      courseOfferingId: classroomId,
    },
  })

  if (!existingException) {
    throw new NotFoundException("Schedule exception not found.")
  }

  const nextEffectiveDate = request.effectiveDate
    ? toUtcDateOnly(new Date(request.effectiveDate))
    : existingException.effectiveDate
  assertEffectiveDateInsideSemester(classroom, nextEffectiveDate)

  const nextScheduleSlotId =
    request.scheduleSlotId === undefined ? existingException.scheduleSlotId : request.scheduleSlotId
  const scheduleSlot = await resolveScheduleSlot(transaction, classroomId, nextScheduleSlotId)
  const nextExceptionType = request.exceptionType ?? existingException.exceptionType
  const nextStartMinutes =
    request.startMinutes === undefined ? existingException.startMinutes : request.startMinutes
  const nextEndMinutes =
    request.endMinutes === undefined ? existingException.endMinutes : request.endMinutes

  assertScheduleExceptionInput({
    exceptionType: nextExceptionType,
    scheduleSlotId: nextScheduleSlotId,
    startMinutes: nextStartMinutes,
    endMinutes: nextEndMinutes,
    scheduleSlot,
  })

  const conflictingException = scheduleSlot
    ? await transaction.courseScheduleException.findFirst({
        where: {
          courseOfferingId: classroomId,
          scheduleSlotId: scheduleSlot.id,
          effectiveDate: nextEffectiveDate,
          id: {
            not: existingException.id,
          },
        },
      })
    : null

  if (conflictingException) {
    throw new ConflictException(
      "A schedule exception already exists for that weekly slot on the selected date.",
    )
  }

  const updatedException = await transaction.courseScheduleException.update({
    where: {
      id: existingException.id,
    },
    data: {
      ...(request.scheduleSlotId !== undefined ? { scheduleSlotId: request.scheduleSlotId } : {}),
      ...(request.exceptionType !== undefined ? { exceptionType: request.exceptionType } : {}),
      ...(request.effectiveDate !== undefined ? { effectiveDate: nextEffectiveDate } : {}),
      ...(request.startMinutes !== undefined ? { startMinutes: request.startMinutes } : {}),
      ...(request.endMinutes !== undefined ? { endMinutes: request.endMinutes } : {}),
      ...(request.locationLabel !== undefined ? { locationLabel: request.locationLabel } : {}),
      ...(request.reason !== undefined ? { reason: request.reason } : {}),
    },
  })

  await ensureLectureForExceptionInTransaction(
    transaction,
    classroomId,
    updatedException,
    actorUserId,
    updatedException.exceptionType === "CANCELLED" ? "CANCELLED" : "PLANNED",
  )

  return updatedException
}

export async function ensureLectureForExceptionInTransaction(
  transaction: PrismaTransactionClient,
  classroomId: string,
  exception: Pick<
    ScheduleExceptionRecord,
    | "id"
    | "courseOfferingId"
    | "scheduleSlotId"
    | "exceptionType"
    | "effectiveDate"
    | "startMinutes"
    | "endMinutes"
  >,
  actorUserId: string,
  status: LectureStatus,
  title?: string,
): Promise<{ id: string; created: boolean }> {
  const existingLecture = await transaction.lecture.findFirst({
    where: {
      scheduleExceptionId: exception.id,
    },
  })

  const scheduleSlot =
    exception.scheduleSlotId !== null
      ? await transaction.courseScheduleSlot.findUnique({
          where: {
            id: exception.scheduleSlotId,
          },
        })
      : null

  const plannedStartAt =
    exception.startMinutes !== null
      ? minutesToUtcDateTime(exception.effectiveDate, exception.startMinutes)
      : scheduleSlot
        ? minutesToUtcDateTime(exception.effectiveDate, scheduleSlot.startMinutes)
        : null
  const plannedEndAt =
    exception.endMinutes !== null
      ? minutesToUtcDateTime(exception.effectiveDate, exception.endMinutes)
      : scheduleSlot
        ? minutesToUtcDateTime(exception.effectiveDate, scheduleSlot.endMinutes)
        : null

  if (existingLecture) {
    const updatedLecture = await transaction.lecture.update({
      where: {
        id: existingLecture.id,
      },
      data: {
        scheduleSlotId: exception.scheduleSlotId,
        ...(title ? { title: title.trim() } : {}),
        lectureDate: exception.effectiveDate,
        plannedStartAt,
        plannedEndAt,
        status,
      },
    })

    return {
      id: updatedLecture.id,
      created: false,
    }
  }

  const createdLecture = await transaction.lecture.create({
    data: {
      courseOfferingId: classroomId,
      ...(exception.scheduleSlotId ? { scheduleSlotId: exception.scheduleSlotId } : {}),
      scheduleExceptionId: exception.id,
      createdByUserId: actorUserId,
      ...(title ? { title: title.trim() } : {}),
      lectureDate: exception.effectiveDate,
      plannedStartAt,
      plannedEndAt,
      status,
    },
  })

  return {
    id: createdLecture.id,
    created: true,
  }
}

async function resolveScheduleSlot(
  transaction: PrismaTransactionClient,
  classroomId: string,
  scheduleSlotId: string | null | undefined,
): Promise<ScheduleSlotRecord | null> {
  if (!scheduleSlotId) {
    return null
  }

  const scheduleSlot = await transaction.courseScheduleSlot.findFirst({
    where: {
      id: scheduleSlotId,
      courseOfferingId: classroomId,
    },
  })

  if (!scheduleSlot) {
    throw new BadRequestException("The selected weekly slot does not belong to this classroom.")
  }

  return scheduleSlot
}

function assertEffectiveDateInsideSemester(
  classroom: EditableScheduleClassroom,
  effectiveDate: Date,
) {
  if (effectiveDate < classroom.semester.startDate || effectiveDate > classroom.semester.endDate) {
    throw new BadRequestException(
      "Schedule changes must fall inside the classroom semester window.",
    )
  }
}

function assertScheduleExceptionInput(input: {
  exceptionType: "CANCELLED" | "RESCHEDULED" | "ONE_OFF"
  scheduleSlotId: string | null
  startMinutes: number | null
  endMinutes: number | null
  scheduleSlot: {
    id: string
    startMinutes: number
    endMinutes: number
  } | null
}) {
  if (input.exceptionType !== "ONE_OFF" && !input.scheduleSlotId) {
    throw new BadRequestException(
      "Cancelled and rescheduled entries must target an existing weekly slot.",
    )
  }

  if (input.exceptionType === "CANCELLED") {
    if (input.startMinutes !== null || input.endMinutes !== null) {
      throw new BadRequestException(
        "Cancelled schedule entries should not override start or end times.",
      )
    }

    return
  }

  if (input.startMinutes === null || input.endMinutes === null) {
    throw new BadRequestException(
      "One-off and rescheduled entries must provide both start and end times.",
    )
  }

  if (input.startMinutes >= input.endMinutes) {
    throw new BadRequestException("Schedule exception start time must be before the end time.")
  }
}
