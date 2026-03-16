import {
  type ClassroomDetail,
  type ClassroomListQuery,
  type ClassroomSummary,
  type CreateClassroomRequest,
  type ScheduleExceptionSummary,
  type ScheduleSlotSummary,
  type UpdateClassroomRequest,
  classroomDetailSchema,
  classroomJoinCodeSummarySchema,
  classroomSummarySchema,
  scheduleExceptionSummarySchema,
  scheduleSlotSummarySchema,
} from "@attendease/contracts"
import {
  type Prisma,
  type PrismaTransactionClient,
  queueOutboxEvent,
  recordAdministrativeActionTrail,
  runInTransaction,
} from "@attendease/db"
import {
  deriveClassroomCrudPermissions,
  resolveClassroomTitle,
  resolveCourseCode,
} from "@attendease/domain"
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
  createActiveJoinCodeWithRetries,
  isUniqueConstraintError,
  toInclusiveDayEnd,
} from "./academic.helpers.js"
import { AssignmentsService } from "./assignments.service.js"
import { SemestersService } from "./semesters.service.js"

type ClassroomWithRelations = {
  id: string
  semesterId: string
  classId: string
  sectionId: string
  subjectId: string
  primaryTeacherId: string
  createdByUserId: string
  code: string
  displayTitle: string
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED"
  defaultAttendanceMode: "QR_GPS" | "BLUETOOTH" | "MANUAL"
  defaultGpsRadiusMeters: number
  defaultSessionDurationMinutes: number
  qrRotationWindowSeconds: number
  bluetoothRotationWindowSeconds: number
  timezone: string
  requiresTrustedDevice: boolean
  archivedAt: Date | null
  semester?: {
    id: string
    code: string
    title: string
    status: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED"
    startDate: Date
    endDate: Date
  }
  academicClass?: {
    id: string
    code: string
    title: string
  }
  section?: {
    id: string
    code: string
    title: string
  }
  subject?: {
    id: string
    code: string
    title: string
  }
  primaryTeacher?: {
    id: string
    displayName: string
  }
  joinCodes: {
    id: string
    courseOfferingId: string
    code: string
    status: "ACTIVE" | "EXPIRED" | "REVOKED"
    expiresAt: Date
  }[]
  scheduleSlots?: {
    id: string
    courseOfferingId: string
    weekday: number
    startMinutes: number
    endMinutes: number
    locationLabel: string | null
    status: "ACTIVE" | "ARCHIVED"
  }[]
  scheduleExceptions?: {
    id: string
    courseOfferingId: string
    scheduleSlotId: string | null
    exceptionType: "CANCELLED" | "RESCHEDULED" | "ONE_OFF"
    effectiveDate: Date
    startMinutes: number | null
    endMinutes: number | null
    locationLabel: string | null
    reason: string | null
  }[]
}

export type ClassroomAccessContext = {
  id: string
  semesterId: string
  classId: string
  sectionId: string
  subjectId: string
  primaryTeacherId: string
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED"
  semester: {
    id: string
    status: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED"
    startDate: Date
    endDate: Date
  }
}

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
        ? {
            ...(filters.semesterId ? { semesterId: filters.semesterId } : {}),
            ...(filters.classId ? { classId: filters.classId } : {}),
            ...(filters.sectionId ? { sectionId: filters.sectionId } : {}),
            ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
            ...(filters.status ? { status: filters.status } : {}),
            ...(filters.primaryTeacherId ? { primaryTeacherId: filters.primaryTeacherId } : {}),
          }
        : await this.buildTeacherClassroomWhere(auth.userId, filters)

    if (where === null) {
      return []
    }

    const classrooms = await this.database.prisma.courseOffering.findMany({
      where,
      include: this.getClassroomSummaryInclude(),
      orderBy: [{ status: "asc" }, { displayTitle: "asc" }],
    })

    return classrooms.map((classroom) => this.toClassroomSummary(classroom, auth))
  }

  async getClassroom(auth: AuthRequestContext, classroomId: string): Promise<ClassroomDetail> {
    await this.requireAccessibleClassroom(auth, classroomId)

    const classroom = await this.database.prisma.courseOffering.findUnique({
      where: {
        id: classroomId,
      },
      include: this.getClassroomDetailInclude(),
    })

    if (!classroom) {
      throw new NotFoundException("Classroom not found.")
    }

    return this.toClassroomDetail(classroom, auth, {
      includeJoinCode: auth.activeRole !== "STUDENT",
    })
  }

  async createClassroom(
    auth: AuthRequestContext,
    request: CreateClassroomRequest,
  ): Promise<ClassroomDetail> {
    const primaryTeacherId = this.resolvePrimaryTeacherId(auth, request.primaryTeacherId)
    const scope = {
      semesterId: request.semesterId,
      classId: request.classId,
      sectionId: request.sectionId,
      subjectId: request.subjectId,
    }

    await this.assertClassroomCreationAccess(auth, primaryTeacherId, scope)
    const semester = await this.semestersService.getSemesterRecordById(request.semesterId)
    this.assertSemesterAllowsAcademicChanges(semester.status)
    const courseCode = this.requireCourseCode(request)
    const classroomTitle = this.requireClassroomTitle(request)

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

        const joinCode = await this.createActiveJoinCode(transaction, {
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
          include: this.getClassroomDetailInclude(),
        })
      })

      return this.toClassroomDetail(created, auth)
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
    this.assertClassroomCanBeModified(existing.status)

    if (auth.activeRole === "TEACHER") {
      this.assertTeacherUpdateDoesNotChangeScope(request)
    }

    const nextScope = {
      semesterId: request.semesterId ?? existing.semesterId,
      classId: request.classId ?? existing.classId,
      sectionId: request.sectionId ?? existing.sectionId,
      subjectId: request.subjectId ?? existing.subjectId,
    }
    const nextPrimaryTeacherId =
      request.primaryTeacherId ??
      (auth.activeRole === "TEACHER" ? auth.userId : existing.primaryTeacherId)

    await this.assertClassroomUpdateAccess(auth, existing, nextPrimaryTeacherId, nextScope)
    const semester = await this.semestersService.getSemesterRecordById(nextScope.semesterId)
    this.assertSemesterAllowsAcademicChanges(semester.status)
    const nextCourseCode =
      request.code !== undefined || request.courseCode !== undefined
        ? this.requireCourseCode(request)
        : null
    const nextClassroomTitle =
      request.displayTitle !== undefined || request.classroomTitle !== undefined
        ? this.requireClassroomTitle(request)
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
          include: this.getClassroomDetailInclude(),
        })
      })

      return this.toClassroomDetail(updated, auth)
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
        include: this.getClassroomDetailInclude(),
      })
    })

    return this.toClassroomDetail(archived, auth)
  }

  async requireAccessibleClassroom(
    auth: AuthRequestContext,
    classroomId: string,
  ): Promise<ClassroomAccessContext> {
    if (auth.activeRole === "TEACHER") {
      await this.assignmentsService.ensureTeacherCanManageCourseOffering(auth.userId, classroomId)
    } else if (auth.activeRole === "STUDENT") {
      const enrollment = await this.database.prisma.enrollment.findFirst({
        where: {
          courseOfferingId: classroomId,
          studentId: auth.userId,
          status: {
            in: ["ACTIVE", "PENDING"],
          },
        },
        select: {
          id: true,
        },
      })

      if (!enrollment) {
        throw new ForbiddenException("Students can only access classrooms they belong to.")
      }
    } else if (auth.activeRole !== "ADMIN") {
      throw new ForbiddenException("Only teachers and admins can access classrooms.")
    }

    const classroom = await this.database.prisma.courseOffering.findUnique({
      where: {
        id: classroomId,
      },
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
    })

    if (!classroom) {
      throw new NotFoundException("Classroom not found.")
    }

    return {
      id: classroom.id,
      semesterId: classroom.semesterId,
      classId: classroom.classId,
      sectionId: classroom.sectionId,
      subjectId: classroom.subjectId,
      primaryTeacherId: classroom.primaryTeacherId,
      status: classroom.status,
      semester: classroom.semester,
    }
  }

  private async buildTeacherClassroomWhere(teacherId: string, filters: ClassroomListQuery) {
    const assignments = await this.assignmentsService.listTeacherAssignments(teacherId, {
      ...(filters.semesterId ? { semesterId: filters.semesterId } : {}),
      ...(filters.classId ? { classId: filters.classId } : {}),
      ...(filters.sectionId ? { sectionId: filters.sectionId } : {}),
      ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
    })

    if (assignments.length === 0) {
      return null
    }

    return {
      primaryTeacherId: teacherId,
      ...(filters.status ? { status: filters.status } : {}),
      OR: assignments.map((assignment) => ({
        semesterId: assignment.semesterId,
        classId: assignment.classId,
        sectionId: assignment.sectionId,
        subjectId: assignment.subjectId,
      })),
    }
  }

  private resolvePrimaryTeacherId(auth: AuthRequestContext, requestedTeacherId?: string) {
    if (auth.activeRole === "TEACHER") {
      if (requestedTeacherId && requestedTeacherId !== auth.userId) {
        throw new ForbiddenException("Teachers can create classrooms only for themselves.")
      }

      return auth.userId
    }

    if (auth.activeRole === "ADMIN") {
      if (!requestedTeacherId) {
        throw new BadRequestException(
          "Primary teacher id is required for admin classroom creation.",
        )
      }

      return requestedTeacherId
    }

    throw new ForbiddenException("Only teachers and admins can create classrooms.")
  }

  private async assertClassroomCreationAccess(
    auth: AuthRequestContext,
    primaryTeacherId: string,
    scope: {
      semesterId: string
      classId: string
      sectionId: string
      subjectId: string
    },
  ) {
    if (auth.activeRole === "TEACHER") {
      await this.assignmentsService.ensureTeacherCanCreateCourseOffering(auth.userId, scope)
      return
    }

    if (auth.activeRole === "ADMIN") {
      await this.assignmentsService.ensureTeacherHasScope(primaryTeacherId, scope)
      return
    }

    throw new ForbiddenException("Only teachers and admins can create classrooms.")
  }

  private async assertClassroomUpdateAccess(
    auth: AuthRequestContext,
    existing: ClassroomAccessContext,
    primaryTeacherId: string,
    scope: {
      semesterId: string
      classId: string
      sectionId: string
      subjectId: string
    },
  ) {
    if (auth.activeRole === "TEACHER") {
      if (primaryTeacherId !== auth.userId) {
        throw new ForbiddenException("Teachers cannot reassign classroom ownership.")
      }

      await this.assignmentsService.ensureTeacherCanManageCourseOffering(auth.userId, existing.id)
      return
    }

    if (auth.activeRole === "ADMIN") {
      await this.assignmentsService.ensureTeacherHasScope(primaryTeacherId, scope)
      return
    }

    throw new ForbiddenException("Only teachers and admins can update classrooms.")
  }

  private assertTeacherUpdateDoesNotChangeScope(request: UpdateClassroomRequest) {
    if (
      request.semesterId !== undefined ||
      request.classId !== undefined ||
      request.sectionId !== undefined ||
      request.subjectId !== undefined ||
      request.primaryTeacherId !== undefined
    ) {
      throw new ForbiddenException(
        "Teachers cannot change classroom scope or primary ownership after creation.",
      )
    }
  }

  private assertSemesterAllowsAcademicChanges(status: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED") {
    if (status === "CLOSED" || status === "ARCHIVED") {
      throw new BadRequestException(
        "Classroom and lecture changes are not allowed in closed or archived semesters.",
      )
    }
  }

  private assertClassroomCanBeModified(status: ClassroomAccessContext["status"]) {
    if (status === "ARCHIVED") {
      throw new BadRequestException("Archived classrooms cannot be modified.")
    }
  }

  private async createActiveJoinCode(
    transaction: PrismaTransactionClient,
    params: {
      courseOfferingId: string
      createdByUserId: string
      expiresAt: Date
    },
  ) {
    return createActiveJoinCodeWithRetries(transaction, params)
  }

  private getClassroomSummaryInclude(): Prisma.CourseOfferingInclude {
    return {
      joinCodes: {
        where: {
          status: "ACTIVE" as const,
        },
        orderBy: {
          createdAt: "desc" as const,
        },
        take: 1,
      },
      semester: {
        select: {
          id: true,
          code: true,
          title: true,
          status: true,
          startDate: true,
          endDate: true,
        },
      },
      academicClass: {
        select: {
          id: true,
          code: true,
          title: true,
        },
      },
      section: {
        select: {
          id: true,
          code: true,
          title: true,
        },
      },
      subject: {
        select: {
          id: true,
          code: true,
          title: true,
        },
      },
      primaryTeacher: {
        select: {
          id: true,
          displayName: true,
        },
      },
    }
  }

  private getClassroomDetailInclude(): Prisma.CourseOfferingInclude {
    return {
      ...this.getClassroomSummaryInclude(),
      scheduleSlots: {
        orderBy: [{ weekday: "asc" as const }, { startMinutes: "asc" as const }],
      },
      scheduleExceptions: {
        orderBy: [{ effectiveDate: "asc" as const }, { startMinutes: "asc" as const }],
      },
    }
  }

  private requireCourseCode(input: {
    code?: string | undefined
    courseCode?: string | undefined
  }) {
    const courseCode = resolveCourseCode({
      code: input.code ?? null,
      courseCode: input.courseCode ?? null,
    })

    if (!courseCode) {
      throw new BadRequestException("Course code is required.")
    }

    return courseCode
  }

  private requireClassroomTitle(input: {
    displayTitle?: string | undefined
    classroomTitle?: string | undefined
  }) {
    const classroomTitle = resolveClassroomTitle({
      displayTitle: input.displayTitle ?? null,
      classroomTitle: input.classroomTitle ?? null,
    })

    if (!classroomTitle) {
      throw new BadRequestException("Classroom title is required.")
    }

    return classroomTitle
  }

  private toJoinCodeSummary(
    input: {
      id: string
      courseOfferingId: string
      code: string
      status: "ACTIVE" | "EXPIRED" | "REVOKED"
      expiresAt: Date
    } | null,
  ) {
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

  private toClassroomSummary(
    input: ClassroomWithRelations,
    auth: Pick<AuthRequestContext, "activeRole">,
    options: {
      includeJoinCode?: boolean
    } = {},
  ): ClassroomSummary {
    return classroomSummarySchema.parse({
      id: input.id,
      semesterId: input.semesterId,
      classId: input.classId,
      sectionId: input.sectionId,
      subjectId: input.subjectId,
      primaryTeacherId: input.primaryTeacherId,
      primaryTeacherDisplayName: input.primaryTeacher?.displayName ?? null,
      createdByUserId: input.createdByUserId,
      code: input.code,
      courseCode: input.code,
      displayTitle: input.displayTitle,
      classroomTitle: input.displayTitle,
      semesterCode: input.semester?.code ?? null,
      semesterTitle: input.semester?.title ?? null,
      classCode: input.academicClass?.code ?? null,
      classTitle: input.academicClass?.title ?? null,
      sectionCode: input.section?.code ?? null,
      sectionTitle: input.section?.title ?? null,
      subjectCode: input.subject?.code ?? null,
      subjectTitle: input.subject?.title ?? null,
      status: input.status,
      defaultAttendanceMode: input.defaultAttendanceMode,
      defaultGpsRadiusMeters: input.defaultGpsRadiusMeters,
      defaultSessionDurationMinutes: input.defaultSessionDurationMinutes,
      qrRotationWindowSeconds: input.qrRotationWindowSeconds,
      bluetoothRotationWindowSeconds: input.bluetoothRotationWindowSeconds,
      timezone: input.timezone,
      requiresTrustedDevice: input.requiresTrustedDevice,
      archivedAt: input.archivedAt?.toISOString() ?? null,
      activeJoinCode:
        options.includeJoinCode === false
          ? null
          : this.toJoinCodeSummary(input.joinCodes[0] ?? null),
      permissions: deriveClassroomCrudPermissions({
        role: auth.activeRole,
        status: input.status,
      }),
    })
  }

  private toClassroomDetail(
    input: ClassroomWithRelations,
    auth: Pick<AuthRequestContext, "activeRole">,
    options: {
      includeJoinCode?: boolean
    } = {},
  ): ClassroomDetail {
    return classroomDetailSchema.parse({
      ...this.toClassroomSummary(input, auth, options),
      scheduleSlots: (input.scheduleSlots ?? []).map((slot) => this.toScheduleSlotSummary(slot)),
      scheduleExceptions: (input.scheduleExceptions ?? []).map((exception) =>
        this.toScheduleExceptionSummary(exception),
      ),
    })
  }
}
