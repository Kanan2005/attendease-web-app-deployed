import { randomBytes } from "node:crypto"

import {
  type AttendanceSessionParams,
  type AttendanceSessionSummary,
  type CreateQrSessionRequest,
  type EndAttendanceSessionResponse,
  type GpsValidationReason,
  type MarkQrAttendanceRequest,
  type MarkQrAttendanceResponse,
  type QrTokenValidationReason,
  attendanceSessionSummarySchema,
  endAttendanceSessionResponseSchema,
  markQrAttendanceResponseSchema,
} from "@attendease/contracts"
import {
  type PrismaTransactionClient,
  queueOutboxEvent,
  recordAttendanceEvent,
  runInTransaction,
} from "@attendease/db"
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common"

import { DatabaseService } from "../../database/database.service.js"
import { ClassroomsService } from "../academic/classrooms.service.js"
import { LecturesService } from "../academic/lectures.service.js"
import { SchedulingService } from "../academic/scheduling.service.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import type { TrustedDeviceRequestContext } from "../devices/devices.types.js"
import { AttendanceRealtimeService } from "./attendance-realtime.service.js"
import { GpsValidatorService } from "./gps-validator.service.js"
import { LocationAnchorService } from "./location-anchor.service.js"
import { QrTokenService } from "./qr-token.service.js"

type AttendanceSessionRecord = {
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

type SessionStatePublishRecord = {
  id: string
  status: "DRAFT" | "ACTIVE" | "ENDED" | "CANCELLED" | "EXPIRED"
  endedAt: Date | null
  editableUntil: Date | null
}

type MarkAttendanceAttemptResult =
  | {
      kind: "SUCCESS"
      session: AttendanceSessionRecord
      attendanceRecord: {
        id: string
        status: "PRESENT" | "ABSENT"
        markSource: "QR_GPS" | "BLUETOOTH" | "MANUAL" | null
        markedAt: Date | null
      }
      distanceMeters: number
      accuracyMeters: number
    }
  | {
      kind: "SESSION_INACTIVE"
      session: AttendanceSessionRecord
      expiredDuringAttempt: boolean
    }
  | {
      kind: "TOKEN_INVALID"
      reason: QrTokenValidationReason
    }
  | {
      kind: "GPS_INVALID"
      session: AttendanceSessionRecord
      reason: GpsValidationReason
      distanceMeters: number | null
      accuracyMeters: number
      qrSlice: number
    }
  | {
      kind: "DUPLICATE"
    }

@Injectable()
export class QrAttendanceService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ClassroomsService) private readonly classroomsService: ClassroomsService,
    @Inject(LecturesService) private readonly lecturesService: LecturesService,
    @Inject(SchedulingService) private readonly schedulingService: SchedulingService,
    @Inject(LocationAnchorService) private readonly locationAnchorService: LocationAnchorService,
    @Inject(GpsValidatorService) private readonly gpsValidatorService: GpsValidatorService,
    @Inject(QrTokenService) private readonly qrTokenService: QrTokenService,
    @Inject(AttendanceRealtimeService)
    private readonly realtimeService: AttendanceRealtimeService,
  ) {}

  async createQrSession(
    auth: AuthRequestContext,
    request: CreateQrSessionRequest,
  ): Promise<AttendanceSessionSummary> {
    const now = new Date()
    const classroom = await this.classroomsService.requireAccessibleClassroom(
      auth,
      request.classroomId,
    )

    this.assertClassroomAllowsQrSession(classroom)

    const courseOffering = await this.database.prisma.courseOffering.findUnique({
      where: {
        id: request.classroomId,
      },
      select: {
        id: true,
        displayTitle: true,
        defaultGpsRadiusMeters: true,
        defaultSessionDurationMinutes: true,
        qrRotationWindowSeconds: true,
        semesterId: true,
        classId: true,
        sectionId: true,
        subjectId: true,
        primaryTeacherId: true,
      },
    })

    if (!courseOffering) {
      throw new NotFoundException("Classroom not found.")
    }

    const expiredSessions = await this.expireTimedOutActiveSessions(request.classroomId, now)

    const activeSession = await this.database.prisma.attendanceSession.findFirst({
      where: {
        courseOfferingId: request.classroomId,
        mode: "QR_GPS",
        status: "ACTIVE",
      },
      select: {
        id: true,
        lectureId: true,
        startedAt: true,
      },
    })

    if (activeSession) {
      throw new ConflictException("A QR attendance session is already active for this classroom.")
    }

    const teacherAssignment = await this.resolveTeacherAssignment({
      actor: auth,
      classroomId: request.classroomId,
      semesterId: courseOffering.semesterId,
      classId: courseOffering.classId,
      sectionId: courseOffering.sectionId,
      subjectId: courseOffering.subjectId,
      primaryTeacherId: courseOffering.primaryTeacherId,
    })

    const anchor = this.locationAnchorService.resolveForSession({
      request,
      defaultRadiusMeters: courseOffering.defaultGpsRadiusMeters,
      classroomDisplayTitle: courseOffering.displayTitle,
      now,
    })

    const sessionDurationMinutes =
      request.sessionDurationMinutes ?? courseOffering.defaultSessionDurationMinutes
    const durationSeconds = sessionDurationMinutes * 60
    const scheduledEndAt = new Date(now.getTime() + durationSeconds * 1_000)
    const qrSeed = randomBytes(32).toString("hex")

    const linkedLectureId = await this.resolveLectureLink({
      auth,
      classroomId: request.classroomId,
      request,
      now,
    })

    const session = await runInTransaction(this.database.prisma, async (transaction) => {
      const eligibleEnrollments = await transaction.enrollment.findMany({
        where: {
          courseOfferingId: request.classroomId,
          status: "ACTIVE",
        },
        select: {
          id: true,
          studentId: true,
        },
      })

      const createdSession = await transaction.attendanceSession.create({
        data: {
          courseOfferingId: request.classroomId,
          ...(linkedLectureId ? { lectureId: linkedLectureId } : {}),
          teacherAssignmentId: teacherAssignment.id,
          teacherId: teacherAssignment.teacherId,
          semesterId: teacherAssignment.semesterId,
          classId: teacherAssignment.classId,
          sectionId: teacherAssignment.sectionId,
          subjectId: teacherAssignment.subjectId,
          mode: "QR_GPS",
          status: "ACTIVE",
          startedAt: now,
          scheduledEndAt,
          durationSeconds,
          qrSeed,
          gpsAnchorType: anchor.anchorType,
          gpsAnchorLabel: anchor.anchorLabel,
          gpsAnchorResolvedAt: anchor.anchorResolvedAt,
          gpsCenterLatitude: anchor.anchorLatitude,
          gpsCenterLongitude: anchor.anchorLongitude,
          gpsRadiusMeters: anchor.radiusMeters,
          qrRotationWindowSeconds: courseOffering.qrRotationWindowSeconds,
          rosterSnapshotCount: eligibleEnrollments.length,
          presentCount: 0,
          absentCount: eligibleEnrollments.length,
        },
      })

      if (eligibleEnrollments.length > 0) {
        await transaction.attendanceRecord.createMany({
          data: eligibleEnrollments.map((enrollment) => ({
            sessionId: createdSession.id,
            enrollmentId: enrollment.id,
            studentId: enrollment.studentId,
            status: "ABSENT",
          })),
        })
      }

      await this.openLectureForAttendance(transaction, linkedLectureId)

      await recordAttendanceEvent(transaction, {
        sessionId: createdSession.id,
        actorUserId: auth.userId,
        eventType: "SESSION_CREATED",
        mode: "QR_GPS",
        metadata: {
          classroomId: request.classroomId,
          lectureId: linkedLectureId,
          gpsRadiusMeters: anchor.radiusMeters,
          anchorType: anchor.anchorType,
          rosterSnapshotCount: eligibleEnrollments.length,
        },
      })

      await queueOutboxEvent(transaction, {
        topic: "attendance.session.created",
        aggregateType: "attendance_session",
        aggregateId: createdSession.id,
        payload: {
          sessionId: createdSession.id,
          classroomId: request.classroomId,
          actorUserId: auth.userId,
          lectureId: linkedLectureId,
          rosterSnapshotCount: eligibleEnrollments.length,
        },
      })

      return transaction.attendanceSession.findUniqueOrThrow({
        where: {
          id: createdSession.id,
        },
      })
    })

    for (const expiredSession of expiredSessions) {
      await this.publishSessionState(expiredSession)
    }

    await this.publishSessionState(session)

    return this.toAttendanceSessionSummary(session)
  }

  async getSession(
    auth: AuthRequestContext,
    params: AttendanceSessionParams,
  ): Promise<AttendanceSessionSummary> {
    const existing = await this.database.prisma.attendanceSession.findUnique({
      where: {
        id: params.sessionId,
      },
    })

    if (!existing) {
      throw new NotFoundException("Attendance session not found.")
    }

    await this.classroomsService.requireAccessibleClassroom(auth, existing.courseOfferingId)

    if (existing.mode === "MANUAL") {
      throw new BadRequestException("Manual attendance sessions are not available on this route.")
    }

    const now = new Date()
    let session: AttendanceSessionRecord = existing

    if (existing.status === "ACTIVE" && existing.scheduledEndAt && existing.scheduledEndAt <= now) {
      session = await runInTransaction(this.database.prisma, async (transaction) => {
        return this.expireSessionIfPastEnd(transaction, existing, now)
      })

      if (session.status === "EXPIRED") {
        await this.realtimeService.publishSessionStateChanged({
          sessionId: session.id,
          status: session.status,
          endedAt: session.endedAt?.toISOString() ?? null,
          editableUntil: session.editableUntil?.toISOString() ?? null,
        })
      }
    }

    return this.toAttendanceSessionSummary(session)
  }

  async endSession(
    auth: AuthRequestContext,
    params: AttendanceSessionParams,
  ): Promise<EndAttendanceSessionResponse> {
    const existing = await this.database.prisma.attendanceSession.findUnique({
      where: {
        id: params.sessionId,
      },
    })

    if (!existing) {
      throw new NotFoundException("Attendance session not found.")
    }

    await this.classroomsService.requireAccessibleClassroom(auth, existing.courseOfferingId)

    if (existing.mode === "MANUAL") {
      throw new BadRequestException("Manual attendance sessions cannot be ended here.")
    }

    if (
      existing.status === "ENDED" ||
      existing.status === "EXPIRED" ||
      existing.status === "CANCELLED"
    ) {
      return endAttendanceSessionResponseSchema.parse(this.toAttendanceSessionSummary(existing))
    }

    if (existing.status !== "ACTIVE") {
      throw new ConflictException("Only active attendance sessions can be ended.")
    }

    const endedAt = new Date()
    const editableUntil = new Date(endedAt.getTime() + 24 * 60 * 60 * 1_000)

    const endedSession = await runInTransaction(this.database.prisma, async (transaction) => {
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

      await this.completeLectureAfterAttendance(
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

    await this.realtimeService.publishSessionStateChanged({
      sessionId: endedSession.id,
      status: endedSession.status,
      endedAt: endedSession.endedAt?.toISOString() ?? null,
      editableUntil: endedSession.editableUntil?.toISOString() ?? null,
    })

    return endAttendanceSessionResponseSchema.parse(this.toAttendanceSessionSummary(endedSession))
  }

  async markAttendanceFromQr(
    auth: AuthRequestContext,
    trustedDevice: TrustedDeviceRequestContext,
    request: MarkQrAttendanceRequest,
  ): Promise<MarkQrAttendanceResponse> {
    let parsedPayload: { sid: string }

    try {
      parsedPayload = this.qrTokenService.parsePayload(request.qrPayload)
    } catch {
      throw new BadRequestException("The QR token is invalid for this session.")
    }

    const now = new Date()

    const result = await runInTransaction(
      this.database.prisma,
      async (transaction): Promise<MarkAttendanceAttemptResult> => {
        const currentSession = await transaction.attendanceSession.findUnique({
          where: {
            id: parsedPayload.sid,
          },
        })

        if (!currentSession) {
          throw new NotFoundException("Attendance session not found.")
        }

        const session = await this.expireSessionIfPastEnd(transaction, currentSession, now)
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

        const tokenValidation = this.qrTokenService.validateToken({
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

        const gpsValidation = this.gpsValidatorService.validate({
          anchorLatitude: this.toNullableNumber(session.gpsCenterLatitude),
          anchorLongitude: this.toNullableNumber(session.gpsCenterLongitude),
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
        await this.publishSessionState(result.session)
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
      if (this.isSuspiciousLocationFailure(result.reason)) {
        await this.recordSuspiciousLocationFailure({
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

    await this.realtimeService.publishSessionCounterUpdated({
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

  private async resolveTeacherAssignment(params: {
    actor: AuthRequestContext
    classroomId: string
    semesterId: string
    classId: string
    sectionId: string
    subjectId: string
    primaryTeacherId: string
  }) {
    const teacherId =
      params.actor.activeRole === "TEACHER" ? params.actor.userId : params.primaryTeacherId

    const assignment = await this.database.prisma.teacherAssignment.findFirst({
      where: {
        teacherId,
        semesterId: params.semesterId,
        classId: params.classId,
        sectionId: params.sectionId,
        subjectId: params.subjectId,
        status: "ACTIVE",
      },
    })

    if (!assignment) {
      throw new ForbiddenException(
        "A matching teacher assignment was not found for this classroom.",
      )
    }

    return assignment
  }

  private async resolveLectureLink(params: {
    auth: AuthRequestContext
    classroomId: string
    request: CreateQrSessionRequest
    now: Date
  }): Promise<string | null> {
    if (params.request.lectureId) {
      const lecture = await this.lecturesService.getLectureById(params.request.lectureId)

      if (lecture.courseOfferingId !== params.classroomId) {
        throw new BadRequestException("The selected lecture does not belong to this classroom.")
      }

      return lecture.id
    }

    const linkedLecture = await this.schedulingService.ensureLectureLinkForAttendanceSession({
      classroomId: params.classroomId,
      actorUserId: params.auth.userId,
      lectureDate: params.request.lectureDate ?? params.now,
      ...(params.request.scheduleSlotId ? { scheduleSlotId: params.request.scheduleSlotId } : {}),
      ...(params.request.scheduleExceptionId
        ? { scheduleExceptionId: params.request.scheduleExceptionId }
        : {}),
      ...(params.request.lectureTitle ? { title: params.request.lectureTitle } : {}),
      status: "OPEN_FOR_ATTENDANCE",
    })

    return linkedLecture.lectureId
  }

  private async openLectureForAttendance(
    transaction: PrismaTransactionClient,
    lectureId: string | null,
  ) {
    if (!lectureId) {
      return
    }

    await transaction.lecture.update({
      where: {
        id: lectureId,
      },
      data: {
        status: "OPEN_FOR_ATTENDANCE",
      },
    })
  }

  private async completeLectureAfterAttendance(
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

  private assertClassroomAllowsQrSession(classroom: {
    status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED"
    semester: {
      status: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED"
    }
  }) {
    if (classroom.status === "COMPLETED" || classroom.status === "ARCHIVED") {
      throw new BadRequestException(
        "QR attendance sessions cannot start for completed or archived classrooms.",
      )
    }

    if (classroom.semester.status === "CLOSED" || classroom.semester.status === "ARCHIVED") {
      throw new BadRequestException(
        "QR attendance sessions cannot start inside a closed or archived semester.",
      )
    }
  }

  private async expireTimedOutActiveSessions(classroomId: string, now: Date) {
    const timedOutSessions = await this.database.prisma.attendanceSession.findMany({
      where: {
        courseOfferingId: classroomId,
        mode: "QR_GPS",
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
      const expiredSession = await runInTransaction(this.database.prisma, async (transaction) => {
        const expiredSession = await transaction.attendanceSession.update({
          where: {
            id: session.id,
          },
          data: {
            status: "EXPIRED",
            endedAt: now,
            editableUntil: new Date(now.getTime() + 24 * 60 * 60 * 1_000),
          },
        })

        await this.completeLectureAfterAttendance(
          transaction,
          expiredSession.lectureId,
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

        return expiredSession
      })

      expiredSessions.push(expiredSession)
    }

    return expiredSessions
  }

  private async expireSessionIfPastEnd(
    transaction: PrismaTransactionClient,
    session: {
      id: string
      status: "DRAFT" | "ACTIVE" | "ENDED" | "CANCELLED" | "EXPIRED"
      scheduledEndAt: Date | null
      endedAt: Date | null
      editableUntil: Date | null
      lectureId: string | null
      mode: "QR_GPS" | "BLUETOOTH" | "MANUAL"
      startedAt: Date | null
      qrSeed: string | null
      qrRotationWindowSeconds: number | null
      gpsCenterLatitude: { toNumber: () => number } | null
      gpsCenterLongitude: { toNumber: () => number } | null
      gpsRadiusMeters: number | null
      rosterSnapshotCount: number
      presentCount: number
      absentCount: number
      courseOfferingId: string
      teacherAssignmentId: string
      teacherId: string
      semesterId: string
      classId: string
      sectionId: string
      subjectId: string
      durationSeconds: number | null
      gpsAnchorType: "CLASSROOM_FIXED" | "CAMPUS_ZONE" | "TEACHER_SELECTED" | null
      gpsAnchorLabel: string | null
      bleSeed: string | null
      blePublicId: string | null
      bleProtocolVersion: number | null
      bluetoothRotationWindowSeconds: number | null
    },
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

      await this.completeLectureAfterAttendance(
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

  private toAttendanceSessionSummary(input: AttendanceSessionRecord): AttendanceSessionSummary {
    const currentQr =
      input.status === "ACTIVE" &&
      input.mode === "QR_GPS" &&
      input.qrSeed &&
      input.qrRotationWindowSeconds
        ? this.qrTokenService.issueToken({
            sessionId: input.id,
            qrSeed: input.qrSeed,
            rotationWindowSeconds: input.qrRotationWindowSeconds,
          })
        : null

    return attendanceSessionSummarySchema.parse({
      id: input.id,
      classroomId: input.courseOfferingId,
      lectureId: input.lectureId,
      teacherAssignmentId: input.teacherAssignmentId,
      mode: input.mode,
      status: input.status,
      startedAt: input.startedAt?.toISOString() ?? null,
      scheduledEndAt: input.scheduledEndAt?.toISOString() ?? null,
      endedAt: input.endedAt?.toISOString() ?? null,
      editableUntil: input.editableUntil?.toISOString() ?? null,
      durationSeconds: input.durationSeconds,
      anchorType: input.gpsAnchorType,
      anchorLatitude: this.toNullableNumber(input.gpsCenterLatitude),
      anchorLongitude: this.toNullableNumber(input.gpsCenterLongitude),
      anchorLabel: input.gpsAnchorLabel,
      gpsRadiusMeters: input.gpsRadiusMeters,
      qrRotationWindowSeconds: input.qrRotationWindowSeconds,
      bluetoothRotationWindowSeconds: input.bluetoothRotationWindowSeconds,
      blePublicId: input.blePublicId,
      bleProtocolVersion: input.bleProtocolVersion,
      rosterSnapshotCount: input.rosterSnapshotCount,
      presentCount: input.presentCount,
      absentCount: input.absentCount,
      currentQrPayload: currentQr?.payload ?? null,
      currentQrExpiresAt: currentQr?.expiresAt.toISOString() ?? null,
    })
  }

  private toNullableNumber(value: { toNumber: () => number } | null): number | null {
    return value ? value.toNumber() : null
  }

  private async publishSessionState(session: SessionStatePublishRecord) {
    await this.realtimeService.publishSessionStateChanged({
      sessionId: session.id,
      status: session.status,
      endedAt: session.endedAt?.toISOString() ?? null,
      editableUntil: session.editableUntil?.toISOString() ?? null,
    })
  }

  private isSuspiciousLocationFailure(
    reason: GpsValidationReason,
  ): reason is "OUT_OF_RADIUS" | "ACCURACY_TOO_LOW" {
    return reason === "OUT_OF_RADIUS" || reason === "ACCURACY_TOO_LOW"
  }

  private async recordSuspiciousLocationFailure(input: {
    auth: AuthRequestContext
    trustedDevice: TrustedDeviceRequestContext
    session: AttendanceSessionRecord
    reason: "OUT_OF_RADIUS" | "ACCURACY_TOO_LOW"
    distanceMeters: number | null
    accuracyMeters: number
    qrSlice: number
  }) {
    await this.database.prisma.securityEvent.create({
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
}
