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

import { SemestersService } from "./semesters.service.js"

describe("SemestersService", () => {
  const database = {
    prisma: {
      semester: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      adminActionLog: {
        create: vi.fn(),
      },
      outboxEvent: {
        create: vi.fn(),
      },
    },
  }

  let service: SemestersService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new SemestersService(database as never)
  })

  it("creates a semester and queues an outbox event", async () => {
    database.prisma.semester.create.mockResolvedValue({
      id: "semester_2",
      academicTermId: "term_1",
      code: "SEM7-2026",
      title: "Semester 7",
      ordinal: 7,
      status: "DRAFT",
      startDate: new Date("2026-07-01T00:00:00.000Z"),
      endDate: new Date("2026-12-01T00:00:00.000Z"),
      attendanceCutoffDate: new Date("2026-11-20T00:00:00.000Z"),
    })

    const semester = await service.createSemester("admin_1", {
      academicTermId: "term_1",
      code: "SEM7-2026",
      title: "Semester 7",
      ordinal: 7,
      startDate: "2026-07-01T00:00:00.000Z",
      endDate: "2026-12-01T00:00:00.000Z",
      attendanceCutoffDate: "2026-11-20T00:00:00.000Z",
    })

    expect(semester.status).toBe("DRAFT")
    expect(database.prisma.semester.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: "SEM7-2026",
          title: "Semester 7",
        }),
      }),
    )
    expect(database.prisma.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          topic: "semester.created",
          aggregateType: "semester",
          aggregateId: "semester_2",
        }),
      }),
    )
  })

  it("rejects invalid semester windows", async () => {
    await expect(
      service.createSemester("admin_1", {
        academicTermId: "term_1",
        code: "SEM7-2026",
        title: "Semester 7",
        startDate: "2026-12-01T00:00:00.000Z",
        endDate: "2026-07-01T00:00:00.000Z",
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it("prevents activating a semester when another semester is already active in the same term", async () => {
    database.prisma.semester.findUnique.mockResolvedValue({
      id: "semester_2",
      academicTermId: "term_1",
      code: "SEM7-2026",
      title: "Semester 7",
      ordinal: 7,
      status: "DRAFT",
      startDate: new Date("2026-07-01T00:00:00.000Z"),
      endDate: new Date("2026-12-01T00:00:00.000Z"),
      attendanceCutoffDate: null,
    })
    database.prisma.semester.findFirst.mockResolvedValue({
      id: "semester_1",
    })

    await expect(service.activateSemester("admin_1", "semester_2")).rejects.toBeInstanceOf(
      ConflictException,
    )
  })

  it("archives semesters with an admin audit trail instead of deleting them", async () => {
    database.prisma.semester.findUnique.mockResolvedValue({
      id: "semester_2",
      academicTermId: "term_1",
      code: "SEM7-2026",
      title: "Semester 7",
      ordinal: 7,
      status: "ACTIVE",
      startDate: new Date("2026-07-01T00:00:00.000Z"),
      endDate: new Date("2026-12-01T00:00:00.000Z"),
      attendanceCutoffDate: null,
    })
    database.prisma.semester.update.mockResolvedValue({
      id: "semester_2",
      academicTermId: "term_1",
      code: "SEM7-2026",
      title: "Semester 7",
      ordinal: 7,
      status: "ARCHIVED",
      startDate: new Date("2026-07-01T00:00:00.000Z"),
      endDate: new Date("2026-12-01T00:00:00.000Z"),
      attendanceCutoffDate: null,
    })

    const archived = await service.archiveSemester("admin_1", "semester_2")

    expect(archived.status).toBe("ARCHIVED")
    expect(database.prisma.adminActionLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          adminUserId: "admin_1",
          actionType: "SEMESTER_ARCHIVE",
          metadata: expect.objectContaining({
            semesterId: "semester_2",
            previousStatus: "ACTIVE",
            nextStatus: "ARCHIVED",
          }),
        }),
      }),
    )
  })
})
