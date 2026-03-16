import { BadRequestException, ForbiddenException } from "@nestjs/common"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@attendease/db", () => ({
  runInTransaction: vi.fn(async (client: unknown, callback: (transaction: unknown) => unknown) =>
    callback(client),
  ),
  queueOutboxEvent: vi.fn(
    async (transaction: { outboxEvent: { create: (args: unknown) => unknown } }, params: unknown) =>
      transaction.outboxEvent.create({ data: params }),
  ),
  recordAdministrativeActionTrail: vi.fn(
    async (
      transaction: {
        adminActionLog: { create: (args: unknown) => unknown }
        outboxEvent: { create: (args: unknown) => unknown }
      },
      params: {
        adminAction: unknown
        outboxEvent?: unknown
      },
    ) => ({
      adminAction: await transaction.adminActionLog.create({ data: params.adminAction }),
      outboxEvent: params.outboxEvent
        ? await transaction.outboxEvent.create({ data: params.outboxEvent })
        : null,
    }),
  ),
}))

import type { AuthRequestContext } from "../auth/auth.types.js"
import { ClassroomsService } from "./classrooms.service.js"

describe("ClassroomsService", () => {
  const database = {
    prisma: {
      courseOffering: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      classroomJoinCode: {
        create: vi.fn(),
        updateMany: vi.fn(),
      },
      adminActionLog: {
        create: vi.fn(),
      },
      outboxEvent: {
        create: vi.fn(),
      },
    },
  }

  const assignmentsService = {
    listTeacherAssignments: vi.fn(),
    ensureTeacherHasScope: vi.fn(),
    ensureTeacherCanCreateCourseOffering: vi.fn(),
    ensureTeacherCanManageCourseOffering: vi.fn(),
  }

  const semestersService = {
    getSemesterRecordById: vi.fn(),
  }

  const teacherAuth: AuthRequestContext = {
    userId: "teacher_1",
    sessionId: "session_teacher",
    activeRole: "TEACHER",
    availableRoles: ["TEACHER"],
    platform: "WEB",
    deviceId: null,
  }

  const adminAuth: AuthRequestContext = {
    userId: "admin_1",
    sessionId: "session_admin",
    activeRole: "ADMIN",
    availableRoles: ["ADMIN"],
    platform: "WEB",
    deviceId: null,
  }

  let service: ClassroomsService

  function buildClassroomRecord(
    overrides: Partial<{
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
      archivedAt: Date | null
      joinCodes: {
        id: string
        courseOfferingId: string
        code: string
        status: "ACTIVE" | "EXPIRED" | "REVOKED"
        expiresAt: Date
      }[]
    }> = {},
  ) {
    const id = overrides.id ?? "classroom_1"

    return {
      id,
      semesterId: overrides.semesterId ?? "semester_1",
      classId: overrides.classId ?? "class_1",
      sectionId: overrides.sectionId ?? "section_1",
      subjectId: overrides.subjectId ?? "subject_1",
      primaryTeacherId: overrides.primaryTeacherId ?? "teacher_1",
      createdByUserId: overrides.createdByUserId ?? "teacher_1",
      code: overrides.code ?? "CSE6-CHEM-A",
      displayTitle: overrides.displayTitle ?? "Chemistry Classroom",
      status: overrides.status ?? "DRAFT",
      defaultAttendanceMode: "QR_GPS" as const,
      defaultGpsRadiusMeters: 100,
      defaultSessionDurationMinutes: 15,
      qrRotationWindowSeconds: 15,
      bluetoothRotationWindowSeconds: 10,
      timezone: "Asia/Kolkata",
      requiresTrustedDevice: true,
      archivedAt: overrides.archivedAt ?? null,
      semester: {
        id: overrides.semesterId ?? "semester_1",
        code: "SEM6-2026",
        title: "Semester 6",
        status: "ACTIVE" as const,
        startDate: new Date("2026-07-01T00:00:00.000Z"),
        endDate: new Date("2026-12-01T00:00:00.000Z"),
      },
      academicClass: {
        id: overrides.classId ?? "class_1",
        code: "CSE6",
        title: "Computer Science 6",
      },
      section: {
        id: overrides.sectionId ?? "section_1",
        code: "A",
        title: "Section A",
      },
      subject: {
        id: overrides.subjectId ?? "subject_1",
        code: "CHEM101",
        title: "Chemistry",
      },
      primaryTeacher: {
        id: overrides.primaryTeacherId ?? "teacher_1",
        displayName: "Prof. Teacher",
      },
      joinCodes: overrides.joinCodes ?? [],
      scheduleSlots: [],
      scheduleExceptions: [],
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    service = new ClassroomsService(
      database as never,
      assignmentsService as never,
      semestersService as never,
    )
  })

  it("creates a teacher classroom inside assignment scope and seeds an active join code", async () => {
    semestersService.getSemesterRecordById.mockResolvedValue({
      id: "semester_1",
      status: "ACTIVE",
      endDate: new Date("2026-12-01T00:00:00.000Z"),
    })
    database.prisma.courseOffering.create.mockResolvedValue({
      id: "classroom_1",
    })
    database.prisma.classroomJoinCode.create.mockResolvedValue({
      id: "join_code_1",
      courseOfferingId: "classroom_1",
      code: "ABCD12",
      status: "ACTIVE",
      expiresAt: new Date("2026-12-01T23:59:59.999Z"),
    })
    database.prisma.courseOffering.findUniqueOrThrow.mockResolvedValue(
      buildClassroomRecord({
        joinCodes: [
          {
            id: "join_code_1",
            courseOfferingId: "classroom_1",
            code: "ABCD12",
            status: "ACTIVE",
            expiresAt: new Date("2026-12-01T23:59:59.999Z"),
          },
        ],
      }),
    )

    const classroom = await service.createClassroom(teacherAuth, {
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      courseCode: "CSE6-CHEM-A",
      classroomTitle: "Chemistry Classroom",
    })

    expect(assignmentsService.ensureTeacherCanCreateCourseOffering).toHaveBeenCalledWith(
      "teacher_1",
      expect.objectContaining({
        semesterId: "semester_1",
        classId: "class_1",
      }),
    )
    expect(classroom.activeJoinCode?.status).toBe("ACTIVE")
    expect(classroom.courseCode).toBe("CSE6-CHEM-A")
    expect(classroom.classroomTitle).toBe("Chemistry Classroom")
    expect(classroom.permissions).toEqual({
      canEdit: true,
      canArchive: true,
      canEditCourseInfo: true,
      canEditAcademicScope: false,
      canReassignTeacher: false,
    })
    expect(database.prisma.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          topic: "classroom.created",
          aggregateType: "course_offering",
        }),
      }),
    )
  })

  it("rejects teacher attempts to change classroom scope after creation", async () => {
    assignmentsService.ensureTeacherCanManageCourseOffering.mockResolvedValue({
      id: "assignment_1",
    })
    database.prisma.courseOffering.findUnique.mockResolvedValue({
      id: "classroom_1",
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      primaryTeacherId: "teacher_1",
      status: "ACTIVE",
      semester: {
        id: "semester_1",
        status: "ACTIVE",
        startDate: new Date("2026-07-01T00:00:00.000Z"),
        endDate: new Date("2026-12-01T00:00:00.000Z"),
      },
    })

    await expect(
      service.updateClassroom(teacherAuth, "classroom_1", {
        subjectId: "subject_2",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it("requires admins to target a teacher who still has scope for the classroom", async () => {
    semestersService.getSemesterRecordById.mockResolvedValue({
      id: "semester_1",
      status: "ACTIVE",
      endDate: new Date("2026-12-01T00:00:00.000Z"),
    })
    database.prisma.courseOffering.create.mockResolvedValue({
      id: "classroom_2",
    })
    database.prisma.classroomJoinCode.create.mockResolvedValue({
      id: "join_code_2",
      courseOfferingId: "classroom_2",
      code: "BCDE23",
      status: "ACTIVE",
      expiresAt: new Date("2026-12-01T23:59:59.999Z"),
    })
    database.prisma.courseOffering.findUniqueOrThrow.mockResolvedValue(
      buildClassroomRecord({
        id: "classroom_2",
        subjectId: "subject_2",
        primaryTeacherId: "teacher_2",
        createdByUserId: "admin_1",
        code: "CSE6-BIO-A",
        displayTitle: "Biology Classroom",
        joinCodes: [
          {
            id: "join_code_2",
            courseOfferingId: "classroom_2",
            code: "BCDE23",
            status: "ACTIVE",
            expiresAt: new Date("2026-12-01T23:59:59.999Z"),
          },
        ],
      }),
    )

    await service.createClassroom(adminAuth, {
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_2",
      primaryTeacherId: "teacher_2",
      courseCode: "CSE6-BIO-A",
      classroomTitle: "Biology Classroom",
    })

    expect(assignmentsService.ensureTeacherHasScope).toHaveBeenCalledWith(
      "teacher_2",
      expect.objectContaining({
        semesterId: "semester_1",
        subjectId: "subject_2",
      }),
    )
  })

  it("rejects classroom creation inside a closed semester", async () => {
    semestersService.getSemesterRecordById.mockResolvedValue({
      id: "semester_closed",
      status: "CLOSED",
      endDate: new Date("2026-12-01T00:00:00.000Z"),
    })

    await expect(
      service.createClassroom(teacherAuth, {
        semesterId: "semester_closed",
        classId: "class_1",
        sectionId: "section_1",
        subjectId: "subject_1",
        courseCode: "CSE6-HIST-A",
        classroomTitle: "History Classroom",
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it("rejects classroom updates that move into an archived semester", async () => {
    assignmentsService.ensureTeacherHasScope.mockResolvedValue({
      id: "assignment_admin_scope",
    })
    database.prisma.courseOffering.findUnique.mockResolvedValue({
      id: "classroom_1",
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      primaryTeacherId: "teacher_1",
      status: "ACTIVE",
      semester: {
        id: "semester_1",
        status: "ACTIVE",
        startDate: new Date("2026-07-01T00:00:00.000Z"),
        endDate: new Date("2026-12-01T00:00:00.000Z"),
      },
    })
    semestersService.getSemesterRecordById.mockResolvedValue({
      id: "semester_archived",
      status: "ARCHIVED",
      endDate: new Date("2026-12-20T00:00:00.000Z"),
    })

    await expect(
      service.updateClassroom(adminAuth, "classroom_1", {
        semesterId: "semester_archived",
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it("lets admins update course info and scope-facing metadata with admin permissions", async () => {
    assignmentsService.ensureTeacherHasScope.mockResolvedValue({
      id: "assignment_admin_scope",
    })
    database.prisma.courseOffering.findUnique.mockResolvedValue({
      id: "classroom_1",
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      primaryTeacherId: "teacher_1",
      status: "ACTIVE",
      semester: {
        id: "semester_1",
        status: "ACTIVE",
        startDate: new Date("2026-07-01T00:00:00.000Z"),
        endDate: new Date("2026-12-01T00:00:00.000Z"),
      },
    })
    semestersService.getSemesterRecordById.mockResolvedValue({
      id: "semester_1",
      status: "ACTIVE",
      endDate: new Date("2026-12-01T00:00:00.000Z"),
    })
    database.prisma.courseOffering.findUniqueOrThrow.mockResolvedValue(
      buildClassroomRecord({
        id: "classroom_1",
        subjectId: "subject_2",
        primaryTeacherId: "teacher_2",
        code: "CSE6-BIO-A",
        displayTitle: "Biology Classroom",
        status: "ACTIVE",
      }),
    )

    const updated = await service.updateClassroom(adminAuth, "classroom_1", {
      subjectId: "subject_2",
      primaryTeacherId: "teacher_2",
      courseCode: "CSE6-BIO-A",
      classroomTitle: "Biology Classroom",
      status: "ACTIVE",
    })

    expect(updated.courseCode).toBe("CSE6-BIO-A")
    expect(updated.classroomTitle).toBe("Biology Classroom")
    expect(updated.permissions).toEqual({
      canEdit: true,
      canArchive: true,
      canEditCourseInfo: true,
      canEditAcademicScope: true,
      canReassignTeacher: true,
    })
  })

  it("rejects attempts to archive an already archived classroom", async () => {
    assignmentsService.ensureTeacherCanManageCourseOffering.mockResolvedValue({
      id: "assignment_1",
    })
    database.prisma.courseOffering.findUnique.mockReset()
    database.prisma.courseOffering.findUnique.mockResolvedValue({
      id: "classroom_1",
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      primaryTeacherId: "teacher_1",
      status: "ARCHIVED",
      semester: {
        id: "semester_1",
        status: "ACTIVE",
        startDate: new Date("2026-07-01T00:00:00.000Z"),
        endDate: new Date("2026-12-01T00:00:00.000Z"),
      },
    })

    await expect(service.archiveClassroom(teacherAuth, "classroom_1")).rejects.toBeInstanceOf(
      BadRequestException,
    )
  })

  it("records an admin audit row when an admin archives a classroom", async () => {
    assignmentsService.ensureTeacherHasScope.mockResolvedValue({
      id: "assignment_admin_scope",
    })
    database.prisma.courseOffering.findUnique.mockResolvedValue({
      id: "classroom_1",
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      primaryTeacherId: "teacher_1",
      status: "ACTIVE",
      semester: {
        id: "semester_1",
        status: "ACTIVE",
        startDate: new Date("2026-07-01T00:00:00.000Z"),
        endDate: new Date("2026-12-01T00:00:00.000Z"),
      },
    })
    database.prisma.courseOffering.findUniqueOrThrow.mockResolvedValue(
      buildClassroomRecord({
        id: "classroom_1",
        status: "ARCHIVED",
        archivedAt: new Date("2026-03-15T09:30:00.000Z"),
      }),
    )

    const archived = await service.archiveClassroom(adminAuth, "classroom_1")

    expect(archived.status).toBe("ARCHIVED")
    expect(database.prisma.adminActionLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          adminUserId: "admin_1",
          targetCourseOfferingId: "classroom_1",
          actionType: "CLASSROOM_ARCHIVE",
        }),
      }),
    )
  })
})
