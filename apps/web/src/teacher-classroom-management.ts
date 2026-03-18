import type {
  AttendanceMode,
  ClassroomDetail,
  ClassroomSummary,
  CreateClassroomRequest,
  TeacherAssignmentSummary,
  UpdateClassroomRequest,
} from "@attendease/contracts"

export interface TeacherWebClassroomScopeOption {
  key: string
  assignmentId: string
  semesterId: string
  classId: string
  sectionId: string
  subjectId: string
  title: string
  supportingText: string
}

export const CLASSROOM_DEGREE_OPTIONS = [
  { value: "B.Tech", label: "B.Tech" },
  { value: "M.Tech", label: "M.Tech" },
] as const

export const CLASSROOM_SEMESTER_OPTIONS = Array.from({ length: 8 }, (_, i) => ({
  value: String(i + 1),
  label: `Semester ${i + 1}`,
}))

export const CLASSROOM_STREAM_OPTIONS = [
  { value: "CSE", label: "CSE" },
  { value: "ECE", label: "ECE" },
  { value: "EE", label: "EE" },
  { value: "ME", label: "ME" },
  { value: "CHEM", label: "CHEM" },
  { value: "META", label: "META" },
  { value: "CIVIL", label: "CIVIL" },
  { value: "Multiple", label: "Multiple" },
] as const

export function buildClassroomMetaLabel(meta: {
  degree?: string | null | undefined
  streamLabel?: string | null | undefined
  semesterLabel?: string | null | undefined
}): string | null {
  const parts = [meta.degree, meta.streamLabel, meta.semesterLabel].filter(Boolean)
  return parts.length > 0 ? parts.join(" · ") : null
}

export interface TeacherWebClassroomCreateDraft {
  selectedScopeKey: string
  classroomTitle: string
  courseCode: string
  degree: string
  semester: string
  stream: string
  defaultAttendanceMode: AttendanceMode
  defaultGpsRadiusMeters: string
  defaultSessionDurationMinutes: string
  timezone: string
  requiresTrustedDevice: boolean
}

export interface TeacherWebClassroomEditDraft {
  classroomTitle: string
  courseCode: string
  defaultAttendanceMode: AttendanceMode
  defaultGpsRadiusMeters: string
  defaultSessionDurationMinutes: string
  timezone: string
  requiresTrustedDevice: boolean
}

export interface TeacherWebClassroomListCard {
  classroomId: string
  classroomTitle: string
  courseCode: string
  scopeSummary: string
  statusLabel: string
  joinCodeLabel: string
  attendanceModeLabel: string
  deviceRuleLabel: string
  canEdit: boolean
  canArchive: boolean
}

export function buildTeacherWebClassroomScopeSummary(input: {
  semesterCode?: string | null | undefined
  semesterTitle?: string | null | undefined
  classCode?: string | null | undefined
  classTitle?: string | null | undefined
  sectionCode?: string | null | undefined
  sectionTitle?: string | null | undefined
  subjectCode?: string | null | undefined
  subjectTitle?: string | null | undefined
}) {
  const semesterLabel = input.semesterTitle ?? input.semesterCode ?? "Semester"
  const cohortLabel =
    [input.classCode, input.sectionCode].filter(Boolean).join(" ") ||
    [input.classTitle, input.sectionTitle].filter(Boolean).join(" ") ||
    "Classroom"
  const subjectLabel = input.subjectTitle ?? input.subjectCode ?? "Subject"

  return `${semesterLabel} · ${cohortLabel} · ${subjectLabel}`
}

export function buildTeacherWebClassroomScopeOptions(
  assignments: TeacherAssignmentSummary[],
): TeacherWebClassroomScopeOption[] {
  return assignments
    .filter((assignment) => assignment.canSelfCreateCourseOffering)
    .map((assignment) => ({
      key: assignment.id,
      assignmentId: assignment.id,
      semesterId: assignment.semesterId,
      classId: assignment.classId,
      sectionId: assignment.sectionId,
      subjectId: assignment.subjectId,
      title: `${assignment.subjectTitle ?? assignment.subjectCode ?? "Subject"} · ${[
        assignment.classCode ?? assignment.classTitle ?? assignment.classId,
        assignment.sectionCode ?? assignment.sectionTitle ?? assignment.sectionId,
      ]
        .filter(Boolean)
        .join(" ")}`.trim(),
      supportingText: buildTeacherWebClassroomScopeSummary(assignment),
    }))
    .sort((left, right) => left.title.localeCompare(right.title))
}

export function createTeacherWebClassroomCreateDraft(
  selectedScopeKey = "",
): TeacherWebClassroomCreateDraft {
  return {
    selectedScopeKey,
    classroomTitle: "",
    courseCode: "",
    degree: "B.Tech",
    semester: "6",
    stream: "CSE",
    defaultAttendanceMode: "QR_GPS",
    defaultGpsRadiusMeters: "100",
    defaultSessionDurationMinutes: "15",
    timezone: "Asia/Kolkata",
    requiresTrustedDevice: true,
  }
}

export function createTeacherWebClassroomEditDraft(
  classroom: Pick<
    ClassroomDetail,
    | "displayTitle"
    | "classroomTitle"
    | "code"
    | "courseCode"
    | "defaultAttendanceMode"
    | "defaultGpsRadiusMeters"
    | "defaultSessionDurationMinutes"
    | "timezone"
    | "requiresTrustedDevice"
  >,
): TeacherWebClassroomEditDraft {
  return {
    classroomTitle: classroom.classroomTitle ?? classroom.displayTitle,
    courseCode: classroom.courseCode ?? classroom.code,
    defaultAttendanceMode: classroom.defaultAttendanceMode,
    defaultGpsRadiusMeters: String(classroom.defaultGpsRadiusMeters),
    defaultSessionDurationMinutes: String(classroom.defaultSessionDurationMinutes),
    timezone: classroom.timezone,
    requiresTrustedDevice: classroom.requiresTrustedDevice,
  }
}

export function buildTeacherWebClassroomCreateRequest(
  scopeOptions: TeacherWebClassroomScopeOption[],
  draft: TeacherWebClassroomCreateDraft,
): CreateClassroomRequest {
  const scope = scopeOptions.find((option) => option.key === draft.selectedScopeKey)

  if (!scope) {
    throw new Error("Pick a teaching scope before creating the classroom.")
  }

  return {
    semesterId: scope.semesterId,
    classId: scope.classId,
    sectionId: scope.sectionId,
    subjectId: scope.subjectId,
    classroomTitle: draft.classroomTitle.trim(),
    courseCode: draft.courseCode.trim().toUpperCase(),
    degree: draft.degree,
    semesterLabel: `Semester ${draft.semester}`,
    streamLabel: draft.stream,
    defaultAttendanceMode: draft.defaultAttendanceMode,
    defaultGpsRadiusMeters: Number(draft.defaultGpsRadiusMeters),
    defaultSessionDurationMinutes: Number(draft.defaultSessionDurationMinutes),
    timezone: draft.timezone.trim(),
    requiresTrustedDevice: draft.requiresTrustedDevice,
  }
}

export function buildTeacherWebClassroomUpdateRequest(
  classroom: Pick<
    ClassroomDetail,
    | "displayTitle"
    | "classroomTitle"
    | "code"
    | "courseCode"
    | "defaultAttendanceMode"
    | "defaultGpsRadiusMeters"
    | "defaultSessionDurationMinutes"
    | "timezone"
    | "requiresTrustedDevice"
  >,
  draft: TeacherWebClassroomEditDraft,
): UpdateClassroomRequest {
  const payload: UpdateClassroomRequest = {}
  const currentTitle = classroom.classroomTitle ?? classroom.displayTitle
  const currentCode = classroom.courseCode ?? classroom.code
  const nextTitle = draft.classroomTitle.trim()
  const nextCode = draft.courseCode.trim().toUpperCase()
  const nextGpsRadius = Number(draft.defaultGpsRadiusMeters)
  const nextDuration = Number(draft.defaultSessionDurationMinutes)
  const nextTimezone = draft.timezone.trim()

  if (nextTitle !== currentTitle) {
    payload.classroomTitle = nextTitle
  }

  if (nextCode !== currentCode) {
    payload.courseCode = nextCode
  }

  if (draft.defaultAttendanceMode !== classroom.defaultAttendanceMode) {
    payload.defaultAttendanceMode = draft.defaultAttendanceMode
  }

  if (nextGpsRadius !== classroom.defaultGpsRadiusMeters) {
    payload.defaultGpsRadiusMeters = nextGpsRadius
  }

  if (nextDuration !== classroom.defaultSessionDurationMinutes) {
    payload.defaultSessionDurationMinutes = nextDuration
  }

  if (nextTimezone !== classroom.timezone) {
    payload.timezone = nextTimezone
  }

  if (draft.requiresTrustedDevice !== classroom.requiresTrustedDevice) {
    payload.requiresTrustedDevice = draft.requiresTrustedDevice
  }

  return payload
}

export function hasTeacherWebClassroomEditChanges(
  classroom: Pick<
    ClassroomDetail,
    | "displayTitle"
    | "classroomTitle"
    | "code"
    | "courseCode"
    | "defaultAttendanceMode"
    | "defaultGpsRadiusMeters"
    | "defaultSessionDurationMinutes"
    | "timezone"
    | "requiresTrustedDevice"
  >,
  draft: TeacherWebClassroomEditDraft,
) {
  return Object.keys(buildTeacherWebClassroomUpdateRequest(classroom, draft)).length > 0
}

export function buildTeacherWebClassroomListCards(
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
      | "activeJoinCode"
      | "defaultAttendanceMode"
      | "requiresTrustedDevice"
      | "permissions"
      | "degree"
      | "semesterLabel"
      | "streamLabel"
    >
  >,
): TeacherWebClassroomListCard[] {
  return classrooms.map((classroom) => {
    const title = classroom.classroomTitle ?? classroom.displayTitle
    const metaLabel = buildClassroomMetaLabel({
      degree: classroom.degree,
      semesterLabel: classroom.semesterLabel,
      streamLabel: classroom.streamLabel,
    })
    const scopeFallback = buildTeacherWebClassroomScopeSummary(classroom)

    return {
      classroomId: classroom.id,
      classroomTitle: title,
      courseCode: classroom.courseCode ?? classroom.code,
      scopeSummary: metaLabel ?? scopeFallback,
      statusLabel: classroom.status,
      joinCodeLabel: classroom.activeJoinCode?.code ?? "No active join code",
      attendanceModeLabel: formatTeacherWebAttendanceModeLabel(classroom.defaultAttendanceMode),
      deviceRuleLabel: classroom.requiresTrustedDevice
        ? "Device registration required"
        : "Any signed-in student phone",
      canEdit: classroom.permissions?.canEdit ?? true,
      canArchive: classroom.permissions?.canArchive ?? false,
    }
  })
}

export function formatTeacherWebAttendanceModeLabel(mode: AttendanceMode) {
  switch (mode) {
    case "QR_GPS":
      return "QR + GPS"
    case "BLUETOOTH":
      return "Bluetooth"
    case "MANUAL":
      return "Manual"
    default:
      return mode
  }
}
