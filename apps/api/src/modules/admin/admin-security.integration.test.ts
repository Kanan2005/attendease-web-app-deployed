import {
  adminActionAuditResponseSchema,
  adminForceLogoutResponseSchema,
  adminSecurityAuditResponseSchema,
  adminUserSessionsResponseSchema,
  authSessionResponseSchema,
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

describe("Admin security audit integration", () => {
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
  const googleOidcService = { verifyExchange: vi.fn() }

  beforeAll(async () => {
    database = await createTemporaryDatabase("attendease_admin_security")
    await seedAuthIntegrationData(database.databaseUrl)

    process.env.NODE_ENV = "test"
    process.env.TEST_DATABASE_URL = database.databaseUrl
    process.env.AUTH_ACCESS_TOKEN_SECRET = "attendease-admin-security-secret-1234567890"
    process.env.AUTH_ISSUER = "attendease-api-test"
    process.env.AUTH_AUDIENCE = "attendease-client-test"
    process.env.GOOGLE_OIDC_CLIENT_ID = "admin-security-test-google-client"
    process.env.GOOGLE_OIDC_CLIENT_SECRET = "admin-security-test-google-secret"
    process.env.GOOGLE_OIDC_REDIRECT_URI = "http://localhost:3000/auth/google/callback"
    process.env.GOOGLE_TEACHER_ALLOWED_DOMAINS = "attendease.dev"
    process.env.GOOGLE_STUDENT_ALLOWED_DOMAINS = "attendease.dev"

    prisma = createPrismaClient({ databaseUrl: database.databaseUrl, singleton: false })

    const testingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GoogleOidcService)
      .useValue(googleOidcService)
      .compile()

    app = testingModule.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    await app.init()
    await app.getHttpAdapter().getInstance().ready()

    // Seed some security events and admin actions for testing
    await getPrisma().securityEvent.createMany({
      data: [
        {
          userId: authIntegrationFixtures.studentOne.userId,
          eventType: "DEVICE_BOUND",
          severity: "LOW",
          description: "Device bound during registration",
        },
        {
          userId: authIntegrationFixtures.studentOne.userId,
          eventType: "ATTENDANCE_BLOCKED_UNTRUSTED_DEVICE",
          severity: "HIGH",
          description: "Student tried untrusted device",
        },
        {
          userId: authIntegrationFixtures.studentTwo.userId,
          eventType: "DEVICE_REVOKED",
          severity: "MEDIUM",
          description: "Admin revoked student device",
          actorUserId: authIntegrationFixtures.admin.userId,
        },
        {
          userId: authIntegrationFixtures.studentTwo.userId,
          eventType: "LOGIN_RISK_DETECTED",
          severity: "CRITICAL",
          description: "Login from suspicious location",
        },
      ],
    })

    await getPrisma().adminActionLog.createMany({
      data: [
        {
          adminUserId: authIntegrationFixtures.admin.userId,
          targetUserId: authIntegrationFixtures.studentOne.userId,
          actionType: "USER_STATUS_CHANGE",
          metadata: { from: "ACTIVE", to: "BLOCKED" },
        },
        {
          adminUserId: authIntegrationFixtures.admin.userId,
          targetUserId: authIntegrationFixtures.studentTwo.userId,
          actionType: "DEVICE_REVOKE",
          metadata: { reason: "Lost device" },
        },
      ],
    })
  }, 60_000)

  afterAll(async () => {
    if (app) await app.close()
    if (prisma) await disconnectPrismaClient(prisma)
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
    if (database) await destroyTemporaryDatabase(database)
  })

  // -------------------------------------------------------------------------
  // Security Events
  // -------------------------------------------------------------------------

  it("returns all security events with default pagination", async () => {
    const adminToken = await loginAsAdmin()
    const response = await request("GET", "/admin/security/events", { token: adminToken })
    expect(response.statusCode).toBe(200)
    const result = adminSecurityAuditResponseSchema.parse(response.body)
    expect(result.events.length).toBeGreaterThanOrEqual(4)
    expect(result.totalCount).toBeGreaterThanOrEqual(4)
    // newest first
    expect(result.events[0]?.eventType).toBeTruthy()
  })

  it("filters security events by eventType", async () => {
    const adminToken = await loginAsAdmin()
    const response = await request("GET", "/admin/security/events?eventType=DEVICE_BOUND", {
      token: adminToken,
    })
    expect(response.statusCode).toBe(200)
    const result = adminSecurityAuditResponseSchema.parse(response.body)
    expect(result.events.length).toBeGreaterThanOrEqual(1)
    for (const ev of result.events) {
      expect(ev.eventType).toBe("DEVICE_BOUND")
    }
  })

  it("filters security events by severity", async () => {
    const adminToken = await loginAsAdmin()
    const response = await request("GET", "/admin/security/events?severity=CRITICAL", {
      token: adminToken,
    })
    expect(response.statusCode).toBe(200)
    const result = adminSecurityAuditResponseSchema.parse(response.body)
    expect(result.events.length).toBeGreaterThanOrEqual(1)
    for (const ev of result.events) {
      expect(ev.severity).toBe("CRITICAL")
    }
  })

  it("filters security events by userId", async () => {
    const adminToken = await loginAsAdmin()
    const uid = authIntegrationFixtures.studentOne.userId
    const response = await request("GET", `/admin/security/events?userId=${uid}`, {
      token: adminToken,
    })
    expect(response.statusCode).toBe(200)
    const result = adminSecurityAuditResponseSchema.parse(response.body)
    expect(result.events.length).toBeGreaterThanOrEqual(2)
    for (const ev of result.events) {
      expect(ev.userId).toBe(uid)
    }
  })

  it("paginates security events with limit and cursor", async () => {
    const adminToken = await loginAsAdmin()
    const page1 = await request("GET", "/admin/security/events?limit=2", { token: adminToken })
    expect(page1.statusCode).toBe(200)
    const r1 = adminSecurityAuditResponseSchema.parse(page1.body)
    expect(r1.events.length).toBe(2)
    expect(r1.nextCursor).toBeTruthy()

    const page2 = await request(
      "GET",
      `/admin/security/events?limit=2&cursor=${r1.nextCursor}`,
      { token: adminToken },
    )
    expect(page2.statusCode).toBe(200)
    const r2 = adminSecurityAuditResponseSchema.parse(page2.body)
    expect(r2.events.length).toBeGreaterThanOrEqual(1)
    // no overlap
    const ids1 = new Set(r1.events.map((e: { id: string }) => e.id))
    for (const ev of r2.events) {
      expect(ids1.has(ev.id)).toBe(false)
    }
  })

  it("enriches events with user display names", async () => {
    const adminToken = await loginAsAdmin()
    const response = await request("GET", "/admin/security/events?eventType=DEVICE_REVOKED", {
      token: adminToken,
    })
    expect(response.statusCode).toBe(200)
    const result = adminSecurityAuditResponseSchema.parse(response.body)
    const ev = result.events[0]
    expect(ev?.userDisplayName).toBeTruthy()
    expect(ev?.actorDisplayName).toBeTruthy()
  })

  it("rejects non-admin access to security events", async () => {
    const teacherToken = await loginAsTeacher()
    const response = await request("GET", "/admin/security/events", { token: teacherToken })
    expect(response.statusCode).toBe(403)
  })

  it("filters admin actions by actionType", async () => {
    const adminToken = await loginAsAdmin()
    const response = await request("GET", "/admin/security/actions?actionType=DEVICE_REVOKE", {
      token: adminToken,
    })
    expect(response.statusCode).toBe(200)
    const result = adminActionAuditResponseSchema.parse(response.body)
    expect(result.actions.length).toBeGreaterThanOrEqual(1)
    for (const action of result.actions) {
      expect(action.actionType).toBe("DEVICE_REVOKE")
    }
  })

  it("enriches admin actions with admin and target display names", async () => {
    const adminToken = await loginAsAdmin()
    const response = await request("GET", "/admin/security/actions", { token: adminToken })
    expect(response.statusCode).toBe(200)
    const result = adminActionAuditResponseSchema.parse(response.body)
    for (const action of result.actions) {
      expect(action.adminEmail).toBeTruthy()
      expect(action.adminDisplayName).toBeTruthy()
      expect(action.targetEmail).toBeTruthy()
      expect(action.targetDisplayName).toBeTruthy()
    }
  })

  it("rejects non-admin access to admin actions", async () => {
    const teacherToken = await loginAsTeacher()
    const response = await request("GET", "/admin/security/actions", { token: teacherToken })
    expect(response.statusCode).toBe(403)
  })

  // -------------------------------------------------------------------------
  // User Sessions (3B)
  // -------------------------------------------------------------------------

  it("lists sessions for a specific user", async () => {
    const adminToken = await loginAsAdmin()
    const response = await request(
      "GET",
      `/admin/users/${authIntegrationFixtures.admin.userId}/sessions`,
      { token: adminToken },
    )
    expect(response.statusCode).toBe(200)
    const result = adminUserSessionsResponseSchema.parse(response.body)
    expect(result.userId).toBe(authIntegrationFixtures.admin.userId)
    expect(result.sessions.length).toBeGreaterThanOrEqual(1)
    expect(result.totalCount).toBeGreaterThanOrEqual(1)
    const activeSession = result.sessions.find((s) => s.status === "ACTIVE")
    expect(activeSession).toBeDefined()
    expect(activeSession?.platform).toBe("WEB")
  })

  it("filters sessions by status", async () => {
    const adminToken = await loginAsAdmin()
    const response = await request(
      "GET",
      `/admin/users/${authIntegrationFixtures.admin.userId}/sessions?status=ACTIVE`,
      { token: adminToken },
    )
    expect(response.statusCode).toBe(200)
    const result = adminUserSessionsResponseSchema.parse(response.body)
    for (const session of result.sessions) {
      expect(session.status).toBe("ACTIVE")
    }
  })

  it("returns 404 for non-existent user sessions", async () => {
    const adminToken = await loginAsAdmin()
    const response = await request("GET", "/admin/users/non_existent_user/sessions", {
      token: adminToken,
    })
    expect(response.statusCode).toBe(404)
  })

  it("rejects non-admin access to user sessions", async () => {
    const teacherToken = await loginAsTeacher()
    const response = await request(
      "GET",
      `/admin/users/${authIntegrationFixtures.studentOne.userId}/sessions`,
      { token: teacherToken },
    )
    expect(response.statusCode).toBe(403)
  })

  // -------------------------------------------------------------------------
  // Force Logout (3C)
  // -------------------------------------------------------------------------

  it("force-logs out a user and revokes all active sessions", async () => {
    const adminToken = await loginAsAdmin()
    await login({
      email: authIntegrationFixtures.studentOne.email,
      password: authIntegrationFixtures.studentOne.password,
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: authIntegrationFixtures.studentOne.device,
    })

    const beforeResponse = await request(
      "GET",
      `/admin/users/${authIntegrationFixtures.studentOne.userId}/sessions?status=ACTIVE`,
      { token: adminToken },
    )
    expect(beforeResponse.statusCode).toBe(200)
    const before = adminUserSessionsResponseSchema.parse(beforeResponse.body)
    expect(before.sessions.length).toBeGreaterThanOrEqual(1)

    const logoutResponse = await request(
      "POST",
      `/admin/users/${authIntegrationFixtures.studentOne.userId}/force-logout`,
      { token: adminToken },
    )
    expect(logoutResponse.statusCode).toBe(201)
    const logoutResult = adminForceLogoutResponseSchema.parse(logoutResponse.body)
    expect(logoutResult.userId).toBe(authIntegrationFixtures.studentOne.userId)
    expect(logoutResult.revokedCount).toBeGreaterThanOrEqual(1)

    const afterResponse = await request(
      "GET",
      `/admin/users/${authIntegrationFixtures.studentOne.userId}/sessions?status=ACTIVE`,
      { token: adminToken },
    )
    expect(afterResponse.statusCode).toBe(200)
    const after = adminUserSessionsResponseSchema.parse(afterResponse.body)
    expect(after.sessions.length).toBe(0)
  })

  it("creates an admin action log entry for force-logout", async () => {
    const adminToken = await loginAsAdmin()
    await login({
      email: authIntegrationFixtures.studentTwo.email,
      password: authIntegrationFixtures.studentTwo.password,
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: authIntegrationFixtures.studentTwo.device,
    })
    await request(
      "POST",
      `/admin/users/${authIntegrationFixtures.studentTwo.userId}/force-logout`,
      { token: adminToken },
    )

    const actionLog = await getPrisma().adminActionLog.findFirst({
      where: {
        adminUserId: authIntegrationFixtures.admin.userId,
        targetUserId: authIntegrationFixtures.studentTwo.userId,
        actionType: "USER_STATUS_CHANGE",
        metadata: { path: ["action"], equals: "FORCE_LOGOUT" },
      },
      orderBy: { createdAt: "desc" },
    })
    expect(actionLog).toBeDefined()
    expect((actionLog?.metadata as Record<string, unknown>)?.action).toBe("FORCE_LOGOUT")
  })

  it("returns 404 when force-logging out non-existent user", async () => {
    const adminToken = await loginAsAdmin()
    const response = await request("POST", "/admin/users/non_existent_user/force-logout", {
      token: adminToken,
    })
    expect(response.statusCode).toBe(404)
  })

  it("rejects non-admin force-logout", async () => {
    const teacherToken = await loginAsTeacher()
    const response = await request(
      "POST",
      `/admin/users/${authIntegrationFixtures.studentOne.userId}/force-logout`,
      { token: teacherToken },
    )
    expect(response.statusCode).toBe(403)
  })

  // ------------------------------ helpers ------------------------------

  async function loginAsAdmin(): Promise<string> {
    const session = await login({
      email: authIntegrationFixtures.admin.email,
      password: authIntegrationFixtures.admin.password,
      platform: "WEB",
      requestedRole: "ADMIN",
    })
    return session.tokens.accessToken
  }

  async function loginAsTeacher(): Promise<string> {
    const session = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })
    return session.tokens.accessToken
  }

  async function login(payload: Record<string, unknown>) {
    const response = await request("POST", "/auth/login", { payload })
    expect(response.statusCode).toBe(201)
    return authSessionResponseSchema.parse(response.body)
  }

  async function request(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    url: string,
    options: { payload?: unknown; token?: string } = {},
  ): Promise<{ statusCode: number; body: unknown }> {
    if (!app) throw new Error("Test application is not initialized.")
    const fastify = app.getHttpAdapter().getInstance() as {
      inject: (input: {
        method: "GET" | "POST" | "PATCH" | "DELETE"
        url: string
        payload?: unknown
        headers?: Record<string, string>
      }) => Promise<{ statusCode: number; body: string }>
    }
    const response = await fastify.inject({
      method,
      url,
      ...(options.payload !== undefined ? { payload: options.payload } : {}),
      headers: options.token ? { authorization: `Bearer ${options.token}` } : {},
    })
    return {
      statusCode: response.statusCode,
      body: response.body ? JSON.parse(response.body) : null,
    }
  }

  function getPrisma() {
    if (!prisma) throw new Error("Prisma client is not initialized.")
    return prisma
  }
})
