export const teacherWorkflowRoutes = {
  dashboard: "/teacher/dashboard",
  classrooms: "/teacher/classrooms",
  classroomCreate: "/teacher/classrooms/new",
  semesters: "/teacher/semesters",
  imports: "/teacher/imports",
  sessionHistory: "/teacher/sessions/history",
  classroomDetail(classroomId: string) {
    return `/teacher/classrooms/${classroomId}`
  },
  classroomRoster(classroomId: string) {
    return `/teacher/classrooms/${classroomId}/roster`
  },
  classroomImports(classroomId: string) {
    return `/teacher/classrooms/${classroomId}/imports`
  },
  classroomSchedule(classroomId: string) {
    return `/teacher/classrooms/${classroomId}/schedule`
  },
  classroomStream(classroomId: string) {
    return `/teacher/classrooms/${classroomId}/stream`
  },
  classroomLectures(classroomId: string) {
    return `/teacher/classrooms/${classroomId}/lectures`
  },
  lectureSession(classroomId: string, lectureId: string) {
    return `/teacher/classrooms/${classroomId}/lectures/${lectureId}`
  },
  classroomReports(classroomId: string) {
    return `/teacher/classrooms/${classroomId}/reports`
  },
  activeSession(sessionId: string) {
    return `/teacher/sessions/active/${sessionId}`
  },
  activeSessionProjector(sessionId: string) {
    return `/teacher/sessions/active/${sessionId}/projector`
  },
} as const

export const adminWorkflowRoutes = {
  dashboard: "/admin/dashboard",
  devices: "/admin/devices",
  records: "/admin/records",
  recordsDepartment(department: string) {
    return `/admin/records/${encodeURIComponent(department)}`
  },
  recordsTeacher(department: string, teacherId: string) {
    return `/admin/records/${encodeURIComponent(department)}/${teacherId}`
  },
  recordsCourse(department: string, teacherId: string, courseOfferingId: string) {
    return `/admin/records/${encodeURIComponent(department)}/${teacherId}/${courseOfferingId}`
  },
  users: "/admin/users",
  usersStudents: "/admin/users?tab=students",
  usersTeachers: "/admin/users?tab=teachers",
  usersStudentProfile(studentId: string) {
    return `/admin/users/students/${studentId}`
  },
  usersTeacherProfile(teacherId: string) {
    return `/admin/users/teachers/${teacherId}`
  },
  communication: "/admin/communication",
  reports: "/admin/reports",
  settings: "/admin/settings",
} as const

export const webWorkflowQueryKeys = {
  teacherAssignments(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "teacher-assignments", filters ?? {}] as const
  },
  classrooms(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "classrooms", filters ?? {}] as const
  },
  classroomDetail(classroomId: string) {
    return ["web-workflows", "classroom-detail", classroomId] as const
  },
  classroomRoster(classroomId: string, filters?: Record<string, string | undefined>) {
    return ["web-workflows", "classroom-roster", classroomId, filters ?? {}] as const
  },
  classroomImports(classroomId: string, filters?: Record<string, string | undefined>) {
    return ["web-workflows", "classroom-imports", classroomId, filters ?? {}] as const
  },
  classroomImportDetail(classroomId: string, jobId: string) {
    return ["web-workflows", "classroom-import-detail", classroomId, jobId] as const
  },
  classroomSchedule(classroomId: string) {
    return ["web-workflows", "classroom-schedule", classroomId] as const
  },
  classroomStream(classroomId: string, limit?: number) {
    return ["web-workflows", "classroom-stream", classroomId, limit ?? 25] as const
  },
  classroomLectures(classroomId: string) {
    return ["web-workflows", "classroom-lectures", classroomId] as const
  },
  attendanceSession(sessionId: string) {
    return ["web-workflows", "attendance-session", sessionId] as const
  },
  attendanceSessionStudents(sessionId: string) {
    return ["web-workflows", "attendance-session-students", sessionId] as const
  },
  sessionHistory(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "session-history", filters ?? {}] as const
  },
  teacherDaywiseReports(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "teacher-daywise-reports", filters ?? {}] as const
  },
  teacherSubjectwiseReports(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "teacher-subjectwise-reports", filters ?? {}] as const
  },
  teacherStudentPercentageReports(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "teacher-student-percentage-reports", filters ?? {}] as const
  },
  exportJobs(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "export-jobs", filters ?? {}] as const
  },
  analyticsTrends(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "analytics-trends", filters ?? {}] as const
  },
  analyticsDistribution(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "analytics-distribution", filters ?? {}] as const
  },
  analyticsComparisons(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "analytics-comparisons", filters ?? {}] as const
  },
  analyticsModes(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "analytics-modes", filters ?? {}] as const
  },
  analyticsStudentTimeline(studentId: string, filters?: Record<string, string | undefined>) {
    return ["web-workflows", "analytics-student-timeline", studentId, filters ?? {}] as const
  },
  analyticsSessionDrilldown(sessionId: string) {
    return ["web-workflows", "analytics-session-drilldown", sessionId] as const
  },
  emailAutomationRules(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "email-automation-rules", filters ?? {}] as const
  },
  emailDispatchRuns(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "email-dispatch-runs", filters ?? {}] as const
  },
  emailLogs(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "email-logs", filters ?? {}] as const
  },
  teacherImports() {
    return ["web-workflows", "teacher-imports"] as const
  },
  teacherSemesterVisibility() {
    return ["web-workflows", "teacher-semester-visibility"] as const
  },
  semesters(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "semesters", filters ?? {}] as const
  },
  adminDashboardStats() {
    return ["web-workflows", "admin-dashboard-stats"] as const
  },
  adminDashboardSessionsGraph(range: string) {
    return ["web-workflows", "admin-dashboard-sessions", range] as const
  },
  adminDashboardBranchComparison() {
    return ["web-workflows", "admin-dashboard-branches"] as const
  },
  adminDashboardLeaderboard(direction: string) {
    return ["web-workflows", "admin-dashboard-leaderboard", direction] as const
  },
  adminStudents(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "admin-students", filters ?? {}] as const
  },
  adminStudentDetail(studentId: string) {
    return ["web-workflows", "admin-student-detail", studentId] as const
  },
  adminTeachers(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "admin-teachers", filters ?? {}] as const
  },
  adminTeacherDetail(teacherId: string) {
    return ["web-workflows", "admin-teacher-detail", teacherId] as const
  },
  adminClassrooms(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "admin-classrooms", filters ?? {}] as const
  },
  adminClassroomDetail(classroomId: string) {
    return ["web-workflows", "admin-classroom-detail", classroomId] as const
  },
  adminImports() {
    return ["web-workflows", "admin-imports"] as const
  },
  adminRecordsDepartments() {
    return ["web-workflows", "admin-records", "departments"] as const
  },
  adminRecordsTeachersInDepartment(department: string) {
    return ["web-workflows", "admin-records", "department-teachers", department] as const
  },
  adminRecordsCoursesByTeacher(teacherId: string) {
    return ["web-workflows", "admin-records", "teacher-courses", teacherId] as const
  },
  adminRecordsStudentsInCourse(courseOfferingId: string) {
    return ["web-workflows", "admin-records", "course-students", courseOfferingId] as const
  },
  adminRecordsCourseSearch(query: string) {
    return ["web-workflows", "admin-records", "course-search", query] as const
  },
  adminUsersFilterOptions() {
    return ["web-workflows", "admin-users", "filter-options"] as const
  },
  adminUsersStudents(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "admin-users", "students", filters ?? {}] as const
  },
  adminUsersStudentProfile(studentId: string) {
    return ["web-workflows", "admin-users", "student-profile", studentId] as const
  },
  adminUsersTeachers(filters?: Record<string, string | undefined>) {
    return ["web-workflows", "admin-users", "teachers", filters ?? {}] as const
  },
  adminUsersTeacherProfile(teacherId: string) {
    return ["web-workflows", "admin-users", "teacher-profile", teacherId] as const
  },
  adminRecentReports() {
    return ["web-workflows", "admin-reports", "recent"] as const
  },
  adminSettingsAcademic() {
    return ["web-workflows", "admin-settings", "academic"] as const
  },
  adminSettingsAcademicLists() {
    return ["web-workflows", "admin-settings", "academic-lists"] as const
  },
  adminSettingsSystem() {
    return ["web-workflows", "admin-settings", "system"] as const
  },
  adminSettingsAdmins() {
    return ["web-workflows", "admin-settings", "admins"] as const
  },
  profile() {
    return ["web-workflows", "profile"] as const
  },
} as const
