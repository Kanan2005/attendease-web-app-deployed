import {
  type CreateLectureRequest,
  type LectureListQuery,
  type LectureSummary,
  lectureSummarySchema,
} from "@attendease/contracts"
import { queueOutboxEvent, runInTransaction } from "@attendease/db"
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
import { isUniqueConstraintError, minutesToUtcDateTime, toUtcDateOnly } from "./academic.helpers.js"
import { ClassroomsService } from "./classrooms.service.js"

@Injectable()
export class LecturesService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ClassroomsService) private readonly classroomsService: ClassroomsService,
  ) {}

  async listLectures(
    auth: AuthRequestContext,
    classroomId: string,
    filters: LectureListQuery = {},
  ): Promise<LectureSummary[]> {
    await this.classroomsService.requireAccessibleClassroom(auth, classroomId)

    const lectures = await this.database.prisma.lecture.findMany({
      where: {
        courseOfferingId: classroomId,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.fromDate ? { lectureDate: { gte: new Date(filters.fromDate) } } : {}),
        ...(filters.toDate
          ? {
              lectureDate: {
                ...(filters.fromDate ? { gte: new Date(filters.fromDate) } : {}),
                lte: new Date(filters.toDate),
              },
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }],
    })

    return lectures.map((lecture) => this.toLectureSummary(lecture))
  }

  async createLecture(
    auth: AuthRequestContext,
    classroomId: string,
    request: CreateLectureRequest,
  ): Promise<LectureSummary> {
    const classroom = await this.classroomsService.requireAccessibleClassroom(auth, classroomId)

    if (auth.activeRole !== "TEACHER" && auth.activeRole !== "ADMIN") {
      throw new ForbiddenException("Only teachers and admins can create lectures.")
    }

    if (classroom.status === "COMPLETED" || classroom.status === "ARCHIVED") {
      throw new BadRequestException(
        "Lectures cannot be created for completed or archived classrooms.",
      )
    }

    if (classroom.semester.status === "CLOSED" || classroom.semester.status === "ARCHIVED") {
      throw new BadRequestException(
        "Lectures cannot be created inside a closed or archived semester.",
      )
    }

    const lectureDate = toUtcDateOnly(new Date(request.lectureDate))
    if (lectureDate < classroom.semester.startDate || lectureDate > classroom.semester.endDate) {
      throw new BadRequestException("Lecture date must fall inside the classroom semester window.")
    }

    const [scheduleSlot, scheduleException] = await Promise.all([
      request.scheduleSlotId
        ? this.database.prisma.courseScheduleSlot.findFirst({
            where: {
              id: request.scheduleSlotId,
              courseOfferingId: classroomId,
            },
          })
        : Promise.resolve(null),
      request.scheduleExceptionId
        ? this.database.prisma.courseScheduleException.findFirst({
            where: {
              id: request.scheduleExceptionId,
              courseOfferingId: classroomId,
            },
          })
        : Promise.resolve(null),
    ])

    if (request.scheduleSlotId && !scheduleSlot) {
      throw new BadRequestException("The selected schedule slot does not belong to this classroom.")
    }

    if (request.scheduleExceptionId && !scheduleException) {
      throw new BadRequestException(
        "The selected schedule exception does not belong to this classroom.",
      )
    }

    if (scheduleException?.exceptionType === "CANCELLED") {
      throw new BadRequestException("Cancelled schedule exceptions cannot open a lecture.")
    }

    if (
      scheduleException?.scheduleSlotId &&
      request.scheduleSlotId &&
      scheduleException.scheduleSlotId !== request.scheduleSlotId
    ) {
      throw new BadRequestException(
        "The selected schedule exception does not belong to the selected schedule slot.",
      )
    }

    const plannedStartAt =
      request.plannedStartAt !== undefined
        ? new Date(request.plannedStartAt)
        : scheduleException?.startMinutes !== null && scheduleException?.startMinutes !== undefined
          ? minutesToUtcDateTime(lectureDate, scheduleException.startMinutes)
          : scheduleSlot
            ? minutesToUtcDateTime(lectureDate, scheduleSlot.startMinutes)
            : null
    const plannedEndAt =
      request.plannedEndAt !== undefined
        ? new Date(request.plannedEndAt)
        : scheduleException?.endMinutes !== null && scheduleException?.endMinutes !== undefined
          ? minutesToUtcDateTime(lectureDate, scheduleException.endMinutes)
          : scheduleSlot
            ? minutesToUtcDateTime(lectureDate, scheduleSlot.endMinutes)
            : null

    try {
      const lecture = await runInTransaction(this.database.prisma, async (transaction) => {
        const createdLecture = await transaction.lecture.create({
          data: {
            courseOfferingId: classroomId,
            ...(request.scheduleSlotId ? { scheduleSlotId: request.scheduleSlotId } : {}),
            ...(request.scheduleExceptionId
              ? { scheduleExceptionId: request.scheduleExceptionId }
              : {}),
            createdByUserId: auth.userId,
            ...(request.title !== undefined ? { title: request.title.trim() } : {}),
            lectureDate,
            ...(plannedStartAt ? { plannedStartAt } : {}),
            ...(plannedEndAt ? { plannedEndAt } : {}),
            status: request.status ?? "PLANNED",
          },
        })

        await queueOutboxEvent(transaction, {
          topic: "lecture.created",
          aggregateType: "lecture",
          aggregateId: createdLecture.id,
          payload: {
            lectureId: createdLecture.id,
            classroomId,
            actorUserId: auth.userId,
          },
        })

        return createdLecture
      })

      return this.toLectureSummary(lecture)
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          "A lecture is already linked to this schedule occurrence for the selected date.",
        )
      }

      throw error
    }
  }

  async deleteLecture(
    auth: AuthRequestContext,
    classroomId: string,
    lectureId: string,
  ): Promise<{ success: true }> {
    await this.classroomsService.requireAccessibleClassroom(auth, classroomId)

    if (auth.activeRole !== "TEACHER" && auth.activeRole !== "ADMIN") {
      throw new ForbiddenException("Only teachers and admins can delete lectures.")
    }

    const lecture = await this.database.prisma.lecture.findFirst({
      where: { id: lectureId, courseOfferingId: classroomId },
      include: { attendanceSessions: { select: { id: true }, take: 1 } },
    })

    if (!lecture) {
      throw new NotFoundException("Lecture not found in this classroom.")
    }

    if (lecture.attendanceSessions.length > 0) {
      throw new BadRequestException(
        "Cannot delete a lecture that has attendance sessions. End or remove the sessions first.",
      )
    }

    await this.database.prisma.lecture.delete({ where: { id: lectureId } })

    return { success: true }
  }

  async getLectureById(lectureId: string) {
    const lecture = await this.database.prisma.lecture.findUnique({
      where: {
        id: lectureId,
      },
    })

    if (!lecture) {
      throw new NotFoundException("Lecture not found.")
    }

    return lecture
  }

  private toLectureSummary(input: {
    id: string
    courseOfferingId: string
    scheduleSlotId: string | null
    scheduleExceptionId: string | null
    createdByUserId: string | null
    title: string | null
    lectureDate: Date
    plannedStartAt: Date | null
    plannedEndAt: Date | null
    actualStartAt: Date | null
    actualEndAt: Date | null
    status: "PLANNED" | "OPEN_FOR_ATTENDANCE" | "COMPLETED" | "CANCELLED"
    createdAt: Date
  }): LectureSummary {
    return lectureSummarySchema.parse({
      id: input.id,
      courseOfferingId: input.courseOfferingId,
      classroomId: input.courseOfferingId,
      scheduleSlotId: input.scheduleSlotId,
      scheduleExceptionId: input.scheduleExceptionId,
      createdByUserId: input.createdByUserId,
      title: input.title,
      lectureDate: input.lectureDate.toISOString(),
      plannedStartAt: input.plannedStartAt?.toISOString() ?? null,
      plannedEndAt: input.plannedEndAt?.toISOString() ?? null,
      actualStartAt: input.actualStartAt?.toISOString() ?? null,
      actualEndAt: input.actualEndAt?.toISOString() ?? null,
      status: input.status,
      createdAt: input.createdAt.toISOString(),
    })
  }
}
