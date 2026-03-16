import {
  type ClassroomRosterListQuery,
  type ClassroomRosterMemberSummary,
  type CreateClassroomRosterMemberRequest,
  type StudentClassroomListQuery,
  type StudentClassroomMembershipSummary,
  type UpdateClassroomRosterMemberRequest,
  classroomRosterMemberSummarySchema,
  studentClassroomMembershipSummarySchema,
} from "@attendease/contracts"
import {
  type PrismaTransactionClient,
  queueOutboxEvent,
  recordAdministrativeActionTrail,
  runInTransaction,
} from "@attendease/db"
import { deriveClassroomStudentActions, resolveStudentIdentifierLabel } from "@attendease/domain"
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
import type { ClassroomAccessContext } from "./classrooms.service.js"
import { ClassroomsService } from "./classrooms.service.js"

@Injectable()
export class RosterService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ClassroomsService) private readonly classroomsService: ClassroomsService,
  ) {}

  async listClassroomRoster(
    auth: AuthRequestContext,
    classroomId: string,
    filters: ClassroomRosterListQuery = {},
  ): Promise<ClassroomRosterMemberSummary[]> {
    const classroom = await this.classroomsService.requireAccessibleClassroom(auth, classroomId)
    const membershipStatus = filters.membershipStatus ?? filters.status

    const enrollments = await this.database.prisma.enrollment.findMany({
      where: {
        courseOfferingId: classroomId,
        ...(membershipStatus ? { status: membershipStatus } : {}),
      },
      include: {
        student: {
          select: {
            email: true,
            displayName: true,
            status: true,
            studentProfile: {
              select: {
                rollNumber: true,
                universityId: true,
                attendanceDisabled: true,
              },
            },
          },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    })

    const search = filters.search?.trim().toLowerCase()

    return enrollments
      .filter((enrollment) => {
        if (!search) {
          return true
        }

        const rollNumber = enrollment.student.studentProfile?.rollNumber?.toLowerCase() ?? ""
        const universityId = enrollment.student.studentProfile?.universityId?.toLowerCase() ?? ""

        return (
          enrollment.student.displayName.toLowerCase().includes(search) ||
          enrollment.student.email.toLowerCase().includes(search) ||
          rollNumber.includes(search) ||
          universityId.includes(search)
        )
      })
      .map((enrollment) => this.toRosterMemberSummary(enrollment, classroom))
  }

  async addClassroomRosterMember(
    auth: AuthRequestContext,
    classroomId: string,
    request: CreateClassroomRosterMemberRequest,
  ): Promise<ClassroomRosterMemberSummary> {
    const classroom = await this.requireMutableRosterClassroom(auth, classroomId)
    const student = await this.findStudentByIdentifier(request)
    const targetStatus = request.membershipStatus ?? request.status ?? "ACTIVE"
    this.assertStudentAllowedForRoster(student, targetStatus)

    const source = auth.activeRole === "ADMIN" ? "ADMIN" : "MANUAL"

    const enrollment = await runInTransaction(this.database.prisma, async (transaction) => {
      const existingEnrollment = await transaction.enrollment.findUnique({
        where: {
          studentId_courseOfferingId: {
            studentId: student.id,
            courseOfferingId: classroomId,
          },
        },
        include: {
          student: {
            select: {
              email: true,
              displayName: true,
              status: true,
              studentProfile: {
                select: {
                  rollNumber: true,
                  universityId: true,
                  attendanceDisabled: true,
                },
              },
            },
          },
        },
      })

      const nextEnrollment =
        existingEnrollment === null
          ? await transaction.enrollment.create({
              data: {
                courseOfferingId: classroomId,
                studentId: student.id,
                semesterId: classroom.semesterId,
                classId: classroom.classId,
                sectionId: classroom.sectionId,
                subjectId: classroom.subjectId,
                status: targetStatus,
                source,
                createdByUserId: auth.userId,
              },
              include: {
                student: {
                  select: {
                    email: true,
                    displayName: true,
                    status: true,
                    studentProfile: {
                      select: {
                        rollNumber: true,
                        universityId: true,
                        attendanceDisabled: true,
                      },
                    },
                  },
                },
              },
            })
          : await this.resolveRosterEnrollmentUpsert(transaction, existingEnrollment.id, {
              existingStatus: existingEnrollment.status,
              nextStatus: targetStatus,
              source,
            })

      await queueOutboxEvent(transaction, {
        topic: "classroom.roster.member_added",
        aggregateType: "course_offering",
        aggregateId: classroomId,
        payload: {
          classroomId,
          enrollmentId: nextEnrollment.id,
          studentId: nextEnrollment.studentId,
          actorUserId: auth.userId,
          status: nextEnrollment.status,
          source: nextEnrollment.source,
        },
      })

      return nextEnrollment
    })

    return this.toRosterMemberSummary(enrollment, classroom)
  }

  async updateClassroomRosterMember(
    auth: AuthRequestContext,
    classroomId: string,
    enrollmentId: string,
    request: UpdateClassroomRosterMemberRequest,
  ): Promise<ClassroomRosterMemberSummary> {
    const classroom = await this.requireMutableRosterClassroom(auth, classroomId)
    const targetStatus = request.membershipStatus ?? request.status

    if (!targetStatus) {
      throw new BadRequestException("A classroom-student membership status is required.")
    }

    const enrollment = await runInTransaction(this.database.prisma, async (transaction) => {
      const existingEnrollment = await transaction.enrollment.findFirst({
        where: {
          id: enrollmentId,
          courseOfferingId: classroomId,
        },
        include: {
          student: {
            select: {
              email: true,
              displayName: true,
              status: true,
              studentProfile: {
                select: {
                  rollNumber: true,
                  universityId: true,
                  attendanceDisabled: true,
                },
              },
            },
          },
        },
      })

      if (!existingEnrollment) {
        throw new NotFoundException("Roster membership not found.")
      }

      this.assertStudentAllowedForRoster(existingEnrollment.student, targetStatus)

      if (existingEnrollment.status === targetStatus) {
        return existingEnrollment
      }

      const updatedEnrollment = await transaction.enrollment.update({
        where: {
          id: existingEnrollment.id,
        },
        data: {
          status: targetStatus,
          droppedAt: targetStatus === "DROPPED" ? new Date() : null,
        },
        include: {
          student: {
            select: {
              email: true,
              displayName: true,
              status: true,
              studentProfile: {
                select: {
                  rollNumber: true,
                  universityId: true,
                  attendanceDisabled: true,
                },
              },
            },
          },
        },
      })

      if (auth.activeRole === "ADMIN" && targetStatus === "DROPPED") {
        await recordAdministrativeActionTrail(transaction, {
          adminAction: {
            adminUserId: auth.userId,
            targetUserId: updatedEnrollment.studentId,
            targetCourseOfferingId: classroomId,
            actionType: "CLASSROOM_STUDENT_REMOVE",
            metadata: {
              classroomId,
              enrollmentId: updatedEnrollment.id,
              previousStatus: existingEnrollment.status,
              nextStatus: targetStatus,
              source: "STATUS_UPDATE",
            },
          },
          outboxEvent: {
            topic: "classroom.roster.member_updated",
            aggregateType: "course_offering",
            aggregateId: classroomId,
            payload: {
              classroomId,
              enrollmentId: updatedEnrollment.id,
              studentId: updatedEnrollment.studentId,
              actorUserId: auth.userId,
              previousStatus: existingEnrollment.status,
              status: targetStatus,
            },
          },
        })
      } else {
        await queueOutboxEvent(transaction, {
          topic: "classroom.roster.member_updated",
          aggregateType: "course_offering",
          aggregateId: classroomId,
          payload: {
            classroomId,
            enrollmentId: updatedEnrollment.id,
            studentId: updatedEnrollment.studentId,
            actorUserId: auth.userId,
            previousStatus: existingEnrollment.status,
            status: targetStatus,
          },
        })
      }

      return updatedEnrollment
    })

    return this.toRosterMemberSummary(enrollment, classroom)
  }

  async removeClassroomRosterMember(
    auth: AuthRequestContext,
    classroomId: string,
    enrollmentId: string,
  ): Promise<ClassroomRosterMemberSummary> {
    const classroom = await this.requireMutableRosterClassroom(auth, classroomId)

    const enrollment = await runInTransaction(this.database.prisma, async (transaction) => {
      const existingEnrollment = await transaction.enrollment.findFirst({
        where: {
          id: enrollmentId,
          courseOfferingId: classroomId,
        },
        include: {
          student: {
            select: {
              email: true,
              displayName: true,
              status: true,
              studentProfile: {
                select: {
                  rollNumber: true,
                  universityId: true,
                  attendanceDisabled: true,
                },
              },
            },
          },
        },
      })

      if (!existingEnrollment) {
        throw new NotFoundException("Roster membership not found.")
      }

      if (existingEnrollment.status === "DROPPED") {
        return existingEnrollment
      }

      const updatedEnrollment = await transaction.enrollment.update({
        where: {
          id: existingEnrollment.id,
        },
        data: {
          status: "DROPPED",
          droppedAt: new Date(),
        },
        include: {
          student: {
            select: {
              email: true,
              displayName: true,
              status: true,
              studentProfile: {
                select: {
                  rollNumber: true,
                  universityId: true,
                  attendanceDisabled: true,
                },
              },
            },
          },
        },
      })

      if (auth.activeRole === "ADMIN") {
        await recordAdministrativeActionTrail(transaction, {
          adminAction: {
            adminUserId: auth.userId,
            targetUserId: updatedEnrollment.studentId,
            targetCourseOfferingId: classroomId,
            actionType: "CLASSROOM_STUDENT_REMOVE",
            metadata: {
              classroomId,
              enrollmentId: updatedEnrollment.id,
              previousStatus: existingEnrollment.status,
              nextStatus: updatedEnrollment.status,
              source: "REMOVE",
            },
          },
          outboxEvent: {
            topic: "classroom.roster.member_removed",
            aggregateType: "course_offering",
            aggregateId: classroomId,
            payload: {
              classroomId,
              enrollmentId: updatedEnrollment.id,
              studentId: updatedEnrollment.studentId,
              actorUserId: auth.userId,
              previousStatus: existingEnrollment.status,
              status: updatedEnrollment.status,
            },
          },
        })
      } else {
        await queueOutboxEvent(transaction, {
          topic: "classroom.roster.member_removed",
          aggregateType: "course_offering",
          aggregateId: classroomId,
          payload: {
            classroomId,
            enrollmentId: updatedEnrollment.id,
            studentId: updatedEnrollment.studentId,
            actorUserId: auth.userId,
            previousStatus: existingEnrollment.status,
            status: updatedEnrollment.status,
          },
        })
      }

      return updatedEnrollment
    })

    return this.toRosterMemberSummary(enrollment, classroom)
  }

  async listStudentClassrooms(
    studentId: string,
    filters: StudentClassroomListQuery = {},
  ): Promise<StudentClassroomMembershipSummary[]> {
    const enrollments = await this.database.prisma.enrollment.findMany({
      where: {
        studentId,
        ...(filters.courseOfferingId ? { courseOfferingId: filters.courseOfferingId } : {}),
        ...(filters.semesterId ? { semesterId: filters.semesterId } : {}),
        ...(filters.classId ? { classId: filters.classId } : {}),
        ...(filters.sectionId ? { sectionId: filters.sectionId } : {}),
        ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
        status: filters.enrollmentStatus ?? {
          in: ["ACTIVE", "PENDING"],
        },
      },
      include: {
        courseOffering: true,
      },
      orderBy: [{ joinedAt: "desc" }, { createdAt: "desc" }],
    })

    return enrollments
      .filter((enrollment) =>
        filters.classroomStatus === undefined
          ? true
          : enrollment.courseOffering.status === filters.classroomStatus,
      )
      .map((enrollment) => this.toStudentClassroomMembershipSummary(enrollment))
  }

  private async requireMutableRosterClassroom(
    auth: AuthRequestContext,
    classroomId: string,
  ): Promise<ClassroomAccessContext> {
    const classroom = await this.classroomsService.requireAccessibleClassroom(auth, classroomId)

    if (classroom.status === "COMPLETED" || classroom.status === "ARCHIVED") {
      throw new BadRequestException(
        "Roster changes are not allowed for completed or archived classrooms.",
      )
    }

    if (classroom.semester.status === "CLOSED" || classroom.semester.status === "ARCHIVED") {
      throw new BadRequestException(
        "Roster changes are not allowed inside a closed or archived semester.",
      )
    }

    return classroom
  }

  private async findStudentByIdentifier(request: CreateClassroomRosterMemberRequest) {
    const email = request.studentEmail?.trim().toLowerCase()
    const studentIdentifier = request.studentIdentifier?.trim()
    const studentRollNumber = request.studentRollNumber?.trim()
    const studentUniversityId = request.studentUniversityId?.trim()
    const studentIdentifierFilters =
      studentIdentifier === undefined
        ? []
        : [
            {
              email: studentIdentifier.toLowerCase(),
            },
            {
              studentProfile: {
                is: {
                  rollNumber: studentIdentifier,
                },
              },
            },
            {
              studentProfile: {
                is: {
                  universityId: studentIdentifier,
                },
              },
            },
          ]

    const filters = [
      request.studentId ? { id: request.studentId } : null,
      email ? { email } : null,
      studentRollNumber
        ? {
            studentProfile: {
              is: {
                rollNumber: studentRollNumber,
              },
            },
          }
        : null,
      studentUniversityId
        ? {
            studentProfile: {
              is: {
                universityId: studentUniversityId,
              },
            },
          }
        : null,
      studentIdentifierFilters.length > 0
        ? {
            OR: studentIdentifierFilters,
          }
        : null,
    ].filter((value): value is NonNullable<typeof value> => value !== null)

    const student = await this.database.prisma.user.findFirst({
      where: {
        ...(filters.length > 0 ? { AND: filters } : {}),
        roles: {
          some: {
            role: "STUDENT",
          },
        },
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        status: true,
        studentProfile: {
          select: {
            rollNumber: true,
            universityId: true,
            attendanceDisabled: true,
          },
        },
      },
    })

    if (!student) {
      throw new NotFoundException("Student not found for the requested identifier.")
    }

    return student
  }

  private assertStudentAllowedForRoster(
    student: {
      status: "PENDING" | "ACTIVE" | "SUSPENDED" | "BLOCKED" | "ARCHIVED"
    },
    targetStatus: "ACTIVE" | "PENDING" | "DROPPED" | "BLOCKED",
  ) {
    if (student.status === "BLOCKED" || student.status === "ARCHIVED") {
      throw new BadRequestException("Blocked or archived student accounts cannot join rosters.")
    }

    if (targetStatus === "ACTIVE" && student.status !== "ACTIVE") {
      throw new BadRequestException(
        "Only active student accounts can hold an active classroom membership.",
      )
    }
  }

  private async resolveRosterEnrollmentUpsert(
    transaction: PrismaTransactionClient,
    enrollmentId: string,
    input: {
      existingStatus: "ACTIVE" | "PENDING" | "DROPPED" | "BLOCKED"
      nextStatus: "ACTIVE" | "PENDING"
      source: "MANUAL" | "ADMIN"
    },
  ) {
    if (input.existingStatus === "ACTIVE") {
      throw new ConflictException("Student is already present on the classroom roster.")
    }

    if (input.existingStatus === "BLOCKED") {
      throw new ConflictException(
        "Blocked classroom memberships must be changed through a roster status update.",
      )
    }

    return transaction.enrollment.update({
      where: {
        id: enrollmentId,
      },
      data: {
        status: input.nextStatus,
        source: input.source,
        droppedAt: null,
      },
      include: {
        student: {
          select: {
            email: true,
            displayName: true,
            status: true,
            studentProfile: {
              select: {
                rollNumber: true,
                universityId: true,
                attendanceDisabled: true,
              },
            },
          },
        },
      },
    })
  }

  private toRosterMemberSummary(
    input: {
      id: string
      courseOfferingId: string
      studentId: string
      semesterId: string
      classId: string
      sectionId: string
      subjectId: string
      status: "ACTIVE" | "PENDING" | "DROPPED" | "BLOCKED"
      source: "JOIN_CODE" | "IMPORT" | "MANUAL" | "ADMIN"
      joinedAt: Date
      droppedAt: Date | null
      student: {
        email: string
        displayName: string
        status: "PENDING" | "ACTIVE" | "SUSPENDED" | "BLOCKED" | "ARCHIVED"
        studentProfile: {
          rollNumber: string | null
          universityId: string | null
          attendanceDisabled: boolean
        } | null
      }
    },
    classroom: Pick<ClassroomAccessContext, "status" | "semester">,
  ): ClassroomRosterMemberSummary {
    const studentIdentifier =
      resolveStudentIdentifierLabel({
        rollNumber: input.student.studentProfile?.rollNumber ?? null,
        universityId: input.student.studentProfile?.universityId ?? null,
        studentEmail: input.student.email,
      }) ?? input.student.email

    return classroomRosterMemberSummarySchema.parse({
      id: input.id,
      courseOfferingId: input.courseOfferingId,
      classroomId: input.courseOfferingId,
      membershipId: input.id,
      studentId: input.studentId,
      semesterId: input.semesterId,
      classId: input.classId,
      sectionId: input.sectionId,
      subjectId: input.subjectId,
      status: input.status,
      membershipStatus: input.status,
      source: input.source,
      membershipSource: input.source,
      studentEmail: input.student.email,
      studentDisplayName: input.student.displayName,
      studentName: input.student.displayName,
      studentIdentifier,
      studentStatus: input.student.status,
      rollNumber: input.student.studentProfile?.rollNumber ?? null,
      universityId: input.student.studentProfile?.universityId ?? null,
      attendanceDisabled: input.student.studentProfile?.attendanceDisabled ?? false,
      joinedAt: input.joinedAt.toISOString(),
      memberSince: input.joinedAt.toISOString(),
      droppedAt: input.droppedAt?.toISOString() ?? null,
      membershipState: input.status,
      actions: deriveClassroomStudentActions({
        classroomStatus: classroom.status,
        semesterStatus: classroom.semester.status,
        membershipStatus: input.status,
        studentStatus: input.student.status,
      }),
    })
  }

  private toStudentClassroomMembershipSummary(input: {
    id: string
    courseOfferingId: string
    studentId: string
    semesterId: string
    classId: string
    sectionId: string
    subjectId: string
    status: "ACTIVE" | "PENDING" | "DROPPED" | "BLOCKED"
    source: "JOIN_CODE" | "IMPORT" | "MANUAL" | "ADMIN"
    joinedAt: Date
    droppedAt: Date | null
    courseOffering: {
      id: string
      primaryTeacherId: string
      code: string
      displayTitle: string
      status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED"
      defaultAttendanceMode: "QR_GPS" | "BLUETOOTH" | "MANUAL"
      timezone: string
      requiresTrustedDevice: boolean
    }
  }): StudentClassroomMembershipSummary {
    return studentClassroomMembershipSummarySchema.parse({
      id: input.courseOffering.id,
      classroomId: input.courseOffering.id,
      semesterId: input.semesterId,
      classId: input.classId,
      sectionId: input.sectionId,
      subjectId: input.subjectId,
      primaryTeacherId: input.courseOffering.primaryTeacherId,
      code: input.courseOffering.code,
      displayTitle: input.courseOffering.displayTitle,
      classroomStatus: input.courseOffering.status,
      defaultAttendanceMode: input.courseOffering.defaultAttendanceMode,
      timezone: input.courseOffering.timezone,
      requiresTrustedDevice: input.courseOffering.requiresTrustedDevice,
      enrollmentId: input.id,
      membershipId: input.id,
      enrollmentStatus: input.status,
      membershipStatus: input.status,
      enrollmentSource: input.source,
      membershipSource: input.source,
      joinedAt: input.joinedAt.toISOString(),
      droppedAt: input.droppedAt?.toISOString() ?? null,
    })
  }
}
