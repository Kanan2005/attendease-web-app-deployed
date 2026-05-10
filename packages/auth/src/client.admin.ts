import {
  type AdminActionAuditQuery,
  type AdminActionAuditResponse,
  type AdminForceLogoutResponse,
  type AdminUserSessionsQuery,
  type AdminUserSessionsResponse,
  type AdminApproveReplacementDeviceRequest,
  type AdminApproveReplacementDeviceResponse,
  type AdminCommunicationAudiencePreviewRequest,
  type AdminCommunicationAudiencePreviewResponse,
  type AdminCommunicationLogDispatchRequest,
  type AdminCommunicationLogDispatchResponse,
  type AdminCourseReportRequest,
  type AdminDashboardAttendanceOverviewResponse,
  type AdminDashboardBranchComparisonResponse,
  type AdminDashboardLeaderboardQuery,
  type AdminDashboardLeaderboardResponse,
  type AdminDashboardSessionsGraphQuery,
  type AdminDashboardSessionsGraphResponse,
  type AdminDashboardStats,
  type AdminDashboardTodayBranchAttendanceResponse,
  type AdminDelinkStudentDevicesRequest,
  type AdminSecurityAuditQuery,
  type AdminSecurityAuditResponse,
  type AdminDelinkStudentDevicesResponse,
  type AdminDeviceSupportDetail,
  type AdminDeviceSupportSearchQuery,
  type AdminDeviceSupportSummary,
  type AdminRecordsArchiveRequest,
  type AdminRecordsArchiveResponse,
  type AdminRecordsCourseListResponse,
  type AdminRecordsCourseSearchQuery,
  type AdminRecordsCourseSearchResponse,
  type AdminRecordsDepartmentListResponse,
  type AdminRecordsStudentListResponse,
  type AdminRecordsTeacherListResponse,
  type AdminReportJobSummary,
  type AdminReportRecentListResponse,
  type AdminRevokeDeviceBindingRequest,
  type AdminSettingsAcademicAddItemRequest,
  type AdminSettingsAcademicList,
  type AdminSettingsAcademicRemoveItemRequest,
  type AdminSettingsAcademicResponse,
  type AdminSettingsAdminInviteRequest,
  type AdminSettingsAdminInviteResponse,
  type AdminSettingsAdminListResponse,
  type AdminSettingsAdminRevokeRequest,
  type AdminSettingsAdminRevokeResponse,
  type AdminSettingsChangePasswordRequest,
  type AdminSettingsChangePasswordResponse,
  type AdminSettingsSystemResponse,
  type AdminSettingsSystemUpdateRequest,
  type AdminStudentManagementDetail,
  type AdminStudentManagementSearchQuery,
  type AdminStudentManagementSummary,
  type AdminStudentReportRequest,
  type AdminTeacherDetail,
  type AdminTeacherReportRequest,
  type AdminTeacherSearchQuery,
  type AdminTeacherSummary,
  type AdminUpdateStudentStatusRequest,
  type AdminUpdateStudentStatusResponse,
  type AdminUsersAttendanceToggleRequest,
  type AdminUsersAttendanceToggleResponse,
  type AdminUsersFilterOptions,
  type AdminUsersStudentListQuery,
  type AdminUsersStudentListResponse,
  type AdminUsersStudentProfile,
  type AdminUsersTeacherListQuery,
  type AdminUsersTeacherListResponse,
  type AdminUsersTeacherProfile,
  type ApproveReplacementStudentDeviceRequest,
  type ApproveReplacementStudentDeviceResponse,
  type RevokeStudentDeviceRegistrationRequest,
  type StudentSupportCaseDetail,
  type StudentSupportCaseSummary,
  type StudentSupportSearchQuery,
  adminActionAuditQuerySchema,
  adminActionAuditResponseSchema,
  adminForceLogoutResponseSchema,
  adminUserSessionsQuerySchema,
  adminUserSessionsResponseSchema,
  adminApproveReplacementDeviceResponseSchema,
  adminCommunicationAudiencePreviewRequestSchema,
  adminCommunicationAudiencePreviewResponseSchema,
  adminCommunicationLogDispatchRequestSchema,
  adminCommunicationLogDispatchResponseSchema,
  adminCourseReportRequestSchema,
  adminDashboardAttendanceOverviewResponseSchema,
  adminDashboardBranchComparisonResponseSchema,
  adminDashboardLeaderboardQuerySchema,
  adminDashboardLeaderboardResponseSchema,
  adminDashboardSessionsGraphQuerySchema,
  adminDashboardSessionsGraphResponseSchema,
  adminDashboardStatsSchema,
  adminDashboardTodayBranchAttendanceResponseSchema,
  adminDelinkStudentDevicesResponseSchema,
  adminDeviceSupportDetailSchema,
  adminDeviceSupportSummariesResponseSchema,
  adminSecurityAuditQuerySchema,
  adminSecurityAuditResponseSchema,
  adminRecordsArchiveRequestSchema,
  adminRecordsArchiveResponseSchema,
  adminRecordsCourseListResponseSchema,
  adminRecordsCourseSearchQuerySchema,
  adminRecordsCourseSearchResponseSchema,
  adminRecordsDepartmentListResponseSchema,
  adminRecordsStudentListResponseSchema,
  adminRecordsTeacherListResponseSchema,
  adminReportJobSummarySchema,
  adminReportRecentListResponseSchema,
  adminSettingsAcademicAddItemRequestSchema,
  adminSettingsAcademicListSchema,
  adminSettingsAcademicRemoveItemRequestSchema,
  adminSettingsAcademicResponseSchema,
  adminSettingsAdminInviteRequestSchema,
  adminSettingsAdminInviteResponseSchema,
  adminSettingsAdminListResponseSchema,
  adminSettingsAdminRevokeRequestSchema,
  adminSettingsAdminRevokeResponseSchema,
  adminSettingsChangePasswordRequestSchema,
  adminSettingsChangePasswordResponseSchema,
  adminSettingsSystemResponseSchema,
  adminSettingsSystemUpdateRequestSchema,
  adminStudentManagementDetailSchema,
  adminStudentManagementSearchQuerySchema,
  adminStudentManagementSummariesResponseSchema,
  adminStudentReportRequestSchema,
  adminTeacherDetailSchema,
  adminTeacherListResponseSchema,
  adminTeacherReportRequestSchema,
  adminTeacherSearchQuerySchema,
  adminUpdateStudentStatusRequestSchema,
  adminUpdateStudentStatusResponseSchema,
  adminUsersAttendanceToggleRequestSchema,
  adminUsersAttendanceToggleResponseSchema,
  adminUsersFilterOptionsSchema,
  adminUsersStudentListQuerySchema,
  adminUsersStudentListResponseSchema,
  adminUsersStudentProfileSchema,
  adminUsersTeacherListQuerySchema,
  adminUsersTeacherListResponseSchema,
  adminUsersTeacherProfileSchema,
  approveReplacementStudentDeviceRequestSchema,
  approveReplacementStudentDeviceResponseSchema,
  authOperationSuccessSchema,
  revokeStudentDeviceRegistrationRequestSchema,
  studentSupportCaseDetailSchema,
  studentSupportCasesResponseSchema,
  studentSupportSearchQuerySchema,
} from "@attendease/contracts"

import { type AuthApiRequest, toQuery } from "./client.core"

export function buildAuthClientAdminMethods(request: AuthApiRequest) {
  return {
    getAdminDashboardStats(token: string): Promise<AdminDashboardStats> {
      return request("/admin/dashboard/stats", {
        method: "GET",
        token,
        parse: adminDashboardStatsSchema.parse,
      })
    },
    getAdminDashboardSessionsGraph(
      token: string,
      filters: Partial<AdminDashboardSessionsGraphQuery> = {},
    ): Promise<AdminDashboardSessionsGraphResponse> {
      const query = adminDashboardSessionsGraphQuerySchema.parse(filters)
      return request("/admin/dashboard/sessions-graph", {
        method: "GET",
        token,
        query: toQuery(query),
        parse: adminDashboardSessionsGraphResponseSchema.parse,
      })
    },
    getAdminDashboardBranchComparison(
      token: string,
    ): Promise<AdminDashboardBranchComparisonResponse> {
      return request("/admin/dashboard/branch-comparison", {
        method: "GET",
        token,
        parse: adminDashboardBranchComparisonResponseSchema.parse,
      })
    },
    getAdminDashboardLeaderboard(
      token: string,
      filters: Partial<AdminDashboardLeaderboardQuery> = {},
    ): Promise<AdminDashboardLeaderboardResponse> {
      const query = adminDashboardLeaderboardQuerySchema.parse(filters)
      return request("/admin/dashboard/course-leaderboard", {
        method: "GET",
        token,
        query: toQuery(query),
        parse: adminDashboardLeaderboardResponseSchema.parse,
      })
    },
    getAdminDashboardAttendanceOverview(
      token: string,
    ): Promise<AdminDashboardAttendanceOverviewResponse> {
      return request("/admin/dashboard/attendance-overview", {
        method: "GET",
        token,
        parse: adminDashboardAttendanceOverviewResponseSchema.parse,
      })
    },
    getAdminDashboardTodayBranchAttendance(
      token: string,
    ): Promise<AdminDashboardTodayBranchAttendanceResponse> {
      return request("/admin/dashboard/today-branch-attendance", {
        method: "GET",
        token,
        parse: adminDashboardTodayBranchAttendanceResponseSchema.parse,
      })
    },
    listAdminTeachers(
      token: string,
      filters: Partial<AdminTeacherSearchQuery> = {},
    ): Promise<AdminTeacherSummary[]> {
      const query = adminTeacherSearchQuerySchema.parse(filters)

      return request("/admin/teachers", {
        method: "GET",
        token,
        query: toQuery(query),
        parse: adminTeacherListResponseSchema.parse,
      })
    },
    getAdminTeacher(token: string, teacherId: string): Promise<AdminTeacherDetail> {
      return request(`/admin/teachers/${teacherId}`, {
        method: "GET",
        token,
        parse: adminTeacherDetailSchema.parse,
      })
    },
    listAdminDeviceSupport(
      token: string,
      filters: Partial<AdminDeviceSupportSearchQuery> = {},
    ): Promise<AdminDeviceSupportSummary[]> {
      return request("/admin/device-bindings", {
        method: "GET",
        token,
        query: toQuery(filters as Record<string, string | boolean | number | undefined>),
        parse: adminDeviceSupportSummariesResponseSchema.parse,
      })
    },
    listAdminStudents(
      token: string,
      filters: Partial<AdminStudentManagementSearchQuery> = {},
    ): Promise<AdminStudentManagementSummary[]> {
      const query = adminStudentManagementSearchQuerySchema.parse(filters)

      return request("/admin/students", {
        method: "GET",
        token,
        query: toQuery(query),
        parse: adminStudentManagementSummariesResponseSchema.parse,
      })
    },
    listStudentSupportCases(
      token: string,
      filters: Partial<StudentSupportSearchQuery> = {},
    ): Promise<StudentSupportCaseSummary[]> {
      const query = studentSupportSearchQuerySchema.parse(filters)

      return request("/admin/students", {
        method: "GET",
        token,
        query: toQuery(query),
        parse: studentSupportCasesResponseSchema.parse,
      })
    },
    getAdminDeviceSupport(token: string, studentId: string): Promise<AdminDeviceSupportDetail> {
      return request(`/admin/device-bindings/${studentId}`, {
        method: "GET",
        token,
        parse: adminDeviceSupportDetailSchema.parse,
      })
    },
    getAdminStudent(token: string, studentId: string): Promise<AdminStudentManagementDetail> {
      return request(`/admin/students/${studentId}`, {
        method: "GET",
        token,
        parse: adminStudentManagementDetailSchema.parse,
      })
    },
    getStudentSupportCase(token: string, studentId: string): Promise<StudentSupportCaseDetail> {
      return request(`/admin/students/${studentId}`, {
        method: "GET",
        token,
        parse: studentSupportCaseDetailSchema.parse,
      })
    },
    updateAdminStudentStatus(
      token: string,
      studentId: string,
      payload: AdminUpdateStudentStatusRequest,
    ): Promise<AdminUpdateStudentStatusResponse> {
      return request(`/admin/students/${studentId}/status`, {
        method: "POST",
        token,
        payload: adminUpdateStudentStatusRequestSchema.parse(payload),
        parse: adminUpdateStudentStatusResponseSchema.parse,
      })
    },
    revokeAdminDeviceBinding(
      token: string,
      bindingId: string,
      payload: AdminRevokeDeviceBindingRequest,
    ): Promise<void> {
      return request(`/admin/device-bindings/${bindingId}/revoke`, {
        method: "POST",
        token,
        payload,
        parse: authOperationSuccessSchema.parse,
      }).then(() => undefined)
    },
    revokeStudentDeviceRegistration(
      token: string,
      bindingId: string,
      payload: RevokeStudentDeviceRegistrationRequest,
    ): Promise<void> {
      return request(`/admin/device-bindings/${bindingId}/revoke`, {
        method: "POST",
        token,
        payload: revokeStudentDeviceRegistrationRequestSchema.parse(payload),
        parse: authOperationSuccessSchema.parse,
      }).then(() => undefined)
    },
    delinkAdminStudentDevices(
      token: string,
      studentId: string,
      payload: AdminDelinkStudentDevicesRequest,
    ): Promise<AdminDelinkStudentDevicesResponse> {
      return request(`/admin/device-bindings/${studentId}/delink`, {
        method: "POST",
        token,
        payload,
        parse: adminDelinkStudentDevicesResponseSchema.parse,
      })
    },
    approveAdminReplacementDevice(
      token: string,
      studentId: string,
      payload: AdminApproveReplacementDeviceRequest,
    ): Promise<AdminApproveReplacementDeviceResponse> {
      return request(`/admin/device-bindings/${studentId}/approve-new-device`, {
        method: "POST",
        token,
        payload,
        parse: adminApproveReplacementDeviceResponseSchema.parse,
      })
    },
    approveReplacementStudentDevice(
      token: string,
      studentId: string,
      payload: ApproveReplacementStudentDeviceRequest,
    ): Promise<ApproveReplacementStudentDeviceResponse> {
      return request(`/admin/device-bindings/${studentId}/approve-new-device`, {
        method: "POST",
        token,
        payload: approveReplacementStudentDeviceRequestSchema.parse(payload),
        parse: approveReplacementStudentDeviceResponseSchema.parse,
      })
    },
    listAdminRecordsDepartments(token: string): Promise<AdminRecordsDepartmentListResponse> {
      return request("/admin/records/departments", {
        method: "GET",
        token,
        parse: adminRecordsDepartmentListResponseSchema.parse,
      })
    },
    listAdminRecordsTeachersInDepartment(
      token: string,
      department: string,
    ): Promise<AdminRecordsTeacherListResponse> {
      return request(`/admin/records/departments/${encodeURIComponent(department)}/teachers`, {
        method: "GET",
        token,
        parse: adminRecordsTeacherListResponseSchema.parse,
      })
    },
    listAdminRecordsCoursesByTeacher(
      token: string,
      teacherId: string,
    ): Promise<AdminRecordsCourseListResponse> {
      return request(`/admin/records/teachers/${teacherId}/courses`, {
        method: "GET",
        token,
        parse: adminRecordsCourseListResponseSchema.parse,
      })
    },
    listAdminRecordsStudentsInCourse(
      token: string,
      courseOfferingId: string,
    ): Promise<AdminRecordsStudentListResponse> {
      return request(`/admin/records/courses/${courseOfferingId}/students`, {
        method: "GET",
        token,
        parse: adminRecordsStudentListResponseSchema.parse,
      })
    },
    searchAdminRecordsCourses(
      token: string,
      filters: AdminRecordsCourseSearchQuery,
    ): Promise<AdminRecordsCourseSearchResponse> {
      const query = adminRecordsCourseSearchQuerySchema.parse(filters)
      return request("/admin/records/courses/search", {
        method: "GET",
        token,
        query: toQuery(query),
        parse: adminRecordsCourseSearchResponseSchema.parse,
      })
    },
    archiveAdminRecordsCourse(
      token: string,
      courseOfferingId: string,
      payload: AdminRecordsArchiveRequest = {},
    ): Promise<AdminRecordsArchiveResponse> {
      return request(`/admin/records/courses/${courseOfferingId}/archive`, {
        method: "POST",
        token,
        payload: adminRecordsArchiveRequestSchema.parse(payload),
        parse: adminRecordsArchiveResponseSchema.parse,
      })
    },
    unarchiveAdminRecordsCourse(
      token: string,
      courseOfferingId: string,
      payload: AdminRecordsArchiveRequest = {},
    ): Promise<AdminRecordsArchiveResponse> {
      return request(`/admin/records/courses/${courseOfferingId}/unarchive`, {
        method: "POST",
        token,
        payload: adminRecordsArchiveRequestSchema.parse(payload),
        parse: adminRecordsArchiveResponseSchema.parse,
      })
    },
    getAdminUsersFilterOptions(token: string): Promise<AdminUsersFilterOptions> {
      return request("/admin/users/filter-options", {
        method: "GET",
        token,
        parse: adminUsersFilterOptionsSchema.parse,
      })
    },
    listAdminUsersStudents(
      token: string,
      filters: Partial<AdminUsersStudentListQuery> = {},
    ): Promise<AdminUsersStudentListResponse> {
      const query = adminUsersStudentListQuerySchema.parse(filters)
      return request("/admin/users/students", {
        method: "GET",
        token,
        query: toQuery(query),
        parse: adminUsersStudentListResponseSchema.parse,
      })
    },
    getAdminUsersStudentProfile(
      token: string,
      studentId: string,
    ): Promise<AdminUsersStudentProfile> {
      return request(`/admin/users/students/${studentId}`, {
        method: "GET",
        token,
        parse: adminUsersStudentProfileSchema.parse,
      })
    },
    disableAdminUsersStudentAttendance(
      token: string,
      studentId: string,
      payload: AdminUsersAttendanceToggleRequest = {},
    ): Promise<AdminUsersAttendanceToggleResponse> {
      return request(`/admin/users/students/${studentId}/attendance-disable`, {
        method: "POST",
        token,
        payload: adminUsersAttendanceToggleRequestSchema.parse(payload),
        parse: adminUsersAttendanceToggleResponseSchema.parse,
      })
    },
    enableAdminUsersStudentAttendance(
      token: string,
      studentId: string,
      payload: AdminUsersAttendanceToggleRequest = {},
    ): Promise<AdminUsersAttendanceToggleResponse> {
      return request(`/admin/users/students/${studentId}/attendance-enable`, {
        method: "POST",
        token,
        payload: adminUsersAttendanceToggleRequestSchema.parse(payload),
        parse: adminUsersAttendanceToggleResponseSchema.parse,
      })
    },
    listAdminUsersTeachers(
      token: string,
      filters: Partial<AdminUsersTeacherListQuery> = {},
    ): Promise<AdminUsersTeacherListResponse> {
      const query = adminUsersTeacherListQuerySchema.parse(filters)
      return request("/admin/users/teachers", {
        method: "GET",
        token,
        query: toQuery(query),
        parse: adminUsersTeacherListResponseSchema.parse,
      })
    },
    getAdminUsersTeacherProfile(
      token: string,
      teacherId: string,
    ): Promise<AdminUsersTeacherProfile> {
      return request(`/admin/users/teachers/${teacherId}`, {
        method: "GET",
        token,
        parse: adminUsersTeacherProfileSchema.parse,
      })
    },
    previewAdminCommunicationAudience(
      token: string,
      payload: AdminCommunicationAudiencePreviewRequest,
    ): Promise<AdminCommunicationAudiencePreviewResponse> {
      return request("/admin/communication/audience-preview", {
        method: "POST",
        token,
        payload: adminCommunicationAudiencePreviewRequestSchema.parse(payload),
        parse: adminCommunicationAudiencePreviewResponseSchema.parse,
      })
    },
    logAdminCommunicationDispatch(
      token: string,
      payload: AdminCommunicationLogDispatchRequest,
    ): Promise<AdminCommunicationLogDispatchResponse> {
      return request("/admin/communication/log-dispatch", {
        method: "POST",
        token,
        payload: adminCommunicationLogDispatchRequestSchema.parse(payload),
        parse: adminCommunicationLogDispatchResponseSchema.parse,
      })
    },
    generateAdminStudentReport(
      token: string,
      payload: AdminStudentReportRequest,
    ): Promise<AdminReportJobSummary> {
      return request("/admin/reports/student", {
        method: "POST",
        token,
        payload: adminStudentReportRequestSchema.parse(payload),
        parse: adminReportJobSummarySchema.parse,
      })
    },
    generateAdminTeacherReport(
      token: string,
      payload: AdminTeacherReportRequest,
    ): Promise<AdminReportJobSummary> {
      return request("/admin/reports/teacher", {
        method: "POST",
        token,
        payload: adminTeacherReportRequestSchema.parse(payload),
        parse: adminReportJobSummarySchema.parse,
      })
    },
    generateAdminCourseReport(
      token: string,
      payload: AdminCourseReportRequest,
    ): Promise<AdminReportJobSummary> {
      return request("/admin/reports/course", {
        method: "POST",
        token,
        payload: adminCourseReportRequestSchema.parse(payload),
        parse: adminReportJobSummarySchema.parse,
      })
    },
    listAdminRecentReports(token: string): Promise<AdminReportRecentListResponse> {
      return request("/admin/reports/recent", {
        method: "GET",
        token,
        parse: adminReportRecentListResponseSchema.parse,
      })
    },
    getAdminSettingsAcademic(token: string): Promise<AdminSettingsAcademicResponse> {
      return request("/admin/settings/academic", {
        method: "GET",
        token,
        parse: adminSettingsAcademicResponseSchema.parse,
      })
    },
    getAdminSettingsAcademicLists(token: string): Promise<AdminSettingsAcademicList> {
      return request("/admin/settings/academic/lists", {
        method: "GET",
        token,
        parse: adminSettingsAcademicListSchema.parse,
      })
    },
    addAdminSettingsAcademicListItem(
      token: string,
      payload: AdminSettingsAcademicAddItemRequest,
    ): Promise<AdminSettingsAcademicList> {
      return request("/admin/settings/academic/lists/add", {
        method: "POST",
        token,
        payload: adminSettingsAcademicAddItemRequestSchema.parse(payload),
        parse: adminSettingsAcademicListSchema.parse,
      })
    },
    removeAdminSettingsAcademicListItem(
      token: string,
      payload: AdminSettingsAcademicRemoveItemRequest,
    ): Promise<AdminSettingsAcademicList> {
      return request("/admin/settings/academic/lists/remove", {
        method: "POST",
        token,
        payload: adminSettingsAcademicRemoveItemRequestSchema.parse(payload),
        parse: adminSettingsAcademicListSchema.parse,
      })
    },
    getAdminSettingsSystem(token: string): Promise<AdminSettingsSystemResponse> {
      return request("/admin/settings/system", {
        method: "GET",
        token,
        parse: adminSettingsSystemResponseSchema.parse,
      })
    },
    updateAdminSettingsSystem(
      token: string,
      payload: AdminSettingsSystemUpdateRequest,
    ): Promise<AdminSettingsSystemResponse> {
      return request("/admin/settings/system", {
        method: "PATCH",
        token,
        payload: adminSettingsSystemUpdateRequestSchema.parse(payload),
        parse: adminSettingsSystemResponseSchema.parse,
      })
    },
    listAdminSettingsAdmins(token: string): Promise<AdminSettingsAdminListResponse> {
      return request("/admin/settings/admins", {
        method: "GET",
        token,
        parse: adminSettingsAdminListResponseSchema.parse,
      })
    },
    inviteAdminSettingsAdmin(
      token: string,
      payload: AdminSettingsAdminInviteRequest,
    ): Promise<AdminSettingsAdminInviteResponse> {
      return request("/admin/settings/admins/invite", {
        method: "POST",
        token,
        payload: adminSettingsAdminInviteRequestSchema.parse(payload),
        parse: adminSettingsAdminInviteResponseSchema.parse,
      })
    },
    revokeAdminSettingsAdmin(
      token: string,
      userId: string,
      payload: AdminSettingsAdminRevokeRequest = {},
    ): Promise<AdminSettingsAdminRevokeResponse> {
      return request(`/admin/settings/admins/${userId}`, {
        method: "DELETE",
        token,
        payload: adminSettingsAdminRevokeRequestSchema.parse(payload),
        parse: adminSettingsAdminRevokeResponseSchema.parse,
      })
    },
    changeAdminOwnPassword(
      token: string,
      payload: AdminSettingsChangePasswordRequest,
    ): Promise<AdminSettingsChangePasswordResponse> {
      return request("/admin/settings/security/change-password", {
        method: "POST",
        token,
        payload: adminSettingsChangePasswordRequestSchema.parse(payload),
        parse: adminSettingsChangePasswordResponseSchema.parse,
      })
    },
    listAdminSecurityEvents(
      token: string,
      filters: Partial<AdminSecurityAuditQuery> = {},
    ): Promise<AdminSecurityAuditResponse> {
      const query = adminSecurityAuditQuerySchema.parse(filters)
      return request("/admin/security/events", {
        method: "GET",
        token,
        query: toQuery(query),
        parse: adminSecurityAuditResponseSchema.parse,
      })
    },
    listAdminActions(
      token: string,
      filters: Partial<AdminActionAuditQuery> = {},
    ): Promise<AdminActionAuditResponse> {
      const query = adminActionAuditQuerySchema.parse(filters)
      return request("/admin/security/actions", {
        method: "GET",
        token,
        query: toQuery(query),
        parse: adminActionAuditResponseSchema.parse,
      })
    },
    listUserSessions(
      token: string,
      userId: string,
      filters: Partial<AdminUserSessionsQuery> = {},
    ): Promise<AdminUserSessionsResponse> {
      const query = adminUserSessionsQuerySchema.parse(filters)
      return request(`/admin/users/${userId}/sessions`, {
        method: "GET",
        token,
        query: toQuery(query),
        parse: adminUserSessionsResponseSchema.parse,
      })
    },
    forceLogout(
      token: string,
      userId: string,
    ): Promise<AdminForceLogoutResponse> {
      return request(`/admin/users/${userId}/force-logout`, {
        method: "POST",
        token,
        parse: adminForceLogoutResponseSchema.parse,
      })
    },
  }
}
