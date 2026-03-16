import {
  type StudentAttendanceHistoryItem,
  type StudentAttendanceHistoryListQuery,
  type StudentReportOverview,
  type StudentSubjectReportDetail,
  type StudentSubjectReportSummary,
  studentAttendanceHistoryListQuerySchema,
  studentAttendanceHistoryResponseSchema,
  studentReportOverviewSchema,
  studentSubjectReportDetailSchema,
  studentSubjectReportSummaryResponseSchema,
} from "@attendease/contracts"

import { type AuthApiRequest, toQuery } from "./client.core"

export function buildAuthClientStudentMethods(request: AuthApiRequest) {
  return {
    listStudentAttendanceHistory(
      token: string,
      filters: StudentAttendanceHistoryListQuery = {},
    ): Promise<StudentAttendanceHistoryItem[]> {
      return request("/students/me/history", {
        method: "GET",
        token,
        query: toQuery(studentAttendanceHistoryListQuerySchema.parse(filters)),
        parse: studentAttendanceHistoryResponseSchema.parse,
      })
    },
    getStudentReportOverview(token: string): Promise<StudentReportOverview> {
      return request("/students/me/reports/overview", {
        method: "GET",
        token,
        parse: studentReportOverviewSchema.parse,
      })
    },
    listStudentSubjectReports(token: string): Promise<StudentSubjectReportSummary[]> {
      return request("/students/me/reports/subjects", {
        method: "GET",
        token,
        parse: studentSubjectReportSummaryResponseSchema.parse,
      })
    },
    getStudentSubjectReport(token: string, subjectId: string): Promise<StudentSubjectReportDetail> {
      return request(`/students/me/reports/subjects/${subjectId}`, {
        method: "GET",
        token,
        parse: studentSubjectReportDetailSchema.parse,
      })
    },
  }
}
