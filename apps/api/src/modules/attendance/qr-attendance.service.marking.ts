import {
  type GpsValidationReason,
  type MarkQrAttendanceRequest,
  markQrAttendanceResponseSchema,
} from "@attendease/contracts"
import { queueOutboxEvent, recordAttendanceEvent, runInTransaction } from "@attendease/db"
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common"

import type { AuthRequestContext } from "../auth/auth.types.js"
import type { TrustedDeviceRequestContext } from "../devices/devices.types.js"
import { expireSessionIfPastEnd, publishSessionState } from "./qr-attendance.service.lifecycle.js"
import { toNullableNumber } from "./qr-attendance.service.serialization.js"
import type {
  MarkAttendanceAttemptResult,
  QrAttendanceServiceContext,
  SuspiciousLocationFailureInput,
} from "./qr-attendance.service.types.js"

export async function markAttendanceFromQr(
  context: QrAttendanceServiceContext,
  auth: AuthRequestContext,
  trustedDevice: TrustedDeviceRequestContext,
  request: MarkQrAttendanceRequest,
) {
  let parsedPayload: { sid: string }

  try {
    parsedPayload = context.qrTokenService.parsePayload(request.qrPayload)
  } catch {
    throw new BadRequestException("The QR token is invalid for this session.")
  }

  const now = new Date()

  const result = await runInTransaction(
    context.database.prisma,
    async (transaction): Promise<MarkAttendanceAttemptResult> => {
      const currentSession = await transaction.attendanceSession.findUnique({
        where: {
          id: parsedPayload.sid,
        },
      })

      if (!currentSession) {
        throw new NotFoundException("Attendance session not found.")
      }

      const session = await expireSessionIfPastEnd(context, transaction, currentSession, now)
      const expiredDuringAttempt =
        currentSession.status === "ACTIVE" && session.status === "EXPIRED"

      if (session.mode !== "QR_GPS") {
        throw new BadRequestException("The scanned attendance session is not a QR + GPS session.")
      }

      if (session.status !== "ACTIVE" || !session.startedAt || session.endedAt) {
        return {
          kind: "SESSION_INACTIVE",
          session,
          expiredDuringAttempt,
        }
      }

      const tokenValidation = context.qrTokenService.validateToken({
        sessionId: session.id,
        qrSeed: session.qrSeed,
        rotationWindowSeconds: session.qrRotationWindowSeconds,
        payload: request.qrPayload,
        now,
      })

      if (!tokenValidation.accepted) {
        return {
          kind: "TOKEN_INVALID",
          reason: tokenValidation.reason,
        }
      }

      const gpsValidation = context.gpsValidatorService.validate({
        anchorLatitude: toNullableNumber(session.gpsCenterLatitude),
        anchorLongitude: toNullableNumber(session.gpsCenterLongitude),
        radiusMeters: session.gpsRadiusMeters,
        latitude: request.latitude,
        longitude: request.longitude,
        accuracyMeters: request.accuracyMeters,
      })

      if (!gpsValidation.accepted) {
        return {
          kind: "GPS_INVALID",
          session,
          reason: gpsValidation.reason,
          distanceMeters: gpsValidation.distanceMeters,
          accuracyMeters: gpsValidation.accuracyMeters,
          qrSlice: tokenValidation.parsed.ts,
        }
      }

      const existingRecord = await transaction.attendanceRecord.findUnique({
        where: {
          sessionId_studentId: {
            sessionId: session.id,
            studentId: auth.userId,
          },
        },
      })

      if (!existingRecord) {
        throw new ForbiddenException("The student is not eligible for this attendance session.")
      }

      if (existingRecord.status === "PRESENT") {
        return {
          kind: "DUPLICATE",
        }
      }

      const updatedRecord = await transaction.attendanceRecord.updateMany({
        where: {
          id: existingRecord.id,
          status: "ABSENT",
        },
        data: {
          status: "PRESENT",
          markSource: "QR_GPS",
          markedAt: now,
          markedByUserId: auth.userId,
        },
      })

      if (updatedRecord.count === 0) {
        return {
          kind: "DUPLICATE",
        }
      }

      const updatedSession = await transaction.attendanceSession.update({
        where: {
          id: session.id,
        },
        data: {
          presentCount: {
            increment: 1,
          },
          absentCount: {
            decrement: 1,
          },
        },
      })

      const attendanceRecord = await transaction.attendanceRecord.findUniqueOrThrow({
        where: {
          id: existingRecord.id,
        },
      })

      await recordAttendanceEvent(transaction, {
        sessionId: session.id,
        attendanceRecordId: attendanceRecord.id,
        studentId: auth.userId,
        actorUserId: auth.userId,
        deviceId: trustedDevice.device.id,
        eventType: "AUTO_MARK_QR",
        mode: "QR_GPS",
        previousStatus: "ABSENT",
        newStatus: "PRESENT",
        metadata: {
          distanceMeters: gpsValidation.distanceMeters,
          accuracyMeters: gpsValidation.accuracyMeters,
          latitude: request.latitude,
          longitude: request.longitude,
          deviceTimestamp: request.deviceTimestamp ?? null,
          qrSlice: tokenValidation.parsed.ts,
        },
      })

      await queueOutboxEvent(transaction, {
        topic: "attendance.record.marked",
        aggregateType: "attendance_session",
        aggregateId: session.id,
        payload: {
          sessionId: session.id,
          attendanceRecordId: attendanceRecord.id,
          studentId: auth.userId,
          markSource: "QR_GPS",
          presentCount: updatedSession.presentCount,
          absentCount: updatedSession.absentCount,
        },
      })

      return {
        kind: "SUCCESS",
        session: updatedSession,
        attendanceRecord,
        distanceMeters: gpsValidation.distanceMeters,
        accuracyMeters: gpsValidation.accuracyMeters,
      }
    },
  )

  if (result.kind === "SESSION_INACTIVE") {
    if (result.expiredDuringAttempt) {
      await publishSessionState(context, result.session)
    }

    throw new ConflictException("This attendance session is not active.")
  }

  if (result.kind === "TOKEN_INVALID") {
    if (result.reason === "EXPIRED") {
      throw new ConflictException("The QR token has expired.")
    }

    throw new BadRequestException("The QR token is invalid for this session.")
  }

  if (result.kind === "GPS_INVALID") {
    if (isSuspiciousLocationFailure(result.reason)) {
      await recordSuspiciousLocationFailure(context, {
        auth,
        trustedDevice,
        session: result.session,
        reason: result.reason,
        distanceMeters: result.distanceMeters,
        accuracyMeters: result.accuracyMeters,
        qrSlice: result.qrSlice,
      })
    }

    if (result.reason === "OUT_OF_RADIUS") {
      throw new ForbiddenException("The device is outside the allowed attendance radius.")
    }

    if (result.reason === "ACCURACY_TOO_LOW") {
      throw new BadRequestException("The current location accuracy is too low.")
    }

    throw new BadRequestException("The submitted location could not be validated.")
  }

  if (result.kind === "DUPLICATE") {
    throw new ConflictException("Attendance has already been marked for this session.")
  }

  await context.realtimeService.publishSessionCounterUpdated({
    sessionId: result.session.id,
    presentCount: result.session.presentCount,
    absentCount: result.session.absentCount,
    rosterSnapshotCount: result.session.rosterSnapshotCount,
  })

  return markQrAttendanceResponseSchema.parse({
    success: true,
    sessionId: result.session.id,
    attendanceRecordId: result.attendanceRecord.id,
    attendanceStatus: result.attendanceRecord.status,
    markSource: result.attendanceRecord.markSource,
    markedAt: result.attendanceRecord.markedAt?.toISOString() ?? now.toISOString(),
    presentCount: result.session.presentCount,
    absentCount: result.session.absentCount,
    distanceMeters: result.distanceMeters,
    accuracyMeters: result.accuracyMeters,
  })
}

function isSuspiciousLocationFailure(
  reason: GpsValidationReason,
): reason is "OUT_OF_RADIUS" | "ACCURACY_TOO_LOW" {
  return reason === "OUT_OF_RADIUS" || reason === "ACCURACY_TOO_LOW"
}

async function recordSuspiciousLocationFailure(
  context: QrAttendanceServiceContext,
  input: SuspiciousLocationFailureInput,
) {
  await context.database.prisma.securityEvent.create({
    data: {
      userId: input.auth.userId,
      actorUserId: input.auth.userId,
      deviceId: input.trustedDevice.device.id,
      bindingId: input.trustedDevice.binding.id,
      courseOfferingId: input.session.courseOfferingId,
      sessionId: input.session.id,
      eventType: "ATTENDANCE_LOCATION_VALIDATION_FAILED",
      severity: input.reason === "OUT_OF_RADIUS" ? "HIGH" : "MEDIUM",
      description:
        input.reason === "OUT_OF_RADIUS"
          ? "QR attendance was rejected because the device location was outside the allowed radius."
          : "QR attendance was rejected because the submitted location accuracy was too low.",
      metadata: {
        reason: input.reason,
        accuracyMeters: input.accuracyMeters,
        distanceMeters: input.distanceMeters,
        allowedRadiusMeters: input.session.gpsRadiusMeters,
        anchorType: input.session.gpsAnchorType,
        qrSlice: input.qrSlice,
      },
    },
  })
}
