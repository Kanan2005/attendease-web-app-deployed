import {
  attendanceSessionDetailSchema,
  attendanceSessionHistoryResponseSchema,
  attendanceSessionStudentsResponseSchema,
  attendanceSessionSummarySchema,
  authSessionResponseSchema,
  liveAttendanceSessionsResponseSchema,
  studentAttendanceHistoryResponseSchema,
  updateAttendanceSessionAttendanceResponseSchema,
} from "@attendease/contracts"
import { createPrismaClient, developmentSeedIds, disconnectPrismaClient } from "@attendease/db"
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify"
import { Test } from "@nestjs/testing"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { AppModule } from "../../app.module.js"
import {
  type TemporaryDatabase,
  authIntegrationFixtures,
  createTemporaryDatabase,
  destroyTemporaryDatabase,
  seedAuthIntegrationData,
} from "../../test/integration-helpers.js"
import { GoogleOidcService } from "../auth/google-oidc.service.js"
import { AttendanceRealtimeService } from "./attendance-realtime.service.js"

describe("Attendance history integration", () => {
  const originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
    AUTH_ACCESS_TOKEN_SECRET: process.env.AUTH_ACCESS_TOKEN_SECRET,
    AUTH_ISSUER: process.env.AUTH_ISSUER,
    AUTH_AUDIENCE: process.env.AUTH_AUDIENCE,
    GOOGLE_OIDC_CLIENT_ID: process.env.GOOGLE_OIDC_CLIENT_ID,
    GOOGLE_OIDC_CLIENT_SECRET: process.env.GOOGLE_OIDC_CLIENT_SECRET,
    GOOGLE_OIDC_REDIRECT_URI: process.env.GOOGLE_OIDC_REDIRECT_URI,
    GOOGLE_TEACHER_ALLOWED_DOMAINS: process.env.GOOGLE_TEACHER_ALLOWED_DOMAINS,
    GOOGLE_STUDENT_ALLOWED_DOMAINS: process.env.GOOGLE_STUDENT_ALLOWED_DOMAINS,
    ATTENDANCE_QR_ALLOWED_CLOCK_SKEW_SLICES: process.env.ATTENDANCE_QR_ALLOWED_CLOCK_SKEW_SLICES,
    ATTENDANCE_GPS_MAX_ACCURACY_METERS: process.env.ATTENDANCE_GPS_MAX_ACCURACY_METERS,
  }

  let database: TemporaryDatabase | null = null
  let prisma: ReturnType<typeof createPrismaClient> | null = null
  let app: NestFastifyApplication | null = null

  const googleOidcService = {
    verifyExchange: vi.fn(),
  }
  const realtimeService = {
    publishSessionCounterUpdated: vi.fn(async () => undefined),
    publishSessionStateChanged: vi.fn(async () => undefined),
  }

  beforeAll(async () => {
    database = await createTemporaryDatabase("attendease_history")
    await seedAuthIntegrationData(database.databaseUrl)

    process.env.NODE_ENV = "test"
    process.env.TEST_DATABASE_URL = database.databaseUrl
    process.env.AUTH_ACCESS_TOKEN_SECRET = "attendease-history-secret-1234567890"
    process.env.AUTH_ISSUER = "attendease-api-test"
    process.env.AUTH_AUDIENCE = "attendease-client-test"
    process.env.GOOGLE_OIDC_CLIENT_ID = "history-google-client"
    process.env.GOOGLE_OIDC_CLIENT_SECRET = "history-google-secret"
    process.env.GOOGLE_OIDC_REDIRECT_URI = "http://localhost:3000/auth/google/callback"
    process.env.GOOGLE_TEACHER_ALLOWED_DOMAINS = "attendease.dev"
    process.env.GOOGLE_STUDENT_ALLOWED_DOMAINS = "attendease.dev"
    process.env.ATTENDANCE_QR_ALLOWED_CLOCK_SKEW_SLICES = "1"
    process.env.ATTENDANCE_GPS_MAX_ACCURACY_METERS = "100"

    prisma = createPrismaClient({
      databaseUrl: database.databaseUrl,
      singleton: false,
    })

    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GoogleOidcService)
      .useValue(googleOidcService)
      .overrideProvider(AttendanceRealtimeService)
      .useValue(realtimeService)
      .compile()

    app = testingModule.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    await app.init()
    await app.getHttpAdapter().getInstance().ready()
  })

  beforeEach(async () => {
    vi.clearAllMocks()
  })

  afterAll(async () => {
    if (app) {
      await app.close()
    }

    if (prisma) {
      await disconnectPrismaClient(prisma)
    }

    process.env.NODE_ENV = originalEnv.NODE_ENV
    process.env.TEST_DATABASE_URL = originalEnv.TEST_DATABASE_URL
    process.env.AUTH_ACCESS_TOKEN_SECRET = originalEnv.AUTH_ACCESS_TOKEN_SECRET
    process.env.AUTH_ISSUER = originalEnv.AUTH_ISSUER
    process.env.AUTH_AUDIENCE = originalEnv.AUTH_AUDIENCE
    process.env.GOOGLE_OIDC_CLIENT_ID = originalEnv.GOOGLE_OIDC_CLIENT_ID
    process.env.GOOGLE_OIDC_CLIENT_SECRET = originalEnv.GOOGLE_OIDC_CLIENT_SECRET
    process.env.GOOGLE_OIDC_REDIRECT_URI = originalEnv.GOOGLE_OIDC_REDIRECT_URI
    process.env.GOOGLE_TEACHER_ALLOWED_DOMAINS = originalEnv.GOOGLE_TEACHER_ALLOWED_DOMAINS
    process.env.GOOGLE_STUDENT_ALLOWED_DOMAINS = originalEnv.GOOGLE_STUDENT_ALLOWED_DOMAINS
    process.env.ATTENDANCE_QR_ALLOWED_CLOCK_SKEW_SLICES =
      originalEnv.ATTENDANCE_QR_ALLOWED_CLOCK_SKEW_SLICES
    process.env.ATTENDANCE_GPS_MAX_ACCURACY_METERS = originalEnv.ATTENDANCE_GPS_MAX_ACCURACY_METERS

    if (database) {
      await destroyTemporaryDatabase(database)
    }
  })

  it("lists teacher session history with summary labels and locked editability", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })

    await getPrisma().attendanceSession.update({
      where: {
        id: developmentSeedIds.sessions.mathCompleted,
      },
      data: {
        editableUntil: new Date(Date.now() - 60_000),
      },
    })

    const response = await request("GET", "/sessions", {
      token: teacherSession.tokens.accessToken,
    })

    expect(response.statusCode).toBe(200)
    const sessions = attendanceSessionHistoryResponseSchema.parse(response.body)
    const seeded = sessions.find((row) => row.id === developmentSeedIds.sessions.mathCompleted)

    expect(seeded).toMatchObject({
      id: developmentSeedIds.sessions.mathCompleted,
      classroomId: developmentSeedIds.courseOfferings.math,
      mode: "QR_GPS",
      presentCount: 3,
      absentCount: 1,
      editability: {
        isEditable: false,
        state: "LOCKED",
      },
    })
    expect(seeded?.classroomDisplayTitle).toBeTruthy()
    expect(seeded?.subjectTitle).toBeTruthy()
  })

  it("lists the signed-in student's own attendance history with personal present or absent truth", async () => {
    const studentSession = await login({
      email: authIntegrationFixtures.studentOne.email,
      password: authIntegrationFixtures.studentOne.password,
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: authIntegrationFixtures.studentOne.device,
    })

    const response = await request("GET", "/students/me/history", {
      token: studentSession.tokens.accessToken,
    })

    expect(response.statusCode).toBe(200)
    const history = studentAttendanceHistoryResponseSchema.parse(response.body)
    const seededRecord = history.find(
      (row) => row.sessionId === developmentSeedIds.sessions.mathCompleted,
    )
    const storedRecord = await getPrisma().attendanceRecord.findFirst({
      where: {
        sessionId: developmentSeedIds.sessions.mathCompleted,
        studentId: authIntegrationFixtures.studentOne.userId,
      },
    })

    expect(storedRecord).not.toBeNull()
    expect(seededRecord).toMatchObject({
      sessionId: developmentSeedIds.sessions.mathCompleted,
      classroomId: developmentSeedIds.courseOfferings.math,
      subjectCode: "MATH101",
      attendanceStatus: storedRecord?.status,
      markSource: storedRecord?.markSource,
    })
  })

  it("keeps the student attendance-history route isolated from teacher sessions", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })

    const response = await request("GET", "/students/me/history", {
      token: teacherSession.tokens.accessToken,
    })

    expect(response.statusCode).toBe(403)
  })

  it("returns session detail and the final student list for shared teacher clients", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "MOBILE",
      requestedRole: "TEACHER",
    })

    const detailResponse = await request(
      "GET",
      `/sessions/${developmentSeedIds.sessions.mathCompleted}`,
      {
        token: teacherSession.tokens.accessToken,
      },
    )

    expect(detailResponse.statusCode).toBe(200)
    const detail = attendanceSessionDetailSchema.parse(detailResponse.body)
    expect(detail.id).toBe(developmentSeedIds.sessions.mathCompleted)
    expect(detail.teacherId).toBe(authIntegrationFixtures.teacher.userId)
    expect(detail.teacherDisplayName).toContain("Anurag")
    expect(detail.editability.state).toBe("LOCKED")
    expect(detail.suspiciousAttemptCount).toBeGreaterThanOrEqual(0)

    const studentsResponse = await request(
      "GET",
      `/sessions/${developmentSeedIds.sessions.mathCompleted}/students`,
      {
        token: teacherSession.tokens.accessToken,
      },
    )

    expect(studentsResponse.statusCode).toBe(200)
    const students = attendanceSessionStudentsResponseSchema.parse(studentsResponse.body)
    expect(students).toHaveLength(4)
    expect(students[0]?.studentDisplayName).toBeTruthy()

    const manualStudent = students.find(
      (row) => row.studentId === authIntegrationFixtures.studentThree.userId,
    )
    expect(manualStudent).toMatchObject({
      studentId: authIntegrationFixtures.studentThree.userId,
      status: "PRESENT",
    })
    expect("markSource" in (manualStudent ?? {})).toBe(false)
  })

  it("auto-expires overdue active sessions when the shared detail route is polled", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })

    const created = await createQrSession(teacherSession.tokens.accessToken)

    await getPrisma().attendanceSession.update({
      where: {
        id: created.id,
      },
      data: {
        scheduledEndAt: new Date(Date.now() - 60_000),
      },
    })

    const response = await request("GET", `/sessions/${created.id}`, {
      token: teacherSession.tokens.accessToken,
    })

    expect(response.statusCode).toBe(200)
    const detail = attendanceSessionDetailSchema.parse(response.body)
    expect(detail.status).toBe("EXPIRED")
    expect(detail.editability.state).toBe("OPEN")

    const expiredOutbox = await getPrisma().outboxEvent.findFirst({
      where: {
        aggregateId: created.id,
        topic: "attendance.session.expired",
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    expect(expiredOutbox).not.toBeNull()
    expect(realtimeService.publishSessionStateChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: created.id,
        status: "EXPIRED",
      }),
    )
  })

  it("auto-expires overdue active sessions when the shared history route is polled", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })

    const created = await createQrSession(teacherSession.tokens.accessToken)

    await getPrisma().attendanceSession.update({
      where: {
        id: created.id,
      },
      data: {
        scheduledEndAt: new Date(Date.now() - 60_000),
      },
    })

    const response = await request("GET", "/sessions", {
      token: teacherSession.tokens.accessToken,
    })

    expect(response.statusCode).toBe(200)
    const history = attendanceSessionHistoryResponseSchema.parse(response.body)
    const updatedSession = history.find((session) => session.id === created.id)

    expect(updatedSession?.status).toBe("EXPIRED")
  })

  it("returns shared live session truth for student and teacher clients", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })
    const studentSession = await login({
      email: authIntegrationFixtures.studentOne.email,
      password: authIntegrationFixtures.studentOne.password,
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: authIntegrationFixtures.studentOne.device,
    })

    const qrSession = await createQrSession(teacherSession.tokens.accessToken)
    const bluetoothSession = await createBluetoothSession(teacherSession.tokens.accessToken)

    const [teacherLiveResponse, studentLiveResponse] = await Promise.all([
      request("GET", "/sessions/live", {
        token: teacherSession.tokens.accessToken,
      }),
      request("GET", "/sessions/live", {
        token: studentSession.tokens.accessToken,
      }),
    ])

    expect(teacherLiveResponse.statusCode).toBe(200)
    expect(studentLiveResponse.statusCode).toBe(200)

    const teacherLiveSessions = liveAttendanceSessionsResponseSchema.parse(teacherLiveResponse.body)
    const studentLiveSessions = liveAttendanceSessionsResponseSchema.parse(studentLiveResponse.body)

    expect(teacherLiveSessions.map((session) => session.id)).toEqual(
      expect.arrayContaining([qrSession.id, bluetoothSession.id]),
    )
    expect(studentLiveSessions.map((session) => session.id)).toEqual(
      expect.arrayContaining([qrSession.id, bluetoothSession.id]),
    )
    expect(studentLiveSessions.every((session) => session.status === "ACTIVE")).toBe(true)

    const [endQrResponse, endBluetoothResponse] = await Promise.all([
      request("POST", `/sessions/${qrSession.id}/end`, {
        token: teacherSession.tokens.accessToken,
      }),
      request("POST", `/sessions/${bluetoothSession.id}/end`, {
        token: teacherSession.tokens.accessToken,
      }),
    ])

    expect(endQrResponse.statusCode).toBe(201)
    expect(endBluetoothResponse.statusCode).toBe(201)
  })

  it("applies manual edits transactionally, writes audit logs, and refreshes final counts", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })

    const created = await createQrSession(teacherSession.tokens.accessToken)
    const endResponse = await request("POST", `/sessions/${created.id}/end`, {
      token: teacherSession.tokens.accessToken,
    })

    expect(endResponse.statusCode).toBe(201)

    const beforeStudentsResponse = await request("GET", `/sessions/${created.id}/students`, {
      token: teacherSession.tokens.accessToken,
    })
    const beforeStudents = attendanceSessionStudentsResponseSchema.parse(
      beforeStudentsResponse.body,
    )
    const targetChanges = beforeStudents.slice(0, 2).map((student) => ({
      attendanceRecordId: student.attendanceRecordId,
      status: "PRESENT" as const,
    }))

    const patchResponse = await request("PATCH", `/sessions/${created.id}/attendance`, {
      token: teacherSession.tokens.accessToken,
      payload: {
        changes: targetChanges,
      },
    })

    expect(patchResponse.statusCode).toBe(200)
    const updated = updateAttendanceSessionAttendanceResponseSchema.parse(patchResponse.body)

    expect(updated.appliedChangeCount).toBe(2)
    expect(updated.session.id).toBe(created.id)
    expect(updated.session.presentCount).toBe(2)
    expect(updated.session.absentCount).toBe(2)
    expect(updated.session.editability.state).toBe("OPEN")
    expect(updated.students.filter((student) => student.status === "PRESENT")).toHaveLength(2)
    expect("markSource" in (updated.students[0] ?? {})).toBe(false)

    const detailResponse = await request("GET", `/sessions/${created.id}`, {
      token: teacherSession.tokens.accessToken,
    })
    const detail = attendanceSessionDetailSchema.parse(detailResponse.body)
    expect(detail.presentCount).toBe(2)
    expect(detail.absentCount).toBe(2)

    const storedRecords = await getPrisma().attendanceRecord.findMany({
      where: {
        sessionId: created.id,
      },
      orderBy: {
        id: "asc",
      },
    })

    expect(storedRecords.filter((record) => record.status === "PRESENT")).toHaveLength(2)
    expect(storedRecords.filter((record) => record.markSource === "MANUAL")).toHaveLength(2)

    const auditLogs = await getPrisma().attendanceEditAuditLog.findMany({
      where: {
        sessionId: created.id,
      },
      orderBy: {
        editedAt: "asc",
      },
    })

    expect(auditLogs).toHaveLength(2)
    expect(auditLogs[0]).toMatchObject({
      previousStatus: "ABSENT",
      newStatus: "PRESENT",
      editedByUserId: authIntegrationFixtures.teacher.userId,
    })

    const manualEvents = await getPrisma().attendanceEvent.findMany({
      where: {
        sessionId: created.id,
        eventType: "MANUAL_MARK_PRESENT",
      },
    })

    expect(manualEvents).toHaveLength(2)

    const sessionEditedOutbox = await getPrisma().outboxEvent.findFirst({
      where: {
        aggregateId: created.id,
        topic: "attendance.session.edited",
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    expect(sessionEditedOutbox).not.toBeNull()
    expect(realtimeService.publishSessionCounterUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: created.id,
        presentCount: 2,
        absentCount: 2,
        rosterSnapshotCount: 4,
      }),
    )

    const historyResponse = await request("GET", "/sessions", {
      token: teacherSession.tokens.accessToken,
    })
    const sessions = attendanceSessionHistoryResponseSchema.parse(historyResponse.body)
    const updatedHistoryRow = sessions.find((row) => row.id === created.id)

    expect(updatedHistoryRow).toMatchObject({
      id: created.id,
      presentCount: 2,
      absentCount: 2,
      editability: {
        isEditable: true,
        state: "OPEN",
      },
    })
  }, 15_000)

  it("supports manual removal edits and keeps history, detail, and roster reads consistent", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "MOBILE",
      requestedRole: "TEACHER",
    })

    const created = await createQrSession(teacherSession.tokens.accessToken)
    const seededPresentAt = new Date("2026-03-15T09:15:00.000Z")
    const records = await getPrisma().attendanceRecord.findMany({
      where: {
        sessionId: created.id,
      },
      orderBy: {
        id: "asc",
      },
    })
    const targetPresentRecord = records[0]

    if (!targetPresentRecord) {
      throw new Error("Expected a roster snapshot record for the created attendance session.")
    }

    await getPrisma().attendanceRecord.update({
      where: {
        id: targetPresentRecord.id,
      },
      data: {
        status: "PRESENT",
        markSource: "QR_GPS",
        markedAt: seededPresentAt,
        markedByUserId: targetPresentRecord.studentId,
      },
    })
    await getPrisma().attendanceSession.update({
      where: {
        id: created.id,
      },
      data: {
        presentCount: 1,
        absentCount: records.length - 1,
      },
    })

    const endResponse = await request("POST", `/sessions/${created.id}/end`, {
      token: teacherSession.tokens.accessToken,
    })

    expect(endResponse.statusCode).toBe(201)

    const patchResponse = await request("PATCH", `/sessions/${created.id}/attendance`, {
      token: teacherSession.tokens.accessToken,
      payload: {
        changes: [
          {
            attendanceRecordId: targetPresentRecord.id,
            status: "ABSENT",
          },
        ],
      },
    })

    expect(patchResponse.statusCode).toBe(200)
    const updated = updateAttendanceSessionAttendanceResponseSchema.parse(patchResponse.body)

    expect(updated.appliedChangeCount).toBe(1)
    expect(updated.session.presentCount).toBe(0)
    expect(updated.session.absentCount).toBe(records.length)
    expect(updated.students.every((student) => student.status === "ABSENT")).toBe(true)

    const [detailResponse, studentsResponse, historyResponse] = await Promise.all([
      request("GET", `/sessions/${created.id}`, {
        token: teacherSession.tokens.accessToken,
      }),
      request("GET", `/sessions/${created.id}/students`, {
        token: teacherSession.tokens.accessToken,
      }),
      request("GET", "/sessions", {
        token: teacherSession.tokens.accessToken,
      }),
    ])

    const detail = attendanceSessionDetailSchema.parse(detailResponse.body)
    const students = attendanceSessionStudentsResponseSchema.parse(studentsResponse.body)
    const history = attendanceSessionHistoryResponseSchema.parse(historyResponse.body)
    const historyRow = history.find((row) => row.id === created.id)
    const storedRecords = await getPrisma().attendanceRecord.findMany({
      where: {
        sessionId: created.id,
      },
      orderBy: {
        id: "asc",
      },
    })

    expect(detail.presentCount).toBe(0)
    expect(detail.absentCount).toBe(records.length)
    expect(students.filter((student) => student.status === "PRESENT")).toHaveLength(0)
    expect(students.filter((student) => student.status === "ABSENT")).toHaveLength(records.length)
    expect(historyRow).toMatchObject({
      id: created.id,
      presentCount: 0,
      absentCount: records.length,
    })
    expect(storedRecords.filter((record) => record.status === "PRESENT")).toHaveLength(0)
    expect(storedRecords.filter((record) => record.status === "ABSENT")).toHaveLength(
      records.length,
    )

    const absentEvents = await getPrisma().attendanceEvent.findMany({
      where: {
        sessionId: created.id,
        eventType: "MANUAL_MARK_ABSENT",
      },
    })
    const auditLogs = await getPrisma().attendanceEditAuditLog.findMany({
      where: {
        sessionId: created.id,
      },
      orderBy: {
        editedAt: "desc",
      },
    })

    expect(absentEvents).toHaveLength(1)
    expect(auditLogs[0]).toMatchObject({
      attendanceRecordId: targetPresentRecord.id,
      previousStatus: "PRESENT",
      newStatus: "ABSENT",
      editedByUserId: authIntegrationFixtures.teacher.userId,
    })
  }, 15_000)

  it("ignores duplicate manual edits without writing audit or realtime churn", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "MOBILE",
      requestedRole: "TEACHER",
    })

    const created = await createQrSession(teacherSession.tokens.accessToken)
    const endResponse = await request("POST", `/sessions/${created.id}/end`, {
      token: teacherSession.tokens.accessToken,
    })

    expect(endResponse.statusCode).toBe(201)

    const studentsResponse = await request("GET", `/sessions/${created.id}/students`, {
      token: teacherSession.tokens.accessToken,
    })
    const students = attendanceSessionStudentsResponseSchema.parse(studentsResponse.body)
    const firstStudent = students[0]

    if (!firstStudent) {
      throw new Error("Expected at least one seeded attendance row for duplicate-edit proof.")
    }

    realtimeService.publishSessionCounterUpdated.mockClear()

    const patchResponse = await request("PATCH", `/sessions/${created.id}/attendance`, {
      token: teacherSession.tokens.accessToken,
      payload: {
        changes: [
          {
            attendanceRecordId: firstStudent.attendanceRecordId,
            status: firstStudent.status,
          },
        ],
      },
    })

    expect(patchResponse.statusCode).toBe(200)
    const updated = updateAttendanceSessionAttendanceResponseSchema.parse(patchResponse.body)

    expect(updated.appliedChangeCount).toBe(0)
    expect(updated.session.presentCount).toBe(0)
    expect(updated.session.absentCount).toBe(students.length)
    expect(updated.students.every((student) => student.status === "ABSENT")).toBe(true)

    const auditLogs = await getPrisma().attendanceEditAuditLog.findMany({
      where: {
        sessionId: created.id,
      },
    })
    const sessionEditedOutbox = await getPrisma().outboxEvent.findMany({
      where: {
        aggregateId: created.id,
        topic: "attendance.session.edited",
      },
    })

    expect(auditLogs).toHaveLength(0)
    expect(sessionEditedOutbox).toHaveLength(0)
    expect(realtimeService.publishSessionCounterUpdated).not.toHaveBeenCalled()
  }, 15_000)

  it("returns suspicious-attempt summaries separately from final attendance truth", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })

    const created = await createQrSession(teacherSession.tokens.accessToken)
    const endResponse = await request("POST", `/sessions/${created.id}/end`, {
      token: teacherSession.tokens.accessToken,
    })

    expect(endResponse.statusCode).toBe(201)

    await getPrisma().securityEvent.createMany({
      data: [
        {
          sessionId: created.id,
          courseOfferingId: created.classroomId,
          eventType: "ATTENDANCE_BLOCKED_UNTRUSTED_DEVICE",
          severity: "HIGH",
        },
        {
          sessionId: created.id,
          courseOfferingId: created.classroomId,
          eventType: "ATTENDANCE_LOCATION_VALIDATION_FAILED",
          severity: "MEDIUM",
        },
        {
          sessionId: created.id,
          courseOfferingId: created.classroomId,
          eventType: "ATTENDANCE_LOCATION_VALIDATION_FAILED",
          severity: "MEDIUM",
        },
        {
          sessionId: created.id,
          courseOfferingId: created.classroomId,
          eventType: "ATTENDANCE_BLUETOOTH_VALIDATION_FAILED",
          severity: "MEDIUM",
        },
        {
          sessionId: created.id,
          courseOfferingId: created.classroomId,
          eventType: "REVOKED_DEVICE_USED",
          severity: "HIGH",
        },
        {
          sessionId: created.id,
          courseOfferingId: created.classroomId,
          eventType: "LOGIN_RISK_DETECTED",
          severity: "LOW",
        },
      ],
    })

    const [detailResponse, historyResponse, studentsResponse] = await Promise.all([
      request("GET", `/sessions/${created.id}`, {
        token: teacherSession.tokens.accessToken,
      }),
      request("GET", "/sessions", {
        token: teacherSession.tokens.accessToken,
      }),
      request("GET", `/sessions/${created.id}/students`, {
        token: teacherSession.tokens.accessToken,
      }),
    ])

    const detail = attendanceSessionDetailSchema.parse(detailResponse.body)
    const history = attendanceSessionHistoryResponseSchema.parse(historyResponse.body)
    const students = attendanceSessionStudentsResponseSchema.parse(studentsResponse.body)
    const historyRow = history.find((row) => row.id === created.id)

    expect(detail.suspiciousAttemptCount).toBe(5)
    expect(detail.blockedUntrustedDeviceCount).toBe(1)
    expect(detail.locationValidationFailureCount).toBe(2)
    expect(detail.bluetoothValidationFailureCount).toBe(1)
    expect(detail.revokedDeviceAttemptCount).toBe(1)
    expect(detail.presentCount).toBe(0)
    expect(detail.absentCount).toBe(students.length)
    expect(students.every((student) => student.status === "ABSENT")).toBe(true)
    expect(historyRow).toMatchObject({
      id: created.id,
      presentCount: 0,
      absentCount: students.length,
    })
  }, 15_000)

  it("rejects manual edits while a session is still active", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "MOBILE",
      requestedRole: "TEACHER",
    })

    const created = await createQrSession(teacherSession.tokens.accessToken)
    const studentsResponse = await request("GET", `/sessions/${created.id}/students`, {
      token: teacherSession.tokens.accessToken,
    })
    const students = attendanceSessionStudentsResponseSchema.parse(studentsResponse.body)

    const patchResponse = await request("PATCH", `/sessions/${created.id}/attendance`, {
      token: teacherSession.tokens.accessToken,
      payload: {
        changes: [
          {
            attendanceRecordId: students[0]?.attendanceRecordId ?? "",
            status: "PRESENT",
          },
        ],
      },
    })

    expect(patchResponse.statusCode).toBe(409)
    expect(patchResponse.body).toMatchObject({
      message: "This attendance session is locked for manual edits.",
    })
  })

  it("rejects manual edits once the edit window is locked", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })

    await getPrisma().attendanceSession.update({
      where: {
        id: developmentSeedIds.sessions.mathCompleted,
      },
      data: {
        editableUntil: new Date(Date.now() - 60_000),
      },
    })

    const studentsResponse = await request(
      "GET",
      `/sessions/${developmentSeedIds.sessions.mathCompleted}/students`,
      {
        token: teacherSession.tokens.accessToken,
      },
    )
    const students = attendanceSessionStudentsResponseSchema.parse(studentsResponse.body)

    const patchResponse = await request(
      "PATCH",
      `/sessions/${developmentSeedIds.sessions.mathCompleted}/attendance`,
      {
        token: teacherSession.tokens.accessToken,
        payload: {
          changes: [
            {
              attendanceRecordId: students[0]?.attendanceRecordId ?? "",
              status: "PRESENT",
            },
          ],
        },
      },
    )

    expect(patchResponse.statusCode).toBe(409)
    expect(patchResponse.body).toMatchObject({
      message: "This attendance session is locked for manual edits.",
    })
  })

  function getPrisma() {
    if (!prisma) {
      throw new Error("Prisma client is not initialized.")
    }

    return prisma
  }

  async function login(input: {
    email: string
    password: string
    platform: "WEB" | "MOBILE"
    requestedRole: "ADMIN" | "TEACHER" | "STUDENT"
    device?: Record<string, unknown>
  }) {
    const response = await request("POST", "/auth/login", {
      payload: input,
    })

    expect(response.statusCode).toBe(201)
    return authSessionResponseSchema.parse(response.body)
  }

  async function createQrSession(token: string) {
    const response = await request("POST", "/sessions/qr", {
      token,
      payload: {
        classroomId: developmentSeedIds.courseOfferings.math,
        anchorType: "TEACHER_SELECTED",
        anchorLatitude: 28.6139,
        anchorLongitude: 77.209,
        anchorLabel: "Room 101",
        gpsRadiusMeters: 120,
        sessionDurationMinutes: 20,
      },
    })

    expect(response.statusCode).toBe(201)
    return attendanceSessionSummarySchema.parse(response.body)
  }

  async function createBluetoothSession(token: string) {
    const response = await request("POST", "/sessions/bluetooth", {
      token,
      payload: {
        classroomId: developmentSeedIds.courseOfferings.physics,
        sessionDurationMinutes: 20,
      },
    })

    expect(response.statusCode).toBe(201)
    return attendanceSessionSummarySchema.parse(response.body.session)
  }

  async function request(
    method: "GET" | "POST" | "PATCH",
    path: string,
    options: {
      token?: string
      payload?: unknown
      headers?: Record<string, string>
    },
  ) {
    if (!app) {
      throw new Error("Nest application is not initialized.")
    }

    const headers: Record<string, string> = {
      ...(options.headers ?? {}),
    }

    if (options.token) {
      headers.authorization = `Bearer ${options.token}`
    }

    const injectOptions: {
      method: "GET" | "POST" | "PATCH"
      url: string
      headers: Record<string, string>
      payload?: Record<string, unknown> | string
    } = {
      method,
      url: path,
      headers,
    }

    if (options.payload !== undefined) {
      injectOptions.payload = options.payload as Record<string, unknown> | string
    }

    const response = await app.inject(injectOptions)

    return {
      statusCode: response.statusCode,
      body: response.body ? JSON.parse(response.body) : null,
    }
  }
})
