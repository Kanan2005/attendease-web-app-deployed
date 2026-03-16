import type {
  CreateRosterImportJobRequest,
  RosterImportJobDetail,
  RosterImportJobListQuery,
  RosterImportJobSummary,
} from "@attendease/contracts"
import { queueOutboxEvent, runInTransaction } from "@attendease/db"
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common"

import { DatabaseService } from "../../database/database.service.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import type { ClassroomAccessContext } from "./classrooms.service.js"
import { ClassroomsService } from "./classrooms.service.js"
import {
  assertMutableRosterImportClassroom,
  buildInlineSourceFileKey,
  toRosterImportJobDetail,
  toRosterImportJobSummary,
} from "./roster-imports.service.models.js"

@Injectable()
export class RosterImportsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ClassroomsService) private readonly classroomsService: ClassroomsService,
  ) {}

  async listRosterImportJobs(
    auth: AuthRequestContext,
    classroomId: string,
    query: RosterImportJobListQuery = {},
  ): Promise<RosterImportJobSummary[]> {
    await this.classroomsService.requireAccessibleClassroom(auth, classroomId)

    const jobs = await this.database.prisma.rosterImportJob.findMany({
      where: {
        courseOfferingId: classroomId,
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return jobs.map((job) => toRosterImportJobSummary(job))
  }

  async getRosterImportJob(
    auth: AuthRequestContext,
    classroomId: string,
    jobId: string,
  ): Promise<RosterImportJobDetail> {
    await this.classroomsService.requireAccessibleClassroom(auth, classroomId)

    const job = await this.database.prisma.rosterImportJob.findFirst({
      where: {
        id: jobId,
        courseOfferingId: classroomId,
      },
      include: {
        rows: {
          orderBy: {
            rowNumber: "asc",
          },
        },
      },
    })

    if (!job) {
      throw new NotFoundException("Roster import job not found.")
    }

    return toRosterImportJobDetail(job)
  }

  async createRosterImportJob(
    auth: AuthRequestContext,
    classroomId: string,
    request: CreateRosterImportJobRequest,
  ): Promise<RosterImportJobDetail> {
    await this.requireMutableRosterImportClassroom(auth, classroomId)

    const sourceFileKey = request.sourceFileKey ?? buildInlineSourceFileKey(request.sourceFileName)

    const job = await runInTransaction(this.database.prisma, async (transaction) => {
      const createdJob = await transaction.rosterImportJob.create({
        data: {
          courseOfferingId: classroomId,
          requestedByUserId: auth.userId,
          sourceFileKey,
          sourceFileName: request.sourceFileName.trim(),
          totalRows: request.rows.length,
          status: "UPLOADED",
        },
      })

      await transaction.rosterImportRow.createMany({
        data: request.rows.map((row, index) => ({
          jobId: createdJob.id,
          rowNumber: index + 1,
          studentEmail: row.studentEmail?.trim().toLowerCase() ?? null,
          studentRollNumber: row.studentRollNumber?.trim() ?? null,
          parsedName: row.parsedName?.trim() ?? null,
          status: "PENDING",
        })),
      })

      await queueOutboxEvent(transaction, {
        topic: "classroom.roster.import_requested",
        aggregateType: "roster_import_job",
        aggregateId: createdJob.id,
        payload: {
          classroomId,
          jobId: createdJob.id,
          actorUserId: auth.userId,
          totalRows: request.rows.length,
          sourceFileName: createdJob.sourceFileName,
        },
      })

      return transaction.rosterImportJob.findUniqueOrThrow({
        where: {
          id: createdJob.id,
        },
        include: {
          rows: {
            orderBy: {
              rowNumber: "asc",
            },
          },
        },
      })
    })

    return toRosterImportJobDetail(job)
  }

  async applyRosterImportJob(
    auth: AuthRequestContext,
    classroomId: string,
    jobId: string,
  ): Promise<RosterImportJobDetail> {
    const classroom = await this.requireMutableRosterImportClassroom(auth, classroomId)

    const job = await runInTransaction(this.database.prisma, async (transaction) => {
      const existingJob = await transaction.rosterImportJob.findFirst({
        where: {
          id: jobId,
          courseOfferingId: classroomId,
        },
        include: {
          rows: {
            orderBy: {
              rowNumber: "asc",
            },
          },
        },
      })

      if (!existingJob) {
        throw new NotFoundException("Roster import job not found.")
      }

      if (existingJob.status === "UPLOADED" || existingJob.status === "PROCESSING") {
        throw new BadRequestException(
          "Roster import rows must be processed before they can be applied.",
        )
      }

      if (existingJob.status === "FAILED") {
        throw new BadRequestException("Failed roster import jobs cannot be applied.")
      }

      if (existingJob.status === "APPLIED") {
        return existingJob
      }

      let appliedRows = 0
      let skippedRows = 0

      for (const row of existingJob.rows) {
        if (row.status !== "VALID" || !row.resolvedStudentId) {
          continue
        }

        const student = await transaction.user.findFirst({
          where: {
            id: row.resolvedStudentId,
            roles: {
              some: {
                role: "STUDENT",
              },
            },
          },
          select: {
            id: true,
            status: true,
          },
        })

        if (!student) {
          await transaction.rosterImportRow.update({
            where: {
              id: row.id,
            },
            data: {
              status: "FAILED",
              errorMessage: "Resolved student no longer exists.",
            },
          })
          continue
        }

        if (student.status === "BLOCKED" || student.status === "ARCHIVED") {
          await transaction.rosterImportRow.update({
            where: {
              id: row.id,
            },
            data: {
              status: "FAILED",
              errorMessage: "Blocked or archived student accounts cannot be imported.",
            },
          })
          continue
        }

        const targetStatus = student.status === "ACTIVE" ? "ACTIVE" : "PENDING"
        const existingEnrollment = await transaction.enrollment.findUnique({
          where: {
            studentId_courseOfferingId: {
              studentId: student.id,
              courseOfferingId: classroomId,
            },
          },
        })

        if (existingEnrollment?.status === "ACTIVE") {
          skippedRows += 1
          await transaction.rosterImportRow.update({
            where: {
              id: row.id,
            },
            data: {
              status: "SKIPPED",
              errorMessage: "Student is already an active classroom member.",
            },
          })
          continue
        }

        if (existingEnrollment?.status === "BLOCKED") {
          await transaction.rosterImportRow.update({
            where: {
              id: row.id,
            },
            data: {
              status: "FAILED",
              errorMessage: "Blocked memberships require a manual roster update.",
            },
          })
          continue
        }

        if (existingEnrollment) {
          await transaction.enrollment.update({
            where: {
              id: existingEnrollment.id,
            },
            data: {
              status: targetStatus,
              source: "IMPORT",
              createdByUserId: auth.userId,
              droppedAt: null,
            },
          })
        } else {
          await transaction.enrollment.create({
            data: {
              courseOfferingId: classroomId,
              studentId: student.id,
              semesterId: classroom.semesterId,
              classId: classroom.classId,
              sectionId: classroom.sectionId,
              subjectId: classroom.subjectId,
              status: targetStatus,
              source: "IMPORT",
              createdByUserId: auth.userId,
            },
          })
        }

        appliedRows += 1
        await transaction.rosterImportRow.update({
          where: {
            id: row.id,
          },
          data: {
            status: "APPLIED",
            errorMessage: null,
          },
        })
      }

      const updatedJob = await transaction.rosterImportJob.update({
        where: {
          id: existingJob.id,
        },
        data: {
          status: "APPLIED",
          appliedRows,
          reviewedAt: new Date(),
          completedAt: new Date(),
        },
        include: {
          rows: {
            orderBy: {
              rowNumber: "asc",
            },
          },
        },
      })

      await transaction.announcementPost.create({
        data: {
          courseOfferingId: classroomId,
          authorUserId: auth.userId,
          postType: "IMPORT_RESULT",
          visibility: "TEACHER_ONLY",
          title: "Roster import applied",
          body: `Applied ${appliedRows} roster row${appliedRows === 1 ? "" : "s"} and skipped ${skippedRows} duplicate active membership row${skippedRows === 1 ? "" : "s"}.`,
          shouldNotify: false,
        },
      })

      await queueOutboxEvent(transaction, {
        topic: "classroom.roster.import_applied",
        aggregateType: "roster_import_job",
        aggregateId: updatedJob.id,
        payload: {
          classroomId,
          jobId: updatedJob.id,
          actorUserId: auth.userId,
          appliedRows,
          skippedRows,
        },
      })

      if (auth.activeRole === "ADMIN") {
        await transaction.adminActionLog.create({
          data: {
            adminUserId: auth.userId,
            targetCourseOfferingId: classroomId,
            actionType: "ROSTER_IMPORT_APPLY",
            metadata: {
              jobId: updatedJob.id,
              appliedRows,
              skippedRows,
            },
          },
        })
      }

      return updatedJob
    })

    return toRosterImportJobDetail(job)
  }

  private async requireMutableRosterImportClassroom(
    auth: AuthRequestContext,
    classroomId: string,
  ): Promise<ClassroomAccessContext> {
    const classroom = await this.classroomsService.requireAccessibleClassroom(auth, classroomId)
    assertMutableRosterImportClassroom(classroom)
    return classroom
  }
}
