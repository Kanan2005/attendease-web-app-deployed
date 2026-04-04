import type {
  AttendanceSessionDetail,
  AttendanceSessionHistoryItem,
  ClassroomSummary,
  RosterImportRowInput,
  TeacherDaywiseAttendanceReportRow,
  TeacherStudentAttendancePercentageReportRow,
  TeacherSubjectwiseAttendanceReportRow,
} from "@attendease/contracts"
import { calculateAttendancePercentage } from "@attendease/domain"

import type { TeacherCardTone } from "./teacher-models"
import type {
  TeacherDaywiseReportRowModel,
  TeacherExportAvailabilityModel,
  TeacherExportRequestModel,
  TeacherJoinCodeActionModel,
  TeacherReportCard,
  TeacherReportFilterOption,
  TeacherReportOverviewModel,
  TeacherRosterImportDraftModel,
  TeacherSessionTrendRow,
  TeacherStudentReportRowModel,
  TeacherSubjectReportRow,
} from "./teacher-operational-types"

export function buildTeacherRosterImportDraftModel(
  rawInput: string,
): TeacherRosterImportDraftModel {
  const rows: RosterImportRowInput[] = []
  const invalidLines: string[] = []

  for (const line of rawInput.split(/\r?\n/)) {
    const trimmed = line.trim()

    if (!trimmed) {
      continue
    }

    const segments = trimmed
      .split(",")
      .map((segment) => segment.trim())
      .filter(Boolean)

    if (segments.length === 0) {
      continue
    }

    const parsed = parseRosterImportSegments(segments)

    if (!parsed) {
      invalidLines.push(trimmed)
      continue
    }

    rows.push(parsed)
  }

  return {
    rows,
    invalidLines,
  }
}

export function buildTeacherReportFilterOptions(input: {
  classrooms: ClassroomSummary[]
  subjectRows: TeacherSubjectwiseAttendanceReportRow[]
}) {
  const classroomOptions: TeacherReportFilterOption[] = input.classrooms
    .filter((c) => c.status !== "ARCHIVED")
    .map((classroom) => ({
      value: classroom.id,
      label: classroom.displayTitle,
    }))
    .sort((left, right) => left.label.localeCompare(right.label))

  const subjectOptionMap = new Map<string, TeacherReportFilterOption>()

  for (const row of input.subjectRows) {
    if (!subjectOptionMap.has(row.subjectId)) {
      subjectOptionMap.set(row.subjectId, {
        value: row.subjectId,
        label: row.subjectTitle,
      })
    }
  }

  return {
    classroomOptions,
    subjectOptions: [...subjectOptionMap.values()].sort((left, right) =>
      left.label.localeCompare(right.label),
    ),
  }
}

export function buildTeacherReportOverviewModel(input: {
  daywiseRows: TeacherDaywiseAttendanceReportRow[]
  subjectRows: TeacherSubjectwiseAttendanceReportRow[]
  studentRows: TeacherStudentAttendancePercentageReportRow[]
  sessions: AttendanceSessionHistoryItem[]
  filterLabels?: {
    classroom?: string | null
    subject?: string | null
  }
}): TeacherReportOverviewModel {
  const uniqueClassroomIds = new Set(input.subjectRows.map((row) => row.classroomId))
  const uniqueSubjectIds = new Set(input.subjectRows.map((row) => row.subjectId))
  const uniqueStudentIds = new Set(input.studentRows.map((row) => row.studentId))
  const totalPresent = input.studentRows.reduce((sum, row) => sum + row.presentSessions, 0)
  const totalSessions = input.studentRows.reduce((sum, row) => sum + row.totalSessions, 0)
  const studentsNeedingFollowUp = input.studentRows.filter(
    (row) => row.attendancePercentage > 0 && row.attendancePercentage < 75,
  ).length
  const latestDaywiseRow = [...input.daywiseRows].sort(
    (left, right) =>
      new Date(right.lastSessionAt ?? right.attendanceDate).getTime() -
      new Date(left.lastSessionAt ?? left.attendanceDate).getTime(),
  )[0]
  const overallAttendance = calculateAttendancePercentage({
    presentCount: totalPresent,
    totalCount: totalSessions,
  })
  const filterSummary = [
    input.filterLabels?.classroom ? `Classroom: ${input.filterLabels.classroom}` : "All classrooms",
    input.filterLabels?.subject ? `Subject: ${input.filterLabels.subject}` : "All subjects",
  ].join(" · ")

  return {
    summaryCards: [
      {
        label: "Students",
        value: String(uniqueStudentIds.size),
        tone: uniqueStudentIds.size > 0 ? "primary" : "warning",
      },
      {
        label: "Attendance",
        value: `${overallAttendance}%`,
        tone: toneForAttendancePercentage(overallAttendance),
      },
      {
        label: "Follow-up",
        value: String(studentsNeedingFollowUp),
        tone: studentsNeedingFollowUp > 0 ? "danger" : "success",
      },
    ],
    subjectRows: input.subjectRows.map((row) => ({
      subjectId: row.subjectId,
      subjectCode: row.subjectCode,
      subjectTitle: row.subjectTitle,
      classroomId: row.classroomId,
      classroomCode: row.classroomCode,
      classroomTitle: row.classroomDisplayTitle,
      classroomCount: 1,
      totalSessions: row.totalSessions,
      totalStudents: row.totalStudents,
      presentCount: row.presentCount,
      absentCount: row.absentCount,
      attendancePercentage: row.attendancePercentage,
      lastSessionAt: row.lastSessionAt,
      attendanceLabel: `${row.attendancePercentage}% attendance`,
      sessionSummary: `${row.totalSessions} session${row.totalSessions === 1 ? "" : "s"} · ${row.presentCount} present · ${row.absentCount} absent`,
      lastActivityLabel: row.lastSessionAt
        ? `Last session ${formatTeacherDateTime(row.lastSessionAt)}`
        : "No recent session recorded",
      tone: toneForAttendancePercentage(row.attendancePercentage),
    })),
    daywiseRows: input.daywiseRows.map((row) => ({
      attendanceDate: row.attendanceDate,
      classroomId: row.classroomId,
      classroomTitle: row.classroomDisplayTitle,
      subjectId: row.subjectId,
      subjectTitle: row.subjectTitle,
      sessionCount: row.sessionCount,
      totalStudents: row.totalStudents,
      presentCount: row.presentCount,
      absentCount: row.absentCount,
      attendancePercentage: row.attendancePercentage,
      lastSessionAt: row.lastSessionAt,
      attendanceLabel: `${row.attendancePercentage}% attendance`,
      sessionSummary: `${row.sessionCount} session${row.sessionCount === 1 ? "" : "s"} · ${row.presentCount} present · ${row.absentCount} absent`,
      lastActivityLabel: row.lastSessionAt
        ? `Last class session ${formatTeacherDateTime(row.lastSessionAt)}`
        : `Attendance date ${formatTeacherDateTime(row.attendanceDate)}`,
      tone: toneForAttendancePercentage(row.attendancePercentage),
    })),
    sessionTrendRows: [...input.sessions]
      .filter((s) => s.status === "ENDED" || s.status === "ACTIVE")
      .sort((a, b) => new Date(b.startedAt ?? 0).getTime() - new Date(a.startedAt ?? 0).getTime())
      .map((s): TeacherSessionTrendRow => {
        const total = s.presentCount + s.absentCount
        const pct = total > 0 ? Math.round((s.presentCount / total) * 100) : 0
        return {
          sessionId: s.id,
          classroomId: s.classroomId,
          classroomTitle: s.classroomDisplayTitle,
          subjectTitle: s.subjectTitle,
          startedAt: s.startedAt,
          endedAt: s.endedAt,
          status: s.status,
          mode: s.mode,
          presentCount: s.presentCount,
          absentCount: s.absentCount,
          totalStudents: total,
          attendancePercentage: pct,
          tone: toneForAttendancePercentage(pct),
        }
      }),
    studentRows: input.studentRows.map((row) => ({
      studentId: row.studentId,
      studentDisplayName: row.studentDisplayName,
      studentEmail: row.studentEmail,
      studentParentEmail: row.studentParentEmail ?? null,
      studentRollNumber: row.studentRollNumber,
      enrollmentStatus: row.enrollmentStatus,
      classroomId: row.classroomId,
      classroomTitle: row.classroomDisplayTitle,
      subjectId: row.subjectId,
      subjectTitle: row.subjectTitle,
      totalSessions: row.totalSessions,
      presentSessions: row.presentSessions,
      absentSessions: row.absentSessions,
      attendancePercentage: row.attendancePercentage,
      lastSessionAt: row.lastSessionAt,
      attendanceLabel: `${row.attendancePercentage}% attendance`,
      sessionSummary: `${row.presentSessions}/${row.totalSessions} present · ${formatEnumLabel(row.enrollmentStatus)}`,
      followUpLabel:
        row.totalSessions === 0
          ? "No attendance sessions yet"
          : row.attendancePercentage >= 75
            ? "Healthy attendance"
            : row.attendancePercentage >= 50
              ? "Needs follow-up"
              : "Immediate follow-up",
      tone: toneForAttendancePercentage(row.attendancePercentage),
    })),
    availabilityMessage:
      "Teacher mobile reports use the same final attendance truth as history, exports, and student self-reporting.",
    filterSummary,
    subjectSummary:
      input.subjectRows.length > 0
        ? `${input.subjectRows.length} subject view${input.subjectRows.length === 1 ? "" : "s"} are in scope right now.`
        : "No subject summaries match this filter yet.",
    studentSummary:
      uniqueStudentIds.size > 0
        ? `${studentsNeedingFollowUp} student${studentsNeedingFollowUp === 1 ? "" : "s"} need follow-up in this view.`
        : "No student attendance rows match this filter yet.",
    daywiseSummary: latestDaywiseRow
      ? `Most recent teaching day: ${formatTeacherDateTime(latestDaywiseRow.lastSessionAt ?? latestDaywiseRow.attendanceDate)}.`
      : "No day-wise attendance trend is available for this filter yet.",
    hasAnyData:
      input.daywiseRows.length > 0 || input.subjectRows.length > 0 || input.studentRows.length > 0,
  }
}

export function buildTeacherExportAvailabilityModel(): TeacherExportAvailabilityModel {
  return {
    canRequestExport: true,
    title: "Export job creation is live",
    message:
      "Teacher mobile can now queue worker-backed export jobs and poll their delivery status from the shared backend.",
    supportedFormats: ["SESSION_PDF", "SESSION_CSV", "STUDENT_PERCENT_CSV", "COMPREHENSIVE_CSV"],
  }
}

export function toneForAttendancePercentage(attendancePercentage: number): TeacherCardTone {
  if (attendancePercentage >= 75) {
    return "success"
  }

  if (attendancePercentage > 0) {
    return "warning"
  }

  return "danger"
}

export function formatTeacherDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((segment) => `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`)
    .join(" ")
}

export function buildTeacherExportRequestModel(input: {
  availability: TeacherExportAvailabilityModel
  selectedFormat: string
  requestState?: "IDLE" | "SUBMITTING"
}): TeacherExportRequestModel {
  const normalizedFormat =
    input.selectedFormat.trim() || input.availability.supportedFormats[0] || "Export"
  const requestState = input.requestState ?? "IDLE"

  if (!input.availability.canRequestExport) {
    return {
      buttonLabel: `Waiting For ${normalizedFormat} API`,
      buttonDisabled: true,
      helperMessage:
        "The request button stays in place now so the later export-job API can attach without changing teacher-mobile navigation.",
    }
  }

  if (requestState === "SUBMITTING") {
    return {
      buttonLabel: `Requesting ${normalizedFormat}...`,
      buttonDisabled: true,
      helperMessage:
        "Later export-job work should reuse this same button state while the request is being queued.",
    }
  }

  return {
    buttonLabel: `Request ${normalizedFormat}`,
    buttonDisabled: false,
    helperMessage:
      "Teacher mobile will queue this export job through the shared teacher export API and then poll for download readiness.",
  }
}

export function buildTeacherJoinCodeActionModel(input: {
  joinCode: { code: string; expiresAt: string } | null
  isPending: boolean
}): TeacherJoinCodeActionModel {
  return {
    currentCodeLabel: input.joinCode?.code ?? "No active code",
    expiryLabel: input.joinCode?.expiresAt ?? "Not available",
    resetButtonLabel: input.isPending
      ? "Resetting..."
      : input.joinCode
        ? "Reset Join Code"
        : "Create Join Code",
    helperMessage: input.joinCode
      ? "Resetting the join code immediately invalidates the previously shared classroom code."
      : "A new classroom join code will be generated when this action succeeds.",
  }
}

function parseRosterImportSegments(segments: string[]): RosterImportRowInput | null {
  const first = segments[0]

  if (!first) {
    return null
  }

  if (segments.length === 1) {
    return first.includes("@")
      ? { studentEmail: first.toLowerCase() }
      : { studentRollNumber: first }
  }

  if (segments.length === 2) {
    const second = segments[1]

    if (!second) {
      return null
    }

    if (first.includes("@")) {
      return {
        studentEmail: first.toLowerCase(),
        parsedName: second,
      }
    }

    return {
      studentRollNumber: first,
      parsedName: second,
    }
  }

  if (segments.length > 3) {
    return null
  }

  const second = segments[1]
  const rest = segments.slice(2)

  if (!second) {
    return null
  }

  if (first.includes("@")) {
    return {
      studentEmail: first.toLowerCase(),
      ...(second.length > 0 ? { studentRollNumber: second } : {}),
      ...(rest.join(", ").trim().length > 0 ? { parsedName: rest.join(", ").trim() } : {}),
    }
  }

  return {
    studentRollNumber: first,
    ...(second.includes("@") ? { studentEmail: second.toLowerCase() } : {}),
    ...(rest.join(", ").trim().length > 0
      ? { parsedName: [second, ...rest].join(", ").trim() }
      : second.trim().length > 0
        ? { parsedName: second.trim() }
        : {}),
  }
}
