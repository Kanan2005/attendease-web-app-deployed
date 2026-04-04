import type { ClassroomRosterListQuery } from "@attendease/contracts"
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query"

import { getMobileAttendanceListPollInterval } from "../attendance-live"
import {
  buildTeacherDashboardModel,
  buildTeacherRecentSessionTimeline,
  buildTeacherSessionHistoryPreview,
} from "../teacher-models"
import { teacherQueryKeys } from "../teacher-query"
import { useTeacherSession } from "../teacher-session"
import { authClient } from "./queries-shared"

import { getTeacherAccessToken } from "../teacher-session"

export function useTeacherMeQuery() {
  const { session } = useTeacherSession()

  return useQuery({
    queryKey: teacherQueryKeys.me(),
    enabled: Boolean(session),
    queryFn: async () => authClient.me(getTeacherAccessToken(session)),
  })
}

/** Fetches the full profile (includes department, designation, employeeCode). */
export function useTeacherProfileQuery() {
  const { session } = useTeacherSession()

  return useQuery({
    queryKey: teacherQueryKeys.profile(),
    enabled: Boolean(session),
    queryFn: async () => authClient.getProfile(getTeacherAccessToken(session)),
  })
}

export function useTeacherAssignmentsQuery() {
  const { session } = useTeacherSession()

  return useQuery({
    queryKey: teacherQueryKeys.assignments(),
    enabled: Boolean(session),
    queryFn: async () => authClient.listMyAssignments(getTeacherAccessToken(session)),
  })
}

export function useTeacherClassroomsQuery() {
  const { session } = useTeacherSession()

  return useQuery({
    queryKey: teacherQueryKeys.classrooms(),
    enabled: Boolean(session),
    queryFn: async () => authClient.listClassrooms(getTeacherAccessToken(session)),
  })
}

export function useTeacherClassroomDetailQuery(classroomId: string) {
  const { session } = useTeacherSession()

  return useQuery({
    queryKey: teacherQueryKeys.classroomDetail(classroomId),
    enabled: Boolean(session && classroomId),
    queryFn: async () => authClient.getClassroom(getTeacherAccessToken(session), classroomId),
  })
}

export function useTeacherClassroomRosterQuery(
  classroomId: string,
  filters: ClassroomRosterListQuery = {},
) {
  const { session } = useTeacherSession()

  return useQuery({
    queryKey: teacherQueryKeys.classroomRoster(classroomId, filters),
    enabled: Boolean(session && classroomId),
    queryFn: async () =>
      authClient.listClassroomRoster(getTeacherAccessToken(session), classroomId, filters),
  })
}

export function useTeacherClassroomScheduleQuery(classroomId: string) {
  const { session } = useTeacherSession()

  return useQuery({
    queryKey: teacherQueryKeys.classroomSchedule(classroomId),
    enabled: Boolean(session && classroomId),
    queryFn: async () =>
      authClient.getClassroomSchedule(getTeacherAccessToken(session), classroomId),
  })
}

export function useTeacherClassroomAnnouncementsQuery(classroomId: string, limit = 20) {
  const { session } = useTeacherSession()

  return useQuery({
    queryKey: teacherQueryKeys.classroomAnnouncements(classroomId),
    enabled: Boolean(session && classroomId),
    queryFn: async () =>
      authClient.listClassroomAnnouncements(getTeacherAccessToken(session), classroomId, {
        limit,
      }),
  })
}

export function useTeacherClassroomLecturesQuery(classroomId: string) {
  const { session } = useTeacherSession()

  return useQuery({
    queryKey: teacherQueryKeys.classroomLectures(classroomId),
    enabled: Boolean(session && classroomId),
    queryFn: async () =>
      authClient.listClassroomLectures(getTeacherAccessToken(session), classroomId),
  })
}

export function useTeacherClassroomRosterImportsQuery(classroomId: string) {
  const { session } = useTeacherSession()

  return useQuery({
    queryKey: teacherQueryKeys.classroomRosterImports(classroomId),
    enabled: Boolean(session && classroomId),
    queryFn: async () =>
      authClient.listRosterImportJobs(getTeacherAccessToken(session), classroomId),
  })
}

export function useTeacherLectureSets(
  classrooms: ReturnType<typeof useTeacherClassroomsQuery>["data"],
  limit?: number,
) {
  const { session } = useTeacherSession()
  const scopedClassrooms = (classrooms ?? []).filter((classroom) => classroom.status !== "ARCHIVED")
  const lectureQueries = useQueries({
    queries: scopedClassrooms.slice(0, limit ?? scopedClassrooms.length).map((classroom) => ({
      queryKey: teacherQueryKeys.classroomLectures(classroom.id),
      enabled: Boolean(session && classroom.id),
      queryFn: async () =>
        authClient.listClassroomLectures(getTeacherAccessToken(session), classroom.id),
    })),
  })

  return {
    scopedClassrooms,
    lectureSets: lectureQueries.flatMap((query, index) =>
      query.data
        ? [
            {
              classroomId: scopedClassrooms[index]?.id ?? "",
              lectures: query.data,
            },
          ]
        : [],
    ),
    isLoading: lectureQueries.some((query) => query.isLoading),
    error: lectureQueries.find((query) => query.error)?.error ?? null,
  }
}

export function useTeacherRecentSessionTimeline(
  classrooms: ReturnType<typeof useTeacherClassroomsQuery>["data"],
) {
  const lectureSets = useTeacherLectureSets(classrooms, 6)

  return {
    recentSessions: buildTeacherRecentSessionTimeline({
      classrooms: lectureSets.scopedClassrooms,
      lectureSets: lectureSets.lectureSets,
    }),
    isLoading: lectureSets.isLoading,
    error: lectureSets.error,
  }
}

export function useTeacherDashboardData() {
  const meQuery = useTeacherMeQuery()
  const assignmentsQuery = useTeacherAssignmentsQuery()
  const classroomsQuery = useTeacherClassroomsQuery()
  const sessionsQuery = useTeacherAttendanceSessionsQuery()

  return {
    meQuery,
    assignmentsQuery,
    classroomsQuery,
    sessionsQuery,
    model: buildTeacherDashboardModel({
      me: meQuery.data ?? null,
      assignments: assignmentsQuery.data ?? [],
      classrooms: classroomsQuery.data ?? [],
      recentSessions: buildTeacherSessionHistoryPreview({
        sessions: sessionsQuery.data ?? [],
      }),
    }),
  }
}

export function useTeacherClassroomDetailData(classroomId: string) {
  const detailQuery = useTeacherClassroomDetailQuery(classroomId)
  const rosterQuery = useTeacherClassroomRosterQuery(classroomId)
  const scheduleQuery = useTeacherClassroomScheduleQuery(classroomId)
  const announcementsQuery = useTeacherClassroomAnnouncementsQuery(classroomId, 12)
  const lecturesQuery = useTeacherClassroomLecturesQuery(classroomId)
  const rosterImportsQuery = useTeacherClassroomRosterImportsQuery(classroomId)

  return {
    detailQuery,
    rosterQuery,
    scheduleQuery,
    announcementsQuery,
    lecturesQuery,
    rosterImportsQuery,
  }
}

export function useTeacherAttendanceSessionsQuery() {
  const { session } = useTeacherSession()

  return useQuery({
    queryKey: teacherQueryKeys.sessionHistory(),
    enabled: Boolean(session),
    queryFn: async () => authClient.listAttendanceSessions(getTeacherAccessToken(session)),
    refetchInterval: (query) => getMobileAttendanceListPollInterval(query.state.data ?? null),
  })
}

/** Mutation to update the teacher's profile (display name, department, etc.). */
export function useTeacherUpdateProfileMutation() {
  const { session } = useTeacherSession()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      displayName?: string
      department?: string | null
      designation?: string | null
      employeeCode?: string | null
    }) => authClient.updateProfile(getTeacherAccessToken(session), payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: teacherQueryKeys.me() })
      void queryClient.invalidateQueries({ queryKey: teacherQueryKeys.profile() })
    },
  })
}
