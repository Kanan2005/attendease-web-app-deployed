import { createHmac } from "node:crypto"

import { buildTrustedDeviceHeaders } from "@attendease/auth"
import {
  attendanceSessionSummarySchema,
  authSessionResponseSchema,
  markQrAttendanceResponseSchema,
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

describe("QR + GPS attendance integration", () => {
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
    database = await createTemporaryDatabase("attendease_qr_gps")
    await seedAuthIntegrationData(database.databaseUrl)

    process.env.NODE_ENV = "test"
    process.env.TEST_DATABASE_URL = database.databaseUrl
    process.env.AUTH_ACCESS_TOKEN_SECRET = "attendease-qr-gps-secret-1234567890"
    process.env.AUTH_ISSUER = "attendease-api-test"
    process.env.AUTH_AUDIENCE = "attendease-client-test"
    process.env.GOOGLE_OIDC_CLIENT_ID = "qr-gps-google-client"
    process.env.GOOGLE_OIDC_CLIENT_SECRET = "qr-gps-google-secret"
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

    if (prisma) {
      await prisma.attendanceSession.deleteMany({
        where: {
          courseOfferingId: developmentSeedIds.courseOfferings.math,
          mode: "QR_GPS",
          status: "ACTIVE",
        },
      })
    }
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

  it("creates a QR session with a roster snapshot and current rolling token", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })

    const response = await request("POST", "/sessions/qr", {
      token: teacherSession.tokens.accessToken,
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
    const session = attendanceSessionSummarySchema.parse(response.body)
    expect(session.status).toBe("ACTIVE")
    expect(session.rosterSnapshotCount).toBe(4)
    expect(session.presentCount).toBe(0)
    expect(session.absentCount).toBe(4)
    expect(session.currentQrPayload).toBeTruthy()
    expect(session.currentQrExpiresAt).toBeTruthy()

    const attendanceRecords = await getPrisma().attendanceRecord.count({
      where: {
        sessionId: session.id,
      },
    })
    expect(attendanceRecords).toBe(4)
    expect(realtimeService.publishSessionStateChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: session.id,
        status: "ACTIVE",
      }),
    )
  }, 15_000)

  it("returns the live QR session summary for teacher polling routes", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })

    const session = await createQrSession(teacherSession.tokens.accessToken)

    const response = await request("GET", `/sessions/${session.id}`, {
      token: teacherSession.tokens.accessToken,
    })

    expect(response.statusCode).toBe(200)
    expect(attendanceSessionSummarySchema.parse(response.body)).toMatchObject({
      id: session.id,
      status: "ACTIVE",
      currentQrPayload: expect.any(String),
      currentQrExpiresAt: expect.any(String),
      presentCount: 0,
      absentCount: 4,
    })
  }, 15_000)

  it("marks attendance once, persists audit/outbox, and blocks duplicates", async () => {
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

    const session = await createQrSession(teacherSession.tokens.accessToken)
    realtimeService.publishSessionCounterUpdated.mockClear()

    const markResponse = await request("POST", "/attendance/qr/mark", {
      token: studentSession.tokens.accessToken,
      headers: buildTrustedDeviceHeaders(authIntegrationFixtures.studentOne.device.installId),
      payload: {
        qrPayload: session.currentQrPayload,
        latitude: 28.61395,
        longitude: 77.20903,
        accuracyMeters: 20,
        deviceTimestamp: "2026-03-14T10:00:21.000Z",
      },
    })

    expect(markResponse.statusCode).toBe(201)
    const marked = markQrAttendanceResponseSchema.parse(markResponse.body)
    expect(marked.success).toBe(true)
    expect(marked.sessionId).toBe(session.id)
    expect(marked.attendanceStatus).toBe("PRESENT")
    expect(marked.presentCount).toBe(1)
    expect(marked.absentCount).toBe(3)

    const attendanceRecord = await getPrisma().attendanceRecord.findUniqueOrThrow({
      where: {
        id: marked.attendanceRecordId,
      },
    })
    expect(attendanceRecord.status).toBe("PRESENT")
    expect(attendanceRecord.markSource).toBe("QR_GPS")

    const attendanceEvent = await getPrisma().attendanceEvent.findFirst({
      where: {
        sessionId: session.id,
        eventType: "AUTO_MARK_QR",
        studentId: authIntegrationFixtures.studentOne.userId,
      },
    })
    expect(attendanceEvent).not.toBeNull()

    const outboxEvent = await getPrisma().outboxEvent.findFirst({
      where: {
        aggregateId: session.id,
        topic: "attendance.record.marked",
      },
      orderBy: {
        createdAt: "desc",
      },
    })
    expect(outboxEvent).not.toBeNull()
    expect(realtimeService.publishSessionCounterUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: session.id,
        presentCount: 1,
        absentCount: 3,
      }),
    )
    expect(realtimeService.publishSessionCounterUpdated).toHaveBeenCalledTimes(1)

    const duplicateResponse = await request("POST", "/attendance/qr/mark", {
      token: studentSession.tokens.accessToken,
      headers: buildTrustedDeviceHeaders(authIntegrationFixtures.studentOne.device.installId),
      payload: {
        qrPayload: session.currentQrPayload,
        latitude: 28.61395,
        longitude: 77.20903,
        accuracyMeters: 20,
      },
    })

    expect(duplicateResponse.statusCode).toBe(409)

    const sessionAfterDuplicate = await getPrisma().attendanceSession.findUniqueOrThrow({
      where: {
        id: session.id,
      },
    })
    expect(sessionAfterDuplicate.presentCount).toBe(1)
    expect(sessionAfterDuplicate.absentCount).toBe(3)
    expect(realtimeService.publishSessionCounterUpdated).toHaveBeenCalledTimes(1)
  }, 15_000)

  it("rejects invalid or expired QR tokens without corrupting attendance truth", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })
    const studentSession = await login({
      email: authIntegrationFixtures.studentTwo.email,
      password: authIntegrationFixtures.studentTwo.password,
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: authIntegrationFixtures.studentTwo.device,
    })

    const session = await createQrSession(teacherSession.tokens.accessToken)
    const parsedPayload = JSON.parse(session.currentQrPayload ?? "{}") as {
      v: number
      sid: string
      ts: number
      sig: string
    }

    const invalidTokenResponse = await request("POST", "/attendance/qr/mark", {
      token: studentSession.tokens.accessToken,
      headers: buildTrustedDeviceHeaders(authIntegrationFixtures.studentTwo.device.installId),
      payload: {
        qrPayload: JSON.stringify({
          ...parsedPayload,
          sig: `${parsedPayload.sig}broken`,
        }),
        latitude: 28.61395,
        longitude: 77.20903,
        accuracyMeters: 20,
      },
    })
    expect(invalidTokenResponse.statusCode).toBe(400)

    const sessionRecord = await getPrisma().attendanceSession.findUniqueOrThrow({
      where: {
        id: session.id,
      },
    })
    const expiredSlice = 1
    const expiredQrPayload = JSON.stringify({
      v: 1,
      sid: session.id,
      ts: expiredSlice,
      sig: createHmac("sha256", sessionRecord.qrSeed ?? "")
        .update(`v1:${session.id}:${expiredSlice}`)
        .digest("hex"),
    })

    const expiredTokenResponse = await request("POST", "/attendance/qr/mark", {
      token: studentSession.tokens.accessToken,
      headers: buildTrustedDeviceHeaders(authIntegrationFixtures.studentTwo.device.installId),
      payload: {
        qrPayload: expiredQrPayload,
        latitude: 28.61395,
        longitude: 77.20903,
        accuracyMeters: 20,
      },
    })
    expect(expiredTokenResponse.statusCode).toBe(409)

    const unchangedRecord = await getPrisma().attendanceRecord.findUniqueOrThrow({
      where: {
        sessionId_studentId: {
          sessionId: session.id,
          studentId: authIntegrationFixtures.studentTwo.userId,
        },
      },
    })
    expect(unchangedRecord.status).toBe("ABSENT")

    const unchangedSession = await getPrisma().attendanceSession.findUniqueOrThrow({
      where: {
        id: session.id,
      },
    })
    expect(unchangedSession.presentCount).toBe(0)
    expect(unchangedSession.absentCount).toBe(4)
    expect(realtimeService.publishSessionCounterUpdated).not.toHaveBeenCalled()
  }, 15_000)

  it("logs suspicious location failures without mutating attendance truth", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })
    const studentSession = await login({
      email: authIntegrationFixtures.studentTwo.email,
      password: authIntegrationFixtures.studentTwo.password,
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: authIntegrationFixtures.studentTwo.device,
    })

    const session = await createQrSession(teacherSession.tokens.accessToken)
    const beforeSecurityEventCount = await getPrisma().securityEvent.count({
      where: {
        eventType: "ATTENDANCE_LOCATION_VALIDATION_FAILED",
        sessionId: session.id,
        userId: authIntegrationFixtures.studentTwo.userId,
      },
    })

    const outOfRadiusResponse = await request("POST", "/attendance/qr/mark", {
      token: studentSession.tokens.accessToken,
      headers: buildTrustedDeviceHeaders(authIntegrationFixtures.studentTwo.device.installId),
      payload: {
        qrPayload: session.currentQrPayload,
        latitude: 28.6205,
        longitude: 77.215,
        accuracyMeters: 20,
      },
    })

    expect(outOfRadiusResponse.statusCode).toBe(403)

    const lowAccuracyResponse = await request("POST", "/attendance/qr/mark", {
      token: studentSession.tokens.accessToken,
      headers: buildTrustedDeviceHeaders(authIntegrationFixtures.studentTwo.device.installId),
      payload: {
        qrPayload: session.currentQrPayload,
        latitude: 28.61395,
        longitude: 77.20903,
        accuracyMeters: 120,
      },
    })

    expect(lowAccuracyResponse.statusCode).toBe(400)

    const securityEvents = await getPrisma().securityEvent.findMany({
      where: {
        eventType: "ATTENDANCE_LOCATION_VALIDATION_FAILED",
        sessionId: session.id,
        userId: authIntegrationFixtures.studentTwo.userId,
      },
      orderBy: {
        createdAt: "asc",
      },
    })
    expect(securityEvents).toHaveLength(beforeSecurityEventCount + 2)
    expect(securityEvents.slice(-2).map((event) => event.description)).toEqual([
      "QR attendance was rejected because the device location was outside the allowed radius.",
      "QR attendance was rejected because the submitted location accuracy was too low.",
    ])
    expect(securityEvents.slice(-2).map((event) => event.severity)).toEqual(["HIGH", "MEDIUM"])
    expect(
      securityEvents.slice(-2).map((event) => (event.metadata as { reason?: string }).reason),
    ).toEqual(["OUT_OF_RADIUS", "ACCURACY_TOO_LOW"])

    const unchangedRecord = await getPrisma().attendanceRecord.findUniqueOrThrow({
      where: {
        sessionId_studentId: {
          sessionId: session.id,
          studentId: authIntegrationFixtures.studentTwo.userId,
        },
      },
    })
    expect(unchangedRecord.status).toBe("ABSENT")

    const unchangedSession = await getPrisma().attendanceSession.findUniqueOrThrow({
      where: {
        id: session.id,
      },
    })
    expect(unchangedSession.presentCount).toBe(0)
    expect(unchangedSession.absentCount).toBe(4)
    expect(realtimeService.publishSessionCounterUpdated).not.toHaveBeenCalled()
  }, 15_000)

  it("ends a QR session and blocks later marks", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })
    const studentSession = await login({
      email: authIntegrationFixtures.studentTwo.email,
      password: authIntegrationFixtures.studentTwo.password,
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: authIntegrationFixtures.studentTwo.device,
    })

    const session = await createQrSession(teacherSession.tokens.accessToken)

    const endResponse = await request("POST", `/sessions/${session.id}/end`, {
      token: teacherSession.tokens.accessToken,
    })
    expect(endResponse.statusCode).toBe(201)
    const ended = attendanceSessionSummarySchema.parse(endResponse.body)
    expect(ended.status).toBe("ENDED")
    expect(ended.editableUntil).toBeTruthy()

    const blockedResponse = await request("POST", "/attendance/qr/mark", {
      token: studentSession.tokens.accessToken,
      headers: buildTrustedDeviceHeaders(authIntegrationFixtures.studentTwo.device.installId),
      payload: {
        qrPayload: session.currentQrPayload,
        latitude: 28.61395,
        longitude: 77.20903,
        accuracyMeters: 20,
      },
    })

    expect(blockedResponse.statusCode).toBe(409)
  }, 15_000)

  it("auto-expires timed-out sessions during mark attempts and publishes the state change", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })
    const studentSession = await login({
      email: authIntegrationFixtures.studentTwo.email,
      password: authIntegrationFixtures.studentTwo.password,
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: authIntegrationFixtures.studentTwo.device,
    })

    const session = await createQrSession(teacherSession.tokens.accessToken)
    await getPrisma().attendanceSession.update({
      where: {
        id: session.id,
      },
      data: {
        scheduledEndAt: new Date("2026-03-14T00:00:00.000Z"),
      },
    })
    realtimeService.publishSessionStateChanged.mockClear()
    realtimeService.publishSessionCounterUpdated.mockClear()

    const response = await request("POST", "/attendance/qr/mark", {
      token: studentSession.tokens.accessToken,
      headers: buildTrustedDeviceHeaders(authIntegrationFixtures.studentTwo.device.installId),
      payload: {
        qrPayload: session.currentQrPayload,
        latitude: 28.61395,
        longitude: 77.20903,
        accuracyMeters: 20,
      },
    })

    expect(response.statusCode).toBe(409)

    const expiredSession = await getPrisma().attendanceSession.findUniqueOrThrow({
      where: {
        id: session.id,
      },
    })
    expect(expiredSession.status).toBe("EXPIRED")
    expect(expiredSession.endedAt).not.toBeNull()
    expect(expiredSession.editableUntil).not.toBeNull()
    expect(realtimeService.publishSessionStateChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: session.id,
        status: "EXPIRED",
      }),
    )
    expect(realtimeService.publishSessionCounterUpdated).not.toHaveBeenCalled()

    const unchangedRecord = await getPrisma().attendanceRecord.findUniqueOrThrow({
      where: {
        sessionId_studentId: {
          sessionId: session.id,
          studentId: authIntegrationFixtures.studentTwo.userId,
        },
      },
    })
    expect(unchangedRecord.status).toBe("ABSENT")
  }, 15_000)

  async function createQrSession(teacherToken: string) {
    const response = await request("POST", "/sessions/qr", {
      token: teacherToken,
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

  async function login(payload: Record<string, unknown>) {
    const response = await request("POST", "/auth/login", {
      payload,
    })

    expect(response.statusCode).toBe(201)
    return authSessionResponseSchema.parse(response.body)
  }

  async function request(
    method: "GET" | "POST" | "PATCH",
    url: string,
    options: {
      payload?: unknown
      token?: string
      headers?: Record<string, string>
    } = {},
  ): Promise<{ statusCode: number; body: unknown }> {
    if (!app) {
      throw new Error("Test application is not initialized.")
    }

    const fastify = app.getHttpAdapter().getInstance() as {
      inject: (options: {
        method: "GET" | "POST" | "PATCH"
        url: string
        payload?: unknown
        headers?: Record<string, string>
      }) => Promise<{ statusCode: number; body: string }>
    }

    const response = await fastify.inject({
      method,
      url,
      payload: options.payload,
      headers: {
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
        ...(options.headers ?? {}),
      },
    })

    return {
      statusCode: response.statusCode,
      body: response.body ? JSON.parse(response.body) : null,
    }
  }

  function getPrisma(): ReturnType<typeof createPrismaClient> {
    if (!prisma) {
      throw new Error("Prisma test client is not initialized.")
    }

    return prisma
  }
})
