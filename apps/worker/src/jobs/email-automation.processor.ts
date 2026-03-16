import type {
  LowAttendanceEmailRecipientSummary,
  ManualLowAttendanceEmailSendRequest,
} from "@attendease/contracts"
import { manualLowAttendanceEmailSendRequestSchema } from "@attendease/contracts"
import {
  Prisma,
  buildEmailLogData,
  buildOutboxEventData,
  type createPrismaClient,
  isUniqueConstraintError,
} from "@attendease/db"
import {
  getLocalClockParts,
  isRuleDueAt,
  selectLowAttendanceRecipients,
  toDispatchDateForRule,
} from "@attendease/domain"
import { type EmailProviderAdapter, renderLowAttendanceEmail } from "@attendease/email"

type WorkerPrismaClient = ReturnType<typeof createPrismaClient>

const nonDroppedEnrollmentStatuses = ["ACTIVE", "PENDING", "BLOCKED"] as const
const finalizedSessionStatuses = ["ENDED", "EXPIRED"] as const
const defaultStuckDispatchRunTimeoutMs = 15 * 60 * 1000

type EmailRecipientSelectionRow = {
  student_id: string
  student_email: string
  student_name: string
  student_roll_number: string | null
  attendance_percentage: number
}

function appendCondition(conditions: Prisma.Sql[], condition: Prisma.Sql) {
  conditions.push(condition)
}

function buildWhereClause(conditions: Prisma.Sql[]): Prisma.Sql {
  if (conditions.length === 0) {
    return Prisma.empty
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
}

function toDateOnlyString(value: string | undefined): string | null {
  if (!value) {
    return null
  }

  return new Date(value).toISOString().slice(0, 10)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseManualSnapshot(
  snapshot: Prisma.JsonValue | null,
  ruleId: string,
): Omit<ManualLowAttendanceEmailSendRequest, "ruleId"> {
  if (!isRecord(snapshot)) {
    return {}
  }

  const parsed = manualLowAttendanceEmailSendRequestSchema.parse({
    ruleId,
    ...snapshot,
  })

  return {
    ...(parsed.from ? { from: parsed.from } : {}),
    ...(parsed.to ? { to: parsed.to } : {}),
    ...(parsed.thresholdPercent !== undefined ? { thresholdPercent: parsed.thresholdPercent } : {}),
    ...(parsed.templateSubject ? { templateSubject: parsed.templateSubject } : {}),
    ...(parsed.templateBody ? { templateBody: parsed.templateBody } : {}),
  }
}

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
        this.wasRuleEvaluatedForCurrentMinute({
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
      const recipients = await this.selectRecipients({
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
        await this.processRecipient({
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

  private async processRecipient(input: {
    runId: string
    ruleId: string
    courseOfferingTitle: string
    subjectTitle: string
    templateSubject: string
    templateBody: string
    thresholdPercent: number
    recipient: LowAttendanceEmailRecipientSummary
  }) {
    const existingLog = await this.prisma.emailLog.findFirst({
      where: {
        dispatchRunId: input.runId,
        studentId: input.recipient.studentId,
      },
    })

    if (existingLog) {
      return existingLog
    }

    const createdLog = await this.prisma.emailLog.create({
      data: buildEmailLogData({
        dispatchRunId: input.runId,
        ruleId: input.ruleId,
        studentId: input.recipient.studentId,
        recipientEmail: input.recipient.studentEmail,
        subject: input.templateSubject,
        body: input.templateBody,
        status: "PENDING",
      }),
    })

    const rendered = renderLowAttendanceEmail({
      environment: this.options.environment,
      templateSubject: input.templateSubject,
      templateBody: input.templateBody,
      studentName: input.recipient.studentDisplayName,
      classroomTitle: input.courseOfferingTitle,
      subjectTitle: input.subjectTitle,
      attendancePercentage: input.recipient.attendancePercentage,
      thresholdPercent: input.thresholdPercent,
    })

    try {
      const sendResult = await this.emailProvider.sendEmail({
        fromEmail: this.options.fromEmail,
        toEmail: input.recipient.studentEmail,
        subject: rendered.subject,
        textBody: rendered.textBody,
        htmlBody: rendered.htmlBody,
        ...(this.options.replyToEmail !== undefined
          ? { replyToEmail: this.options.replyToEmail }
          : {}),
      })

      await this.prisma.emailLog.update({
        where: {
          id: createdLog.id,
        },
        data: {
          status: "SENT",
          subject: rendered.subject,
          body: rendered.textBody,
          providerMessageId: sendResult.providerMessageId,
          sentAt: new Date(),
        },
      })

      await this.prisma.outboxEvent.create({
        data: buildOutboxEventData({
          topic: "email.low_attendance.sent",
          aggregateType: "email_dispatch_run",
          aggregateId: input.runId,
          payload: {
            dispatchRunId: input.runId,
            emailLogId: createdLog.id,
            studentId: input.recipient.studentId,
          },
        }),
      })
    } catch (error) {
      await this.prisma.emailLog.update({
        where: {
          id: createdLog.id,
        },
        data: {
          status: "FAILED",
          subject: rendered.subject,
          body: rendered.textBody,
          failureReason:
            error instanceof Error ? error.message : "Low-attendance email delivery failed.",
        },
      })

      await this.prisma.outboxEvent.create({
        data: buildOutboxEventData({
          topic: "email.low_attendance.failed",
          aggregateType: "email_dispatch_run",
          aggregateId: input.runId,
          payload: {
            dispatchRunId: input.runId,
            emailLogId: createdLog.id,
            studentId: input.recipient.studentId,
          },
        }),
      })
    }

    return this.prisma.emailLog.findUnique({
      where: {
        id: createdLog.id,
      },
    })
  }

  private async selectRecipients(input: {
    courseOfferingId: string
    thresholdPercent: number
    from?: string
    to?: string
  }): Promise<LowAttendanceEmailRecipientSummary[]> {
    const rows = await this.loadAttendanceRows(input)

    return selectLowAttendanceRecipients(rows, input.thresholdPercent)
  }

  private async loadAttendanceRows(input: {
    courseOfferingId: string
    from?: string
    to?: string
  }) {
    const fromDate = toDateOnlyString(input.from)
    const toDate = toDateOnlyString(input.to)
    const joinConditions: Prisma.Sql[] = [
      Prisma.sql`session.id = record."sessionId"`,
      Prisma.sql`session.status IN (${Prisma.join([...finalizedSessionStatuses])})`,
      Prisma.sql`session."courseOfferingId" = enrollment."courseOfferingId"`,
    ]

    if (fromDate) {
      appendCondition(
        joinConditions,
        Prisma.sql`COALESCE(session."startedAt"::date, session."endedAt"::date, session."createdAt"::date) >= ${fromDate}::date`,
      )
    }

    if (toDate) {
      appendCondition(
        joinConditions,
        Prisma.sql`COALESCE(session."startedAt"::date, session."endedAt"::date, session."createdAt"::date) <= ${toDate}::date`,
      )
    }

    const rows = await this.prisma.$queryRaw<EmailRecipientSelectionRow[]>(
      Prisma.sql`
        SELECT
          enrollment."studentId" AS student_id,
          student.email AS student_email,
          student."displayName" AS student_name,
          student_profile."rollNumber" AS student_roll_number,
          CASE
            WHEN COUNT(session.id) = 0 THEN 0
            ELSE ROUND(
              (COUNT(session.id) FILTER (WHERE record.status = 'PRESENT')::DECIMAL
              / COUNT(session.id)::DECIMAL) * 100,
              2
            )
          END AS attendance_percentage
        FROM "enrollments" AS enrollment
        JOIN "users" AS student ON student.id = enrollment."studentId"
        LEFT JOIN "student_profiles" AS student_profile
          ON student_profile."userId" = student.id
        LEFT JOIN "attendance_records" AS record
          ON record."enrollmentId" = enrollment.id
        LEFT JOIN "attendance_sessions" AS session
          ON ${Prisma.join(joinConditions, " AND ")}
        WHERE
          enrollment."courseOfferingId" = ${input.courseOfferingId}
          AND enrollment.status IN (${Prisma.join([...nonDroppedEnrollmentStatuses])})
        GROUP BY
          enrollment."studentId",
          student.email,
          student."displayName",
          student_profile."rollNumber"
        ORDER BY student.email ASC
      `,
    )

    return rows.map((row) => ({
      studentId: row.student_id,
      studentEmail: row.student_email,
      studentDisplayName: row.student_name,
      studentRollNumber: row.student_roll_number,
      attendancePercentage: Number(row.attendance_percentage),
    }))
  }

  getDueRuleDateParts(now: Date, timezone: string) {
    return getLocalClockParts(now, timezone)
  }

  private wasRuleEvaluatedForCurrentMinute(input: {
    evaluatedAt: Date
    now: Date
    timezone: string
    scheduleHourLocal: number
    scheduleMinuteLocal: number
  }) {
    const evaluated = getLocalClockParts(input.evaluatedAt, input.timezone)
    const current = getLocalClockParts(input.now, input.timezone)

    return (
      evaluated.localDate === current.localDate &&
      current.hour === input.scheduleHourLocal &&
      current.minute === input.scheduleMinuteLocal &&
      evaluated.hour === input.scheduleHourLocal &&
      evaluated.minute === input.scheduleMinuteLocal
    )
  }
}
