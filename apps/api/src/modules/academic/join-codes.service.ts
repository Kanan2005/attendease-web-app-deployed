import {
  type ClassroomJoinCodeSummary,
  type JoinClassroomRequest,
  type ResetClassroomJoinCodeRequest,
  type StudentClassroomMembershipSummary,
  classroomJoinCodeSummarySchema,
  studentClassroomMembershipSummarySchema,
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
import { createActiveJoinCodeWithRetries, toInclusiveDayEnd } from "./academic.helpers.js"
import type { ClassroomAccessContext } from "./classrooms.service.js"
import { ClassroomsService } from "./classrooms.service.js"

type JoinCodeQueryClient = DatabaseService["prisma"] | PrismaTransactionClient

@Injectable()
export class JoinCodesService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ClassroomsService) private readonly classroomsService: ClassroomsService,
  ) {}

  async getClassroomJoinCode(
    auth: AuthRequestContext,
    classroomId: string,
  ): Promise<ClassroomJoinCodeSummary | null> {
    await this.classroomsService.requireAccessibleClassroom(auth, classroomId)

    const joinCode = await this.getNormalizedActiveJoinCode(this.database.prisma, classroomId)
    return this.toJoinCodeSummary(joinCode)
  }

  async resetClassroomJoinCode(
    auth: AuthRequestContext,
    classroomId: string,
    request: ResetClassroomJoinCodeRequest = {},
  ): Promise<ClassroomJoinCodeSummary> {
    const classroom = await this.requireMutableRosterClassroom(auth, classroomId)
    const now = new Date()
    const expiresAt = this.resolveJoinCodeExpiry(classroom.semester.endDate, request.expiresAt, now)

    const joinCode = await runInTransaction(this.database.prisma, async (transaction) => {
      const previousJoinCode = await this.getNormalizedActiveJoinCode(transaction, classroomId, now)

      if (previousJoinCode) {
        await transaction.classroomJoinCode.update({
          where: {
            id: previousJoinCode.id,
          },
          data: {
            status: "REVOKED",
            revokedAt: now,
          },
        })
      }

      const nextJoinCode = await createActiveJoinCodeWithRetries(transaction, {
        courseOfferingId: classroomId,
        createdByUserId: auth.userId,
        expiresAt,
        rotatedFromId: previousJoinCode?.id ?? null,
      })

      await queueOutboxEvent(transaction, {
        topic: "classroom.join_code.reset",
        aggregateType: "course_offering",
        aggregateId: classroomId,
        payload: {
          classroomId,
          actorUserId: auth.userId,
          previousJoinCodeId: previousJoinCode?.id ?? null,
          joinCodeId: nextJoinCode.id,
          expiresAt: nextJoinCode.expiresAt.toISOString(),
        },
      })

      return nextJoinCode
    })

    return classroomJoinCodeSummarySchema.parse({
      id: joinCode.id,
      courseOfferingId: joinCode.courseOfferingId,
      classroomId: joinCode.courseOfferingId,
      code: joinCode.code,
      status: joinCode.status,
      expiresAt: joinCode.expiresAt.toISOString(),
    })
  }

  async joinClassroom(
    auth: AuthRequestContext,
    request: JoinClassroomRequest,
  ): Promise<StudentClassroomMembershipSummary> {
    if (auth.activeRole !== "STUDENT") {
      throw new ForbiddenException("Only students can join classrooms with a join code.")
    }

    const now = new Date()

    const preflightJoinCode = await this.database.prisma.classroomJoinCode.findUnique({
      where: {
        code: request.code,
      },
    })

    if (!preflightJoinCode) {
      throw new NotFoundException("Join code not found.")
    }

    if (preflightJoinCode.status !== "ACTIVE") {
      throw new BadRequestException("Join code is no longer active.")
    }

    if (preflightJoinCode.expiresAt <= now) {
      await this.database.prisma.classroomJoinCode.update({
        where: {
          id: preflightJoinCode.id,
        },
        data: {
          status: "EXPIRED",
        },
      })

      throw new BadRequestException("Join code has expired.")
    }

    return runInTransaction(this.database.prisma, async (transaction) => {
      const joinCode = await transaction.classroomJoinCode.findUnique({
        where: {
          code: request.code,
        },
        include: {
          courseOffering: {
            include: {
              semester: {
                select: {
                  id: true,
                  status: true,
                  startDate: true,
                  endDate: true,
                },
              },
            },
          },
        },
      })

      if (!joinCode) {
        throw new NotFoundException("Join code not found.")
      }

      if (joinCode.status !== "ACTIVE") {
        throw new BadRequestException("Join code is no longer active.")
      }

      this.assertClassroomAllowsStudentJoin({
        status: joinCode.courseOffering.status,
        semester: joinCode.courseOffering.semester,
      })

      const existingEnrollment = await transaction.enrollment.findUnique({
        where: {
          studentId_courseOfferingId: {
            studentId: auth.userId,
            courseOfferingId: joinCode.courseOffering.id,
          },
        },
      })

      const enrollment =
        existingEnrollment === null
          ? await transaction.enrollment.create({
              data: {
                courseOfferingId: joinCode.courseOffering.id,
                studentId: auth.userId,
                semesterId: joinCode.courseOffering.semesterId,
                classId: joinCode.courseOffering.classId,
                sectionId: joinCode.courseOffering.sectionId,
                subjectId: joinCode.courseOffering.subjectId,
                status: "ACTIVE",
                source: "JOIN_CODE",
                createdByUserId: auth.userId,
                joinedAt: now,
              },
            })
          : await this.resolveJoinEnrollmentUpdate(transaction, existingEnrollment.id, {
              existingStatus: existingEnrollment.status,
              studentId: auth.userId,
              actorUserId: auth.userId,
            })

      await transaction.classroomJoinCode.update({
        where: {
          id: joinCode.id,
        },
        data: {
          lastUsedAt: now,
        },
      })

      await queueOutboxEvent(transaction, {
        topic: "classroom.student.joined",
        aggregateType: "course_offering",
        aggregateId: joinCode.courseOffering.id,
        payload: {
          classroomId: joinCode.courseOffering.id,
          joinCodeId: joinCode.id,
          enrollmentId: enrollment.id,
          studentId: auth.userId,
          actorUserId: auth.userId,
          status: enrollment.status,
        },
      })

      return this.toStudentClassroomMembershipSummary(
        {
          id: joinCode.courseOffering.id,
          semesterId: joinCode.courseOffering.semesterId,
          classId: joinCode.courseOffering.classId,
          sectionId: joinCode.courseOffering.sectionId,
          subjectId: joinCode.courseOffering.subjectId,
          primaryTeacherId: joinCode.courseOffering.primaryTeacherId,
          code: joinCode.courseOffering.code,
          displayTitle: joinCode.courseOffering.displayTitle,
          status: joinCode.courseOffering.status,
          defaultAttendanceMode: joinCode.courseOffering.defaultAttendanceMode,
          timezone: joinCode.courseOffering.timezone,
          requiresTrustedDevice: joinCode.courseOffering.requiresTrustedDevice,
        },
        enrollment,
      )
    })
  }

  private async resolveJoinEnrollmentUpdate(
    transaction: PrismaTransactionClient,
    enrollmentId: string,
    input: {
      existingStatus: "ACTIVE" | "PENDING" | "DROPPED" | "BLOCKED"
      studentId: string
      actorUserId: string
    },
  ) {
    if (input.existingStatus === "ACTIVE") {
      throw new ConflictException("Student is already joined to this classroom.")
    }

    if (input.existingStatus === "BLOCKED") {
      throw new ForbiddenException(
        "Blocked classroom memberships cannot be reactivated through join codes.",
      )
    }

    if (input.existingStatus === "DROPPED") {
      throw new ForbiddenException(
        "Dropped classroom memberships must be restored by a teacher or admin.",
      )
    }

    return transaction.enrollment.update({
      where: {
        id: enrollmentId,
      },
      data: {
        status: "ACTIVE",
        joinedAt: new Date(),
      },
    })
  }

  private async requireMutableRosterClassroom(
    auth: AuthRequestContext,
    classroomId: string,
  ): Promise<ClassroomAccessContext> {
    const classroom = await this.classroomsService.requireAccessibleClassroom(auth, classroomId)
    this.assertClassroomAllowsRosterMutations(classroom)
    return classroom
  }

  private assertClassroomAllowsRosterMutations(
    classroom: Pick<ClassroomAccessContext, "status" | "semester">,
  ) {
    if (classroom.status === "COMPLETED" || classroom.status === "ARCHIVED") {
      throw new BadRequestException(
        "Join codes cannot be changed for completed or archived classrooms.",
      )
    }

    if (classroom.semester.status === "CLOSED" || classroom.semester.status === "ARCHIVED") {
      throw new BadRequestException(
        "Join codes cannot be changed inside a closed or archived semester.",
      )
    }
  }

  private assertClassroomAllowsStudentJoin(classroom: {
    status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED"
    semester: {
      status: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED"
    }
  }) {
    if (classroom.status === "COMPLETED" || classroom.status === "ARCHIVED") {
      throw new BadRequestException("This classroom is no longer open for student joins.")
    }

    if (classroom.semester.status === "CLOSED" || classroom.semester.status === "ARCHIVED") {
      throw new BadRequestException("This semester is no longer open for student joins.")
    }
  }

  private resolveJoinCodeExpiry(
    semesterEndDate: Date,
    requestedExpiresAt: string | undefined,
    now: Date,
  ): Date {
    const semesterEnd = toInclusiveDayEnd(semesterEndDate)
    const expiresAt = requestedExpiresAt ? new Date(requestedExpiresAt) : semesterEnd

    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= now) {
      throw new BadRequestException("Join code expiry must be in the future.")
    }

    if (expiresAt > semesterEnd) {
      throw new BadRequestException("Join code expiry must fall inside the semester window.")
    }

    return expiresAt
  }

  private async getNormalizedActiveJoinCode(
    client: JoinCodeQueryClient,
    classroomId: string,
    now = new Date(),
  ) {
    const joinCode = await client.classroomJoinCode.findFirst({
      where: {
        courseOfferingId: classroomId,
        status: "ACTIVE",
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    if (!joinCode) {
      return null
    }

    if (joinCode.expiresAt <= now) {
      await client.classroomJoinCode.update({
        where: {
          id: joinCode.id,
        },
        data: {
          status: "EXPIRED",
        },
      })

      return null
    }

    return joinCode
  }

  private toJoinCodeSummary(
    input: {
      id: string
      courseOfferingId: string
      code: string
      status: "ACTIVE" | "EXPIRED" | "REVOKED"
      expiresAt: Date
    } | null,
  ): ClassroomJoinCodeSummary | null {
    if (!input) {
      return null
    }

    return classroomJoinCodeSummarySchema.parse({
      id: input.id,
      courseOfferingId: input.courseOfferingId,
      classroomId: input.courseOfferingId,
      code: input.code,
      status: input.status,
      expiresAt: input.expiresAt.toISOString(),
    })
  }

  private toStudentClassroomMembershipSummary(
    classroom: {
      id: string
      semesterId: string
      classId: string
      sectionId: string
      subjectId: string
      primaryTeacherId: string
      code: string
      displayTitle: string
      status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED"
      defaultAttendanceMode: "QR_GPS" | "BLUETOOTH" | "MANUAL"
      timezone: string
      requiresTrustedDevice: boolean
    },
    enrollment: {
      id: string
      status: "ACTIVE" | "PENDING" | "DROPPED" | "BLOCKED"
      source: "JOIN_CODE" | "IMPORT" | "MANUAL" | "ADMIN"
      joinedAt: Date
      droppedAt: Date | null
    },
  ): StudentClassroomMembershipSummary {
    return studentClassroomMembershipSummarySchema.parse({
      id: classroom.id,
      classroomId: classroom.id,
      semesterId: classroom.semesterId,
      classId: classroom.classId,
      sectionId: classroom.sectionId,
      subjectId: classroom.subjectId,
      primaryTeacherId: classroom.primaryTeacherId,
      code: classroom.code,
      displayTitle: classroom.displayTitle,
      classroomStatus: classroom.status,
      defaultAttendanceMode: classroom.defaultAttendanceMode,
      timezone: classroom.timezone,
      requiresTrustedDevice: classroom.requiresTrustedDevice,
      enrollmentId: enrollment.id,
      membershipId: enrollment.id,
      enrollmentStatus: enrollment.status,
      membershipStatus: enrollment.status,
      enrollmentSource: enrollment.source,
      membershipSource: enrollment.source,
      joinedAt: enrollment.joinedAt.toISOString(),
      droppedAt: enrollment.droppedAt?.toISOString() ?? null,
    })
  }
}
