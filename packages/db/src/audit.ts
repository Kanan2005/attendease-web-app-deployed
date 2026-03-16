import type {
  AdminActionType,
  AttendanceEventType,
  AttendanceMode,
  AttendanceRecordStatus,
  EmailLogStatus,
  OutboxStatus,
  Prisma,
  SecurityEventSeverity,
  SecurityEventType,
} from "@prisma/client"

import type { PrismaTransactionClient } from "./client"

export type AttendanceEventHelperParams = {
  id?: string
  sessionId: string
  attendanceRecordId?: string
  studentId?: string
  actorUserId?: string
  deviceId?: string
  eventType: AttendanceEventType
  mode?: AttendanceMode
  previousStatus?: AttendanceRecordStatus
  newStatus?: AttendanceRecordStatus
  metadata?: Prisma.InputJsonValue
  occurredAt?: Date
}

export type AttendanceEditAuditLogHelperParams = {
  id?: string
  sessionId: string
  attendanceRecordId: string
  studentId: string
  editedByUserId: string
  previousStatus: AttendanceRecordStatus
  newStatus: AttendanceRecordStatus
  editedAt?: Date
}

export type SecurityEventHelperParams = {
  id?: string
  userId?: string
  actorUserId?: string
  deviceId?: string
  bindingId?: string
  courseOfferingId?: string
  sessionId?: string
  eventType: SecurityEventType
  severity?: SecurityEventSeverity
  description?: string
  metadata?: Prisma.InputJsonValue
  createdAt?: Date
}

export type AdminActionLogHelperParams = {
  id?: string
  adminUserId: string
  targetUserId?: string
  targetDeviceId?: string
  targetBindingId?: string
  targetCourseOfferingId?: string
  targetSessionId?: string
  actionType: AdminActionType
  metadata?: Prisma.InputJsonValue
  createdAt?: Date
}

export type EmailLogHelperParams = {
  id?: string
  dispatchRunId?: string
  ruleId?: string
  studentId?: string
  recipientEmail: string
  subject: string
  body: string
  status?: EmailLogStatus
  providerMessageId?: string
  failureReason?: string
  createdAt?: Date
  sentAt?: Date
}

export type OutboxEventHelperParams = {
  id?: string
  topic: string
  aggregateType: string
  aggregateId: string
  payload: Prisma.InputJsonValue
  status?: OutboxStatus
  availableAt?: Date
  lockedAt?: Date
  processedAt?: Date
  attemptCount?: number
  lastError?: string
}

export function buildAttendanceEventData(
  params: AttendanceEventHelperParams,
): Prisma.AttendanceEventUncheckedCreateInput {
  return {
    ...(params.id ? { id: params.id } : {}),
    sessionId: params.sessionId,
    ...(params.attendanceRecordId ? { attendanceRecordId: params.attendanceRecordId } : {}),
    ...(params.studentId ? { studentId: params.studentId } : {}),
    ...(params.actorUserId ? { actorUserId: params.actorUserId } : {}),
    ...(params.deviceId ? { deviceId: params.deviceId } : {}),
    eventType: params.eventType,
    ...(params.mode ? { mode: params.mode } : {}),
    ...(params.previousStatus ? { previousStatus: params.previousStatus } : {}),
    ...(params.newStatus ? { newStatus: params.newStatus } : {}),
    ...(params.metadata !== undefined ? { metadata: params.metadata } : {}),
    ...(params.occurredAt ? { occurredAt: params.occurredAt } : {}),
  }
}

export function buildAttendanceEditAuditLogData(
  params: AttendanceEditAuditLogHelperParams,
): Prisma.AttendanceEditAuditLogUncheckedCreateInput {
  return {
    ...(params.id ? { id: params.id } : {}),
    sessionId: params.sessionId,
    attendanceRecordId: params.attendanceRecordId,
    studentId: params.studentId,
    editedByUserId: params.editedByUserId,
    previousStatus: params.previousStatus,
    newStatus: params.newStatus,
    ...(params.editedAt ? { editedAt: params.editedAt } : {}),
  }
}

export function buildSecurityEventData(
  params: SecurityEventHelperParams,
): Prisma.SecurityEventUncheckedCreateInput {
  return {
    ...(params.id ? { id: params.id } : {}),
    ...(params.userId ? { userId: params.userId } : {}),
    ...(params.actorUserId ? { actorUserId: params.actorUserId } : {}),
    ...(params.deviceId ? { deviceId: params.deviceId } : {}),
    ...(params.bindingId ? { bindingId: params.bindingId } : {}),
    ...(params.courseOfferingId ? { courseOfferingId: params.courseOfferingId } : {}),
    ...(params.sessionId ? { sessionId: params.sessionId } : {}),
    eventType: params.eventType,
    severity: params.severity ?? "MEDIUM",
    ...(params.description ? { description: params.description } : {}),
    ...(params.metadata !== undefined ? { metadata: params.metadata } : {}),
    ...(params.createdAt ? { createdAt: params.createdAt } : {}),
  }
}

export function buildAdminActionLogData(
  params: AdminActionLogHelperParams,
): Prisma.AdminActionLogUncheckedCreateInput {
  return {
    ...(params.id ? { id: params.id } : {}),
    adminUserId: params.adminUserId,
    ...(params.targetUserId ? { targetUserId: params.targetUserId } : {}),
    ...(params.targetDeviceId ? { targetDeviceId: params.targetDeviceId } : {}),
    ...(params.targetBindingId ? { targetBindingId: params.targetBindingId } : {}),
    ...(params.targetCourseOfferingId
      ? { targetCourseOfferingId: params.targetCourseOfferingId }
      : {}),
    ...(params.targetSessionId ? { targetSessionId: params.targetSessionId } : {}),
    actionType: params.actionType,
    ...(params.metadata !== undefined ? { metadata: params.metadata } : {}),
    ...(params.createdAt ? { createdAt: params.createdAt } : {}),
  }
}

export function buildEmailLogData(
  params: EmailLogHelperParams,
): Prisma.EmailLogUncheckedCreateInput {
  return {
    ...(params.id ? { id: params.id } : {}),
    ...(params.dispatchRunId ? { dispatchRunId: params.dispatchRunId } : {}),
    ...(params.ruleId ? { ruleId: params.ruleId } : {}),
    ...(params.studentId ? { studentId: params.studentId } : {}),
    recipientEmail: params.recipientEmail,
    subject: params.subject,
    body: params.body,
    status: params.status ?? "PENDING",
    ...(params.providerMessageId ? { providerMessageId: params.providerMessageId } : {}),
    ...(params.failureReason ? { failureReason: params.failureReason } : {}),
    ...(params.createdAt ? { createdAt: params.createdAt } : {}),
    ...(params.sentAt ? { sentAt: params.sentAt } : {}),
  }
}

export function buildOutboxEventData(
  params: OutboxEventHelperParams,
): Prisma.OutboxEventUncheckedCreateInput {
  return {
    ...(params.id ? { id: params.id } : {}),
    topic: params.topic,
    aggregateType: params.aggregateType,
    aggregateId: params.aggregateId,
    payload: params.payload,
    status: params.status ?? "PENDING",
    ...(params.availableAt ? { availableAt: params.availableAt } : {}),
    ...(params.lockedAt ? { lockedAt: params.lockedAt } : {}),
    ...(params.processedAt ? { processedAt: params.processedAt } : {}),
    attemptCount: params.attemptCount ?? 0,
    ...(params.lastError ? { lastError: params.lastError } : {}),
  }
}

export async function recordAttendanceEvent(
  transaction: PrismaTransactionClient,
  params: AttendanceEventHelperParams,
) {
  return transaction.attendanceEvent.create({
    data: buildAttendanceEventData(params),
  })
}

export async function recordAttendanceEditTrail(
  transaction: PrismaTransactionClient,
  params: {
    attendanceEvent: AttendanceEventHelperParams
    auditLog: AttendanceEditAuditLogHelperParams
    outboxEvent?: OutboxEventHelperParams
  },
) {
  const attendanceEvent = await recordAttendanceEvent(transaction, params.attendanceEvent)
  const auditLog = await transaction.attendanceEditAuditLog.create({
    data: buildAttendanceEditAuditLogData(params.auditLog),
  })
  const outboxEvent = params.outboxEvent
    ? await transaction.outboxEvent.create({ data: buildOutboxEventData(params.outboxEvent) })
    : null

  return {
    attendanceEvent,
    auditLog,
    outboxEvent,
  }
}

export async function recordDeviceActionTrail(
  transaction: PrismaTransactionClient,
  params: {
    securityEvent: SecurityEventHelperParams
    adminAction?: AdminActionLogHelperParams
    outboxEvent?: OutboxEventHelperParams
  },
) {
  const securityEvent = await transaction.securityEvent.create({
    data: buildSecurityEventData(params.securityEvent),
  })
  const adminAction = params.adminAction
    ? await transaction.adminActionLog.create({ data: buildAdminActionLogData(params.adminAction) })
    : null
  const outboxEvent = params.outboxEvent
    ? await transaction.outboxEvent.create({ data: buildOutboxEventData(params.outboxEvent) })
    : null

  return {
    securityEvent,
    adminAction,
    outboxEvent,
  }
}

export async function recordAdministrativeActionTrail(
  transaction: PrismaTransactionClient,
  params: {
    adminAction: AdminActionLogHelperParams
    outboxEvent?: OutboxEventHelperParams
  },
) {
  const adminAction = await transaction.adminActionLog.create({
    data: buildAdminActionLogData(params.adminAction),
  })
  const outboxEvent = params.outboxEvent
    ? await transaction.outboxEvent.create({ data: buildOutboxEventData(params.outboxEvent) })
    : null

  return {
    adminAction,
    outboxEvent,
  }
}

export async function recordAutomationLogTrail(
  transaction: PrismaTransactionClient,
  params: {
    emailLog: EmailLogHelperParams
    outboxEvent?: OutboxEventHelperParams
  },
) {
  const emailLog = await transaction.emailLog.create({
    data: buildEmailLogData(params.emailLog),
  })
  const outboxEvent = params.outboxEvent
    ? await transaction.outboxEvent.create({ data: buildOutboxEventData(params.outboxEvent) })
    : null

  return {
    emailLog,
    outboxEvent,
  }
}

export async function queueOutboxEvent(
  transaction: PrismaTransactionClient,
  params: OutboxEventHelperParams,
) {
  return transaction.outboxEvent.create({
    data: buildOutboxEventData(params),
  })
}
