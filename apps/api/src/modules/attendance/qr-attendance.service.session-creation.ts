import { randomBytes } from "node:crypto"

import type { CreateQrSessionRequest } from "@attendease/contracts"
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
  NotFoundException,
} from "@nestjs/common"

import type { AuthRequestContext } from "../auth/auth.types.js"
import { toAttendanceSessionSummary } from "./qr-attendance.service.serialization.js"
import {
  expireTimedOutActiveSessions,
  publishSessionState,
} from "./qr-attendance.service.session-state.js"
import type { QrAttendanceServiceContext } from "./qr-attendance.service.types.js"

export async function createQrSession(
  context: QrAttendanceServiceContext,
  auth: AuthRequestContext,
  request: CreateQrSessionRequest,
) {
  const now = new Date()
  const classroom = await context.classroomsService.requireAccessibleClassroom(
    auth,
    request.classroomId,
  )

  assertClassroomAllowsQrSession(classroom)

  const courseOffering = await context.database.prisma.courseOffering.findUnique({
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

  const expiredSessions = await expireTimedOutActiveSessions(context, request.classroomId, now)

  const activeSession = await context.database.prisma.attendanceSession.findFirst({
    where: {
      courseOfferingId: request.classroomId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      lectureId: true,
      startedAt: true,
      mode: true,
    },
  })

  if (activeSession) {
    const modeLabel = activeSession.mode === "BLUETOOTH" ? "Bluetooth" : "QR"
    throw new ConflictException(
      `A ${modeLabel} attendance session is already active for this classroom.`,
    )
  }

  const teacherAssignment = await resolveTeacherAssignment(context, {
    actor: auth,
    classroomId: request.classroomId,
    semesterId: courseOffering.semesterId,
    classId: courseOffering.classId,
    sectionId: courseOffering.sectionId,
    subjectId: courseOffering.subjectId,
    primaryTeacherId: courseOffering.primaryTeacherId,
  })

  const anchor = context.locationAnchorService.resolveForSession({
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

  const linkedLectureId = await resolveLectureLink(context, {
    auth,
    classroomId: request.classroomId,
    request,
    now,
  })

  const session = await runInTransaction(context.database.prisma, async (transaction) => {
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

    await openLectureForAttendance(transaction, linkedLectureId)

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
    await publishSessionState(context, expiredSession)
  }

  await publishSessionState(context, session)

  return toAttendanceSessionSummary(context.qrTokenService, session)
}

export async function resolveTeacherAssignment(
  context: QrAttendanceServiceContext,
  params: {
    actor: AuthRequestContext
    classroomId: string
    semesterId: string
    classId: string
    sectionId: string
    subjectId: string
    primaryTeacherId: string
  },
) {
  const teacherId =
    params.actor.activeRole === "TEACHER" ? params.actor.userId : params.primaryTeacherId

  const assignment = await context.database.prisma.teacherAssignment.findFirst({
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
    throw new ForbiddenException("A matching teacher assignment was not found for this classroom.")
  }

  return assignment
}

export async function resolveLectureLink(
  context: QrAttendanceServiceContext,
  params: {
    auth: AuthRequestContext
    classroomId: string
    request: CreateQrSessionRequest
    now: Date
  },
): Promise<string | null> {
  if (params.request.lectureId) {
    const lecture = await context.lecturesService.getLectureById(params.request.lectureId)

    if (lecture.courseOfferingId !== params.classroomId) {
      throw new BadRequestException("The selected lecture does not belong to this classroom.")
    }

    return lecture.id
  }

  const linkedLecture = await context.schedulingService.ensureLectureLinkForAttendanceSession({
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

export async function openLectureForAttendance(
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

export function assertClassroomAllowsQrSession(classroom: {
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
