import {
  EmailDispatchRunStatus,
  EmailDispatchTriggerType,
  EmailLogStatus,
  OutboxStatus,
  type PrismaClient,
} from "@prisma/client"

import { buildEmailLogData, buildOutboxEventData } from "./audit.js"
import type { PrismaTransactionClient } from "./client"
import { developmentAcademicFixtures, developmentAuthFixtures } from "./fixtures"
import { developmentSeedIds } from "./seed.ids"
import type { SeedAcademicContext, SeedTimingContext, SeedUsersContext } from "./seed.internal"

type SeedAutomationTransaction = Pick<
  PrismaClient,
  "emailLog" | "emailAutomationRule" | "emailDispatchRun" | "outboxEvent"
> &
  Pick<
    PrismaTransactionClient,
    "emailLog" | "emailAutomationRule" | "emailDispatchRun" | "outboxEvent"
  >

export async function seedAutomationData(
  transaction: SeedAutomationTransaction,
  timing: SeedTimingContext,
  users: SeedUsersContext,
  academic: SeedAcademicContext,
): Promise<{ seededEmailRuleId: string }> {
  await transaction.emailLog.deleteMany({
    where: {
      id: {
        in: Object.values(developmentSeedIds.emailAutomation).filter(
          (value) => value === developmentSeedIds.emailAutomation.emailLog,
        ),
      },
    },
  })

  await transaction.outboxEvent.deleteMany({
    where: {
      id: {
        in: Object.values(developmentSeedIds.outboxEvents),
      },
    },
  })

  const emailAutomationRule = await transaction.emailAutomationRule.upsert({
    where: { id: developmentSeedIds.emailAutomation.rule },
    update: {
      courseOfferingId: academic.mathCourseOfferingId,
      createdByUserId: users.teacherUser.id,
      status: "ACTIVE",
      thresholdPercent: 75,
      scheduleHourLocal: 18,
      scheduleMinuteLocal: 0,
      timezone: "Asia/Kolkata",
      templateSubject: "Attendance below 75%",
      templateBody: "Please review your attendance and contact your teacher if you need help.",
      lastEvaluatedAt: timing.now,
      lastSuccessfulRunAt: timing.now,
    },
    create: {
      id: developmentSeedIds.emailAutomation.rule,
      courseOfferingId: academic.mathCourseOfferingId,
      createdByUserId: users.teacherUser.id,
      status: "ACTIVE",
      thresholdPercent: 75,
      scheduleHourLocal: 18,
      scheduleMinuteLocal: 0,
      timezone: "Asia/Kolkata",
      templateSubject: "Attendance below 75%",
      templateBody: "Please review your attendance and contact your teacher if you need help.",
      lastEvaluatedAt: timing.now,
      lastSuccessfulRunAt: timing.now,
    },
  })

  const emailDispatchRun = await transaction.emailDispatchRun.upsert({
    where: { id: developmentSeedIds.emailAutomation.dispatchRun },
    update: {
      ruleId: emailAutomationRule.id,
      requestedByUserId: users.teacherUser.id,
      triggerType: EmailDispatchTriggerType.AUTOMATED,
      dispatchDate: new Date("2026-03-11"),
      status: EmailDispatchRunStatus.COMPLETED,
      targetedStudentCount: 1,
      sentCount: 1,
      failedCount: 0,
      startedAt: new Date("2026-03-11T12:30:00.000Z"),
      completedAt: new Date("2026-03-11T12:31:00.000Z"),
      errorMessage: null,
    },
    create: {
      id: developmentSeedIds.emailAutomation.dispatchRun,
      ruleId: emailAutomationRule.id,
      requestedByUserId: users.teacherUser.id,
      triggerType: EmailDispatchTriggerType.AUTOMATED,
      dispatchDate: new Date("2026-03-11"),
      status: EmailDispatchRunStatus.COMPLETED,
      targetedStudentCount: 1,
      sentCount: 1,
      failedCount: 0,
      startedAt: new Date("2026-03-11T12:30:00.000Z"),
      completedAt: new Date("2026-03-11T12:31:00.000Z"),
    },
  })

  await transaction.emailLog.create({
    data: buildEmailLogData({
      id: developmentSeedIds.emailAutomation.emailLog,
      dispatchRunId: emailDispatchRun.id,
      ruleId: emailAutomationRule.id,
      studentId: developmentSeedIds.users.studentFour,
      recipientEmail: developmentAuthFixtures.students.studentFour.email,
      subject: "Attendance below 75%",
      body: "Your current attendance is below 75%. Please attend the next classes regularly.",
      status: EmailLogStatus.SENT,
      providerMessageId: "dev-seed-email-message-id",
      createdAt: new Date("2026-03-11T12:30:10.000Z"),
      sentAt: new Date("2026-03-11T12:30:15.000Z"),
    }),
  })

  await transaction.outboxEvent.create({
    data: buildOutboxEventData({
      id: developmentSeedIds.outboxEvents.analyticsRefresh,
      topic: "analytics.attendance.refresh",
      aggregateType: "attendance_session",
      aggregateId: developmentSeedIds.sessions.mathCompleted,
      status: OutboxStatus.PENDING,
      payload: {
        sessionId: developmentSeedIds.sessions.mathCompleted,
        courseOfferingId: academic.mathCourseOfferingId,
        reason: "development_seed",
      },
      availableAt: timing.now,
    }),
  })

  return { seededEmailRuleId: emailAutomationRule.id }
}
