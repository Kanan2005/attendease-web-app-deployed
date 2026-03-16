import { BadRequestException, ConflictException } from "@nestjs/common"
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
import { SchedulingService } from "./scheduling.service.js"

describe("SchedulingService", () => {
  const database = {
    prisma: {
      courseScheduleSlot: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      courseScheduleException: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      lecture: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
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

  let service: SchedulingService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new SchedulingService(database as never, classroomsService as never)

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
        startDate: new Date("2026-07-01T00:00:00.000Z"),
        endDate: new Date("2026-12-20T00:00:00.000Z"),
      },
    })
  })

  it("rejects overlapping weekly slots on the same weekday", async () => {
    database.prisma.courseScheduleSlot.findMany.mockResolvedValue([
      {
        id: "slot_existing",
        courseOfferingId: "classroom_1",
        weekday: 1,
        startMinutes: 540,
        endMinutes: 600,
        locationLabel: "Room 101",
        status: "ACTIVE",
      },
    ])

    await expect(
      service.createWeeklySlot(teacherAuth, "classroom_1", {
        weekday: 1,
        startMinutes: 570,
        endMinutes: 630,
        locationLabel: "Room 102",
      }),
    ).rejects.toBeInstanceOf(ConflictException)
  })

  it("creates a rescheduled exception and links a lecture occurrence", async () => {
    database.prisma.courseScheduleSlot.findFirst.mockResolvedValue({
      id: "slot_1",
      courseOfferingId: "classroom_1",
      weekday: 5,
      startMinutes: 540,
      endMinutes: 600,
      locationLabel: "Room 101",
      status: "ACTIVE",
    })
    database.prisma.courseScheduleSlot.findUnique.mockResolvedValue({
      id: "slot_1",
      courseOfferingId: "classroom_1",
      weekday: 5,
      startMinutes: 540,
      endMinutes: 600,
      locationLabel: "Room 101",
      status: "ACTIVE",
    })
    database.prisma.courseScheduleException.findFirst.mockResolvedValue(null)
    database.prisma.courseScheduleException.create.mockResolvedValue({
      id: "exception_1",
      courseOfferingId: "classroom_1",
      scheduleSlotId: "slot_1",
      exceptionType: "RESCHEDULED",
      effectiveDate: new Date("2026-08-14T00:00:00.000Z"),
      startMinutes: 660,
      endMinutes: 720,
      locationLabel: "Lab 4",
      reason: "Room swap",
    })
    database.prisma.lecture.findFirst.mockResolvedValue(null)
    database.prisma.lecture.create.mockResolvedValue({
      id: "lecture_1",
    })

    const exception = await service.createScheduleException(teacherAuth, "classroom_1", {
      scheduleSlotId: "slot_1",
      exceptionType: "RESCHEDULED",
      effectiveDate: "2026-08-14T00:00:00.000Z",
      startMinutes: 660,
      endMinutes: 720,
      locationLabel: "Lab 4",
      reason: "Room swap",
    })

    expect(exception.exceptionType).toBe("RESCHEDULED")
    expect(database.prisma.lecture.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          courseOfferingId: "classroom_1",
          scheduleExceptionId: "exception_1",
          scheduleSlotId: "slot_1",
          status: "PLANNED",
        }),
      }),
    )
  })

  it("applies save-and-notify changes transactionally and emits one schedule.changed event", async () => {
    database.prisma.courseScheduleSlot.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: "slot_new",
        courseOfferingId: "classroom_1",
        weekday: 2,
        startMinutes: 600,
        endMinutes: 660,
        locationLabel: "Room 201",
        status: "ACTIVE",
      },
    ])
    database.prisma.courseScheduleSlot.create.mockResolvedValue({
      id: "slot_new",
      courseOfferingId: "classroom_1",
      weekday: 2,
      startMinutes: 600,
      endMinutes: 660,
      locationLabel: "Room 201",
      status: "ACTIVE",
    })
    database.prisma.courseScheduleException.findFirst.mockResolvedValue(null)
    database.prisma.courseScheduleException.create.mockResolvedValue({
      id: "exception_new",
      courseOfferingId: "classroom_1",
      scheduleSlotId: null,
      exceptionType: "ONE_OFF",
      effectiveDate: new Date("2026-08-19T00:00:00.000Z"),
      startMinutes: 840,
      endMinutes: 900,
      locationLabel: "Seminar Hall",
      reason: "Extra class",
    })
    database.prisma.lecture.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "lecture_new" })
    database.prisma.lecture.create.mockResolvedValue({
      id: "lecture_new",
    })
    database.prisma.courseScheduleException.findMany.mockResolvedValue([
      {
        id: "exception_new",
        courseOfferingId: "classroom_1",
        scheduleSlotId: null,
        exceptionType: "ONE_OFF",
        effectiveDate: new Date("2026-08-19T00:00:00.000Z"),
        startMinutes: 840,
        endMinutes: 900,
        locationLabel: "Seminar Hall",
        reason: "Extra class",
      },
    ])

    const schedule = await service.saveAndNotify(teacherAuth, "classroom_1", {
      weeklySlotCreates: [
        {
          weekday: 2,
          startMinutes: 600,
          endMinutes: 660,
          locationLabel: "Room 201",
        },
      ],
      exceptionCreates: [
        {
          exceptionType: "ONE_OFF",
          effectiveDate: "2026-08-19T00:00:00.000Z",
          startMinutes: 840,
          endMinutes: 900,
          locationLabel: "Seminar Hall",
          reason: "Extra class",
        },
      ],
      note: "Notify students after saving the calendar updates.",
    })

    expect(schedule.scheduleSlots).toHaveLength(1)
    expect(schedule.scheduleExceptions).toHaveLength(1)
    expect(database.prisma.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          topic: "schedule.changed",
          aggregateType: "course_offering",
          aggregateId: "classroom_1",
          payload: expect.objectContaining({
            linkedLectureIds: ["lecture_new"],
            note: "Notify students after saving the calendar updates.",
          }),
        }),
      }),
    )
  })

  it("blocks lecture linkage for cancelled occurrences and reuses slot-based lecture links", async () => {
    database.prisma.courseScheduleSlot.findFirst.mockResolvedValue({
      id: "slot_1",
      courseOfferingId: "classroom_1",
      weekday: 5,
      startMinutes: 540,
      endMinutes: 600,
      locationLabel: "Room 101",
      status: "ACTIVE",
    })
    database.prisma.courseScheduleException.findFirst.mockResolvedValueOnce({
      id: "exception_cancelled",
      courseOfferingId: "classroom_1",
      scheduleSlotId: "slot_1",
      exceptionType: "CANCELLED",
      effectiveDate: new Date("2026-08-21T00:00:00.000Z"),
      startMinutes: null,
      endMinutes: null,
      locationLabel: null,
      reason: "Holiday",
    })

    await expect(
      service.ensureLectureLinkForAttendanceSession({
        classroomId: "classroom_1",
        actorUserId: "teacher_1",
        lectureDate: "2026-08-21T00:00:00.000Z",
        scheduleSlotId: "slot_1",
      }),
    ).rejects.toBeInstanceOf(BadRequestException)

    database.prisma.courseScheduleException.findFirst.mockResolvedValueOnce(null)
    database.prisma.lecture.findFirst.mockResolvedValueOnce({
      id: "lecture_existing",
      courseOfferingId: "classroom_1",
      scheduleSlotId: "slot_1",
      scheduleExceptionId: null,
      lectureDate: new Date("2026-08-28T00:00:00.000Z"),
      createdByUserId: "teacher_1",
      title: "Lecture 8",
      plannedStartAt: new Date("2026-08-28T09:00:00.000Z"),
      plannedEndAt: new Date("2026-08-28T10:00:00.000Z"),
      actualStartAt: null,
      actualEndAt: null,
      status: "PLANNED",
    })

    const linkedLecture = await service.ensureLectureLinkForAttendanceSession({
      classroomId: "classroom_1",
      actorUserId: "teacher_1",
      lectureDate: "2026-08-28T00:00:00.000Z",
      scheduleSlotId: "slot_1",
    })

    expect(linkedLecture).toEqual({
      lectureId: "lecture_existing",
      created: false,
      matchedBy: "SLOT",
    })
  })

  it("rejects schedule edits for completed classrooms and closed semesters", async () => {
    classroomsService.requireAccessibleClassroom.mockResolvedValueOnce({
      id: "classroom_completed",
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      primaryTeacherId: "teacher_1",
      status: "COMPLETED",
      semester: {
        id: "semester_1",
        status: "ACTIVE",
        startDate: new Date("2026-07-01T00:00:00.000Z"),
        endDate: new Date("2026-12-20T00:00:00.000Z"),
      },
    })

    await expect(
      service.createWeeklySlot(teacherAuth, "classroom_completed", {
        weekday: 3,
        startMinutes: 600,
        endMinutes: 660,
      }),
    ).rejects.toBeInstanceOf(BadRequestException)

    classroomsService.requireAccessibleClassroom.mockResolvedValueOnce({
      id: "classroom_1",
      semesterId: "semester_closed",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      primaryTeacherId: "teacher_1",
      status: "ACTIVE",
      semester: {
        id: "semester_closed",
        status: "CLOSED",
        startDate: new Date("2026-07-01T00:00:00.000Z"),
        endDate: new Date("2026-12-20T00:00:00.000Z"),
      },
    })

    await expect(
      service.saveAndNotify(teacherAuth, "classroom_1", {
        weeklySlotCreates: [
          {
            weekday: 4,
            startMinutes: 720,
            endMinutes: 780,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it("updates linked lectures when an exception is changed to cancelled", async () => {
    database.prisma.courseScheduleException.findFirst
      .mockResolvedValueOnce({
        id: "exception_1",
        courseOfferingId: "classroom_1",
        scheduleSlotId: "slot_1",
        exceptionType: "RESCHEDULED",
        effectiveDate: new Date("2026-08-14T00:00:00.000Z"),
        startMinutes: 660,
        endMinutes: 720,
        locationLabel: "Lab 4",
        reason: "Room swap",
      })
      .mockResolvedValueOnce(null)
    database.prisma.courseScheduleSlot.findFirst.mockResolvedValue({
      id: "slot_1",
      courseOfferingId: "classroom_1",
      weekday: 5,
      startMinutes: 540,
      endMinutes: 600,
      locationLabel: "Room 101",
      status: "ACTIVE",
    })
    database.prisma.courseScheduleSlot.findUnique.mockResolvedValue({
      id: "slot_1",
      courseOfferingId: "classroom_1",
      weekday: 5,
      startMinutes: 540,
      endMinutes: 600,
      locationLabel: "Room 101",
      status: "ACTIVE",
    })
    database.prisma.courseScheduleException.update.mockResolvedValue({
      id: "exception_1",
      courseOfferingId: "classroom_1",
      scheduleSlotId: "slot_1",
      exceptionType: "CANCELLED",
      effectiveDate: new Date("2026-08-14T00:00:00.000Z"),
      startMinutes: null,
      endMinutes: null,
      locationLabel: null,
      reason: "Holiday",
    })
    database.prisma.lecture.findFirst.mockResolvedValue({
      id: "lecture_1",
      courseOfferingId: "classroom_1",
      scheduleSlotId: "slot_1",
      scheduleExceptionId: "exception_1",
      lectureDate: new Date("2026-08-14T00:00:00.000Z"),
      createdByUserId: "teacher_1",
      title: "Lecture 6",
      plannedStartAt: new Date("2026-08-14T11:00:00.000Z"),
      plannedEndAt: new Date("2026-08-14T12:00:00.000Z"),
      actualStartAt: null,
      actualEndAt: null,
      status: "PLANNED",
    })
    database.prisma.lecture.update.mockResolvedValue({
      id: "lecture_1",
      courseOfferingId: "classroom_1",
      scheduleSlotId: "slot_1",
      scheduleExceptionId: "exception_1",
      lectureDate: new Date("2026-08-14T00:00:00.000Z"),
      createdByUserId: "teacher_1",
      title: "Lecture 6",
      plannedStartAt: new Date("2026-08-14T09:00:00.000Z"),
      plannedEndAt: new Date("2026-08-14T10:00:00.000Z"),
      actualStartAt: null,
      actualEndAt: null,
      status: "CANCELLED",
    })

    const exception = await service.updateScheduleException(
      teacherAuth,
      "classroom_1",
      "exception_1",
      {
        exceptionType: "CANCELLED",
        startMinutes: null,
        endMinutes: null,
        locationLabel: null,
        reason: "Holiday",
      },
    )

    expect(exception.exceptionType).toBe("CANCELLED")
    expect(database.prisma.lecture.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "lecture_1",
        },
        data: expect.objectContaining({
          scheduleSlotId: "slot_1",
          status: "CANCELLED",
        }),
      }),
    )
  })
})
