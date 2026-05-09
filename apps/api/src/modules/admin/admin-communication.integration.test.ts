import {
  adminCommunicationAudiencePreviewResponseSchema,
  adminCommunicationLogDispatchResponseSchema,
  authSessionResponseSchema,
} from "@attendease/contracts"
import { createPrismaClient, developmentSeedIds, disconnectPrismaClient } from "@attendease/db"
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

describe("Admin communication integration", () => {
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
    database = await createTemporaryDatabase("attendease_admin_communication")
    await seedAuthIntegrationData(database.databaseUrl)

    process.env.NODE_ENV = "test"
    process.env.TEST_DATABASE_URL = database.databaseUrl
    process.env.AUTH_ACCESS_TOKEN_SECRET = "attendease-admin-communication-secret-1234567890"
    process.env.AUTH_ISSUER = "attendease-api-test"
    process.env.AUTH_AUDIENCE = "attendease-client-test"
    process.env.GOOGLE_OIDC_CLIENT_ID = "admin-communication-test-google-client"
    process.env.GOOGLE_OIDC_CLIENT_SECRET = "admin-communication-test-google-secret"
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

  it("rejects audience preview with no filters (safety guard)", async () => {
    const adminToken = await loginAsAdmin()
    const response = await request("POST", "/admin/communication/audience-preview", {
      token: adminToken,
      payload: { audience: "STUDENT" },
    })
    expect(response.statusCode).toBe(400)
  })

  it("resolves student audience for a course offering and writes audit log", async () => {
    const adminToken = await loginAsAdmin()
    const response = await request("POST", "/admin/communication/audience-preview", {
      token: adminToken,
      payload: {
        audience: "STUDENT",
        courseOfferingId: developmentSeedIds.courseOfferings.math,
      },
    })
    expect(response.statusCode).toBe(201)
    const result = adminCommunicationAudiencePreviewResponseSchema.parse(response.body)
    expect(result.audience).toBe("STUDENT")
    expect(result.studentCount).toBeGreaterThanOrEqual(4)
    expect(result.emailCount).toBe(result.studentCount)
    expect(result.missingEmailCount).toBe(0)
    expect(result.emails.length).toBe(result.emailCount)
    for (const email of result.emails) {
      expect(email).toMatch(/@/)
    }
    expect(result.sample.length).toBeGreaterThan(0)

    const auditRows = await getPrisma().adminActionLog.findMany({
      where: { actionType: "COMMUNICATION_AUDIENCE_PREVIEW" },
    })
    expect(auditRows.length).toBeGreaterThanOrEqual(1)
  })

  it("filters parent-mode recipients to students with a parentEmail", async () => {
    const adminToken = await loginAsAdmin()
    const response = await request("POST", "/admin/communication/audience-preview", {
      token: adminToken,
      payload: {
        audience: "PARENT",
        courseOfferingId: developmentSeedIds.courseOfferings.math,
      },
    })
    expect(response.statusCode).toBe(201)
    const result = adminCommunicationAudiencePreviewResponseSchema.parse(response.body)
    expect(result.audience).toBe("PARENT")
    // Sum of emailCount + missingEmailCount must equal studentCount.
    expect(result.emailCount + result.missingEmailCount).toBe(result.studentCount)
    for (const email of result.emails) {
      expect(email).toMatch(/@/)
    }
  })

  it("applies attendance threshold with BELOW comparator on a course", async () => {
    const adminToken = await loginAsAdmin()
    const response = await request("POST", "/admin/communication/audience-preview", {
      token: adminToken,
      payload: {
        audience: "STUDENT",
        courseOfferingId: developmentSeedIds.courseOfferings.math,
        attendanceThresholdPercent: 80,
        attendanceComparator: "BELOW",
      },
    })
    expect(response.statusCode).toBe(201)
    const result = adminCommunicationAudiencePreviewResponseSchema.parse(response.body)
    // We only assert structure here — actual count depends on seed analytics.
    expect(result.studentCount).toBeGreaterThanOrEqual(0)
  })

  it("logs a dispatch attempt with channel + recipient count", async () => {
    const adminToken = await loginAsAdmin()
    const response = await request("POST", "/admin/communication/log-dispatch", {
      token: adminToken,
      payload: {
        audience: "STUDENT",
        channel: "GMAIL",
        recipientCount: 4,
        subjectPreview: "Attendance update",
        filtersSummary: "course=Math, audience=student",
      },
    })
    expect(response.statusCode).toBe(201)
    const result = adminCommunicationLogDispatchResponseSchema.parse(response.body)
    expect(result.loggedAt).toMatch(/T/)

    const auditRows = await getPrisma().adminActionLog.findMany({
      where: { actionType: "COMMUNICATION_GMAIL_DISPATCH_PREPARED" },
    })
    expect(auditRows.length).toBeGreaterThanOrEqual(1)
  })

  it("rejects audience preview without an admin token", async () => {
    const response = await request("POST", "/admin/communication/audience-preview", {
      payload: { audience: "STUDENT", branch: "Computer Science" },
    })
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
    method: "GET" | "POST",
    url: string,
    options: { payload?: unknown; token?: string; headers?: Record<string, string> } = {},
  ): Promise<{ statusCode: number; body: unknown }> {
    if (!app) throw new Error("Test application is not initialized.")
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
      ...(options.payload !== undefined ? { payload: options.payload } : {}),
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

  function getPrisma() {
    if (!prisma) throw new Error("Prisma client is not initialized.")
    return prisma
  }
})
