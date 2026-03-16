import { z } from "zod"

import { attendanceMarkSourceSchema, attendanceRecordStatusSchema } from "./attendance.core"
import { isoDateTimeSchema } from "./attendance.internal"

export const markQrAttendanceRequestSchema = z.object({
  qrPayload: z.string().trim().min(16),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accuracyMeters: z.coerce.number().positive(),
  deviceTimestamp: isoDateTimeSchema.optional(),
})
export type MarkQrAttendanceRequest = z.infer<typeof markQrAttendanceRequestSchema>

export const markBluetoothAttendanceRequestSchema = z.object({
  detectedPayload: z.string().trim().min(16),
  rssi: z.coerce.number().int().min(-127).max(20).optional(),
  deviceTimestamp: isoDateTimeSchema.optional(),
})
export type MarkBluetoothAttendanceRequest = z.infer<typeof markBluetoothAttendanceRequestSchema>

export const markQrAttendanceResponseSchema = z.object({
  success: z.literal(true),
  sessionId: z.string().min(1),
  attendanceRecordId: z.string().min(1),
  attendanceStatus: attendanceRecordStatusSchema,
  markSource: attendanceMarkSourceSchema,
  markedAt: isoDateTimeSchema,
  presentCount: z.number().int().nonnegative(),
  absentCount: z.number().int().nonnegative(),
  distanceMeters: z.number().nonnegative(),
  accuracyMeters: z.number().positive(),
})
export type MarkQrAttendanceResponse = z.infer<typeof markQrAttendanceResponseSchema>

export const markBluetoothAttendanceResponseSchema = z.object({
  success: z.literal(true),
  sessionId: z.string().min(1),
  attendanceRecordId: z.string().min(1),
  attendanceStatus: attendanceRecordStatusSchema,
  markSource: attendanceMarkSourceSchema,
  markedAt: isoDateTimeSchema,
  presentCount: z.number().int().nonnegative(),
  absentCount: z.number().int().nonnegative(),
  detectionRssi: z.number().int().nullable(),
  detectionSlice: z.number().int().nonnegative(),
})
export type MarkBluetoothAttendanceResponse = z.infer<typeof markBluetoothAttendanceResponseSchema>
