import { randomBytes } from "node:crypto"

import { loadApiEnv } from "@attendease/config"
import {
  type AttendanceSessionSummary,
  type BluetoothSessionCreateResponse,
  type BluetoothTokenValidationReason,
  type CreateBluetoothSessionRequest,
  type MarkBluetoothAttendanceRequest,
  type MarkBluetoothAttendanceResponse,
  attendanceSessionSummarySchema,
  bluetoothSessionCreateResponseSchema,
  markBluetoothAttendanceResponseSchema,
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
import { BluetoothTokenService } from "./bluetooth-token.service.js"

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
      detectionSlice: number
      detectionRssi: number | null
    }
  | {
      kind: "SESSION_INACTIVE"
      session: AttendanceSessionRecord
      expiredDuringAttempt: boolean
    }
  | {
      kind: "TOKEN_INVALID"
      session: AttendanceSessionRecord | null
      reason: BluetoothTokenValidationReason
      detectionSlice: number | null
      publicId: string | null
    }
  | {
      kind: "DUPLICATE"
    }
  | {
      kind: "NOT_ELIGIBLE"
    }

@Injectable()
export class BluetoothAttendanceService {
  private readonly env = loadApiEnv(process.env)

  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ClassroomsService) private readonly classroomsService: ClassroomsService,
    @Inject(LecturesService) private readonly lecturesService: LecturesService,
    @Inject(SchedulingService) private readonly schedulingService: SchedulingService,
    @Inject(BluetoothTokenService)
    private readonly bluetoothTokenService: BluetoothTokenService,
    @Inject(AttendanceRealtimeService)
    private readonly realtimeService: AttendanceRealtimeService,
  ) {}

  async createBluetoothSession(
    auth: AuthRequestContext,
    request: CreateBluetoothSessionRequest,
  ): Promise<BluetoothSessionCreateResponse> {
    const now = new Date()
    const classroom = await this.classroomsService.requireAccessibleClassroom(
      auth,
      request.classroomId,
    )

    this.assertClassroomAllowsBluetoothSession(classroom)

    const courseOffering = await this.database.prisma.courseOffering.findUnique({
      where: {
        id: request.classroomId,
      },
      select: {
        id: true,
        defaultSessionDurationMinutes: true,
        bluetoothRotationWindowSeconds: true,
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
        mode: "BLUETOOTH",
        status: "ACTIVE",
      },
      select: {
        id: true,
      },
    })

    if (activeSession) {
      throw new ConflictException(
        "A Bluetooth attendance session is already active for this classroom.",
      )
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

    const sessionDurationMinutes =
      request.sessionDurationMinutes ?? courseOffering.defaultSessionDurationMinutes
    const durationSeconds = sessionDurationMinutes * 60
    const scheduledEndAt = new Date(now.getTime() + durationSeconds * 1_000)
    const bleSeed = randomBytes(32).toString("hex")
    const blePublicId = randomBytes(10).toString("hex")
    const bleProtocolVersion = this.env.ATTENDANCE_BLUETOOTH_PROTOCOL_VERSION

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
          mode: "BLUETOOTH",
          status: "ACTIVE",
          startedAt: now,
          scheduledEndAt,
          durationSeconds,
          bleSeed,
          blePublicId,
          bleProtocolVersion,
          bluetoothRotationWindowSeconds: courseOffering.bluetoothRotationWindowSeconds,
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
        mode: "BLUETOOTH",
        metadata: {
          actorUserId: auth.userId,
          lectureId: linkedLectureId,
          rosterSnapshotCount: eligibleEnrollments.length,
          blePublicId,
          bleProtocolVersion,
          sessionDurationMinutes,
        },
      })

      await queueOutboxEvent(transaction, {
        topic: "attendance.session.created",
        aggregateType: "attendance_session",
        aggregateId: createdSession.id,
        payload: {
          sessionId: createdSession.id,
          classroomId: request.classroomId,
          mode: "BLUETOOTH",
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

    const currentPayload = this.bluetoothTokenService.issueToken({
      publicId: blePublicId,
      bleSeed,
      protocolVersion: bleProtocolVersion,
      rotationWindowSeconds: session.bluetoothRotationWindowSeconds ?? 10,
      now,
    })

    return bluetoothSessionCreateResponseSchema.parse({
      session: this.toAttendanceSessionSummary(session),
      advertiser: {
        sessionId: session.id,
        serviceUuid: this.env.ATTENDANCE_BLUETOOTH_SERVICE_UUID,
        publicId: blePublicId,
        protocolVersion: bleProtocolVersion,
        rotationWindowSeconds: session.bluetoothRotationWindowSeconds,
        seed: bleSeed,
        currentPayload: currentPayload.payload,
        currentPayloadExpiresAt: currentPayload.expiresAt.toISOString(),
      },
    })
  }

  async markAttendanceFromBluetooth(
    auth: AuthRequestContext,
    trustedDevice: TrustedDeviceRequestContext,
    request: MarkBluetoothAttendanceRequest,
  ): Promise<MarkBluetoothAttendanceResponse> {
    const now = new Date()
    let parsedPayload: {
      pid: string
      ts: number
    } | null = null

    try {
      const parsed = this.bluetoothTokenService.parsePayload(request.detectedPayload)
      parsedPayload = {
        pid: parsed.pid,
        ts: parsed.ts,
      }
    } catch {
      await this.recordBluetoothValidationFailure({
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

    const session = await this.database.prisma.attendanceSession.findFirst({
      where: {
        mode: "BLUETOOTH",
        blePublicId: parsedPayload.pid,
      },
    })

    if (!session) {
      await this.recordBluetoothValidationFailure({
        auth,
        trustedDevice,
        session: null,
        reason: "SESSION_MISMATCH",
        detectionSlice: parsedPayload.ts,
        publicId: parsedPayload.pid,
        detectionRssi: request.rssi ?? null,
        description:
          "Bluetooth attendance was rejected because the detected payload did not match an active AttendEase session.",
      })

      throw new BadRequestException("The Bluetooth attendance payload is invalid for this session.")
    }

    const result = await runInTransaction(this.database.prisma, async (transaction) => {
      const freshSession = await transaction.attendanceSession.findUniqueOrThrow({
        where: {
          id: session.id,
        },
      })

      const sessionForMark = await this.expireSessionIfPastEnd(transaction, freshSession, now)
      const expiredDuringAttempt =
        sessionForMark.status === "EXPIRED" && freshSession.status === "ACTIVE"

      if (sessionForMark.status !== "ACTIVE") {
        return {
          kind: "SESSION_INACTIVE",
          session: sessionForMark,
          expiredDuringAttempt,
        } satisfies MarkAttendanceAttemptResult
      }

      const tokenValidation = this.bluetoothTokenService.validateToken({
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
          publicId: parsedPayload?.pid ?? null,
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
        await this.publishSessionState(result.session)
      }

      throw new ConflictException("This attendance session is not active.")
    }

    if (result.kind === "TOKEN_INVALID") {
      await this.recordBluetoothValidationFailure({
        auth,
        trustedDevice,
        session: result.session,
        reason: result.reason,
        detectionSlice: result.detectionSlice,
        publicId: result.publicId,
        detectionRssi: request.rssi ?? null,
        description: this.describeBluetoothValidationFailure(result.reason),
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

    await this.realtimeService.publishSessionCounterUpdated({
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
    request: CreateBluetoothSessionRequest
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

  private assertClassroomAllowsBluetoothSession(classroom: {
    status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED"
    semester: {
      status: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED"
    }
  }) {
    if (classroom.status === "COMPLETED" || classroom.status === "ARCHIVED") {
      throw new BadRequestException(
        "Bluetooth attendance sessions cannot start for completed or archived classrooms.",
      )
    }

    if (classroom.semester.status === "CLOSED" || classroom.semester.status === "ARCHIVED") {
      throw new BadRequestException(
        "Bluetooth attendance sessions cannot start inside a closed or archived semester.",
      )
    }
  }

  private async expireTimedOutActiveSessions(classroomId: string, now: Date) {
    const timedOutSessions = await this.database.prisma.attendanceSession.findMany({
      where: {
        courseOfferingId: classroomId,
        mode: "BLUETOOTH",
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

  private async expireSessionIfPastEnd(
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
      currentQrPayload: null,
      currentQrExpiresAt: null,
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

  private async recordBluetoothValidationFailure(input: {
    auth: AuthRequestContext
    trustedDevice: TrustedDeviceRequestContext
    session: AttendanceSessionRecord | null
    reason: BluetoothTokenValidationReason
    detectionSlice: number | null
    publicId: string | null
    detectionRssi: number | null
    description: string
  }) {
    await this.database.prisma.securityEvent.create({
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

  private describeBluetoothValidationFailure(reason: BluetoothTokenValidationReason) {
    switch (reason) {
      case "EXPIRED":
        return "Bluetooth attendance was rejected because the detected rotating identifier had already expired."
      case "SESSION_MISMATCH":
        return "Bluetooth attendance was rejected because the detected rotating identifier did not match the active session."
      default:
        return "Bluetooth attendance was rejected because the detected rotating identifier failed validation."
    }
  }
}
