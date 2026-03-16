import {
  buildOutboxEventData,
  createPrismaClient,
  developmentSeedIds,
  disconnectPrismaClient,
} from "@attendease/db"
import type { NotificationAdapter, NotificationEnvelope } from "@attendease/notifications"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import {
  type TemporaryDatabase,
  createTemporaryDatabase,
  destroyTemporaryDatabase,
} from "../test-helpers.js"
import { AnnouncementFanoutProcessor } from "./announcement-fanout.processor.js"

describe("AnnouncementFanoutProcessor", () => {
  let database: TemporaryDatabase | null = null
  let prisma: ReturnType<typeof createPrismaClient> | null = null

  beforeAll(async () => {
    database = await createTemporaryDatabase("attendease_worker_announcement_fanout")
    prisma = createPrismaClient({
      databaseUrl: database.databaseUrl,
      singleton: false,
    })
  })

  afterAll(async () => {
    if (prisma) {
      await disconnectPrismaClient(prisma)
    }

    if (database) {
      await destroyTemporaryDatabase(database)
    }
  })

  it("fans out student-visible announcements to active and pending classroom members", async () => {
    await getPrisma().enrollment.update({
      where: {
        id: developmentSeedIds.enrollments.physics.studentTwo,
      },
      data: {
        status: "PENDING",
      },
    })

    const announcement = await getPrisma().announcementPost.create({
      data: {
        courseOfferingId: developmentSeedIds.courseOfferings.physics,
        authorUserId: developmentSeedIds.users.teacher,
        postType: "ANNOUNCEMENT",
        visibility: "STUDENT_AND_TEACHER",
        title: "Physics update",
        body: "Tomorrow's physics class starts 15 minutes earlier.",
        shouldNotify: true,
      },
    })

    const outboxEvent = await getPrisma().outboxEvent.create({
      data: buildOutboxEventData({
        topic: "classroom.announcement.posted",
        aggregateType: "announcement_post",
        aggregateId: announcement.id,
        payload: {
          announcementId: announcement.id,
        },
      }),
    })

    const deliveredAt = new Date("2026-03-14T10:15:00.000Z")
    const send = vi.fn(async (envelope: NotificationEnvelope) => ({
      channel: envelope.channel,
      recipientUserId: envelope.recipientUserId,
      deliveredAt,
    }))

    const processor = new AnnouncementFanoutProcessor(getPrisma(), [
      {
        channel: "in-app",
        send,
      } satisfies NotificationAdapter,
    ])

    const processedCount = await processor.processPendingEvents(10)
    expect(processedCount).toBe(1)

    expect(send).toHaveBeenCalledTimes(2)
    expect(send.mock.calls.map(([envelope]) => envelope.recipientUserId).sort()).toEqual(
      [developmentSeedIds.users.studentOne, developmentSeedIds.users.studentTwo].sort(),
    )

    const receipts = await getPrisma().announcementReceipt.findMany({
      where: {
        announcementPostId: announcement.id,
      },
      orderBy: {
        userId: "asc",
      },
    })

    expect(receipts).toHaveLength(2)
    expect(receipts.map((receipt) => receipt.userId)).toEqual([
      developmentSeedIds.users.studentOne,
      developmentSeedIds.users.studentTwo,
    ])
    expect(receipts.every((receipt) => receipt.channel === "IN_APP")).toBe(true)

    const processedEvent = await getPrisma().outboxEvent.findUniqueOrThrow({
      where: {
        id: outboxEvent.id,
      },
    })

    expect(processedEvent.status).toBe("PROCESSED")
    expect(processedEvent.attemptCount).toBe(1)
    expect(processedEvent.processedAt).not.toBeNull()
  })

  it("marks teacher-only announcement events processed without student receipts", async () => {
    const announcement = await getPrisma().announcementPost.create({
      data: {
        courseOfferingId: developmentSeedIds.courseOfferings.math,
        authorUserId: developmentSeedIds.users.teacher,
        postType: "IMPORT_RESULT",
        visibility: "TEACHER_ONLY",
        title: "Import finished",
        body: "Roster import completed without student-facing notifications.",
        shouldNotify: true,
      },
    })

    const outboxEvent = await getPrisma().outboxEvent.create({
      data: buildOutboxEventData({
        topic: "classroom.announcement.posted",
        aggregateType: "announcement_post",
        aggregateId: announcement.id,
        payload: {
          announcementId: announcement.id,
        },
      }),
    })

    const send = vi.fn(async (envelope: NotificationEnvelope) => ({
      channel: envelope.channel,
      recipientUserId: envelope.recipientUserId,
      deliveredAt: new Date("2026-03-14T11:00:00.000Z"),
    }))

    const processor = new AnnouncementFanoutProcessor(getPrisma(), [
      {
        channel: "in-app",
        send,
      } satisfies NotificationAdapter,
    ])

    await processor.processEvent(outboxEvent.id)

    expect(send).not.toHaveBeenCalled()
    expect(
      await getPrisma().announcementReceipt.count({
        where: {
          announcementPostId: announcement.id,
        },
      }),
    ).toBe(0)

    const processedEvent = await getPrisma().outboxEvent.findUniqueOrThrow({
      where: {
        id: outboxEvent.id,
      },
    })

    expect(processedEvent.status).toBe("PROCESSED")
    expect(processedEvent.lastError).toBeNull()
  })

  it("reclaims stale processing announcement events", async () => {
    const announcement = await getPrisma().announcementPost.create({
      data: {
        courseOfferingId: developmentSeedIds.courseOfferings.physics,
        authorUserId: developmentSeedIds.users.teacher,
        postType: "ANNOUNCEMENT",
        visibility: "STUDENT_AND_TEACHER",
        title: "Recovered worker event",
        body: "Recovered after a stalled worker cycle.",
        shouldNotify: false,
      },
    })

    const outboxEvent = await getPrisma().outboxEvent.create({
      data: buildOutboxEventData({
        topic: "classroom.announcement.posted",
        aggregateType: "announcement_post",
        aggregateId: announcement.id,
        payload: {
          announcementId: announcement.id,
        },
        status: "PROCESSING",
        lockedAt: new Date("2026-03-15T08:00:00.000Z"),
      }),
    })

    const processor = new AnnouncementFanoutProcessor(getPrisma())
    const processedCount = await processor.processPendingEvents(
      10,
      new Date("2026-03-15T12:00:00.000Z"),
    )
    const processedEvent = await getPrisma().outboxEvent.findUniqueOrThrow({
      where: {
        id: outboxEvent.id,
      },
    })

    expect(processedCount).toBe(1)
    expect(processedEvent.status).toBe("PROCESSED")
  })

  function getPrisma(): ReturnType<typeof createPrismaClient> {
    if (!prisma) {
      throw new Error("Prisma test client is not initialized.")
    }

    return prisma
  }
})
