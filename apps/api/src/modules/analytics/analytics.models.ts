import type {
  AnalyticsModeUsageResponse,
  AnalyticsStudentTimelineItem,
  AnalyticsTrendPoint,
  AnalyticsTrendResponse,
} from "@attendease/contracts"
import { calculatePresentAttendancePercentage } from "@attendease/domain"

type AnalyticsDailyAggregateInput = {
  attendanceDate: Date
  sessionCount: number
  totalStudents: number
  presentCount: number
  absentCount: number
}

type TrendBucketAccumulator = {
  periodKey: string
  label: string
  startDate: Date
  endDate: Date
  sessionCount: number
  totalStudents: number
  presentCount: number
  absentCount: number
}

export type AnalyticsModeUsageInput = {
  usageDate: Date
  mode: "QR_GPS" | "BLUETOOTH" | "MANUAL"
  sessionCount: number
  markedCount: number
}

export type StudentTimelineRow = {
  sessionId: string
  classroomId: string
  classroomCode: string
  classroomDisplayTitle: string
  subjectId: string
  subjectCode: string
  subjectTitle: string
  lectureId: string | null
  lectureTitle: string | null
  lectureDate: Date | null
  mode: "QR_GPS" | "BLUETOOTH" | "MANUAL"
  sessionStatus: "DRAFT" | "ACTIVE" | "ENDED" | "CANCELLED" | "EXPIRED"
  attendanceStatus: "PRESENT" | "ABSENT"
  markedAt: Date | null
  startedAt: Date | null
  endedAt: Date | null
}

function toUtcDateKey(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function getUtcWeekStart(value: Date): Date {
  const normalized = new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  )
  const weekday = normalized.getUTCDay()
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday
  normalized.setUTCDate(normalized.getUTCDate() + mondayOffset)
  return normalized
}

function getUtcWeekEnd(weekStart: Date): Date {
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6)
  return weekEnd
}

function getIsoWeekKey(value: Date): string {
  const weekStart = getUtcWeekStart(value)
  const januaryFourth = new Date(Date.UTC(weekStart.getUTCFullYear(), 0, 4))
  const firstWeekStart = getUtcWeekStart(januaryFourth)
  const diffDays = Math.round(
    (weekStart.getTime() - firstWeekStart.getTime()) / (24 * 60 * 60 * 1000),
  )
  const weekNumber = Math.floor(diffDays / 7) + 1

  return `${weekStart.getUTCFullYear()}-W${weekNumber.toString().padStart(2, "0")}`
}

function formatUtcMonthLabel(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(value)
}

function formatUtcShortDate(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(value)
}

function buildTrendPoint(accumulator: TrendBucketAccumulator): AnalyticsTrendPoint {
  return {
    periodKey: accumulator.periodKey,
    label: accumulator.label,
    startDate: accumulator.startDate.toISOString(),
    endDate: accumulator.endDate.toISOString(),
    sessionCount: accumulator.sessionCount,
    totalStudents: accumulator.totalStudents,
    presentCount: accumulator.presentCount,
    absentCount: accumulator.absentCount,
    attendancePercentage: calculatePresentAttendancePercentage({
      presentCount: accumulator.presentCount,
      absentCount: accumulator.absentCount,
    }),
  }
}

function buildTrendBuckets(
  rows: readonly AnalyticsDailyAggregateInput[],
  mode: "weekly" | "monthly",
): AnalyticsTrendPoint[] {
  const buckets = new Map<string, TrendBucketAccumulator>()

  for (const row of rows) {
    const periodStart =
      mode === "weekly"
        ? getUtcWeekStart(row.attendanceDate)
        : new Date(
            Date.UTC(row.attendanceDate.getUTCFullYear(), row.attendanceDate.getUTCMonth(), 1),
          )
    const periodEnd =
      mode === "weekly"
        ? getUtcWeekEnd(periodStart)
        : new Date(
            Date.UTC(row.attendanceDate.getUTCFullYear(), row.attendanceDate.getUTCMonth() + 1, 0),
          )
    const periodKey =
      mode === "weekly"
        ? getIsoWeekKey(row.attendanceDate)
        : `${row.attendanceDate.getUTCFullYear()}-${(row.attendanceDate.getUTCMonth() + 1)
            .toString()
            .padStart(2, "0")}`
    const label =
      mode === "weekly"
        ? `Week of ${formatUtcShortDate(periodStart)}`
        : formatUtcMonthLabel(periodStart)
    const current = buckets.get(periodKey) ?? {
      periodKey,
      label,
      startDate: periodStart,
      endDate: periodEnd,
      sessionCount: 0,
      totalStudents: 0,
      presentCount: 0,
      absentCount: 0,
    }

    current.sessionCount += row.sessionCount
    current.totalStudents += row.totalStudents
    current.presentCount += row.presentCount
    current.absentCount += row.absentCount
    buckets.set(periodKey, current)
  }

  return [...buckets.values()]
    .sort((left, right) => left.startDate.getTime() - right.startDate.getTime())
    .map(buildTrendPoint)
}

export function buildAnalyticsTrendResponse(
  rows: readonly AnalyticsDailyAggregateInput[],
): AnalyticsTrendResponse {
  return {
    weekly: buildTrendBuckets(rows, "weekly"),
    monthly: buildTrendBuckets(rows, "monthly"),
  }
}

export function buildAnalyticsModeUsageResponse(
  rows: readonly AnalyticsModeUsageInput[],
): AnalyticsModeUsageResponse {
  const totals = new Map<
    AnalyticsModeUsageInput["mode"],
    { sessionCount: number; markedCount: number }
  >()

  for (const row of rows) {
    const current = totals.get(row.mode) ?? {
      sessionCount: 0,
      markedCount: 0,
    }
    current.sessionCount += row.sessionCount
    current.markedCount += row.markedCount
    totals.set(row.mode, current)
  }

  return {
    totals: [...totals.entries()]
      .map(([mode, value]) => ({
        mode,
        sessionCount: value.sessionCount,
        markedCount: value.markedCount,
      }))
      .sort((left, right) => left.mode.localeCompare(right.mode)),
    trend: [...rows]
      .sort(
        (left, right) =>
          left.usageDate.getTime() - right.usageDate.getTime() ||
          left.mode.localeCompare(right.mode),
      )
      .map((row) => ({
        usageDate: row.usageDate.toISOString(),
        mode: row.mode,
        sessionCount: row.sessionCount,
        markedCount: row.markedCount,
      })),
  }
}

export function toAnalyticsStudentTimelineItem(
  row: StudentTimelineRow,
): AnalyticsStudentTimelineItem {
  return {
    sessionId: row.sessionId,
    classroomId: row.classroomId,
    classroomCode: row.classroomCode,
    classroomDisplayTitle: row.classroomDisplayTitle,
    subjectId: row.subjectId,
    subjectCode: row.subjectCode,
    subjectTitle: row.subjectTitle,
    lectureId: row.lectureId,
    lectureTitle: row.lectureTitle,
    lectureDate: row.lectureDate?.toISOString() ?? null,
    mode: row.mode,
    sessionStatus: row.sessionStatus,
    attendanceStatus: row.attendanceStatus,
    markedAt: row.markedAt?.toISOString() ?? null,
    startedAt: row.startedAt?.toISOString() ?? null,
    endedAt: row.endedAt?.toISOString() ?? null,
  }
}

export function sumSessionDateKey(value: Date | null, fallback: Date): string {
  return toUtcDateKey(value ?? fallback)
}
