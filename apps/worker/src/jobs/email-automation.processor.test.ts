import { createPrismaClient, developmentSeedIds, disconnectPrismaClient } from "@attendease/db"
import type { EmailProviderAdapter } from "@attendease/email"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import {
  type TemporaryDatabase,
  createTemporaryDatabase,
  destroyTemporaryDatabase,
} from "../test-helpers.js"
import { EmailAutomationProcessor } from "./email-automation.processor.js"

describe("EmailAutomationProcessor", () => {
  let database: TemporaryDatabase | null = null
  let prisma: ReturnType<typeof createPrismaClient> | null = null
  let sendEmail: ReturnType<typeof vi.fn>
  let emailProvider: EmailProviderAdapter
  let processor: EmailAutomationProcessor | null = null

  beforeAll(async () => {
    database = await createTemporaryDatabase("attendease_worker_email")
    prisma = createPrismaClient({
      databaseUrl: database.databaseUrl,
      singleton: false,
    })
    sendEmail = vi.fn().mockResolvedValue({
      providerMessageId: "provider-message-1",
    })
    emailProvider = {
      sendEmail,
    }
    processor = new EmailAutomationProcessor(getPrisma(), emailProvider, {
      environment: "test",
      fromEmail: "noreply@attendease.dev",
      replyToEmail: "teacher@attendease.dev",
    })
  })

  beforeEach(async () => {
    sendEmail.mockClear()
    await getPrisma().emailLog.deleteMany({})
    await getPrisma().emailDispatchRun.deleteMany({})
    await getPrisma().emailAutomationRule.deleteMany({})
    await getPrisma().outboxEvent.deleteMany({
      where: {
        topic: {
          in: ["email.low_attendance.sent", "email.low_attendance.failed"],
        },
      },
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

  it("schedules at most one automated run for the same rule and local dispatch minute", async () => {
    const rule = await getPrisma().emailAutomationRule.create({
      data: {
        courseOfferingId: developmentSeedIds.courseOfferings.physics,
        createdByUserId: developmentSeedIds.users.teacher,
        status: "ACTIVE",
        thresholdPercent: 75,
        scheduleHourLocal: 18,
        scheduleMinuteLocal: 0,
        timezone: "Asia/Kolkata",
        templateSubject: "Physics attendance reminder",
        templateBody: "Hello {{studentName}}",
      },
    })

    const scheduledAt = new Date("2026-03-15T12:30:00.000Z")
    const firstCount = await getProcessor().scheduleDueRules(scheduledAt, 100)
    const secondCount = await getProcessor().scheduleDueRules(
      new Date("2026-03-15T12:30:05.000Z"),
      100,
    )

    const createdRuns = await getPrisma().emailDispatchRun.findMany({
      where: {
        ruleId: rule.id,
        triggerType: "AUTOMATED",
      },
    })

    expect(firstCount).toBeGreaterThanOrEqual(1)
    expect(secondCount).toBe(0)
    expect(createdRuns).toHaveLength(1)
    expect(createdRuns[0]).toMatchObject({
      status: "QUEUED",
      dispatchDate: new Date("2026-03-15T00:00:00.000Z"),
    })
  })

  it("processes queued runs, renders low-attendance emails, and avoids duplicate resend within one run", async () => {
    const rule = await getPrisma().emailAutomationRule.create({
      data: {
        courseOfferingId: developmentSeedIds.courseOfferings.math,
        createdByUserId: developmentSeedIds.users.teacher,
        status: "ACTIVE",
        thresholdPercent: 75,
        scheduleHourLocal: 18,
        scheduleMinuteLocal: 0,
        timezone: "Asia/Kolkata",
        templateSubject: "Attendance below {{thresholdPercent}} for {{classroomTitle}}",
        templateBody: "Hello {{studentName}}, attendance is {{attendancePercentage}}.",
      },
    })
    const run = await getPrisma().emailDispatchRun.create({
      data: {
        ruleId: rule.id,
        requestedByUserId: developmentSeedIds.users.teacher,
        triggerType: "MANUAL",
        dispatchDate: new Date("2026-03-15T00:00:00.000Z"),
        filterSnapshot: {
          ruleId: rule.id,
          thresholdPercent: 75,
        },
        status: "QUEUED",
      },
    })

    await getProcessor().processRun(run.id)

    const [processedRun, logs, sentEvents] = await Promise.all([
      getPrisma().emailDispatchRun.findUnique({
        where: {
          id: run.id,
        },
      }),
      getPrisma().emailLog.findMany({
        where: {
          dispatchRunId: run.id,
        },
      }),
      getPrisma().outboxEvent.findMany({
        where: {
          aggregateId: run.id,
          topic: "email.low_attendance.sent",
        },
      }),
    ])

    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEmail.mock.calls[0]?.[0]).toMatchObject({
      toEmail: "student.four@attendease.dev",
      subject: expect.stringContaining("[AttendEase test]"),
      textBody: expect.stringContaining("Meera Patel"),
      htmlBody: expect.stringContaining("0.00%"),
    })
    expect(processedRun).toMatchObject({
      status: "COMPLETED",
      targetedStudentCount: 1,
      sentCount: 1,
      failedCount: 0,
    })
    expect(logs).toEqual([
      expect.objectContaining({
        studentId: developmentSeedIds.users.studentFour,
        status: "SENT",
      }),
    ])
    expect(sentEvents).toHaveLength(1)

    await getPrisma().emailDispatchRun.update({
      where: {
        id: run.id,
      },
      data: {
        status: "QUEUED",
      },
    })

    await getProcessor().processRun(run.id)

    const rerunLogs = await getPrisma().emailLog.findMany({
      where: {
        dispatchRunId: run.id,
      },
    })

    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(rerunLogs).toHaveLength(1)
  })

  it("reclaims stale processing runs but leaves fresh processing runs untouched", async () => {
    const rule = await getPrisma().emailAutomationRule.create({
      data: {
        courseOfferingId: developmentSeedIds.courseOfferings.math,
        createdByUserId: developmentSeedIds.users.teacher,
        status: "ACTIVE",
        thresholdPercent: 75,
        scheduleHourLocal: 18,
        scheduleMinuteLocal: 0,
        timezone: "Asia/Kolkata",
        templateSubject: "Attendance reminder for {{classroomTitle}}",
        templateBody: "Hello {{studentName}}, attendance is {{attendancePercentage}}.",
      },
    })

    const staleRun = await getPrisma().emailDispatchRun.create({
      data: {
        ruleId: rule.id,
        requestedByUserId: developmentSeedIds.users.teacher,
        triggerType: "AUTOMATED",
        dispatchDate: new Date("2026-03-17T00:00:00.000Z"),
        status: "PROCESSING",
        startedAt: new Date("2026-03-17T11:30:00.000Z"),
      },
    })

    const freshRun = await getPrisma().emailDispatchRun.create({
      data: {
        ruleId: rule.id,
        requestedByUserId: developmentSeedIds.users.teacher,
        triggerType: "AUTOMATED",
        dispatchDate: new Date("2026-03-18T00:00:00.000Z"),
        status: "PROCESSING",
        startedAt: new Date("2026-03-17T11:59:30.000Z"),
      },
    })

    const processedCount = await getProcessor().processQueuedRuns(
      10,
      new Date("2026-03-17T12:00:00.000Z"),
    )

    const [reclaimedRun, untouchedRun] = await Promise.all([
      getPrisma().emailDispatchRun.findUnique({
        where: {
          id: staleRun.id,
        },
      }),
      getPrisma().emailDispatchRun.findUnique({
        where: {
          id: freshRun.id,
        },
      }),
    ])

    expect(processedCount).toBe(1)
    expect(reclaimedRun).toMatchObject({
      status: "COMPLETED",
      sentCount: 1,
    })
    expect(untouchedRun).toMatchObject({
      status: "PROCESSING",
    })
  })

  it("marks a queued run as failed when all deliveries fail", async () => {
    sendEmail.mockRejectedValueOnce(new Error("SES unavailable"))

    const rule = await getPrisma().emailAutomationRule.create({
      data: {
        courseOfferingId: developmentSeedIds.courseOfferings.math,
        createdByUserId: developmentSeedIds.users.teacher,
        status: "ACTIVE",
        thresholdPercent: 75,
        scheduleHourLocal: 18,
        scheduleMinuteLocal: 0,
        timezone: "Asia/Kolkata",
        templateSubject: "Attendance below {{thresholdPercent}}",
        templateBody: "Hello {{studentName}}",
      },
    })
    const run = await getPrisma().emailDispatchRun.create({
      data: {
        ruleId: rule.id,
        requestedByUserId: developmentSeedIds.users.teacher,
        triggerType: "MANUAL",
        dispatchDate: new Date("2026-03-16T00:00:00.000Z"),
        filterSnapshot: {
          ruleId: rule.id,
        },
        status: "QUEUED",
      },
    })

    await getProcessor().processRun(run.id)

    const [processedRun, log, failedEvent] = await Promise.all([
      getPrisma().emailDispatchRun.findUnique({
        where: {
          id: run.id,
        },
      }),
      getPrisma().emailLog.findFirst({
        where: {
          dispatchRunId: run.id,
        },
      }),
      getPrisma().outboxEvent.findFirst({
        where: {
          aggregateId: run.id,
          topic: "email.low_attendance.failed",
        },
      }),
    ])

    expect(processedRun).toMatchObject({
      status: "FAILED",
      targetedStudentCount: 1,
      sentCount: 0,
      failedCount: 1,
      errorMessage: "All email deliveries failed.",
    })
    expect(log).toMatchObject({
      status: "FAILED",
      failureReason: "SES unavailable",
    })
    expect(failedEvent?.status).toBe("PENDING")
  })

  function getPrisma() {
    if (!prisma) {
      throw new Error("Prisma client is not initialized.")
    }

    return prisma
  }

  function getProcessor() {
    if (!processor) {
      throw new Error("Email automation processor is not initialized.")
    }

    return processor
  }
})
