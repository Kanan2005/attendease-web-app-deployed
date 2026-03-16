import type {
  CreateEmailAutomationRuleRequest,
  EmailAutomationRuleListQuery,
  EmailAutomationRuleParams,
  EmailAutomationRulesResponse,
  EmailDispatchRunListQuery,
  EmailDispatchRunsResponse,
  EmailLogListQuery,
  EmailLogsResponse,
  LowAttendanceEmailPreviewRequest,
  LowAttendanceEmailPreviewResponse,
  LowAttendanceEmailRecipientSummary,
  ManualLowAttendanceEmailSendRequest,
  ManualLowAttendanceEmailSendResponse,
  UpdateEmailAutomationRuleRequest,
} from "@attendease/contracts"
import { type Prisma, isUniqueConstraintError } from "@attendease/db"
import { toDispatchDateForRule, toManualDispatchDateRange } from "@attendease/domain"
import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common"
import {
  buildLowAttendanceEmailPreview,
  toEmailAutomationRuleSummary,
  toEmailDispatchRunSummary,
  toEmailLogSummary,
} from "./automation.models.js"

import { DatabaseService } from "../../database/database.service.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import { ReportsService } from "../reports/reports.service.js"

type RuleWithCourse = Prisma.EmailAutomationRuleGetPayload<{
  include: {
    courseOffering: {
      select: {
        id: true
        code: true
        displayTitle: true
        primaryTeacherId: true
        subject: {
          select: {
            id: true
            code: true
            title: true
          }
        }
      }
    }
  }
}>

type TeacherPercentageRow = Awaited<
  ReturnType<ReportsService["listTeacherStudentPercentageReport"]>
>[number]

@Injectable()
export class AutomationService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ReportsService) private readonly reportsService: ReportsService,
  ) {}

  async listRules(
    auth: AuthRequestContext,
    query: EmailAutomationRuleListQuery,
  ): Promise<EmailAutomationRulesResponse> {
    const rules = await this.database.prisma.emailAutomationRule.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.classroomId ? { courseOfferingId: query.classroomId } : {}),
        courseOffering: {
          ...(auth.activeRole === "TEACHER" ? { primaryTeacherId: auth.userId } : {}),
        },
      },
      include: {
        courseOffering: {
          select: {
            id: true,
            code: true,
            displayTitle: true,
            primaryTeacherId: true,
            subject: {
              select: {
                id: true,
                code: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          courseOffering: {
            code: "asc",
          },
        },
        {
          createdAt: "desc",
        },
      ],
    })

    return rules.map(toEmailAutomationRuleSummary)
  }

  async createRule(auth: AuthRequestContext, request: CreateEmailAutomationRuleRequest) {
    await this.assertRuleScopeAccess(auth, request.classroomId)

    const existing = await this.database.prisma.emailAutomationRule.findFirst({
      where: {
        courseOfferingId: request.classroomId,
      },
      select: {
        id: true,
      },
    })

    if (existing) {
      throw new ConflictException("An email automation rule already exists for that classroom.")
    }

    const rule = await this.database.prisma.emailAutomationRule.create({
      data: {
        courseOfferingId: request.classroomId,
        createdByUserId: auth.userId,
        status: request.status,
        thresholdPercent: request.thresholdPercent,
        scheduleHourLocal: request.scheduleHourLocal,
        scheduleMinuteLocal: request.scheduleMinuteLocal,
        timezone: request.timezone,
        templateSubject: request.templateSubject,
        templateBody: request.templateBody,
      },
      include: {
        courseOffering: {
          select: {
            id: true,
            code: true,
            displayTitle: true,
            primaryTeacherId: true,
            subject: {
              select: {
                id: true,
                code: true,
                title: true,
              },
            },
          },
        },
      },
    })

    return toEmailAutomationRuleSummary(rule)
  }

  async updateRule(
    auth: AuthRequestContext,
    params: EmailAutomationRuleParams,
    request: UpdateEmailAutomationRuleRequest,
  ) {
    const rule = await this.getRuleOrThrow(params.ruleId)
    await this.assertRuleScopeAccess(auth, rule.courseOfferingId)

    const updated = await this.database.prisma.emailAutomationRule.update({
      where: {
        id: rule.id,
      },
      data: {
        ...(request.status !== undefined ? { status: request.status } : {}),
        ...(request.thresholdPercent !== undefined
          ? { thresholdPercent: request.thresholdPercent }
          : {}),
        ...(request.scheduleHourLocal !== undefined
          ? { scheduleHourLocal: request.scheduleHourLocal }
          : {}),
        ...(request.scheduleMinuteLocal !== undefined
          ? { scheduleMinuteLocal: request.scheduleMinuteLocal }
          : {}),
        ...(request.timezone !== undefined ? { timezone: request.timezone } : {}),
        ...(request.templateSubject !== undefined
          ? { templateSubject: request.templateSubject }
          : {}),
        ...(request.templateBody !== undefined ? { templateBody: request.templateBody } : {}),
      },
      include: {
        courseOffering: {
          select: {
            id: true,
            code: true,
            displayTitle: true,
            primaryTeacherId: true,
            subject: {
              select: {
                id: true,
                code: true,
                title: true,
              },
            },
          },
        },
      },
    })

    return toEmailAutomationRuleSummary(updated)
  }

  async previewManualEmail(
    auth: AuthRequestContext,
    request: LowAttendanceEmailPreviewRequest,
  ): Promise<LowAttendanceEmailPreviewResponse> {
    const rule = await this.getRuleOrThrow(request.ruleId)
    await this.assertRuleScopeAccess(auth, rule.courseOfferingId)

    const thresholdPercent = request.thresholdPercent ?? rule.thresholdPercent.toNumber()
    const recipients = await this.resolveLowAttendanceRecipients(auth, rule.courseOfferingId, {
      thresholdPercent,
      ...(request.from ? { from: request.from } : {}),
      ...(request.to ? { to: request.to } : {}),
    })

    return buildLowAttendanceEmailPreview({
      rule,
      thresholdPercent,
      recipients,
      dateRange: toManualDispatchDateRange(request),
      templateSubject: request.templateSubject ?? rule.templateSubject,
      templateBody: request.templateBody ?? rule.templateBody,
      environment: process.env.NODE_ENV ?? "development",
    })
  }

  async queueManualEmailSend(
    auth: AuthRequestContext,
    request: ManualLowAttendanceEmailSendRequest,
  ): Promise<ManualLowAttendanceEmailSendResponse> {
    const rule = await this.getRuleOrThrow(request.ruleId)
    await this.assertRuleScopeAccess(auth, rule.courseOfferingId)

    const dispatchDate = toDispatchDateForRule(new Date(), rule.timezone)
    const run = await this.database.prisma.emailDispatchRun.create({
      data: {
        ruleId: rule.id,
        requestedByUserId: auth.userId,
        triggerType: "MANUAL",
        dispatchDate,
        filterSnapshot: request,
        status: "QUEUED",
      },
      include: {
        rule: {
          include: {
            courseOffering: {
              select: {
                id: true,
                code: true,
                displayTitle: true,
              },
            },
          },
        },
      },
    })

    return {
      dispatchRun: toEmailDispatchRunSummary(run),
    }
  }

  async listDispatchRuns(
    auth: AuthRequestContext,
    query: EmailDispatchRunListQuery,
  ): Promise<EmailDispatchRunsResponse> {
    const runs = await this.database.prisma.emailDispatchRun.findMany({
      where: {
        ...(query.ruleId ? { ruleId: query.ruleId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.triggerType ? { triggerType: query.triggerType } : {}),
        rule: {
          ...(query.classroomId ? { courseOfferingId: query.classroomId } : {}),
          courseOffering: {
            ...(auth.activeRole === "TEACHER" ? { primaryTeacherId: auth.userId } : {}),
          },
        },
      },
      include: {
        rule: {
          include: {
            courseOffering: {
              select: {
                id: true,
                code: true,
                displayTitle: true,
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    })

    return runs.map(toEmailDispatchRunSummary)
  }

  async listEmailLogs(
    auth: AuthRequestContext,
    query: EmailLogListQuery,
  ): Promise<EmailLogsResponse> {
    const logs = await this.database.prisma.emailLog.findMany({
      where: {
        ...(query.ruleId ? { ruleId: query.ruleId } : {}),
        ...(query.dispatchRunId ? { dispatchRunId: query.dispatchRunId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.classroomId
          ? {
              rule: {
                courseOfferingId: query.classroomId,
              },
            }
          : {}),
        ...(auth.activeRole === "TEACHER"
          ? {
              rule: {
                ...(query.classroomId ? { courseOfferingId: query.classroomId } : {}),
                courseOffering: {
                  primaryTeacherId: auth.userId,
                },
              },
            }
          : {}),
      },
      include: {
        rule: {
          include: {
            courseOffering: {
              select: {
                id: true,
                code: true,
                displayTitle: true,
              },
            },
          },
        },
        dispatchRun: {
          select: {
            triggerType: true,
          },
        },
        student: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 200,
    })

    return logs.map(toEmailLogSummary)
  }

  async createAutomatedDispatchRunIfDue(input: {
    ruleId: string
    now: Date
  }): Promise<"CREATED" | "SKIPPED"> {
    const rule = await this.database.prisma.emailAutomationRule.findUnique({
      where: {
        id: input.ruleId,
      },
    })

    if (!rule || rule.status !== "ACTIVE") {
      return "SKIPPED"
    }

    try {
      await this.database.prisma.emailDispatchRun.create({
        data: {
          ruleId: rule.id,
          triggerType: "AUTOMATED",
          dispatchDate: toDispatchDateForRule(input.now, rule.timezone),
          status: "QUEUED",
        },
      })

      await this.database.prisma.emailAutomationRule.update({
        where: {
          id: rule.id,
        },
        data: {
          lastEvaluatedAt: input.now,
        },
      })

      return "CREATED"
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return "SKIPPED"
      }

      throw error
    }
  }

  private async getRuleOrThrow(ruleId: string): Promise<RuleWithCourse> {
    const rule = await this.database.prisma.emailAutomationRule.findUnique({
      where: {
        id: ruleId,
      },
      include: {
        courseOffering: {
          select: {
            id: true,
            code: true,
            displayTitle: true,
            primaryTeacherId: true,
            subject: {
              select: {
                id: true,
                code: true,
                title: true,
              },
            },
          },
        },
      },
    })

    if (!rule) {
      throw new NotFoundException("Email automation rule not found.")
    }

    return rule
  }

  private async assertRuleScopeAccess(auth: AuthRequestContext, classroomId: string) {
    await this.reportsService.assertTeacherReportAccess(auth, {
      classroomId,
    })
  }

  private async resolveLowAttendanceRecipients(
    auth: AuthRequestContext,
    classroomId: string,
    options: {
      from?: string
      to?: string
      thresholdPercent: number
    },
  ): Promise<LowAttendanceEmailRecipientSummary[]> {
    const rows = await this.reportsService.listTeacherStudentPercentageReport(auth, {
      classroomId,
      ...(options.from ? { from: options.from } : {}),
      ...(options.to ? { to: options.to } : {}),
    })

    return rows
      .filter((row) => row.attendancePercentage < options.thresholdPercent)
      .map((row) => this.toRecipientSummary(row))
  }

  private toRecipientSummary(row: TeacherPercentageRow): LowAttendanceEmailRecipientSummary {
    return {
      studentId: row.studentId,
      studentEmail: row.studentEmail,
      studentDisplayName: row.studentDisplayName,
      studentRollNumber: row.studentRollNumber,
      attendancePercentage: row.attendancePercentage,
    }
  }
}
