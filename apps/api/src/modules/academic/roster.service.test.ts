import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common"
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
import { RosterService } from "./roster.service.js"

describe("RosterService", () => {
  const database = {
    prisma: {
      enrollment: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      user: {
        findFirst: vi.fn(),
      },
      adminActionLog: {
        create: vi.fn(),
      },
      outboxEvent: {
        create: vi.fn(),
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

  const adminAuth: AuthRequestContext = {
    userId: "admin_1",
    sessionId: "session_admin",
    activeRole: "ADMIN",
    availableRoles: ["ADMIN"],
    platform: "WEB",
    deviceId: null,
  }

  let service: RosterService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new RosterService(database as never, classroomsService as never)

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

  it("lists classroom roster members with student metadata", async () => {
    database.prisma.enrollment.findMany.mockResolvedValue([
      {
        id: "enrollment_1",
        courseOfferingId: "classroom_1",
        studentId: "student_1",
        semesterId: "semester_1",
        classId: "class_1",
        sectionId: "section_1",
        subjectId: "subject_1",
        status: "ACTIVE",
        source: "JOIN_CODE",
        joinedAt: new Date("2026-03-14T09:00:00.000Z"),
        droppedAt: null,
        student: {
          email: "student.one@attendease.dev",
          displayName: "Student One",
          status: "ACTIVE",
          studentProfile: {
            rollNumber: "23CS001",
            universityId: "UNI001",
            attendanceDisabled: false,
          },
        },
      },
    ])

    const roster = await service.listClassroomRoster(teacherAuth, "classroom_1", {})

    expect(roster).toHaveLength(1)
    expect(roster[0]?.classroomId).toBe("classroom_1")
    expect(roster[0]?.membershipId).toBe("enrollment_1")
    expect(roster[0]?.studentEmail).toBe("student.one@attendease.dev")
    expect(roster[0]?.studentName).toBe("Student One")
    expect(roster[0]?.studentIdentifier).toBe("23CS001")
    expect(roster[0]?.membershipState).toBe("ACTIVE")
    expect(roster[0]?.actions).toEqual({
      canBlock: true,
      canRemove: true,
      canReactivate: false,
    })
    expect(roster[0]?.rollNumber).toBe("23CS001")
  })

  it("adds a manual roster member by identifier and emits an outbox event", async () => {
    database.prisma.user.findFirst.mockResolvedValue({
      id: "student_1",
      email: "student.one@attendease.dev",
      displayName: "Student One",
      status: "ACTIVE",
      studentProfile: {
        rollNumber: "23CS001",
        universityId: "UNI001",
        attendanceDisabled: false,
      },
    })
    database.prisma.enrollment.findUnique.mockResolvedValue(null)
    database.prisma.enrollment.create.mockResolvedValue({
      id: "enrollment_1",
      courseOfferingId: "classroom_1",
      studentId: "student_1",
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      status: "ACTIVE",
      source: "MANUAL",
      joinedAt: new Date("2026-03-14T09:00:00.000Z"),
      droppedAt: null,
      student: {
        email: "student.one@attendease.dev",
        displayName: "Student One",
        status: "ACTIVE",
        studentProfile: {
          rollNumber: "23CS001",
          universityId: "UNI001",
          attendanceDisabled: false,
        },
      },
    })

    const rosterMember = await service.addClassroomRosterMember(teacherAuth, "classroom_1", {
      studentIdentifier: "23CS001",
    })

    expect(rosterMember.status).toBe("ACTIVE")
    expect(rosterMember.membershipStatus).toBe("ACTIVE")
    expect(rosterMember.studentIdentifier).toBe("23CS001")
    expect(rosterMember.source).toBe("MANUAL")
    expect(rosterMember.membershipSource).toBe("MANUAL")
    expect(database.prisma.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          topic: "classroom.roster.member_added",
        }),
      }),
    )
  })

  it("reactivates dropped or pending enrollments and blocks active or blocked duplicates", async () => {
    database.prisma.user.findFirst.mockResolvedValue({
      id: "student_1",
      email: "student.one@attendease.dev",
      displayName: "Student One",
      status: "ACTIVE",
      studentProfile: {
        rollNumber: "23CS001",
        universityId: "UNI001",
        attendanceDisabled: false,
      },
    })
    database.prisma.enrollment.findUnique.mockResolvedValueOnce({
      id: "enrollment_pending",
      status: "PENDING",
      student: {
        email: "student.one@attendease.dev",
        displayName: "Student One",
        status: "ACTIVE",
        studentProfile: {
          rollNumber: "23CS001",
          universityId: "UNI001",
          attendanceDisabled: false,
        },
      },
    })
    database.prisma.enrollment.update.mockResolvedValueOnce({
      id: "enrollment_pending",
      courseOfferingId: "classroom_1",
      studentId: "student_1",
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      status: "ACTIVE",
      source: "MANUAL",
      joinedAt: new Date("2026-03-14T09:00:00.000Z"),
      droppedAt: null,
      student: {
        email: "student.one@attendease.dev",
        displayName: "Student One",
        status: "ACTIVE",
        studentProfile: {
          rollNumber: "23CS001",
          universityId: "UNI001",
          attendanceDisabled: false,
        },
      },
    })

    const reactivated = await service.addClassroomRosterMember(teacherAuth, "classroom_1", {
      studentId: "student_1",
    })
    expect(reactivated.status).toBe("ACTIVE")

    database.prisma.enrollment.findUnique.mockResolvedValueOnce({
      id: "enrollment_active",
      status: "ACTIVE",
    })

    await expect(
      service.addClassroomRosterMember(teacherAuth, "classroom_1", {
        studentId: "student_1",
      }),
    ).rejects.toBeInstanceOf(ConflictException)

    database.prisma.enrollment.findUnique.mockResolvedValueOnce({
      id: "enrollment_blocked",
      status: "BLOCKED",
    })

    await expect(
      service.addClassroomRosterMember(teacherAuth, "classroom_1", {
        studentId: "student_1",
      }),
    ).rejects.toBeInstanceOf(ConflictException)
  })

  it("updates roster membership state and tracks droppedAt", async () => {
    database.prisma.enrollment.findFirst.mockResolvedValue({
      id: "enrollment_1",
      courseOfferingId: "classroom_1",
      studentId: "student_1",
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      status: "ACTIVE",
      source: "JOIN_CODE",
      joinedAt: new Date("2026-03-14T09:00:00.000Z"),
      droppedAt: null,
      student: {
        email: "student.one@attendease.dev",
        displayName: "Student One",
        status: "ACTIVE",
        studentProfile: {
          rollNumber: "23CS001",
          universityId: "UNI001",
          attendanceDisabled: false,
        },
      },
    })
    database.prisma.enrollment.update.mockResolvedValue({
      id: "enrollment_1",
      courseOfferingId: "classroom_1",
      studentId: "student_1",
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      status: "DROPPED",
      source: "JOIN_CODE",
      joinedAt: new Date("2026-03-14T09:00:00.000Z"),
      droppedAt: new Date("2026-03-15T09:00:00.000Z"),
      student: {
        email: "student.one@attendease.dev",
        displayName: "Student One",
        status: "ACTIVE",
        studentProfile: {
          rollNumber: "23CS001",
          universityId: "UNI001",
          attendanceDisabled: false,
        },
      },
    })

    const rosterMember = await service.updateClassroomRosterMember(
      teacherAuth,
      "classroom_1",
      "enrollment_1",
      {
        status: "DROPPED",
      },
    )

    expect(rosterMember.status).toBe("DROPPED")
    expect(rosterMember.droppedAt).not.toBeNull()
    expect(rosterMember.membershipState).toBe("DROPPED")
    expect(rosterMember.actions).toEqual({
      canBlock: false,
      canRemove: false,
      canReactivate: true,
    })
  })

  it("treats admin status changes to dropped as the same audited remove lifecycle", async () => {
    database.prisma.enrollment.findFirst.mockResolvedValue({
      id: "enrollment_1",
      courseOfferingId: "classroom_1",
      studentId: "student_1",
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      status: "ACTIVE",
      source: "JOIN_CODE",
      joinedAt: new Date("2026-03-14T09:00:00.000Z"),
      droppedAt: null,
      student: {
        email: "student.one@attendease.dev",
        displayName: "Student One",
        status: "ACTIVE",
        studentProfile: {
          rollNumber: "23CS001",
          universityId: "UNI001",
          attendanceDisabled: false,
        },
      },
    })
    database.prisma.enrollment.update.mockResolvedValue({
      id: "enrollment_1",
      courseOfferingId: "classroom_1",
      studentId: "student_1",
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      status: "DROPPED",
      source: "JOIN_CODE",
      joinedAt: new Date("2026-03-14T09:00:00.000Z"),
      droppedAt: new Date("2026-03-15T09:00:00.000Z"),
      student: {
        email: "student.one@attendease.dev",
        displayName: "Student One",
        status: "ACTIVE",
        studentProfile: {
          rollNumber: "23CS001",
          universityId: "UNI001",
          attendanceDisabled: false,
        },
      },
    })

    const rosterMember = await service.updateClassroomRosterMember(
      adminAuth,
      "classroom_1",
      "enrollment_1",
      {
        membershipStatus: "DROPPED",
      },
    )

    expect(rosterMember.membershipState).toBe("DROPPED")
    expect(database.prisma.adminActionLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          adminUserId: "admin_1",
          targetUserId: "student_1",
          targetCourseOfferingId: "classroom_1",
          actionType: "CLASSROOM_STUDENT_REMOVE",
          metadata: expect.objectContaining({
            source: "STATUS_UPDATE",
          }),
        }),
      }),
    )
  })

  it("removes a classroom student through the dedicated delete lifecycle", async () => {
    database.prisma.enrollment.findFirst.mockResolvedValue({
      id: "enrollment_1",
      courseOfferingId: "classroom_1",
      studentId: "student_1",
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      status: "BLOCKED",
      source: "MANUAL",
      joinedAt: new Date("2026-03-14T09:00:00.000Z"),
      droppedAt: null,
      student: {
        email: "student.one@attendease.dev",
        displayName: "Student One",
        status: "ACTIVE",
        studentProfile: {
          rollNumber: "23CS001",
          universityId: "UNI001",
          attendanceDisabled: false,
        },
      },
    })
    database.prisma.enrollment.update.mockResolvedValue({
      id: "enrollment_1",
      courseOfferingId: "classroom_1",
      studentId: "student_1",
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      status: "DROPPED",
      source: "MANUAL",
      joinedAt: new Date("2026-03-14T09:00:00.000Z"),
      droppedAt: new Date("2026-03-15T09:00:00.000Z"),
      student: {
        email: "student.one@attendease.dev",
        displayName: "Student One",
        status: "ACTIVE",
        studentProfile: {
          rollNumber: "23CS001",
          universityId: "UNI001",
          attendanceDisabled: false,
        },
      },
    })

    const removedMember = await service.removeClassroomRosterMember(
      teacherAuth,
      "classroom_1",
      "enrollment_1",
    )

    expect(removedMember.status).toBe("DROPPED")
    expect(removedMember.droppedAt).not.toBeNull()
    expect(database.prisma.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          topic: "classroom.roster.member_removed",
        }),
      }),
    )
  })

  it("records an admin audit row when an admin removes a classroom student", async () => {
    database.prisma.enrollment.findFirst.mockResolvedValue({
      id: "enrollment_1",
      courseOfferingId: "classroom_1",
      studentId: "student_1",
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      status: "ACTIVE",
      source: "MANUAL",
      joinedAt: new Date("2026-03-14T09:00:00.000Z"),
      droppedAt: null,
      student: {
        email: "student.one@attendease.dev",
        displayName: "Student One",
        status: "ACTIVE",
        studentProfile: {
          rollNumber: "23CS001",
          universityId: "UNI001",
          attendanceDisabled: false,
        },
      },
    })
    database.prisma.enrollment.update.mockResolvedValue({
      id: "enrollment_1",
      courseOfferingId: "classroom_1",
      studentId: "student_1",
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      status: "DROPPED",
      source: "MANUAL",
      joinedAt: new Date("2026-03-14T09:00:00.000Z"),
      droppedAt: new Date("2026-03-15T09:00:00.000Z"),
      student: {
        email: "student.one@attendease.dev",
        displayName: "Student One",
        status: "ACTIVE",
        studentProfile: {
          rollNumber: "23CS001",
          universityId: "UNI001",
          attendanceDisabled: false,
        },
      },
    })

    const removedMember = await service.removeClassroomRosterMember(
      adminAuth,
      "classroom_1",
      "enrollment_1",
    )

    expect(removedMember.membershipState).toBe("DROPPED")
    expect(database.prisma.adminActionLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          adminUserId: "admin_1",
          targetUserId: "student_1",
          targetCourseOfferingId: "classroom_1",
          actionType: "CLASSROOM_STUDENT_REMOVE",
        }),
      }),
    )
  })

  it("rejects roster changes when lifecycle rules or student state make them unsafe", async () => {
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
      service.addClassroomRosterMember(teacherAuth, "classroom_1", {
        studentId: "student_1",
      }),
    ).rejects.toBeInstanceOf(BadRequestException)

    classroomsService.requireAccessibleClassroom.mockResolvedValueOnce({
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
    database.prisma.user.findFirst.mockResolvedValue({
      id: "student_1",
      email: "student.one@attendease.dev",
      displayName: "Student One",
      status: "BLOCKED",
      studentProfile: {
        rollNumber: "23CS001",
        universityId: "UNI001",
        attendanceDisabled: false,
      },
    })

    await expect(
      service.addClassroomRosterMember(teacherAuth, "classroom_1", {
        studentId: "student_1",
      }),
    ).rejects.toBeInstanceOf(BadRequestException)

    database.prisma.enrollment.findFirst.mockResolvedValue(null)
    await expect(
      service.updateClassroomRosterMember(teacherAuth, "classroom_1", "missing", {
        status: "BLOCKED",
      }),
    ).rejects.toBeInstanceOf(NotFoundException)
  })
})
