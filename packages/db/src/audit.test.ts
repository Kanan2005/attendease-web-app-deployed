import {
  AdminActionType,
  AttendanceEventType,
  AttendanceMode,
  AttendanceRecordStatus,
  EmailLogStatus,
  OutboxStatus,
  SecurityEventSeverity,
  SecurityEventType,
} from "@prisma/client"
import { describe, expect, it, vi } from "vitest"

import {
  buildAdminActionLogData,
  buildAttendanceEditAuditLogData,
  buildAttendanceEventData,
  buildEmailLogData,
  buildOutboxEventData,
  buildSecurityEventData,
  recordAdministrativeActionTrail,
} from "./audit"

describe("audit and event helpers", () => {
  it("builds attendance event and edit log payloads with optional data only when supplied", () => {
    const attendanceEvent = buildAttendanceEventData({
      id: "attendance-event-1",
      sessionId: "session-1",
      attendanceRecordId: "record-1",
      studentId: "student-1",
      actorUserId: "teacher-1",
      eventType: AttendanceEventType.MANUAL_MARK_PRESENT,
      mode: AttendanceMode.MANUAL,
      previousStatus: AttendanceRecordStatus.ABSENT,
      newStatus: AttendanceRecordStatus.PRESENT,
      metadata: {
        reason: "Late scan recovery",
      },
    })

    expect(attendanceEvent).toEqual({
      id: "attendance-event-1",
      sessionId: "session-1",
      attendanceRecordId: "record-1",
      studentId: "student-1",
      actorUserId: "teacher-1",
      eventType: AttendanceEventType.MANUAL_MARK_PRESENT,
      mode: AttendanceMode.MANUAL,
      previousStatus: AttendanceRecordStatus.ABSENT,
      newStatus: AttendanceRecordStatus.PRESENT,
      metadata: {
        reason: "Late scan recovery",
      },
    })

    expect(
      buildAttendanceEditAuditLogData({
        sessionId: "session-1",
        attendanceRecordId: "record-1",
        studentId: "student-1",
        editedByUserId: "teacher-1",
        previousStatus: AttendanceRecordStatus.ABSENT,
        newStatus: AttendanceRecordStatus.PRESENT,
      }),
    ).toEqual({
      sessionId: "session-1",
      attendanceRecordId: "record-1",
      studentId: "student-1",
      editedByUserId: "teacher-1",
      previousStatus: AttendanceRecordStatus.ABSENT,
      newStatus: AttendanceRecordStatus.PRESENT,
    })
  })

  it("builds security, admin, email, and outbox payloads with sensible defaults", () => {
    expect(
      buildSecurityEventData({
        id: "security-event-1",
        userId: "student-1",
        deviceId: "device-1",
        eventType: SecurityEventType.MULTI_ACCOUNT_SAME_DEVICE_ATTEMPT,
        severity: SecurityEventSeverity.HIGH,
      }),
    ).toEqual({
      id: "security-event-1",
      userId: "student-1",
      deviceId: "device-1",
      eventType: SecurityEventType.MULTI_ACCOUNT_SAME_DEVICE_ATTEMPT,
      severity: SecurityEventSeverity.HIGH,
    })

    expect(
      buildAdminActionLogData({
        adminUserId: "admin-1",
        targetUserId: "student-1",
        actionType: AdminActionType.DEVICE_REVOKE,
      }),
    ).toEqual({
      adminUserId: "admin-1",
      targetUserId: "student-1",
      actionType: AdminActionType.DEVICE_REVOKE,
    })

    expect(
      buildEmailLogData({
        recipientEmail: "student@example.com",
        subject: "Attendance warning",
        body: "Please improve your attendance.",
        status: EmailLogStatus.SENT,
      }),
    ).toEqual({
      recipientEmail: "student@example.com",
      subject: "Attendance warning",
      body: "Please improve your attendance.",
      status: EmailLogStatus.SENT,
    })

    expect(
      buildOutboxEventData({
        topic: "attendance.session.ended",
        aggregateType: "attendance_session",
        aggregateId: "session-1",
        payload: {
          sessionId: "session-1",
        },
      }),
    ).toEqual({
      topic: "attendance.session.ended",
      aggregateType: "attendance_session",
      aggregateId: "session-1",
      payload: {
        sessionId: "session-1",
      },
      status: OutboxStatus.PENDING,
      attemptCount: 0,
    })
  })

  it("records administrative lifecycle actions with optional outbox follow-up", async () => {
    const transaction = {
      adminActionLog: {
        create: vi.fn(async ({ data }: { data: unknown }) => data),
      },
      outboxEvent: {
        create: vi.fn(async ({ data }: { data: unknown }) => data),
      },
    }

    const result = await recordAdministrativeActionTrail(transaction as never, {
      adminAction: {
        adminUserId: "admin_1",
        targetUserId: "student_1",
        targetCourseOfferingId: "classroom_1",
        actionType: AdminActionType.CLASSROOM_STUDENT_REMOVE,
        metadata: {
          enrollmentId: "enrollment_1",
          previousStatus: "ACTIVE",
          nextStatus: "DROPPED",
        },
      },
      outboxEvent: {
        topic: "classroom.roster.member_removed",
        aggregateType: "course_offering",
        aggregateId: "classroom_1",
        payload: {
          enrollmentId: "enrollment_1",
        },
      },
    })

    expect(transaction.adminActionLog.create).toHaveBeenCalledWith({
      data: {
        adminUserId: "admin_1",
        targetUserId: "student_1",
        targetCourseOfferingId: "classroom_1",
        actionType: AdminActionType.CLASSROOM_STUDENT_REMOVE,
        metadata: {
          enrollmentId: "enrollment_1",
          previousStatus: "ACTIVE",
          nextStatus: "DROPPED",
        },
      },
    })
    expect(transaction.outboxEvent.create).toHaveBeenCalledTimes(1)
    expect(result.adminAction).toMatchObject({
      actionType: AdminActionType.CLASSROOM_STUDENT_REMOVE,
    })
    expect(result.outboxEvent).toMatchObject({
      topic: "classroom.roster.member_removed",
    })
  })
})
