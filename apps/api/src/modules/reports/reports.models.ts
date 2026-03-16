import type {
  StudentReportOverview,
  StudentSubjectReportClassroomRow,
  StudentSubjectReportDetail,
  StudentSubjectReportSummary,
  TeacherDaywiseAttendanceReportRow,
  TeacherStudentAttendancePercentageReportRow,
  TeacherSubjectwiseAttendanceReportRow,
} from "@attendease/contracts"
import { calculateAttendancePercentage } from "@attendease/domain"

type NullableDateValue = Date | string | null
type NumberLike = bigint | number | string

export type TeacherDaywiseRollupRow = {
  attendance_date: Date | string
  course_offering_id: string
  course_offering_code: string
  course_offering_title: string
  class_id: string
  class_code: string
  class_title: string
  section_id: string
  section_code: string
  section_title: string
  subject_id: string
  subject_code: string
  subject_title: string
  session_count: NumberLike
  total_students: NumberLike
  present_count: NumberLike
  absent_count: NumberLike
  last_session_at: NullableDateValue
}

export type TeacherSubjectwiseRollupRow = Omit<
  TeacherDaywiseRollupRow,
  "attendance_date" | "session_count"
> & {
  total_sessions: NumberLike
}

export type TeacherStudentPercentageRow = {
  course_offering_id: string
  course_offering_code: string
  course_offering_title: string
  class_id: string
  class_code: string
  class_title: string
  section_id: string
  section_code: string
  section_title: string
  subject_id: string
  subject_code: string
  subject_title: string
  student_id: string
  student_email: string
  student_name: string
  student_roll_number: string | null
  enrollment_status: "ACTIVE" | "PENDING" | "DROPPED" | "BLOCKED"
  total_sessions: NumberLike
  present_sessions: NumberLike
  absent_sessions: NumberLike
  last_session_at: NullableDateValue
}

export type StudentOverviewRow = {
  student_id: string
  tracked_classroom_count: NumberLike
  total_sessions: NumberLike
  present_sessions: NumberLike
  absent_sessions: NumberLike
  last_session_at: NullableDateValue
}

export type StudentSubjectAggregateRow = {
  subject_id: string
  subject_code: string
  subject_title: string
  course_offering_id: string
  course_offering_code: string
  course_offering_title: string
  total_sessions: NumberLike
  present_sessions: NumberLike
  absent_sessions: NumberLike
  last_session_at: NullableDateValue
}

function toNumber(value: NumberLike): number {
  if (typeof value === "number") {
    return value
  }

  if (typeof value === "bigint") {
    return Number(value)
  }

  return Number.parseInt(value, 10)
}

function toIsoDateTime(value: Date | string): string {
  return new Date(value).toISOString()
}

function toNullableIsoDateTime(value: NullableDateValue): string | null {
  if (!value) {
    return null
  }

  return new Date(value).toISOString()
}

function toAttendancePercentage(presentCount: NumberLike, absentCount: NumberLike): number {
  const present = toNumber(presentCount)
  const absent = toNumber(absentCount)

  return calculateAttendancePercentage({
    presentCount: present,
    totalCount: present + absent,
  })
}

export function toTeacherDaywiseAttendanceReportRow(
  row: TeacherDaywiseRollupRow,
): TeacherDaywiseAttendanceReportRow {
  return {
    attendanceDate: toIsoDateTime(row.attendance_date),
    classroomId: row.course_offering_id,
    classroomCode: row.course_offering_code,
    classroomDisplayTitle: row.course_offering_title,
    classId: row.class_id,
    classCode: row.class_code,
    classTitle: row.class_title,
    sectionId: row.section_id,
    sectionCode: row.section_code,
    sectionTitle: row.section_title,
    subjectId: row.subject_id,
    subjectCode: row.subject_code,
    subjectTitle: row.subject_title,
    sessionCount: toNumber(row.session_count),
    totalStudents: toNumber(row.total_students),
    presentCount: toNumber(row.present_count),
    absentCount: toNumber(row.absent_count),
    attendancePercentage: toAttendancePercentage(row.present_count, row.absent_count),
    lastSessionAt: toNullableIsoDateTime(row.last_session_at),
  }
}

export function toTeacherSubjectwiseAttendanceReportRow(
  row: TeacherSubjectwiseRollupRow,
): TeacherSubjectwiseAttendanceReportRow {
  return {
    classroomId: row.course_offering_id,
    classroomCode: row.course_offering_code,
    classroomDisplayTitle: row.course_offering_title,
    classId: row.class_id,
    classCode: row.class_code,
    classTitle: row.class_title,
    sectionId: row.section_id,
    sectionCode: row.section_code,
    sectionTitle: row.section_title,
    subjectId: row.subject_id,
    subjectCode: row.subject_code,
    subjectTitle: row.subject_title,
    totalSessions: toNumber(row.total_sessions),
    totalStudents: toNumber(row.total_students),
    presentCount: toNumber(row.present_count),
    absentCount: toNumber(row.absent_count),
    attendancePercentage: toAttendancePercentage(row.present_count, row.absent_count),
    lastSessionAt: toNullableIsoDateTime(row.last_session_at),
  }
}

export function toTeacherStudentAttendancePercentageReportRow(
  row: TeacherStudentPercentageRow,
): TeacherStudentAttendancePercentageReportRow {
  return {
    classroomId: row.course_offering_id,
    classroomCode: row.course_offering_code,
    classroomDisplayTitle: row.course_offering_title,
    classId: row.class_id,
    classCode: row.class_code,
    classTitle: row.class_title,
    sectionId: row.section_id,
    sectionCode: row.section_code,
    sectionTitle: row.section_title,
    subjectId: row.subject_id,
    subjectCode: row.subject_code,
    subjectTitle: row.subject_title,
    studentId: row.student_id,
    studentEmail: row.student_email,
    studentDisplayName: row.student_name,
    studentRollNumber: row.student_roll_number,
    enrollmentStatus: row.enrollment_status,
    totalSessions: toNumber(row.total_sessions),
    presentSessions: toNumber(row.present_sessions),
    absentSessions: toNumber(row.absent_sessions),
    attendancePercentage: calculateAttendancePercentage({
      presentCount: toNumber(row.present_sessions),
      totalCount: toNumber(row.total_sessions),
    }),
    lastSessionAt: toNullableIsoDateTime(row.last_session_at),
  }
}

export function toStudentReportOverview(
  studentId: string,
  row?: StudentOverviewRow | null,
): StudentReportOverview {
  if (!row) {
    return {
      studentId,
      trackedClassroomCount: 0,
      totalSessions: 0,
      presentSessions: 0,
      absentSessions: 0,
      attendancePercentage: 0,
      lastSessionAt: null,
    }
  }

  const totalSessions = toNumber(row.total_sessions)
  const presentSessions = toNumber(row.present_sessions)

  return {
    studentId,
    trackedClassroomCount: toNumber(row.tracked_classroom_count),
    totalSessions,
    presentSessions,
    absentSessions: toNumber(row.absent_sessions),
    attendancePercentage: calculateAttendancePercentage({
      presentCount: presentSessions,
      totalCount: totalSessions,
    }),
    lastSessionAt: toNullableIsoDateTime(row.last_session_at),
  }
}

export function toStudentSubjectReportSummaries(
  rows: StudentSubjectAggregateRow[],
): StudentSubjectReportSummary[] {
  const summaryMap = new Map<
    string,
    {
      subjectId: string
      subjectCode: string
      subjectTitle: string
      classroomCount: number
      totalSessions: number
      presentSessions: number
      absentSessions: number
      lastSessionAt: string | null
    }
  >()

  for (const row of rows) {
    const current = summaryMap.get(row.subject_id) ?? {
      subjectId: row.subject_id,
      subjectCode: row.subject_code,
      subjectTitle: row.subject_title,
      classroomCount: 0,
      totalSessions: 0,
      presentSessions: 0,
      absentSessions: 0,
      lastSessionAt: null,
    }

    current.classroomCount += 1
    current.totalSessions += toNumber(row.total_sessions)
    current.presentSessions += toNumber(row.present_sessions)
    current.absentSessions += toNumber(row.absent_sessions)

    const nextLastSessionAt = toNullableIsoDateTime(row.last_session_at)

    if (
      nextLastSessionAt &&
      (!current.lastSessionAt || new Date(nextLastSessionAt) > new Date(current.lastSessionAt))
    ) {
      current.lastSessionAt = nextLastSessionAt
    }

    summaryMap.set(row.subject_id, current)
  }

  return [...summaryMap.values()]
    .map((row) => ({
      ...row,
      attendancePercentage: calculateAttendancePercentage({
        presentCount: row.presentSessions,
        totalCount: row.totalSessions,
      }),
    }))
    .sort((left, right) => left.subjectCode.localeCompare(right.subjectCode))
}

export function toStudentSubjectReportDetail(
  subjectId: string,
  rows: StudentSubjectAggregateRow[],
): StudentSubjectReportDetail | null {
  const matchingRows = rows.filter((row) => row.subject_id === subjectId)

  if (matchingRows.length === 0) {
    return null
  }

  const summaries = toStudentSubjectReportSummaries(matchingRows)
  const summary = summaries[0]

  if (!summary) {
    return null
  }

  const classrooms: StudentSubjectReportClassroomRow[] = matchingRows
    .map((row) => ({
      classroomId: row.course_offering_id,
      classroomCode: row.course_offering_code,
      classroomDisplayTitle: row.course_offering_title,
      totalSessions: toNumber(row.total_sessions),
      presentSessions: toNumber(row.present_sessions),
      absentSessions: toNumber(row.absent_sessions),
      attendancePercentage: calculateAttendancePercentage({
        presentCount: toNumber(row.present_sessions),
        totalCount: toNumber(row.total_sessions),
      }),
      lastSessionAt: toNullableIsoDateTime(row.last_session_at),
    }))
    .sort((left, right) => left.classroomCode.localeCompare(right.classroomCode))

  return {
    ...summary,
    classrooms,
  }
}
