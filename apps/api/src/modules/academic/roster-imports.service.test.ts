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
import { RosterImportsService } from "./roster-imports.service.js"

describe("RosterImportsService", () => {
  const database = {
    prisma: {
      rosterImportJob: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      rosterImportRow: {
        createMany: vi.fn(),
        update: vi.fn(),
      },
      user: {
        findFirst: vi.fn(),
      },
      enrollment: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      announcementPost: {
        create: vi.fn(),
      },
      outboxEvent: {
        create: vi.fn(),
      },
      adminActionLog: {
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

  let service: RosterImportsService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new RosterImportsService(database as never, classroomsService as never)

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

  it("creates roster import jobs, normalizes rows, and emits an import request event", async () => {
    database.prisma.rosterImportJob.create.mockResolvedValue({
      id: "job_1",
      courseOfferingId: "classroom_1",
      requestedByUserId: "teacher_1",
      sourceFileKey: "inline://roster-imports/roster.csv",
      sourceFileName: "roster.csv",
      status: "UPLOADED",
      totalRows: 2,
      validRows: 0,
      invalidRows: 0,
      appliedRows: 0,
      startedAt: null,
      completedAt: null,
      reviewedAt: null,
      createdAt: new Date("2026-03-14T10:00:00.000Z"),
    })
    database.prisma.rosterImportJob.findUniqueOrThrow.mockResolvedValue({
      id: "job_1",
      courseOfferingId: "classroom_1",
      requestedByUserId: "teacher_1",
      sourceFileKey: "inline://roster-imports/roster.csv",
      sourceFileName: "roster.csv",
      status: "UPLOADED",
      totalRows: 2,
      validRows: 0,
      invalidRows: 0,
      appliedRows: 0,
      startedAt: null,
      completedAt: null,
      reviewedAt: null,
      createdAt: new Date("2026-03-14T10:00:00.000Z"),
      rows: [
        {
          id: "row_1",
          jobId: "job_1",
          rowNumber: 1,
          studentEmail: "student.one@attendease.dev",
          studentRollNumber: null,
          parsedName: "Student One",
          status: "PENDING",
          errorMessage: null,
          resolvedStudentId: null,
        },
        {
          id: "row_2",
          jobId: "job_1",
          rowNumber: 2,
          studentEmail: null,
          studentRollNumber: "CSE2302",
          parsedName: "Student Two",
          status: "PENDING",
          errorMessage: null,
          resolvedStudentId: null,
        },
      ],
    })

    const job = await service.createRosterImportJob(teacherAuth, "classroom_1", {
      sourceFileName: "roster.csv",
      rows: [
        {
          studentEmail: " Student.One@AttendEase.dev ",
          parsedName: " Student One ",
        },
        {
          studentRollNumber: " CSE2302 ",
          parsedName: " Student Two ",
        },
      ],
    })

    expect(job.status).toBe("UPLOADED")
    expect(database.prisma.rosterImportRow.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            rowNumber: 1,
            studentEmail: "student.one@attendease.dev",
            parsedName: "Student One",
          }),
          expect.objectContaining({
            rowNumber: 2,
            studentEmail: null,
            studentRollNumber: "CSE2302",
            parsedName: "Student Two",
          }),
        ],
      }),
    )
    expect(database.prisma.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          topic: "classroom.roster.import_requested",
          aggregateId: "job_1",
        }),
      }),
    )
  })

  it("rejects import apply until worker review completes", async () => {
    database.prisma.rosterImportJob.findFirst.mockResolvedValue({
      id: "job_1",
      courseOfferingId: "classroom_1",
      requestedByUserId: "teacher_1",
      sourceFileKey: "inline://roster-imports/roster.csv",
      sourceFileName: "roster.csv",
      status: "UPLOADED",
      totalRows: 1,
      validRows: 0,
      invalidRows: 0,
      appliedRows: 0,
      startedAt: null,
      completedAt: null,
      reviewedAt: null,
      createdAt: new Date("2026-03-14T10:00:00.000Z"),
      rows: [],
    })

    await expect(
      service.applyRosterImportJob(teacherAuth, "classroom_1", "job_1"),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it("applies valid rows, skips duplicate members, and creates an import-result announcement", async () => {
    database.prisma.rosterImportJob.findFirst.mockResolvedValue({
      id: "job_1",
      courseOfferingId: "classroom_1",
      requestedByUserId: "teacher_1",
      sourceFileKey: "inline://roster-imports/roster.csv",
      sourceFileName: "roster.csv",
      status: "REVIEW_REQUIRED",
      totalRows: 2,
      validRows: 2,
      invalidRows: 0,
      appliedRows: 0,
      startedAt: new Date("2026-03-14T10:00:00.000Z"),
      completedAt: new Date("2026-03-14T10:02:00.000Z"),
      reviewedAt: null,
      createdAt: new Date("2026-03-14T10:00:00.000Z"),
      rows: [
        {
          id: "row_apply",
          jobId: "job_1",
          rowNumber: 1,
          studentEmail: "student.three@attendease.dev",
          studentRollNumber: null,
          parsedName: "Student Three",
          status: "VALID",
          errorMessage: null,
          resolvedStudentId: "student_3",
        },
        {
          id: "row_skip",
          jobId: "job_1",
          rowNumber: 2,
          studentEmail: "student.one@attendease.dev",
          studentRollNumber: null,
          parsedName: "Student One",
          status: "VALID",
          errorMessage: null,
          resolvedStudentId: "student_1",
        },
      ],
    })
    database.prisma.user.findFirst
      .mockResolvedValueOnce({
        id: "student_3",
        status: "ACTIVE",
      })
      .mockResolvedValueOnce({
        id: "student_1",
        status: "ACTIVE",
      })
    database.prisma.enrollment.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: "enrollment_existing",
      status: "ACTIVE",
    })
    database.prisma.enrollment.create.mockResolvedValue({
      id: "enrollment_new",
    })
    database.prisma.rosterImportJob.update.mockResolvedValue({
      id: "job_1",
      courseOfferingId: "classroom_1",
      requestedByUserId: "teacher_1",
      sourceFileKey: "inline://roster-imports/roster.csv",
      sourceFileName: "roster.csv",
      status: "APPLIED",
      totalRows: 2,
      validRows: 2,
      invalidRows: 0,
      appliedRows: 1,
      startedAt: new Date("2026-03-14T10:00:00.000Z"),
      completedAt: new Date("2026-03-14T10:04:00.000Z"),
      reviewedAt: new Date("2026-03-14T10:04:00.000Z"),
      createdAt: new Date("2026-03-14T10:00:00.000Z"),
      rows: [
        {
          id: "row_apply",
          jobId: "job_1",
          rowNumber: 1,
          studentEmail: "student.three@attendease.dev",
          studentRollNumber: null,
          parsedName: "Student Three",
          status: "APPLIED",
          errorMessage: null,
          resolvedStudentId: "student_3",
        },
        {
          id: "row_skip",
          jobId: "job_1",
          rowNumber: 2,
          studentEmail: "student.one@attendease.dev",
          studentRollNumber: null,
          parsedName: "Student One",
          status: "SKIPPED",
          errorMessage: "Student is already an active classroom member.",
          resolvedStudentId: "student_1",
        },
      ],
    })

    const job = await service.applyRosterImportJob(teacherAuth, "classroom_1", "job_1")

    expect(job.status).toBe("APPLIED")
    expect(job.appliedRows).toBe(1)
    expect(database.prisma.enrollment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          studentId: "student_3",
          courseOfferingId: "classroom_1",
          source: "IMPORT",
        }),
      }),
    )
    expect(database.prisma.rosterImportRow.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "row_skip",
        },
        data: expect.objectContaining({
          status: "SKIPPED",
        }),
      }),
    )
    expect(database.prisma.announcementPost.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          courseOfferingId: "classroom_1",
          postType: "IMPORT_RESULT",
          visibility: "TEACHER_ONLY",
        }),
      }),
    )
    expect(database.prisma.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          topic: "classroom.roster.import_applied",
          aggregateId: "job_1",
        }),
      }),
    )
  })
})
