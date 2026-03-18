import type { ClassroomSummary, CreateQrSessionRequest } from "@attendease/contracts"

import {
  buildTeacherWebClassroomScopeSummary,
  formatTeacherWebAttendanceModeLabel,
} from "./teacher-classroom-management"

export interface TeacherWebQrSessionClassroomOption {
  classroomId: string
  classroomTitle: string
  courseCode: string
  scopeSummary: string
  attendanceModeLabel: string
  deviceRuleLabel: string
  defaultSessionDurationMinutes: number
  defaultGpsRadiusMeters: number
  anchorLabel: string
}

export interface TeacherWebQrSessionStartDraft {
  classroomId: string
  lectureId: string
  sessionDurationMinutes: string
  gpsRadiusMeters: string
  anchorLatitude: string
  anchorLongitude: string
  anchorLabel: string
}

export interface TeacherWebQrSessionStartReadiness {
  canStart: boolean
  blockingMessage: string | null
}

export function buildTeacherWebQrSessionClassroomOptions(
  classrooms: Array<
    Pick<
      ClassroomSummary,
      | "id"
      | "displayTitle"
      | "classroomTitle"
      | "code"
      | "courseCode"
      | "semesterCode"
      | "semesterTitle"
      | "classCode"
      | "classTitle"
      | "sectionCode"
      | "sectionTitle"
      | "subjectCode"
      | "subjectTitle"
      | "status"
      | "archivedAt"
      | "defaultAttendanceMode"
      | "defaultGpsRadiusMeters"
      | "defaultSessionDurationMinutes"
      | "requiresTrustedDevice"
    >
  >,
): TeacherWebQrSessionClassroomOption[] {
  return classrooms
    .filter(
      (classroom) =>
        (classroom.status === "ACTIVE" || classroom.status === "DRAFT") &&
        classroom.archivedAt === null,
    )
    .map((classroom) => ({
      classroomId: classroom.id,
      classroomTitle: classroom.classroomTitle ?? classroom.displayTitle,
      courseCode: classroom.courseCode ?? classroom.code,
      scopeSummary: buildTeacherWebClassroomScopeSummary(classroom),
      attendanceModeLabel: formatTeacherWebAttendanceModeLabel(classroom.defaultAttendanceMode),
      deviceRuleLabel: classroom.requiresTrustedDevice
        ? "Device registration required for students"
        : "Any signed-in student phone can mark attendance",
      defaultSessionDurationMinutes: classroom.defaultSessionDurationMinutes,
      defaultGpsRadiusMeters: classroom.defaultGpsRadiusMeters,
      anchorLabel: classroom.classroomTitle ?? classroom.displayTitle,
    }))
    .sort((left, right) =>
      `${left.classroomTitle} ${left.courseCode}`.localeCompare(
        `${right.classroomTitle} ${right.courseCode}`,
      ),
    )
}

export function createTeacherWebQrSessionStartDraft(
  classrooms: TeacherWebQrSessionClassroomOption[],
  preferredClassroomId?: string,
  initialLectureId?: string,
): TeacherWebQrSessionStartDraft | null {
  const classroom =
    classrooms.find((entry) => entry.classroomId === preferredClassroomId) ?? classrooms[0] ?? null

  if (!classroom) {
    return null
  }

  return {
    classroomId: classroom.classroomId,
    lectureId: initialLectureId ?? "",
    sessionDurationMinutes: String(classroom.defaultSessionDurationMinutes),
    gpsRadiusMeters: String(classroom.defaultGpsRadiusMeters),
    anchorLatitude: "",
    anchorLongitude: "",
    anchorLabel: classroom.anchorLabel,
  }
}

export function applyTeacherWebQrSessionClassroomSelection(
  classrooms: TeacherWebQrSessionClassroomOption[],
  classroomId: string,
): TeacherWebQrSessionStartDraft {
  const classroom = classrooms.find((entry) => entry.classroomId === classroomId)

  if (!classroom) {
    throw new Error("Choose a QR + GPS classroom before starting attendance.")
  }

  return {
    classroomId: classroom.classroomId,
    lectureId: "",
    sessionDurationMinutes: String(classroom.defaultSessionDurationMinutes),
    gpsRadiusMeters: String(classroom.defaultGpsRadiusMeters),
    anchorLatitude: "",
    anchorLongitude: "",
    anchorLabel: classroom.anchorLabel,
  }
}

export function evaluateTeacherWebQrSessionStartReadiness(
  draft: TeacherWebQrSessionStartDraft | null,
  classrooms: TeacherWebQrSessionClassroomOption[],
): TeacherWebQrSessionStartReadiness {
  if (!draft) {
    return {
      canStart: false,
      blockingMessage: "Choose a classroom to start QR attendance.",
    }
  }

  const classroom = classrooms.find((entry) => entry.classroomId === draft.classroomId)

  if (!classroom) {
    return {
      canStart: false,
      blockingMessage: "Choose a QR + GPS classroom before starting attendance.",
    }
  }

  if (!isPositiveWholeNumber(draft.sessionDurationMinutes)) {
    return {
      canStart: false,
      blockingMessage: "Enter a valid session duration in minutes.",
    }
  }

  if (!isPositiveWholeNumber(draft.gpsRadiusMeters)) {
    return {
      canStart: false,
      blockingMessage: "Enter a valid allowed distance in meters.",
    }
  }

  if (!isLatitude(draft.anchorLatitude) || !isLongitude(draft.anchorLongitude)) {
    return {
      canStart: false,
      blockingMessage: "Use browser location before starting the session.",
    }
  }

  return {
    canStart: true,
    blockingMessage: null,
  }
}

export function buildTeacherWebQrSessionStartRequest(
  draft: TeacherWebQrSessionStartDraft,
): CreateQrSessionRequest {
  return {
    classroomId: draft.classroomId,
    ...(draft.lectureId.trim() ? { lectureId: draft.lectureId.trim() } : {}),
    sessionDurationMinutes: Number(draft.sessionDurationMinutes),
    gpsRadiusMeters: Number(draft.gpsRadiusMeters),
    anchorType: "TEACHER_SELECTED",
    anchorLatitude: Number(draft.anchorLatitude),
    anchorLongitude: Number(draft.anchorLongitude),
    ...(draft.anchorLabel.trim() ? { anchorLabel: draft.anchorLabel.trim() } : {}),
  }
}

function isPositiveWholeNumber(value: string) {
  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed > 0
}

function isLatitude(value: string) {
  if (!value.trim()) {
    return false
  }

  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed >= -90 && parsed <= 90
}

function isLongitude(value: string) {
  if (!value.trim()) {
    return false
  }

  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed >= -180 && parsed <= 180
}
