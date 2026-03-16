import { Prisma } from "@attendease/db"
import { calculateAttendancePercentage } from "@attendease/domain"

export type SessionAggregateInput = {
  id: string
  courseOfferingId: string
  semesterId: string
  classId: string
  sectionId: string
  subjectId: string
  mode: "QR_GPS" | "BLUETOOTH" | "MANUAL"
  rosterSnapshotCount: number
  presentCount: number
  absentCount: number
  startedAt: Date | null
  endedAt: Date | null
  createdAt: Date
}

function getSessionActivityAt(session: {
  endedAt: Date | null
  startedAt: Date | null
  createdAt: Date
}): Date {
  return session.endedAt ?? session.startedAt ?? session.createdAt
}

function toDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function toDateKey(date: Date): string {
  return toDateOnly(date).toISOString().slice(0, 10)
}

export function buildDailyAttendanceRows(sessions: readonly SessionAggregateInput[]) {
  const buckets = new Map<
    string,
    {
      attendanceDate: Date
      totalStudents: number
      presentCount: number
      absentCount: number
    }
  >()

  for (const session of sessions) {
    const attendanceDate = toDateOnly(getSessionActivityAt(session))
    const key = toDateKey(attendanceDate)
    const current = buckets.get(key) ?? {
      attendanceDate,
      totalStudents: 0,
      presentCount: 0,
      absentCount: 0,
    }

    current.totalStudents += session.rosterSnapshotCount
    current.presentCount += session.presentCount
    current.absentCount += session.absentCount
    buckets.set(key, current)
  }

  return [...buckets.values()].map((row) => ({
    courseOfferingId: sessions[0]?.courseOfferingId ?? "",
    attendanceDate: row.attendanceDate,
    totalStudents: row.totalStudents,
    presentCount: row.presentCount,
    absentCount: row.absentCount,
    attendanceRate: new Prisma.Decimal(
      calculateAttendancePercentage({
        presentCount: row.presentCount,
        totalCount: row.presentCount + row.absentCount,
      }),
    ),
  }))
}

export function buildModeUsageRows(sessions: readonly SessionAggregateInput[]) {
  const buckets = new Map<
    string,
    {
      usageDate: Date
      mode: SessionAggregateInput["mode"]
      sessionCount: number
      markedCount: number
    }
  >()

  for (const session of sessions) {
    const usageDate = toDateOnly(getSessionActivityAt(session))
    const key = `${toDateKey(usageDate)}:${session.mode}`
    const current = buckets.get(key) ?? {
      usageDate,
      mode: session.mode,
      sessionCount: 0,
      markedCount: 0,
    }

    current.sessionCount += 1
    current.markedCount += session.presentCount
    buckets.set(key, current)
  }

  return [...buckets.values()].map((row) => ({
    courseOfferingId: sessions[0]?.courseOfferingId ?? "",
    usageDate: row.usageDate,
    mode: row.mode,
    sessionCount: row.sessionCount,
    markedCount: row.markedCount,
  }))
}

export function buildStudentSummaryRows(
  courseOfferingId: string,
  enrollments: readonly { studentId: string }[],
  records: readonly {
    studentId: string
    status: "PRESENT" | "ABSENT"
    session: {
      endedAt: Date | null
      startedAt: Date | null
      createdAt: Date
    }
  }[],
) {
  const summaries = new Map<
    string,
    {
      totalSessions: number
      presentSessions: number
      absentSessions: number
      lastSessionAt: Date | null
    }
  >()

  for (const enrollment of enrollments) {
    summaries.set(enrollment.studentId, {
      totalSessions: 0,
      presentSessions: 0,
      absentSessions: 0,
      lastSessionAt: null,
    })
  }

  for (const record of records) {
    const current = summaries.get(record.studentId) ?? {
      totalSessions: 0,
      presentSessions: 0,
      absentSessions: 0,
      lastSessionAt: null,
    }
    const activityAt = getSessionActivityAt(record.session)

    current.totalSessions += 1
    if (record.status === "PRESENT") {
      current.presentSessions += 1
    } else {
      current.absentSessions += 1
    }
    if (!current.lastSessionAt || activityAt > current.lastSessionAt) {
      current.lastSessionAt = activityAt
    }
    summaries.set(record.studentId, current)
  }

  return [...summaries.entries()].map(([studentId, summary]) => ({
    courseOfferingId,
    studentId,
    totalSessions: summary.totalSessions,
    presentSessions: summary.presentSessions,
    absentSessions: summary.absentSessions,
    attendancePercentage: new Prisma.Decimal(
      calculateAttendancePercentage({
        presentCount: summary.presentSessions,
        totalCount: summary.totalSessions,
      }),
    ),
    lastSessionAt: summary.lastSessionAt,
  }))
}

export function buildSubjectAttendanceRows(sessions: readonly SessionAggregateInput[]) {
  const buckets = new Map<
    string,
    {
      semesterId: string
      classId: string
      sectionId: string
      subjectId: string
      snapshotDate: Date
      totalStudents: number
      totalSessions: number
      presentCount: number
      absentCount: number
    }
  >()

  for (const session of sessions) {
    const snapshotDate = toDateOnly(getSessionActivityAt(session))
    const key = `${session.semesterId}:${session.classId}:${session.sectionId}:${session.subjectId}:${toDateKey(
      snapshotDate,
    )}`
    const current = buckets.get(key) ?? {
      semesterId: session.semesterId,
      classId: session.classId,
      sectionId: session.sectionId,
      subjectId: session.subjectId,
      snapshotDate,
      totalStudents: 0,
      totalSessions: 0,
      presentCount: 0,
      absentCount: 0,
    }

    current.totalStudents += session.rosterSnapshotCount
    current.totalSessions += 1
    current.presentCount += session.presentCount
    current.absentCount += session.absentCount
    buckets.set(key, current)
  }

  return [...buckets.values()].map((row) => ({
    semesterId: row.semesterId,
    classId: row.classId,
    sectionId: row.sectionId,
    subjectId: row.subjectId,
    snapshotDate: row.snapshotDate,
    totalStudents: row.totalStudents,
    totalSessions: row.totalSessions,
    presentCount: row.presentCount,
    absentCount: row.absentCount,
    averageAttendanceRate: new Prisma.Decimal(
      calculateAttendancePercentage({
        presentCount: row.presentCount,
        totalCount: row.presentCount + row.absentCount,
      }),
    ),
  }))
}
