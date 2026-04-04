import type { ClassroomRosterListQuery, TeacherReportFilters } from "@attendease/contracts"
import type { QueryClient } from "@tanstack/react-query"
import { useQueryClient } from "@tanstack/react-query"

function normalizeTeacherReportFilters(filters: TeacherReportFilters = {}) {
  return {
    ...(filters.classroomId ? { classroomId: filters.classroomId } : {}),
    ...(filters.classId ? { classId: filters.classId } : {}),
    ...(filters.sectionId ? { sectionId: filters.sectionId } : {}),
    ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.to ? { to: filters.to } : {}),
  }
}

function normalizeTeacherRosterFilters(filters: ClassroomRosterListQuery = {}) {
  return {
    ...(filters.membershipStatus ? { membershipStatus: filters.membershipStatus } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search ? { search: filters.search } : {}),
  }
}

export const teacherQueryKeys = {
  all: ["teacher"] as const,
  me: () => [...teacherQueryKeys.all, "me"] as const,
  profile: () => [...teacherQueryKeys.all, "profile"] as const,
  assignments: () => [...teacherQueryKeys.all, "assignments"] as const,
  classrooms: () => [...teacherQueryKeys.all, "classrooms"] as const,
  dashboardRecentActivity: () => [...teacherQueryKeys.all, "dashboard", "recent-activity"] as const,
  bluetoothCandidates: () => [...teacherQueryKeys.all, "bluetooth", "candidates"] as const,
  bluetoothRuntime: (sessionId: string) =>
    [...teacherQueryKeys.all, "bluetooth", "runtime", sessionId] as const,
  bluetoothSession: (sessionId: string) =>
    [...teacherQueryKeys.all, "bluetooth", "session", sessionId] as const,
  sessionHistory: () => [...teacherQueryKeys.all, "sessions", "history"] as const,
  sessionDetail: (sessionId: string) =>
    [...teacherQueryKeys.all, "sessions", "detail", sessionId] as const,
  sessionStudents: (sessionId: string) =>
    [...teacherQueryKeys.all, "sessions", "students", sessionId] as const,
  reports: () => [...teacherQueryKeys.all, "reports"] as const,
  reportsOverview: () => [...teacherQueryKeys.reports(), "overview"] as const,
  reportDaywise: (filters: TeacherReportFilters = {}) =>
    [...teacherQueryKeys.reports(), "daywise", normalizeTeacherReportFilters(filters)] as const,
  reportSubjectwise: (filters: TeacherReportFilters = {}) =>
    [...teacherQueryKeys.reports(), "subjectwise", normalizeTeacherReportFilters(filters)] as const,
  reportStudentPercentages: (filters: TeacherReportFilters = {}) =>
    [
      ...teacherQueryKeys.reports(),
      "students",
      "percentages",
      normalizeTeacherReportFilters(filters),
    ] as const,
  exportsAvailability: () => [...teacherQueryKeys.all, "exports", "availability"] as const,
  exportJobs: () => [...teacherQueryKeys.all, "exports", "jobs"] as const,
  classroomDetail: (classroomId: string) =>
    [...teacherQueryKeys.all, "classrooms", classroomId, "detail"] as const,
  classroomRoster: (classroomId: string, filters: ClassroomRosterListQuery = {}) =>
    [
      ...teacherQueryKeys.all,
      "classrooms",
      classroomId,
      "roster",
      normalizeTeacherRosterFilters(filters),
    ] as const,
  classroomSchedule: (classroomId: string) =>
    [...teacherQueryKeys.all, "classrooms", classroomId, "schedule"] as const,
  classroomAnnouncements: (classroomId: string) =>
    [...teacherQueryKeys.all, "classrooms", classroomId, "announcements"] as const,
  classroomLectures: (classroomId: string) =>
    [...teacherQueryKeys.all, "classrooms", classroomId, "lectures"] as const,
  classroomRosterImports: (classroomId: string) =>
    [...teacherQueryKeys.all, "classrooms", classroomId, "roster-imports"] as const,
} as const

export function buildTeacherInvalidationKeys(
  input: {
    classroomId?: string
    sessionId?: string
  } = {},
) {
  const keys: Array<readonly unknown[]> = [
    teacherQueryKeys.me(),
    teacherQueryKeys.assignments(),
    teacherQueryKeys.classrooms(),
    teacherQueryKeys.dashboardRecentActivity(),
    teacherQueryKeys.bluetoothCandidates(),
    teacherQueryKeys.sessionHistory(),
    teacherQueryKeys.reports(),
    teacherQueryKeys.exportsAvailability(),
    teacherQueryKeys.exportJobs(),
  ]

  if (input.classroomId) {
    keys.push(
      teacherQueryKeys.classroomDetail(input.classroomId),
      teacherQueryKeys.classroomRoster(input.classroomId),
      teacherQueryKeys.classroomSchedule(input.classroomId),
      teacherQueryKeys.classroomAnnouncements(input.classroomId),
      teacherQueryKeys.classroomLectures(input.classroomId),
      teacherQueryKeys.classroomRosterImports(input.classroomId),
    )
  }

  if (input.sessionId) {
    keys.push(
      teacherQueryKeys.bluetoothRuntime(input.sessionId),
      teacherQueryKeys.bluetoothSession(input.sessionId),
      teacherQueryKeys.sessionDetail(input.sessionId),
      teacherQueryKeys.sessionStudents(input.sessionId),
    )
  }

  return keys
}

export async function invalidateTeacherExperienceQueries(
  queryClient: Pick<QueryClient, "invalidateQueries">,
  input: {
    classroomId?: string
    sessionId?: string
  } = {},
) {
  for (const queryKey of buildTeacherInvalidationKeys(input)) {
    await queryClient.invalidateQueries({
      queryKey,
    })
  }
}

export function useTeacherRefreshAction(
  input: {
    classroomId?: string
    sessionId?: string
  } = {},
) {
  const queryClient = useQueryClient()

  return async () =>
    invalidateTeacherExperienceQueries(queryClient, {
      ...(input.classroomId ? { classroomId: input.classroomId } : {}),
      ...(input.sessionId ? { sessionId: input.sessionId } : {}),
    })
}
