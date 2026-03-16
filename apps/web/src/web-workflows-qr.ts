import type {
  AttendanceSessionDetail,
  AttendanceSessionHistoryItem,
  AttendanceSessionStudentSummary,
  AttendanceSessionSummary,
  ClassroomDetail,
  CreateQrSessionRequest,
  LectureSummary,
} from "@attendease/contracts"

import { teacherWorkflowRoutes } from "./web-workflows-routes"
import { formatCountdown, formatEnum, formatPortalDateTime } from "./web-workflows-shared"
import type {
  QrSessionCreateDraft,
  QrSessionLiveModel,
  QrSessionRosterModel,
  QrSessionShellModel,
  QrSessionShellSection,
} from "./web-workflows-types"

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
