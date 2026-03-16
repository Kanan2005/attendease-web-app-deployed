import type { UpdateAttendanceSessionAttendanceRequest } from "@attendease/contracts"
import {
  queueOutboxEvent,
  recordAttendanceEditTrail,
  runSerializableTransaction,
} from "@attendease/db"
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common"

import type { DatabaseService } from "../../database/database.service.js"
import { deriveAttendanceSessionEditability } from "./attendance-history.models.js"

type ApplyAttendanceSessionEditsInput = {
  database: DatabaseService["prisma"]
  sessionId: string
  actorUserId: string
  changes: UpdateAttendanceSessionAttendanceRequest["changes"]
  now: Date
}

type ApplyAttendanceSessionEditsResult = {
  presentCount: number
  absentCount: number
  appliedChangeCount: number
  rosterSnapshotCount: number
}

export async function applyAttendanceSessionEdits(
  input: ApplyAttendanceSessionEditsInput,
): Promise<ApplyAttendanceSessionEditsResult> {
  const requestedChangeIds = input.changes.map((change) => change.attendanceRecordId)
  const requestedChanges = new Map(
    input.changes.map((change) => [change.attendanceRecordId, change.status] as const),
  )

  return runSerializableTransaction(input.database, async (transaction) => {
    const session = await transaction.attendanceSession.findUnique({
      where: {
        id: input.sessionId,
      },
    })

    if (!session) {
      throw new NotFoundException("Attendance session not found.")
    }

    const currentEditability = deriveAttendanceSessionEditability({
      endedAt: session.endedAt?.toISOString() ?? null,
      editableUntil: session.editableUntil?.toISOString() ?? null,
      now: input.now,
    })

    if (!currentEditability.isEditable) {
      throw new ConflictException("This attendance session is locked for manual edits.")
    }

    const records = await transaction.attendanceRecord.findMany({
      where: {
        sessionId: input.sessionId,
        id: {
          in: requestedChangeIds,
        },
      },
      orderBy: {
        id: "asc",
      },
    })

    if (records.length !== requestedChangeIds.length) {
      throw new BadRequestException(
        "One or more attendance rows do not belong to this attendance session.",
      )
    }

    let appliedChangeCount = 0

    for (const record of records) {
      const nextStatus = requestedChanges.get(record.id)

      if (!nextStatus) {
        continue
      }

      if (record.status === nextStatus) {
        continue
      }

      const updatedRecord = await transaction.attendanceRecord.update({
        where: {
          id: record.id,
        },
        data: {
          status: nextStatus,
          markSource: nextStatus === "PRESENT" ? "MANUAL" : null,
          markedAt: nextStatus === "PRESENT" ? input.now : null,
          markedByUserId: nextStatus === "PRESENT" ? input.actorUserId : null,
        },
      })

      await recordAttendanceEditTrail(transaction, {
        attendanceEvent: {
          sessionId: input.sessionId,
          attendanceRecordId: updatedRecord.id,
          studentId: updatedRecord.studentId,
          actorUserId: input.actorUserId,
          eventType: nextStatus === "PRESENT" ? "MANUAL_MARK_PRESENT" : "MANUAL_MARK_ABSENT",
          mode: session.mode,
          previousStatus: record.status,
          newStatus: nextStatus,
          metadata: {
            editedAt: input.now.toISOString(),
          },
        },
        auditLog: {
          sessionId: input.sessionId,
          attendanceRecordId: updatedRecord.id,
          studentId: updatedRecord.studentId,
          editedByUserId: input.actorUserId,
          previousStatus: record.status,
          newStatus: nextStatus,
          editedAt: input.now,
        },
      })

      appliedChangeCount += 1
    }

    const [presentCount, absentCount] = await Promise.all([
      transaction.attendanceRecord.count({
        where: {
          sessionId: input.sessionId,
          status: "PRESENT",
        },
      }),
      transaction.attendanceRecord.count({
        where: {
          sessionId: input.sessionId,
          status: "ABSENT",
        },
      }),
    ])

    await transaction.attendanceSession.update({
      where: {
        id: input.sessionId,
      },
      data: {
        presentCount,
        absentCount,
      },
    })

    if (appliedChangeCount > 0) {
      await queueOutboxEvent(transaction, {
        topic: "attendance.session.edited",
        aggregateType: "attendance_session",
        aggregateId: input.sessionId,
        payload: {
          sessionId: input.sessionId,
          actorUserId: input.actorUserId,
          appliedChangeCount,
          presentCount,
          absentCount,
        },
      })
    }

    return {
      presentCount,
      absentCount,
      appliedChangeCount,
      rosterSnapshotCount: session.rosterSnapshotCount,
    }
  })
}
