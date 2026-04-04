import {
  type AttendanceSessionParams,
  type EndAttendanceSessionResponse,
  endAttendanceSessionResponseSchema,
} from "@attendease/contracts"
import {
  type PrismaTransactionClient,
  queueOutboxEvent,
  recordAttendanceEvent,
  runInTransaction,
} from "@attendease/db"
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common"

import type { AuthRequestContext } from "../auth/auth.types.js"
import { toAttendanceSessionSummary } from "./qr-attendance.service.serialization.js"
import type {
  AttendanceSessionRecord,
  QrAttendanceServiceContext,
  SessionStatePublishRecord,
} from "./qr-attendance.service.types.js"

export async function getQrSession(
  context: QrAttendanceServiceContext,
  auth: AuthRequestContext,
  params: AttendanceSessionParams,
) {
  const existing = await context.database.prisma.attendanceSession.findUnique({
    where: {
      id: params.sessionId,
    },
  })

  if (!existing) {
    throw new NotFoundException("Attendance session not found.")
  }

  await context.classroomsService.requireAccessibleClassroom(auth, existing.courseOfferingId)

  if (existing.mode === "MANUAL") {
    throw new BadRequestException("Manual attendance sessions are not available on this route.")
  }

  const now = new Date()
  let session: AttendanceSessionRecord = existing

  if (existing.status === "ACTIVE" && existing.scheduledEndAt && existing.scheduledEndAt <= now) {
    session = await runInTransaction(context.database.prisma, async (transaction) => {
      return expireSessionIfPastEnd(context, transaction, existing, now)
    })

    if (session.status === "EXPIRED") {
      await publishSessionState(context, session)
    }
  }

  return toAttendanceSessionSummary(context.qrTokenService, session)
}

export async function endQrSession(
  context: QrAttendanceServiceContext,
  auth: AuthRequestContext,
  params: AttendanceSessionParams,
): Promise<EndAttendanceSessionResponse> {
  const existing = await context.database.prisma.attendanceSession.findUnique({
    where: {
      id: params.sessionId,
    },
  })

  if (!existing) {
    throw new NotFoundException("Attendance session not found.")
  }

  await context.classroomsService.requireAccessibleClassroom(auth, existing.courseOfferingId)

  if (existing.mode === "MANUAL") {
    throw new BadRequestException("Manual attendance sessions cannot be ended here.")
  }

  if (
    existing.status === "ENDED" ||
    existing.status === "EXPIRED" ||
    existing.status === "CANCELLED"
  ) {
    return endAttendanceSessionResponseSchema.parse(
      toAttendanceSessionSummary(context.qrTokenService, existing),
    )
  }

  if (existing.status !== "ACTIVE") {
    throw new ConflictException("Only active attendance sessions can be ended.")
  }

  const endedAt = new Date()
  const editableUntil = new Date(endedAt.getTime() + 24 * 60 * 60 * 1_000)

  const endedSession = await runInTransaction(context.database.prisma, async (transaction) => {
    const updatedSession = await transaction.attendanceSession.update({
      where: {
        id: existing.id,
      },
      data: {
        status: "ENDED",
        endedAt,
        endedByUserId: auth.userId,
        editableUntil,
      },
    })

    await completeLectureAfterAttendance(
      transaction,
      updatedSession.lectureId,
      updatedSession.startedAt ?? endedAt,
      endedAt,
    )

    await recordAttendanceEvent(transaction, {
      sessionId: updatedSession.id,
      actorUserId: auth.userId,
      eventType: "SESSION_ENDED",
      mode: "QR_GPS",
      metadata: {
        endedAt: endedAt.toISOString(),
      },
    })

    await queueOutboxEvent(transaction, {
      topic: "attendance.session.ended",
      aggregateType: "attendance_session",
      aggregateId: updatedSession.id,
      payload: {
        sessionId: updatedSession.id,
        actorUserId: auth.userId,
        endedAt: endedAt.toISOString(),
      },
    })

    return updatedSession
  })

  await publishSessionState(context, endedSession)

  return endAttendanceSessionResponseSchema.parse(
    toAttendanceSessionSummary(context.qrTokenService, endedSession),
  )
}

export async function completeLectureAfterAttendance(
  transaction: PrismaTransactionClient,
  lectureId: string | null,
  startedAt: Date,
  endedAt: Date,
) {
  if (!lectureId) {
    return
  }

  await transaction.lecture.update({
    where: {
      id: lectureId,
    },
    data: {
      status: "COMPLETED",
      actualStartAt: startedAt,
      actualEndAt: endedAt,
    },
  })
}

export async function expireTimedOutActiveSessions(
  context: QrAttendanceServiceContext,
  classroomId: string,
  now: Date,
) {
  const timedOutSessions = await context.database.prisma.attendanceSession.findMany({
    where: {
      courseOfferingId: classroomId,
      status: "ACTIVE",
      scheduledEndAt: {
        lte: now,
      },
    },
    select: {
      id: true,
      lectureId: true,
      startedAt: true,
    },
  })

  if (timedOutSessions.length === 0) {
    return []
  }

  const expiredSessions: SessionStatePublishRecord[] = []

  for (const session of timedOutSessions) {
    const expiredSession = await runInTransaction(context.database.prisma, async (transaction) => {
      const updatedSession = await transaction.attendanceSession.update({
        where: {
          id: session.id,
        },
        data: {
          status: "EXPIRED",
          endedAt: now,
          editableUntil: new Date(now.getTime() + 24 * 60 * 60 * 1_000),
        },
      })

      await completeLectureAfterAttendance(
        transaction,
        updatedSession.lectureId,
        session.startedAt ?? now,
        now,
      )

      await queueOutboxEvent(transaction, {
        topic: "attendance.session.expired",
        aggregateType: "attendance_session",
        aggregateId: session.id,
        payload: {
          sessionId: session.id,
          expiredAt: now.toISOString(),
        },
      })

      return updatedSession
    })

    expiredSessions.push(expiredSession)
  }

  return expiredSessions
}

export async function expireSessionIfPastEnd(
  context: QrAttendanceServiceContext,
  transaction: PrismaTransactionClient,
  session: AttendanceSessionRecord,
  now: Date,
) {
  if (session.status === "ACTIVE" && session.scheduledEndAt && session.scheduledEndAt <= now) {
    const expired = await transaction.attendanceSession.update({
      where: {
        id: session.id,
      },
      data: {
        status: "EXPIRED",
        endedAt: now,
        editableUntil: new Date(now.getTime() + 24 * 60 * 60 * 1_000),
      },
    })

    await completeLectureAfterAttendance(
      transaction,
      expired.lectureId,
      session.startedAt ?? now,
      now,
    )

    await queueOutboxEvent(transaction, {
      topic: "attendance.session.expired",
      aggregateType: "attendance_session",
      aggregateId: expired.id,
      payload: {
        sessionId: expired.id,
        expiredAt: now.toISOString(),
      },
    })

    return expired
  }

  return session
}

export async function publishSessionState(
  context: QrAttendanceServiceContext,
  session: SessionStatePublishRecord,
) {
  await context.realtimeService.publishSessionStateChanged({
    sessionId: session.id,
    status: session.status,
    endedAt: session.endedAt?.toISOString() ?? null,
    editableUntil: session.editableUntil?.toISOString() ?? null,
  })
}
