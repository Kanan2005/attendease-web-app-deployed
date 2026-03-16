import type {
  AttendanceMode,
  AuthenticatedUser,
  ClassroomSchedule,
  LectureSummary,
  LiveAttendanceSessionSummary,
  StudentAttendanceHistoryItem,
  StudentClassroomMembershipSummary,
  StudentReportOverview,
  StudentSubjectReportDetail,
  StudentSubjectReportSummary,
} from "@attendease/contracts"

import type { StudentAttendanceGateModel } from "./device-trust"
import type { CardTone } from "./student-models"

export interface StudentScheduleWeeklyItem {
  id: string
  weekdayLabel: string
  timeLabel: string
  locationLabel: string | null
}

export interface StudentScheduleExceptionItem {
  id: string
  title: string
  effectiveDateLabel: string
  timeLabel: string
  locationLabel: string | null
  reason: string | null
  tone: CardTone
}

export interface StudentUpcomingLectureItem {
  id: string
  title: string
  timeLabel: string
  status: LectureSummary["status"]
}

export interface StudentScheduleOverviewModel {
  weeklyItems: StudentScheduleWeeklyItem[]
  exceptionItems: StudentScheduleExceptionItem[]
  upcomingLectures: StudentUpcomingLectureItem[]
}

export interface StudentReportOverviewModel {
  trackedClassroomCount: number
  totalSessions: number
  presentSessions: number
  absentSessions: number
  attendancePercentage: number
  lastSessionAt: string | null
}

export interface StudentAttendanceInsightModel {
  title: string
  message: string
  tone: CardTone
}

export interface StudentSubjectReportSummaryModel {
  subjectId: string
  subjectCode: string
  subjectTitle: string
  classroomCount: number
  totalSessions: number
  presentSessions: number
  absentSessions: number
  attendancePercentage: number
  lastSessionAt: string | null
}

export interface StudentSubjectReportClassroomModel {
  classroomId: string
  classroomCode: string
  classroomTitle: string
  totalSessions: number
  presentSessions: number
  absentSessions: number
  attendancePercentage: number
  lastSessionAt: string | null
}

export interface StudentSubjectReportModel extends StudentSubjectReportSummaryModel {
  classrooms: StudentSubjectReportClassroomModel[]
}

export interface StudentAttendanceHistorySummaryModel {
  totalRecords: number
  presentCount: number
  absentCount: number
  attendancePercentage: number
  lastRecordedAt: string | null
}

export interface StudentAttendanceHistoryRowModel {
  attendanceRecordId: string
  sessionId: string
  classroomId: string
  title: string
  subtitle: string
  statusLabel: string
  statusTone: CardTone
  timeLabel: string
  detailLabel: string
}

export interface StudentDeviceStatusSummaryModel {
  label: string
  tone: CardTone
  helperText: string
}

export interface StudentAttendanceCandidate {
  sessionId: string
  classroomId: string
  subjectId: string
  classroomTitle: string
  lectureId: string | null
  lectureTitle: string
  mode: Extract<AttendanceMode, "QR_GPS" | "BLUETOOTH">
  timestamp: string
  requiresTrustedDevice: boolean
}

export interface StudentAttendanceOverviewModel {
  totalOpenSessions: number
  qrReadyCount: number
  bluetoothReadyCount: number
  recommendedMode: Extract<AttendanceMode, "QR_GPS" | "BLUETOOTH"> | null
  gateTone: StudentAttendanceGateModel["tone"]
}

export interface StudentCourseDiscoveryCardModel {
  classroomId: string
  title: string
  subtitle: string
  attendanceTitle: string
  attendanceMessage: string
  attendanceTone: CardTone
  updatesLabel: string
  scheduleLabel: string
  hasOpenAttendance: boolean
}

export interface StudentClassroomDetailSummaryModel {
  title: string
  subtitle: string
  attendanceTitle: string
  attendanceMessage: string
  attendanceTone: CardTone
  updatesLabel: string
  scheduleLabel: string
  nextSessionLabel: string
  openAttendanceCount: number
}

export interface StudentProfileDraft {
  displayName: string
  preferredShortName: string
}
