import type { ManualLowAttendanceEmailSendRequest } from "@attendease/contracts"
import { manualLowAttendanceEmailSendRequestSchema } from "@attendease/contracts"
import { Prisma } from "@attendease/db"
import { getLocalClockParts } from "@attendease/domain"

export const nonDroppedEnrollmentStatuses = ["ACTIVE", "PENDING", "BLOCKED"] as const
export const finalizedSessionStatuses = ["ENDED", "EXPIRED"] as const
export const defaultStuckDispatchRunTimeoutMs = 15 * 60 * 1000

export function appendCondition(conditions: Prisma.Sql[], condition: Prisma.Sql) {
  conditions.push(condition)
}

export function buildWhereClause(conditions: Prisma.Sql[]): Prisma.Sql {
  if (conditions.length === 0) {
    return Prisma.empty
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
}

export function toDateOnlyString(value: string | undefined): string | null {
  if (!value) {
    return null
  }

  return new Date(value).toISOString().slice(0, 10)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function parseManualSnapshot(
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

export function wasRuleEvaluatedForCurrentMinute(input: {
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
