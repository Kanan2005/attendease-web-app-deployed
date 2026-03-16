import type {
  AttendanceRecordStatus,
  AttendanceSessionDetail,
  AttendanceSessionEditability,
  AttendanceSessionStatus,
  AttendanceSessionStudentSummary,
  ClassroomSummary,
  LectureSummary,
  RosterImportRowInput,
  TeacherDaywiseAttendanceReportRow,
  TeacherStudentAttendancePercentageReportRow,
  TeacherSubjectwiseAttendanceReportRow,
} from "@attendease/contracts"

import type { TeacherCardTone } from "./teacher-models"

export type TeacherBluetoothAdvertiserState =
  | "IDLE"
  | "READY"
  | "ADVERTISING"
  | "STOPPED"
  | "PERMISSION_REQUIRED"
  | "FAILED"

export interface TeacherBluetoothCandidate {
  sessionId: string
  classroomId: string
  classroomTitle: string
  lectureId: string | null
  lectureTitle: string
  durationMinutes: number
  bluetoothRotationWindowSeconds: number
  status: LectureSummary["status"] | "SHELL_ONLY"
}

export interface TeacherBluetoothSessionShellSnapshot {
  title: string
  message: string
  stateTone: TeacherCardTone
  canOpenActiveShell: boolean
}

export interface TeacherBluetoothSetupStatusModel {
  title: string
  message: string
  stateTone: TeacherCardTone
  startLabel: string
}

export interface TeacherBluetoothControlModel {
  startLabel: string
  stopLabel: string
  canStart: boolean
  canStop: boolean
  helperMessage: string
}

export interface TeacherBluetoothRecoveryModel {
  title: string
  message: string
  stateTone: TeacherCardTone
  shouldShow: boolean
  shouldRefreshBluetooth: boolean
  shouldRetryBroadcast: boolean
  shouldOfferEndSession: boolean
}

export interface TeacherBluetoothEndSessionModel {
  buttonLabel: string
  helperMessage: string
  buttonDisabled: boolean
}

export interface TeacherBluetoothActiveStatusModel {
  title: string
  message: string
  stateTone: TeacherCardTone
}

export interface TeacherSessionRosterRowModel {
  attendanceRecordId: string
  studentDisplayName: string
  studentEmail: string
  studentRollNumber: string | null
  identityLabel: string
  markedAt: string | null
  savedStatus: AttendanceRecordStatus
  effectiveStatus: AttendanceRecordStatus
  statusTone: TeacherCardTone
  pendingChangeLabel: string | null
  actionLabel: string | null
  actionTargetStatus: AttendanceRecordStatus | null
}

export interface TeacherSessionRosterModel {
  presentRows: TeacherSessionRosterRowModel[]
  absentRows: TeacherSessionRosterRowModel[]
  presentSummary: string
  absentSummary: string
}

export interface TeacherSessionDetailStatusModel {
  title: string
  message: string
  stateTone: TeacherCardTone
}

export interface TeacherSessionDetailOverviewModel {
  summaryCards: TeacherReportCard[]
  rosterSummary: string
  timingSummary: string
  correctionSummary: string
  presentSectionSubtitle: string
  absentSectionSubtitle: string
}

export interface TeacherRosterImportDraftModel {
  rows: RosterImportRowInput[]
  invalidLines: string[]
}

export interface TeacherReportCard {
  label: string
  value: string
  tone: TeacherCardTone
}

export interface TeacherSubjectReportRow {
  subjectId: string
  subjectCode: string
  subjectTitle: string
  classroomId: string
  classroomCode: string
  classroomTitle: string
  classroomCount: number
  totalSessions: number
  totalStudents: number
  presentCount: number
  absentCount: number
  attendancePercentage: number
  lastSessionAt: string | null
  attendanceLabel: string
  sessionSummary: string
  lastActivityLabel: string
  tone: TeacherCardTone
}

export interface TeacherDaywiseReportRowModel {
  attendanceDate: string
  classroomId: string
  classroomTitle: string
  subjectId: string
  subjectTitle: string
  sessionCount: number
  totalStudents: number
  presentCount: number
  absentCount: number
  attendancePercentage: number
  lastSessionAt: string | null
  attendanceLabel: string
  sessionSummary: string
  lastActivityLabel: string
  tone: TeacherCardTone
}

export interface TeacherStudentReportRowModel {
  studentId: string
  studentDisplayName: string
  studentEmail: string
  studentRollNumber: string | null
  enrollmentStatus: TeacherStudentAttendancePercentageReportRow["enrollmentStatus"]
  classroomId: string
  classroomTitle: string
  subjectId: string
  subjectTitle: string
  totalSessions: number
  presentSessions: number
  absentSessions: number
  attendancePercentage: number
  lastSessionAt: string | null
  attendanceLabel: string
  sessionSummary: string
  followUpLabel: string
  tone: TeacherCardTone
}

export interface TeacherReportFilterOption {
  value: string
  label: string
}

export interface TeacherReportOverviewModel {
  summaryCards: TeacherReportCard[]
  subjectRows: TeacherSubjectReportRow[]
  daywiseRows: TeacherDaywiseReportRowModel[]
  studentRows: TeacherStudentReportRowModel[]
  availabilityMessage: string
  filterSummary: string
  subjectSummary: string
  studentSummary: string
  daywiseSummary: string
  hasAnyData: boolean
}

export interface TeacherExportAvailabilityModel {
  canRequestExport: boolean
  title: string
  message: string
  supportedFormats: string[]
}

export interface TeacherExportRequestModel {
  buttonLabel: string
  buttonDisabled: boolean
  helperMessage: string
}

export interface TeacherJoinCodeActionModel {
  currentCodeLabel: string
  expiryLabel: string
  resetButtonLabel: string
  helperMessage: string
}
