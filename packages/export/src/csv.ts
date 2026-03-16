type CsvPrimitive = string | number | boolean | null | undefined

function escapeCsvValue(value: CsvPrimitive): string {
  if (value === null || value === undefined) {
    return ""
  }

  const normalized = String(value)

  if (
    normalized.includes(",") ||
    normalized.includes('"') ||
    normalized.includes("\n") ||
    normalized.includes("\r")
  ) {
    return `"${normalized.replaceAll('"', '""')}"`
  }

  return normalized
}

export function buildCsvBuffer(
  headers: readonly string[],
  rows: readonly CsvPrimitive[][],
): Buffer {
  const lines = [
    headers.map((header) => escapeCsvValue(header)).join(","),
    ...rows.map((row) => row.map((value) => escapeCsvValue(value)).join(",")),
  ]

  return Buffer.from(lines.join("\n"), "utf8")
}

export type SessionExportStudentRow = {
  studentEmail: string
  studentDisplayName: string
  studentRollNumber: string | null
  attendanceStatus: string
  markedAt: string | null
}

export function buildSessionCsvBuffer(input: {
  sessionId: string
  classroomCode: string
  classroomTitle: string
  subjectCode: string
  subjectTitle: string
  mode: string
  startedAt: string | null
  endedAt: string | null
  presentCount: number
  absentCount: number
  rows: readonly SessionExportStudentRow[]
}) {
  return buildCsvBuffer(
    [
      "session_id",
      "classroom_code",
      "classroom_title",
      "subject_code",
      "subject_title",
      "attendance_mode",
      "started_at",
      "ended_at",
      "present_count",
      "absent_count",
      "student_email",
      "student_display_name",
      "student_roll_number",
      "attendance_status",
      "marked_at",
    ],
    input.rows.map((row) => [
      input.sessionId,
      input.classroomCode,
      input.classroomTitle,
      input.subjectCode,
      input.subjectTitle,
      input.mode,
      input.startedAt,
      input.endedAt,
      input.presentCount,
      input.absentCount,
      row.studentEmail,
      row.studentDisplayName,
      row.studentRollNumber,
      row.attendanceStatus,
      row.markedAt,
    ]),
  )
}

export type StudentPercentageCsvRow = {
  classroomCode: string
  classroomTitle: string
  classCode: string
  sectionCode: string
  subjectCode: string
  subjectTitle: string
  studentEmail: string
  studentDisplayName: string
  studentRollNumber: string | null
  totalSessions: number
  presentSessions: number
  absentSessions: number
  attendancePercentage: number
}

export function buildStudentPercentageCsvBuffer(rows: readonly StudentPercentageCsvRow[]) {
  return buildCsvBuffer(
    [
      "classroom_code",
      "classroom_title",
      "class_code",
      "section_code",
      "subject_code",
      "subject_title",
      "student_email",
      "student_display_name",
      "student_roll_number",
      "total_sessions",
      "present_sessions",
      "absent_sessions",
      "attendance_percentage",
    ],
    rows.map((row) => [
      row.classroomCode,
      row.classroomTitle,
      row.classCode,
      row.sectionCode,
      row.subjectCode,
      row.subjectTitle,
      row.studentEmail,
      row.studentDisplayName,
      row.studentRollNumber,
      row.totalSessions,
      row.presentSessions,
      row.absentSessions,
      row.attendancePercentage,
    ]),
  )
}

export type ComprehensiveAttendanceMatrixRow = {
  studentEmail: string
  studentDisplayName: string
  studentRollNumber: string | null
  totalSessions: number
  presentSessions: number
  absentSessions: number
  attendancePercentage: number
  subjectBreakdown: string
  sessionStatuses: Record<string, string>
}

export function buildComprehensiveCsvBuffer(input: {
  sessionColumns: readonly { sessionId: string; sessionLabel: string }[]
  rows: readonly ComprehensiveAttendanceMatrixRow[]
}) {
  const headers = [
    "student_email",
    "student_display_name",
    "student_roll_number",
    "total_sessions",
    "present_sessions",
    "absent_sessions",
    "attendance_percentage",
    "subject_breakdown",
    ...input.sessionColumns.map((session) => session.sessionLabel),
  ]

  return buildCsvBuffer(
    headers,
    input.rows.map((row) => [
      row.studentEmail,
      row.studentDisplayName,
      row.studentRollNumber,
      row.totalSessions,
      row.presentSessions,
      row.absentSessions,
      row.attendancePercentage,
      row.subjectBreakdown,
      ...input.sessionColumns.map((session) => row.sessionStatuses[session.sessionId] ?? ""),
    ]),
  )
}
