import type { ScheduleExceptionType, ScheduleSlotStatus } from "@attendease/contracts"

export interface ScheduleSlotDraft {
  id: string | null
  weekday: number
  startMinutes: number
  endMinutes: number
  locationLabel: string
  status: ScheduleSlotStatus
}

export interface ScheduleExceptionDraft {
  id: string | null
  scheduleSlotId: string | null
  exceptionType: ScheduleExceptionType
  effectiveDate: string
  startMinutes: number | null
  endMinutes: number | null
  locationLabel: string
  reason: string
}

export interface ScheduleDraftState {
  slots: ScheduleSlotDraft[]
  exceptions: ScheduleExceptionDraft[]
}

export interface SemesterVisibilityRow {
  semesterId: string
  classroomCount: number
  activeCount: number
  completedCount: number
  requiresTrustedDeviceCount: number
}

export interface ImportMonitorRow {
  classroomId: string
  classroomCode: string
  classroomTitle: string
  jobId: string
  status: string
  totalRows: number
  validRows: number
  invalidRows: number
  appliedRows: number
  createdAt: string
  reviewRequired: boolean
}

export interface QrSessionShellSection {
  id: string
  title: string
  description: string
}

export interface QrSessionShellModel {
  title: string
  eyebrow: string
  subtitle: string
  sections: QrSessionShellSection[]
}

export interface QrSessionCreateDraft {
  lectureId: string
  sessionDurationMinutes: string
  gpsRadiusMeters: string
  anchorType: "CLASSROOM_FIXED" | "CAMPUS_ZONE" | "TEACHER_SELECTED"
  anchorLatitude: string
  anchorLongitude: string
  anchorLabel: string
}

export interface QrSessionLiveModel {
  statusLabel: string
  countdownLabel: string
  remainingMilliseconds: number
  refreshIntervalMs: number | false
  markedCount: number
  totalCount: number
  attendanceRatioLabel: string
  qrExpiresLabel: string
  qrRefreshLabel: string
  locationRuleLabel: string
  liveSummaryLabel: string
  canDisplayQr: boolean
}

export interface QrSessionRosterRow {
  attendanceRecordId: string
  studentDisplayName: string
  secondaryLabel: string
  markedAtLabel: string
}

export interface QrSessionRosterModel {
  presentRows: QrSessionRosterRow[]
  absentRows: QrSessionRosterRow[]
  presentSummaryLabel: string
  absentSummaryLabel: string
  latestMarkedLabel: string
}
