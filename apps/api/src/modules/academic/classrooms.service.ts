import type {
  ClassroomDetail,
  ClassroomListQuery,
  ClassroomSummary,
  CreateClassroomRequest,
  UpdateClassroomRequest,
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
import type { AuthRequestContext } from "../auth/auth.types.js"
import {
  createActiveJoinCodeWithRetries,
  isUniqueConstraintError,
  toInclusiveDayEnd,
} from "./academic.helpers.js"
import { AssignmentsService } from "./assignments.service.js"
import {
  assertClassroomCreationAccess,
  assertClassroomUpdateAccess,
  buildAdminClassroomWhere,
  buildTeacherClassroomWhere,
  requireAccessibleClassroom,
} from "./classrooms.service.access.js"
import {
  assertClassroomCanBeModified,
  assertSemesterAllowsAcademicChanges,
  assertTeacherUpdateDoesNotChangeScope,
  requireClassroomTitle,
  requireCourseCode,
  resolvePrimaryTeacherId,
} from "./classrooms.service.policies.js"
import {
  getClassroomDetailInclude,
  getClassroomSummaryInclude,
  toClassroomDetail,
  toClassroomSummary,
} from "./classrooms.service.serialization.js"
import type {
  ClassroomAccessContext,
  ClassroomScope,
  ClassroomWithRelations,
} from "./classrooms.service.types.js"
import { SemestersService } from "./semesters.service.js"
export type { ClassroomAccessContext } from "./classrooms.service.types.js"

@Injectable()
export class ClassroomsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AssignmentsService) private readonly assignmentsService: AssignmentsService,
    @Inject(SemestersService) private readonly semestersService: SemestersService,
  ) {}
  async listClassrooms(
    auth: AuthRequestContext,
    filters: ClassroomListQuery = {},
  ): Promise<ClassroomSummary[]> {
    if (
      auth.activeRole === "TEACHER" &&
      filters.primaryTeacherId &&
      filters.primaryTeacherId !== auth.userId
    ) {
      return []
    }
    const where =
      auth.activeRole === "ADMIN"
        ? buildAdminClassroomWhere(filters)
        : await buildTeacherClassroomWhere({
            assignmentsService: this.assignmentsService,
            teacherId: auth.userId,
            filters,
          })
    if (where === null) {
      return []
    }
    const classrooms = await this.database.prisma.courseOffering.findMany({
      where,
      include: getClassroomSummaryInclude(),
      orderBy: [{ status: "asc" }, { displayTitle: "asc" }],
    })
    return classrooms.map((classroom) =>
      toClassroomSummary(classroom as ClassroomWithRelations, auth),
    )
  }

  async getClassroom(auth: AuthRequestContext, classroomId: string): Promise<ClassroomDetail> {
    await this.requireAccessibleClassroom(auth, classroomId)

    const classroom = await this.database.prisma.courseOffering.findUnique({
      where: {
        id: classroomId,
      },
      include: getClassroomDetailInclude(),
    })

    if (!classroom) {
      throw new NotFoundException("Classroom not found.")
    }
    return toClassroomDetail(classroom as ClassroomWithRelations, auth, {
      includeJoinCode: auth.activeRole !== "STUDENT",
    })
  }

  async createClassroom(
    auth: AuthRequestContext,
    request: CreateClassroomRequest,
  ): Promise<ClassroomDetail> {
    const primaryTeacherId = resolvePrimaryTeacherId(auth, request.primaryTeacherId)
    const scope: ClassroomScope = {
      semesterId: request.semesterId,
      classId: request.classId,
      sectionId: request.sectionId,
      subjectId: request.subjectId,
    }

    await assertClassroomCreationAccess({
      assignmentsService: this.assignmentsService,
      auth,
      primaryTeacherId,
      scope,
    })

    const semester = await this.semestersService.getSemesterRecordById(request.semesterId)
    assertSemesterAllowsAcademicChanges(semester.status)
    const courseCode = requireCourseCode(request)
    const classroomTitle = requireClassroomTitle(request)

    try {
      const created = await runInTransaction(this.database.prisma, async (transaction) => {
        const courseOffering = await transaction.courseOffering.create({
          data: {
            semesterId: request.semesterId,
            classId: request.classId,
            sectionId: request.sectionId,
            subjectId: request.subjectId,
            primaryTeacherId,
            createdByUserId: auth.userId,
            code: courseCode,
            displayTitle: classroomTitle,
            defaultAttendanceMode: request.defaultAttendanceMode ?? "QR_GPS",
            defaultGpsRadiusMeters: request.defaultGpsRadiusMeters ?? 100,
            defaultSessionDurationMinutes: request.defaultSessionDurationMinutes ?? 15,
            qrRotationWindowSeconds: request.qrRotationWindowSeconds ?? 15,
            bluetoothRotationWindowSeconds: request.bluetoothRotationWindowSeconds ?? 10,
            timezone: request.timezone ?? "Asia/Kolkata",
            requiresTrustedDevice: request.requiresTrustedDevice ?? true,
            status: "DRAFT",
          },
          include: {
            joinCodes: true,
          },
        })

        await createActiveJoinCodeWithRetries(transaction, {
          courseOfferingId: courseOffering.id,
          createdByUserId: auth.userId,
          expiresAt: toInclusiveDayEnd(semester.endDate),
        })

        await queueOutboxEvent(transaction, {
          topic: "classroom.created",
          aggregateType: "course_offering",
          aggregateId: courseOffering.id,
          payload: {
            classroomId: courseOffering.id,
            actorUserId: auth.userId,
            primaryTeacherId,
          },
        })

        return transaction.courseOffering.findUniqueOrThrow({
          where: {
            id: courseOffering.id,
          },
          include: getClassroomDetailInclude(),
        })
      })

      return toClassroomDetail(created as ClassroomWithRelations, auth)
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException("A classroom with that code or teacher scope already exists.")
      }

      throw error
    }
  }

  async updateClassroom(
    auth: AuthRequestContext,
    classroomId: string,
    request: UpdateClassroomRequest,
  ): Promise<ClassroomDetail> {
    const existing = await this.requireAccessibleClassroom(auth, classroomId)
    assertClassroomCanBeModified(existing.status)

    if (auth.activeRole === "TEACHER") {
      assertTeacherUpdateDoesNotChangeScope(request)
    }

    const nextScope: ClassroomScope = {
      semesterId: request.semesterId ?? existing.semesterId,
      classId: request.classId ?? existing.classId,
      sectionId: request.sectionId ?? existing.sectionId,
      subjectId: request.subjectId ?? existing.subjectId,
    }
    const nextPrimaryTeacherId =
      request.primaryTeacherId ??
      (auth.activeRole === "TEACHER" ? auth.userId : existing.primaryTeacherId)

    await assertClassroomUpdateAccess({
      assignmentsService: this.assignmentsService,
      auth,
      existing,
      primaryTeacherId: nextPrimaryTeacherId,
      scope: nextScope,
    })

    const semester = await this.semestersService.getSemesterRecordById(nextScope.semesterId)
    assertSemesterAllowsAcademicChanges(semester.status)
    const nextCourseCode =
      request.code !== undefined || request.courseCode !== undefined
        ? requireCourseCode(request)
        : null
    const nextClassroomTitle =
      request.displayTitle !== undefined || request.classroomTitle !== undefined
        ? requireClassroomTitle(request)
        : null

    try {
      const updated = await runInTransaction(this.database.prisma, async (transaction) => {
        await transaction.courseOffering.update({
          where: {
            id: classroomId,
          },
          data: {
            ...(request.semesterId !== undefined ? { semesterId: request.semesterId } : {}),
            ...(request.classId !== undefined ? { classId: request.classId } : {}),
            ...(request.sectionId !== undefined ? { sectionId: request.sectionId } : {}),
            ...(request.subjectId !== undefined ? { subjectId: request.subjectId } : {}),
            ...(request.primaryTeacherId !== undefined
              ? { primaryTeacherId: request.primaryTeacherId }
              : {}),
            ...(nextCourseCode !== null ? { code: nextCourseCode } : {}),
            ...(nextClassroomTitle !== null ? { displayTitle: nextClassroomTitle } : {}),
            ...(request.status !== undefined ? { status: request.status } : {}),
            ...(request.defaultAttendanceMode !== undefined
              ? { defaultAttendanceMode: request.defaultAttendanceMode }
              : {}),
            ...(request.defaultGpsRadiusMeters !== undefined
              ? { defaultGpsRadiusMeters: request.defaultGpsRadiusMeters }
              : {}),
            ...(request.defaultSessionDurationMinutes !== undefined
              ? { defaultSessionDurationMinutes: request.defaultSessionDurationMinutes }
              : {}),
            ...(request.qrRotationWindowSeconds !== undefined
              ? { qrRotationWindowSeconds: request.qrRotationWindowSeconds }
              : {}),
            ...(request.bluetoothRotationWindowSeconds !== undefined
              ? { bluetoothRotationWindowSeconds: request.bluetoothRotationWindowSeconds }
              : {}),
            ...(request.timezone !== undefined ? { timezone: request.timezone } : {}),
            ...(request.requiresTrustedDevice !== undefined
              ? { requiresTrustedDevice: request.requiresTrustedDevice }
              : {}),
          },
        })

        await queueOutboxEvent(transaction, {
          topic: "classroom.updated",
          aggregateType: "course_offering",
          aggregateId: classroomId,
          payload: {
            classroomId,
            actorUserId: auth.userId,
          },
        })

        return transaction.courseOffering.findUniqueOrThrow({
          where: {
            id: classroomId,
          },
          include: getClassroomDetailInclude(),
        })
      })

      return toClassroomDetail(updated as ClassroomWithRelations, auth)
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException("A classroom with that code or teacher scope already exists.")
      }

      throw error
    }
  }

  async archiveClassroom(
    auth: AuthRequestContext,
    classroomId: string,
    options: {
      adminReason?: string
    } = {},
  ): Promise<ClassroomDetail> {
    const existing = await this.requireAccessibleClassroom(auth, classroomId)

    if (existing.status === "ARCHIVED") {
      throw new BadRequestException("Archived classrooms cannot be archived again.")
    }
    const archivedAt = new Date()
    const archived = await runInTransaction(this.database.prisma, async (transaction) => {
      await transaction.courseOffering.update({
        where: {
          id: classroomId,
        },
        data: {
          status: "ARCHIVED",
          archivedAt,
        },
      })

      await transaction.classroomJoinCode.updateMany({
        where: {
          courseOfferingId: classroomId,
          status: "ACTIVE",
        },
        data: {
          status: "REVOKED",
          revokedAt: archivedAt,
        },
      })

      if (auth.activeRole === "ADMIN") {
        await recordAdministrativeActionTrail(transaction, {
          adminAction: {
            adminUserId: auth.userId,
            targetCourseOfferingId: classroomId,
            actionType: "CLASSROOM_ARCHIVE",
            metadata: {
              classroomId,
              previousStatus: existing.status,
              nextStatus: "ARCHIVED",
              archivedAt: archivedAt.toISOString(),
              ...(options.adminReason ? { reason: options.adminReason } : {}),
            },
          },
          outboxEvent: {
            topic: "classroom.archived",
            aggregateType: "course_offering",
            aggregateId: classroomId,
            payload: {
              classroomId,
              actorUserId: auth.userId,
              archivedAt: archivedAt.toISOString(),
            },
          },
        })
      } else {
        await queueOutboxEvent(transaction, {
          topic: "classroom.archived",
          aggregateType: "course_offering",
          aggregateId: classroomId,
          payload: {
            classroomId,
            actorUserId: auth.userId,
            archivedAt: archivedAt.toISOString(),
          },
        })
      }

      return transaction.courseOffering.findUniqueOrThrow({
        where: {
          id: classroomId,
        },
        include: getClassroomDetailInclude(),
      })
    })

    return toClassroomDetail(archived as ClassroomWithRelations, auth)
  }

  async requireAccessibleClassroom(
    auth: AuthRequestContext,
    classroomId: string,
  ): Promise<ClassroomAccessContext> {
    return requireAccessibleClassroom({
      database: this.database.prisma,
      assignmentsService: this.assignmentsService,
      auth,
      classroomId,
    })
  }
}
