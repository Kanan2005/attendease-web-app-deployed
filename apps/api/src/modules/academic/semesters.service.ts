import {
  type CreateSemesterRequest,
  type SemesterListQuery,
  type SemesterSummary,
  type UpdateSemesterRequest,
  semesterSummarySchema,
} from "@attendease/contracts"
import { queueOutboxEvent, recordAdministrativeActionTrail, runInTransaction } from "@attendease/db"
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common"

import { DatabaseService } from "../../database/database.service.js"
import { isUniqueConstraintError } from "./academic.helpers.js"

@Injectable()
export class SemestersService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async listSemesters(filters: SemesterListQuery = {}): Promise<SemesterSummary[]> {
    const semesters = await this.database.prisma.semester.findMany({
      where: {
        ...(filters.academicTermId ? { academicTermId: filters.academicTermId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      orderBy: [{ startDate: "desc" }, { code: "asc" }],
    })

    return semesters.map((semester) => this.toSemesterSummary(semester))
  }

  async createSemester(
    adminUserId: string,
    request: CreateSemesterRequest,
  ): Promise<SemesterSummary> {
    this.assertSemesterWindow(
      new Date(request.startDate),
      new Date(request.endDate),
      request.attendanceCutoffDate ? new Date(request.attendanceCutoffDate) : null,
    )

    try {
      const created = await runInTransaction(this.database.prisma, async (transaction) => {
        const semester = await transaction.semester.create({
          data: {
            academicTermId: request.academicTermId,
            code: request.code.trim(),
            title: request.title.trim(),
            ...(request.ordinal !== undefined ? { ordinal: request.ordinal } : {}),
            startDate: new Date(request.startDate),
            endDate: new Date(request.endDate),
            ...(request.attendanceCutoffDate
              ? { attendanceCutoffDate: new Date(request.attendanceCutoffDate) }
              : {}),
          },
        })

        await queueOutboxEvent(transaction, {
          topic: "semester.created",
          aggregateType: "semester",
          aggregateId: semester.id,
          payload: {
            semesterId: semester.id,
            adminUserId,
            status: semester.status,
          },
        })

        return semester
      })

      return this.toSemesterSummary(created)
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException("A semester with that code already exists.")
      }

      throw error
    }
  }

  async updateSemester(
    adminUserId: string,
    semesterId: string,
    request: UpdateSemesterRequest,
  ): Promise<SemesterSummary> {
    const existing = await this.database.prisma.semester.findUnique({
      where: {
        id: semesterId,
      },
    })

    if (!existing) {
      throw new NotFoundException("Semester not found.")
    }

    const nextStartDate = request.startDate ? new Date(request.startDate) : existing.startDate
    const nextEndDate = request.endDate ? new Date(request.endDate) : existing.endDate
    const nextAttendanceCutoffDate =
      request.attendanceCutoffDate === undefined
        ? existing.attendanceCutoffDate
        : request.attendanceCutoffDate === null
          ? null
          : new Date(request.attendanceCutoffDate)

    this.assertSemesterWindow(nextStartDate, nextEndDate, nextAttendanceCutoffDate)

    try {
      const updated = await runInTransaction(this.database.prisma, async (transaction) => {
        const semester = await transaction.semester.update({
          where: {
            id: semesterId,
          },
          data: {
            ...(request.code !== undefined ? { code: request.code.trim() } : {}),
            ...(request.title !== undefined ? { title: request.title.trim() } : {}),
            ...(request.ordinal !== undefined ? { ordinal: request.ordinal } : {}),
            ...(request.startDate !== undefined ? { startDate: nextStartDate } : {}),
            ...(request.endDate !== undefined ? { endDate: nextEndDate } : {}),
            ...(request.attendanceCutoffDate !== undefined
              ? { attendanceCutoffDate: nextAttendanceCutoffDate }
              : {}),
          },
        })

        await queueOutboxEvent(transaction, {
          topic: "semester.updated",
          aggregateType: "semester",
          aggregateId: semester.id,
          payload: {
            semesterId: semester.id,
            adminUserId,
          },
        })

        return semester
      })

      return this.toSemesterSummary(updated)
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException("A semester with that code already exists.")
      }

      throw error
    }
  }

  async activateSemester(adminUserId: string, semesterId: string): Promise<SemesterSummary> {
    const semester = await this.database.prisma.semester.findUnique({
      where: {
        id: semesterId,
      },
    })

    if (!semester) {
      throw new NotFoundException("Semester not found.")
    }

    if (semester.status === "ARCHIVED") {
      throw new BadRequestException("Archived semesters cannot be activated.")
    }

    if (semester.status === "ACTIVE") {
      return this.toSemesterSummary(semester)
    }

    const conflictingSemester = await this.database.prisma.semester.findFirst({
      where: {
        academicTermId: semester.academicTermId,
        status: "ACTIVE",
        id: {
          not: semester.id,
        },
      },
    })

    if (conflictingSemester) {
      throw new ConflictException("Another semester is already active for this academic term.")
    }

    const updated = await runInTransaction(this.database.prisma, async (transaction) => {
      const nextSemester = await transaction.semester.update({
        where: {
          id: semester.id,
        },
        data: {
          status: "ACTIVE",
        },
      })

      await queueOutboxEvent(transaction, {
        topic: "semester.activated",
        aggregateType: "semester",
        aggregateId: nextSemester.id,
        payload: {
          semesterId: nextSemester.id,
          adminUserId,
          status: nextSemester.status,
        },
      })

      return nextSemester
    })

    return this.toSemesterSummary(updated)
  }

  async archiveSemester(adminUserId: string, semesterId: string): Promise<SemesterSummary> {
    const semester = await this.database.prisma.semester.findUnique({
      where: {
        id: semesterId,
      },
    })

    if (!semester) {
      throw new NotFoundException("Semester not found.")
    }

    if (semester.status === "ARCHIVED") {
      return this.toSemesterSummary(semester)
    }

    const updated = await runInTransaction(this.database.prisma, async (transaction) => {
      const nextSemester = await transaction.semester.update({
        where: {
          id: semester.id,
        },
        data: {
          status: "ARCHIVED",
        },
      })

      await recordAdministrativeActionTrail(transaction, {
        adminAction: {
          adminUserId,
          actionType: "SEMESTER_ARCHIVE",
          metadata: {
            semesterId: nextSemester.id,
            semesterCode: nextSemester.code,
            semesterTitle: nextSemester.title,
            previousStatus: semester.status,
            nextStatus: nextSemester.status,
          },
        },
        outboxEvent: {
          topic: "semester.archived",
          aggregateType: "semester",
          aggregateId: nextSemester.id,
          payload: {
            semesterId: nextSemester.id,
            adminUserId,
            status: nextSemester.status,
          },
        },
      })

      return nextSemester
    })

    return this.toSemesterSummary(updated)
  }

  async getSemesterById(semesterId: string): Promise<SemesterSummary> {
    return this.toSemesterSummary(await this.getSemesterRecordById(semesterId))
  }

  async getSemesterRecordById(semesterId: string) {
    const semester = await this.database.prisma.semester.findUnique({
      where: {
        id: semesterId,
      },
    })

    if (!semester) {
      throw new NotFoundException("Semester not found.")
    }

    return semester
  }

  private assertSemesterWindow(startDate: Date, endDate: Date, cutoffDate: Date | null) {
    if (startDate > endDate) {
      throw new BadRequestException("Semester start date must be before the end date.")
    }

    if (cutoffDate && (cutoffDate < startDate || cutoffDate > endDate)) {
      throw new BadRequestException("Attendance cutoff date must fall inside the semester.")
    }
  }

  private toSemesterSummary(input: {
    id: string
    academicTermId: string
    code: string
    title: string
    ordinal: number | null
    status: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED"
    startDate: Date
    endDate: Date
    attendanceCutoffDate: Date | null
  }): SemesterSummary {
    return semesterSummarySchema.parse({
      id: input.id,
      academicTermId: input.academicTermId,
      code: input.code,
      title: input.title,
      ordinal: input.ordinal,
      status: input.status,
      startDate: input.startDate.toISOString(),
      endDate: input.endDate.toISOString(),
      attendanceCutoffDate: input.attendanceCutoffDate?.toISOString() ?? null,
    })
  }
}
