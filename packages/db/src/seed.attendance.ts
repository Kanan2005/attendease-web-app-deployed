import {
  AttendanceEventType,
  AttendanceMode,
  AttendanceRecordStatus,
  type PrismaClient,
} from "@prisma/client"

import { buildAttendanceEditAuditLogData, buildAttendanceEventData } from "./audit.js"
import type { PrismaTransactionClient } from "./client"
import { developmentSeedIds } from "./seed.ids"
import type {
  SeedAcademicContext,
  SeedDeviceContext,
  SeedTimingContext,
  SeedUsersContext,
} from "./seed.internal"

type SeedAttendanceTransaction = Pick<
  PrismaClient,
  "attendanceSession" | "attendanceRecord" | "attendanceEvent" | "attendanceEditAuditLog"
> &
  Pick<
    PrismaTransactionClient,
    "attendanceSession" | "attendanceRecord" | "attendanceEvent" | "attendanceEditAuditLog"
  >

export async function seedAttendanceData(
  transaction: SeedAttendanceTransaction,
  timing: SeedTimingContext,
  users: SeedUsersContext,
  academic: SeedAcademicContext,
  devices: SeedDeviceContext,
): Promise<void> {
  await transaction.attendanceSession.upsert({
    where: { id: developmentSeedIds.sessions.mathCompleted },
    update: {
      courseOfferingId: academic.mathCourseOfferingId,
      lectureId: developmentSeedIds.lectures.mathCompleted,
      teacherAssignmentId: academic.mathTeacherAssignmentId,
      teacherId: users.teacherUser.id,
      endedByUserId: users.teacherUser.id,
      semesterId: academic.semesterId,
      classId: academic.academicClassId,
      sectionId: academic.sectionId,
      subjectId: academic.mathSubjectId,
      mode: AttendanceMode.QR_GPS,
      status: "ENDED",
      startedAt: timing.completedSessionStart,
      scheduledEndAt: timing.completedSessionEnd,
      endedAt: timing.completedSessionEnd,
      editableUntil: new Date("2026-03-11T03:30:00.000Z"),
      durationSeconds: 900,
      qrSeed: "seed-math-completed-session-qr-seed-123456",
      gpsAnchorType: "CLASSROOM_FIXED",
      gpsAnchorLabel: "Mathematics Room 101",
      gpsAnchorResolvedAt: timing.completedSessionStart,
      gpsCenterLatitude: 28.6139,
      gpsCenterLongitude: 77.209,
      gpsRadiusMeters: 100,
      qrRotationWindowSeconds: 15,
      bluetoothRotationWindowSeconds: null,
      rosterSnapshotCount: 4,
      presentCount: 3,
      absentCount: 1,
    },
    create: {
      id: developmentSeedIds.sessions.mathCompleted,
      courseOfferingId: academic.mathCourseOfferingId,
      lectureId: developmentSeedIds.lectures.mathCompleted,
      teacherAssignmentId: academic.mathTeacherAssignmentId,
      teacherId: users.teacherUser.id,
      endedByUserId: users.teacherUser.id,
      semesterId: academic.semesterId,
      classId: academic.academicClassId,
      sectionId: academic.sectionId,
      subjectId: academic.mathSubjectId,
      mode: AttendanceMode.QR_GPS,
      status: "ENDED",
      startedAt: timing.completedSessionStart,
      scheduledEndAt: timing.completedSessionEnd,
      endedAt: timing.completedSessionEnd,
      editableUntil: new Date("2026-03-11T03:30:00.000Z"),
      durationSeconds: 900,
      qrSeed: "seed-math-completed-session-qr-seed-123456",
      gpsAnchorType: "CLASSROOM_FIXED",
      gpsAnchorLabel: "Mathematics Room 101",
      gpsAnchorResolvedAt: timing.completedSessionStart,
      gpsCenterLatitude: 28.6139,
      gpsCenterLongitude: 77.209,
      gpsRadiusMeters: 100,
      qrRotationWindowSeconds: 15,
      rosterSnapshotCount: 4,
      presentCount: 3,
      absentCount: 1,
    },
  })

  await Promise.all([
    transaction.attendanceRecord.upsert({
      where: {
        sessionId_studentId: {
          sessionId: developmentSeedIds.sessions.mathCompleted,
          studentId: developmentSeedIds.users.studentOne,
        },
      },
      update: {
        enrollmentId: academic.mathEnrollments.studentOneId,
        status: AttendanceRecordStatus.PRESENT,
        markSource: "QR_GPS",
        markedAt: new Date("2026-03-10T03:31:00.000Z"),
        markedByUserId: null,
      },
      create: {
        id: developmentSeedIds.attendanceRecords.studentOne,
        sessionId: developmentSeedIds.sessions.mathCompleted,
        enrollmentId: academic.mathEnrollments.studentOneId,
        studentId: developmentSeedIds.users.studentOne,
        status: AttendanceRecordStatus.PRESENT,
        markSource: "QR_GPS",
        markedAt: new Date("2026-03-10T03:31:00.000Z"),
      },
    }),
    transaction.attendanceRecord.upsert({
      where: {
        sessionId_studentId: {
          sessionId: developmentSeedIds.sessions.mathCompleted,
          studentId: developmentSeedIds.users.studentTwo,
        },
      },
      update: {
        enrollmentId: academic.mathEnrollments.studentTwoId,
        status: AttendanceRecordStatus.PRESENT,
        markSource: "QR_GPS",
        markedAt: new Date("2026-03-10T03:32:00.000Z"),
        markedByUserId: null,
      },
      create: {
        id: developmentSeedIds.attendanceRecords.studentTwo,
        sessionId: developmentSeedIds.sessions.mathCompleted,
        enrollmentId: academic.mathEnrollments.studentTwoId,
        studentId: developmentSeedIds.users.studentTwo,
        status: AttendanceRecordStatus.PRESENT,
        markSource: "QR_GPS",
        markedAt: new Date("2026-03-10T03:32:00.000Z"),
      },
    }),
    transaction.attendanceRecord.upsert({
      where: {
        sessionId_studentId: {
          sessionId: developmentSeedIds.sessions.mathCompleted,
          studentId: developmentSeedIds.users.studentThree,
        },
      },
      update: {
        enrollmentId: academic.mathEnrollments.studentThreeId,
        status: AttendanceRecordStatus.PRESENT,
        markSource: "MANUAL",
        markedAt: new Date("2026-03-10T04:00:00.000Z"),
        markedByUserId: users.teacherUser.id,
      },
      create: {
        id: developmentSeedIds.attendanceRecords.studentThree,
        sessionId: developmentSeedIds.sessions.mathCompleted,
        enrollmentId: academic.mathEnrollments.studentThreeId,
        studentId: developmentSeedIds.users.studentThree,
        status: AttendanceRecordStatus.PRESENT,
        markSource: "MANUAL",
        markedAt: new Date("2026-03-10T04:00:00.000Z"),
        markedByUserId: users.teacherUser.id,
      },
    }),
    transaction.attendanceRecord.upsert({
      where: {
        sessionId_studentId: {
          sessionId: developmentSeedIds.sessions.mathCompleted,
          studentId: developmentSeedIds.users.studentFour,
        },
      },
      update: {
        enrollmentId: academic.mathEnrollments.studentFourId,
        status: AttendanceRecordStatus.ABSENT,
        markSource: null,
        markedAt: null,
        markedByUserId: null,
      },
      create: {
        id: developmentSeedIds.attendanceRecords.studentFour,
        sessionId: developmentSeedIds.sessions.mathCompleted,
        enrollmentId: academic.mathEnrollments.studentFourId,
        studentId: developmentSeedIds.users.studentFour,
        status: AttendanceRecordStatus.ABSENT,
      },
    }),
  ])

  await transaction.attendanceEvent.deleteMany({
    where: {
      id: {
        in: Object.values(developmentSeedIds.attendanceEvents),
      },
    },
  })

  await transaction.attendanceEditAuditLog.deleteMany({
    where: {
      id: {
        in: Object.values(developmentSeedIds.attendanceEditLogs),
      },
    },
  })

  await transaction.attendanceEvent.createMany({
    data: [
      buildAttendanceEventData({
        id: developmentSeedIds.attendanceEvents.sessionCreated,
        sessionId: developmentSeedIds.sessions.mathCompleted,
        actorUserId: users.teacherUser.id,
        eventType: AttendanceEventType.SESSION_CREATED,
        mode: AttendanceMode.QR_GPS,
        metadata: {
          rosterSnapshotCount: 4,
        },
        occurredAt: timing.completedSessionStart,
      }),
      buildAttendanceEventData({
        id: developmentSeedIds.attendanceEvents.studentOneQr,
        sessionId: developmentSeedIds.sessions.mathCompleted,
        attendanceRecordId: developmentSeedIds.attendanceRecords.studentOne,
        studentId: developmentSeedIds.users.studentOne,
        deviceId: devices.studentOneDeviceId,
        eventType: AttendanceEventType.AUTO_MARK_QR,
        mode: AttendanceMode.QR_GPS,
        previousStatus: AttendanceRecordStatus.ABSENT,
        newStatus: AttendanceRecordStatus.PRESENT,
        metadata: {
          gpsValidated: true,
        },
        occurredAt: new Date("2026-03-10T03:31:00.000Z"),
      }),
      buildAttendanceEventData({
        id: developmentSeedIds.attendanceEvents.studentTwoQr,
        sessionId: developmentSeedIds.sessions.mathCompleted,
        attendanceRecordId: developmentSeedIds.attendanceRecords.studentTwo,
        studentId: developmentSeedIds.users.studentTwo,
        deviceId: devices.studentTwoDeviceId,
        eventType: AttendanceEventType.AUTO_MARK_QR,
        mode: AttendanceMode.QR_GPS,
        previousStatus: AttendanceRecordStatus.ABSENT,
        newStatus: AttendanceRecordStatus.PRESENT,
        metadata: {
          gpsValidated: true,
        },
        occurredAt: new Date("2026-03-10T03:32:00.000Z"),
      }),
      buildAttendanceEventData({
        id: developmentSeedIds.attendanceEvents.studentThreeManual,
        sessionId: developmentSeedIds.sessions.mathCompleted,
        attendanceRecordId: developmentSeedIds.attendanceRecords.studentThree,
        studentId: developmentSeedIds.users.studentThree,
        actorUserId: users.teacherUser.id,
        eventType: AttendanceEventType.MANUAL_MARK_PRESENT,
        mode: AttendanceMode.MANUAL,
        previousStatus: AttendanceRecordStatus.ABSENT,
        newStatus: AttendanceRecordStatus.PRESENT,
        metadata: {
          reason: "Student was present but missed the scan window",
        },
        occurredAt: new Date("2026-03-10T04:00:00.000Z"),
      }),
      buildAttendanceEventData({
        id: developmentSeedIds.attendanceEvents.sessionEnded,
        sessionId: developmentSeedIds.sessions.mathCompleted,
        actorUserId: users.teacherUser.id,
        eventType: AttendanceEventType.SESSION_ENDED,
        mode: AttendanceMode.QR_GPS,
        metadata: {
          presentCount: 3,
          absentCount: 1,
        },
        occurredAt: timing.completedSessionEnd,
      }),
    ],
  })

  await transaction.attendanceEditAuditLog.create({
    data: buildAttendanceEditAuditLogData({
      id: developmentSeedIds.attendanceEditLogs.studentThreeManual,
      sessionId: developmentSeedIds.sessions.mathCompleted,
      attendanceRecordId: developmentSeedIds.attendanceRecords.studentThree,
      studentId: developmentSeedIds.users.studentThree,
      editedByUserId: users.teacherUser.id,
      previousStatus: AttendanceRecordStatus.ABSENT,
      newStatus: AttendanceRecordStatus.PRESENT,
      editedAt: new Date("2026-03-10T04:00:00.000Z"),
    }),
  })
}
