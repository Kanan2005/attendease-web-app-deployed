import type {
  LowAttendanceEmailRecipientSummary,
  ManualLowAttendanceEmailSendRequest,
} from "@attendease/contracts"

export type LocalClockParts = {
  localDate: string
  hour: number
  minute: number
}

export type LowAttendanceRecipientInput = {
  studentId: string
  studentEmail: string
  studentDisplayName: string
  studentRollNumber: string | null
  attendancePercentage: number
}

function getFormatter(timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

export function getLocalClockParts(value: Date, timezone: string): LocalClockParts {
  const parts = getFormatter(timezone).formatToParts(value)
  const byType = new Map(parts.map((part) => [part.type, part.value]))

  return {
    localDate: `${byType.get("year")}-${byType.get("month")}-${byType.get("day")}`,
    hour: Number(byType.get("hour") ?? "0"),
    minute: Number(byType.get("minute") ?? "0"),
  }
}

export function isRuleDueAt(input: {
  now: Date
  timezone: string
  scheduleHourLocal: number
  scheduleMinuteLocal: number
}): boolean {
  const local = getLocalClockParts(input.now, input.timezone)

  return local.hour === input.scheduleHourLocal && local.minute === input.scheduleMinuteLocal
}

export function toDispatchDateForRule(now: Date, timezone: string): Date {
  const local = getLocalClockParts(now, timezone)
  const [year, month, day] = local.localDate.split("-").map(Number)

  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1))
}

export function selectLowAttendanceRecipients(
  rows: readonly LowAttendanceRecipientInput[],
  thresholdPercent: number,
): LowAttendanceEmailRecipientSummary[] {
  return rows
    .filter((row) => row.attendancePercentage < thresholdPercent)
    .sort((left, right) => {
      if (left.attendancePercentage !== right.attendancePercentage) {
        return left.attendancePercentage - right.attendancePercentage
      }

      const leftRoll = left.studentRollNumber ?? ""
      const rightRoll = right.studentRollNumber ?? ""

      if (leftRoll !== rightRoll) {
        return leftRoll.localeCompare(rightRoll)
      }

      return left.studentEmail.localeCompare(right.studentEmail)
    })
    .map((row) => ({
      studentId: row.studentId,
      studentEmail: row.studentEmail,
      studentDisplayName: row.studentDisplayName,
      studentRollNumber: row.studentRollNumber,
      attendancePercentage: row.attendancePercentage,
    }))
}

export function toManualDispatchDateRange(
  request: Pick<ManualLowAttendanceEmailSendRequest, "from" | "to">,
) {
  return {
    from: request.from ?? null,
    to: request.to ?? null,
  }
}
