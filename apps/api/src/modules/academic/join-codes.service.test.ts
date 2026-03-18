import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@attendease/db", () => ({
  runInTransaction: vi.fn(async (client: unknown, callback: (transaction: unknown) => unknown) =>
    callback(client),
  ),
  queueOutboxEvent: vi.fn(
    async (transaction: { outboxEvent: { create: (args: unknown) => unknown } }, params: unknown) =>
      transaction.outboxEvent.create({ data: params }),
  ),
}))

import type { AuthRequestContext } from "../auth/auth.types.js"
import { JoinCodesService } from "./join-codes.service.js"

describe("JoinCodesService", () => {
  const database = {
    prisma: {
      classroomJoinCode: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      },
      enrollment: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      outboxEvent: {
        create: vi.fn(),
      },
      courseOffering: {
        updateMany: vi.fn(),
      },
    },
  }

  const classroomsService = {
    requireAccessibleClassroom: vi.fn(),
    activateIfDraft: vi.fn(),
  }

  const teacherAuth: AuthRequestContext = {
    userId: "teacher_1",
    sessionId: "session_teacher",
    activeRole: "TEACHER",
    availableRoles: ["TEACHER"],
    platform: "WEB",
    deviceId: null,
  }

  const studentAuth: AuthRequestContext = {
    userId: "student_1",
    sessionId: "session_student",
    activeRole: "STUDENT",
    availableRoles: ["STUDENT"],
    platform: "MOBILE",
    deviceId: "device_1",
  }

  let service: JoinCodesService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new JoinCodesService(database as never, classroomsService as never)

    classroomsService.requireAccessibleClassroom.mockResolvedValue({
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
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        endDate: new Date("2026-06-30T00:00:00.000Z"),
      },
    })
  })

  it("expires stale active join codes on lookup", async () => {
    database.prisma.classroomJoinCode.findFirst.mockResolvedValue({
      id: "join_1",
      courseOfferingId: "classroom_1",
      code: "ABCD12",
      status: "ACTIVE",
      expiresAt: new Date("2026-01-01T00:00:00.000Z"),
    })

    const joinCode = await service.getClassroomJoinCode(teacherAuth, "classroom_1")

    expect(joinCode).toBeNull()
    expect(database.prisma.classroomJoinCode.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "join_1",
        },
        data: {
          status: "EXPIRED",
        },
      }),
    )
  })

  it("resets the active join code and revokes the previous one", async () => {
    database.prisma.classroomJoinCode.findFirst.mockResolvedValue({
      id: "join_1",
      courseOfferingId: "classroom_1",
      code: "ABCD12",
      status: "ACTIVE",
      expiresAt: new Date("2026-06-29T23:59:59.999Z"),
    })
    database.prisma.classroomJoinCode.create.mockResolvedValue({
      id: "join_2",
      courseOfferingId: "classroom_1",
      code: "BCDE23",
      status: "ACTIVE",
      expiresAt: new Date("2026-06-30T23:59:59.999Z"),
    })

    const joinCode = await service.resetClassroomJoinCode(teacherAuth, "classroom_1", {})

    expect(joinCode.code).toBe("BCDE23")
    expect(joinCode.classroomId).toBe("classroom_1")
    expect(database.prisma.classroomJoinCode.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "join_1",
        },
        data: expect.objectContaining({
          status: "REVOKED",
        }),
      }),
    )
    expect(database.prisma.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          topic: "classroom.join_code.reset",
        }),
      }),
    )
  })

  it("activates a pending enrollment when a student joins with a valid code", async () => {
    database.prisma.classroomJoinCode.findUnique.mockResolvedValue({
      id: "join_1",
      code: "ABCD12",
      status: "ACTIVE",
      expiresAt: new Date("2026-06-30T23:59:59.999Z"),
      courseOffering: {
        id: "classroom_1",
        semesterId: "semester_1",
        classId: "class_1",
        sectionId: "section_1",
        subjectId: "subject_1",
        primaryTeacherId: "teacher_1",
        code: "CSE6-MATH-A",
        displayTitle: "Maths",
        status: "ACTIVE",
        defaultAttendanceMode: "QR_GPS",
        timezone: "Asia/Kolkata",
        requiresTrustedDevice: true,
        semester: {
          id: "semester_1",
          status: "ACTIVE",
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          endDate: new Date("2026-06-30T00:00:00.000Z"),
        },
      },
    })
    database.prisma.enrollment.findUnique.mockResolvedValue({
      id: "enrollment_1",
      status: "PENDING",
    })
    database.prisma.enrollment.update.mockResolvedValue({
      id: "enrollment_1",
      status: "ACTIVE",
      source: "IMPORT",
      joinedAt: new Date("2026-03-14T10:00:00.000Z"),
      droppedAt: null,
    })

    const membership = await service.joinClassroom(studentAuth, {
      code: "ABCD12",
    })

    expect(membership.classroomId).toBe("classroom_1")
    expect(membership.enrollmentId).toBe("enrollment_1")
    expect(membership.membershipId).toBe("enrollment_1")
    expect(membership.enrollmentStatus).toBe("ACTIVE")
    expect(membership.membershipStatus).toBe("ACTIVE")
    expect(database.prisma.classroomJoinCode.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "join_1",
        },
        data: expect.objectContaining({
          lastUsedAt: expect.any(Date),
        }),
      }),
    )
  })

  it("rejects duplicate, blocked, and dropped memberships on join", async () => {
    database.prisma.classroomJoinCode.findUnique.mockResolvedValue({
      id: "join_1",
      code: "ABCD12",
      status: "ACTIVE",
      expiresAt: new Date("2026-06-30T23:59:59.999Z"),
      courseOffering: {
        id: "classroom_1",
        semesterId: "semester_1",
        classId: "class_1",
        sectionId: "section_1",
        subjectId: "subject_1",
        primaryTeacherId: "teacher_1",
        code: "CSE6-MATH-A",
        displayTitle: "Maths",
        status: "ACTIVE",
        defaultAttendanceMode: "QR_GPS",
        timezone: "Asia/Kolkata",
        requiresTrustedDevice: true,
        semester: {
          id: "semester_1",
          status: "ACTIVE",
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          endDate: new Date("2026-06-30T00:00:00.000Z"),
        },
      },
    })
    database.prisma.enrollment.findUnique.mockResolvedValueOnce({
      id: "enrollment_1",
      status: "ACTIVE",
    })

    await expect(service.joinClassroom(studentAuth, { code: "ABCD12" })).rejects.toBeInstanceOf(
      ConflictException,
    )

    database.prisma.enrollment.findUnique.mockResolvedValueOnce({
      id: "enrollment_2",
      status: "BLOCKED",
    })

    await expect(service.joinClassroom(studentAuth, { code: "ABCD12" })).rejects.toBeInstanceOf(
      ForbiddenException,
    )

    database.prisma.enrollment.findUnique.mockResolvedValueOnce({
      id: "enrollment_3",
      status: "DROPPED",
    })

    await expect(service.joinClassroom(studentAuth, { code: "ABCD12" })).rejects.toBeInstanceOf(
      ForbiddenException,
    )
  })

  it("rejects join-code resets and joins when lifecycle state blocks membership changes", async () => {
    classroomsService.requireAccessibleClassroom.mockResolvedValueOnce({
      id: "classroom_1",
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      primaryTeacherId: "teacher_1",
      status: "COMPLETED",
      semester: {
        id: "semester_1",
        status: "ACTIVE",
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        endDate: new Date("2026-06-30T00:00:00.000Z"),
      },
    })

    await expect(
      service.resetClassroomJoinCode(teacherAuth, "classroom_1", {}),
    ).rejects.toBeInstanceOf(BadRequestException)

    database.prisma.classroomJoinCode.findUnique.mockResolvedValue({
      id: "join_1",
      code: "ABCD12",
      status: "ACTIVE",
      expiresAt: new Date("2026-06-30T23:59:59.999Z"),
      courseOffering: {
        id: "classroom_1",
        semesterId: "semester_1",
        classId: "class_1",
        sectionId: "section_1",
        subjectId: "subject_1",
        primaryTeacherId: "teacher_1",
        code: "CSE6-MATH-A",
        displayTitle: "Maths",
        status: "ACTIVE",
        defaultAttendanceMode: "QR_GPS",
        timezone: "Asia/Kolkata",
        requiresTrustedDevice: true,
        semester: {
          id: "semester_1",
          status: "CLOSED",
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          endDate: new Date("2026-06-30T00:00:00.000Z"),
        },
      },
    })

    await expect(service.joinClassroom(studentAuth, { code: "ABCD12" })).rejects.toBeInstanceOf(
      BadRequestException,
    )
  })
})
