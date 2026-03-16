import type {
  ClassroomSchedule,
  CreateScheduleExceptionRequest,
  CreateScheduleSlotRequest,
  LectureStatus,
  SaveAndNotifyScheduleRequest,
  ScheduleExceptionSummary,
  ScheduleSlotSummary,
  UpdateScheduleExceptionRequest,
  UpdateScheduleSlotRequest,
} from "@attendease/contracts"
import { queueOutboxEvent, runInTransaction } from "@attendease/db"
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common"

import { DatabaseService } from "../../database/database.service.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import { isUniqueConstraintError } from "./academic.helpers.js"
import { ClassroomsService } from "./classrooms.service.js"
import {
  createScheduleExceptionInTransaction,
  updateScheduleExceptionInTransaction,
} from "./scheduling.service.exception-operations.js"
import { ensureLectureLinkForAttendanceSession } from "./scheduling.service.lecture-linking.js"
import {
  loadSchedule,
  toScheduleExceptionSummary,
  toScheduleSlotSummary,
} from "./scheduling.service.serialization.js"
import {
  createWeeklySlotInTransaction,
  updateWeeklySlotInTransaction,
} from "./scheduling.service.slot-operations.js"
import type { LinkedLectureResult } from "./scheduling.service.types.js"

@Injectable()
export class SchedulingService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ClassroomsService) private readonly classroomsService: ClassroomsService,
  ) {}

  async getSchedule(auth: AuthRequestContext, classroomId: string): Promise<ClassroomSchedule> {
    await this.requireEditableScheduleClassroom(auth, classroomId, false)
    return loadSchedule(this.database.prisma, classroomId)
  }

  async createWeeklySlot(
    auth: AuthRequestContext,
    classroomId: string,
    request: CreateScheduleSlotRequest,
  ): Promise<ScheduleSlotSummary> {
    await this.requireEditableScheduleClassroom(auth, classroomId)

    try {
      const slot = await runInTransaction(this.database.prisma, async (transaction) => {
        const createdSlot = await createWeeklySlotInTransaction(transaction, classroomId, request)

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

      return toScheduleSlotSummary(slot)
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
        const updatedSlot = await updateWeeklySlotInTransaction(
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

      return toScheduleSlotSummary(slot)
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
        const createdException = await createScheduleExceptionInTransaction(
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

      return toScheduleExceptionSummary(exception)
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
        const updatedException = await updateScheduleExceptionInTransaction(
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

      return toScheduleExceptionSummary(exception)
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
          const slot = await createWeeklySlotInTransaction(transaction, classroomId, slotRequest)
          changedSlotIds.push(slot.id)
        }

        for (const slotUpdate of request.weeklySlotUpdates ?? []) {
          const slot = await updateWeeklySlotInTransaction(
            transaction,
            classroomId,
            slotUpdate.slotId,
            slotUpdate,
          )
          changedSlotIds.push(slot.id)
        }

        for (const exceptionRequest of request.exceptionCreates ?? []) {
          const exception = await createScheduleExceptionInTransaction(
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
          const exception = await updateScheduleExceptionInTransaction(
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

        return loadSchedule(transaction, classroomId)
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
      return ensureLectureLinkForAttendanceSession(transaction, input)
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
}
