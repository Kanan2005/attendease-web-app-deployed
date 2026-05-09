import {
  adminSettingsAcademicResponseSchema,
  adminSettingsAdminInviteResponseSchema,
  adminSettingsAdminListResponseSchema,
  adminSettingsAdminRevokeResponseSchema,
  adminSettingsChangePasswordResponseSchema,
  adminSettingsSystemResponseSchema,
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

describe("Admin settings integration", () => {
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
    database = await createTemporaryDatabase("attendease_admin_settings")
    await seedAuthIntegrationData(database.databaseUrl)

    process.env.NODE_ENV = "test"
    process.env.TEST_DATABASE_URL = database.databaseUrl
    process.env.AUTH_ACCESS_TOKEN_SECRET = "attendease-admin-settings-secret-1234567890"
    process.env.AUTH_ISSUER = "attendease-api-test"
    process.env.AUTH_AUDIENCE = "attendease-client-test"
    process.env.GOOGLE_OIDC_CLIENT_ID = "admin-settings-test-google-client"
    process.env.GOOGLE_OIDC_CLIENT_SECRET = "admin-settings-test-google-secret"
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
  })

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

  it("returns informational academic counts", async () => {
    const adminToken = await loginAsAdmin()
    const response = await request("GET", "/admin/settings/academic", { token: adminToken })
    expect(response.statusCode).toBe(200)
    const result = adminSettingsAcademicResponseSchema.parse(response.body)
    expect(result.branches.length).toBeGreaterThanOrEqual(1)
    expect(
      result.semesterStatusCounts.active +
        result.semesterStatusCounts.closed +
        result.semesterStatusCounts.archived,
    ).toBeGreaterThanOrEqual(1)
  })

  it("returns hard-coded defaults when no system settings stored, then persists overrides", async () => {
    const adminToken = await loginAsAdmin()
    const initial = await request("GET", "/admin/settings/system", { token: adminToken })
    expect(initial.statusCode).toBe(200)
    const before = adminSettingsSystemResponseSchema.parse(initial.body)
    expect(before.values.gpsRadiusMeters).toBe(50)
    expect(before.updatedAt).toBeNull()

    const updateResponse = await request("PATCH", "/admin/settings/system", {
      token: adminToken,
      payload: { gpsRadiusMeters: 75, qrRotationWindowSeconds: 7 },
    })
    expect(updateResponse.statusCode).toBe(200)
    const after = adminSettingsSystemResponseSchema.parse(updateResponse.body)
    expect(after.values.gpsRadiusMeters).toBe(75)
    expect(after.values.qrRotationWindowSeconds).toBe(7)
    expect(after.values.bluetoothRotationWindowSeconds).toBe(8) // unchanged default
    expect(after.updatedAt).not.toBeNull()
    expect(after.updatedBy?.email).toBe(authIntegrationFixtures.admin.email)

    const auditRows = await getPrisma().adminActionLog.findMany({
      where: { actionType: "SYSTEM_SETTING_UPDATE" },
    })
    expect(auditRows.length).toBeGreaterThanOrEqual(1)
  })

  it("rejects empty system settings update", async () => {
    const adminToken = await loginAsAdmin()
    const response = await request("PATCH", "/admin/settings/system", {
      token: adminToken,
      payload: {},
    })
    expect(response.statusCode).toBe(400)
  })

  it("invites a brand-new admin and returns a temp password once", async () => {
    const adminToken = await loginAsAdmin()
    const response = await request("POST", "/admin/settings/admins/invite", {
      token: adminToken,
      payload: {
        email: "fresh-admin@attendease.dev",
        displayName: "Fresh Admin",
      },
    })
    expect(response.statusCode).toBe(201)
    const result = adminSettingsAdminInviteResponseSchema.parse(response.body)
    expect(result.alreadyHadAccount).toBe(false)
    expect(result.alreadyAdmin).toBe(false)
    expect(result.temporaryPassword.length).toBeGreaterThanOrEqual(12)

    // The new user should be able to log in with the temp password.
    const loginResponse = await request("POST", "/auth/login", {
      payload: {
        email: "fresh-admin@attendease.dev",
        password: result.temporaryPassword,
        platform: "WEB",
        requestedRole: "ADMIN",
      },
    })
    expect(loginResponse.statusCode).toBe(201)
  })

  it("can re-invite the previously-invited admin; sets alreadyHadAccount and alreadyAdmin", async () => {
    const adminToken = await loginAsAdmin()
    // Re-invite the same address we just created — does not touch the seed
    // admin so our subsequent loginAsAdmin() calls keep working.
    const response = await request("POST", "/admin/settings/admins/invite", {
      token: adminToken,
      payload: {
        email: "fresh-admin@attendease.dev",
        displayName: "Fresh Admin (re-invited)",
      },
    })
    expect(response.statusCode).toBe(201)
    const result = adminSettingsAdminInviteResponseSchema.parse(response.body)
    expect(result.alreadyHadAccount).toBe(true)
    expect(result.alreadyAdmin).toBe(true)
    // The new temp password should also work.
    const loginResponse = await request("POST", "/auth/login", {
      payload: {
        email: "fresh-admin@attendease.dev",
        password: result.temporaryPassword,
        platform: "WEB",
        requestedRole: "ADMIN",
      },
    })
    expect(loginResponse.statusCode).toBe(201)
  })

  it("lists admins with isSelf flag set on caller", async () => {
    const adminToken = await loginAsAdmin()
    const response = await request("GET", "/admin/settings/admins", { token: adminToken })
    expect(response.statusCode).toBe(200)
    const result = adminSettingsAdminListResponseSchema.parse(response.body)
    expect(result.admins.length).toBeGreaterThanOrEqual(2)
    expect(result.admins.some((a) => a.isSelf)).toBe(true)
  })

  it("refuses to revoke own admin role", async () => {
    const session = await login({
      email: authIntegrationFixtures.admin.email,
      password: authIntegrationFixtures.admin.password,
      platform: "WEB",
      requestedRole: "ADMIN",
    })
    const response = await request("DELETE", `/admin/settings/admins/${session.user.id}`, {
      token: session.tokens.accessToken,
      payload: {},
    })
    expect(response.statusCode).toBe(403)
  })

  it("revokes admin role from another admin and writes audit row", async () => {
    const adminToken = await loginAsAdmin()
    // Find another admin user from the seed data — fixtures include a second
    // admin via the fresh-admin invite above.
    const others = await request("GET", "/admin/settings/admins", { token: adminToken })
    const list = adminSettingsAdminListResponseSchema.parse(others.body)
    const target = list.admins.find((a) => !a.isSelf)
    expect(target).toBeDefined()
    if (!target) return

    const response = await request("DELETE", `/admin/settings/admins/${target.userId}`, {
      token: adminToken,
      payload: { reason: "Smoke test cleanup" },
    })
    expect(response.statusCode).toBe(200)
    const result = adminSettingsAdminRevokeResponseSchema.parse(response.body)
    expect(result.removedAdminRole).toBe(true)

    const audit = await getPrisma().adminActionLog.findFirst({
      where: {
        actionType: "ADMIN_ROLE_REVOKE",
        targetUserId: target.userId,
      },
    })
    expect(audit).not.toBeNull()
  })

  it("lets the caller change own password and re-login with the new one", async () => {
    const adminToken = await loginAsAdmin()
    const newPassword = "ZxCvBnM!9876543"
    const change = await request("POST", "/admin/settings/security/change-password", {
      token: adminToken,
      payload: {
        currentPassword: authIntegrationFixtures.admin.password,
        newPassword,
      },
    })
    expect(change.statusCode).toBe(201)
    adminSettingsChangePasswordResponseSchema.parse(change.body)

    // New password works.
    const loginNew = await request("POST", "/auth/login", {
      payload: {
        email: authIntegrationFixtures.admin.email,
        password: newPassword,
        platform: "WEB",
        requestedRole: "ADMIN",
      },
    })
    expect(loginNew.statusCode).toBe(201)

    // Old password no longer works.
    const loginOld = await request("POST", "/auth/login", {
      payload: {
        email: authIntegrationFixtures.admin.email,
        password: authIntegrationFixtures.admin.password,
        platform: "WEB",
        requestedRole: "ADMIN",
      },
    })
    expect(loginOld.statusCode).toBe(401)
  })

  it("rejects unauthenticated callers", async () => {
    const response = await request("GET", "/admin/settings/system", {})
    expect(response.statusCode).toBe(401)
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
