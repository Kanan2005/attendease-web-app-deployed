import { z } from "zod"

import {
  attendanceLocationAnchorTypeSchema,
  attendanceSessionSummarySchema,
} from "./attendance.core"
import { isoDateTimeSchema } from "./attendance.internal"

export const createQrSessionRequestSchema = z.object({
  classroomId: z.string().min(1),
  lectureId: z.string().min(1).optional(),
  lectureDate: isoDateTimeSchema.optional(),
  lectureTitle: z.string().trim().min(1).max(120).optional(),
  scheduleSlotId: z.string().min(1).optional(),
  scheduleExceptionId: z.string().min(1).optional(),
  sessionDurationMinutes: z.coerce.number().int().min(1).max(240).optional(),
  gpsRadiusMeters: z.coerce.number().int().min(1).max(5000).optional(),
  anchorType: attendanceLocationAnchorTypeSchema.default("TEACHER_SELECTED"),
  anchorLatitude: z.coerce.number().min(-90).max(90),
  anchorLongitude: z.coerce.number().min(-180).max(180),
  anchorLabel: z.string().trim().min(1).max(160).optional(),
})
export type CreateQrSessionRequest = z.infer<typeof createQrSessionRequestSchema>

export const attendanceSessionParamsSchema = z.object({
  sessionId: z.string().min(1),
})
export type AttendanceSessionParams = z.infer<typeof attendanceSessionParamsSchema>

export const qrSessionCreateResponseSchema = attendanceSessionSummarySchema
export type QrSessionCreateResponse = z.infer<typeof qrSessionCreateResponseSchema>

export const endAttendanceSessionResponseSchema = attendanceSessionSummarySchema
export type EndAttendanceSessionResponse = z.infer<typeof endAttendanceSessionResponseSchema>

export const createBluetoothSessionRequestSchema = z.object({
  classroomId: z.string().min(1),
  lectureId: z.string().min(1).optional(),
  lectureDate: isoDateTimeSchema.optional(),
  lectureTitle: z.string().trim().min(1).max(120).optional(),
  scheduleSlotId: z.string().min(1).optional(),
  scheduleExceptionId: z.string().min(1).optional(),
  sessionDurationMinutes: z.coerce.number().int().min(1).max(240).optional(),
})
export type CreateBluetoothSessionRequest = z.infer<typeof createBluetoothSessionRequestSchema>

export const bluetoothAdvertiserConfigSchema = z.object({
  sessionId: z.string().min(1),
  serviceUuid: z.string().uuid(),
  publicId: z.string().min(8),
  protocolVersion: z.number().int().positive(),
  rotationWindowSeconds: z.number().int().positive(),
  seed: z.string().min(16),
  currentPayload: z.string().min(8),
  currentPayloadExpiresAt: isoDateTimeSchema,
})
export type BluetoothAdvertiserConfig = z.infer<typeof bluetoothAdvertiserConfigSchema>

export const bluetoothSessionCreateResponseSchema = z.object({
  session: attendanceSessionSummarySchema,
  advertiser: bluetoothAdvertiserConfigSchema,
})
export type BluetoothSessionCreateResponse = z.infer<typeof bluetoothSessionCreateResponseSchema>
