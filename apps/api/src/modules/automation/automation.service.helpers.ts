import type { LowAttendanceEmailRecipientSummary } from "@attendease/contracts"
import { type Prisma, isUniqueConstraintError } from "@attendease/db"
import { toDispatchDateForRule } from "@attendease/domain"
import { NotFoundException } from "@nestjs/common"

import type { DatabaseService } from "../../database/database.service.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import type { ReportsService } from "../reports/reports.service.js"

export type RuleWithCourse = Prisma.EmailAutomationRuleGetPayload<{
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

export type TeacherPercentageRow = Awaited<
  ReturnType<ReportsService["listTeacherStudentPercentageReport"]>
>[number]

export async function getRuleOrThrow(input: {
  database: DatabaseService
  ruleId: string
}): Promise<RuleWithCourse> {
  const rule = await input.database.prisma.emailAutomationRule.findUnique({
    where: {
      id: input.ruleId,
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

export async function assertRuleScopeAccess(input: {
  reportsService: ReportsService
  auth: AuthRequestContext
  classroomId: string
}) {
  await input.reportsService.assertTeacherReportAccess(input.auth, {
    classroomId: input.classroomId,
  })
}

export async function resolveLowAttendanceRecipients(input: {
  reportsService: ReportsService
  auth: AuthRequestContext
  classroomId: string
  options: {
    from?: string
    to?: string
    thresholdPercent: number
  }
}): Promise<LowAttendanceEmailRecipientSummary[]> {
  const rows = await input.reportsService.listTeacherStudentPercentageReport(input.auth, {
    classroomId: input.classroomId,
    ...(input.options.from ? { from: input.options.from } : {}),
    ...(input.options.to ? { to: input.options.to } : {}),
  })

  return rows
    .filter((row) => row.attendancePercentage < input.options.thresholdPercent)
    .map(toRecipientSummary)
}

function toRecipientSummary(row: TeacherPercentageRow): LowAttendanceEmailRecipientSummary {
  return {
    studentId: row.studentId,
    studentEmail: row.studentEmail,
    studentDisplayName: row.studentDisplayName,
    studentRollNumber: row.studentRollNumber,
    attendancePercentage: row.attendancePercentage,
  }
}

export async function createAutomatedDispatchRunIfDue(input: {
  database: DatabaseService
  ruleId: string
  now: Date
}): Promise<"CREATED" | "SKIPPED"> {
  const rule = await input.database.prisma.emailAutomationRule.findUnique({
    where: {
      id: input.ruleId,
    },
  })

  if (!rule || rule.status !== "ACTIVE") {
    return "SKIPPED"
  }

  try {
    await input.database.prisma.emailDispatchRun.create({
      data: {
        ruleId: rule.id,
        triggerType: "AUTOMATED",
        dispatchDate: toDispatchDateForRule(input.now, rule.timezone),
        status: "QUEUED",
      },
    })

    await input.database.prisma.emailAutomationRule.update({
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
