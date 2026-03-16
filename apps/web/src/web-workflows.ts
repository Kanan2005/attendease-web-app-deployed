import type {
  AttendanceSessionDetail,
  AttendanceSessionHistoryItem,
  AttendanceSessionStudentSummary,
  AttendanceSessionSummary,
  ClassroomDetail,
  ClassroomSchedule,
  ClassroomSummary,
  CreateQrSessionRequest,
  LectureSummary,
  RosterImportJobSummary,
  RosterImportRowInput,
  SaveAndNotifyScheduleRequest,
  ScheduleExceptionSummary,
  ScheduleExceptionType,
  ScheduleSlotStatus,
  ScheduleSlotSummary,
} from "@attendease/contracts"
import { rosterImportRowInputSchema } from "@attendease/contracts"

export const teacherWorkflowRoutes = {
  dashboard: "/teacher/dashboard",
  classrooms: "/teacher/classrooms",
  classroomCreate: "/teacher/classrooms/new",
  semesters: "/teacher/semesters",
  imports: "/teacher/imports",
  sessionStart: "/teacher/sessions/start",
  sessionHistory: "/teacher/sessions/history",
  classroomDetail(classroomId: string) {
    return `/teacher/classrooms/${classroomId}`
  },
  classroomRoster(classroomId: string) {
    return `/teacher/classrooms/${classroomId}/roster`
  },
  classroomImports(classroomId: string) {
    return `/teacher/classrooms/${classroomId}/imports`
  },
  classroomSchedule(classroomId: string) {
    return `/teacher/classrooms/${classroomId}/schedule`
  },
  classroomStream(classroomId: string) {
    return `/teacher/classrooms/${classroomId}/stream`
  },
  classroomLectures(classroomId: string) {
    return `/teacher/classrooms/${classroomId}/lectures`
  },
  activeSession(sessionId: string) {
    return `/teacher/sessions/active/${sessionId}`
  },
  activeSessionProjector(sessionId: string) {
    return `/teacher/sessions/active/${sessionId}/projector`
  },
} as const

export const adminWorkflowRoutes = {
  dashboard: "/admin/dashboard",
  studentSupport: "/admin/devices?view=support",
  semesters: "/admin/semesters",
  devices: "/admin/devices",
  imports: "/admin/imports",
} as const

export const webWorkflowQueryKeys = {
  teacherAssignments(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "teacher-assignments", filters ?? {}] as const
  },
  classrooms(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "classrooms", filters ?? {}] as const
  },
  classroomDetail(classroomId: string) {
    return ["web-workflows", "classroom-detail", classroomId] as const
  },
  classroomRoster(classroomId: string, filters?: Record<string, string | undefined>) {
    return ["web-workflows", "classroom-roster", classroomId, filters ?? {}] as const
  },
  classroomImports(classroomId: string, filters?: Record<string, string | undefined>) {
    return ["web-workflows", "classroom-imports", classroomId, filters ?? {}] as const
  },
  classroomImportDetail(classroomId: string, jobId: string) {
    return ["web-workflows", "classroom-import-detail", classroomId, jobId] as const
  },
  classroomSchedule(classroomId: string) {
    return ["web-workflows", "classroom-schedule", classroomId] as const
  },
  classroomStream(classroomId: string, limit?: number) {
    return ["web-workflows", "classroom-stream", classroomId, limit ?? 25] as const
  },
  classroomLectures(classroomId: string) {
    return ["web-workflows", "classroom-lectures", classroomId] as const
  },
  attendanceSession(sessionId: string) {
    return ["web-workflows", "attendance-session", sessionId] as const
  },
  attendanceSessionStudents(sessionId: string) {
    return ["web-workflows", "attendance-session-students", sessionId] as const
  },
  sessionHistory(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "session-history", filters ?? {}] as const
  },
  teacherDaywiseReports(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "teacher-daywise-reports", filters ?? {}] as const
  },
  teacherSubjectwiseReports(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "teacher-subjectwise-reports", filters ?? {}] as const
  },
  teacherStudentPercentageReports(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "teacher-student-percentage-reports", filters ?? {}] as const
  },
  exportJobs(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "export-jobs", filters ?? {}] as const
  },
  analyticsTrends(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "analytics-trends", filters ?? {}] as const
  },
  analyticsDistribution(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "analytics-distribution", filters ?? {}] as const
  },
  analyticsComparisons(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "analytics-comparisons", filters ?? {}] as const
  },
  analyticsModes(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "analytics-modes", filters ?? {}] as const
  },
  analyticsStudentTimeline(studentId: string, filters?: Record<string, string | undefined>) {
    return ["web-workflows", "analytics-student-timeline", studentId, filters ?? {}] as const
  },
  analyticsSessionDrilldown(sessionId: string) {
    return ["web-workflows", "analytics-session-drilldown", sessionId] as const
  },
  emailAutomationRules(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "email-automation-rules", filters ?? {}] as const
  },
  emailDispatchRuns(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "email-dispatch-runs", filters ?? {}] as const
  },
  emailLogs(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "email-logs", filters ?? {}] as const
  },
  teacherImports() {
    return ["web-workflows", "teacher-imports"] as const
  },
  teacherSemesterVisibility() {
    return ["web-workflows", "teacher-semester-visibility"] as const
  },
  semesters(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "semesters", filters ?? {}] as const
  },
  adminStudents(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "admin-students", filters ?? {}] as const
  },
  adminStudentDetail(studentId: string) {
    return ["web-workflows", "admin-student-detail", studentId] as const
  },
  adminClassrooms(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "admin-classrooms", filters ?? {}] as const
  },
  adminClassroomDetail(classroomId: string) {
    return ["web-workflows", "admin-classroom-detail", classroomId] as const
  },
  adminImports() {
    return ["web-workflows", "admin-imports"] as const
  },
} as const

export interface ScheduleSlotDraft {
  id: string | null
  weekday: number
  startMinutes: number
  endMinutes: number
  locationLabel: string
  status: ScheduleSlotStatus
}

export interface ScheduleExceptionDraft {
  id: string | null
  scheduleSlotId: string | null
  exceptionType: ScheduleExceptionType
  effectiveDate: string
  startMinutes: number | null
  endMinutes: number | null
  locationLabel: string
  reason: string
}

export interface ScheduleDraftState {
  slots: ScheduleSlotDraft[]
  exceptions: ScheduleExceptionDraft[]
}

export interface SemesterVisibilityRow {
  semesterId: string
  classroomCount: number
  activeCount: number
  completedCount: number
  requiresTrustedDeviceCount: number
}

export interface ImportMonitorRow {
  classroomId: string
  classroomCode: string
  classroomTitle: string
  jobId: string
  status: string
  totalRows: number
  validRows: number
  invalidRows: number
  appliedRows: number
  createdAt: string
  reviewRequired: boolean
}

export interface QrSessionShellSection {
  id: string
  title: string
  description: string
}

export interface QrSessionShellModel {
  title: string
  eyebrow: string
  subtitle: string
  sections: QrSessionShellSection[]
}

export interface QrSessionCreateDraft {
  lectureId: string
  sessionDurationMinutes: string
  gpsRadiusMeters: string
  anchorType: "CLASSROOM_FIXED" | "CAMPUS_ZONE" | "TEACHER_SELECTED"
  anchorLatitude: string
  anchorLongitude: string
  anchorLabel: string
}

export interface QrSessionLiveModel {
  statusLabel: string
  countdownLabel: string
  remainingMilliseconds: number
  refreshIntervalMs: number | false
  markedCount: number
  totalCount: number
  attendanceRatioLabel: string
  qrExpiresLabel: string
  qrRefreshLabel: string
  locationRuleLabel: string
  liveSummaryLabel: string
  canDisplayQr: boolean
}

export interface QrSessionRosterRow {
  attendanceRecordId: string
  studentDisplayName: string
  secondaryLabel: string
  markedAtLabel: string
}

export interface QrSessionRosterModel {
  presentRows: QrSessionRosterRow[]
  absentRows: QrSessionRosterRow[]
  presentSummaryLabel: string
  absentSummaryLabel: string
  latestMarkedLabel: string
}

export const qrSessionLiveRefreshIntervalMs = 2_000

export function getTeacherSessionHistoryPollInterval(
  sessions: AttendanceSessionHistoryItem[] | null,
): number | false {
  if (!sessions?.some((session) => session.status === "ACTIVE")) {
    return false
  }

  return qrSessionLiveRefreshIntervalMs
}

export function buildTeacherClassroomLinks(classroomId: string) {
  return [
    {
      href: teacherWorkflowRoutes.classroomDetail(classroomId),
      label: "Course",
    },
    {
      href: teacherWorkflowRoutes.classroomRoster(classroomId),
      label: "Roster",
    },
    {
      href: teacherWorkflowRoutes.classroomImports(classroomId),
      label: "Imports",
    },
    {
      href: teacherWorkflowRoutes.classroomSchedule(classroomId),
      label: "Schedule",
    },
    {
      href: teacherWorkflowRoutes.classroomStream(classroomId),
      label: "Updates",
    },
    {
      href: teacherWorkflowRoutes.classroomLectures(classroomId),
      label: "Class Sessions",
    },
  ] as const
}

export function createQrSessionDraft(
  classroom: ClassroomDetail,
  lectures: LectureSummary[],
): QrSessionCreateDraft {
  return {
    lectureId: lectures[0]?.id ?? "",
    sessionDurationMinutes: String(classroom.defaultSessionDurationMinutes),
    gpsRadiusMeters: String(classroom.defaultGpsRadiusMeters),
    anchorType: "TEACHER_SELECTED",
    anchorLatitude: "",
    anchorLongitude: "",
    anchorLabel: classroom.displayTitle,
  }
}

export function buildQrSessionCreateRequest(input: {
  classroomId: string
  draft: QrSessionCreateDraft
}): CreateQrSessionRequest {
  return {
    classroomId: input.classroomId,
    ...(input.draft.lectureId.trim() ? { lectureId: input.draft.lectureId.trim() } : {}),
    sessionDurationMinutes: Number(input.draft.sessionDurationMinutes),
    gpsRadiusMeters: Number(input.draft.gpsRadiusMeters),
    anchorType: input.draft.anchorType,
    anchorLatitude: Number(input.draft.anchorLatitude),
    anchorLongitude: Number(input.draft.anchorLongitude),
    ...(input.draft.anchorLabel.trim() ? { anchorLabel: input.draft.anchorLabel.trim() } : {}),
  }
}

export function createScheduleDraftState(schedule: ClassroomSchedule): ScheduleDraftState {
  return {
    slots: schedule.scheduleSlots.map((slot) => ({
      id: slot.id,
      weekday: slot.weekday,
      startMinutes: slot.startMinutes,
      endMinutes: slot.endMinutes,
      locationLabel: slot.locationLabel ?? "",
      status: slot.status,
    })),
    exceptions: schedule.scheduleExceptions.map((exception) => ({
      id: exception.id,
      scheduleSlotId: exception.scheduleSlotId,
      exceptionType: exception.exceptionType,
      effectiveDate: exception.effectiveDate,
      startMinutes: exception.startMinutes,
      endMinutes: exception.endMinutes,
      locationLabel: exception.locationLabel ?? "",
      reason: exception.reason ?? "",
    })),
  }
}

export function createEmptyScheduleSlotDraft(): ScheduleSlotDraft {
  return {
    id: null,
    weekday: 1,
    startMinutes: 540,
    endMinutes: 600,
    locationLabel: "",
    status: "ACTIVE",
  }
}

export function createEmptyScheduleExceptionDraft(): ScheduleExceptionDraft {
  return {
    id: null,
    scheduleSlotId: null,
    exceptionType: "ONE_OFF",
    effectiveDate: new Date().toISOString(),
    startMinutes: 540,
    endMinutes: 600,
    locationLabel: "",
    reason: "",
  }
}

export function buildScheduleSavePayload(input: {
  original: ClassroomSchedule
  draft: ScheduleDraftState
  note?: string
}): SaveAndNotifyScheduleRequest | null {
  const slotMap = new Map(input.original.scheduleSlots.map((slot) => [slot.id, slot]))
  const exceptionMap = new Map(
    input.original.scheduleExceptions.map((exception) => [exception.id, exception]),
  )

  const weeklySlotCreates = input.draft.slots
    .filter((slot) => slot.id === null)
    .map((slot) => ({
      weekday: slot.weekday,
      startMinutes: slot.startMinutes,
      endMinutes: slot.endMinutes,
      ...(slot.locationLabel.trim() ? { locationLabel: slot.locationLabel.trim() } : {}),
    }))

  const weeklySlotUpdates = input.draft.slots
    .filter((slot) => slot.id !== null)
    .flatMap((slot) => {
      const slotId = slot.id

      if (!slotId) {
        return []
      }

      const current = slotMap.get(slotId)

      if (!current) {
        return []
      }

      const nextLocation = nullableTrimmedText(slot.locationLabel)
      const currentLocation = current.locationLabel ?? null

      if (
        current.weekday === slot.weekday &&
        current.startMinutes === slot.startMinutes &&
        current.endMinutes === slot.endMinutes &&
        current.status === slot.status &&
        currentLocation === nextLocation
      ) {
        return []
      }

      return [
        {
          slotId: current.id,
          weekday: slot.weekday,
          startMinutes: slot.startMinutes,
          endMinutes: slot.endMinutes,
          locationLabel: nextLocation,
          status: slot.status,
        },
      ]
    })

  const exceptionCreates = input.draft.exceptions
    .filter((exception) => exception.id === null)
    .map((exception) => buildScheduleExceptionCreate(exception))

  const exceptionUpdates = input.draft.exceptions
    .filter((exception) => exception.id !== null)
    .flatMap((exception) => {
      const exceptionId = exception.id

      if (!exceptionId) {
        return []
      }

      const current = exceptionMap.get(exceptionId)

      if (!current) {
        return []
      }

      const nextLocation = nullableTrimmedText(exception.locationLabel)
      const nextReason = nullableTrimmedText(exception.reason)

      if (
        current.scheduleSlotId === exception.scheduleSlotId &&
        current.exceptionType === exception.exceptionType &&
        current.effectiveDate === exception.effectiveDate &&
        current.startMinutes === exception.startMinutes &&
        current.endMinutes === exception.endMinutes &&
        (current.locationLabel ?? null) === nextLocation &&
        (current.reason ?? null) === nextReason
      ) {
        return []
      }

      return [
        {
          exceptionId: current.id,
          scheduleSlotId: exception.scheduleSlotId,
          exceptionType: exception.exceptionType,
          effectiveDate: exception.effectiveDate,
          startMinutes: exception.startMinutes,
          endMinutes: exception.endMinutes,
          locationLabel: nextLocation,
          reason: nextReason,
        },
      ]
    })

  const hasChanges =
    weeklySlotCreates.length > 0 ||
    weeklySlotUpdates.length > 0 ||
    exceptionCreates.length > 0 ||
    exceptionUpdates.length > 0

  if (!hasChanges) {
    return null
  }

  return {
    ...(weeklySlotCreates.length > 0 ? { weeklySlotCreates } : {}),
    ...(weeklySlotUpdates.length > 0 ? { weeklySlotUpdates } : {}),
    ...(exceptionCreates.length > 0 ? { exceptionCreates } : {}),
    ...(exceptionUpdates.length > 0 ? { exceptionUpdates } : {}),
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
  }
}

export function parseRosterImportRowsText(input: string): {
  rows: RosterImportRowInput[]
  ignoredLineCount: number
} {
  const rows: RosterImportRowInput[] = []
  let ignoredLineCount = 0

  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!line || line.startsWith("#")) {
      continue
    }

    const tokens = line
      .split(",")
      .map((segment) => segment.trim())
      .filter(Boolean)

    if (tokens.length === 0) {
      continue
    }

    const candidate = buildRosterImportRowCandidate(tokens)
    const parsed = rosterImportRowInputSchema.safeParse(candidate)

    if (!parsed.success) {
      ignoredLineCount += 1
      continue
    }

    rows.push(parsed.data)
  }

  return {
    rows,
    ignoredLineCount,
  }
}

export function buildTeacherSemesterVisibilityRows(
  classrooms: ClassroomSummary[],
): SemesterVisibilityRow[] {
  const buckets = new Map<string, SemesterVisibilityRow>()

  for (const classroom of classrooms) {
    const current = buckets.get(classroom.semesterId) ?? {
      semesterId: classroom.semesterId,
      classroomCount: 0,
      activeCount: 0,
      completedCount: 0,
      requiresTrustedDeviceCount: 0,
    }

    current.classroomCount += 1

    if (classroom.status === "ACTIVE") {
      current.activeCount += 1
    }

    if (classroom.status === "COMPLETED" || classroom.status === "ARCHIVED") {
      current.completedCount += 1
    }

    if (classroom.requiresTrustedDevice) {
      current.requiresTrustedDeviceCount += 1
    }

    buckets.set(classroom.semesterId, current)
  }

  return [...buckets.values()].sort((left, right) =>
    left.semesterId.localeCompare(right.semesterId),
  )
}

export function buildImportMonitorRows(input: {
  classrooms: ClassroomSummary[]
  jobsByClassroom: Record<string, RosterImportJobSummary[]>
}): ImportMonitorRow[] {
  const classroomMap = new Map(input.classrooms.map((classroom) => [classroom.id, classroom]))

  return Object.entries(input.jobsByClassroom)
    .flatMap(([classroomId, jobs]) => {
      const classroom = classroomMap.get(classroomId)

      if (!classroom) {
        return []
      }

      return jobs.map((job) => ({
        classroomId,
        classroomCode: classroom.code,
        classroomTitle: classroom.displayTitle,
        jobId: job.id,
        status: job.status,
        totalRows: job.totalRows,
        validRows: job.validRows,
        invalidRows: job.invalidRows,
        appliedRows: job.appliedRows,
        createdAt: job.createdAt,
        reviewRequired: job.status === "REVIEW_REQUIRED",
      }))
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}

export function buildQrSessionShellModel(input: {
  sessionId: string
  projector: boolean
}): QrSessionShellModel {
  const sections: QrSessionShellSection[] = input.projector
    ? [
        {
          id: "projector-header",
          title: "Projector Header",
          description: "Large classroom context, timer, and live marked count.",
        },
        {
          id: "rolling-qr-panel",
          title: "Rolling QR Panel",
          description:
            "Dedicated large QR surface that later rotates tokens on the session cadence.",
        },
        {
          id: "projector-status",
          title: "Projector Status",
          description:
            "Connection, live-session heartbeat, and recovery messaging for the teacher.",
        },
      ]
    : [
        {
          id: "session-header",
          title: "Session Header",
          description: "Classroom, lecture, validation rules, and session state summary.",
        },
        {
          id: "rolling-qr-panel",
          title: "Rolling QR Panel",
          description: "Teacher control surface for the rotating QR payload.",
        },
        {
          id: "live-counter",
          title: "Live Counter",
          description: "Present count, eligible roster size, and suspicious-attempt indicators.",
        },
        {
          id: "session-timer",
          title: "Session Timer",
          description: "Countdown, expiry warnings, and auto-end status.",
        },
        {
          id: "session-controls",
          title: "Session Controls",
          description: "End-session, projector handoff, and reconnect actions.",
        },
      ]

  return {
    eyebrow: input.projector ? "Projector" : "Live attendance",
    title: input.projector ? "QR classroom display" : "Live QR attendance",
    subtitle: input.projector
      ? "Keep the QR, timer, and marked count visible for the room while the teacher keeps controls on the main screen."
      : "Keep the timer, rolling QR, and live marked list visible while the class is checking in.",
    sections,
  }
}

export function getQrSessionPollInterval(session: AttendanceSessionSummary | null): number | false {
  if (!session || session.status !== "ACTIVE") {
    return false
  }

  return qrSessionLiveRefreshIntervalMs
}

export function buildQrSessionLiveModel(
  session: AttendanceSessionDetail | AttendanceSessionSummary,
  now = new Date(),
): QrSessionLiveModel {
  const totalCount = session.rosterSnapshotCount
  const markedCount = session.presentCount
  const expiresAt = session.currentQrExpiresAt ? new Date(session.currentQrExpiresAt) : null
  const remainingMilliseconds =
    session.status === "ACTIVE" && session.scheduledEndAt
      ? Math.max(0, new Date(session.scheduledEndAt).getTime() - now.getTime())
      : 0

  return {
    statusLabel: formatEnum(session.status),
    countdownLabel:
      session.status === "ACTIVE"
        ? formatCountdown(remainingMilliseconds)
        : session.endedAt
          ? `Closed ${formatPortalDateTime(session.endedAt)}`
          : "Session closed",
    remainingMilliseconds,
    refreshIntervalMs: getQrSessionPollInterval(session),
    markedCount,
    totalCount,
    attendanceRatioLabel: `${markedCount} / ${totalCount}`,
    qrExpiresLabel:
      session.status === "ACTIVE" && expiresAt
        ? formatPortalDateTime(expiresAt.toISOString())
        : "No active QR payload",
    qrRefreshLabel:
      session.status === "ACTIVE"
        ? `Refreshes every ${qrSessionLiveRefreshIntervalMs / 1_000} seconds`
        : "Refresh stopped",
    locationRuleLabel:
      session.gpsRadiusMeters && session.anchorLabel
        ? `${session.anchorLabel} · ${session.gpsRadiusMeters} meter check-in zone`
        : session.gpsRadiusMeters
          ? `${session.gpsRadiusMeters} meter check-in zone`
          : "Location rule not available",
    liveSummaryLabel: `${markedCount} present · ${session.absentCount} absent`,
    canDisplayQr: Boolean(
      session.status === "ACTIVE" && session.currentQrPayload && session.currentQrExpiresAt,
    ),
  }
}

export function buildQrSessionRosterModel(
  students: AttendanceSessionStudentSummary[],
): QrSessionRosterModel {
  const presentRows = students
    .filter((student) => student.status === "PRESENT")
    .sort((left, right) => {
      const leftTime = left.markedAt ? new Date(left.markedAt).getTime() : 0
      const rightTime = right.markedAt ? new Date(right.markedAt).getTime() : 0

      if (leftTime !== rightTime) {
        return rightTime - leftTime
      }

      return left.studentDisplayName.localeCompare(right.studentDisplayName)
    })
    .map((student) => ({
      attendanceRecordId: student.attendanceRecordId,
      studentDisplayName: student.studentDisplayName,
      secondaryLabel: student.studentRollNumber ?? student.studentEmail,
      markedAtLabel: student.markedAt
        ? `Marked ${formatPortalDateTime(student.markedAt)}`
        : "Marked in this session",
    }))

  const absentRows = students
    .filter((student) => student.status !== "PRESENT")
    .sort((left, right) => left.studentDisplayName.localeCompare(right.studentDisplayName))
    .map((student) => ({
      attendanceRecordId: student.attendanceRecordId,
      studentDisplayName: student.studentDisplayName,
      secondaryLabel: student.studentRollNumber ?? student.studentEmail,
      markedAtLabel: "Waiting to mark",
    }))

  return {
    presentRows,
    absentRows,
    presentSummaryLabel: `${presentRows.length} marked`,
    absentSummaryLabel: `${absentRows.length} still absent`,
    latestMarkedLabel: presentRows[0]?.markedAtLabel ?? "No student has marked attendance yet.",
  }
}

export function formatPortalDateTime(value: string | null): string {
  if (!value) {
    return "Not available"
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export function formatPortalMinutesRange(startMinutes: number, endMinutes: number): string {
  return `${formatMinuteOfDay(startMinutes)} - ${formatMinuteOfDay(endMinutes)}`
}

function buildScheduleExceptionCreate(exception: ScheduleExceptionDraft) {
  return {
    ...(exception.scheduleSlotId ? { scheduleSlotId: exception.scheduleSlotId } : {}),
    exceptionType: exception.exceptionType,
    effectiveDate: exception.effectiveDate,
    ...(exception.startMinutes !== null ? { startMinutes: exception.startMinutes } : {}),
    ...(exception.endMinutes !== null ? { endMinutes: exception.endMinutes } : {}),
    ...(nullableTrimmedText(exception.locationLabel)
      ? { locationLabel: nullableTrimmedText(exception.locationLabel) }
      : {}),
    ...(nullableTrimmedText(exception.reason)
      ? { reason: nullableTrimmedText(exception.reason) }
      : {}),
  }
}

function buildRosterImportRowCandidate(tokens: string[]): Partial<RosterImportRowInput> {
  const first = tokens[0] ?? ""
  const second = tokens[1] ?? ""
  const third = tokens[2] ?? ""

  if (first.includes("@")) {
    return {
      studentEmail: first,
      ...(second
        ? second.includes(" ") || third
          ? { parsedName: second }
          : { studentRollNumber: second }
        : {}),
      ...(third ? { studentRollNumber: third } : {}),
    }
  }

  if (!looksLikeRollNumber(first)) {
    return {}
  }

  return {
    studentRollNumber: first,
    ...(second.includes("@") ? { studentEmail: second } : {}),
    ...(!second.includes("@") && second ? { parsedName: second } : {}),
    ...(third ? { parsedName: third } : {}),
  }
}

function nullableTrimmedText(value: string): string | null {
  const next = value.trim()

  return next ? next : null
}

function looksLikeRollNumber(value: string): boolean {
  const normalized = value.trim()

  if (!normalized) {
    return false
  }

  if (normalized.includes(" ")) {
    return false
  }

  const alphaNumeric = /^[A-Za-z0-9_-]+$/.test(normalized)

  if (!alphaNumeric) {
    return false
  }

  return /\d/.test(normalized) || /[-_]/.test(normalized)
}

function formatMinuteOfDay(minutes: number): string {
  const safeMinutes = Math.max(0, Math.min(1440, minutes))
  const hour = Math.floor(safeMinutes / 60)
  const minute = safeMinutes % 60
  const normalizedHour = ((hour + 11) % 12) + 1
  const suffix = hour >= 12 ? "PM" : "AM"

  return `${String(normalizedHour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${suffix}`
}

function formatCountdown(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1_000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} remaining`
}

function formatEnum(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function sortScheduleSlots(slots: ScheduleSlotSummary[]): ScheduleSlotSummary[] {
  return [...slots].sort((left, right) => {
    if (left.weekday !== right.weekday) {
      return left.weekday - right.weekday
    }

    return left.startMinutes - right.startMinutes
  })
}

export function sortScheduleExceptions(
  exceptions: ScheduleExceptionSummary[],
): ScheduleExceptionSummary[] {
  return [...exceptions].sort((left, right) =>
    left.effectiveDate.localeCompare(right.effectiveDate),
  )
}
