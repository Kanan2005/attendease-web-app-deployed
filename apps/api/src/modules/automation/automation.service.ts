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
  ManualLowAttendanceEmailSendRequest,
  ManualLowAttendanceEmailSendResponse,
  UpdateEmailAutomationRuleRequest,
} from "@attendease/contracts"
import { toDispatchDateForRule, toManualDispatchDateRange } from "@attendease/domain"
import { ConflictException, Inject, Injectable } from "@nestjs/common"
import {
  buildLowAttendanceEmailPreview,
  toEmailAutomationRuleSummary,
  toEmailDispatchRunSummary,
  toEmailLogSummary,
} from "./automation.models.js"

import { DatabaseService } from "../../database/database.service.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import { ReportsService } from "../reports/reports.service.js"
import {
  assertRuleScopeAccess,
  createAutomatedDispatchRunIfDue,
  getRuleOrThrow,
  resolveLowAttendanceRecipients,
} from "./automation.service.helpers.js"

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
    await assertRuleScopeAccess({
      reportsService: this.reportsService,
      auth,
      classroomId: request.classroomId,
    })

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
    const rule = await getRuleOrThrow({
      database: this.database,
      ruleId: params.ruleId,
    })
    await assertRuleScopeAccess({
      reportsService: this.reportsService,
      auth,
      classroomId: rule.courseOfferingId,
    })

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
    const rule = await getRuleOrThrow({
      database: this.database,
      ruleId: request.ruleId,
    })
    await assertRuleScopeAccess({
      reportsService: this.reportsService,
      auth,
      classroomId: rule.courseOfferingId,
    })

    const thresholdPercent = request.thresholdPercent ?? rule.thresholdPercent.toNumber()
    const recipients = await resolveLowAttendanceRecipients({
      reportsService: this.reportsService,
      auth,
      classroomId: rule.courseOfferingId,
      options: {
        thresholdPercent,
        ...(request.from ? { from: request.from } : {}),
        ...(request.to ? { to: request.to } : {}),
      },
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
    const rule = await getRuleOrThrow({
      database: this.database,
      ruleId: request.ruleId,
    })
    await assertRuleScopeAccess({
      reportsService: this.reportsService,
      auth,
      classroomId: rule.courseOfferingId,
    })

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
    return createAutomatedDispatchRunIfDue({
      database: this.database,
      ruleId: input.ruleId,
      now: input.now,
    })
  }
}
