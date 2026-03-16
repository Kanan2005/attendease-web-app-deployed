import { useQuery } from "@tanstack/react-query"

import { requireStudentAccessToken, studentQueryKeys } from "../student-query"
import { useStudentSession } from "../student-session"
import {
  buildStudentAttendanceHistoryRows,
  buildStudentAttendanceHistorySummaryModel,
  buildStudentReportOverviewModel,
  buildStudentSubjectReportModel,
  buildStudentSubjectReportSummaryModel,
} from "../student-workflow-models"
import { authClient } from "./queries-shared"

export function useStudentReportsData() {
  const { session } = useStudentSession()

  const overviewQuery = useQuery({
    queryKey: studentQueryKeys.reportsOverview(),
    enabled: Boolean(session),
    queryFn: async () => authClient.getStudentReportOverview(requireStudentAccessToken(session)),
  })
  const subjectReportsQuery = useQuery({
    queryKey: studentQueryKeys.reportsSubjects(),
    enabled: Boolean(session),
    queryFn: async () => authClient.listStudentSubjectReports(requireStudentAccessToken(session)),
  })

  return {
    overviewQuery,
    subjectReportsQuery,
    reportOverview: overviewQuery.data ? buildStudentReportOverviewModel(overviewQuery.data) : null,
    subjectReports: (subjectReportsQuery.data ?? []).map(buildStudentSubjectReportSummaryModel),
  }
}

export function useStudentAttendanceHistoryData() {
  const { session } = useStudentSession()
  const historyQuery = useQuery({
    queryKey: studentQueryKeys.history(),
    enabled: Boolean(session),
    queryFn: async () =>
      authClient.listStudentAttendanceHistory(requireStudentAccessToken(session)),
  })

  return {
    historyQuery,
    historySummary: buildStudentAttendanceHistorySummaryModel(historyQuery.data ?? []),
    historyRows: buildStudentAttendanceHistoryRows(historyQuery.data ?? []),
  }
}

export function useStudentSubjectReportData(subjectId: string) {
  const { session } = useStudentSession()
  const subjectReportQuery = useQuery({
    queryKey: studentQueryKeys.reportSubject(subjectId),
    enabled: Boolean(session && subjectId),
    queryFn: async () =>
      authClient.getStudentSubjectReport(requireStudentAccessToken(session), subjectId),
  })

  return {
    subjectReportQuery,
    subjectReport: subjectReportQuery.data
      ? buildStudentSubjectReportModel(subjectReportQuery.data)
      : null,
  }
}
