import type { AuthMeResponse, StudentClassroomMembershipSummary } from "@attendease/contracts"

import type {
  StudentDashboardModel,
  StudentDashboardSpotlightModel,
  StudentLectureTimelineItem,
} from "./student-models-core"

export function buildStudentDashboardModel(input: {
  me: AuthMeResponse | null
  classrooms: StudentClassroomMembershipSummary[]
  recentTimeline: StudentLectureTimelineItem[]
  attendanceOverview: {
    totalOpenSessions: number
    qrReadyCount: number
    bluetoothReadyCount: number
    recommendedMode: "QR_GPS" | "BLUETOOTH" | null
  }
  attendanceGate: {
    title: string
    message: string
    tone: "success" | "warning" | "danger"
    canContinue: boolean
  }
}): StudentDashboardModel {
  const activeClassrooms = input.classrooms.filter(
    (classroom) => classroom.enrollmentStatus === "ACTIVE",
  )
  const pendingClassrooms = input.classrooms.filter(
    (classroom) => classroom.enrollmentStatus === "PENDING",
  )
  const featuredClassrooms = [...activeClassrooms, ...pendingClassrooms].slice(0, 4)
  const primaryClassroom = activeClassrooms[0] ?? pendingClassrooms[0] ?? null
  const trustedDeviceLabel =
    input.me?.user.deviceTrust.lifecycleState === "TRUSTED"
      ? "Trusted"
      : input.me?.user.deviceTrust.lifecycleState === "PENDING_REPLACEMENT"
        ? "Pending approval"
        : input.me?.user.deviceTrust.lifecycleState === "REPLACED"
          ? "Replaced"
          : input.me?.user.deviceTrust.state === "NOT_REQUIRED"
            ? "Not required"
            : "Needs review"

  const spotlight: StudentDashboardSpotlightModel = buildStudentDashboardSpotlight({
    activeClassroomCount: activeClassrooms.length,
    recentTimelineCount: input.recentTimeline.length,
    attendanceOverview: input.attendanceOverview,
    attendanceGate: input.attendanceGate,
    primaryClassroomId: primaryClassroom?.id ?? null,
  })

  return {
    greeting: input.me?.user.displayName
      ? `Welcome back, ${input.me.user.displayName.split(" ")[0]}`
      : "Student Home",
    summaryCards: [
      {
        label: "Classrooms",
        value: String(activeClassrooms.length),
        tone: "primary",
      },
      {
        label: "Open Attendance",
        value: String(input.attendanceOverview.totalOpenSessions),
        tone: input.attendanceOverview.totalOpenSessions > 0 ? "success" : "warning",
      },
      {
        label: "Pending Joins",
        value: String(pendingClassrooms.length),
        tone: pendingClassrooms.length > 0 ? "warning" : "success",
      },
      {
        label: "Device Status",
        value: trustedDeviceLabel,
        tone:
          trustedDeviceLabel === "Trusted"
            ? "success"
            : trustedDeviceLabel === "Replaced"
              ? "danger"
              : "warning",
      },
    ],
    spotlight,
    classroomHighlights: featuredClassrooms.map((classroom) => ({
      classroomId: classroom.id,
      title: classroom.displayTitle,
      supportingText: [
        classroom.code,
        formatEnrollmentStatusLabel(classroom.enrollmentStatus),
        formatAttendanceModeLabel(classroom.defaultAttendanceMode),
      ].join(" · "),
      tone:
        classroom.enrollmentStatus === "ACTIVE"
          ? "success"
          : classroom.enrollmentStatus === "PENDING"
            ? "warning"
            : "primary",
    })),
    recentTimeline: input.recentTimeline,
  }
}

function buildStudentDashboardSpotlight(input: {
  activeClassroomCount: number
  recentTimelineCount: number
  attendanceOverview: {
    totalOpenSessions: number
    qrReadyCount: number
    bluetoothReadyCount: number
    recommendedMode: "QR_GPS" | "BLUETOOTH" | null
  }
  attendanceGate: {
    title: string
    message: string
    tone: "success" | "warning" | "danger"
    canContinue: boolean
  }
  primaryClassroomId: string | null
}): StudentDashboardSpotlightModel {
  if (input.activeClassroomCount === 0) {
    return {
      title: "Join your first classroom",
      message: "Use a course code to unlock attendance, updates, schedules, and reports.",
      tone: "warning",
      primaryAction: {
        kind: "JOIN_CLASSROOM",
        label: "Join classroom",
      },
    }
  }

  if (!input.attendanceGate.canContinue) {
    return {
      title: input.attendanceGate.title,
      message: input.attendanceGate.message,
      tone: input.attendanceGate.tone,
      primaryAction: {
        kind: "DEVICE_STATUS",
        label: "Open device status",
      },
      ...(input.primaryClassroomId
        ? {
            secondaryAction: {
              kind: "CLASSROOM" as const,
              label: "Open classroom",
              classroomId: input.primaryClassroomId,
            },
          }
        : {}),
    }
  }

  if (input.attendanceOverview.totalOpenSessions > 0) {
    return {
      title:
        input.attendanceOverview.totalOpenSessions === 1
          ? "Attendance is open now"
          : `${input.attendanceOverview.totalOpenSessions} attendance sessions are open`,
      message: buildOpenAttendanceMessage(input.attendanceOverview),
      tone: "success",
      primaryAction: {
        kind: "ATTENDANCE",
        label: "Open attendance",
      },
      ...(input.primaryClassroomId
        ? {
            secondaryAction: {
              kind: "CLASSROOM",
              label: "Open classroom",
              classroomId: input.primaryClassroomId,
            },
          }
        : {}),
    }
  }

  return {
    title: "You're ready for class",
    message:
      input.recentTimelineCount > 0
        ? "Open a classroom, review your schedule, or check reports while you wait for the next attendance session."
        : "Your classrooms are connected. Updates, schedules, and attendance sessions will appear here.",
    tone: "primary",
    primaryAction: input.primaryClassroomId
      ? {
          kind: "CLASSROOM",
          label: "Open classroom",
          classroomId: input.primaryClassroomId,
        }
      : {
          kind: "REPORTS",
          label: "Open reports",
        },
    secondaryAction: input.primaryClassroomId
      ? {
          kind: "REPORTS",
          label: "Open reports",
        }
      : {
          kind: "JOIN_CLASSROOM",
          label: "Join classroom",
        },
  }
}

function buildOpenAttendanceMessage(input: {
  qrReadyCount: number
  bluetoothReadyCount: number
  recommendedMode: "QR_GPS" | "BLUETOOTH" | null
}) {
  const fragments = [
    input.qrReadyCount > 0
      ? `${input.qrReadyCount} QR + GPS ${pluralize("session", input.qrReadyCount)}`
      : null,
    input.bluetoothReadyCount > 0
      ? `${input.bluetoothReadyCount} Bluetooth ${pluralize("session", input.bluetoothReadyCount)}`
      : null,
  ].filter((fragment): fragment is string => Boolean(fragment))

  const baseMessage =
    fragments.length > 0
      ? `You can mark ${joinFragments(fragments)} from this phone.`
      : "Attendance is ready from this phone."

  if (!input.recommendedMode) {
    return baseMessage
  }

  return `${baseMessage} Start with ${
    input.recommendedMode === "QR_GPS" ? "QR + GPS" : "Bluetooth"
  }.`
}

function joinFragments(fragments: string[]) {
  if (fragments.length <= 1) {
    return fragments[0] ?? ""
  }

  if (fragments.length === 2) {
    return `${fragments[0]} and ${fragments[1]}`
  }

  return `${fragments.slice(0, -1).join(", ")}, and ${fragments[fragments.length - 1]}`
}

function pluralize(label: string, count: number) {
  return count === 1 ? label : `${label}s`
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
      return "Manual only"
    default:
      return "Attendance"
  }
}
