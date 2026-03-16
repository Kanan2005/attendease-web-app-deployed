import {
  type AddClassroomStudentRequest,
  type AdminApproveReplacementDeviceRequest,
  type AdminApproveReplacementDeviceResponse,
  type AdminArchiveClassroomRequest,
  type AdminClassroomGovernanceDetail,
  type AdminClassroomGovernanceSearchQuery,
  type AdminClassroomGovernanceSummary,
  type AdminDelinkStudentDevicesRequest,
  type AdminDelinkStudentDevicesResponse,
  type AdminDeviceSupportDetail,
  type AdminDeviceSupportSearchQuery,
  type AdminDeviceSupportSummary,
  type AdminPasswordLoginRequest,
  type AdminRevokeDeviceBindingRequest,
  type AdminStudentManagementDetail,
  type AdminStudentManagementSearchQuery,
  type AdminStudentManagementSummary,
  type AdminUpdateStudentStatusRequest,
  type AdminUpdateStudentStatusResponse,
  type AnalyticsComparisonsResponse,
  type AnalyticsDistributionResponse,
  type AnalyticsFilters,
  type AnalyticsModeUsageResponse,
  type AnalyticsSessionDrilldownResponse,
  type AnalyticsStudentTimelineResponse,
  type AnalyticsTrendResponse,
  type AnnouncementListQuery,
  type AnnouncementSummary,
  type ApproveReplacementStudentDeviceRequest,
  type ApproveReplacementStudentDeviceResponse,
  type AttendanceSessionDetail,
  type AttendanceSessionHistoryItem,
  type AttendanceSessionHistoryListQuery,
  type AttendanceSessionStudentSummary,
  type AttendanceSessionSummary,
  type AuthGoogleExchangeRequest,
  type AuthLoginRequest,
  type AuthLogoutRequest,
  type AuthMeResponse,
  type AuthRefreshRequest,
  type AuthSessionResponse,
  type BluetoothSessionCreateResponse,
  type ClassroomDetail,
  type ClassroomJoinCodeSummary,
  type ClassroomListQuery,
  type ClassroomRosterListQuery,
  type ClassroomRosterMemberSummary,
  type ClassroomSchedule,
  type ClassroomStudentListQuery,
  type ClassroomStudentSummary,
  type ClassroomSummary,
  type ClearStudentDeviceRegistrationsRequest,
  type ClearStudentDeviceRegistrationsResponse,
  type CreateAnnouncementRequest,
  type CreateBluetoothSessionRequest,
  type CreateClassroomRequest,
  type CreateClassroomRosterMemberRequest,
  type CreateEmailAutomationRuleRequest,
  type CreateExportJobRequest,
  type CreateLectureRequest,
  type CreateQrSessionRequest,
  type CreateRosterImportJobRequest,
  type CreateScheduleExceptionRequest,
  type CreateScheduleSlotRequest,
  type CreateSemesterRequest,
  type DeviceRegistrationRequest,
  type DeviceRegistrationResponse,
  type EmailAutomationRuleListQuery,
  type EmailAutomationRuleResponse,
  type EmailDispatchRunListQuery,
  type EmailDispatchRunSummary,
  type EmailLogListQuery,
  type EmailLogSummary,
  type EnrollmentListQuery,
  type EnrollmentSummary,
  type ExportJobDetail,
  type ExportJobListQuery,
  type ExportJobSummary,
  type JoinClassroomRequest,
  type LectureListQuery,
  type LectureSummary,
  type LiveAttendanceSessionDiscoveryQuery,
  type LiveAttendanceSessionSummary,
  type LowAttendanceEmailPreviewRequest,
  type LowAttendanceEmailPreviewResponse,
  type ManualAttendanceUpdateRequest,
  type ManualAttendanceUpdateResponse,
  type ManualLowAttendanceEmailSendRequest,
  type ManualLowAttendanceEmailSendResponse,
  type MarkBluetoothAttendanceRequest,
  type MarkBluetoothAttendanceResponse,
  type MarkQrAttendanceRequest,
  type MarkQrAttendanceResponse,
  type ResetClassroomJoinCodeRequest,
  type RevokeStudentDeviceRegistrationRequest,
  type RosterImportJobDetail,
  type RosterImportJobListQuery,
  type RosterImportJobSummary,
  type SaveAndNotifyScheduleRequest,
  type SemesterListQuery,
  type SemesterSummary,
  type StudentAttendanceHistoryItem,
  type StudentAttendanceHistoryListQuery,
  type StudentClassroomListQuery,
  type StudentClassroomMembershipSummary,
  type StudentGoogleExchangeRequest,
  type StudentPasswordLoginRequest,
  type StudentRegistrationRequest,
  type StudentRegistrationResponse,
  type StudentReportOverview,
  type StudentSubjectReportDetail,
  type StudentSubjectReportSummary,
  type StudentSupportCaseDetail,
  type StudentSupportCaseSummary,
  type StudentSupportSearchQuery,
  type TeacherAssignmentListQuery,
  type TeacherAssignmentSummary,
  type TeacherDaywiseAttendanceReportResponse,
  type TeacherGoogleExchangeRequest,
  type TeacherPasswordLoginRequest,
  type TeacherRegistrationRequest,
  type TeacherRegistrationResponse,
  type TeacherReportFilters,
  type TeacherStudentAttendancePercentageReportResponse,
  type TeacherSubjectwiseAttendanceReportResponse,
  type TrustedDeviceAttendanceReadyResponse,
  type UpdateAttendanceSessionAttendanceRequest,
  type UpdateAttendanceSessionAttendanceResponse,
  type UpdateClassroomRequest,
  type UpdateClassroomRosterMemberRequest,
  type UpdateClassroomStudentRequest,
  type UpdateEmailAutomationRuleRequest,
  type UpdateScheduleExceptionRequest,
  type UpdateScheduleSlotRequest,
  type UpdateSemesterRequest,
  addClassroomStudentRequestSchema,
  adminApproveReplacementDeviceResponseSchema,
  adminArchiveClassroomRequestSchema,
  adminClassroomGovernanceDetailSchema,
  adminClassroomGovernanceResponseSchema,
  adminClassroomGovernanceSearchQuerySchema,
  adminDelinkStudentDevicesResponseSchema,
  adminDeviceSupportDetailSchema,
  adminDeviceSupportSummariesResponseSchema,
  adminPasswordLoginRequestSchema,
  adminStudentManagementDetailSchema,
  adminStudentManagementSearchQuerySchema,
  adminStudentManagementSummariesResponseSchema,
  adminUpdateStudentStatusRequestSchema,
  adminUpdateStudentStatusResponseSchema,
  analyticsComparisonsResponseSchema,
  analyticsDistributionResponseSchema,
  analyticsFiltersSchema,
  analyticsModeUsageResponseSchema,
  analyticsSessionDrilldownResponseSchema,
  analyticsStudentTimelineResponseSchema,
  analyticsTrendResponseSchema,
  announcementListQuerySchema,
  announcementSummarySchema,
  announcementsResponseSchema,
  approveReplacementStudentDeviceRequestSchema,
  approveReplacementStudentDeviceResponseSchema,
  attendanceSessionDetailSchema,
  attendanceSessionHistoryListQuerySchema,
  attendanceSessionHistoryResponseSchema,
  attendanceSessionStudentsResponseSchema,
  attendanceSessionSummarySchema,
  authMeResponseSchema,
  authOperationSuccessSchema,
  authSessionResponseSchema,
  bluetoothSessionCreateResponseSchema,
  classroomDetailSchema,
  classroomJoinCodeSummarySchema,
  classroomRosterListQuerySchema,
  classroomRosterMemberSummarySchema,
  classroomRosterResponseSchema,
  classroomScheduleSchema,
  classroomStudentListQuerySchema,
  classroomStudentsResponseSchema,
  classroomsResponseSchema,
  clearStudentDeviceRegistrationsRequestSchema,
  clearStudentDeviceRegistrationsResponseSchema,
  createAnnouncementRequestSchema,
  createClassroomRequestSchema,
  createClassroomRosterMemberRequestSchema,
  createEmailAutomationRuleRequestSchema,
  createExportJobRequestSchema,
  createLectureRequestSchema,
  createRosterImportJobRequestSchema,
  deviceRegistrationResponseSchema,
  emailAutomationRuleListQuerySchema,
  emailAutomationRuleResponseSchema,
  emailAutomationRulesResponseSchema,
  emailDispatchRunListQuerySchema,
  emailDispatchRunsResponseSchema,
  emailLogListQuerySchema,
  emailLogsResponseSchema,
  enrollmentSummarySchema,
  enrollmentsResponseSchema,
  exportJobDetailSchema,
  exportJobListQuerySchema,
  exportJobsResponseSchema,
  joinClassroomRequestSchema,
  lectureSummarySchema,
  lecturesResponseSchema,
  liveAttendanceSessionDiscoveryQuerySchema,
  liveAttendanceSessionsResponseSchema,
  lowAttendanceEmailPreviewRequestSchema,
  lowAttendanceEmailPreviewResponseSchema,
  manualAttendanceActionToStatusMap,
  manualAttendanceUpdateRequestSchema,
  manualAttendanceUpdateResponseSchema,
  manualLowAttendanceEmailSendRequestSchema,
  manualLowAttendanceEmailSendResponseSchema,
  markBluetoothAttendanceRequestSchema,
  markBluetoothAttendanceResponseSchema,
  markQrAttendanceRequestSchema,
  markQrAttendanceResponseSchema,
  resetClassroomJoinCodeRequestSchema,
  revokeStudentDeviceRegistrationRequestSchema,
  rosterImportJobDetailSchema,
  rosterImportJobListQuerySchema,
  rosterImportJobsResponseSchema,
  scheduleExceptionSummarySchema,
  scheduleSlotSummarySchema,
  semesterSummarySchema,
  semestersResponseSchema,
  studentAttendanceHistoryListQuerySchema,
  studentAttendanceHistoryResponseSchema,
  studentClassroomListQuerySchema,
  studentClassroomMembershipSummarySchema,
  studentClassroomsResponseSchema,
  studentGoogleExchangeRequestSchema,
  studentPasswordLoginRequestSchema,
  studentRegistrationRequestSchema,
  studentRegistrationResponseSchema,
  studentReportOverviewSchema,
  studentSubjectReportDetailSchema,
  studentSubjectReportSummaryResponseSchema,
  studentSupportCaseDetailSchema,
  studentSupportCasesResponseSchema,
  studentSupportSearchQuerySchema,
  teacherAssignmentSummarySchema,
  teacherAssignmentsResponseSchema,
  teacherDaywiseAttendanceReportResponseSchema,
  teacherGoogleExchangeRequestSchema,
  teacherPasswordLoginRequestSchema,
  teacherRegistrationRequestSchema,
  teacherRegistrationResponseSchema,
  teacherReportFiltersSchema,
  teacherStudentAttendancePercentageReportResponseSchema,
  teacherSubjectwiseAttendanceReportResponseSchema,
  trustedDeviceAttendanceReadyResponseSchema,
  updateAttendanceSessionAttendanceRequestSchema,
  updateAttendanceSessionAttendanceResponseSchema,
  updateClassroomRequestSchema,
  updateClassroomRosterMemberRequestSchema,
  updateClassroomStudentRequestSchema,
  updateEmailAutomationRuleRequestSchema,
} from "@attendease/contracts"

import { buildTrustedDeviceHeaders } from "./device"

export type AuthApiClientFetch = (
  input: string,
  init?: {
    method?: string
    headers?: Record<string, string>
    body?: string
  },
) => Promise<{
  ok: boolean
  status: number
  json: () => Promise<unknown>
}>

export class AuthApiClientError extends Error {
  readonly status: number
  readonly details: unknown

  constructor(message: string, status: number, details: unknown) {
    super(message)
    this.name = "AuthApiClientError"
    this.status = status
    this.details = details
  }
}

export function buildGoogleExchangeRequest(
  input: AuthGoogleExchangeRequest,
): AuthGoogleExchangeRequest {
  return input
}

export function createAuthApiClient(options: {
  baseUrl: string
  fetcher?: AuthApiClientFetch
}) {
  const globalFetch = (globalThis as { fetch?: AuthApiClientFetch }).fetch
  const fetcher = options.fetcher ?? globalFetch ?? null

  const request = async <TResponse>(
    path: string,
    config: {
      method: "GET" | "POST" | "PATCH" | "DELETE"
      token?: string
      payload?: unknown
      query?: Record<string, string | undefined>
      headers?: Record<string, string>
      parse: (value: unknown) => TResponse
    },
  ): Promise<TResponse> => {
    if (!fetcher) {
      throw new Error("No fetch implementation is available for the auth client.")
    }

    const url = new URL(path, options.baseUrl)

    if (config.query) {
      for (const [key, value] of Object.entries(config.query)) {
        if (value) {
          url.searchParams.set(key, value)
        }
      }
    }

    const response = await fetcher(url.toString(), {
      method: config.method,
      headers: {
        ...(config.payload !== undefined ? { "content-type": "application/json" } : {}),
        ...(config.token ? { authorization: `Bearer ${config.token}` } : {}),
        ...(config.headers ?? {}),
      },
      ...(config.payload !== undefined ? { body: JSON.stringify(config.payload) } : {}),
    })

    const body = await response.json()

    if (!response.ok) {
      throw new AuthApiClientError("Auth API request failed.", response.status, body)
    }

    return config.parse(body)
  }

  return {
    login(payload: AuthLoginRequest): Promise<AuthSessionResponse> {
      return request("/auth/login", {
        method: "POST",
        payload,
        parse: authSessionResponseSchema.parse,
      })
    },
    loginStudent(payload: StudentPasswordLoginRequest): Promise<AuthSessionResponse> {
      return this.login(studentPasswordLoginRequestSchema.parse(payload))
    },
    loginTeacher(payload: TeacherPasswordLoginRequest): Promise<AuthSessionResponse> {
      return this.login(teacherPasswordLoginRequestSchema.parse(payload))
    },
    loginAdmin(payload: AdminPasswordLoginRequest): Promise<AuthSessionResponse> {
      return this.login(adminPasswordLoginRequestSchema.parse(payload))
    },
    registerStudentAccount(
      payload: StudentRegistrationRequest,
    ): Promise<StudentRegistrationResponse> {
      return request("/auth/register/student", {
        method: "POST",
        payload: studentRegistrationRequestSchema.parse(payload),
        parse: studentRegistrationResponseSchema.parse,
      })
    },
    registerTeacherAccount(
      payload: TeacherRegistrationRequest,
    ): Promise<TeacherRegistrationResponse> {
      return request("/auth/register/teacher", {
        method: "POST",
        payload: teacherRegistrationRequestSchema.parse(payload),
        parse: teacherRegistrationResponseSchema.parse,
      })
    },
    exchangeGoogleIdentity(payload: AuthGoogleExchangeRequest): Promise<AuthSessionResponse> {
      return request("/auth/google/exchange", {
        method: "POST",
        payload: buildGoogleExchangeRequest(payload),
        parse: authSessionResponseSchema.parse,
      })
    },
    exchangeStudentGoogleIdentity(
      payload: StudentGoogleExchangeRequest,
    ): Promise<AuthSessionResponse> {
      return this.exchangeGoogleIdentity(studentGoogleExchangeRequestSchema.parse(payload))
    },
    exchangeTeacherGoogleIdentity(
      payload: TeacherGoogleExchangeRequest,
    ): Promise<AuthSessionResponse> {
      return this.exchangeGoogleIdentity(teacherGoogleExchangeRequestSchema.parse(payload))
    },
    refresh(payload: AuthRefreshRequest): Promise<AuthSessionResponse> {
      return request("/auth/refresh", {
        method: "POST",
        payload,
        parse: authSessionResponseSchema.parse,
      })
    },
    async logout(token: string, payload: AuthLogoutRequest = {}): Promise<void> {
      await request("/auth/logout", {
        method: "POST",
        token,
        payload,
        parse: authOperationSuccessSchema.parse,
      })
    },
    me(token: string): Promise<AuthMeResponse> {
      return request("/auth/me", {
        method: "GET",
        token,
        parse: authMeResponseSchema.parse,
      })
    },
    listMyAssignments(
      token: string,
      filters: TeacherAssignmentListQuery = {},
    ): Promise<TeacherAssignmentSummary[]> {
      return request("/academic/assignments/me", {
        method: "GET",
        token,
        query: toQuery(filters),
        parse: teacherAssignmentsResponseSchema.parse,
      })
    },
    getMyAssignment(token: string, assignmentId: string): Promise<TeacherAssignmentSummary> {
      return request(`/academic/assignments/me/${assignmentId}`, {
        method: "GET",
        token,
        parse: teacherAssignmentSummarySchema.parse,
      })
    },
    listMyEnrollments(
      token: string,
      filters: EnrollmentListQuery = {},
    ): Promise<EnrollmentSummary[]> {
      return request("/academic/enrollments/me", {
        method: "GET",
        token,
        query: toQuery(filters),
        parse: enrollmentsResponseSchema.parse,
      })
    },
    getMyEnrollment(token: string, enrollmentId: string): Promise<EnrollmentSummary> {
      return request(`/academic/enrollments/me/${enrollmentId}`, {
        method: "GET",
        token,
        parse: enrollmentSummarySchema.parse,
      })
    },
    listSemesters(token: string, filters: SemesterListQuery = {}): Promise<SemesterSummary[]> {
      return request("/admin/semesters", {
        method: "GET",
        token,
        query: toQuery(filters),
        parse: semestersResponseSchema.parse,
      })
    },
    getSemester(token: string, semesterId: string): Promise<SemesterSummary> {
      return request(`/admin/semesters/${semesterId}`, {
        method: "GET",
        token,
        parse: semesterSummarySchema.parse,
      })
    },
    createSemester(token: string, payload: CreateSemesterRequest): Promise<SemesterSummary> {
      return request("/admin/semesters", {
        method: "POST",
        token,
        payload,
        parse: semesterSummarySchema.parse,
      })
    },
    updateSemester(
      token: string,
      semesterId: string,
      payload: UpdateSemesterRequest,
    ): Promise<SemesterSummary> {
      return request(`/admin/semesters/${semesterId}`, {
        method: "PATCH",
        token,
        payload,
        parse: semesterSummarySchema.parse,
      })
    },
    activateSemester(token: string, semesterId: string): Promise<SemesterSummary> {
      return request(`/admin/semesters/${semesterId}/activate`, {
        method: "POST",
        token,
        parse: semesterSummarySchema.parse,
      })
    },
    archiveSemester(token: string, semesterId: string): Promise<SemesterSummary> {
      return request(`/admin/semesters/${semesterId}/archive`, {
        method: "POST",
        token,
        parse: semesterSummarySchema.parse,
      })
    },
    listAdminClassrooms(
      token: string,
      filters: Partial<AdminClassroomGovernanceSearchQuery> = {},
    ): Promise<AdminClassroomGovernanceSummary[]> {
      const query = adminClassroomGovernanceSearchQuerySchema.parse(filters)

      return request("/admin/classrooms", {
        method: "GET",
        token,
        query: toQuery(query),
        parse: adminClassroomGovernanceResponseSchema.parse,
      })
    },
    getAdminClassroom(token: string, classroomId: string): Promise<AdminClassroomGovernanceDetail> {
      return request(`/admin/classrooms/${classroomId}`, {
        method: "GET",
        token,
        parse: adminClassroomGovernanceDetailSchema.parse,
      })
    },
    archiveAdminClassroom(
      token: string,
      classroomId: string,
      payload: AdminArchiveClassroomRequest,
    ): Promise<AdminClassroomGovernanceDetail> {
      return request(`/admin/classrooms/${classroomId}/archive`, {
        method: "POST",
        token,
        payload: adminArchiveClassroomRequestSchema.parse(payload),
        parse: adminClassroomGovernanceDetailSchema.parse,
      })
    },
    listClassrooms(token: string, filters: ClassroomListQuery = {}): Promise<ClassroomSummary[]> {
      return request("/classrooms", {
        method: "GET",
        token,
        query: toQuery(filters),
        parse: classroomsResponseSchema.parse,
      })
    },
    getClassroom(token: string, classroomId: string): Promise<ClassroomDetail> {
      return request(`/classrooms/${classroomId}`, {
        method: "GET",
        token,
        parse: classroomDetailSchema.parse,
      })
    },
    listMyClassrooms(
      token: string,
      filters: StudentClassroomListQuery = {},
    ): Promise<StudentClassroomMembershipSummary[]> {
      const query = studentClassroomListQuerySchema.parse(filters)

      return request("/students/me/classrooms", {
        method: "GET",
        token,
        query: toQuery(query),
        parse: studentClassroomsResponseSchema.parse,
      })
    },
    joinClassroom(
      token: string,
      payload: JoinClassroomRequest,
    ): Promise<StudentClassroomMembershipSummary> {
      return request("/classrooms/join", {
        method: "POST",
        token,
        payload: joinClassroomRequestSchema.parse(payload),
        parse: studentClassroomMembershipSummarySchema.parse,
      })
    },
    createClassroom(token: string, payload: CreateClassroomRequest): Promise<ClassroomDetail> {
      return request("/classrooms", {
        method: "POST",
        token,
        payload: createClassroomRequestSchema.parse(payload),
        parse: classroomDetailSchema.parse,
      })
    },
    updateClassroom(
      token: string,
      classroomId: string,
      payload: UpdateClassroomRequest,
    ): Promise<ClassroomDetail> {
      return request(`/classrooms/${classroomId}`, {
        method: "PATCH",
        token,
        payload: updateClassroomRequestSchema.parse(payload),
        parse: classroomDetailSchema.parse,
      })
    },
    archiveClassroom(token: string, classroomId: string): Promise<ClassroomDetail> {
      return request(`/classrooms/${classroomId}/archive`, {
        method: "POST",
        token,
        parse: classroomDetailSchema.parse,
      })
    },
    getClassroomSchedule(token: string, classroomId: string): Promise<ClassroomSchedule> {
      return request(`/classrooms/${classroomId}/schedule`, {
        method: "GET",
        token,
        parse: classroomScheduleSchema.parse,
      })
    },
    getClassroomJoinCode(
      token: string,
      classroomId: string,
    ): Promise<ClassroomJoinCodeSummary | null> {
      return request(`/classrooms/${classroomId}/join-code`, {
        method: "GET",
        token,
        parse: classroomJoinCodeSummarySchema.nullable().parse,
      })
    },
    resetClassroomJoinCode(
      token: string,
      classroomId: string,
      payload: ResetClassroomJoinCodeRequest = {},
    ): Promise<ClassroomJoinCodeSummary> {
      const requestPayload = resetClassroomJoinCodeRequestSchema.parse(payload)

      return request(`/classrooms/${classroomId}/join-code/reset`, {
        method: "POST",
        token,
        payload: requestPayload,
        parse: classroomJoinCodeSummarySchema.parse,
      })
    },
    createClassroomWeeklySlot(
      token: string,
      classroomId: string,
      payload: CreateScheduleSlotRequest,
    ) {
      return request(`/classrooms/${classroomId}/schedule/weekly-slots`, {
        method: "POST",
        token,
        payload,
        parse: scheduleSlotSummarySchema.parse,
      })
    },
    updateClassroomWeeklySlot(
      token: string,
      classroomId: string,
      slotId: string,
      payload: UpdateScheduleSlotRequest,
    ) {
      return request(`/classrooms/${classroomId}/schedule/weekly-slots/${slotId}`, {
        method: "PATCH",
        token,
        payload,
        parse: scheduleSlotSummarySchema.parse,
      })
    },
    createClassroomScheduleException(
      token: string,
      classroomId: string,
      payload: CreateScheduleExceptionRequest,
    ) {
      return request(`/classrooms/${classroomId}/schedule/exceptions`, {
        method: "POST",
        token,
        payload,
        parse: scheduleExceptionSummarySchema.parse,
      })
    },
    updateClassroomScheduleException(
      token: string,
      classroomId: string,
      exceptionId: string,
      payload: UpdateScheduleExceptionRequest,
    ) {
      return request(`/classrooms/${classroomId}/schedule/exceptions/${exceptionId}`, {
        method: "PATCH",
        token,
        payload,
        parse: scheduleExceptionSummarySchema.parse,
      })
    },
    saveAndNotifyClassroomSchedule(
      token: string,
      classroomId: string,
      payload: SaveAndNotifyScheduleRequest,
    ) {
      return request(`/classrooms/${classroomId}/schedule/save-and-notify`, {
        method: "POST",
        token,
        payload,
        parse: classroomScheduleSchema.parse,
      })
    },
    listClassroomLectures(
      token: string,
      classroomId: string,
      filters: LectureListQuery = {},
    ): Promise<LectureSummary[]> {
      return request(`/classrooms/${classroomId}/lectures`, {
        method: "GET",
        token,
        query: toQuery(filters),
        parse: lecturesResponseSchema.parse,
      })
    },
    createClassroomLecture(
      token: string,
      classroomId: string,
      payload: CreateLectureRequest,
    ): Promise<LectureSummary> {
      return request(`/classrooms/${classroomId}/lectures`, {
        method: "POST",
        token,
        payload: createLectureRequestSchema.parse(payload),
        parse: lectureSummarySchema.parse,
      })
    },
    createQrAttendanceSession(
      token: string,
      payload: CreateQrSessionRequest,
    ): Promise<AttendanceSessionSummary> {
      return request("/sessions/qr", {
        method: "POST",
        token,
        payload,
        parse: attendanceSessionSummarySchema.parse,
      })
    },
    createBluetoothAttendanceSession(
      token: string,
      payload: CreateBluetoothSessionRequest,
    ): Promise<BluetoothSessionCreateResponse> {
      return request("/sessions/bluetooth", {
        method: "POST",
        token,
        payload,
        parse: bluetoothSessionCreateResponseSchema.parse,
      })
    },
    getAttendanceSession(token: string, sessionId: string): Promise<AttendanceSessionSummary> {
      return request(`/sessions/${sessionId}`, {
        method: "GET",
        token,
        parse: attendanceSessionSummarySchema.parse,
      })
    },
    listAttendanceSessions(
      token: string,
      filters: AttendanceSessionHistoryListQuery = {},
    ): Promise<AttendanceSessionHistoryItem[]> {
      return request("/sessions", {
        method: "GET",
        token,
        query: toQuery(attendanceSessionHistoryListQuerySchema.parse(filters)),
        parse: attendanceSessionHistoryResponseSchema.parse,
      })
    },
    async listLiveAttendanceSessions(
      token: string,
      filters: LiveAttendanceSessionDiscoveryQuery = {},
    ): Promise<LiveAttendanceSessionSummary[]> {
      return request("/sessions/live", {
        method: "GET",
        token,
        query: toQuery(liveAttendanceSessionDiscoveryQuerySchema.parse(filters)),
        parse: liveAttendanceSessionsResponseSchema.parse,
      })
    },
    getAttendanceSessionDetail(token: string, sessionId: string): Promise<AttendanceSessionDetail> {
      return request(`/sessions/${sessionId}`, {
        method: "GET",
        token,
        parse: attendanceSessionDetailSchema.parse,
      })
    },
    listAttendanceSessionStudents(
      token: string,
      sessionId: string,
    ): Promise<AttendanceSessionStudentSummary[]> {
      return request(`/sessions/${sessionId}/students`, {
        method: "GET",
        token,
        parse: attendanceSessionStudentsResponseSchema.parse,
      })
    },
    updateAttendanceSessionAttendance(
      token: string,
      sessionId: string,
      payload: UpdateAttendanceSessionAttendanceRequest,
    ): Promise<UpdateAttendanceSessionAttendanceResponse> {
      return request(`/sessions/${sessionId}/attendance`, {
        method: "PATCH",
        token,
        payload: updateAttendanceSessionAttendanceRequestSchema.parse(payload),
        parse: updateAttendanceSessionAttendanceResponseSchema.parse,
      })
    },
    saveManualAttendanceUpdates(
      token: string,
      sessionId: string,
      payload: ManualAttendanceUpdateRequest,
    ): Promise<ManualAttendanceUpdateResponse> {
      return request(`/sessions/${sessionId}/attendance`, {
        method: "PATCH",
        token,
        payload: toLegacyManualAttendanceUpdateRequest(payload),
        parse: manualAttendanceUpdateResponseSchema.parse,
      })
    },
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
    getQrAttendanceSession(token: string, sessionId: string): Promise<AttendanceSessionSummary> {
      return this.getAttendanceSession(token, sessionId)
    },
    endAttendanceSession(token: string, sessionId: string): Promise<AttendanceSessionSummary> {
      return request(`/sessions/${sessionId}/end`, {
        method: "POST",
        token,
        parse: attendanceSessionSummarySchema.parse,
      })
    },
    endQrAttendanceSession(token: string, sessionId: string): Promise<AttendanceSessionSummary> {
      return this.endAttendanceSession(token, sessionId)
    },
    markQrAttendance(
      token: string,
      installId: string,
      payload: MarkQrAttendanceRequest,
    ): Promise<MarkQrAttendanceResponse> {
      return request("/attendance/qr/mark", {
        method: "POST",
        token,
        headers: buildTrustedDeviceHeaders(installId),
        payload: markQrAttendanceRequestSchema.parse(payload),
        parse: markQrAttendanceResponseSchema.parse,
      })
    },
    markBluetoothAttendance(
      token: string,
      installId: string,
      payload: MarkBluetoothAttendanceRequest,
    ): Promise<MarkBluetoothAttendanceResponse> {
      return request("/attendance/bluetooth/mark", {
        method: "POST",
        token,
        headers: buildTrustedDeviceHeaders(installId),
        payload: markBluetoothAttendanceRequestSchema.parse(payload),
        parse: markBluetoothAttendanceResponseSchema.parse,
      })
    },
    listClassroomAnnouncements(
      token: string,
      classroomId: string,
      filters: AnnouncementListQuery = {},
    ): Promise<AnnouncementSummary[]> {
      const query = announcementListQuerySchema.parse(filters)

      return request(`/classrooms/${classroomId}/stream`, {
        method: "GET",
        token,
        query: toQuery(query),
        parse: announcementsResponseSchema.parse,
      })
    },
    createClassroomAnnouncement(
      token: string,
      classroomId: string,
      payload: CreateAnnouncementRequest,
    ): Promise<AnnouncementSummary> {
      const requestPayload = createAnnouncementRequestSchema.parse(payload)

      return request(`/classrooms/${classroomId}/announcements`, {
        method: "POST",
        token,
        payload: requestPayload,
        parse: announcementSummarySchema.parse,
      })
    },
    listClassroomRoster(
      token: string,
      classroomId: string,
      filters: ClassroomRosterListQuery = {},
    ): Promise<ClassroomRosterMemberSummary[]> {
      const query = classroomRosterListQuerySchema.parse(filters)

      return request(`/classrooms/${classroomId}/students`, {
        method: "GET",
        token,
        query: toQuery(query),
        parse: classroomRosterResponseSchema.parse,
      })
    },
    listClassroomStudents(
      token: string,
      classroomId: string,
      filters: ClassroomStudentListQuery = {},
    ): Promise<ClassroomStudentSummary[]> {
      const query = classroomStudentListQuerySchema.parse(filters)

      return request(`/classrooms/${classroomId}/students`, {
        method: "GET",
        token,
        query: toQuery(query),
        parse: classroomStudentsResponseSchema.parse,
      })
    },
    addClassroomRosterMember(
      token: string,
      classroomId: string,
      payload: CreateClassroomRosterMemberRequest,
    ): Promise<ClassroomRosterMemberSummary> {
      const requestPayload = createClassroomRosterMemberRequestSchema.parse(payload)

      return request(`/classrooms/${classroomId}/students`, {
        method: "POST",
        token,
        payload: requestPayload,
        parse: classroomRosterMemberSummarySchema.parse,
      })
    },
    addClassroomStudent(
      token: string,
      classroomId: string,
      payload: AddClassroomStudentRequest,
    ): Promise<ClassroomStudentSummary> {
      const requestPayload = addClassroomStudentRequestSchema.parse(payload)

      return request(`/classrooms/${classroomId}/students`, {
        method: "POST",
        token,
        payload: requestPayload,
        parse: classroomRosterMemberSummarySchema.parse,
      })
    },
    updateClassroomRosterMember(
      token: string,
      classroomId: string,
      enrollmentId: string,
      payload: UpdateClassroomRosterMemberRequest,
    ): Promise<ClassroomRosterMemberSummary> {
      const requestPayload = updateClassroomRosterMemberRequestSchema.parse(payload)

      return request(`/classrooms/${classroomId}/students/${enrollmentId}`, {
        method: "PATCH",
        token,
        payload: requestPayload,
        parse: classroomRosterMemberSummarySchema.parse,
      })
    },
    updateClassroomStudent(
      token: string,
      classroomId: string,
      enrollmentId: string,
      payload: UpdateClassroomStudentRequest,
    ): Promise<ClassroomStudentSummary> {
      const requestPayload = updateClassroomStudentRequestSchema.parse(payload)

      return request(`/classrooms/${classroomId}/students/${enrollmentId}`, {
        method: "PATCH",
        token,
        payload: requestPayload,
        parse: classroomRosterMemberSummarySchema.parse,
      })
    },
    removeClassroomRosterMember(
      token: string,
      classroomId: string,
      enrollmentId: string,
    ): Promise<ClassroomRosterMemberSummary> {
      return request(`/classrooms/${classroomId}/students/${enrollmentId}`, {
        method: "DELETE",
        token,
        parse: classroomRosterMemberSummarySchema.parse,
      })
    },
    removeClassroomStudent(
      token: string,
      classroomId: string,
      enrollmentId: string,
    ): Promise<ClassroomStudentSummary> {
      return request(`/classrooms/${classroomId}/students/${enrollmentId}`, {
        method: "DELETE",
        token,
        parse: classroomRosterMemberSummarySchema.parse,
      })
    },
    listRosterImportJobs(
      token: string,
      classroomId: string,
      filters: RosterImportJobListQuery = {},
    ): Promise<RosterImportJobSummary[]> {
      const query = rosterImportJobListQuerySchema.parse(filters)

      return request(`/classrooms/${classroomId}/roster-imports`, {
        method: "GET",
        token,
        query: toQuery(query),
        parse: rosterImportJobsResponseSchema.parse,
      })
    },
    getRosterImportJob(
      token: string,
      classroomId: string,
      jobId: string,
    ): Promise<RosterImportJobDetail> {
      return request(`/classrooms/${classroomId}/roster-imports/${jobId}`, {
        method: "GET",
        token,
        parse: rosterImportJobDetailSchema.parse,
      })
    },
    createRosterImportJob(
      token: string,
      classroomId: string,
      payload: CreateRosterImportJobRequest,
    ): Promise<RosterImportJobDetail> {
      const requestPayload = createRosterImportJobRequestSchema.parse(payload)

      return request(`/classrooms/${classroomId}/roster-imports`, {
        method: "POST",
        token,
        payload: requestPayload,
        parse: rosterImportJobDetailSchema.parse,
      })
    },
    applyRosterImportJob(
      token: string,
      classroomId: string,
      jobId: string,
    ): Promise<RosterImportJobDetail> {
      return request(`/classrooms/${classroomId}/roster-imports/${jobId}/apply`, {
        method: "POST",
        token,
        parse: rosterImportJobDetailSchema.parse,
      })
    },
    registerDevice(
      token: string,
      payload: DeviceRegistrationRequest,
    ): Promise<DeviceRegistrationResponse> {
      return request("/devices/register", {
        method: "POST",
        token,
        payload,
        parse: deviceRegistrationResponseSchema.parse,
      })
    },
    getTrustedAttendanceReady(
      token: string,
      installId: string,
    ): Promise<TrustedDeviceAttendanceReadyResponse> {
      return request("/devices/trust/attendance-ready", {
        method: "GET",
        token,
        headers: buildTrustedDeviceHeaders(installId),
        parse: trustedDeviceAttendanceReadyResponseSchema.parse,
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
    clearStudentDeviceRegistrations(
      token: string,
      studentId: string,
      payload: ClearStudentDeviceRegistrationsRequest,
    ): Promise<ClearStudentDeviceRegistrationsResponse> {
      return request(`/admin/device-bindings/${studentId}/delink`, {
        method: "POST",
        token,
        payload: clearStudentDeviceRegistrationsRequestSchema.parse(payload),
        parse: clearStudentDeviceRegistrationsResponseSchema.parse,
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
  }
}

function toLegacyManualAttendanceUpdateRequest(payload: ManualAttendanceUpdateRequest) {
  const requestPayload = manualAttendanceUpdateRequestSchema.parse(payload)

  return updateAttendanceSessionAttendanceRequestSchema.parse({
    changes: requestPayload.updates.map((update) => ({
      attendanceRecordId: update.attendanceRecordId,
      status: manualAttendanceActionToStatusMap[update.action],
    })),
  })
}

function toQuery(
  value: Record<string, string | boolean | number | undefined>,
): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      entry === undefined ? undefined : String(entry),
    ]),
  )
}
