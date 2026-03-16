export type ClassroomWithRelations = {
  id: string
  semesterId: string
  classId: string
  sectionId: string
  subjectId: string
  primaryTeacherId: string
  createdByUserId: string
  code: string
  displayTitle: string
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED"
  defaultAttendanceMode: "QR_GPS" | "BLUETOOTH" | "MANUAL"
  defaultGpsRadiusMeters: number
  defaultSessionDurationMinutes: number
  qrRotationWindowSeconds: number
  bluetoothRotationWindowSeconds: number
  timezone: string
  requiresTrustedDevice: boolean
  archivedAt: Date | null
  semester?: {
    id: string
    code: string
    title: string
    status: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED"
    startDate: Date
    endDate: Date
  }
  academicClass?: {
    id: string
    code: string
    title: string
  }
  section?: {
    id: string
    code: string
    title: string
  }
  subject?: {
    id: string
    code: string
    title: string
  }
  primaryTeacher?: {
    id: string
    displayName: string
  }
  joinCodes: {
    id: string
    courseOfferingId: string
    code: string
    status: "ACTIVE" | "EXPIRED" | "REVOKED"
    expiresAt: Date
  }[]
  scheduleSlots?: {
    id: string
    courseOfferingId: string
    weekday: number
    startMinutes: number
    endMinutes: number
    locationLabel: string | null
    status: "ACTIVE" | "ARCHIVED"
  }[]
  scheduleExceptions?: {
    id: string
    courseOfferingId: string
    scheduleSlotId: string | null
    exceptionType: "CANCELLED" | "RESCHEDULED" | "ONE_OFF"
    effectiveDate: Date
    startMinutes: number | null
    endMinutes: number | null
    locationLabel: string | null
    reason: string | null
  }[]
}

export type ClassroomAccessContext = {
  id: string
  semesterId: string
  classId: string
  sectionId: string
  subjectId: string
  primaryTeacherId: string
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED"
  semester: {
    id: string
    status: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED"
    startDate: Date
    endDate: Date
  }
}

export type ClassroomScope = {
  semesterId: string
  classId: string
  sectionId: string
  subjectId: string
}
