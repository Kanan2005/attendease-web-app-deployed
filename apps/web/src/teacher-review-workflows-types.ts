import type {
  AttendanceMode,
  AttendanceRecordStatus,
  AttendanceSessionStatus,
} from "@attendease/contracts"

export type TeacherWebReviewTone = "primary" | "success" | "warning" | "danger"

export interface TeacherWebFilterOption {
  value: string
  label: string
}

export interface TeacherWebAcademicFilterOptions {
  classroomOptions: TeacherWebFilterOption[]
  classOptions: TeacherWebFilterOption[]
  sectionOptions: TeacherWebFilterOption[]
  subjectOptions: TeacherWebFilterOption[]
}

export interface TeacherWebHistoryFilterDraft {
  classroomId: string
  classId: string
  sectionId: string
  subjectId: string
  mode: AttendanceMode | "ALL"
  status: AttendanceSessionStatus | "ALL"
  fromDate: string
  toDate: string
}

export interface TeacherWebReportFilterDraft {
  classroomId: string
  classId: string
  sectionId: string
  subjectId: string
  fromDate: string
  toDate: string
}

export interface TeacherWebSummaryCard {
  label: string
  value: string
  tone: TeacherWebReviewTone
}

export interface TeacherWebSessionHistorySummaryModel {
  summaryCards: TeacherWebSummaryCard[]
  filterSummary: string
  availabilityMessage: string
}

export interface TeacherWebSessionRosterRowModel {
  attendanceRecordId: string
  studentDisplayName: string
  studentEmail: string
  studentRollNumber: string | null
  identityLabel: string
  markedAt: string | null
  savedStatus: AttendanceRecordStatus
  effectiveStatus: AttendanceRecordStatus
  statusTone: TeacherWebReviewTone
  pendingChangeLabel: string | null
  actionLabel: string | null
  actionTargetStatus: AttendanceRecordStatus | null
}

export interface TeacherWebSessionRosterModel {
  presentRows: TeacherWebSessionRosterRowModel[]
  absentRows: TeacherWebSessionRosterRowModel[]
  presentSummary: string
  absentSummary: string
}

export interface TeacherWebSessionDetailOverviewModel {
  summaryCards: TeacherWebSummaryCard[]
  rosterSummary: string
  timingSummary: string
  correctionSummary: string
  presentSectionSubtitle: string
  absentSectionSubtitle: string
  securitySummary: string | null
}

export interface TeacherWebSessionDetailStatusModel {
  title: string
  message: string
  tone: TeacherWebReviewTone
}

export interface TeacherWebReportSubjectRowModel {
  subjectId: string
  classroomId: string
  title: string
  courseContextLabel: string
  attendancePercentage: number
  attendanceLabel: string
  sessionSummary: string
  lastSessionAt: string | null
  tone: TeacherWebReviewTone
}

export interface TeacherWebReportDaywiseRowModel {
  attendanceDate: string
  classroomId: string
  title: string
  dateLabel: string
  attendancePercentage: number
  attendanceLabel: string
  sessionSummary: string
  lastSessionAt: string | null
  tone: TeacherWebReviewTone
}

export interface TeacherWebReportStudentRowModel {
  studentId: string
  studentEmail: string
  studentParentEmail: string | null
  title: string
  supportingLabel: string
  attendancePercentage: number
  attendanceLabel: string
  sessionSummary: string
  followUpLabel: string
  emailSentCount: number
  lastSessionAt: string | null
  tone: TeacherWebReviewTone
}

export interface TeacherWebReportOverviewModel {
  summaryCards: TeacherWebSummaryCard[]
  filterSummary: string
  availabilityMessage: string
  subjectSummary: string
  studentSummary: string
  daywiseSummary: string
  subjectRows: TeacherWebReportSubjectRowModel[]
  studentRows: TeacherWebReportStudentRowModel[]
  daywiseRows: TeacherWebReportDaywiseRowModel[]
  hasAnyData: boolean
}
