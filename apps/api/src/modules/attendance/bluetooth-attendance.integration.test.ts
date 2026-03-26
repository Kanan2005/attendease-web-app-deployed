import { createHmac } from "node:crypto"

import { buildTrustedDeviceHeaders } from "@attendease/auth"
import {
  attendanceSessionSummarySchema,
  authSessionResponseSchema,
  bluetoothSessionCreateResponseSchema,
  markBluetoothAttendanceResponseSchema,
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

describe("Bluetooth attendance integration", () => {
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
    ATTENDANCE_BLUETOOTH_ALLOWED_CLOCK_SKEW_SLICES:
      process.env.ATTENDANCE_BLUETOOTH_ALLOWED_CLOCK_SKEW_SLICES,
    ATTENDANCE_BLUETOOTH_PROTOCOL_VERSION: process.env.ATTENDANCE_BLUETOOTH_PROTOCOL_VERSION,
    ATTENDANCE_BLUETOOTH_SERVICE_UUID: process.env.ATTENDANCE_BLUETOOTH_SERVICE_UUID,
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
    database = await createTemporaryDatabase("attendease_bluetooth")
    await seedAuthIntegrationData(database.databaseUrl)

    process.env.NODE_ENV = "test"
    process.env.TEST_DATABASE_URL = database.databaseUrl
    process.env.AUTH_ACCESS_TOKEN_SECRET = "attendease-bluetooth-secret-1234567890"
    process.env.AUTH_ISSUER = "attendease-api-test"
    process.env.AUTH_AUDIENCE = "attendease-client-test"
    process.env.GOOGLE_OIDC_CLIENT_ID = "bluetooth-google-client"
    process.env.GOOGLE_OIDC_CLIENT_SECRET = "bluetooth-google-secret"
    process.env.GOOGLE_OIDC_REDIRECT_URI = "http://localhost:3000/auth/google/callback"
    process.env.GOOGLE_TEACHER_ALLOWED_DOMAINS = "attendease.dev"
    process.env.GOOGLE_STUDENT_ALLOWED_DOMAINS = "attendease.dev"
    process.env.ATTENDANCE_BLUETOOTH_ALLOWED_CLOCK_SKEW_SLICES = "1"
    process.env.ATTENDANCE_BLUETOOTH_PROTOCOL_VERSION = "1"
    process.env.ATTENDANCE_BLUETOOTH_SERVICE_UUID = "12345678-1234-5678-1234-56789abc0001"

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
          mode: "BLUETOOTH",
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
    process.env.ATTENDANCE_BLUETOOTH_ALLOWED_CLOCK_SKEW_SLICES =
      originalEnv.ATTENDANCE_BLUETOOTH_ALLOWED_CLOCK_SKEW_SLICES
    process.env.ATTENDANCE_BLUETOOTH_PROTOCOL_VERSION =
      originalEnv.ATTENDANCE_BLUETOOTH_PROTOCOL_VERSION
    process.env.ATTENDANCE_BLUETOOTH_SERVICE_UUID = originalEnv.ATTENDANCE_BLUETOOTH_SERVICE_UUID

    if (database) {
      await destroyTemporaryDatabase(database)
    }
  })

  it("creates a Bluetooth session with advertiser config and roster snapshot", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "MOBILE",
      requestedRole: "TEACHER",
    })

    const response = await request("POST", "/sessions/bluetooth", {
      token: teacherSession.tokens.accessToken,
      payload: {
        classroomId: developmentSeedIds.courseOfferings.math,
        sessionDurationMinutes: 20,
      },
    })

    expect(response.statusCode).toBe(201)
    const created = bluetoothSessionCreateResponseSchema.parse(response.body)
    expect(created.session.status).toBe("ACTIVE")
    expect(created.session.mode).toBe("BLUETOOTH")
    expect(created.session.rosterSnapshotCount).toBe(4)
    expect(created.advertiser.serviceUuid).toBe("12345678-1234-5678-1234-56789abc0001")
    expect(created.advertiser.protocolVersion).toBe(1)
    expect(created.advertiser.seed.length).toBeGreaterThanOrEqual(16)
    expect(created.advertiser.publicId).toBe(created.session.blePublicId)
    expect(realtimeService.publishSessionStateChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: created.session.id,
        status: "ACTIVE",
      }),
    )
  }, 15_000)

  it("marks attendance once, persists audit/outbox, and blocks duplicates", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "MOBILE",
      requestedRole: "TEACHER",
    })
    const studentSession = await login({
      email: authIntegrationFixtures.studentOne.email,
      password: authIntegrationFixtures.studentOne.password,
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: authIntegrationFixtures.studentOne.device,
    })

    const created = await createBluetoothSession(teacherSession.tokens.accessToken)
    realtimeService.publishSessionCounterUpdated.mockClear()

    const markResponse = await request("POST", "/attendance/bluetooth/mark", {
      token: studentSession.tokens.accessToken,
      headers: buildTrustedDeviceHeaders(authIntegrationFixtures.studentOne.device.installId),
      payload: {
        detectedPayload: created.advertiser.currentPayload,
        rssi: -52,
        deviceTimestamp: "2026-03-14T10:00:21.000Z",
      },
    })

    expect(markResponse.statusCode).toBe(201)
    const marked = markBluetoothAttendanceResponseSchema.parse(markResponse.body)
    expect(marked.success).toBe(true)
    expect(marked.sessionId).toBe(created.session.id)
    expect(marked.attendanceStatus).toBe("PRESENT")
    expect(marked.presentCount).toBe(1)
    expect(marked.absentCount).toBe(3)
    expect(marked.detectionRssi).toBe(-52)

    const attendanceRecord = await getPrisma().attendanceRecord.findUniqueOrThrow({
      where: {
        id: marked.attendanceRecordId,
      },
    })
    expect(attendanceRecord.status).toBe("PRESENT")
    expect(attendanceRecord.markSource).toBe("BLUETOOTH")

    const attendanceEvent = await getPrisma().attendanceEvent.findFirst({
      where: {
        sessionId: created.session.id,
        eventType: "AUTO_MARK_BLUETOOTH",
        studentId: authIntegrationFixtures.studentOne.userId,
      },
    })
    expect(attendanceEvent).not.toBeNull()

    const outboxEvent = await getPrisma().outboxEvent.findFirst({
      where: {
        aggregateId: created.session.id,
        topic: "attendance.record.marked",
      },
      orderBy: {
        createdAt: "desc",
      },
    })
    expect(outboxEvent).not.toBeNull()
    expect(realtimeService.publishSessionCounterUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: created.session.id,
        presentCount: 1,
        absentCount: 3,
      }),
    )

    const duplicateResponse = await request("POST", "/attendance/bluetooth/mark", {
      token: studentSession.tokens.accessToken,
      headers: buildTrustedDeviceHeaders(authIntegrationFixtures.studentOne.device.installId),
      payload: {
        detectedPayload: created.advertiser.currentPayload,
        rssi: -50,
      },
    })

    expect(duplicateResponse.statusCode).toBe(409)
  }, 15_000)

  it("rejects invalid and expired BLE tokens while logging security events", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "MOBILE",
      requestedRole: "TEACHER",
    })
    const studentSession = await login({
      email: authIntegrationFixtures.studentTwo.email,
      password: authIntegrationFixtures.studentTwo.password,
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: authIntegrationFixtures.studentTwo.device,
    })

    const created = await createBluetoothSession(teacherSession.tokens.accessToken)
    const parsedPayload = JSON.parse(created.advertiser.currentPayload) as {
      v: number
      pid: string
      ts: number
      eid: string
    }

    const invalidTokenResponse = await request("POST", "/attendance/bluetooth/mark", {
      token: studentSession.tokens.accessToken,
      headers: buildTrustedDeviceHeaders(authIntegrationFixtures.studentTwo.device.installId),
      payload: {
        detectedPayload: JSON.stringify({
          ...parsedPayload,
          eid: `${parsedPayload.eid}broken`,
        }),
        rssi: -60,
      },
    })
    expect(invalidTokenResponse.statusCode).toBe(400)

    const sessionRecord = await getPrisma().attendanceSession.findUniqueOrThrow({
      where: {
        id: created.session.id,
      },
    })
    const expiredSlice = 1
    const expiredPayload = JSON.stringify({
      v: sessionRecord.bleProtocolVersion,
      pid: sessionRecord.blePublicId,
      ts: expiredSlice,
      eid: createHmac("sha256", sessionRecord.bleSeed ?? "")
        .update(`v${sessionRecord.bleProtocolVersion}:${sessionRecord.blePublicId}:${expiredSlice}`)
        .digest("hex"),
    })

    const expiredTokenResponse = await request("POST", "/attendance/bluetooth/mark", {
      token: studentSession.tokens.accessToken,
      headers: buildTrustedDeviceHeaders(authIntegrationFixtures.studentTwo.device.installId),
      payload: {
        detectedPayload: expiredPayload,
        rssi: -61,
      },
    })
    expect(expiredTokenResponse.statusCode).toBe(409)

    const securityEvents = await getPrisma().securityEvent.findMany({
      where: {
        eventType: "ATTENDANCE_BLUETOOTH_VALIDATION_FAILED",
        userId: authIntegrationFixtures.studentTwo.userId,
        sessionId: created.session.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    expect(securityEvents).toHaveLength(2)
    expect(securityEvents.map((event) => (event.metadata as { reason?: string }).reason)).toEqual([
      "INVALID",
      "EXPIRED",
    ])

    const unchangedRecord = await getPrisma().attendanceRecord.findUniqueOrThrow({
      where: {
        sessionId_studentId: {
          sessionId: created.session.id,
          studentId: authIntegrationFixtures.studentTwo.userId,
        },
      },
    })
    expect(unchangedRecord.status).toBe("ABSENT")
    expect(realtimeService.publishSessionCounterUpdated).not.toHaveBeenCalled()
  }, 15_000)

  it("logs a security event when a BLE payload references an unknown session public id", async () => {
    const studentSession = await login({
      email: authIntegrationFixtures.studentTwo.email,
      password: authIntegrationFixtures.studentTwo.password,
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: authIntegrationFixtures.studentTwo.device,
    })

    const mismatchPayload = JSON.stringify({
      v: 1,
      pid: "missing-public-id-1234",
      ts: 171040082,
      eid: createHmac("sha256", "unknown-seed")
        .update("v1:missing-public-id-1234:171040082")
        .digest("hex"),
    })

    const response = await request("POST", "/attendance/bluetooth/mark", {
      token: studentSession.tokens.accessToken,
      headers: buildTrustedDeviceHeaders(authIntegrationFixtures.studentTwo.device.installId),
      payload: {
        detectedPayload: mismatchPayload,
        rssi: -65,
      },
    })

    expect(response.statusCode).toBe(400)

    const securityEvent = await getPrisma().securityEvent.findFirst({
      where: {
        eventType: "ATTENDANCE_BLUETOOTH_VALIDATION_FAILED",
        userId: authIntegrationFixtures.studentTwo.userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    expect(securityEvent).not.toBeNull()
    expect((securityEvent?.metadata as { reason?: string; publicId?: string } | null)?.reason).toBe(
      "SESSION_MISMATCH",
    )
    expect(
      (securityEvent?.metadata as { reason?: string; publicId?: string } | null)?.publicId,
    ).toBe("missing-public-id-1234")
  }, 15_000)

  it("auto-expires timed-out sessions during Bluetooth mark attempts", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "MOBILE",
      requestedRole: "TEACHER",
    })
    const studentSession = await login({
      email: authIntegrationFixtures.studentTwo.email,
      password: authIntegrationFixtures.studentTwo.password,
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: authIntegrationFixtures.studentTwo.device,
    })

    const created = await createBluetoothSession(teacherSession.tokens.accessToken)
    await getPrisma().attendanceSession.update({
      where: {
        id: created.session.id,
      },
      data: {
        scheduledEndAt: new Date("2026-03-14T00:00:00.000Z"),
      },
    })
    realtimeService.publishSessionStateChanged.mockClear()
    realtimeService.publishSessionCounterUpdated.mockClear()

    const response = await request("POST", "/attendance/bluetooth/mark", {
      token: studentSession.tokens.accessToken,
      headers: buildTrustedDeviceHeaders(authIntegrationFixtures.studentTwo.device.installId),
      payload: {
        detectedPayload: created.advertiser.currentPayload,
        rssi: -57,
      },
    })

    expect(response.statusCode).toBe(409)

    const expiredSession = await getPrisma().attendanceSession.findUniqueOrThrow({
      where: {
        id: created.session.id,
      },
    })
    expect(expiredSession.status).toBe("EXPIRED")
    expect(realtimeService.publishSessionStateChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: created.session.id,
        status: "EXPIRED",
      }),
    )
  }, 15_000)

  it("ends a Bluetooth session and blocks later marks", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "MOBILE",
      requestedRole: "TEACHER",
    })
    const studentSession = await login({
      email: authIntegrationFixtures.studentTwo.email,
      password: authIntegrationFixtures.studentTwo.password,
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: authIntegrationFixtures.studentTwo.device,
    })

    const created = await createBluetoothSession(teacherSession.tokens.accessToken)

    const endResponse = await request("POST", `/sessions/${created.session.id}/end`, {
      token: teacherSession.tokens.accessToken,
    })
    expect(endResponse.statusCode).toBe(201)
    const ended = attendanceSessionSummarySchema.parse(endResponse.body)
    expect(ended.status).toBe("ENDED")
    expect(ended.editableUntil).toBeTruthy()

    const blockedResponse = await request("POST", "/attendance/bluetooth/mark", {
      token: studentSession.tokens.accessToken,
      headers: buildTrustedDeviceHeaders(authIntegrationFixtures.studentTwo.device.installId),
      payload: {
        detectedPayload: created.advertiser.currentPayload,
        rssi: -58,
      },
    })

    expect(blockedResponse.statusCode).toBe(400)
  }, 15_000)

  async function createBluetoothSession(teacherToken: string) {
    const response = await request("POST", "/sessions/bluetooth", {
      token: teacherToken,
      payload: {
        classroomId: developmentSeedIds.courseOfferings.math,
        sessionDurationMinutes: 20,
      },
    })

    expect(response.statusCode).toBe(201)
    return bluetoothSessionCreateResponseSchema.parse(response.body)
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
