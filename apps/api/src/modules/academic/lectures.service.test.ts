import { BadRequestException } from "@nestjs/common"
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
import { LecturesService } from "./lectures.service.js"

describe("LecturesService", () => {
  const database = {
    prisma: {
      lecture: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      courseScheduleSlot: {
        findFirst: vi.fn(),
      },
      courseScheduleException: {
        findFirst: vi.fn(),
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

  let service: LecturesService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new LecturesService(database as never, classroomsService as never)
  })

  it("rejects lecture dates outside the classroom semester window", async () => {
    classroomsService.requireAccessibleClassroom.mockResolvedValue({
      id: "classroom_1",
      status: "ACTIVE",
      semester: {
        status: "ACTIVE",
        startDate: new Date("2026-07-01T00:00:00.000Z"),
        endDate: new Date("2026-12-01T00:00:00.000Z"),
      },
    })

    await expect(
      service.createLecture(teacherAuth, "classroom_1", {
        lectureDate: "2027-01-10T00:00:00.000Z",
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it("rejects schedule-slot ids that do not belong to the classroom", async () => {
    classroomsService.requireAccessibleClassroom.mockResolvedValue({
      id: "classroom_1",
      status: "ACTIVE",
      semester: {
        status: "ACTIVE",
        startDate: new Date("2026-07-01T00:00:00.000Z"),
        endDate: new Date("2026-12-01T00:00:00.000Z"),
      },
    })
    database.prisma.courseScheduleSlot.findFirst.mockResolvedValue(null)

    await expect(
      service.createLecture(teacherAuth, "classroom_1", {
        lectureDate: "2026-08-10T00:00:00.000Z",
        scheduleSlotId: "slot_missing",
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it("creates a lecture and queues an outbox event", async () => {
    classroomsService.requireAccessibleClassroom.mockResolvedValue({
      id: "classroom_1",
      status: "ACTIVE",
      semester: {
        status: "ACTIVE",
        startDate: new Date("2026-07-01T00:00:00.000Z"),
        endDate: new Date("2026-12-01T00:00:00.000Z"),
      },
    })
    database.prisma.courseScheduleSlot.findFirst.mockResolvedValue({
      id: "slot_1",
      courseOfferingId: "classroom_1",
    })
    database.prisma.lecture.create.mockResolvedValue({
      id: "lecture_1",
      courseOfferingId: "classroom_1",
      scheduleSlotId: "slot_1",
      scheduleExceptionId: null,
      createdByUserId: "teacher_1",
      title: "Lecture 1",
      lectureDate: new Date("2026-08-10T00:00:00.000Z"),
      plannedStartAt: new Date("2026-08-10T09:00:00.000Z"),
      plannedEndAt: new Date("2026-08-10T10:00:00.000Z"),
      actualStartAt: null,
      actualEndAt: null,
      status: "PLANNED",
    })

    const lecture = await service.createLecture(teacherAuth, "classroom_1", {
      lectureDate: "2026-08-10T00:00:00.000Z",
      scheduleSlotId: "slot_1",
      title: "Lecture 1",
      plannedStartAt: "2026-08-10T09:00:00.000Z",
      plannedEndAt: "2026-08-10T10:00:00.000Z",
    })

    expect(lecture.status).toBe("PLANNED")
    expect(lecture.classroomId).toBe("classroom_1")
    expect(database.prisma.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          topic: "lecture.created",
          aggregateType: "lecture",
          aggregateId: "lecture_1",
        }),
      }),
    )
  })

  it("rejects lecture creation for completed classrooms and closed semesters", async () => {
    classroomsService.requireAccessibleClassroom.mockResolvedValueOnce({
      id: "classroom_1",
      status: "COMPLETED",
      semester: {
        status: "ACTIVE",
        startDate: new Date("2026-07-01T00:00:00.000Z"),
        endDate: new Date("2026-12-01T00:00:00.000Z"),
      },
    })

    await expect(
      service.createLecture(teacherAuth, "classroom_1", {
        lectureDate: "2026-08-10T00:00:00.000Z",
      }),
    ).rejects.toBeInstanceOf(BadRequestException)

    classroomsService.requireAccessibleClassroom.mockResolvedValueOnce({
      id: "classroom_1",
      status: "ACTIVE",
      semester: {
        status: "CLOSED",
        startDate: new Date("2026-07-01T00:00:00.000Z"),
        endDate: new Date("2026-12-01T00:00:00.000Z"),
      },
    })

    await expect(
      service.createLecture(teacherAuth, "classroom_1", {
        lectureDate: "2026-08-10T00:00:00.000Z",
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })
})
