import {
  type BluetoothTokenValidationReason,
  type MarkBluetoothAttendanceRequest,
  type MarkBluetoothAttendanceResponse,
  markBluetoothAttendanceResponseSchema,
} from "@attendease/contracts"
import { queueOutboxEvent, recordAttendanceEvent, runInTransaction } from "@attendease/db"
import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common"

import type { AuthRequestContext } from "../auth/auth.types.js"
import type { TrustedDeviceRequestContext } from "../devices/devices.types.js"
import {
  expireSessionIfPastEnd,
  publishSessionState,
} from "./bluetooth-attendance.service.session-state.js"
import type {
  BluetoothAttendanceServiceContext,
  MarkAttendanceAttemptResult,
} from "./bluetooth-attendance.service.types.js"

export async function markAttendanceFromBluetooth(
  context: BluetoothAttendanceServiceContext,
  auth: AuthRequestContext,
  trustedDevice: TrustedDeviceRequestContext,
  request: MarkBluetoothAttendanceRequest,
): Promise<MarkBluetoothAttendanceResponse> {
  const now = new Date()
  const isCompact = context.bluetoothTokenService.isCompactPayload(request.detectedPayload)

  let parsedPayload: {
    pid: string
    ts: number
  } | null = null

  // For compact payloads (pid4+eid8 from BLE advertising), extract the short prefix
  // and find the session by prefix match. For JSON payloads, parse normally.
  let compactParts: { pidShort: string; eidShort: string } | null = null

  if (isCompact) {
    compactParts = context.bluetoothTokenService.parseCompactPayload(request.detectedPayload)
  } else {
    try {
      const parsed = context.bluetoothTokenService.parsePayload(request.detectedPayload)
      parsedPayload = {
        pid: parsed.pid,
        ts: parsed.ts,
      }
    } catch {
      await recordBluetoothValidationFailure(context, {
        auth,
        trustedDevice,
        session: null,
        reason: "INVALID",
        detectionSlice: null,
        publicId: null,
        detectionRssi: request.rssi ?? null,
        description:
          "Bluetooth attendance was rejected because the detected payload could not be parsed.",
      })

      throw new BadRequestException("The Bluetooth attendance payload is invalid.")
    }
  }

  const session = await context.database.prisma.attendanceSession.findFirst({
    where: {
      mode: "BLUETOOTH",
      status: "ACTIVE",
      ...(isCompact && compactParts
        ? { blePublicId: { startsWith: compactParts.pidShort } }
        : parsedPayload
          ? { blePublicId: parsedPayload.pid }
          : {}),
    },
  })

  if (!session) {
    await recordBluetoothValidationFailure(context, {
      auth,
      trustedDevice,
      session: null,
      reason: "SESSION_MISMATCH",
      detectionSlice: parsedPayload?.ts ?? null,
      publicId: compactParts?.pidShort ?? parsedPayload?.pid ?? null,
      detectionRssi: request.rssi ?? null,
      description:
        "Bluetooth attendance was rejected because the detected payload did not match an active AttendEase session.",
    })

    throw new BadRequestException("The Bluetooth attendance payload is invalid for this session.")
  }

  const result = await runInTransaction(context.database.prisma, async (transaction) => {
    const freshSession = await transaction.attendanceSession.findUniqueOrThrow({
      where: {
        id: session.id,
      },
    })

    const sessionForMark = await expireSessionIfPastEnd(context, transaction, freshSession, now)
    const expiredDuringAttempt =
      sessionForMark.status === "EXPIRED" && freshSession.status === "ACTIVE"

    if (sessionForMark.status !== "ACTIVE") {
      return {
        kind: "SESSION_INACTIVE",
        session: sessionForMark,
        expiredDuringAttempt,
      } satisfies MarkAttendanceAttemptResult
    }

    const tokenValidation =
      isCompact && compactParts
        ? context.bluetoothTokenService.validateCompactToken({
            publicId: sessionForMark.blePublicId,
            bleSeed: sessionForMark.bleSeed,
            protocolVersion: sessionForMark.bleProtocolVersion,
            rotationWindowSeconds: sessionForMark.bluetoothRotationWindowSeconds,
            pidShort: compactParts.pidShort,
            eidShort: compactParts.eidShort,
            now,
          })
        : context.bluetoothTokenService.validateToken({
            publicId: sessionForMark.blePublicId,
            bleSeed: sessionForMark.bleSeed,
            protocolVersion: sessionForMark.bleProtocolVersion,
            rotationWindowSeconds: sessionForMark.bluetoothRotationWindowSeconds,
            payload: request.detectedPayload,
            now,
          })

    if (!tokenValidation.accepted) {
      return {
        kind: "TOKEN_INVALID",
        session: sessionForMark,
        reason: tokenValidation.reason,
        detectionSlice: parsedPayload?.ts ?? null,
        publicId: compactParts?.pidShort ?? parsedPayload?.pid ?? null,
      } satisfies MarkAttendanceAttemptResult
    }

    const existingRecord = await transaction.attendanceRecord.findUnique({
      where: {
        sessionId_studentId: {
          sessionId: sessionForMark.id,
          studentId: auth.userId,
        },
      },
    })

    if (!existingRecord) {
      return {
        kind: "NOT_ELIGIBLE",
      } satisfies MarkAttendanceAttemptResult
    }

    if (existingRecord.status === "PRESENT") {
      return {
        kind: "DUPLICATE",
      } satisfies MarkAttendanceAttemptResult
    }

    const updatedRecord = await transaction.attendanceRecord.updateMany({
      where: {
        id: existingRecord.id,
        status: "ABSENT",
      },
      data: {
        status: "PRESENT",
        markSource: "BLUETOOTH",
        markedAt: now,
        markedByUserId: auth.userId,
      },
    })

    if (updatedRecord.count === 0) {
      return {
        kind: "DUPLICATE",
      } satisfies MarkAttendanceAttemptResult
    }

    const updatedSession = await transaction.attendanceSession.update({
      where: {
        id: sessionForMark.id,
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
      sessionId: sessionForMark.id,
      attendanceRecordId: attendanceRecord.id,
      studentId: auth.userId,
      actorUserId: auth.userId,
      deviceId: trustedDevice.device.id,
      eventType: "AUTO_MARK_BLUETOOTH",
      mode: "BLUETOOTH",
      previousStatus: "ABSENT",
      newStatus: "PRESENT",
      metadata: {
        rssi: request.rssi ?? null,
        deviceTimestamp: request.deviceTimestamp ?? null,
        detectionSlice: tokenValidation.parsed.ts,
        blePublicId: tokenValidation.parsed.pid,
      },
    })

    await queueOutboxEvent(transaction, {
      topic: "attendance.record.marked",
      aggregateType: "attendance_session",
      aggregateId: sessionForMark.id,
      payload: {
        sessionId: sessionForMark.id,
        attendanceRecordId: attendanceRecord.id,
        studentId: auth.userId,
        markSource: "BLUETOOTH",
        presentCount: updatedSession.presentCount,
        absentCount: updatedSession.absentCount,
      },
    })

    return {
      kind: "SUCCESS",
      session: updatedSession,
      attendanceRecord,
      detectionSlice: tokenValidation.parsed.ts,
      detectionRssi: request.rssi ?? null,
    } satisfies MarkAttendanceAttemptResult
  })

  if (result.kind === "SESSION_INACTIVE") {
    if (result.expiredDuringAttempt) {
      await publishSessionState(context, result.session)
    }

    throw new ConflictException("This attendance session is not active.")
  }

  if (result.kind === "TOKEN_INVALID") {
    await recordBluetoothValidationFailure(context, {
      auth,
      trustedDevice,
      session: result.session,
      reason: result.reason,
      detectionSlice: result.detectionSlice,
      publicId: result.publicId,
      detectionRssi: request.rssi ?? null,
      description: describeBluetoothValidationFailure(result.reason),
    })

    if (result.reason === "EXPIRED") {
      throw new ConflictException("The Bluetooth attendance token has expired.")
    }

    throw new BadRequestException("The Bluetooth attendance payload is invalid for this session.")
  }

  if (result.kind === "NOT_ELIGIBLE") {
    throw new ForbiddenException("The student is not eligible for this attendance session.")
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

  return markBluetoothAttendanceResponseSchema.parse({
    success: true,
    sessionId: result.session.id,
    attendanceRecordId: result.attendanceRecord.id,
    attendanceStatus: result.attendanceRecord.status,
    markSource: result.attendanceRecord.markSource,
    markedAt: result.attendanceRecord.markedAt?.toISOString() ?? now.toISOString(),
    presentCount: result.session.presentCount,
    absentCount: result.session.absentCount,
    detectionRssi: result.detectionRssi,
    detectionSlice: result.detectionSlice,
  })
}

async function recordBluetoothValidationFailure(
  context: BluetoothAttendanceServiceContext,
  input: {
    auth: AuthRequestContext
    trustedDevice: TrustedDeviceRequestContext
    session: import("./bluetooth-attendance.service.types.js").AttendanceSessionRecord | null
    reason: BluetoothTokenValidationReason
    detectionSlice: number | null
    publicId: string | null
    detectionRssi: number | null
    description: string
  },
) {
  await context.database.prisma.securityEvent.create({
    data: {
      userId: input.auth.userId,
      actorUserId: input.auth.userId,
      deviceId: input.trustedDevice.device.id,
      bindingId: input.trustedDevice.binding.id,
      ...(input.session ? { courseOfferingId: input.session.courseOfferingId } : {}),
      ...(input.session ? { sessionId: input.session.id } : {}),
      eventType: "ATTENDANCE_BLUETOOTH_VALIDATION_FAILED",
      severity: input.reason === "SESSION_MISMATCH" ? "HIGH" : "MEDIUM",
      description: input.description,
      metadata: {
        reason: input.reason,
        publicId: input.publicId,
        detectionSlice: input.detectionSlice,
        detectionRssi: input.detectionRssi,
      },
    },
  })
}

function describeBluetoothValidationFailure(reason: BluetoothTokenValidationReason) {
  switch (reason) {
    case "EXPIRED":
      return "Bluetooth attendance was rejected because the detected rotating identifier had already expired."
    case "SESSION_MISMATCH":
      return "Bluetooth attendance was rejected because the detected rotating identifier did not match the active session."
    default:
      return "Bluetooth attendance was rejected because the detected rotating identifier failed validation."
  }
}
