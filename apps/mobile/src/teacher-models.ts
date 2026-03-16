import { AuthApiClientError } from "@attendease/auth"
import type {
  AttendanceSessionHistoryItem,
  AuthMeResponse,
  ClassroomSummary,
  LectureSummary,
  TeacherAssignmentSummary,
} from "@attendease/contracts"

export type TeacherCardTone = "primary" | "success" | "warning" | "danger"

export type TeacherDashboardActionKind =
  | "ACTIVE_SESSION"
  | "BLUETOOTH"
  | "CLASSROOMS"
  | "SESSION_HISTORY"
  | "REPORTS"
  | "EXPORTS"

export interface TeacherDashboardCard {
  label: string
  value: string
  tone: TeacherCardTone
}

export interface TeacherDashboardActionModel {
  kind: TeacherDashboardActionKind
  label: string
  sessionId?: string
}

export interface TeacherDashboardSpotlightModel {
  title: string
  message: string
  tone: TeacherCardTone
  primaryAction: TeacherDashboardActionModel
  secondaryAction?: TeacherDashboardActionModel
}

export interface TeacherClassroomHighlightModel {
  classroomId: string
  title: string
  supportingText: string
  joinCodeLabel: string
  sessionStateLabel: string
}

export interface TeacherRecentSessionItem {
  id: string
  classroomId: string
  classroomTitle: string
  title: string
  status: AttendanceSessionHistoryItem["status"] | LectureSummary["status"]
  mode: AttendanceSessionHistoryItem["mode"]
  timestamp: string
  presentCount: number
  absentCount: number
  isLive: boolean
}

export interface TeacherDashboardModel {
  greeting: string
  summaryCards: TeacherDashboardCard[]
  spotlight: TeacherDashboardSpotlightModel
  classroomHighlights: TeacherClassroomHighlightModel[]
  recentSessions: TeacherRecentSessionItem[]
  canCreateClassroom: boolean
}

export function mapTeacherApiErrorToMessage(error: unknown): string {
  if (error instanceof AuthApiClientError) {
    const detailMessage = extractApiErrorMessage(error.details)

    switch (error.status) {
      case 401:
        return "Your teacher session expired. Sign in again to refresh the mobile dashboard."
      case 403:
        return (
          detailMessage ?? "This teacher action is blocked by academic scope or classroom policy."
        )
      case 404:
        return detailMessage ?? "The requested teacher classroom data is no longer available."
      case 409:
        return detailMessage ?? "This classroom action conflicts with the current teacher state."
      default:
        return detailMessage ?? "AttendEase could not complete the teacher request."
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return "AttendEase hit an unexpected teacher mobile error."
}

export function buildTeacherRecentSessionTimeline(input: {
  classrooms: ClassroomSummary[]
  lectureSets: Array<{ classroomId: string; lectures: LectureSummary[] }>
  limit?: number
}): TeacherRecentSessionItem[] {
  const classroomTitleById = new Map(
    input.classrooms.map((classroom) => [classroom.id, classroom.displayTitle]),
  )

  return input.lectureSets
    .flatMap((lectureSet) =>
      lectureSet.lectures.map((lecture) => ({
        id: lecture.id,
        classroomId: lectureSet.classroomId,
        classroomTitle: classroomTitleById.get(lectureSet.classroomId) ?? "Classroom",
        title: lecture.title ?? "Scheduled lecture",
        status: lecture.status,
        mode: "BLUETOOTH" as const,
        timestamp: lecture.actualStartAt ?? lecture.plannedStartAt ?? lecture.lectureDate,
        presentCount: 0,
        absentCount: 0,
        isLive: lecture.status === "OPEN_FOR_ATTENDANCE",
      })),
    )
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .slice(0, input.limit ?? 8)
}

export function buildTeacherSessionHistoryPreview(input: {
  sessions: AttendanceSessionHistoryItem[]
  limit?: number
}): TeacherRecentSessionItem[] {
  return input.sessions
    .map((session) => ({
      id: session.id,
      classroomId: session.classroomId,
      classroomTitle: session.classroomDisplayTitle,
      title: session.lectureTitle ?? "Attendance session",
      status: session.status,
      mode: session.mode,
      timestamp:
        session.startedAt ??
        session.endedAt ??
        session.scheduledEndAt ??
        session.lectureDate ??
        new Date(0).toISOString(),
      presentCount: session.presentCount,
      absentCount: session.absentCount,
      isLive: session.status === "ACTIVE",
    }))
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .slice(0, input.limit ?? 6)
}

export function buildTeacherDashboardModel(input: {
  me: AuthMeResponse | null
  assignments: TeacherAssignmentSummary[]
  classrooms: ClassroomSummary[]
  recentSessions: TeacherRecentSessionItem[]
}): TeacherDashboardModel {
  const activeClassrooms = input.classrooms.filter((classroom) => classroom.status === "ACTIVE")
  const classroomsWithJoinCodes = input.classrooms.filter((classroom) => classroom.activeJoinCode)
  const liveSessions = input.recentSessions.filter((session) => session.isLive)
  const canCreateClassroom = input.assignments.some(
    (assignment) => assignment.canSelfCreateCourseOffering,
  )
  const liveSessionCountByClassroomId = new Map<string, number>()

  for (const session of liveSessions) {
    liveSessionCountByClassroomId.set(
      session.classroomId,
      (liveSessionCountByClassroomId.get(session.classroomId) ?? 0) + 1,
    )
  }

  const classroomHighlights = activeClassrooms.slice(0, 3).map((classroom) => ({
    classroomId: classroom.id,
    title: classroom.displayTitle,
    supportingText: `${classroom.code} · ${formatAttendanceModeLabel(classroom.defaultAttendanceMode)}`,
    joinCodeLabel: classroom.activeJoinCode?.code
      ? `Course code ${classroom.activeJoinCode.code}`
      : "No live course code",
    sessionStateLabel:
      (liveSessionCountByClassroomId.get(classroom.id) ?? 0) > 0
        ? (liveSessionCountByClassroomId.get(classroom.id) ?? 0) === 1
          ? "1 live attendance session"
          : `${liveSessionCountByClassroomId.get(classroom.id) ?? 0} live attendance sessions`
        : "Ready for Bluetooth attendance",
  }))
  const spotlight = buildTeacherDashboardSpotlight({
    activeClassroomCount: activeClassrooms.length,
    liveSessions,
    canCreateClassroom,
  })

  return {
    greeting: input.me?.user.displayName
      ? `Welcome back, ${input.me.user.displayName}`
      : "Teacher Home",
    canCreateClassroom,
    spotlight,
    classroomHighlights,
    summaryCards: [
      {
        label: "Active Classrooms",
        value: String(activeClassrooms.length),
        tone: activeClassrooms.length > 0 ? "success" : "warning",
      },
      {
        label: "Live Sessions",
        value: String(liveSessions.length),
        tone: liveSessions.length > 0 ? "warning" : "success",
      },
      {
        label: "Assignments",
        value: String(input.assignments.length),
        tone: input.assignments.length > 0 ? "success" : "warning",
      },
      {
        label: "Join Codes Live",
        value: String(classroomsWithJoinCodes.length),
        tone: classroomsWithJoinCodes.length > 0 ? "primary" : "warning",
      },
    ],
    recentSessions: input.recentSessions,
  }
}

function buildTeacherDashboardSpotlight(input: {
  activeClassroomCount: number
  liveSessions: TeacherRecentSessionItem[]
  canCreateClassroom: boolean
}): TeacherDashboardSpotlightModel {
  if (input.activeClassroomCount === 0) {
    return {
      title: input.canCreateClassroom ? "Set up your first classroom" : "Waiting for classrooms",
      message: input.canCreateClassroom
        ? "Open Classrooms to create your first teaching space, then come back here to run Bluetooth attendance."
        : "Open Classrooms to review your assigned teaching spaces and their current status.",
      tone: "warning",
      primaryAction: {
        kind: "CLASSROOMS",
        label: "Open classrooms",
      },
      ...(input.canCreateClassroom
        ? {
            secondaryAction: {
              kind: "REPORTS" as const,
              label: "Open reports",
            },
          }
        : {}),
    }
  }

  if (input.liveSessions.length > 1) {
    return {
      title: `${input.liveSessions.length} attendance sessions are live`,
      message:
        "Open session history to jump into the right live class, or go back to classrooms to start another Bluetooth session.",
      tone: "success",
      primaryAction: {
        kind: "SESSION_HISTORY",
        label: "Open live sessions",
      },
      secondaryAction: {
        kind: "CLASSROOMS",
        label: "Open classrooms",
      },
    }
  }

  const liveSession = input.liveSessions[0]

  if (liveSession) {
    return {
      title: `${liveSession.classroomTitle} is live`,
      message:
        "Resume the current attendance session, review counts, or open the full session history when you need more context.",
      tone: "success",
      primaryAction: {
        kind: "ACTIVE_SESSION",
        label: "Resume live session",
        sessionId: liveSession.id,
      },
      secondaryAction: {
        kind: "SESSION_HISTORY",
        label: "Session history",
      },
    }
  }

  return {
    title: "Run today's classrooms",
    message:
      input.activeClassroomCount === 1
        ? "1 active classroom is ready. Start Bluetooth attendance when class begins, then keep session history close by."
        : `${input.activeClassroomCount} active classrooms are ready. Start Bluetooth attendance when class begins, then keep session history close by.`,
    tone: "primary",
    primaryAction: {
      kind: "BLUETOOTH",
      label: "Bluetooth attendance",
    },
    secondaryAction: {
      kind: "CLASSROOMS",
      label: "Open classrooms",
    },
  }
}

function formatAttendanceModeLabel(mode: ClassroomSummary["defaultAttendanceMode"]) {
  switch (mode) {
    case "BLUETOOTH":
      return "Bluetooth"
    case "QR_GPS":
      return "QR + GPS"
    default:
      return "Attendance"
  }
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
