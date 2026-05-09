import {
  adminDashboardBranchComparisonResponseSchema,
  adminDashboardLeaderboardResponseSchema,
  adminDashboardSessionsGraphResponseSchema,
  adminDashboardStatsSchema,
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

describe("Admin dashboard integration (Phase 6)", () => {
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
    database = await createTemporaryDatabase("attendease_admin_dashboard")
    await seedAuthIntegrationData(database.databaseUrl)

    process.env.NODE_ENV = "test"
    process.env.TEST_DATABASE_URL = database.databaseUrl
    process.env.AUTH_ACCESS_TOKEN_SECRET = "attendease-admin-dashboard-secret-1234567890"
    process.env.AUTH_ISSUER = "attendease-api-test"
    process.env.AUTH_AUDIENCE = "attendease-client-test"
    process.env.GOOGLE_OIDC_CLIENT_ID = "admin-dashboard-test-google-client"
    process.env.GOOGLE_OIDC_CLIENT_SECRET = "admin-dashboard-test-google-secret"
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

  it("returns stats with insights block including all five computed fields", async () => {
    const adminToken = await loginAsAdmin()
    const response = await request("GET", "/admin/dashboard/stats", { token: adminToken })
    expect(response.statusCode).toBe(200)
    const result = adminDashboardStatsSchema.parse(response.body)

    expect(result.insights).toBeDefined()
    // Threshold should be in the documented range and default to 75 when no SystemSetting exists.
    expect(result.insights.lowAttendanceThresholdPercent).toBeGreaterThanOrEqual(40)
    expect(result.insights.lowAttendanceThresholdPercent).toBeLessThanOrEqual(100)
    expect(result.insights.lowAttendanceThresholdPercent).toBe(75)
    expect(result.insights.lowAttendanceStudentCount).toBeGreaterThanOrEqual(0)
    expect(result.insights.sessionsLast7Days).toBeGreaterThanOrEqual(0)
    expect(result.insights.sessionsPrior7Days).toBeGreaterThanOrEqual(0)
  })

  it("threshold change in SystemSetting is reflected on next /stats call (Phase 5 ↔ Phase 6 wiring)", async () => {
    const adminToken = await loginAsAdmin()

    const before = adminDashboardStatsSchema.parse(
      (await request("GET", "/admin/dashboard/stats", { token: adminToken })).body,
    )
    expect(before.insights.lowAttendanceThresholdPercent).toBe(75)

    // Lift the threshold via the Phase 5 endpoint.
    const patch = await request("PATCH", "/admin/settings/system", {
      token: adminToken,
      payload: { lowAttendanceThresholdPercent: 90 },
    })
    expect(patch.statusCode).toBe(200)

    const after = adminDashboardStatsSchema.parse(
      (await request("GET", "/admin/dashboard/stats", { token: adminToken })).body,
    )
    expect(after.insights.lowAttendanceThresholdPercent).toBe(90)
    // A higher threshold can only equal-or-grow the at-risk count.
    expect(after.insights.lowAttendanceStudentCount).toBeGreaterThanOrEqual(
      before.insights.lowAttendanceStudentCount,
    )
  })

  it("sessions-graph weekly returns exactly 7 daily buckets summing to totalSessions", async () => {
    const adminToken = await loginAsAdmin()
    const response = await request("GET", "/admin/dashboard/sessions-graph?range=weekly", {
      token: adminToken,
    })
    expect(response.statusCode).toBe(200)
    const result = adminDashboardSessionsGraphResponseSchema.parse(response.body)
    expect(result.range).toBe("weekly")
    expect(result.points.length).toBe(7)
    const summed = result.points.reduce((acc, p) => acc + p.sessionCount, 0)
    expect(summed).toBe(result.totalSessions)
  })

  it("sessions-graph monthly returns 4 weekly buckets and yearly returns 12 monthly buckets", async () => {
    const adminToken = await loginAsAdmin()
    const monthly = adminDashboardSessionsGraphResponseSchema.parse(
      (await request("GET", "/admin/dashboard/sessions-graph?range=monthly", { token: adminToken }))
        .body,
    )
    expect(monthly.points.length).toBe(4)
    const yearly = adminDashboardSessionsGraphResponseSchema.parse(
      (await request("GET", "/admin/dashboard/sessions-graph?range=yearly", { token: adminToken }))
        .body,
    )
    expect(yearly.points.length).toBe(12)
  })

  it("branch-comparison returns rows sorted by best-to-worst average attendance", async () => {
    const adminToken = await loginAsAdmin()
    const response = await request("GET", "/admin/dashboard/branch-comparison", {
      token: adminToken,
    })
    expect(response.statusCode).toBe(200)
    const result = adminDashboardBranchComparisonResponseSchema.parse(response.body)

    for (let i = 1; i < result.branches.length; i += 1) {
      const prev = result.branches[i - 1]?.averageAttendancePercent ?? -1
      const cur = result.branches[i]?.averageAttendancePercent ?? -1
      expect(prev).toBeGreaterThanOrEqual(cur)
    }
    for (const row of result.branches) {
      expect(row.studentCount).toBeGreaterThan(0)
    }
  })

  it("course-leaderboard direction=top returns highest first; bottom returns lowest first", async () => {
    const adminToken = await loginAsAdmin()
    const top = adminDashboardLeaderboardResponseSchema.parse(
      (
        await request("GET", "/admin/dashboard/course-leaderboard?direction=top&limit=5", {
          token: adminToken,
        })
      ).body,
    )
    const bottom = adminDashboardLeaderboardResponseSchema.parse(
      (
        await request("GET", "/admin/dashboard/course-leaderboard?direction=bottom&limit=5", {
          token: adminToken,
        })
      ).body,
    )

    expect(top.direction).toBe("top")
    expect(bottom.direction).toBe("bottom")

    for (let i = 1; i < top.entries.length; i += 1) {
      const prev = top.entries[i - 1]?.averageAttendancePercent ?? 0
      const cur = top.entries[i]?.averageAttendancePercent ?? 0
      expect(prev).toBeGreaterThanOrEqual(cur)
    }
    for (let i = 1; i < bottom.entries.length; i += 1) {
      const prev = bottom.entries[i - 1]?.averageAttendancePercent ?? 0
      const cur = bottom.entries[i]?.averageAttendancePercent ?? 0
      expect(prev).toBeLessThanOrEqual(cur)
    }
  })

  it("course-leaderboard limit param is honoured and bounded", async () => {
    const adminToken = await loginAsAdmin()
    const limited = adminDashboardLeaderboardResponseSchema.parse(
      (
        await request("GET", "/admin/dashboard/course-leaderboard?direction=bottom&limit=2", {
          token: adminToken,
        })
      ).body,
    )
    expect(limited.entries.length).toBeLessThanOrEqual(2)
  })

  it("rejects all dashboard endpoints without an admin token", async () => {
    for (const url of [
      "/admin/dashboard/stats",
      "/admin/dashboard/sessions-graph",
      "/admin/dashboard/branch-comparison",
      "/admin/dashboard/course-leaderboard",
    ]) {
      const response = await request("GET", url)
      expect(response.statusCode).toBe(401)
    }
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
})
