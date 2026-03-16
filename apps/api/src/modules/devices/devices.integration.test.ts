import { buildTrustedDeviceHeaders } from "@attendease/auth"
import {
  authSessionResponseSchema,
  deviceRegistrationResponseSchema,
  trustedDeviceAttendanceReadyResponseSchema,
} from "@attendease/contracts"
import { createPrismaClient, disconnectPrismaClient } from "@attendease/db"
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify"
import { Test } from "@nestjs/testing"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import { AppModule } from "../../app.module.js"
import {
  type TemporaryDatabase,
  authIntegrationFixtures,
  createTemporaryDatabase,
  destroyTemporaryDatabase,
  seedAuthIntegrationData,
} from "../../test/integration-helpers.js"
import { GoogleOidcService } from "../auth/google-oidc.service.js"

describe("Devices integration", () => {
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
  }

  let database: TemporaryDatabase | null = null
  let prisma: ReturnType<typeof createPrismaClient> | null = null
  let app: NestFastifyApplication | null = null

  const googleOidcService = {
    verifyExchange: vi.fn(),
  }

  beforeAll(async () => {
    database = await createTemporaryDatabase("attendease_devices")
    await seedAuthIntegrationData(database.databaseUrl)

    process.env.NODE_ENV = "test"
    process.env.TEST_DATABASE_URL = database.databaseUrl
    process.env.AUTH_ACCESS_TOKEN_SECRET = "attendease-devices-integration-secret-1234567890"
    process.env.AUTH_ISSUER = "attendease-api-test"
    process.env.AUTH_AUDIENCE = "attendease-client-test"
    process.env.GOOGLE_OIDC_CLIENT_ID = "devices-test-google-client"
    process.env.GOOGLE_OIDC_CLIENT_SECRET = "devices-test-google-secret"
    process.env.GOOGLE_OIDC_REDIRECT_URI = "http://localhost:3000/auth/google/callback"
    process.env.GOOGLE_TEACHER_ALLOWED_DOMAINS = "attendease.dev"
    process.env.GOOGLE_STUDENT_ALLOWED_DOMAINS = "attendease.dev"

    prisma = createPrismaClient({
      databaseUrl: database.databaseUrl,
      singleton: false,
    })

    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GoogleOidcService)
      .useValue(googleOidcService)
      .compile()

    app = testingModule.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    await app.init()
    await app.getHttpAdapter().getInstance().ready()
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

    if (database) {
      await destroyTemporaryDatabase(database)
    }
  })

  it("registers a teacher device without creating attendance-only trust requirements", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })

    const response = await request("POST", "/devices/register", {
      token: teacherSession.tokens.accessToken,
      payload: {
        installId: "teacher-web-install",
        platform: "WEB",
        publicKey: "teacher-web-public-key",
        appVersion: "0.1.0",
      },
    })

    expect(response.statusCode).toBe(201)
    const registration = deviceRegistrationResponseSchema.parse(response.body)
    expect(registration.deviceTrust.state).toBe("NOT_REQUIRED")
    expect(registration.binding).toBeNull()

    const sessionRecord = await getPrisma().authSession.findUnique({
      where: {
        id: teacherSession.user.sessionId,
      },
    })

    expect(sessionRecord?.deviceId).toBe(registration.device.id)
  })

  it("keeps teacher sessions outside student-only attendance-readiness enforcement", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })

    const response = await request("GET", "/devices/trust/attendance-ready", {
      token: teacherSession.tokens.accessToken,
      headers: buildTrustedDeviceHeaders("teacher-web-install"),
    })

    expect(response.statusCode).toBe(403)
  })

  it("returns attendance-ready state for the trusted student session device", async () => {
    const studentSession = await login({
      email: authIntegrationFixtures.studentOne.email,
      password: authIntegrationFixtures.studentOne.password,
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: authIntegrationFixtures.studentOne.device,
    })

    const response = await request("GET", "/devices/trust/attendance-ready", {
      token: studentSession.tokens.accessToken,
      headers: buildTrustedDeviceHeaders(authIntegrationFixtures.studentOne.device.installId),
    })

    expect(response.statusCode).toBe(200)
    const ready = trustedDeviceAttendanceReadyResponseSchema.parse(response.body)
    expect(ready.ready).toBe(true)
    expect(ready.device.id).toBe(studentSession.user.deviceTrust.deviceId)
    expect(ready.binding.id).toBe(studentSession.user.deviceTrust.bindingId)
  })

  it("blocks registering a second device for the same student and logs the event", async () => {
    const studentSession = await login({
      email: authIntegrationFixtures.studentOne.email,
      password: authIntegrationFixtures.studentOne.password,
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: authIntegrationFixtures.studentOne.device,
    })

    const beforeCount = await getPrisma().securityEvent.count({
      where: {
        eventType: "SECOND_DEVICE_FOR_STUDENT_ATTEMPT",
        userId: authIntegrationFixtures.studentOne.userId,
      },
    })

    const response = await request("POST", "/devices/register", {
      token: studentSession.tokens.accessToken,
      payload: {
        installId: "student-one-second-device",
        platform: "IOS",
        publicKey: "student-one-second-device-public-key",
        appVersion: "0.1.0",
      },
    })

    expect(response.statusCode).toBe(201)
    const registration = deviceRegistrationResponseSchema.parse(response.body)
    expect(registration.deviceTrust.state).toBe("BLOCKED")
    expect(registration.deviceTrust.lifecycleState).toBe("PENDING_REPLACEMENT")
    expect(registration.deviceTrust.reason).toBe("DEVICE_REPLACEMENT_PENDING_APPROVAL")
    expect(registration.binding?.status).toBe("PENDING")

    const pendingBinding = await getPrisma().userDeviceBinding.findFirst({
      where: {
        userId: authIntegrationFixtures.studentOne.userId,
        deviceId: registration.device.id,
        bindingType: "STUDENT_ATTENDANCE",
        status: "PENDING",
      },
    })

    const afterCount = await getPrisma().securityEvent.count({
      where: {
        eventType: "SECOND_DEVICE_FOR_STUDENT_ATTEMPT",
        userId: authIntegrationFixtures.studentOne.userId,
      },
    })

    expect(pendingBinding?.id).toBe(registration.deviceTrust.bindingId)
    expect(afterCount).toBe(beforeCount + 1)
  })

  it("blocks registering another student's device on the current student session", async () => {
    const studentSession = await login({
      email: authIntegrationFixtures.studentTwo.email,
      password: authIntegrationFixtures.studentTwo.password,
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: authIntegrationFixtures.studentTwo.device,
    })

    const beforeCount = await getPrisma().securityEvent.count({
      where: {
        eventType: "MULTI_ACCOUNT_SAME_DEVICE_ATTEMPT",
        userId: authIntegrationFixtures.studentTwo.userId,
      },
    })

    const response = await request("POST", "/devices/register", {
      token: studentSession.tokens.accessToken,
      payload: {
        installId: authIntegrationFixtures.studentOne.device.installId,
        platform: authIntegrationFixtures.studentOne.device.platform,
        publicKey: authIntegrationFixtures.studentOne.device.publicKey,
      },
    })

    expect(response.statusCode).toBe(201)
    const registration = deviceRegistrationResponseSchema.parse(response.body)
    expect(registration.deviceTrust.state).toBe("BLOCKED")
    expect(registration.deviceTrust.reason).toBe("DEVICE_ALREADY_BOUND_TO_ANOTHER_STUDENT")

    const afterCount = await getPrisma().securityEvent.count({
      where: {
        eventType: "MULTI_ACCOUNT_SAME_DEVICE_ATTEMPT",
        userId: authIntegrationFixtures.studentTwo.userId,
      },
    })

    expect(afterCount).toBe(beforeCount + 1)
  })

  it("blocks attendance-ready access after a binding has been revoked", async () => {
    const studentSession = await login({
      email: authIntegrationFixtures.studentOne.email,
      password: authIntegrationFixtures.studentOne.password,
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: authIntegrationFixtures.studentOne.device,
    })
    const trustedDeviceId = studentSession.user.deviceTrust.deviceId

    if (!trustedDeviceId) {
      throw new Error("Student test session should include a trusted device id.")
    }

    await getPrisma().userDeviceBinding.updateMany({
      where: {
        userId: authIntegrationFixtures.studentOne.userId,
        deviceId: trustedDeviceId,
        bindingType: "STUDENT_ATTENDANCE",
        status: "ACTIVE",
      },
      data: {
        status: "REVOKED",
        revokedAt: new Date("2026-03-14T10:30:00.000Z"),
        revokeReason: "Manual support revoke",
      },
    })

    const revokedBefore = await getPrisma().securityEvent.count({
      where: {
        eventType: "REVOKED_DEVICE_USED",
        userId: authIntegrationFixtures.studentOne.userId,
      },
    })
    const blockedBefore = await getPrisma().securityEvent.count({
      where: {
        eventType: "ATTENDANCE_BLOCKED_UNTRUSTED_DEVICE",
        userId: authIntegrationFixtures.studentOne.userId,
      },
    })

    const response = await request("GET", "/devices/trust/attendance-ready", {
      token: studentSession.tokens.accessToken,
      headers: buildTrustedDeviceHeaders(authIntegrationFixtures.studentOne.device.installId),
    })

    expect(response.statusCode).toBe(403)

    const revokedAfter = await getPrisma().securityEvent.count({
      where: {
        eventType: "REVOKED_DEVICE_USED",
        userId: authIntegrationFixtures.studentOne.userId,
      },
    })
    const blockedAfter = await getPrisma().securityEvent.count({
      where: {
        eventType: "ATTENDANCE_BLOCKED_UNTRUSTED_DEVICE",
        userId: authIntegrationFixtures.studentOne.userId,
      },
    })

    expect(revokedAfter).toBe(revokedBefore + 1)
    expect(blockedAfter).toBe(blockedBefore + 1)
  })

  async function login(payload: Record<string, unknown>) {
    const response = await request("POST", "/auth/login", {
      payload,
    })

    expect(response.statusCode).toBe(201)
    return authSessionResponseSchema.parse(response.body)
  }

  async function request(
    method: "GET" | "POST",
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
        method: "GET" | "POST"
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
