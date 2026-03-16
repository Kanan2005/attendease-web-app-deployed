import type {
  AttendanceMode,
  AuthenticatedUser,
  ClassroomSchedule,
  LectureSummary,
  LiveAttendanceSessionSummary,
  StudentAttendanceHistoryItem,
  StudentClassroomMembershipSummary,
  StudentReportOverview,
  StudentSubjectReportDetail,
  StudentSubjectReportSummary,
} from "@attendease/contracts"

import type { StudentAttendanceGateModel } from "./device-trust"
import type { CardTone } from "./student-models"

export interface StudentScheduleWeeklyItem {
  id: string
  weekdayLabel: string
  timeLabel: string
  locationLabel: string | null
}

export interface StudentScheduleExceptionItem {
  id: string
  title: string
  effectiveDateLabel: string
  timeLabel: string
  locationLabel: string | null
  reason: string | null
  tone: CardTone
}

export interface StudentUpcomingLectureItem {
  id: string
  title: string
  timeLabel: string
  status: LectureSummary["status"]
}

export interface StudentScheduleOverviewModel {
  weeklyItems: StudentScheduleWeeklyItem[]
  exceptionItems: StudentScheduleExceptionItem[]
  upcomingLectures: StudentUpcomingLectureItem[]
}

export interface StudentReportOverviewModel {
  trackedClassroomCount: number
  totalSessions: number
  presentSessions: number
  absentSessions: number
  attendancePercentage: number
  lastSessionAt: string | null
}

export interface StudentAttendanceInsightModel {
  title: string
  message: string
  tone: CardTone
}

export interface StudentSubjectReportSummaryModel {
  subjectId: string
  subjectCode: string
  subjectTitle: string
  classroomCount: number
  totalSessions: number
  presentSessions: number
  absentSessions: number
  attendancePercentage: number
  lastSessionAt: string | null
}

export interface StudentSubjectReportClassroomModel {
  classroomId: string
  classroomCode: string
  classroomTitle: string
  totalSessions: number
  presentSessions: number
  absentSessions: number
  attendancePercentage: number
  lastSessionAt: string | null
}

export interface StudentSubjectReportModel extends StudentSubjectReportSummaryModel {
  classrooms: StudentSubjectReportClassroomModel[]
}

export interface StudentAttendanceHistorySummaryModel {
  totalRecords: number
  presentCount: number
  absentCount: number
  attendancePercentage: number
  lastRecordedAt: string | null
}

export interface StudentAttendanceHistoryRowModel {
  attendanceRecordId: string
  sessionId: string
  classroomId: string
  title: string
  subtitle: string
  statusLabel: string
  statusTone: CardTone
  timeLabel: string
  detailLabel: string
}

export interface StudentDeviceStatusSummaryModel {
  label: string
  tone: CardTone
  helperText: string
}

export interface StudentAttendanceCandidate {
  sessionId: string
  classroomId: string
  subjectId: string
  classroomTitle: string
  lectureId: string | null
  lectureTitle: string
  mode: Extract<AttendanceMode, "QR_GPS" | "BLUETOOTH">
  timestamp: string
  requiresTrustedDevice: boolean
}

export interface StudentAttendanceOverviewModel {
  totalOpenSessions: number
  qrReadyCount: number
  bluetoothReadyCount: number
  recommendedMode: Extract<AttendanceMode, "QR_GPS" | "BLUETOOTH"> | null
  gateTone: StudentAttendanceGateModel["tone"]
}

export interface StudentCourseDiscoveryCardModel {
  classroomId: string
  title: string
  subtitle: string
  attendanceTitle: string
  attendanceMessage: string
  attendanceTone: CardTone
  updatesLabel: string
  scheduleLabel: string
  hasOpenAttendance: boolean
}

export interface StudentClassroomDetailSummaryModel {
  title: string
  subtitle: string
  attendanceTitle: string
  attendanceMessage: string
  attendanceTone: CardTone
  updatesLabel: string
  scheduleLabel: string
  nextSessionLabel: string
  openAttendanceCount: number
}

export interface StudentProfileDraft {
  displayName: string
  preferredShortName: string
}

export function buildStudentScheduleOverviewModel(input: {
  schedule: ClassroomSchedule | null
  lectures: LectureSummary[]
}): StudentScheduleOverviewModel {
  const weeklyItems = [...(input.schedule?.scheduleSlots ?? [])]
    .sort((left, right) => left.weekday - right.weekday || left.startMinutes - right.startMinutes)
    .map((slot) => ({
      id: slot.id,
      weekdayLabel: weekdayLabels[slot.weekday - 1] ?? "Day",
      timeLabel: `${formatMinutes(slot.startMinutes)} - ${formatMinutes(slot.endMinutes)}`,
      locationLabel: slot.locationLabel,
    }))

  const exceptionItems = [...(input.schedule?.scheduleExceptions ?? [])]
    .sort(
      (left, right) =>
        new Date(left.effectiveDate).getTime() - new Date(right.effectiveDate).getTime(),
    )
    .map((exception) => ({
      id: exception.id,
      title: buildExceptionTitle(exception.exceptionType),
      effectiveDateLabel: formatDateLabel(exception.effectiveDate),
      timeLabel:
        exception.startMinutes !== null && exception.endMinutes !== null
          ? `${formatMinutes(exception.startMinutes)} - ${formatMinutes(exception.endMinutes)}`
          : "No class time",
      locationLabel: exception.locationLabel,
      reason: exception.reason,
      tone: (exception.exceptionType === "CANCELLED" ? "danger" : "warning") as CardTone,
    }))

  const upcomingLectures = [...input.lectures]
    .filter((lecture) => lecture.status !== "CANCELLED")
    .sort(
      (left, right) =>
        new Date(resolveLectureTimestamp(left)).getTime() -
        new Date(resolveLectureTimestamp(right)).getTime(),
    )
    .slice(0, 6)
    .map((lecture) => ({
      id: lecture.id,
      title: lecture.title ?? "Scheduled lecture",
      timeLabel: formatDateTimeLabel(resolveLectureTimestamp(lecture)),
      status: lecture.status,
    }))

  return {
    weeklyItems,
    exceptionItems,
    upcomingLectures,
  }
}

export function buildStudentReportOverviewModel(
  reportOverview: StudentReportOverview,
): StudentReportOverviewModel {
  return {
    trackedClassroomCount: reportOverview.trackedClassroomCount,
    totalSessions: reportOverview.totalSessions,
    presentSessions: reportOverview.presentSessions,
    absentSessions: reportOverview.absentSessions,
    attendancePercentage: reportOverview.attendancePercentage,
    lastSessionAt: reportOverview.lastSessionAt,
  }
}

export function buildStudentAttendanceInsightModel(input: {
  attendancePercentage: number
  totalSessions: number
  presentSessions: number
  absentSessions: number
}): StudentAttendanceInsightModel {
  if (input.totalSessions === 0) {
    return {
      title: "No recorded sessions yet",
      message: "Attendance will appear after your first marked class session.",
      tone: "warning",
    }
  }

  if (input.attendancePercentage >= 75) {
    return {
      title: "Attendance is on track",
      message: `Present in ${input.presentSessions} of ${input.totalSessions} recorded sessions.`,
      tone: "success",
    }
  }

  if (input.attendancePercentage >= 50) {
    return {
      title: "Attendance needs attention",
      message: `Present in ${input.presentSessions} of ${input.totalSessions} recorded sessions. ${input.absentSessions} were missed.`,
      tone: "warning",
    }
  }

  return {
    title: "Attendance is at risk",
    message: `Present in ${input.presentSessions} of ${input.totalSessions} recorded sessions. ${input.absentSessions} were missed.`,
    tone: "danger",
  }
}

export function buildStudentSubjectReportSummaryModel(
  summary: StudentSubjectReportSummary,
): StudentSubjectReportSummaryModel {
  return {
    subjectId: summary.subjectId,
    subjectCode: summary.subjectCode,
    subjectTitle: summary.subjectTitle,
    classroomCount: summary.classroomCount,
    totalSessions: summary.totalSessions,
    presentSessions: summary.presentSessions,
    absentSessions: summary.absentSessions,
    attendancePercentage: summary.attendancePercentage,
    lastSessionAt: summary.lastSessionAt,
  }
}

export function buildStudentSubjectReportModel(
  detail: StudentSubjectReportDetail,
): StudentSubjectReportModel {
  return {
    ...buildStudentSubjectReportSummaryModel(detail),
    classrooms: detail.classrooms.map((classroom) => ({
      classroomId: classroom.classroomId,
      classroomCode: classroom.classroomCode,
      classroomTitle: classroom.classroomDisplayTitle,
      totalSessions: classroom.totalSessions,
      presentSessions: classroom.presentSessions,
      absentSessions: classroom.absentSessions,
      attendancePercentage: classroom.attendancePercentage,
      lastSessionAt: classroom.lastSessionAt,
    })),
  }
}

export function buildStudentAttendanceHistorySummaryModel(
  items: StudentAttendanceHistoryItem[],
): StudentAttendanceHistorySummaryModel {
  const presentCount = items.filter((item) => item.attendanceStatus === "PRESENT").length
  const absentCount = items.filter((item) => item.attendanceStatus === "ABSENT").length
  const totalRecords = items.length
  const latestItem = [...items].sort(compareStudentAttendanceHistoryItems)[0] ?? null

  return {
    totalRecords,
    presentCount,
    absentCount,
    attendancePercentage:
      totalRecords > 0 ? Number(((presentCount / totalRecords) * 100).toFixed(2)) : 0,
    lastRecordedAt: latestItem ? resolveStudentAttendanceHistoryTimestamp(latestItem) : null,
  }
}

export function buildStudentAttendanceHistoryRows(
  items: StudentAttendanceHistoryItem[],
): StudentAttendanceHistoryRowModel[] {
  return [...items].sort(compareStudentAttendanceHistoryItems).map((item) => ({
    attendanceRecordId: item.attendanceRecordId,
    sessionId: item.sessionId,
    classroomId: item.classroomId,
    title: item.classroomDisplayTitle,
    subtitle: `${item.subjectCode} · ${formatHistoryMode(item.mode)}`,
    statusLabel: item.attendanceStatus === "PRESENT" ? "Present" : "Absent",
    statusTone: item.attendanceStatus === "PRESENT" ? "success" : "danger",
    timeLabel: formatDateTimeLabel(resolveStudentAttendanceHistoryTimestamp(item)),
    detailLabel: buildStudentAttendanceHistoryDetailLabel(item),
  }))
}

export function buildStudentDeviceStatusSummaryModel(
  deviceTrust: AuthenticatedUser["deviceTrust"] | null | undefined,
): StudentDeviceStatusSummaryModel {
  if (!deviceTrust) {
    return {
      label: "Needs review",
      tone: "warning",
      helperText: "Sign in on your attendance phone to check whether it can mark attendance.",
    }
  }

  switch (deviceTrust.lifecycleState) {
    case "TRUSTED":
      return {
        label: "Trusted phone",
        tone: "success",
        helperText: "This phone is approved for student attendance.",
      }
    case "PENDING_REPLACEMENT":
      return {
        label: "Pending approval",
        tone: "warning",
        helperText: "This replacement phone is waiting for admin approval.",
      }
    case "REPLACED":
      return {
        label: "Replaced",
        tone: "danger",
        helperText: "Attendance stays blocked here until a new phone is approved.",
      }
    case "NOT_APPLICABLE":
      return {
        label: "Not required",
        tone: "primary",
        helperText: "Device approval is not required for the current role.",
      }
    default:
      return {
        label: "Needs review",
        tone: "warning",
        helperText: "Open device status if this phone cannot mark attendance yet.",
      }
  }
}

export function buildStudentAttendanceCandidates(input: {
  classrooms: StudentClassroomMembershipSummary[]
  liveSessions: LiveAttendanceSessionSummary[]
  mode?: Extract<AttendanceMode, "QR_GPS" | "BLUETOOTH">
}): StudentAttendanceCandidate[] {
  return input.classrooms
    .filter((classroom) => classroom.enrollmentStatus === "ACTIVE")
    .flatMap((classroom) => {
      return input.liveSessions
        .filter((session) => session.classroomId === classroom.id)
        .filter((session) => session.status === "ACTIVE")
        .filter((session) => (input.mode ? session.mode === input.mode : true))
        .map((session) => ({
          sessionId: session.id,
          classroomId: classroom.id,
          subjectId: classroom.subjectId,
          classroomTitle: classroom.displayTitle,
          lectureId: session.lectureId,
          lectureTitle: session.lectureTitle ?? "Live attendance session",
          mode: session.mode as Extract<AttendanceMode, "QR_GPS" | "BLUETOOTH">,
          timestamp:
            session.startedAt ??
            session.lectureDate ??
            session.scheduledEndAt ??
            new Date().toISOString(),
          requiresTrustedDevice: classroom.requiresTrustedDevice,
        }))
    })
    .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime())
}

export function buildStudentAttendanceOverviewModel(input: {
  qrCandidates: StudentAttendanceCandidate[]
  bluetoothCandidates: StudentAttendanceCandidate[]
  gateModel: StudentAttendanceGateModel
}): StudentAttendanceOverviewModel {
  const totalOpenSessions = input.qrCandidates.length + input.bluetoothCandidates.length
  const recommendedMode =
    input.qrCandidates.length === 0 && input.bluetoothCandidates.length === 0
      ? null
      : input.qrCandidates.length >= input.bluetoothCandidates.length
        ? "QR_GPS"
        : "BLUETOOTH"

  return {
    totalOpenSessions,
    qrReadyCount: input.qrCandidates.length,
    bluetoothReadyCount: input.bluetoothCandidates.length,
    recommendedMode,
    gateTone: input.gateModel.tone,
  }
}

export function buildStudentCourseDiscoveryCards(input: {
  classrooms: StudentClassroomMembershipSummary[]
  lectureSets: Array<{ classroomId: string; lectures: LectureSummary[] }>
  qrCandidates: StudentAttendanceCandidate[]
  bluetoothCandidates: StudentAttendanceCandidate[]
}): StudentCourseDiscoveryCardModel[] {
  const activeCandidates = [...input.qrCandidates, ...input.bluetoothCandidates]

  return [...input.classrooms]
    .filter((classroom) => classroom.enrollmentStatus === "ACTIVE")
    .map((classroom) => {
      const candidates = activeCandidates.filter(
        (candidate) => candidate.classroomId === classroom.id,
      )
      const lectures =
        input.lectureSets.find((lectureSet) => lectureSet.classroomId === classroom.id)?.lectures ??
        []
      const nextSession = lectures
        .filter((lecture) => lecture.status !== "CANCELLED")
        .sort(
          (left, right) =>
            new Date(resolveLectureTimestamp(left)).getTime() -
            new Date(resolveLectureTimestamp(right)).getTime(),
        )[0]

      return {
        classroomId: classroom.id,
        title: classroom.displayTitle,
        subtitle: `${classroom.code} · ${formatAttendanceModeLabel(classroom.defaultAttendanceMode)}`,
        attendanceTitle:
          candidates.length > 0
            ? candidates.length === 1
              ? "Attendance open now"
              : `${candidates.length} attendance sessions open`
            : "No attendance session open",
        attendanceMessage:
          candidates.length > 0
            ? buildAttendanceCandidateMessage(candidates)
            : nextSession
              ? `Next class session: ${formatDateTimeLabel(resolveLectureTimestamp(nextSession))}`
              : "No class session is published yet.",
        attendanceTone: (candidates.length > 0 ? "success" : "primary") as CardTone,
        updatesLabel: "Open updates and schedule from the course page.",
        scheduleLabel: nextSession
          ? `Next: ${formatDateTimeLabel(resolveLectureTimestamp(nextSession))}`
          : "Open schedule",
        hasOpenAttendance: candidates.length > 0,
      }
    })
    .sort((left, right) => {
      if (left.hasOpenAttendance !== right.hasOpenAttendance) {
        return left.hasOpenAttendance ? -1 : 1
      }

      return left.title.localeCompare(right.title)
    })
}

export function buildStudentClassroomDetailSummaryModel(input: {
  classroom: Pick<
    StudentClassroomMembershipSummary,
    "id" | "code" | "displayTitle" | "defaultAttendanceMode" | "enrollmentStatus"
  >
  lectures: LectureSummary[]
  schedule: ClassroomSchedule | null
  announcementCount: number
  attendanceCandidates: StudentAttendanceCandidate[]
  gateModel: StudentAttendanceGateModel
}): StudentClassroomDetailSummaryModel {
  const nextSession = [...input.lectures]
    .filter((lecture) => lecture.status !== "CANCELLED")
    .sort(
      (left, right) =>
        new Date(resolveLectureTimestamp(left)).getTime() -
        new Date(resolveLectureTimestamp(right)).getTime(),
    )[0]

  if (input.attendanceCandidates.length > 0 && input.gateModel.canContinue) {
    return {
      title: input.classroom.displayTitle,
      subtitle: `${input.classroom.code} · ${formatEnrollmentStatusLabel(input.classroom.enrollmentStatus)}`,
      attendanceTitle:
        input.attendanceCandidates.length === 1
          ? "Attendance is open in this course"
          : `${input.attendanceCandidates.length} attendance sessions are open in this course`,
      attendanceMessage: buildAttendanceCandidateMessage(input.attendanceCandidates),
      attendanceTone: "success",
      updatesLabel: `${input.announcementCount} ${pluralizeLabel("update", input.announcementCount)}`,
      scheduleLabel: `${input.schedule?.scheduleSlots.length ?? 0} weekly ${pluralizeLabel(
        "slot",
        input.schedule?.scheduleSlots.length ?? 0,
      )}`,
      nextSessionLabel: nextSession
        ? `Next class session: ${formatDateTimeLabel(resolveLectureTimestamp(nextSession))}`
        : "No future class session is published yet.",
      openAttendanceCount: input.attendanceCandidates.length,
    }
  }

  if (input.attendanceCandidates.length > 0 && !input.gateModel.canContinue) {
    return {
      title: input.classroom.displayTitle,
      subtitle: `${input.classroom.code} · ${formatEnrollmentStatusLabel(input.classroom.enrollmentStatus)}`,
      attendanceTitle: input.gateModel.title,
      attendanceMessage: input.gateModel.message,
      attendanceTone: input.gateModel.tone,
      updatesLabel: `${input.announcementCount} ${pluralizeLabel("update", input.announcementCount)}`,
      scheduleLabel: `${input.schedule?.scheduleSlots.length ?? 0} weekly ${pluralizeLabel(
        "slot",
        input.schedule?.scheduleSlots.length ?? 0,
      )}`,
      nextSessionLabel: nextSession
        ? `Next class session: ${formatDateTimeLabel(resolveLectureTimestamp(nextSession))}`
        : "No future class session is published yet.",
      openAttendanceCount: input.attendanceCandidates.length,
    }
  }

  return {
    title: input.classroom.displayTitle,
    subtitle: `${input.classroom.code} · ${formatEnrollmentStatusLabel(input.classroom.enrollmentStatus)}`,
    attendanceTitle: "No attendance session is open right now",
    attendanceMessage: nextSession
      ? `Next class session: ${formatDateTimeLabel(resolveLectureTimestamp(nextSession))}`
      : `This course is set up for ${formatAttendanceModeLabel(input.classroom.defaultAttendanceMode)} attendance when the next session opens.`,
    attendanceTone: "primary",
    updatesLabel: `${input.announcementCount} ${pluralizeLabel("update", input.announcementCount)}`,
    scheduleLabel: `${input.schedule?.scheduleSlots.length ?? 0} weekly ${pluralizeLabel(
      "slot",
      input.schedule?.scheduleSlots.length ?? 0,
    )}`,
    nextSessionLabel: nextSession
      ? `Next class session: ${formatDateTimeLabel(resolveLectureTimestamp(nextSession))}`
      : "No future class session is published yet.",
    openAttendanceCount: 0,
  }
}

export function createStudentProfileDraft(
  user: Pick<AuthenticatedUser, "displayName" | "email"> | null,
): StudentProfileDraft {
  const displayName = user?.displayName ?? ""

  return {
    displayName,
    preferredShortName: displayName.split(" ")[0] ?? "",
  }
}

export function normalizeStudentProfileDraft(draft: StudentProfileDraft): StudentProfileDraft {
  return {
    displayName: draft.displayName.trim(),
    preferredShortName: draft.preferredShortName.trim(),
  }
}

export function hasStudentProfileDraftChanges(
  initialDraft: StudentProfileDraft,
  currentDraft: StudentProfileDraft,
) {
  const normalizedInitial = normalizeStudentProfileDraft(initialDraft)
  const normalizedCurrent = normalizeStudentProfileDraft(currentDraft)

  return (
    normalizedInitial.displayName !== normalizedCurrent.displayName ||
    normalizedInitial.preferredShortName !== normalizedCurrent.preferredShortName
  )
}

const weekdayLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

function buildExceptionTitle(
  exceptionType: ClassroomSchedule["scheduleExceptions"][number]["exceptionType"],
) {
  switch (exceptionType) {
    case "CANCELLED":
      return "Cancelled class"
    case "RESCHEDULED":
      return "Rescheduled class"
    default:
      return "One-off class"
  }
}

function resolveLectureTimestamp(lecture: LectureSummary) {
  return lecture.actualStartAt ?? lecture.plannedStartAt ?? lecture.lectureDate
}

function resolveStudentAttendanceHistoryTimestamp(item: StudentAttendanceHistoryItem) {
  return (
    item.markedAt ?? item.startedAt ?? item.lectureDate ?? item.endedAt ?? new Date(0).toISOString()
  )
}

function compareStudentAttendanceHistoryItems(
  left: StudentAttendanceHistoryItem,
  right: StudentAttendanceHistoryItem,
) {
  return (
    new Date(resolveStudentAttendanceHistoryTimestamp(right)).getTime() -
    new Date(resolveStudentAttendanceHistoryTimestamp(left)).getTime()
  )
}

function formatHistoryMode(mode: StudentAttendanceHistoryItem["mode"]) {
  return mode === "QR_GPS" ? "QR + GPS" : mode === "BLUETOOTH" ? "Bluetooth" : "Manual"
}

function buildStudentAttendanceHistoryDetailLabel(item: StudentAttendanceHistoryItem) {
  const title = item.lectureTitle ?? "Attendance session"
  const sourceLabel =
    item.markSource === "QR_GPS"
      ? "Marked with QR + GPS"
      : item.markSource === "BLUETOOTH"
        ? "Marked with Bluetooth"
        : item.markSource === "MANUAL"
          ? "Updated manually"
          : item.sessionStatus === "ACTIVE"
            ? "Session is still open"
            : "Recorded attendance"

  return `${title} · ${sourceLabel}`
}

function formatMinutes(minutes: number) {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  const normalizedHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  const suffix = hour >= 12 ? "PM" : "AM"

  return `${normalizedHour}:${String(minute).padStart(2, "0")} ${suffix}`
}

function formatDateLabel(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    dateStyle: "medium",
  })
}

function formatDateTimeLabel(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function formatEnrollmentStatusLabel(
  status: StudentClassroomMembershipSummary["enrollmentStatus"],
) {
  switch (status) {
    case "ACTIVE":
      return "Joined"
    case "PENDING":
      return "Pending"
    case "DROPPED":
      return "Removed"
    case "BLOCKED":
      return "Blocked"
    default:
      return "Classroom"
  }
}

function formatAttendanceModeLabel(
  mode: StudentClassroomMembershipSummary["defaultAttendanceMode"],
) {
  switch (mode) {
    case "QR_GPS":
      return "QR + GPS"
    case "BLUETOOTH":
      return "Bluetooth"
    case "MANUAL":
      return "Manual"
    default:
      return "Attendance"
  }
}

function buildAttendanceCandidateMessage(candidates: StudentAttendanceCandidate[]) {
  if (candidates.length === 1) {
    return `${formatAttendanceModeLabel(candidates[0]?.mode ?? "QR_GPS")} is ready for ${candidates[0]?.lectureTitle ?? "this class session"}.`
  }

  const qrCount = candidates.filter((candidate) => candidate.mode === "QR_GPS").length
  const bluetoothCount = candidates.filter((candidate) => candidate.mode === "BLUETOOTH").length
  const parts = [
    qrCount > 0 ? `${qrCount} QR + GPS` : null,
    bluetoothCount > 0 ? `${bluetoothCount} Bluetooth` : null,
  ].filter((value): value is string => Boolean(value))

  return `${parts.join(" and ")} ${pluralizeLabel("session", candidates.length)} are ready in this course.`
}

function pluralizeLabel(label: string, count: number) {
  return count === 1 ? label : `${label}s`
}
