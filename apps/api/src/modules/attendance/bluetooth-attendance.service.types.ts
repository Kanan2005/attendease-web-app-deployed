import type { ApiEnv } from "@attendease/config"

import type { DatabaseService } from "../../database/database.service.js"
import type { ClassroomsService } from "../academic/classrooms.service.js"
import type { LecturesService } from "../academic/lectures.service.js"
import type { SchedulingService } from "../academic/scheduling.service.js"
import type { AttendanceRealtimeService } from "./attendance-realtime.service.js"
import type { BluetoothTokenService } from "./bluetooth-token.service.js"

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
      detectionSlice: number
      detectionRssi: number | null
    }
  | {
      kind: "SESSION_INACTIVE"
      session: AttendanceSessionRecord
      expiredDuringAttempt: boolean
    }
  | {
      kind: "TOKEN_INVALID"
      session: AttendanceSessionRecord | null
      reason: import("@attendease/contracts").BluetoothTokenValidationReason
      detectionSlice: number | null
      publicId: string | null
    }
  | {
      kind: "DUPLICATE"
    }
  | {
      kind: "NOT_ELIGIBLE"
    }

export type BluetoothAttendanceServiceContext = {
  env: ApiEnv
  database: DatabaseService
  classroomsService: ClassroomsService
  lecturesService: LecturesService
  schedulingService: SchedulingService
  bluetoothTokenService: BluetoothTokenService
  realtimeService: AttendanceRealtimeService
}
