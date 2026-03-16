import {
  type AnalyticsComparisonsResponse,
  type AnalyticsDistributionResponse,
  type AnalyticsFilters,
  type AnalyticsModeUsageResponse,
  type AnalyticsSessionDrilldownResponse,
  type AnalyticsStudentTimelineResponse,
  type AnalyticsTrendResponse,
  type CreateEmailAutomationRuleRequest,
  type CreateExportJobRequest,
  type EmailAutomationRuleListQuery,
  type EmailAutomationRuleResponse,
  type EmailDispatchRunListQuery,
  type EmailDispatchRunSummary,
  type EmailLogListQuery,
  type EmailLogSummary,
  type ExportJobDetail,
  type ExportJobListQuery,
  type ExportJobSummary,
  type LowAttendanceEmailPreviewRequest,
  type LowAttendanceEmailPreviewResponse,
  type ManualLowAttendanceEmailSendRequest,
  type ManualLowAttendanceEmailSendResponse,
  type TeacherDaywiseAttendanceReportResponse,
  type TeacherReportFilters,
  type TeacherStudentAttendancePercentageReportResponse,
  type TeacherSubjectwiseAttendanceReportResponse,
  type UpdateEmailAutomationRuleRequest,
  analyticsComparisonsResponseSchema,
  analyticsDistributionResponseSchema,
  analyticsFiltersSchema,
  analyticsModeUsageResponseSchema,
  analyticsSessionDrilldownResponseSchema,
  analyticsStudentTimelineResponseSchema,
  analyticsTrendResponseSchema,
  createEmailAutomationRuleRequestSchema,
  createExportJobRequestSchema,
  emailAutomationRuleListQuerySchema,
  emailAutomationRuleResponseSchema,
  emailAutomationRulesResponseSchema,
  emailDispatchRunListQuerySchema,
  emailDispatchRunsResponseSchema,
  emailLogListQuerySchema,
  emailLogsResponseSchema,
  exportJobDetailSchema,
  exportJobListQuerySchema,
  exportJobsResponseSchema,
  lowAttendanceEmailPreviewRequestSchema,
  lowAttendanceEmailPreviewResponseSchema,
  manualLowAttendanceEmailSendRequestSchema,
  manualLowAttendanceEmailSendResponseSchema,
  teacherDaywiseAttendanceReportResponseSchema,
  teacherReportFiltersSchema,
  teacherStudentAttendancePercentageReportResponseSchema,
  teacherSubjectwiseAttendanceReportResponseSchema,
  updateEmailAutomationRuleRequestSchema,
} from "@attendease/contracts"

import { type AuthApiRequest, toQuery } from "./client.core"

export function buildAuthClientReportMethods(request: AuthApiRequest) {
  return {
    listTeacherDaywiseReports(
      token: string,
      filters: TeacherReportFilters = {},
    ): Promise<TeacherDaywiseAttendanceReportResponse> {
      return request("/reports/daywise", {
        method: "GET",
        token,
        query: toQuery(teacherReportFiltersSchema.parse(filters)),
        parse: teacherDaywiseAttendanceReportResponseSchema.parse,
      })
    },
    listTeacherSubjectwiseReports(
      token: string,
      filters: TeacherReportFilters = {},
    ): Promise<TeacherSubjectwiseAttendanceReportResponse> {
      return request("/reports/subjectwise", {
        method: "GET",
        token,
        query: toQuery(teacherReportFiltersSchema.parse(filters)),
        parse: teacherSubjectwiseAttendanceReportResponseSchema.parse,
      })
    },
    listTeacherStudentPercentageReports(
      token: string,
      filters: TeacherReportFilters = {},
    ): Promise<TeacherStudentAttendancePercentageReportResponse> {
      return request("/reports/students/percentages", {
        method: "GET",
        token,
        query: toQuery(teacherReportFiltersSchema.parse(filters)),
        parse: teacherStudentAttendancePercentageReportResponseSchema.parse,
      })
    },
    getAnalyticsTrends(
      token: string,
      filters: AnalyticsFilters = {},
    ): Promise<AnalyticsTrendResponse> {
      return request("/analytics/trends", {
        method: "GET",
        token,
        query: toQuery(analyticsFiltersSchema.parse(filters)),
        parse: analyticsTrendResponseSchema.parse,
      })
    },
    getAnalyticsDistribution(
      token: string,
      filters: AnalyticsFilters = {},
    ): Promise<AnalyticsDistributionResponse> {
      return request("/analytics/distribution", {
        method: "GET",
        token,
        query: toQuery(analyticsFiltersSchema.parse(filters)),
        parse: analyticsDistributionResponseSchema.parse,
      })
    },
    getAnalyticsComparisons(
      token: string,
      filters: AnalyticsFilters = {},
    ): Promise<AnalyticsComparisonsResponse> {
      return request("/analytics/comparisons", {
        method: "GET",
        token,
        query: toQuery(analyticsFiltersSchema.parse(filters)),
        parse: analyticsComparisonsResponseSchema.parse,
      })
    },
    getAnalyticsModes(
      token: string,
      filters: AnalyticsFilters = {},
    ): Promise<AnalyticsModeUsageResponse> {
      return request("/analytics/modes", {
        method: "GET",
        token,
        query: toQuery(analyticsFiltersSchema.parse(filters)),
        parse: analyticsModeUsageResponseSchema.parse,
      })
    },
    getAnalyticsStudentTimeline(
      token: string,
      studentId: string,
      filters: AnalyticsFilters = {},
    ): Promise<AnalyticsStudentTimelineResponse> {
      return request(`/analytics/students/${studentId}/timeline`, {
        method: "GET",
        token,
        query: toQuery(analyticsFiltersSchema.parse(filters)),
        parse: analyticsStudentTimelineResponseSchema.parse,
      })
    },
    getAnalyticsSessionDrilldown(
      token: string,
      sessionId: string,
    ): Promise<AnalyticsSessionDrilldownResponse> {
      return request(`/analytics/sessions/${sessionId}/detail`, {
        method: "GET",
        token,
        parse: analyticsSessionDrilldownResponseSchema.parse,
      })
    },
    listEmailAutomationRules(
      token: string,
      filters: EmailAutomationRuleListQuery = {},
    ): Promise<EmailAutomationRuleResponse[]> {
      return request("/automation/email/rules", {
        method: "GET",
        token,
        query: toQuery(emailAutomationRuleListQuerySchema.parse(filters)),
        parse: emailAutomationRulesResponseSchema.parse,
      })
    },
    createEmailAutomationRule(
      token: string,
      payload: CreateEmailAutomationRuleRequest,
    ): Promise<EmailAutomationRuleResponse> {
      return request("/automation/email/rules", {
        method: "POST",
        token,
        payload: createEmailAutomationRuleRequestSchema.parse(payload),
        parse: emailAutomationRuleResponseSchema.parse,
      })
    },
    updateEmailAutomationRule(
      token: string,
      ruleId: string,
      payload: UpdateEmailAutomationRuleRequest,
    ): Promise<EmailAutomationRuleResponse> {
      return request(`/automation/email/rules/${ruleId}`, {
        method: "PATCH",
        token,
        payload: updateEmailAutomationRuleRequestSchema.parse(payload),
        parse: emailAutomationRuleResponseSchema.parse,
      })
    },
    previewLowAttendanceEmail(
      token: string,
      payload: LowAttendanceEmailPreviewRequest,
    ): Promise<LowAttendanceEmailPreviewResponse> {
      return request("/automation/email/preview", {
        method: "POST",
        token,
        payload: lowAttendanceEmailPreviewRequestSchema.parse(payload),
        parse: lowAttendanceEmailPreviewResponseSchema.parse,
      })
    },
    sendManualLowAttendanceEmail(
      token: string,
      payload: ManualLowAttendanceEmailSendRequest,
    ): Promise<ManualLowAttendanceEmailSendResponse> {
      return request("/automation/email/send-manual", {
        method: "POST",
        token,
        payload: manualLowAttendanceEmailSendRequestSchema.parse(payload),
        parse: manualLowAttendanceEmailSendResponseSchema.parse,
      })
    },
    listEmailDispatchRuns(
      token: string,
      filters: EmailDispatchRunListQuery = {},
    ): Promise<EmailDispatchRunSummary[]> {
      return request("/automation/email/runs", {
        method: "GET",
        token,
        query: toQuery(emailDispatchRunListQuerySchema.parse(filters)),
        parse: emailDispatchRunsResponseSchema.parse,
      })
    },
    listEmailLogs(token: string, filters: EmailLogListQuery = {}): Promise<EmailLogSummary[]> {
      return request("/automation/email/logs", {
        method: "GET",
        token,
        query: toQuery(emailLogListQuerySchema.parse(filters)),
        parse: emailLogsResponseSchema.parse,
      })
    },
    createExportJob(token: string, payload: CreateExportJobRequest): Promise<ExportJobDetail> {
      return request("/exports", {
        method: "POST",
        token,
        payload: createExportJobRequestSchema.parse(payload),
        parse: exportJobDetailSchema.parse,
      })
    },
    listExportJobs(token: string, filters: ExportJobListQuery = {}): Promise<ExportJobSummary[]> {
      return request("/exports", {
        method: "GET",
        token,
        query: toQuery(exportJobListQuerySchema.parse(filters)),
        parse: exportJobsResponseSchema.parse,
      })
    },
    getExportJob(token: string, exportJobId: string): Promise<ExportJobDetail> {
      return request(`/exports/${exportJobId}`, {
        method: "GET",
        token,
        parse: exportJobDetailSchema.parse,
      })
    },
  }
}
