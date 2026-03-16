import type {
  AttendanceRecordStatus,
  AttendanceSessionDetail,
  AttendanceSessionEditability,
  AttendanceSessionStatus,
  AttendanceSessionStudentSummary,
  ClassroomSummary,
  LectureSummary,
  RosterImportRowInput,
  TeacherDaywiseAttendanceReportRow,
  TeacherStudentAttendancePercentageReportRow,
  TeacherSubjectwiseAttendanceReportRow,
} from "@attendease/contracts"
import {
  calculateAttendancePercentage,
  getAttendanceCorrectionActionLabel,
  getAttendanceCorrectionPendingLabel,
} from "@attendease/domain"

import type { TeacherCardTone } from "./teacher-models"

export type TeacherBluetoothAdvertiserState =
  | "IDLE"
  | "READY"
  | "ADVERTISING"
  | "STOPPED"
  | "PERMISSION_REQUIRED"
  | "FAILED"

export interface TeacherBluetoothCandidate {
  sessionId: string
  classroomId: string
  classroomTitle: string
  lectureId: string | null
  lectureTitle: string
  durationMinutes: number
  bluetoothRotationWindowSeconds: number
  status: LectureSummary["status"] | "SHELL_ONLY"
}

export interface TeacherBluetoothSessionShellSnapshot {
  title: string
  message: string
  stateTone: TeacherCardTone
  canOpenActiveShell: boolean
}

export interface TeacherBluetoothSetupStatusModel {
  title: string
  message: string
  stateTone: TeacherCardTone
  startLabel: string
}

export interface TeacherBluetoothControlModel {
  startLabel: string
  stopLabel: string
  canStart: boolean
  canStop: boolean
  helperMessage: string
}

export interface TeacherBluetoothRecoveryModel {
  title: string
  message: string
  stateTone: TeacherCardTone
  shouldShow: boolean
  shouldRefreshBluetooth: boolean
  shouldRetryBroadcast: boolean
  shouldOfferEndSession: boolean
}

export interface TeacherBluetoothEndSessionModel {
  buttonLabel: string
  helperMessage: string
  buttonDisabled: boolean
}

export interface TeacherBluetoothActiveStatusModel {
  title: string
  message: string
  stateTone: TeacherCardTone
}

export interface TeacherSessionRosterRowModel {
  attendanceRecordId: string
  studentDisplayName: string
  studentEmail: string
  studentRollNumber: string | null
  identityLabel: string
  markedAt: string | null
  savedStatus: AttendanceRecordStatus
  effectiveStatus: AttendanceRecordStatus
  statusTone: TeacherCardTone
  pendingChangeLabel: string | null
  actionLabel: string | null
  actionTargetStatus: AttendanceRecordStatus | null
}

export interface TeacherSessionRosterModel {
  presentRows: TeacherSessionRosterRowModel[]
  absentRows: TeacherSessionRosterRowModel[]
  presentSummary: string
  absentSummary: string
}

export interface TeacherSessionDetailStatusModel {
  title: string
  message: string
  stateTone: TeacherCardTone
}

export interface TeacherSessionDetailOverviewModel {
  summaryCards: TeacherReportCard[]
  rosterSummary: string
  timingSummary: string
  correctionSummary: string
  presentSectionSubtitle: string
  absentSectionSubtitle: string
}

export interface TeacherRosterImportDraftModel {
  rows: RosterImportRowInput[]
  invalidLines: string[]
}

export interface TeacherReportCard {
  label: string
  value: string
  tone: TeacherCardTone
}

export interface TeacherSubjectReportRow {
  subjectId: string
  subjectCode: string
  subjectTitle: string
  classroomId: string
  classroomCode: string
  classroomTitle: string
  classroomCount: number
  totalSessions: number
  totalStudents: number
  presentCount: number
  absentCount: number
  attendancePercentage: number
  lastSessionAt: string | null
  attendanceLabel: string
  sessionSummary: string
  lastActivityLabel: string
  tone: TeacherCardTone
}

export interface TeacherDaywiseReportRowModel {
  attendanceDate: string
  classroomId: string
  classroomTitle: string
  subjectId: string
  subjectTitle: string
  sessionCount: number
  totalStudents: number
  presentCount: number
  absentCount: number
  attendancePercentage: number
  lastSessionAt: string | null
  attendanceLabel: string
  sessionSummary: string
  lastActivityLabel: string
  tone: TeacherCardTone
}

export interface TeacherStudentReportRowModel {
  studentId: string
  studentDisplayName: string
  studentEmail: string
  studentRollNumber: string | null
  enrollmentStatus: TeacherStudentAttendancePercentageReportRow["enrollmentStatus"]
  classroomId: string
  classroomTitle: string
  subjectId: string
  subjectTitle: string
  totalSessions: number
  presentSessions: number
  absentSessions: number
  attendancePercentage: number
  lastSessionAt: string | null
  attendanceLabel: string
  sessionSummary: string
  followUpLabel: string
  tone: TeacherCardTone
}

export interface TeacherReportFilterOption {
  value: string
  label: string
}

export interface TeacherReportOverviewModel {
  summaryCards: TeacherReportCard[]
  subjectRows: TeacherSubjectReportRow[]
  daywiseRows: TeacherDaywiseReportRowModel[]
  studentRows: TeacherStudentReportRowModel[]
  availabilityMessage: string
  filterSummary: string
  subjectSummary: string
  studentSummary: string
  daywiseSummary: string
  hasAnyData: boolean
}

export interface TeacherExportAvailabilityModel {
  canRequestExport: boolean
  title: string
  message: string
  supportedFormats: string[]
}

export interface TeacherExportRequestModel {
  buttonLabel: string
  buttonDisabled: boolean
  helperMessage: string
}

export interface TeacherJoinCodeActionModel {
  currentCodeLabel: string
  expiryLabel: string
  resetButtonLabel: string
  helperMessage: string
}

export function buildTeacherBluetoothCandidates(input: {
  classrooms: ClassroomSummary[]
  lectureSets: Array<{ classroomId: string; lectures: LectureSummary[] }>
}): TeacherBluetoothCandidate[] {
  const lectureMap = new Map(input.lectureSets.map((entry) => [entry.classroomId, entry.lectures]))
  const candidates: TeacherBluetoothCandidate[] = []

  for (const classroom of input.classrooms) {
    if (classroom.status === "ARCHIVED") {
      continue
    }

    const lectures = (lectureMap.get(classroom.id) ?? []).filter(
      (lecture) => lecture.status === "OPEN_FOR_ATTENDANCE" || lecture.status === "PLANNED",
    )

    if (lectures.length === 0) {
      candidates.push({
        sessionId: `preview-${classroom.id}-shell`,
        classroomId: classroom.id,
        classroomTitle: classroom.displayTitle,
        lectureId: null,
        lectureTitle: "Launch without linked lecture",
        durationMinutes: classroom.defaultSessionDurationMinutes,
        bluetoothRotationWindowSeconds: classroom.bluetoothRotationWindowSeconds,
        status: "SHELL_ONLY",
      })
      continue
    }

    for (const lecture of lectures) {
      candidates.push({
        sessionId: `preview-${classroom.id}-${lecture.id}`,
        classroomId: classroom.id,
        classroomTitle: classroom.displayTitle,
        lectureId: lecture.id,
        lectureTitle: lecture.title ?? "Scheduled lecture",
        durationMinutes: classroom.defaultSessionDurationMinutes,
        bluetoothRotationWindowSeconds: classroom.bluetoothRotationWindowSeconds,
        status: lecture.status,
      })
    }
  }

  return candidates.sort((left, right) => left.classroomTitle.localeCompare(right.classroomTitle))
}

export function buildTeacherBluetoothSessionShellSnapshot(input: {
  candidate: TeacherBluetoothCandidate | null
  advertiserState: TeacherBluetoothAdvertiserState
}): TeacherBluetoothSessionShellSnapshot {
  if (!input.candidate) {
    return {
      title: "Bluetooth session setup is waiting for a classroom",
      message: "Select a classroom and optional lecture before creating the Bluetooth session.",
      stateTone: "warning",
      canOpenActiveShell: false,
    }
  }

  if (input.advertiserState === "ADVERTISING") {
    return {
      title: "Bluetooth session is active",
      message:
        "Teacher mobile is broadcasting the rotating AttendEase BLE identifier for the active session.",
      stateTone: "success",
      canOpenActiveShell: true,
    }
  }

  if (input.advertiserState === "PERMISSION_REQUIRED") {
    return {
      title: "Bluetooth permissions are still required",
      message:
        "Bluetooth must be enabled and available before teacher advertising can begin on this device.",
      stateTone: "warning",
      canOpenActiveShell: true,
    }
  }

  if (input.advertiserState === "FAILED") {
    return {
      title: "Bluetooth session shell needs recovery",
      message:
        "Advertising failed and needs recovery before this session can keep broadcasting nearby.",
      stateTone: "danger",
      canOpenActiveShell: true,
    }
  }

  if (input.advertiserState === "STOPPED") {
    return {
      title: "Bluetooth session shell stopped",
      message:
        "The Bluetooth advertiser stopped. Teacher mobile can retry or end the active session.",
      stateTone: "warning",
      canOpenActiveShell: true,
    }
  }

  return {
    title: "Bluetooth session ready",
    message:
      "Teacher mobile can create the Bluetooth session and then hand off to the native advertiser controller.",
    stateTone: "primary",
    canOpenActiveShell: true,
  }
}

export function buildTeacherBluetoothSetupStatusModel(input: {
  candidate: TeacherBluetoothCandidate | null
  durationMinutes: number
  isCreating: boolean
  errorMessage?: string | null
}): TeacherBluetoothSetupStatusModel {
  if (!input.candidate) {
    return {
      title: "Choose a classroom to begin",
      message:
        "Select the classroom and class-session context first. AttendEase creates the Bluetooth attendance session before broadcasting starts.",
      stateTone: "warning",
      startLabel: "Choose A Classroom First",
    }
  }

  if (input.isCreating) {
    return {
      title: "Starting Bluetooth attendance",
      message:
        "AttendEase is creating the live attendance session and preparing the teacher phone for Bluetooth broadcast.",
      stateTone: "primary",
      startLabel: "Starting Bluetooth Attendance...",
    }
  }

  if (input.errorMessage) {
    return {
      title: "Bluetooth attendance could not start",
      message: input.errorMessage,
      stateTone: "danger",
      startLabel: "Retry Bluetooth Attendance",
    }
  }

  if (input.candidate.status === "SHELL_ONLY") {
    return {
      title: "Ready to start from classroom context",
      message: `Students nearby will only see this classroom while teacher mobile keeps the app open for the next ${input.durationMinutes} minutes.`,
      stateTone: "primary",
      startLabel: "Start Bluetooth Attendance",
    }
  }

  return {
    title: "Ready for a live class session",
    message: `Students nearby can mark attendance for ${input.candidate.lectureTitle} during the next ${input.durationMinutes} minutes once Bluetooth broadcast begins.`,
    stateTone: "success",
    startLabel: "Start Bluetooth Attendance",
  }
}

export function buildTeacherBluetoothControlModel(
  advertiserState: TeacherBluetoothAdvertiserState,
): TeacherBluetoothControlModel {
  switch (advertiserState) {
    case "ADVERTISING":
      return {
        startLabel: "Bluetooth Live",
        stopLabel: "Pause Broadcast",
        canStart: false,
        canStop: true,
        helperMessage:
          "Students nearby can detect this teacher phone while Bluetooth attendance stays live in the foreground.",
      }
    case "STOPPED":
      return {
        startLabel: "Resume Broadcast",
        stopLabel: "Broadcast Paused",
        canStart: true,
        canStop: false,
        helperMessage:
          "Bluetooth attendance is still open in the backend, but the local phone broadcast is paused until you resume it.",
      }
    case "PERMISSION_REQUIRED":
      return {
        startLabel: "Turn Bluetooth On",
        stopLabel: "Broadcast Unavailable",
        canStart: false,
        canStop: false,
        helperMessage:
          "Bluetooth must be enabled and available on this phone before nearby students can detect the session.",
      }
    case "FAILED":
      return {
        startLabel: "Retry Bluetooth",
        stopLabel: "Broadcast Failed",
        canStart: true,
        canStop: false,
        helperMessage:
          "The phone could not keep the Bluetooth broadcast alive. Retry here or end the session cleanly.",
      }
    case "IDLE":
    case "READY":
      return {
        startLabel: "Start Broadcast",
        stopLabel: "Pause Broadcast",
        canStart: true,
        canStop: false,
        helperMessage:
          "Teacher mobile is ready to start broadcasting this attendance session to nearby students.",
      }
  }
}

export function buildTeacherBluetoothRecoveryModel(input: {
  advertiserState: TeacherBluetoothAdvertiserState
  errorMessage?: string | null
  availability?: {
    supported: boolean
    poweredOn: boolean
    canAdvertise: boolean
  } | null
}): TeacherBluetoothRecoveryModel {
  if (input.advertiserState === "FAILED") {
    return {
      title: "Bluetooth broadcast needs recovery",
      message:
        input.errorMessage ??
        "Advertising failed. Retry the broadcast or refresh Bluetooth availability before ending the session.",
      stateTone: "danger",
      shouldShow: true,
      shouldRefreshBluetooth: true,
      shouldRetryBroadcast: true,
      shouldOfferEndSession: true,
    }
  }

  if (
    input.advertiserState === "PERMISSION_REQUIRED" &&
    input.availability?.supported &&
    !input.availability.poweredOn
  ) {
    return {
      title: "Turn Bluetooth on to continue",
      message:
        "Bluetooth is currently turned off on this device. Enable it in system settings, then refresh and restart the classroom broadcast.",
      stateTone: "warning",
      shouldShow: true,
      shouldRefreshBluetooth: true,
      shouldRetryBroadcast: true,
      shouldOfferEndSession: true,
    }
  }

  if (input.advertiserState === "STOPPED") {
    return {
      title: "Broadcast stopped",
      message:
        input.errorMessage ??
        "The advertiser stopped while the attendance session is still active. Restart the broadcast or end the session cleanly.",
      stateTone: "warning",
      shouldShow: true,
      shouldRefreshBluetooth: false,
      shouldRetryBroadcast: true,
      shouldOfferEndSession: true,
    }
  }

  if (input.advertiserState === "PERMISSION_REQUIRED") {
    return {
      title: "Bluetooth advertising is unavailable",
      message:
        input.errorMessage ??
        "This device still needs Bluetooth access before AttendEase can advertise the rotating BLE session.",
      stateTone: "warning",
      shouldShow: true,
      shouldRefreshBluetooth: true,
      shouldRetryBroadcast: false,
      shouldOfferEndSession: true,
    }
  }

  return {
    title: "Bluetooth runtime is healthy",
    message: "No recovery action is needed right now.",
    stateTone: "success",
    shouldShow: false,
    shouldRefreshBluetooth: false,
    shouldRetryBroadcast: false,
    shouldOfferEndSession: false,
  }
}

export function buildTeacherBluetoothEndSessionModel(input: {
  requestState: "IDLE" | "ENDING" | "FAILED" | "ENDED"
}): TeacherBluetoothEndSessionModel {
  if (input.requestState === "ENDING") {
    return {
      buttonLabel: "Ending Bluetooth...",
      helperMessage: "AttendEase is closing the session and stopping the teacher-phone broadcast.",
      buttonDisabled: true,
    }
  }

  if (input.requestState === "FAILED") {
    return {
      buttonLabel: "Retry Ending Session",
      helperMessage:
        "The session did not close cleanly yet. Retry ending it here so history and reports stay accurate.",
      buttonDisabled: false,
    }
  }

  if (input.requestState === "ENDED") {
    return {
      buttonLabel: "Session Closed",
      helperMessage: "Bluetooth attendance is already closed for this class session.",
      buttonDisabled: true,
    }
  }

  return {
    buttonLabel: "End Bluetooth Attendance",
    helperMessage:
      "Ending Bluetooth attendance stops nearby detection and sends you back to the session detail view.",
    buttonDisabled: false,
  }
}

export function buildTeacherBluetoothActiveStatusModel(input: {
  advertiserState: TeacherBluetoothAdvertiserState
  sessionStatus: string | null
  presentCount: number
}): TeacherBluetoothActiveStatusModel {
  if (input.sessionStatus && input.sessionStatus !== "ACTIVE") {
    return {
      title: "Bluetooth attendance is closed",
      message:
        "This attendance session is no longer live. Review the final student list or open session history for the saved result.",
      stateTone: "warning",
    }
  }

  if (input.advertiserState === "ADVERTISING") {
    return {
      title: "Bluetooth is live",
      message: `${input.presentCount} student${input.presentCount === 1 ? "" : "s"} marked attendance so far. Keep this screen open while students nearby check in.`,
      stateTone: "success",
    }
  }

  if (input.advertiserState === "FAILED") {
    return {
      title: "Bluetooth needs attention",
      message:
        "The teacher-phone broadcast stopped unexpectedly. Retry the broadcast or end the session cleanly from this screen.",
      stateTone: "danger",
    }
  }

  if (input.advertiserState === "STOPPED") {
    return {
      title: "Broadcast is paused",
      message:
        "The attendance session is still open, but students nearby cannot detect it again until you resume the broadcast.",
      stateTone: "warning",
    }
  }

  if (input.advertiserState === "PERMISSION_REQUIRED") {
    return {
      title: "Turn Bluetooth on to continue",
      message:
        "This phone still needs Bluetooth availability before nearby students can detect the live attendance session.",
      stateTone: "warning",
    }
  }

  return {
    title: "Ready to broadcast",
    message:
      "The live attendance session is created. Start the teacher-phone broadcast when students are nearby.",
    stateTone: "primary",
  }
}

export function buildTeacherSessionRosterModel(input: {
  students: AttendanceSessionStudentSummary[]
  draft?: Partial<Record<string, AttendanceRecordStatus>>
  isEditable: boolean
}): TeacherSessionRosterModel {
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
    } satisfies TeacherSessionRosterRowModel
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
        : `${presentRows.length} student${presentRows.length === 1 ? "" : "s"} currently marked present.`,
    absentSummary:
      absentRows.length === 0
        ? "Everyone in this session is currently marked present."
        : `${absentRows.length} student${absentRows.length === 1 ? "" : "s"} currently marked absent.`,
  }
}

export function buildTeacherSessionDetailOverviewModel(input: {
  session: AttendanceSessionDetail | null
  pendingChangeCount: number
}): TeacherSessionDetailOverviewModel {
  const totalStudents = (input.session?.presentCount ?? 0) + (input.session?.absentCount ?? 0)
  const attendancePercentage = calculateAttendancePercentage({
    presentCount: input.session?.presentCount ?? 0,
    totalCount: totalStudents,
  })
  const correctionTone: TeacherCardTone =
    input.session?.editability.isEditable && input.pendingChangeCount > 0
      ? "warning"
      : input.session?.editability.isEditable
        ? "success"
        : "primary"

  return {
    summaryCards: [
      {
        label: "Present",
        value: String(input.session?.presentCount ?? 0),
        tone: "success",
      },
      {
        label: "Absent",
        value: String(input.session?.absentCount ?? 0),
        tone: (input.session?.absentCount ?? 0) > 0 ? "warning" : "success",
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
        tone: correctionTone,
      },
    ],
    rosterSummary:
      totalStudents > 0
        ? `${input.session?.presentCount ?? 0} of ${totalStudents} students are currently marked present.`
        : "No student roster has been loaded for this attendance session yet.",
    timingSummary:
      input.session?.endedAt && input.session?.editableUntil
        ? `Ended ${formatTeacherDateTime(input.session.endedAt)} · editable until ${formatTeacherDateTime(input.session.editableUntil)}.`
        : input.session?.endedAt
          ? `Ended ${formatTeacherDateTime(input.session.endedAt)}.`
          : input.session?.startedAt
            ? `Live since ${formatTeacherDateTime(input.session.startedAt)}.`
            : "Timing details will appear here once the session starts.",
    correctionSummary: input.session?.editability.isEditable
      ? input.pendingChangeCount > 0
        ? `${input.pendingChangeCount} correction${input.pendingChangeCount === 1 ? "" : "s"} will refresh the saved attendance totals everywhere once you save.`
        : "Use the lists below to move a student between present and absent, then save once."
      : input.session?.status === "ACTIVE"
        ? "Bluetooth attendance is still live. Present and absent lists keep updating until the session ends."
        : "The manual correction window is closed. The lists below are now the final saved result.",
    presentSectionSubtitle:
      input.session?.status === "ACTIVE"
        ? "Students already marked during the live attendance session appear here first."
        : "Students counted present in the saved result stay here unless you move them back to absent.",
    absentSectionSubtitle:
      input.session?.status === "ACTIVE"
        ? "Students who have not checked in yet remain here until the live session ends."
        : "Students still counted absent stay here unless you move them into the present list.",
  }
}

export function buildTeacherSessionDetailStatusModel(input: {
  sessionStatus: AttendanceSessionStatus | null
  editability: AttendanceSessionEditability | null
  pendingChangeCount: number
}): TeacherSessionDetailStatusModel {
  if (input.sessionStatus === "ACTIVE" || input.editability?.state === "PENDING_SESSION_END") {
    return {
      title: "Attendance is still live",
      message:
        "Present and absent lists update below while students check in. End the session before making manual corrections.",
      stateTone: "warning",
    }
  }

  if (input.editability?.isEditable && input.pendingChangeCount > 0) {
    return {
      title: `${input.pendingChangeCount} correction${input.pendingChangeCount === 1 ? "" : "s"} ready to save`,
      message:
        "Review the updated present and absent lists, then save once to refresh final counts everywhere.",
      stateTone: "warning",
    }
  }

  if (input.editability?.isEditable) {
    return {
      title: "Corrections are open",
      message:
        "Mark students present or absent from these lists, then save once when the attendance truth looks right.",
      stateTone: "success",
    }
  }

  return {
    title: "Session is read-only",
    message:
      "The manual correction window is closed. The present and absent lists below are the final saved result.",
    stateTone: "warning",
  }
}

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
    studentRows: input.studentRows.map((row) => ({
      studentId: row.studentId,
      studentDisplayName: row.studentDisplayName,
      studentEmail: row.studentEmail,
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

function toneForAttendancePercentage(attendancePercentage: number): TeacherCardTone {
  if (attendancePercentage >= 75) {
    return "success"
  }

  if (attendancePercentage > 0) {
    return "warning"
  }

  return "danger"
}

function formatTeacherDateTime(value: string) {
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
