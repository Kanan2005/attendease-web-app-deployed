import { AuthApiClientError } from "@attendease/auth"
import type { LectureSummary, StudentClassroomMembershipSummary } from "@attendease/contracts"

export type CardTone = "primary" | "success" | "warning" | "danger"

export interface StudentDashboardCard {
  label: string
  value: string
  tone: CardTone
}

export type StudentDashboardActionKind =
  | "ATTENDANCE"
  | "CLASSROOM"
  | "DEVICE_STATUS"
  | "JOIN_CLASSROOM"
  | "REPORTS"

export interface StudentDashboardActionModel {
  kind: StudentDashboardActionKind
  label: string
  classroomId?: string
}

export interface StudentDashboardSpotlightModel {
  title: string
  message: string
  tone: CardTone
  primaryAction: StudentDashboardActionModel
  secondaryAction?: StudentDashboardActionModel
}

export interface StudentDashboardClassroomHighlight {
  classroomId: string
  title: string
  supportingText: string
  tone: CardTone
}

export interface StudentLectureTimelineItem {
  id: string
  classroomId: string
  classroomTitle: string
  title: string
  status: LectureSummary["status"]
  timestamp: string
}

export interface StudentDashboardModel {
  greeting: string
  summaryCards: StudentDashboardCard[]
  spotlight: StudentDashboardSpotlightModel
  classroomHighlights: StudentDashboardClassroomHighlight[]
  recentTimeline: StudentLectureTimelineItem[]
}

export function mapStudentApiErrorToMessage(error: unknown): string {
  if (error instanceof AuthApiClientError) {
    const detailMessage = extractApiErrorMessage(error.details)

    switch (error.status) {
      case 401:
        return "Your student session expired. Sign in again to refresh the mobile dashboard."
      case 403:
        return detailMessage ?? "This student action is blocked by classroom or device policy."
      case 404:
        return detailMessage ?? "The requested classroom data is no longer available."
      case 409:
        return detailMessage ?? "This classroom is already linked to the current student account."
      default:
        return detailMessage ?? "AttendEase could not complete the student request."
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return "AttendEase hit an unexpected mobile error."
}

export function buildStudentLectureTimeline(input: {
  classrooms: StudentClassroomMembershipSummary[]
  lectureSets: Array<{ classroomId: string; lectures: LectureSummary[] }>
  limit?: number
}): StudentLectureTimelineItem[] {
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
        timestamp: lecture.actualStartAt ?? lecture.plannedStartAt ?? lecture.lectureDate,
      })),
    )
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .slice(0, input.limit ?? 6)
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
