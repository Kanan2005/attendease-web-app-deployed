import { createAuthApiClient } from "@attendease/auth"
import { loadMobileEnv } from "@attendease/config"
import type {
  AttendanceSessionDetail,
  AttendanceSessionStudentSummary,
  ClassroomDetail,
  ClassroomRosterListQuery,
  ClassroomRosterMemberSummary,
  ExportJobType,
  LectureSummary,
  TeacherReportFilters,
} from "@attendease/contracts"
import {
  buildAttendanceCorrectionSaveMessage,
  buildAttendanceEditChanges,
  createAttendanceEditDraft,
  getAttendanceCorrectionReviewPollInterval,
  updateAttendanceEditDraft,
} from "@attendease/domain"
import { mobileTheme } from "@attendease/ui-mobile"
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"

import { buildTeacherSchedulingPreview } from "../academic-management"
import {
  getMobileAttendanceListPollInterval,
  getMobileAttendanceSessionPollInterval,
} from "../attendance-live"
import {
  useTeacherBluetoothAdvertiser,
  useTeacherBluetoothRuntime,
  useTeacherBluetoothSessionCreateMutation,
  useTeacherBluetoothSessionQuery,
} from "../bluetooth-attendance"
import { buildTeacherRosterImportPreview } from "../classroom-communications"
import { mobileEntryRoutes } from "../mobile-entry-models"
import {
  buildTeacherClassroomCreateRequest,
  buildTeacherClassroomScopeOptions,
  buildTeacherClassroomScopeSummary,
  buildTeacherClassroomSupportingText,
  buildTeacherClassroomUpdateRequest,
  createTeacherClassroomCreateDraft,
  createTeacherClassroomEditDraft,
  hasTeacherClassroomEditChanges,
} from "../teacher-classroom-management"
import {
  type TeacherCardTone,
  type TeacherDashboardActionModel,
  buildTeacherDashboardModel,
  buildTeacherRecentSessionTimeline,
  buildTeacherSessionHistoryPreview,
  mapTeacherApiErrorToMessage,
} from "../teacher-models"
import {
  type TeacherSessionRosterRowModel,
  buildTeacherBluetoothActiveStatusModel,
  buildTeacherBluetoothCandidates,
  buildTeacherBluetoothControlModel,
  buildTeacherBluetoothEndSessionModel,
  buildTeacherBluetoothRecoveryModel,
  buildTeacherBluetoothSessionShellSnapshot,
  buildTeacherBluetoothSetupStatusModel,
  buildTeacherExportAvailabilityModel,
  buildTeacherExportRequestModel,
  buildTeacherJoinCodeActionModel,
  buildTeacherReportFilterOptions,
  buildTeacherReportOverviewModel,
  buildTeacherRosterImportDraftModel,
  buildTeacherSessionDetailOverviewModel,
  buildTeacherSessionDetailStatusModel,
  buildTeacherSessionRosterModel,
} from "../teacher-operational"
import {
  buildTeacherInvalidationKeys,
  invalidateTeacherExperienceQueries,
  teacherQueryKeys,
} from "../teacher-query"
import {
  type TeacherRosterStatusFilter,
  buildTeacherRosterAddRequest,
  buildTeacherRosterFilters,
  buildTeacherRosterMemberActions,
  buildTeacherRosterMemberIdentityText,
  buildTeacherRosterResultSummary,
  teacherRosterStatusFilters,
} from "../teacher-roster-management"
import { teacherRoutes } from "../teacher-routes"
import {
  type TeacherScheduleDraft,
  addTeacherScheduleExceptionDraft,
  addTeacherWeeklySlotDraft,
  buildTeacherScheduleSaveRequest,
  createTeacherScheduleDraft,
  removeTeacherWeeklySlotDraft,
  updateTeacherScheduleExceptionDraft,
  updateTeacherWeeklySlotDraft,
} from "../teacher-schedule-draft"
import {
  buildTeacherLoginRequest,
  getTeacherAccessToken,
  useTeacherSession,
} from "../teacher-session"
import {
  buildTeacherClassroomsStatus,
  buildTeacherDashboardStatus,
  buildTeacherReportsStatus,
  buildTeacherRosterStatus,
  buildTeacherSessionHistoryStatus,
} from "../teacher-view-state"

const env = loadMobileEnv(process.env as Record<string, string | undefined>)
const authClient = createAuthApiClient({
  baseUrl: env.EXPO_PUBLIC_API_URL,
})

export { buildTeacherInvalidationKeys, buildTeacherLoginRequest }

export function useTeacherMeQuery() {
  const { session } = useTeacherSession()

  return useQuery({
    queryKey: teacherQueryKeys.me(),
    enabled: Boolean(session),
    queryFn: async () => authClient.me(getTeacherAccessToken(session)),
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

function useTeacherLectureSets(
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

export function useTeacherCreateClassroomMutation() {
  const queryClient = useQueryClient()
  const { session } = useTeacherSession()

  return useMutation({
    mutationFn: async (payload: Parameters<typeof authClient.createClassroom>[1]) =>
      authClient.createClassroom(getTeacherAccessToken(session), payload),
    onSuccess: async (created) => {
      await invalidateTeacherExperienceQueries(queryClient, {
        classroomId: created.id,
      })
    },
  })
}

export function useTeacherUpdateClassroomMutation(classroomId: string) {
  const queryClient = useQueryClient()
  const { session } = useTeacherSession()

  return useMutation({
    mutationFn: async (payload: Parameters<typeof authClient.updateClassroom>[2]) =>
      authClient.updateClassroom(getTeacherAccessToken(session), classroomId, payload),
    onSuccess: async () => {
      await invalidateTeacherExperienceQueries(queryClient, {
        classroomId,
      })
    },
  })
}

export function useTeacherArchiveClassroomMutation(classroomId: string) {
  const queryClient = useQueryClient()
  const { session } = useTeacherSession()

  return useMutation({
    mutationFn: async () =>
      authClient.archiveClassroom(getTeacherAccessToken(session), classroomId),
    onSuccess: async () => {
      await invalidateTeacherExperienceQueries(queryClient, {
        classroomId,
      })
    },
  })
}

export function useTeacherResetJoinCodeMutation(classroomId: string) {
  const queryClient = useQueryClient()
  const { session } = useTeacherSession()

  return useMutation({
    mutationFn: async () =>
      authClient.resetClassroomJoinCode(getTeacherAccessToken(session), classroomId, {}),
    onSuccess: async () => {
      await invalidateTeacherExperienceQueries(queryClient, {
        classroomId,
      })
    },
  })
}

export function useTeacherCreateAnnouncementMutation(classroomId: string) {
  const queryClient = useQueryClient()
  const { session } = useTeacherSession()

  return useMutation({
    mutationFn: async (payload: {
      title?: string
      body: string
      visibility: "TEACHER_ONLY" | "STUDENT_AND_TEACHER"
      shouldNotify: boolean
    }) =>
      authClient.createClassroomAnnouncement(getTeacherAccessToken(session), classroomId, {
        title: payload.title?.trim() ? payload.title : null,
        body: payload.body,
        visibility: payload.visibility,
        shouldNotify: payload.shouldNotify,
      }),
    onSuccess: async () => {
      await invalidateTeacherExperienceQueries(queryClient, {
        classroomId,
      })
    },
  })
}

export function useTeacherCreateLectureMutation(classroomId: string) {
  const queryClient = useQueryClient()
  const { session } = useTeacherSession()

  return useMutation({
    mutationFn: async (payload: {
      title?: string
      lectureDate: string
      plannedStartAt?: string
      plannedEndAt?: string
    }) =>
      authClient.createClassroomLecture(getTeacherAccessToken(session), classroomId, {
        title: payload.title?.trim() ? payload.title : undefined,
        lectureDate: payload.lectureDate,
        ...(payload.plannedStartAt ? { plannedStartAt: payload.plannedStartAt } : {}),
        ...(payload.plannedEndAt ? { plannedEndAt: payload.plannedEndAt } : {}),
      }),
    onSuccess: async () => {
      await invalidateTeacherExperienceQueries(queryClient, {
        classroomId,
      })
    },
  })
}

export function useTeacherUpdateRosterMemberMutation(classroomId: string) {
  const queryClient = useQueryClient()
  const { session } = useTeacherSession()

  return useMutation({
    mutationFn: async (payload: {
      enrollmentId: string
      membershipStatus: ClassroomRosterMemberSummary["membershipState"]
    }) =>
      authClient.updateClassroomStudent(
        getTeacherAccessToken(session),
        classroomId,
        payload.enrollmentId,
        {
          membershipStatus: payload.membershipStatus,
        },
      ),
    onSuccess: async () => {
      await invalidateTeacherExperienceQueries(queryClient, {
        classroomId,
      })
    },
  })
}

export function useTeacherAddRosterMemberMutation(classroomId: string) {
  const queryClient = useQueryClient()
  const { session } = useTeacherSession()

  return useMutation({
    mutationFn: async (payload: Parameters<typeof authClient.addClassroomStudent>[2]) =>
      authClient.addClassroomStudent(getTeacherAccessToken(session), classroomId, payload),
    onSuccess: async () => {
      await invalidateTeacherExperienceQueries(queryClient, {
        classroomId,
      })
    },
  })
}

export function useTeacherRemoveRosterMemberMutation(classroomId: string) {
  const queryClient = useQueryClient()
  const { session } = useTeacherSession()

  return useMutation({
    mutationFn: async (enrollmentId: string) =>
      authClient.removeClassroomStudent(getTeacherAccessToken(session), classroomId, enrollmentId),
    onSuccess: async () => {
      await invalidateTeacherExperienceQueries(queryClient, {
        classroomId,
      })
    },
  })
}

export function useTeacherCreateRosterImportMutation(classroomId: string) {
  const queryClient = useQueryClient()
  const { session } = useTeacherSession()

  return useMutation({
    mutationFn: async (payload: { sourceFileName: string; rowsText: string }) => {
      const draft = buildTeacherRosterImportDraftModel(payload.rowsText)

      return authClient.createRosterImportJob(getTeacherAccessToken(session), classroomId, {
        sourceFileName: payload.sourceFileName,
        rows: draft.rows,
      })
    },
    onSuccess: async () => {
      await invalidateTeacherExperienceQueries(queryClient, {
        classroomId,
      })
    },
  })
}

export function useTeacherApplyRosterImportMutation(classroomId: string) {
  const queryClient = useQueryClient()
  const { session } = useTeacherSession()

  return useMutation({
    mutationFn: async (jobId: string) =>
      authClient.applyRosterImportJob(getTeacherAccessToken(session), classroomId, jobId),
    onSuccess: async () => {
      await invalidateTeacherExperienceQueries(queryClient, {
        classroomId,
      })
    },
  })
}

export function useTeacherSaveScheduleMutation(classroomId: string) {
  const queryClient = useQueryClient()
  const { session } = useTeacherSession()

  return useMutation({
    mutationFn: async (payload: Parameters<typeof authClient.saveAndNotifyClassroomSchedule>[2]) =>
      authClient.saveAndNotifyClassroomSchedule(
        getTeacherAccessToken(session),
        classroomId,
        payload,
      ),
    onSuccess: async () => {
      await invalidateTeacherExperienceQueries(queryClient, {
        classroomId,
      })
    },
  })
}

export function useTeacherBluetoothCandidates() {
  const classroomsQuery = useTeacherClassroomsQuery()
  const lectureSets = useTeacherLectureSets(classroomsQuery.data)

  return {
    classroomsQuery,
    lectureSets,
    candidates: buildTeacherBluetoothCandidates({
      classrooms: lectureSets.scopedClassrooms,
      lectureSets: lectureSets.lectureSets,
    }),
  }
}

export function useTeacherReportsData() {
  return useTeacherFilteredReportsData()
}

export function useTeacherFilteredReportsData(filters: TeacherReportFilters = {}) {
  const { session } = useTeacherSession()
  const classroomsQuery = useTeacherClassroomsQuery()
  const normalizedFilters: TeacherReportFilters = {
    ...(filters.classroomId ? { classroomId: filters.classroomId } : {}),
    ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
    ...(filters.classId ? { classId: filters.classId } : {}),
    ...(filters.sectionId ? { sectionId: filters.sectionId } : {}),
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.to ? { to: filters.to } : {}),
  }

  const daywiseQuery = useQuery({
    queryKey: teacherQueryKeys.reportDaywise(normalizedFilters),
    enabled: Boolean(session),
    queryFn: async () =>
      authClient.listTeacherDaywiseReports(getTeacherAccessToken(session), normalizedFilters),
  })

  const subjectwiseQuery = useQuery({
    queryKey: teacherQueryKeys.reportSubjectwise(normalizedFilters),
    enabled: Boolean(session),
    queryFn: async () =>
      authClient.listTeacherSubjectwiseReports(getTeacherAccessToken(session), normalizedFilters),
  })

  const studentPercentagesQuery = useQuery({
    queryKey: teacherQueryKeys.reportStudentPercentages(normalizedFilters),
    enabled: Boolean(session),
    queryFn: async () =>
      authClient.listTeacherStudentPercentageReports(
        getTeacherAccessToken(session),
        normalizedFilters,
      ),
  })

  const subjectOptionFilters: TeacherReportFilters = {
    ...(normalizedFilters.classroomId ? { classroomId: normalizedFilters.classroomId } : {}),
  }

  const subjectOptionsQuery = useQuery({
    queryKey: teacherQueryKeys.reportSubjectwise(subjectOptionFilters),
    enabled: Boolean(session && normalizedFilters.subjectId),
    queryFn: async () =>
      authClient.listTeacherSubjectwiseReports(
        getTeacherAccessToken(session),
        subjectOptionFilters,
      ),
  })

  const subjectOptionRows =
    normalizedFilters.subjectId && subjectOptionsQuery.data
      ? subjectOptionsQuery.data
      : (subjectwiseQuery.data ?? [])
  const filterOptions = buildTeacherReportFilterOptions({
    classrooms: classroomsQuery.data ?? [],
    subjectRows: subjectOptionRows,
  })
  const selectedClassroomLabel =
    filterOptions.classroomOptions.find((option) => option.value === normalizedFilters.classroomId)
      ?.label ?? null
  const selectedSubjectLabel =
    filterOptions.subjectOptions.find((option) => option.value === normalizedFilters.subjectId)
      ?.label ?? null

  return {
    classroomsQuery,
    daywiseQuery,
    subjectwiseQuery,
    studentPercentagesQuery,
    subjectOptionsQuery,
    filterOptions,
    model: buildTeacherReportOverviewModel({
      daywiseRows: daywiseQuery.data ?? [],
      subjectRows: subjectwiseQuery.data ?? [],
      studentRows: studentPercentagesQuery.data ?? [],
      filterLabels: {
        classroom: selectedClassroomLabel,
        subject: selectedSubjectLabel,
      },
    }),
  }
}

export function useTeacherExportAvailability() {
  return buildTeacherExportAvailabilityModel()
}

export function useTeacherExportJobsQuery() {
  const { session } = useTeacherSession()

  return useQuery({
    queryKey: teacherQueryKeys.exportJobs(),
    enabled: Boolean(session),
    queryFn: async () => authClient.listExportJobs(getTeacherAccessToken(session)),
    refetchInterval: (query) => {
      const jobs = query.state.data ?? []

      return jobs.some((job) => job.status === "QUEUED" || job.status === "PROCESSING")
        ? 5000
        : false
    },
  })
}

export function useTeacherCreateExportJobMutation() {
  const queryClient = useQueryClient()
  const { session } = useTeacherSession()

  return useMutation({
    mutationFn: async (payload: Parameters<typeof authClient.createExportJob>[1]) =>
      authClient.createExportJob(getTeacherAccessToken(session), payload),
    onSuccess: async (job) => {
      await invalidateTeacherExperienceQueries(queryClient, {
        ...(job.courseOfferingId ? { classroomId: job.courseOfferingId } : {}),
        ...(job.sessionId ? { sessionId: job.sessionId } : {}),
      })
    },
  })
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

export function useTeacherAttendanceSessionDetailQuery(
  sessionId: string,
  options: {
    refetchInterval?:
      | number
      | false
      | ((query: { state: { data: AttendanceSessionDetail | undefined } }) => number | false)
  } = {},
) {
  const { session } = useTeacherSession()
  const refetchInterval =
    options.refetchInterval !== undefined
      ? options.refetchInterval
      : (query: { state: { data: AttendanceSessionDetail | undefined } }) =>
          getMobileAttendanceSessionPollInterval(query.state.data ?? null)

  return useQuery<AttendanceSessionDetail>({
    queryKey: teacherQueryKeys.sessionDetail(sessionId),
    enabled: Boolean(session && sessionId),
    queryFn: async () =>
      authClient.getAttendanceSessionDetail(getTeacherAccessToken(session), sessionId),
    refetchInterval,
  })
}

export function useTeacherAttendanceSessionStudentsQuery(
  sessionId: string,
  options: {
    refetchInterval?: number | false
  } = {},
) {
  const { session } = useTeacherSession()

  return useQuery<AttendanceSessionStudentSummary[]>({
    queryKey: teacherQueryKeys.sessionStudents(sessionId),
    enabled: Boolean(session && sessionId),
    queryFn: async () =>
      authClient.listAttendanceSessionStudents(getTeacherAccessToken(session), sessionId),
    ...(options.refetchInterval !== undefined
      ? {
          refetchInterval: options.refetchInterval,
        }
      : {}),
  })
}

export function useTeacherUpdateAttendanceSessionMutation(sessionId: string) {
  const queryClient = useQueryClient()
  const { session } = useTeacherSession()

  return useMutation({
    mutationFn: async (
      payload: Parameters<typeof authClient.updateAttendanceSessionAttendance>[2],
    ) =>
      authClient.updateAttendanceSessionAttendance(
        getTeacherAccessToken(session),
        sessionId,
        payload,
      ),
    onSuccess: async (result) => {
      queryClient.setQueryData(teacherQueryKeys.sessionDetail(sessionId), result.session)
      queryClient.setQueryData(teacherQueryKeys.sessionStudents(sessionId), result.students)
      await invalidateTeacherExperienceQueries(queryClient, {
        classroomId: result.session.classroomId,
        sessionId,
      })
    },
  })
}
