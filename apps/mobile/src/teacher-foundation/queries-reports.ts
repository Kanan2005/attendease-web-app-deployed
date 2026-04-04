import type { TeacherReportFilters } from "@attendease/contracts"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  buildTeacherReportFilterOptions,
  buildTeacherReportOverviewModel,
} from "../teacher-operational"
import { buildTeacherExportAvailabilityModel } from "../teacher-operational"
import { invalidateTeacherExperienceQueries, teacherQueryKeys } from "../teacher-query"
import { getTeacherAccessToken, useTeacherSession } from "../teacher-session"
import { useTeacherClassroomsQuery } from "./queries-core"
import { authClient } from "./queries-shared"

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

  const sessionsQuery = useQuery({
    queryKey: [...teacherQueryKeys.sessionHistory(), normalizedFilters] as const,
    enabled: Boolean(session),
    queryFn: async () =>
      authClient.listAttendanceSessions(getTeacherAccessToken(session), {
        ...(normalizedFilters.classroomId ? { classroomId: normalizedFilters.classroomId } : {}),
        ...(normalizedFilters.subjectId ? { subjectId: normalizedFilters.subjectId } : {}),
      }),
  })

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
    sessionsQuery,
    daywiseQuery,
    subjectwiseQuery,
    studentPercentagesQuery,
    subjectOptionsQuery,
    filterOptions,
    model: buildTeacherReportOverviewModel({
      daywiseRows: daywiseQuery.data ?? [],
      subjectRows: subjectwiseQuery.data ?? [],
      studentRows: studentPercentagesQuery.data ?? [],
      sessions: sessionsQuery.data ?? [],
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

export function useTeacherSendThresholdEmailsMutation() {
  const { session } = useTeacherSession()

  return useMutation({
    mutationFn: async (payload: Parameters<typeof authClient.sendThresholdEmails>[1]) =>
      authClient.sendThresholdEmails(getTeacherAccessToken(session), payload),
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
