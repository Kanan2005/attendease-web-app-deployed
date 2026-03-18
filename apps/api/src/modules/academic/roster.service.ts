import type {
  ClassroomRosterListQuery,
  ClassroomRosterMemberSummary,
  CreateClassroomRosterMemberRequest,
  StudentClassroomListQuery,
  StudentClassroomMembershipSummary,
  UpdateClassroomRosterMemberRequest,
} from "@attendease/contracts"
import { queueOutboxEvent, recordAdministrativeActionTrail, runInTransaction } from "@attendease/db"
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common"

import { DatabaseService } from "../../database/database.service.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import type { ClassroomAccessContext } from "./classrooms.service.js"
import { ClassroomsService } from "./classrooms.service.js"
import {
  assertMutableRosterClassroom,
  assertStudentAllowedForRoster,
  findStudentByIdentifier,
  resolveRosterEnrollmentUpsert,
  rosterSearchMatches,
  rosterStudentInclude,
  toRosterMemberSummary,
  toStudentClassroomMembershipSummary,
} from "./roster.service.helpers.js"

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
      include: rosterStudentInclude,
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    })

    return enrollments
      .filter((enrollment) => rosterSearchMatches(enrollment, filters.search))
      .map((enrollment) => toRosterMemberSummary(enrollment, classroom))
  }

  async addClassroomRosterMember(
    auth: AuthRequestContext,
    classroomId: string,
    request: CreateClassroomRosterMemberRequest,
  ): Promise<ClassroomRosterMemberSummary> {
    const classroom = await this.requireMutableRosterClassroom(auth, classroomId)
    const student = await findStudentByIdentifier(this.database.prisma, request)
    const targetStatus = request.membershipStatus ?? request.status ?? "ACTIVE"
    assertStudentAllowedForRoster(student, targetStatus)

    const source = auth.activeRole === "ADMIN" ? "ADMIN" : "MANUAL"

    const enrollment = await runInTransaction(this.database.prisma, async (transaction) => {
      const existingEnrollment = await transaction.enrollment.findUnique({
        where: {
          studentId_courseOfferingId: {
            studentId: student.id,
            courseOfferingId: classroomId,
          },
        },
        include: rosterStudentInclude,
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
              include: rosterStudentInclude,
            })
          : await resolveRosterEnrollmentUpsert(transaction, existingEnrollment.id, {
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

    await this.classroomsService.activateIfDraft(classroomId)

    return toRosterMemberSummary(enrollment, classroom)
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
        include: rosterStudentInclude,
      })

      if (!existingEnrollment) {
        throw new NotFoundException("Roster membership not found.")
      }

      assertStudentAllowedForRoster(existingEnrollment.student, targetStatus)

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
        include: rosterStudentInclude,
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

    return toRosterMemberSummary(enrollment, classroom)
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
        include: rosterStudentInclude,
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
        include: rosterStudentInclude,
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

    return toRosterMemberSummary(enrollment, classroom)
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
        courseOffering: {
          include: { primaryTeacher: { select: { displayName: true } } },
        },
      },
      orderBy: [{ joinedAt: "desc" }, { createdAt: "desc" }],
    })

    return enrollments
      .filter((enrollment) =>
        filters.classroomStatus === undefined
          ? true
          : enrollment.courseOffering.status === filters.classroomStatus,
      )
      .map((enrollment) => toStudentClassroomMembershipSummary(enrollment))
  }

  private async requireMutableRosterClassroom(
    auth: AuthRequestContext,
    classroomId: string,
  ): Promise<ClassroomAccessContext> {
    const classroom = await this.classroomsService.requireAccessibleClassroom(auth, classroomId)
    assertMutableRosterClassroom(classroom)
    return classroom
  }
}
