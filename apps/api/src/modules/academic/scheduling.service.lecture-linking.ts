import type { LectureStatus } from "@attendease/contracts"
import type { PrismaTransactionClient } from "@attendease/db"
import { BadRequestException, NotFoundException } from "@nestjs/common"

import { minutesToUtcDateTime, toUtcDateOnly } from "./academic.helpers.js"
import { ensureLectureForExceptionInTransaction } from "./scheduling.service.exception-operations.js"
import type { LinkedLectureResult } from "./scheduling.service.types.js"

export async function ensureLectureLinkForAttendanceSession(
  transaction: PrismaTransactionClient,
  input: {
    classroomId: string
    actorUserId: string
    lectureDate: Date | string
    scheduleSlotId?: string
    scheduleExceptionId?: string
    title?: string
    status?: LectureStatus
  },
): Promise<LinkedLectureResult> {
  const lectureDate =
    typeof input.lectureDate === "string"
      ? toUtcDateOnly(new Date(input.lectureDate))
      : toUtcDateOnly(input.lectureDate)

  if (input.scheduleExceptionId) {
    const exception = await transaction.courseScheduleException.findFirst({
      where: {
        id: input.scheduleExceptionId,
        courseOfferingId: input.classroomId,
      },
    })

    if (!exception) {
      throw new NotFoundException("Schedule exception not found for lecture linkage.")
    }

    if (exception.exceptionType === "CANCELLED") {
      throw new BadRequestException("Attendance cannot link to a cancelled lecture occurrence.")
    }

    const lecture = await ensureLectureForExceptionInTransaction(
      transaction,
      input.classroomId,
      {
        ...exception,
        effectiveDate: lectureDate,
      },
      input.actorUserId,
      input.status ?? "OPEN_FOR_ATTENDANCE",
      input.title,
    )

    return {
      lectureId: lecture.id,
      created: lecture.created,
      matchedBy: "EXCEPTION",
    }
  }

  if (input.scheduleSlotId) {
    const scheduleSlot = await transaction.courseScheduleSlot.findFirst({
      where: {
        id: input.scheduleSlotId,
        courseOfferingId: input.classroomId,
      },
    })

    if (!scheduleSlot) {
      throw new NotFoundException("Schedule slot not found for lecture linkage.")
    }

    const exception = await transaction.courseScheduleException.findFirst({
      where: {
        courseOfferingId: input.classroomId,
        scheduleSlotId: scheduleSlot.id,
        effectiveDate: lectureDate,
      },
    })

    if (exception) {
      if (exception.exceptionType === "CANCELLED") {
        throw new BadRequestException("Attendance cannot link to a cancelled lecture occurrence.")
      }

      const lecture = await ensureLectureForExceptionInTransaction(
        transaction,
        input.classroomId,
        exception,
        input.actorUserId,
        input.status ?? "OPEN_FOR_ATTENDANCE",
        input.title,
      )

      return {
        lectureId: lecture.id,
        created: lecture.created,
        matchedBy: "EXCEPTION",
      }
    }

    const existingLecture = await transaction.lecture.findFirst({
      where: {
        courseOfferingId: input.classroomId,
        scheduleSlotId: scheduleSlot.id,
        scheduleExceptionId: null,
        lectureDate,
      },
    })

    if (existingLecture) {
      return {
        lectureId: existingLecture.id,
        created: false,
        matchedBy: "SLOT",
      }
    }

    const createdLecture = await transaction.lecture.create({
      data: {
        courseOfferingId: input.classroomId,
        scheduleSlotId: scheduleSlot.id,
        createdByUserId: input.actorUserId,
        ...(input.title ? { title: input.title.trim() } : {}),
        lectureDate,
        plannedStartAt: minutesToUtcDateTime(lectureDate, scheduleSlot.startMinutes),
        plannedEndAt: minutesToUtcDateTime(lectureDate, scheduleSlot.endMinutes),
        status: input.status ?? "OPEN_FOR_ATTENDANCE",
      },
    })

    return {
      lectureId: createdLecture.id,
      created: true,
      matchedBy: "SLOT",
    }
  }

  const oneOffException = await transaction.courseScheduleException.findFirst({
    where: {
      courseOfferingId: input.classroomId,
      scheduleSlotId: null,
      effectiveDate: lectureDate,
      exceptionType: "ONE_OFF",
    },
  })

  if (oneOffException) {
    const lecture = await ensureLectureForExceptionInTransaction(
      transaction,
      input.classroomId,
      oneOffException,
      input.actorUserId,
      input.status ?? "OPEN_FOR_ATTENDANCE",
      input.title,
    )

    return {
      lectureId: lecture.id,
      created: lecture.created,
      matchedBy: "EXCEPTION",
    }
  }

  const existingAdHocLecture = await transaction.lecture.findFirst({
    where: {
      courseOfferingId: input.classroomId,
      lectureDate,
    },
    orderBy: {
      createdAt: "asc",
    },
  })

  if (existingAdHocLecture) {
    return {
      lectureId: existingAdHocLecture.id,
      created: false,
      matchedBy: "AD_HOC",
    }
  }

  const createdLecture = await transaction.lecture.create({
    data: {
      courseOfferingId: input.classroomId,
      createdByUserId: input.actorUserId,
      title: input.title?.trim() ?? "Attendance Session",
      lectureDate,
      status: input.status ?? "OPEN_FOR_ATTENDANCE",
    },
  })

  return {
    lectureId: createdLecture.id,
    created: true,
    matchedBy: "AD_HOC",
  }
}
