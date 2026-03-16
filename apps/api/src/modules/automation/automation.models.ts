import type {
  EmailAutomationRuleResponse,
  EmailDispatchRunSummary,
  EmailLogSummary,
  LowAttendanceEmailPreviewResponse,
  LowAttendanceEmailRecipientSummary,
} from "@attendease/contracts"
import type { Prisma } from "@attendease/db"
import { renderLowAttendanceEmail } from "@attendease/email"

type RuleWithCourse = Prisma.EmailAutomationRuleGetPayload<{
  include: {
    courseOffering: {
      select: {
        id: true
        code: true
        displayTitle: true
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

type DispatchRunWithRelations = Prisma.EmailDispatchRunGetPayload<{
  include: {
    rule: {
      include: {
        courseOffering: {
          select: {
            id: true
            code: true
            displayTitle: true
          }
        }
      }
    }
  }
}>

type EmailLogWithRelations = Prisma.EmailLogGetPayload<{
  include: {
    rule: {
      include: {
        courseOffering: {
          select: {
            id: true
            code: true
            displayTitle: true
          }
        }
      }
    }
    dispatchRun: {
      select: {
        triggerType: true
      }
    }
    student: {
      select: {
        id: true
        displayName: true
      }
    }
  }
}>

function decimalToNumber(value: { toNumber(): number } | number): number {
  return typeof value === "number" ? value : value.toNumber()
}

export function toEmailAutomationRuleSummary(rule: RuleWithCourse): EmailAutomationRuleResponse {
  return {
    id: rule.id,
    classroomId: rule.courseOffering.id,
    classroomCode: rule.courseOffering.code,
    classroomDisplayTitle: rule.courseOffering.displayTitle,
    subjectId: rule.courseOffering.subject.id,
    subjectCode: rule.courseOffering.subject.code,
    subjectTitle: rule.courseOffering.subject.title,
    status: rule.status,
    thresholdPercent: decimalToNumber(rule.thresholdPercent),
    scheduleHourLocal: rule.scheduleHourLocal,
    scheduleMinuteLocal: rule.scheduleMinuteLocal,
    timezone: rule.timezone,
    templateSubject: rule.templateSubject,
    templateBody: rule.templateBody,
    lastEvaluatedAt: rule.lastEvaluatedAt?.toISOString() ?? null,
    lastSuccessfulRunAt: rule.lastSuccessfulRunAt?.toISOString() ?? null,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  }
}

export function toEmailDispatchRunSummary(run: DispatchRunWithRelations): EmailDispatchRunSummary {
  return {
    id: run.id,
    ruleId: run.ruleId,
    classroomId: run.rule.courseOffering.id,
    classroomCode: run.rule.courseOffering.code,
    classroomDisplayTitle: run.rule.courseOffering.displayTitle,
    triggerType: run.triggerType,
    dispatchDate: run.dispatchDate.toISOString(),
    status: run.status,
    targetedStudentCount: run.targetedStudentCount,
    sentCount: run.sentCount,
    failedCount: run.failedCount,
    startedAt: run.startedAt?.toISOString() ?? null,
    completedAt: run.completedAt?.toISOString() ?? null,
    failedAt: run.failedAt?.toISOString() ?? null,
    errorMessage: run.errorMessage,
    createdAt: run.createdAt.toISOString(),
  }
}

export function toEmailLogSummary(log: EmailLogWithRelations): EmailLogSummary {
  return {
    id: log.id,
    dispatchRunId: log.dispatchRunId,
    ruleId: log.ruleId,
    classroomId: log.rule?.courseOffering.id ?? null,
    classroomCode: log.rule?.courseOffering.code ?? null,
    classroomDisplayTitle: log.rule?.courseOffering.displayTitle ?? null,
    recipientEmail: log.recipientEmail,
    studentId: log.student?.id ?? null,
    studentDisplayName: log.student?.displayName ?? null,
    status: log.status,
    subject: log.subject,
    failureReason: log.failureReason,
    providerMessageId: log.providerMessageId,
    triggerType: log.dispatchRun?.triggerType ?? null,
    sentAt: log.sentAt?.toISOString() ?? null,
    createdAt: log.createdAt.toISOString(),
  }
}

export function buildLowAttendanceEmailPreview(params: {
  rule: RuleWithCourse
  thresholdPercent: number
  recipients: LowAttendanceEmailRecipientSummary[]
  dateRange: {
    from: string | null
    to: string | null
  }
  templateSubject: string
  templateBody: string
  environment: string
}): LowAttendanceEmailPreviewResponse {
  const sampleRecipient = params.recipients[0] ?? {
    studentId: "preview-student",
    studentEmail: "preview.student@attendease.dev",
    studentDisplayName: "Student Preview",
    studentRollNumber: null,
    attendancePercentage: Math.max(0, params.thresholdPercent - 10),
  }
  const rendered = renderLowAttendanceEmail({
    environment: params.environment,
    templateSubject: params.templateSubject,
    templateBody: params.templateBody,
    studentName: sampleRecipient.studentDisplayName,
    classroomTitle: params.rule.courseOffering.displayTitle,
    subjectTitle: params.rule.courseOffering.subject.title,
    attendancePercentage: sampleRecipient.attendancePercentage,
    thresholdPercent: params.thresholdPercent,
  })

  return {
    rule: toEmailAutomationRuleSummary(params.rule),
    thresholdPercent: params.thresholdPercent,
    recipientCount: params.recipients.length,
    sampleRecipients: params.recipients.slice(0, 5),
    previewSubject: rendered.subject,
    previewText: rendered.textBody,
    previewHtml: rendered.htmlBody,
    dateRange: params.dateRange.from || params.dateRange.to ? params.dateRange : null,
  }
}
