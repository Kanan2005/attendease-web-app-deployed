import {
  type ClassroomSchedule,
  type CreateScheduleExceptionRequest,
  type CreateScheduleSlotRequest,
  type LectureStatus,
  type SaveAndNotifyScheduleRequest,
  type ScheduleExceptionSummary,
  type ScheduleSlotSummary,
  type UpdateScheduleExceptionRequest,
  type UpdateScheduleSlotRequest,
  classroomScheduleSchema,
  scheduleExceptionSummarySchema,
  scheduleSlotSummarySchema,
} from "@attendease/contracts"
import { type PrismaTransactionClient, queueOutboxEvent, runInTransaction } from "@attendease/db"
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common"

import { DatabaseService } from "../../database/database.service.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import {
  isUniqueConstraintError,
  minutesToUtcDateTime,
  rangesOverlap,
  toUtcDateOnly,
} from "./academic.helpers.js"
import { ClassroomsService } from "./classrooms.service.js"

type ScheduleQueryClient = DatabaseService["prisma"] | PrismaTransactionClient

type LinkedLectureResult = {
  lectureId: string
  created: boolean
  matchedBy: "EXCEPTION" | "SLOT" | "AD_HOC"
}

@Injectable()
export class SchedulingService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ClassroomsService) private readonly classroomsService: ClassroomsService,
  ) {}

  async getSchedule(auth: AuthRequestContext, classroomId: string): Promise<ClassroomSchedule> {
    await this.requireEditableScheduleClassroom(auth, classroomId, false)
    return this.loadSchedule(this.database.prisma, classroomId)
  }

  async createWeeklySlot(
    auth: AuthRequestContext,
    classroomId: string,
    request: CreateScheduleSlotRequest,
  ): Promise<ScheduleSlotSummary> {
    await this.requireEditableScheduleClassroom(auth, classroomId)

    try {
      const slot = await runInTransaction(this.database.prisma, async (transaction) => {
        const createdSlot = await this.createWeeklySlotInTransaction(
          transaction,
          classroomId,
          request,
        )

        await queueOutboxEvent(transaction, {
          topic: "schedule.slot.created",
          aggregateType: "course_offering",
          aggregateId: classroomId,
          payload: {
            classroomId,
            actorUserId: auth.userId,
            slotId: createdSlot.id,
          },
        })

        return createdSlot
      })

      return this.toScheduleSlotSummary(slot)
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException("A weekly slot with that recurrence already exists.")
      }

      throw error
    }
  }

  async updateWeeklySlot(
    auth: AuthRequestContext,
    classroomId: string,
    slotId: string,
    request: UpdateScheduleSlotRequest,
  ): Promise<ScheduleSlotSummary> {
    await this.requireEditableScheduleClassroom(auth, classroomId)

    try {
      const slot = await runInTransaction(this.database.prisma, async (transaction) => {
        const updatedSlot = await this.updateWeeklySlotInTransaction(
          transaction,
          classroomId,
          slotId,
          request,
        )

        await queueOutboxEvent(transaction, {
          topic: "schedule.slot.updated",
          aggregateType: "course_offering",
          aggregateId: classroomId,
          payload: {
            classroomId,
            actorUserId: auth.userId,
            slotId: updatedSlot.id,
          },
        })

        return updatedSlot
      })

      return this.toScheduleSlotSummary(slot)
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException("A weekly slot with that recurrence already exists.")
      }

      throw error
    }
  }

  async createScheduleException(
    auth: AuthRequestContext,
    classroomId: string,
    request: CreateScheduleExceptionRequest,
  ): Promise<ScheduleExceptionSummary> {
    const classroom = await this.requireEditableScheduleClassroom(auth, classroomId)

    try {
      const exception = await runInTransaction(this.database.prisma, async (transaction) => {
        const createdException = await this.createScheduleExceptionInTransaction(
          transaction,
          classroom,
          classroomId,
          request,
          auth.userId,
        )

        await queueOutboxEvent(transaction, {
          topic: "schedule.exception.created",
          aggregateType: "course_offering",
          aggregateId: classroomId,
          payload: {
            classroomId,
            actorUserId: auth.userId,
            exceptionId: createdException.id,
          },
        })

        return createdException
      })

      return this.toScheduleExceptionSummary(exception)
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          "A schedule exception already exists for that weekly slot and date.",
        )
      }

      throw error
    }
  }

  async updateScheduleException(
    auth: AuthRequestContext,
    classroomId: string,
    exceptionId: string,
    request: UpdateScheduleExceptionRequest,
  ): Promise<ScheduleExceptionSummary> {
    const classroom = await this.requireEditableScheduleClassroom(auth, classroomId)

    try {
      const exception = await runInTransaction(this.database.prisma, async (transaction) => {
        const updatedException = await this.updateScheduleExceptionInTransaction(
          transaction,
          classroom,
          classroomId,
          exceptionId,
          request,
          auth.userId,
        )

        await queueOutboxEvent(transaction, {
          topic: "schedule.exception.updated",
          aggregateType: "course_offering",
          aggregateId: classroomId,
          payload: {
            classroomId,
            actorUserId: auth.userId,
            exceptionId: updatedException.id,
          },
        })

        return updatedException
      })

      return this.toScheduleExceptionSummary(exception)
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          "A schedule exception already exists for that weekly slot and date.",
        )
      }

      throw error
    }
  }

  async saveAndNotify(
    auth: AuthRequestContext,
    classroomId: string,
    request: SaveAndNotifyScheduleRequest,
  ): Promise<ClassroomSchedule> {
    const classroom = await this.requireEditableScheduleClassroom(auth, classroomId)

    try {
      return runInTransaction(this.database.prisma, async (transaction) => {
        const changedSlotIds: string[] = []
        const changedExceptionIds: string[] = []
        const linkedLectureIds: string[] = []

        for (const slotRequest of request.weeklySlotCreates ?? []) {
          const slot = await this.createWeeklySlotInTransaction(
            transaction,
            classroomId,
            slotRequest,
          )
          changedSlotIds.push(slot.id)
        }

        for (const slotUpdate of request.weeklySlotUpdates ?? []) {
          const slot = await this.updateWeeklySlotInTransaction(
            transaction,
            classroomId,
            slotUpdate.slotId,
            slotUpdate,
          )
          changedSlotIds.push(slot.id)
        }

        for (const exceptionRequest of request.exceptionCreates ?? []) {
          const exception = await this.createScheduleExceptionInTransaction(
            transaction,
            classroom,
            classroomId,
            exceptionRequest,
            auth.userId,
          )
          changedExceptionIds.push(exception.id)

          const linkedLecture = await transaction.lecture.findFirst({
            where: {
              scheduleExceptionId: exception.id,
            },
            select: {
              id: true,
            },
          })

          if (linkedLecture) {
            linkedLectureIds.push(linkedLecture.id)
          }
        }

        for (const exceptionUpdate of request.exceptionUpdates ?? []) {
          const exception = await this.updateScheduleExceptionInTransaction(
            transaction,
            classroom,
            classroomId,
            exceptionUpdate.exceptionId,
            exceptionUpdate,
            auth.userId,
          )
          changedExceptionIds.push(exception.id)

          const linkedLecture = await transaction.lecture.findFirst({
            where: {
              scheduleExceptionId: exception.id,
            },
            select: {
              id: true,
            },
          })

          if (linkedLecture) {
            linkedLectureIds.push(linkedLecture.id)
          }
        }

        await queueOutboxEvent(transaction, {
          topic: "schedule.changed",
          aggregateType: "course_offering",
          aggregateId: classroomId,
          payload: {
            classroomId,
            actorUserId: auth.userId,
            note: request.note ?? null,
            slotIds: [...new Set(changedSlotIds)],
            exceptionIds: [...new Set(changedExceptionIds)],
            linkedLectureIds: [...new Set(linkedLectureIds)],
          },
        })

        return this.loadSchedule(transaction, classroomId)
      })
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          "The schedule changes conflict with an existing recurring slot or exception.",
        )
      }

      throw error
    }
  }

  async ensureLectureLinkForAttendanceSession(input: {
    classroomId: string
    actorUserId: string
    lectureDate: Date | string
    scheduleSlotId?: string
    scheduleExceptionId?: string
    title?: string
    status?: LectureStatus
  }): Promise<LinkedLectureResult> {
    return runInTransaction(this.database.prisma, async (transaction) => {
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

        const lecture = await this.ensureLectureForExceptionInTransaction(
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
            throw new BadRequestException(
              "Attendance cannot link to a cancelled lecture occurrence.",
            )
          }

          const lecture = await this.ensureLectureForExceptionInTransaction(
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
        const lecture = await this.ensureLectureForExceptionInTransaction(
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
    })
  }

  private async requireEditableScheduleClassroom(
    auth: AuthRequestContext,
    classroomId: string,
    requireEditable = true,
  ) {
    const classroom = await this.classroomsService.requireAccessibleClassroom(auth, classroomId)

    if (!requireEditable) {
      return classroom
    }

    if (auth.activeRole !== "TEACHER" && auth.activeRole !== "ADMIN") {
      throw new ForbiddenException("Only teachers and admins can manage classroom schedules.")
    }

    if (classroom.status === "COMPLETED" || classroom.status === "ARCHIVED") {
      throw new BadRequestException(
        "Schedules cannot be edited for completed or archived classrooms.",
      )
    }

    if (classroom.semester.status === "CLOSED" || classroom.semester.status === "ARCHIVED") {
      throw new BadRequestException(
        "Schedules cannot be edited inside a closed or archived semester.",
      )
    }

    return classroom
  }

  private async loadSchedule(
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
      scheduleSlots: scheduleSlots.map((slot) => this.toScheduleSlotSummary(slot)),
      scheduleExceptions: scheduleExceptions.map((exception) =>
        this.toScheduleExceptionSummary(exception),
      ),
    })
  }

  private async createWeeklySlotInTransaction(
    transaction: PrismaTransactionClient,
    classroomId: string,
    request: CreateScheduleSlotRequest,
  ) {
    await this.assertNoOverlappingWeeklySlot(
      transaction,
      classroomId,
      request.weekday,
      request.startMinutes,
      request.endMinutes,
    )

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

  private async updateWeeklySlotInTransaction(
    transaction: PrismaTransactionClient,
    classroomId: string,
    slotId: string,
    request: UpdateScheduleSlotRequest,
  ) {
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
      await this.assertNoOverlappingWeeklySlot(
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

  private async createScheduleExceptionInTransaction(
    transaction: PrismaTransactionClient,
    classroom: Awaited<ReturnType<ClassroomsService["requireAccessibleClassroom"]>>,
    classroomId: string,
    request: CreateScheduleExceptionRequest,
    actorUserId: string,
  ) {
    const effectiveDate = toUtcDateOnly(new Date(request.effectiveDate))
    this.assertEffectiveDateInsideSemester(classroom, effectiveDate)

    const scheduleSlot = await this.resolveScheduleSlot(
      transaction,
      classroomId,
      request.scheduleSlotId,
    )
    this.assertScheduleExceptionInput({
      exceptionType: request.exceptionType,
      effectiveDate,
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

    await this.ensureLectureForExceptionInTransaction(
      transaction,
      classroomId,
      createdException,
      actorUserId,
      createdException.exceptionType === "CANCELLED" ? "CANCELLED" : "PLANNED",
    )

    return createdException
  }

  private async updateScheduleExceptionInTransaction(
    transaction: PrismaTransactionClient,
    classroom: Awaited<ReturnType<ClassroomsService["requireAccessibleClassroom"]>>,
    classroomId: string,
    exceptionId: string,
    request: UpdateScheduleExceptionRequest,
    actorUserId: string,
  ) {
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
    this.assertEffectiveDateInsideSemester(classroom, nextEffectiveDate)

    const nextScheduleSlotId =
      request.scheduleSlotId === undefined
        ? existingException.scheduleSlotId
        : request.scheduleSlotId
    const scheduleSlot = await this.resolveScheduleSlot(
      transaction,
      classroomId,
      nextScheduleSlotId,
    )
    const nextExceptionType = request.exceptionType ?? existingException.exceptionType
    const nextStartMinutes =
      request.startMinutes === undefined ? existingException.startMinutes : request.startMinutes
    const nextEndMinutes =
      request.endMinutes === undefined ? existingException.endMinutes : request.endMinutes

    this.assertScheduleExceptionInput({
      exceptionType: nextExceptionType,
      effectiveDate: nextEffectiveDate,
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

    await this.ensureLectureForExceptionInTransaction(
      transaction,
      classroomId,
      updatedException,
      actorUserId,
      updatedException.exceptionType === "CANCELLED" ? "CANCELLED" : "PLANNED",
    )

    return updatedException
  }

  private async assertNoOverlappingWeeklySlot(
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

  private async resolveScheduleSlot(
    transaction: PrismaTransactionClient,
    classroomId: string,
    scheduleSlotId: string | null | undefined,
  ) {
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

  private assertEffectiveDateInsideSemester(
    classroom: Awaited<ReturnType<ClassroomsService["requireAccessibleClassroom"]>>,
    effectiveDate: Date,
  ) {
    if (
      effectiveDate < classroom.semester.startDate ||
      effectiveDate > classroom.semester.endDate
    ) {
      throw new BadRequestException(
        "Schedule changes must fall inside the classroom semester window.",
      )
    }
  }

  private assertScheduleExceptionInput(input: {
    exceptionType: "CANCELLED" | "RESCHEDULED" | "ONE_OFF"
    effectiveDate: Date
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

  private async ensureLectureForExceptionInTransaction(
    transaction: PrismaTransactionClient,
    classroomId: string,
    exception: {
      id: string
      courseOfferingId: string
      scheduleSlotId: string | null
      exceptionType: "CANCELLED" | "RESCHEDULED" | "ONE_OFF"
      effectiveDate: Date
      startMinutes: number | null
      endMinutes: number | null
    },
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

  private toScheduleSlotSummary(input: {
    id: string
    courseOfferingId: string
    weekday: number
    startMinutes: number
    endMinutes: number
    locationLabel: string | null
    status: "ACTIVE" | "ARCHIVED"
  }): ScheduleSlotSummary {
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

  private toScheduleExceptionSummary(input: {
    id: string
    courseOfferingId: string
    scheduleSlotId: string | null
    exceptionType: "CANCELLED" | "RESCHEDULED" | "ONE_OFF"
    effectiveDate: Date
    startMinutes: number | null
    endMinutes: number | null
    locationLabel: string | null
    reason: string | null
  }): ScheduleExceptionSummary {
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
}
