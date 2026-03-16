import { AuthApiClientError } from "@attendease/auth"
import type {
  AttendanceMode,
  AttendanceRecordStatus,
  AttendanceSessionDetail,
  AttendanceSessionHistoryItem,
  AttendanceSessionHistoryListQuery,
  AttendanceSessionStatus,
  AttendanceSessionStudentSummary,
  ClassroomSummary,
  TeacherDaywiseAttendanceReportRow,
  TeacherReportFilters,
  TeacherStudentAttendancePercentageReportRow,
  TeacherSubjectwiseAttendanceReportRow,
} from "@attendease/contracts"
import {
  calculateAttendancePercentage,
  getAttendanceCorrectionActionLabel,
  getAttendanceCorrectionPendingLabel,
} from "@attendease/domain"

export type TeacherWebReviewTone = "primary" | "success" | "warning" | "danger"

export interface TeacherWebFilterOption {
  value: string
  label: string
}

export interface TeacherWebAcademicFilterOptions {
  classroomOptions: TeacherWebFilterOption[]
  classOptions: TeacherWebFilterOption[]
  sectionOptions: TeacherWebFilterOption[]
  subjectOptions: TeacherWebFilterOption[]
}

export interface TeacherWebHistoryFilterDraft {
  classroomId: string
  classId: string
  sectionId: string
  subjectId: string
  mode: AttendanceMode | "ALL"
  status: AttendanceSessionStatus | "ALL"
  fromDate: string
  toDate: string
}

export interface TeacherWebReportFilterDraft {
  classroomId: string
  classId: string
  sectionId: string
  subjectId: string
  fromDate: string
  toDate: string
}

export interface TeacherWebSummaryCard {
  label: string
  value: string
  tone: TeacherWebReviewTone
}

export interface TeacherWebSessionHistorySummaryModel {
  summaryCards: TeacherWebSummaryCard[]
  filterSummary: string
  availabilityMessage: string
}

export interface TeacherWebSessionRosterRowModel {
  attendanceRecordId: string
  studentDisplayName: string
  studentEmail: string
  studentRollNumber: string | null
  identityLabel: string
  markedAt: string | null
  savedStatus: AttendanceRecordStatus
  effectiveStatus: AttendanceRecordStatus
  statusTone: TeacherWebReviewTone
  pendingChangeLabel: string | null
  actionLabel: string | null
  actionTargetStatus: AttendanceRecordStatus | null
}

export interface TeacherWebSessionRosterModel {
  presentRows: TeacherWebSessionRosterRowModel[]
  absentRows: TeacherWebSessionRosterRowModel[]
  presentSummary: string
  absentSummary: string
}

export interface TeacherWebSessionDetailOverviewModel {
  summaryCards: TeacherWebSummaryCard[]
  rosterSummary: string
  timingSummary: string
  correctionSummary: string
  presentSectionSubtitle: string
  absentSectionSubtitle: string
  securitySummary: string | null
}

export interface TeacherWebSessionDetailStatusModel {
  title: string
  message: string
  tone: TeacherWebReviewTone
}

export interface TeacherWebReportSubjectRowModel {
  subjectId: string
  classroomId: string
  title: string
  courseContextLabel: string
  attendancePercentage: number
  attendanceLabel: string
  sessionSummary: string
  lastSessionAt: string | null
  tone: TeacherWebReviewTone
}

export interface TeacherWebReportDaywiseRowModel {
  attendanceDate: string
  classroomId: string
  title: string
  dateLabel: string
  attendancePercentage: number
  attendanceLabel: string
  sessionSummary: string
  lastSessionAt: string | null
  tone: TeacherWebReviewTone
}

export interface TeacherWebReportStudentRowModel {
  studentId: string
  title: string
  supportingLabel: string
  attendancePercentage: number
  attendanceLabel: string
  sessionSummary: string
  followUpLabel: string
  lastSessionAt: string | null
  tone: TeacherWebReviewTone
}

export interface TeacherWebReportOverviewModel {
  summaryCards: TeacherWebSummaryCard[]
  filterSummary: string
  availabilityMessage: string
  subjectSummary: string
  studentSummary: string
  daywiseSummary: string
  subjectRows: TeacherWebReportSubjectRowModel[]
  studentRows: TeacherWebReportStudentRowModel[]
  daywiseRows: TeacherWebReportDaywiseRowModel[]
  hasAnyData: boolean
}

export function createTeacherWebHistoryFilterDraft(): TeacherWebHistoryFilterDraft {
  return {
    classroomId: "",
    classId: "",
    sectionId: "",
    subjectId: "",
    mode: "ALL",
    status: "ALL",
    fromDate: "",
    toDate: "",
  }
}

export function createTeacherWebReportFilterDraft(): TeacherWebReportFilterDraft {
  return {
    classroomId: "",
    classId: "",
    sectionId: "",
    subjectId: "",
    fromDate: "",
    toDate: "",
  }
}

export function buildTeacherWebAcademicFilterOptions(
  classrooms: ClassroomSummary[],
): TeacherWebAcademicFilterOptions {
  return {
    classroomOptions: buildUniqueSortedOptions(
      classrooms.map((classroom) => ({
        value: classroom.id,
        label: `${classroom.displayTitle} (${classroom.code})`,
      })),
    ),
    classOptions: buildUniqueSortedOptions(
      classrooms
        .filter((classroom) => Boolean(classroom.classId))
        .map((classroom) => ({
          value: classroom.classId,
          label: buildScopeLabel(classroom.classCode, classroom.classTitle, "Class"),
        })),
    ),
    sectionOptions: buildUniqueSortedOptions(
      classrooms
        .filter((classroom) => Boolean(classroom.sectionId))
        .map((classroom) => ({
          value: classroom.sectionId,
          label: buildScopeLabel(classroom.sectionCode, classroom.sectionTitle, "Section"),
        })),
    ),
    subjectOptions: buildUniqueSortedOptions(
      classrooms
        .filter((classroom) => Boolean(classroom.subjectId))
        .map((classroom) => ({
          value: classroom.subjectId,
          label: buildScopeLabel(classroom.subjectCode, classroom.subjectTitle, "Subject"),
        })),
    ),
  }
}

export function buildTeacherWebHistoryQueryFilters(
  draft: TeacherWebHistoryFilterDraft,
): AttendanceSessionHistoryListQuery {
  return {
    ...(draft.classroomId ? { classroomId: draft.classroomId } : {}),
    ...(draft.classId ? { classId: draft.classId } : {}),
    ...(draft.sectionId ? { sectionId: draft.sectionId } : {}),
    ...(draft.subjectId ? { subjectId: draft.subjectId } : {}),
    ...(draft.mode !== "ALL" ? { mode: draft.mode } : {}),
    ...(draft.status !== "ALL" ? { status: draft.status } : {}),
    ...(draft.fromDate ? { from: toIsoStartOfDay(draft.fromDate) } : {}),
    ...(draft.toDate ? { to: toIsoEndOfDay(draft.toDate) } : {}),
  }
}

export function buildTeacherWebReportQueryFilters(
  draft: TeacherWebReportFilterDraft,
): TeacherReportFilters {
  return {
    ...(draft.classroomId ? { classroomId: draft.classroomId } : {}),
    ...(draft.classId ? { classId: draft.classId } : {}),
    ...(draft.sectionId ? { sectionId: draft.sectionId } : {}),
    ...(draft.subjectId ? { subjectId: draft.subjectId } : {}),
    ...(draft.fromDate ? { from: toIsoStartOfDay(draft.fromDate) } : {}),
    ...(draft.toDate ? { to: toIsoEndOfDay(draft.toDate) } : {}),
  }
}

export function buildTeacherWebFilterSummary(input: {
  classroom?: string | null
  class?: string | null
  section?: string | null
  subject?: string | null
  fromDate?: string | null
  toDate?: string | null
}): string {
  const scopeSummary = [
    input.classroom ? `Classroom: ${input.classroom}` : "All classrooms",
    input.class ? `Class: ${input.class}` : "All classes",
    input.section ? `Section: ${input.section}` : "All sections",
    input.subject ? `Subject: ${input.subject}` : "All subjects",
  ].join(" · ")
  const dateSummary =
    input.fromDate || input.toDate
      ? `Date range: ${input.fromDate ?? "Any start"} to ${input.toDate ?? "Any end"}`
      : "Any teaching date"

  return `${scopeSummary} · ${dateSummary}`
}

export function buildTeacherWebSessionHistorySummaryModel(input: {
  sessions: AttendanceSessionHistoryItem[]
  filterSummary: string
}): TeacherWebSessionHistorySummaryModel {
  const editableSessions = input.sessions.filter((session) => session.editability.isEditable).length
  const activeSessions = input.sessions.filter((session) => session.status === "ACTIVE").length
  const sessionsNeedingReview = input.sessions.filter((session) => session.absentCount > 0).length
  const totalPresent = input.sessions.reduce((sum, session) => sum + session.presentCount, 0)
  const totalStudents = input.sessions.reduce(
    (sum, session) => sum + session.presentCount + session.absentCount,
    0,
  )
  const attendancePercentage = calculateAttendancePercentage({
    presentCount: totalPresent,
    totalCount: totalStudents,
  })

  return {
    summaryCards: [
      {
        label: "Sessions in view",
        value: String(input.sessions.length),
        tone: input.sessions.length > 0 ? "primary" : "warning",
      },
      {
        label: "Corrections open",
        value: String(editableSessions),
        tone: editableSessions > 0 ? "success" : "warning",
      },
      {
        label: "Need review",
        value: String(sessionsNeedingReview),
        tone: sessionsNeedingReview > 0 ? "warning" : "success",
      },
      {
        label: "Attendance",
        value: `${attendancePercentage}%`,
        tone: toneForAttendancePercentage(attendancePercentage),
      },
    ],
    filterSummary: input.filterSummary,
    availabilityMessage:
      activeSessions > 0
        ? `${activeSessions} live session${activeSessions === 1 ? "" : "s"} still appear here. End a live session before saving manual corrections.`
        : "Session review, reports, and exports all read the same finalized attendance truth.",
  }
}

export function buildTeacherWebSessionRosterModel(input: {
  students: AttendanceSessionStudentSummary[]
  draft?: Partial<Record<string, AttendanceRecordStatus>>
  isEditable: boolean
}): TeacherWebSessionRosterModel {
  const rows = input.students.map((student) => {
    const effectiveStatus = input.draft?.[student.attendanceRecordId] ?? student.status
    const isPendingChange = effectiveStatus !== student.status
    const actionTargetStatus = input.isEditable
      ? effectiveStatus === "PRESENT"
        ? "ABSENT"
        : "PRESENT"
      : null

    return {
      attendanceRecordId: student.attendanceRecordId,
      studentDisplayName: student.studentDisplayName,
      studentEmail: student.studentEmail,
      studentRollNumber: student.studentRollNumber,
      identityLabel: student.studentRollNumber
        ? `${student.studentRollNumber} · ${student.studentEmail}`
        : student.studentEmail,
      markedAt: student.markedAt,
      savedStatus: student.status,
      effectiveStatus,
      statusTone: effectiveStatus === "PRESENT" ? "success" : "warning",
      pendingChangeLabel: isPendingChange
        ? getAttendanceCorrectionPendingLabel(effectiveStatus)
        : null,
      actionLabel: actionTargetStatus
        ? getAttendanceCorrectionActionLabel(actionTargetStatus)
        : null,
      actionTargetStatus,
    } satisfies TeacherWebSessionRosterRowModel
  })

  const presentRows = rows
    .filter((row) => row.effectiveStatus === "PRESENT")
    .sort((left, right) => {
      const leftMarkedAt = left.markedAt ? new Date(left.markedAt).getTime() : 0
      const rightMarkedAt = right.markedAt ? new Date(right.markedAt).getTime() : 0

      if (leftMarkedAt !== rightMarkedAt) {
        return rightMarkedAt - leftMarkedAt
      }

      return left.studentDisplayName.localeCompare(right.studentDisplayName)
    })
  const absentRows = rows
    .filter((row) => row.effectiveStatus === "ABSENT")
    .sort((left, right) => left.studentDisplayName.localeCompare(right.studentDisplayName))

  return {
    presentRows,
    absentRows,
    presentSummary:
      presentRows.length === 0
        ? "No students are currently marked present."
        : `${presentRows.length} student${presentRows.length === 1 ? "" : "s"} will count as present after save.`,
    absentSummary:
      absentRows.length === 0
        ? "Everyone in this session is currently marked present."
        : `${absentRows.length} student${absentRows.length === 1 ? "" : "s"} will count as absent after save.`,
  }
}

export function buildTeacherWebSessionDetailOverviewModel(input: {
  session: AttendanceSessionDetail | null
  roster: TeacherWebSessionRosterModel
  pendingChangeCount: number
}): TeacherWebSessionDetailOverviewModel {
  const presentCount = input.roster.presentRows.length
  const absentCount = input.roster.absentRows.length
  const totalStudents = presentCount + absentCount
  const attendancePercentage = calculateAttendancePercentage({
    presentCount,
    totalCount: totalStudents,
  })

  return {
    summaryCards: [
      {
        label: "Present",
        value: String(presentCount),
        tone: "success",
      },
      {
        label: "Absent",
        value: String(absentCount),
        tone: absentCount > 0 ? "warning" : "success",
      },
      {
        label: "Attendance",
        value: `${attendancePercentage}%`,
        tone: toneForAttendancePercentage(attendancePercentage),
      },
      {
        label: "Corrections",
        value: input.session?.editability.isEditable
          ? input.pendingChangeCount > 0
            ? `${input.pendingChangeCount} waiting`
            : "Open"
          : "Locked",
        tone:
          input.session?.editability.isEditable && input.pendingChangeCount > 0
            ? "warning"
            : input.session?.editability.isEditable
              ? "success"
              : "primary",
      },
    ],
    rosterSummary:
      totalStudents > 0
        ? `${presentCount} of ${totalStudents} students are currently in the present list.`
        : "No student roster is available for this attendance session yet.",
    timingSummary:
      input.session?.endedAt && input.session?.editableUntil
        ? `Ended ${formatReviewDateTime(input.session.endedAt)} · editable until ${formatReviewDateTime(input.session.editableUntil)}.`
        : input.session?.endedAt
          ? `Ended ${formatReviewDateTime(input.session.endedAt)}.`
          : input.session?.startedAt
            ? `Live since ${formatReviewDateTime(input.session.startedAt)}.`
            : "Timing details will appear here once the session starts.",
    correctionSummary: input.session?.editability.isEditable
      ? input.pendingChangeCount > 0
        ? `${input.pendingChangeCount} correction${input.pendingChangeCount === 1 ? "" : "s"} will refresh saved totals in history, reports, and exports when you save.`
        : "Use the student lists below to mark present or mark absent, then save once."
      : input.session?.status === "ACTIVE"
        ? "Attendance is still live. Review the lists here, then end the session before making corrections."
        : "The correction window is closed. The present and absent lists below are now final.",
    presentSectionSubtitle:
      input.session?.status === "ACTIVE"
        ? "Students already marked during the live session appear here first."
        : "Students in the present list count toward the final saved result.",
    absentSectionSubtitle:
      input.session?.status === "ACTIVE"
        ? "Students who have not checked in yet remain here until the live session ends."
        : "Students in the absent list remain absent unless you move them into present.",
    securitySummary:
      input.session && input.session.suspiciousAttemptCount > 0
        ? `${input.session.suspiciousAttemptCount} suspicious attempt${input.session.suspiciousAttemptCount === 1 ? "" : "s"} recorded. Location: ${input.session.locationValidationFailureCount}, Bluetooth: ${input.session.bluetoothValidationFailureCount}, revoked device: ${input.session.revokedDeviceAttemptCount}.`
        : null,
  }
}

export function buildTeacherWebSessionDetailStatusModel(input: {
  session: AttendanceSessionDetail | null
  pendingChangeCount: number
}): TeacherWebSessionDetailStatusModel {
  if (
    input.session?.status === "ACTIVE" ||
    input.session?.editability.state === "PENDING_SESSION_END"
  ) {
    return {
      title: "Attendance is still live",
      message:
        "Present and absent lists keep updating while the session is open. End the session before saving manual corrections.",
      tone: "warning",
    }
  }

  if (input.session?.editability.isEditable && input.pendingChangeCount > 0) {
    return {
      title: `${input.pendingChangeCount} correction${input.pendingChangeCount === 1 ? "" : "s"} ready to save`,
      message:
        "Review the updated present and absent lists, then save once to refresh history, reports, and exports.",
      tone: "warning",
    }
  }

  if (input.session?.editability.isEditable) {
    return {
      title: "Corrections are open",
      message:
        "Use the present and absent lists below to correct attendance quickly before the edit window closes.",
      tone: "success",
    }
  }

  return {
    title: "Session is read-only",
    message:
      "The correction window is closed. The present and absent lists below are the final saved result.",
    tone: "warning",
  }
}

export function mapTeacherWebReviewErrorToMessage(
  error: unknown,
  fallback = "AttendEase couldn't finish the teacher review request.",
): string {
  if (error instanceof AuthApiClientError) {
    const detailMessage = extractApiErrorMessage(error.details)

    switch (error.status) {
      case 401:
        return "Your teacher session expired. Sign in again to continue reviewing attendance."
      case 403:
        return detailMessage ?? "This teacher review action is outside your classroom scope."
      case 404:
        return detailMessage ?? "The selected attendance session is no longer available."
      case 409:
        return (
          detailMessage ?? "This attendance session changed before the correction could be saved."
        )
      default:
        return detailMessage ?? fallback
    }
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message
  }

  return fallback
}

export function buildTeacherWebReportOverviewModel(input: {
  daywiseRows: TeacherDaywiseAttendanceReportRow[]
  subjectRows: TeacherSubjectwiseAttendanceReportRow[]
  studentRows: TeacherStudentAttendancePercentageReportRow[]
  filterSummary: string
}): TeacherWebReportOverviewModel {
  const uniqueClassroomIds = new Set(input.subjectRows.map((row) => row.classroomId))
  const uniqueSubjectIds = new Set(input.subjectRows.map((row) => row.subjectId))
  const uniqueStudentIds = new Set(input.studentRows.map((row) => row.studentId))
  const totalPresent = input.studentRows.reduce((sum, row) => sum + row.presentSessions, 0)
  const totalSessions = input.studentRows.reduce((sum, row) => sum + row.totalSessions, 0)
  const studentsNeedingFollowUp = input.studentRows.filter(
    (row) => row.totalSessions > 0 && row.attendancePercentage < 75,
  ).length
  const overallAttendance = calculateAttendancePercentage({
    presentCount: totalPresent,
    totalCount: totalSessions,
  })
  const latestDaywiseRow = [...input.daywiseRows].sort(
    (left, right) =>
      new Date(right.lastSessionAt ?? right.attendanceDate).getTime() -
      new Date(left.lastSessionAt ?? left.attendanceDate).getTime(),
  )[0]

  return {
    summaryCards: [
      {
        label: "Classrooms",
        value: String(uniqueClassroomIds.size),
        tone: uniqueClassroomIds.size > 0 ? "primary" : "warning",
      },
      {
        label: "Subjects",
        value: String(uniqueSubjectIds.size),
        tone: uniqueSubjectIds.size > 0 ? "success" : "warning",
      },
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
    ],
    filterSummary: input.filterSummary,
    availabilityMessage:
      "Reports now use the same final attendance truth as session review, manual corrections, and exports.",
    subjectSummary:
      input.subjectRows.length > 0
        ? `${input.subjectRows.length} course rollup${input.subjectRows.length === 1 ? "" : "s"} are in scope right now.`
        : "No subject rollups match the current filter yet.",
    studentSummary:
      uniqueStudentIds.size > 0
        ? `${studentsNeedingFollowUp} student${studentsNeedingFollowUp === 1 ? "" : "s"} need follow-up in this view.`
        : "No student attendance rows match the current filter yet.",
    daywiseSummary: latestDaywiseRow
      ? `Most recent teaching day: ${formatReviewDateTime(latestDaywiseRow.lastSessionAt ?? latestDaywiseRow.attendanceDate)}.`
      : "No day-wise trend is available for the current filter yet.",
    subjectRows: [...input.subjectRows]
      .sort(
        (left, right) =>
          left.attendancePercentage - right.attendancePercentage ||
          left.subjectTitle.localeCompare(right.subjectTitle),
      )
      .map((row) => ({
        subjectId: row.subjectId,
        classroomId: row.classroomId,
        title: row.subjectTitle,
        courseContextLabel: `${row.classTitle} · ${row.sectionTitle} · ${row.classroomDisplayTitle}`,
        attendancePercentage: row.attendancePercentage,
        attendanceLabel: `${row.attendancePercentage}% attendance`,
        sessionSummary: `${row.totalSessions} session${row.totalSessions === 1 ? "" : "s"} · ${row.presentCount} present · ${row.absentCount} absent`,
        lastSessionAt: row.lastSessionAt,
        tone: toneForAttendancePercentage(row.attendancePercentage),
      })),
    studentRows: [...input.studentRows]
      .sort(
        (left, right) =>
          left.attendancePercentage - right.attendancePercentage ||
          left.studentDisplayName.localeCompare(right.studentDisplayName),
      )
      .map((row) => ({
        studentId: row.studentId,
        title: row.studentDisplayName,
        supportingLabel: row.studentRollNumber
          ? `${row.studentRollNumber} · ${row.classroomDisplayTitle} · ${row.subjectTitle}`
          : `${row.studentEmail} · ${row.classroomDisplayTitle} · ${row.subjectTitle}`,
        attendancePercentage: row.attendancePercentage,
        attendanceLabel: `${row.attendancePercentage}% attendance`,
        sessionSummary: `${row.presentSessions}/${row.totalSessions} present · ${formatEnumLabel(row.enrollmentStatus)}`,
        followUpLabel:
          row.totalSessions === 0
            ? "No sessions yet"
            : row.attendancePercentage >= 75
              ? "Healthy attendance"
              : row.attendancePercentage >= 50
                ? "Needs follow-up"
                : "Immediate follow-up",
        lastSessionAt: row.lastSessionAt,
        tone: toneForAttendancePercentage(row.attendancePercentage),
      })),
    daywiseRows: [...input.daywiseRows]
      .sort(
        (left, right) =>
          new Date(right.lastSessionAt ?? right.attendanceDate).getTime() -
          new Date(left.lastSessionAt ?? left.attendanceDate).getTime(),
      )
      .map((row) => ({
        attendanceDate: row.attendanceDate,
        classroomId: row.classroomId,
        title: `${row.subjectTitle} · ${row.classroomDisplayTitle}`,
        dateLabel: formatReviewDateTime(row.lastSessionAt ?? row.attendanceDate),
        attendancePercentage: row.attendancePercentage,
        attendanceLabel: `${row.attendancePercentage}% attendance`,
        sessionSummary: `${row.sessionCount} session${row.sessionCount === 1 ? "" : "s"} · ${row.presentCount} present · ${row.absentCount} absent`,
        lastSessionAt: row.lastSessionAt,
        tone: toneForAttendancePercentage(row.attendancePercentage),
      })),
    hasAnyData:
      input.daywiseRows.length > 0 || input.subjectRows.length > 0 || input.studentRows.length > 0,
  }
}

function buildUniqueSortedOptions(options: TeacherWebFilterOption[]): TeacherWebFilterOption[] {
  const optionMap = new Map<string, TeacherWebFilterOption>()

  for (const option of options) {
    if (!option.value || optionMap.has(option.value)) {
      continue
    }

    optionMap.set(option.value, option)
  }

  return [...optionMap.values()].sort((left, right) => left.label.localeCompare(right.label))
}

function buildScopeLabel(
  code: string | null | undefined,
  title: string | null | undefined,
  fallback: string,
) {
  if (code && title && code !== title) {
    return `${title} (${code})`
  }

  return title ?? code ?? fallback
}

function extractApiErrorMessage(details: unknown): string | null {
  if (!details || typeof details !== "object") {
    return null
  }

  const maybeMessage = "message" in details ? (details as { message?: unknown }).message : null

  if (typeof maybeMessage === "string" && maybeMessage.length > 0) {
    return maybeMessage
  }

  if (
    Array.isArray(maybeMessage) &&
    maybeMessage.length > 0 &&
    typeof maybeMessage[0] === "string"
  ) {
    return maybeMessage[0]
  }

  return null
}

function toneForAttendancePercentage(attendancePercentage: number): TeacherWebReviewTone {
  if (attendancePercentage >= 75) {
    return "success"
  }

  if (attendancePercentage > 0) {
    return "warning"
  }

  return "danger"
}

function toIsoStartOfDay(value: string) {
  return `${value}T00:00:00.000Z`
}

function toIsoEndOfDay(value: string) {
  return `${value}T23:59:59.999Z`
}

function formatReviewDateTime(value: string) {
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
