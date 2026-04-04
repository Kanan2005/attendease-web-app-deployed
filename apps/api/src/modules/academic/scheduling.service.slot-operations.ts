import type { CreateScheduleSlotRequest, UpdateScheduleSlotRequest } from "@attendease/contracts"
import type { PrismaTransactionClient } from "@attendease/db"
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common"

import { rangesOverlap } from "./academic.helpers.js"
import type { ScheduleSlotRecord } from "./scheduling.service.types.js"

export async function createWeeklySlotInTransaction(
  transaction: PrismaTransactionClient,
  classroomId: string,
  request: CreateScheduleSlotRequest,
): Promise<ScheduleSlotRecord> {
  await assertNoOverlappingWeeklySlot(
    transaction,
    classroomId,
    request.weekday,
    request.startMinutes,
    request.endMinutes,
  )

  // Reactivate an archived slot with the same unique key instead of creating a duplicate
  const archivedSlot = await transaction.courseScheduleSlot.findFirst({
    where: {
      courseOfferingId: classroomId,
      weekday: request.weekday,
      startMinutes: request.startMinutes,
      endMinutes: request.endMinutes,
      status: "ARCHIVED",
    },
  })

  if (archivedSlot) {
    return transaction.courseScheduleSlot.update({
      where: { id: archivedSlot.id },
      data: {
        status: "ACTIVE",
        ...(request.locationLabel !== undefined ? { locationLabel: request.locationLabel } : {}),
      },
    })
  }

  return transaction.courseScheduleSlot.create({
    data: {
      courseOfferingId: classroomId,
      weekday: request.weekday,
      startMinutes: request.startMinutes,
      endMinutes: request.endMinutes,
      ...(request.locationLabel !== undefined ? { locationLabel: request.locationLabel } : {}),
    },
  })
}

export async function updateWeeklySlotInTransaction(
  transaction: PrismaTransactionClient,
  classroomId: string,
  slotId: string,
  request: UpdateScheduleSlotRequest,
): Promise<ScheduleSlotRecord> {
  const existingSlot = await transaction.courseScheduleSlot.findFirst({
    where: {
      id: slotId,
      courseOfferingId: classroomId,
    },
  })

  if (!existingSlot) {
    throw new NotFoundException("Schedule slot not found.")
  }

  const nextWeekday = request.weekday ?? existingSlot.weekday
  const nextStartMinutes = request.startMinutes ?? existingSlot.startMinutes
  const nextEndMinutes = request.endMinutes ?? existingSlot.endMinutes
  const nextStatus = request.status ?? existingSlot.status

  if (nextStartMinutes >= nextEndMinutes) {
    throw new BadRequestException("Schedule slot start time must be before the end time.")
  }

  if (nextStatus === "ACTIVE") {
    await assertNoOverlappingWeeklySlot(
      transaction,
      classroomId,
      nextWeekday,
      nextStartMinutes,
      nextEndMinutes,
      existingSlot.id,
    )
  }

  return transaction.courseScheduleSlot.update({
    where: {
      id: existingSlot.id,
    },
    data: {
      ...(request.weekday !== undefined ? { weekday: request.weekday } : {}),
      ...(request.startMinutes !== undefined ? { startMinutes: request.startMinutes } : {}),
      ...(request.endMinutes !== undefined ? { endMinutes: request.endMinutes } : {}),
      ...(request.locationLabel !== undefined ? { locationLabel: request.locationLabel } : {}),
      ...(request.status !== undefined ? { status: request.status } : {}),
    },
  })
}

async function assertNoOverlappingWeeklySlot(
  transaction: PrismaTransactionClient,
  classroomId: string,
  weekday: number,
  startMinutes: number,
  endMinutes: number,
  excludedSlotId?: string,
) {
  const existingSlots = await transaction.courseScheduleSlot.findMany({
    where: {
      courseOfferingId: classroomId,
      weekday,
      status: "ACTIVE",
      ...(excludedSlotId ? { id: { not: excludedSlotId } } : {}),
    },
    orderBy: {
      startMinutes: "asc",
    },
  })

  const overlappingSlot = existingSlots.find((slot) =>
    rangesOverlap(slot.startMinutes, slot.endMinutes, startMinutes, endMinutes),
  )

  if (overlappingSlot) {
    throw new ConflictException(
      "Weekly schedule slots cannot overlap within the same classroom and weekday.",
    )
  }
}
