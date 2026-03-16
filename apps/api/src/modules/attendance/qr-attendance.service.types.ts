import type { GpsValidationReason, QrTokenValidationReason } from "@attendease/contracts"

import type { DatabaseService } from "../../database/database.service.js"
import type { ClassroomsService } from "../academic/classrooms.service.js"
import type { LecturesService } from "../academic/lectures.service.js"
import type { SchedulingService } from "../academic/scheduling.service.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import type { TrustedDeviceRequestContext } from "../devices/devices.types.js"
import type { AttendanceRealtimeService } from "./attendance-realtime.service.js"
import type { GpsValidatorService } from "./gps-validator.service.js"
import type { LocationAnchorService } from "./location-anchor.service.js"
import type { QrTokenService } from "./qr-token.service.js"

export type AttendanceSessionRecord = {
  id: string
  courseOfferingId: string
  lectureId: string | null
  teacherAssignmentId: string
  teacherId: string
  mode: "QR_GPS" | "BLUETOOTH" | "MANUAL"
  status: "DRAFT" | "ACTIVE" | "ENDED" | "CANCELLED" | "EXPIRED"
  startedAt: Date | null
  scheduledEndAt: Date | null
  endedAt: Date | null
  editableUntil: Date | null
  durationSeconds: number | null
  qrSeed: string | null
  bleSeed: string | null
  blePublicId: string | null
  bleProtocolVersion: number | null
  gpsAnchorType: "CLASSROOM_FIXED" | "CAMPUS_ZONE" | "TEACHER_SELECTED" | null
  gpsCenterLatitude: { toNumber: () => number } | null
  gpsCenterLongitude: { toNumber: () => number } | null
  gpsAnchorLabel: string | null
  gpsRadiusMeters: number | null
  qrRotationWindowSeconds: number | null
  bluetoothRotationWindowSeconds: number | null
  rosterSnapshotCount: number
  presentCount: number
  absentCount: number
}

export type SessionStatePublishRecord = {
  id: string
  status: "DRAFT" | "ACTIVE" | "ENDED" | "CANCELLED" | "EXPIRED"
  endedAt: Date | null
  editableUntil: Date | null
}

export type MarkAttendanceAttemptResult =
  | {
      kind: "SUCCESS"
      session: AttendanceSessionRecord
      attendanceRecord: {
        id: string
        status: "PRESENT" | "ABSENT"
        markSource: "QR_GPS" | "BLUETOOTH" | "MANUAL" | null
        markedAt: Date | null
      }
      distanceMeters: number
      accuracyMeters: number
    }
  | {
      kind: "SESSION_INACTIVE"
      session: AttendanceSessionRecord
      expiredDuringAttempt: boolean
    }
  | {
      kind: "TOKEN_INVALID"
      reason: QrTokenValidationReason
    }
  | {
      kind: "GPS_INVALID"
      session: AttendanceSessionRecord
      reason: GpsValidationReason
      distanceMeters: number | null
      accuracyMeters: number
      qrSlice: number
    }
  | {
      kind: "DUPLICATE"
    }

export type QrAttendanceServiceContext = {
  database: DatabaseService
  classroomsService: ClassroomsService
  lecturesService: LecturesService
  schedulingService: SchedulingService
  locationAnchorService: LocationAnchorService
  gpsValidatorService: GpsValidatorService
  qrTokenService: QrTokenService
  realtimeService: AttendanceRealtimeService
}

export type SuspiciousLocationFailureInput = {
  auth: AuthRequestContext
  trustedDevice: TrustedDeviceRequestContext
  session: AttendanceSessionRecord
  reason: "OUT_OF_RADIUS" | "ACCURACY_TOO_LOW"
  distanceMeters: number | null
  accuracyMeters: number
  qrSlice: number
}
