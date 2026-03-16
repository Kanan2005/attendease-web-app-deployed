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
}))

import type { AuthRequestContext } from "../auth/auth.types.js"
import { AnnouncementsService } from "./announcements.service.js"

describe("AnnouncementsService", () => {
  const database = {
    prisma: {
      enrollment: {
        findFirst: vi.fn(),
      },
      announcementPost: {
        findMany: vi.fn(),
        create: vi.fn(),
      },
      outboxEvent: {
        create: vi.fn(),
      },
    },
  }

  const classroomsService = {
    requireAccessibleClassroom: vi.fn(),
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

  let service: AnnouncementsService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new AnnouncementsService(database as never, classroomsService as never)

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

  it("limits student stream access to membership scope and student-visible posts", async () => {
    database.prisma.enrollment.findFirst.mockResolvedValueOnce({
      id: "enrollment_1",
    })
    database.prisma.announcementPost.findMany.mockResolvedValueOnce([
      {
        id: "announcement_1",
        courseOfferingId: "classroom_1",
        authorUserId: "teacher_1",
        postType: "ANNOUNCEMENT",
        visibility: "STUDENT_AND_TEACHER",
        title: "Quiz reminder",
        body: "Bring your notebook tomorrow.",
        shouldNotify: true,
        createdAt: new Date("2026-03-14T10:00:00.000Z"),
        editedAt: null,
        authorUser: {
          displayName: "Prof. Anurag Agarwal",
        },
      },
    ])

    const posts = await service.listClassroomStream(studentAuth, "classroom_1", {
      limit: 10,
    })

    expect(posts).toHaveLength(1)
    expect(database.prisma.announcementPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          courseOfferingId: "classroom_1",
          visibility: "STUDENT_AND_TEACHER",
        }),
      }),
    )

    database.prisma.enrollment.findFirst.mockResolvedValueOnce(null)

    await expect(service.listClassroomStream(studentAuth, "classroom_1")).rejects.toBeInstanceOf(
      ForbiddenException,
    )
  })

  it("creates classroom announcements and only queues fan-out when notify is enabled", async () => {
    database.prisma.announcementPost.create
      .mockResolvedValueOnce({
        id: "announcement_1",
        courseOfferingId: "classroom_1",
        authorUserId: "teacher_1",
        postType: "ANNOUNCEMENT",
        visibility: "STUDENT_AND_TEACHER",
        title: "Lab reminder",
        body: "Tomorrow starts at 10 AM.",
        shouldNotify: true,
        createdAt: new Date("2026-03-14T10:00:00.000Z"),
        editedAt: null,
        authorUser: {
          displayName: "Prof. Anurag Agarwal",
        },
      })
      .mockResolvedValueOnce({
        id: "announcement_2",
        courseOfferingId: "classroom_1",
        authorUserId: "teacher_1",
        postType: "ANNOUNCEMENT",
        visibility: "TEACHER_ONLY",
        title: "Private note",
        body: "Teacher-only planning note.",
        shouldNotify: false,
        createdAt: new Date("2026-03-14T11:00:00.000Z"),
        editedAt: null,
        authorUser: {
          displayName: "Prof. Anurag Agarwal",
        },
      })

    const notifyingPost = await service.createAnnouncement(teacherAuth, "classroom_1", {
      title: "Lab reminder",
      body: "Tomorrow starts at 10 AM.",
      shouldNotify: true,
    })

    expect(notifyingPost.shouldNotify).toBe(true)
    expect(database.prisma.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          topic: "classroom.announcement.posted",
          aggregateId: "announcement_1",
        }),
      }),
    )

    database.prisma.outboxEvent.create.mockClear()

    const silentPost = await service.createAnnouncement(teacherAuth, "classroom_1", {
      title: "Private note",
      body: "Teacher-only planning note.",
      shouldNotify: false,
      visibility: "TEACHER_ONLY",
    })

    expect(silentPost.visibility).toBe("TEACHER_ONLY")
    expect(database.prisma.outboxEvent.create).not.toHaveBeenCalled()
  })

  it("blocks announcement writes for completed classrooms and closed semesters", async () => {
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
      service.createAnnouncement(teacherAuth, "classroom_1", {
        body: "This should be blocked.",
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
        status: "CLOSED",
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        endDate: new Date("2026-06-30T00:00:00.000Z"),
      },
    })

    await expect(
      service.createAnnouncement(teacherAuth, "classroom_1", {
        body: "This should also be blocked.",
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })
})
