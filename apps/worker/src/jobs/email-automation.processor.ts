import { type createPrismaClient, isUniqueConstraintError } from "@attendease/db"
import { getLocalClockParts, isRuleDueAt, toDispatchDateForRule } from "@attendease/domain"
import type { EmailProviderAdapter } from "@attendease/email"

import {
  defaultStuckDispatchRunTimeoutMs,
  parseManualSnapshot,
  wasRuleEvaluatedForCurrentMinute,
} from "./email-automation.processor.common.js"
import { processEmailRecipient } from "./email-automation.processor.dispatch.js"
import { selectRecipientsForRule } from "./email-automation.processor.recipients.js"

type WorkerPrismaClient = ReturnType<typeof createPrismaClient>

export class EmailAutomationProcessor {
  constructor(
    private readonly prisma: WorkerPrismaClient,
    private readonly emailProvider: EmailProviderAdapter,
    private readonly options: {
      environment: string
      fromEmail: string
      replyToEmail?: string | null
      stuckDispatchRunTimeoutMs?: number
    },
  ) {}

  async scheduleDueRules(now = new Date(), limit = 100): Promise<number> {
    const rules = await this.prisma.emailAutomationRule.findMany({
      where: {
        status: "ACTIVE",
      },
      orderBy: {
        updatedAt: "asc",
      },
      take: limit,
    })

    let scheduledCount = 0

    for (const rule of rules) {
      if (
        rule.lastEvaluatedAt &&
        wasRuleEvaluatedForCurrentMinute({
          evaluatedAt: rule.lastEvaluatedAt,
          now,
          timezone: rule.timezone,
          scheduleHourLocal: rule.scheduleHourLocal,
          scheduleMinuteLocal: rule.scheduleMinuteLocal,
        })
      ) {
        continue
      }

      if (
        !isRuleDueAt({
          now,
          timezone: rule.timezone,
          scheduleHourLocal: rule.scheduleHourLocal,
          scheduleMinuteLocal: rule.scheduleMinuteLocal,
        })
      ) {
        continue
      }

      const dispatchDate = toDispatchDateForRule(now, rule.timezone)

      try {
        await this.prisma.emailDispatchRun.create({
          data: {
            ruleId: rule.id,
            triggerType: "AUTOMATED",
            dispatchDate,
            status: "QUEUED",
          },
        })

        await this.prisma.emailAutomationRule.update({
          where: {
            id: rule.id,
          },
          data: {
            lastEvaluatedAt: now,
          },
        })

        scheduledCount += 1
      } catch (error) {
        if (!isUniqueConstraintError(error)) {
          throw error
        }

        await this.prisma.emailAutomationRule.update({
          where: {
            id: rule.id,
          },
          data: {
            lastEvaluatedAt: now,
          },
        })
      }
    }

    return scheduledCount
  }

  async processQueuedRuns(limit = 10, now = new Date()): Promise<number> {
    const staleProcessingCutoff = new Date(
      now.getTime() - (this.options.stuckDispatchRunTimeoutMs ?? defaultStuckDispatchRunTimeoutMs),
    )
    const runs = await this.prisma.emailDispatchRun.findMany({
      where: {
        OR: [
          {
            status: "QUEUED",
          },
          {
            status: "PROCESSING",
            OR: [
              {
                startedAt: null,
              },
              {
                startedAt: {
                  lte: staleProcessingCutoff,
                },
              },
            ],
          },
        ],
      },
      orderBy: {
        createdAt: "asc",
      },
      take: limit,
    })

    for (const run of runs) {
      await this.processRun(run.id)
    }

    return runs.length
  }

  async processRun(runId: string) {
    const run = await this.prisma.emailDispatchRun.findUnique({
      where: {
        id: runId,
      },
      include: {
        rule: {
          include: {
            courseOffering: {
              select: {
                id: true,
                code: true,
                displayTitle: true,
                subject: {
                  select: {
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!run || (run.status !== "QUEUED" && run.status !== "PROCESSING")) {
      return null
    }

    await this.prisma.emailDispatchRun.update({
      where: {
        id: run.id,
      },
      data: {
        status: "PROCESSING",
        startedAt: run.startedAt ?? new Date(),
        failedAt: null,
        errorMessage: null,
      },
    })

    const snapshot = parseManualSnapshot(run.filterSnapshot, run.ruleId)
    const thresholdPercent = snapshot.thresholdPercent ?? run.rule.thresholdPercent.toNumber()
    const templateSubject = snapshot.templateSubject ?? run.rule.templateSubject
    const templateBody = snapshot.templateBody ?? run.rule.templateBody

    try {
      const recipients = await selectRecipientsForRule({
        prisma: this.prisma,
        courseOfferingId: run.rule.courseOfferingId,
        thresholdPercent,
        ...(snapshot.from ? { from: snapshot.from } : {}),
        ...(snapshot.to ? { to: snapshot.to } : {}),
      })

      await this.prisma.emailDispatchRun.update({
        where: {
          id: run.id,
        },
        data: {
          targetedStudentCount: recipients.length,
        },
      })

      for (const recipient of recipients) {
        await processEmailRecipient({
          prisma: this.prisma,
          emailProvider: this.emailProvider,
          options: this.options,
          runId: run.id,
          ruleId: run.ruleId,
          courseOfferingTitle: run.rule.courseOffering.displayTitle,
          subjectTitle: run.rule.courseOffering.subject.title,
          templateSubject,
          templateBody,
          thresholdPercent,
          recipient,
        })
      }

      const summary = await this.prisma.emailLog.aggregate({
        where: {
          dispatchRunId: run.id,
        },
        _count: {
          _all: true,
          status: true,
        },
      })
      const [sentCount, failedCount] = await Promise.all([
        this.prisma.emailLog.count({
          where: {
            dispatchRunId: run.id,
            status: "SENT",
          },
        }),
        this.prisma.emailLog.count({
          where: {
            dispatchRunId: run.id,
            status: {
              in: ["FAILED", "BOUNCED", "DROPPED"],
            },
          },
        }),
      ])

      const completedAt = new Date()

      await this.prisma.emailDispatchRun.update({
        where: {
          id: run.id,
        },
        data: {
          status: failedCount > 0 && sentCount === 0 ? "FAILED" : "COMPLETED",
          targetedStudentCount: summary._count._all,
          sentCount,
          failedCount,
          completedAt,
          ...(failedCount > 0 && sentCount === 0
            ? { failedAt: completedAt, errorMessage: "All email deliveries failed." }
            : { failedAt: null, errorMessage: null }),
        },
      })

      await this.prisma.emailAutomationRule.update({
        where: {
          id: run.ruleId,
        },
        data: {
          lastSuccessfulRunAt: sentCount > 0 ? completedAt : run.rule.lastSuccessfulRunAt,
        },
      })

      return this.prisma.emailDispatchRun.findUnique({
        where: {
          id: run.id,
        },
      })
    } catch (error) {
      await this.prisma.emailDispatchRun.update({
        where: {
          id: run.id,
        },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          errorMessage:
            error instanceof Error ? error.message : "Low-attendance email processing failed.",
        },
      })

      throw error
    }
  }

  getDueRuleDateParts(now: Date, timezone: string) {
    return getLocalClockParts(now, timezone)
  }
}
