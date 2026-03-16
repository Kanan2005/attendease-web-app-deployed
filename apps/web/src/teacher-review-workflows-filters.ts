import type {
  AttendanceSessionHistoryListQuery,
  ClassroomSummary,
  TeacherReportFilters,
} from "@attendease/contracts"

import {
  buildScopeLabel,
  buildUniqueSortedOptions,
  toIsoEndOfDay,
  toIsoStartOfDay,
} from "./teacher-review-workflows-shared"
import type {
  TeacherWebAcademicFilterOptions,
  TeacherWebHistoryFilterDraft,
  TeacherWebReportFilterDraft,
} from "./teacher-review-workflows-types"

export function createTeacherWebHistoryFilterDraft(): TeacherWebHistoryFilterDraft {
  return {
    classroomId: "",
    classId: "",
    sectionId: "",
    subjectId: "",
    mode: "ALL",
    status: "ALL",
    fromDate: "",
    toDate: "",
  }
}

export function createTeacherWebReportFilterDraft(): TeacherWebReportFilterDraft {
  return {
    classroomId: "",
    classId: "",
    sectionId: "",
    subjectId: "",
    fromDate: "",
    toDate: "",
  }
}

export function buildTeacherWebAcademicFilterOptions(
  classrooms: ClassroomSummary[],
): TeacherWebAcademicFilterOptions {
  return {
    classroomOptions: buildUniqueSortedOptions(
      classrooms.map((classroom) => ({
        value: classroom.id,
        label: `${classroom.displayTitle} (${classroom.code})`,
      })),
    ),
    classOptions: buildUniqueSortedOptions(
      classrooms
        .filter((classroom) => Boolean(classroom.classId))
        .map((classroom) => ({
          value: classroom.classId,
          label: buildScopeLabel(classroom.classCode, classroom.classTitle, "Class"),
        })),
    ),
    sectionOptions: buildUniqueSortedOptions(
      classrooms
        .filter((classroom) => Boolean(classroom.sectionId))
        .map((classroom) => ({
          value: classroom.sectionId,
          label: buildScopeLabel(classroom.sectionCode, classroom.sectionTitle, "Section"),
        })),
    ),
    subjectOptions: buildUniqueSortedOptions(
      classrooms
        .filter((classroom) => Boolean(classroom.subjectId))
        .map((classroom) => ({
          value: classroom.subjectId,
          label: buildScopeLabel(classroom.subjectCode, classroom.subjectTitle, "Subject"),
        })),
    ),
  }
}

export function buildTeacherWebHistoryQueryFilters(
  draft: TeacherWebHistoryFilterDraft,
): AttendanceSessionHistoryListQuery {
  return {
    ...(draft.classroomId ? { classroomId: draft.classroomId } : {}),
    ...(draft.classId ? { classId: draft.classId } : {}),
    ...(draft.sectionId ? { sectionId: draft.sectionId } : {}),
    ...(draft.subjectId ? { subjectId: draft.subjectId } : {}),
    ...(draft.mode !== "ALL" ? { mode: draft.mode } : {}),
    ...(draft.status !== "ALL" ? { status: draft.status } : {}),
    ...(draft.fromDate ? { from: toIsoStartOfDay(draft.fromDate) } : {}),
    ...(draft.toDate ? { to: toIsoEndOfDay(draft.toDate) } : {}),
  }
}

export function buildTeacherWebReportQueryFilters(
  draft: TeacherWebReportFilterDraft,
): TeacherReportFilters {
  return {
    ...(draft.classroomId ? { classroomId: draft.classroomId } : {}),
    ...(draft.classId ? { classId: draft.classId } : {}),
    ...(draft.sectionId ? { sectionId: draft.sectionId } : {}),
    ...(draft.subjectId ? { subjectId: draft.subjectId } : {}),
    ...(draft.fromDate ? { from: toIsoStartOfDay(draft.fromDate) } : {}),
    ...(draft.toDate ? { to: toIsoEndOfDay(draft.toDate) } : {}),
  }
}

export function buildTeacherWebFilterSummary(input: {
  classroom?: string | null
  class?: string | null
  section?: string | null
  subject?: string | null
  fromDate?: string | null
  toDate?: string | null
}): string {
  const scopeSummary = [
    input.classroom ? `Classroom: ${input.classroom}` : "All classrooms",
    input.class ? `Class: ${input.class}` : "All classes",
    input.section ? `Section: ${input.section}` : "All sections",
    input.subject ? `Subject: ${input.subject}` : "All subjects",
  ].join(" · ")
  const dateSummary =
    input.fromDate || input.toDate
      ? `Date range: ${input.fromDate ?? "Any start"} to ${input.toDate ?? "Any end"}`
      : "Any teaching date"

  return `${scopeSummary} · ${dateSummary}`
}
