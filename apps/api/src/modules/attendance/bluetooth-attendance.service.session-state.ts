import { type PrismaTransactionClient, queueOutboxEvent, runInTransaction } from "@attendease/db"

import type {
  AttendanceSessionRecord,
  BluetoothAttendanceServiceContext,
  SessionStatePublishRecord,
} from "./bluetooth-attendance.service.types.js"

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
  context: BluetoothAttendanceServiceContext,
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
        aggregateId: session.id,
        payload: {
          sessionId: session.id,
          expiredAt: now.toISOString(),
        },
      })

      return expired
    })

    expiredSessions.push(expiredSession)
  }

  return expiredSessions
}

export async function expireSessionIfPastEnd(
  context: BluetoothAttendanceServiceContext,
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
  context: BluetoothAttendanceServiceContext,
  session: SessionStatePublishRecord,
) {
  await context.realtimeService.publishSessionStateChanged({
    sessionId: session.id,
    status: session.status,
    endedAt: session.endedAt?.toISOString() ?? null,
    editableUntil: session.editableUntil?.toISOString() ?? null,
  })
}
