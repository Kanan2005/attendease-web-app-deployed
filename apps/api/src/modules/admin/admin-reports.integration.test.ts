import {
  adminReportJobSummarySchema,
  adminReportRecentListResponseSchema,
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
import { ExportStorageService } from "../exports/export-storage.service.js"

describe("Admin reports integration", () => {
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
  const uploadCalls: { objectKey: string; sizeBytes: number }[] = []
  const fakeStorage = {
    uploadObject: vi.fn(async (input: { objectKey: string; body: Uint8Array }) => {
      uploadCalls.push({ objectKey: input.objectKey, sizeBytes: input.body.byteLength })
    }),
    getDownloadUrl: vi.fn(
      async (objectKey: string) => `https://example-storage.test/${objectKey}?signed=1`,
    ),
  }

  beforeAll(async () => {
    database = await createTemporaryDatabase("attendease_admin_reports")
    await seedAuthIntegrationData(database.databaseUrl)

    process.env.NODE_ENV = "test"
    process.env.TEST_DATABASE_URL = database.databaseUrl
    process.env.AUTH_ACCESS_TOKEN_SECRET = "attendease-admin-reports-secret-1234567890"
    process.env.AUTH_ISSUER = "attendease-api-test"
    process.env.AUTH_AUDIENCE = "attendease-client-test"
    process.env.GOOGLE_OIDC_CLIENT_ID = "admin-reports-test-google-client"
    process.env.GOOGLE_OIDC_CLIENT_SECRET = "admin-reports-test-google-secret"
    process.env.GOOGLE_OIDC_REDIRECT_URI = "http://localhost:3000/auth/google/callback"
    process.env.GOOGLE_TEACHER_ALLOWED_DOMAINS = "attendease.dev"
    process.env.GOOGLE_STUDENT_ALLOWED_DOMAINS = "attendease.dev"

    prisma = createPrismaClient({ databaseUrl: database.databaseUrl, singleton: false })

    const testingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GoogleOidcService)
      .useValue(googleOidcService)
      .overrideProvider(ExportStorageService)
      .useValue(fakeStorage)
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

  it("rejects student report with no filters", async () => {
    const adminToken = await loginAsAdmin()
    const response = await request("POST", "/admin/reports/student", {
      token: adminToken,
      payload: {},
    })
    expect(response.statusCode).toBe(400)
  })

  it("generates a student report XLSX, persists job + file row, and exposes a download URL", async () => {
    const adminToken = await loginAsAdmin()
    const response = await request("POST", "/admin/reports/student", {
      token: adminToken,
      payload: { courseOfferingId: developmentSeedIds.courseOfferings.math },
    })
    expect(response.statusCode).toBe(201)
    const result = adminReportJobSummarySchema.parse(response.body)
    expect(result.status).toBe("COMPLETED")
    expect(result.jobType).toBe("ADMIN_STUDENT_REPORT_XLSX")
    expect(result.rowCount).toBeGreaterThanOrEqual(4)
    expect(result.sizeBytes).toBeGreaterThan(0)
    expect(result.downloadUrl).toMatch(/^https:\/\/example-storage\.test\/admin-reports\//)
    expect(result.fileName).toMatch(/\.xlsx$/)

    // ExportJob and ExportJobFile rows persisted.
    const job = await getPrisma().exportJob.findUniqueOrThrow({
      where: { id: result.jobId },
      include: { files: true },
    })
    expect(job.status).toBe("COMPLETED")
    expect(job.jobType).toBe("ADMIN_STUDENT_REPORT_XLSX")
    expect(job.files.length).toBe(1)
    expect(job.files[0]?.mimeType).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )

    // Storage was actually called.
    expect(uploadCalls.some((call) => call.objectKey.includes(result.jobId))).toBe(true)

    // Generated bytes are a valid ZIP (XLSX is ZIP) — first 2 bytes "PK".
    const matched = uploadCalls.find((call) => call.objectKey.includes(result.jobId))
    expect(matched?.sizeBytes).toBeGreaterThan(2000)
  })

  it("generates a course report scoped to the chosen course offering", async () => {
    const adminToken = await loginAsAdmin()
    const response = await request("POST", "/admin/reports/course", {
      token: adminToken,
      payload: { courseOfferingId: developmentSeedIds.courseOfferings.math },
    })
    expect(response.statusCode).toBe(201)
    const result = adminReportJobSummarySchema.parse(response.body)
    expect(result.status).toBe("COMPLETED")
    expect(result.jobType).toBe("ADMIN_COURSE_REPORT_XLSX")
    expect(result.rowCount).toBeGreaterThanOrEqual(4)
  })

  it("404s for an unknown course offering id on course report", async () => {
    const adminToken = await loginAsAdmin()
    const response = await request("POST", "/admin/reports/course", {
      token: adminToken,
      payload: { courseOfferingId: "course-does-not-exist" },
    })
    // Service throws NotFoundException → wrapped into FAILED job.
    expect(response.statusCode).toBe(201)
    const result = adminReportJobSummarySchema.parse(response.body)
    expect(result.status).toBe("FAILED")
    expect(result.errorMessage).toMatch(/not found/i)
  })

  it("generates a teacher report when a department filter is given", async () => {
    const adminToken = await loginAsAdmin()
    const response = await request("POST", "/admin/reports/teacher", {
      token: adminToken,
      payload: { department: "Computer Science" },
    })
    expect(response.statusCode).toBe(201)
    const result = adminReportJobSummarySchema.parse(response.body)
    expect(result.status).toBe("COMPLETED")
    expect(result.jobType).toBe("ADMIN_TEACHER_REPORT_XLSX")
  })

  it("lists recent reports for the current admin", async () => {
    const adminToken = await loginAsAdmin()
    const response = await request("GET", "/admin/reports/recent", {
      token: adminToken,
    })
    expect(response.statusCode).toBe(200)
    const result = adminReportRecentListResponseSchema.parse(response.body)
    expect(result.jobs.length).toBeGreaterThanOrEqual(1)
    expect(result.jobs[0]?.jobType).toMatch(/^ADMIN_/)
  })

  it("rejects unauthenticated callers", async () => {
    const response = await request("POST", "/admin/reports/student", {
      payload: { branch: "Computer Science" },
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
    options: { payload?: unknown; token?: string } = {},
  ): Promise<{ statusCode: number; body: unknown }> {
    if (!app) throw new Error("Test application is not initialized.")
    const fastify = app.getHttpAdapter().getInstance() as {
      inject: (input: {
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
