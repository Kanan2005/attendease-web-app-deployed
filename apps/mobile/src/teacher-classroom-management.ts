import type {
  ClassroomDetail,
  ClassroomSummary,
  CreateClassroomRequest,
  TeacherAssignmentSummary,
  UpdateClassroomRequest,
} from "@attendease/contracts"

export interface TeacherClassroomScopeOption {
  key: string
  assignmentId: string
  semesterId: string
  classId: string
  sectionId: string
  subjectId: string
  title: string
  supportingText: string
}

export interface TeacherClassroomCreateDraft {
  selectedScopeKey: string
  classroomTitle: string
  courseCode: string
}

export interface TeacherClassroomEditDraft {
  classroomTitle: string
  courseCode: string
}

export function buildTeacherClassroomScopeSummary(input: {
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
    input.classTitle ||
    "Classroom"
  const subjectLabel = input.subjectTitle ?? input.subjectCode ?? "Subject"

  return `${semesterLabel} · ${cohortLabel} · ${subjectLabel}`
}

export function buildTeacherClassroomScopeOptions(
  assignments: TeacherAssignmentSummary[],
): TeacherClassroomScopeOption[] {
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
      supportingText: buildTeacherClassroomScopeSummary(assignment),
    }))
    .sort((left, right) => left.title.localeCompare(right.title))
}

export function createTeacherClassroomCreateDraft(
  selectedScopeKey = "",
): TeacherClassroomCreateDraft {
  return {
    selectedScopeKey,
    classroomTitle: "",
    courseCode: "",
  }
}

export function createTeacherClassroomEditDraft(
  classroom: Pick<ClassroomDetail, "displayTitle" | "code">,
): TeacherClassroomEditDraft {
  return {
    classroomTitle: classroom.displayTitle,
    courseCode: classroom.code,
  }
}

export function buildTeacherClassroomCreateRequest(
  scopeOptions: TeacherClassroomScopeOption[],
  draft: TeacherClassroomCreateDraft,
): CreateClassroomRequest {
  const scope = scopeOptions.find((option) => option.key === draft.selectedScopeKey)

  if (!scope) {
    throw new Error("Pick a classroom scope before creating the classroom.")
  }

  return {
    semesterId: scope.semesterId,
    classId: scope.classId,
    sectionId: scope.sectionId,
    subjectId: scope.subjectId,
    classroomTitle: draft.classroomTitle.trim(),
    courseCode: draft.courseCode.trim().toUpperCase(),
  }
}

export function buildTeacherClassroomUpdateRequest(
  classroom: Pick<ClassroomDetail, "displayTitle" | "code">,
  draft: TeacherClassroomEditDraft,
): UpdateClassroomRequest {
  const payload: UpdateClassroomRequest = {}
  const nextTitle = draft.classroomTitle.trim()
  const nextCode = draft.courseCode.trim().toUpperCase()

  if (nextTitle !== classroom.displayTitle) {
    payload.classroomTitle = nextTitle
  }

  if (nextCode !== classroom.code) {
    payload.courseCode = nextCode
  }

  return payload
}

export function hasTeacherClassroomEditChanges(
  classroom: Pick<ClassroomDetail, "displayTitle" | "code">,
  draft: TeacherClassroomEditDraft,
) {
  const payload = buildTeacherClassroomUpdateRequest(classroom, draft)

  return Object.keys(payload).length > 0
}

export function buildTeacherClassroomSupportingText(
  classroom: Pick<
    ClassroomSummary,
    | "courseCode"
    | "code"
    | "semesterCode"
    | "semesterTitle"
    | "classCode"
    | "classTitle"
    | "sectionCode"
    | "sectionTitle"
    | "subjectCode"
    | "subjectTitle"
  >,
) {
  return `Course code ${classroom.courseCode ?? classroom.code} · ${buildTeacherClassroomScopeSummary(
    classroom,
  )}`
}
