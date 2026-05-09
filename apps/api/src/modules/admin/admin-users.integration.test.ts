import {
  adminUsersStudentListResponseSchema,
  adminUsersStudentProfileSchema,
  adminUsersTeacherListResponseSchema,
  adminUsersTeacherProfileSchema,
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

describe("Admin users integration", () => {
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
    database = await createTemporaryDatabase("attendease_admin_users")
    await seedAuthIntegrationData(database.databaseUrl)

    process.env.NODE_ENV = "test"
    process.env.TEST_DATABASE_URL = database.databaseUrl
    process.env.AUTH_ACCESS_TOKEN_SECRET = "attendease-admin-users-secret-1234567890"
    process.env.AUTH_ISSUER = "attendease-api-test"
    process.env.AUTH_AUDIENCE = "attendease-client-test"
    process.env.GOOGLE_OIDC_CLIENT_ID = "admin-users-test-google-client"
    process.env.GOOGLE_OIDC_CLIENT_SECRET = "admin-users-test-google-secret"
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

  it("lists students with branch filter and surfaces attendance aggregates", async () => {
    const adminToken = await loginAsAdmin()

    const allResponse = await request("GET", "/admin/users/students?limit=50", {
      token: adminToken,
    })
    expect(allResponse.statusCode).toBe(200)
    const allList = adminUsersStudentListResponseSchema.parse(allResponse.body)
    expect(allList.students.length).toBeGreaterThanOrEqual(4)
    expect(allList.lowAttendanceThresholdPercent).toBe(75)

    const branchResponse = await request(
      "GET",
      `/admin/users/students?branch=${encodeURIComponent("Computer Science")}&limit=50`,
      { token: adminToken },
    )
    expect(branchResponse.statusCode).toBe(200)
    const branchList = adminUsersStudentListResponseSchema.parse(branchResponse.body)
    for (const student of branchList.students) {
      expect(student.branch).toBe("Computer Science")
    }
  })

  it("returns a student profile with overall and per-course attendance", async () => {
    const adminToken = await loginAsAdmin()
    const response = await request(
      "GET",
      `/admin/users/students/${developmentSeedIds.users.studentOne}`,
      { token: adminToken },
    )
    expect(response.statusCode).toBe(200)
    const profile = adminUsersStudentProfileSchema.parse(response.body)
    expect(profile.studentId).toBe(developmentSeedIds.users.studentOne)
    expect(profile.attendanceDisabled).toBe(false)
    expect(profile.courses.length).toBeGreaterThanOrEqual(1)
    expect(profile.overallTotalSessions).toBeGreaterThanOrEqual(0)
  })

  it("disables and re-enables student attendance with audit log", async () => {
    const adminToken = await loginAsAdmin()
    const studentId = developmentSeedIds.users.studentTwo

    const disableResponse = await request(
      "POST",
      `/admin/users/students/${studentId}/attendance-disable`,
      { token: adminToken, payload: { reason: "Testing disable flow" } },
    )
    expect(disableResponse.statusCode).toBe(201)
    const disabled = adminUsersStudentProfileSchema.parse(disableResponse.body)
    expect(disabled.attendanceDisabled).toBe(true)

    const disableLogs = await getPrisma().adminActionLog.findMany({
      where: { targetUserId: studentId, actionType: "STUDENT_ATTENDANCE_DISABLE" },
    })
    expect(disableLogs).toHaveLength(1)

    // Idempotent re-disable should not duplicate log.
    const disableAgain = await request(
      "POST",
      `/admin/users/students/${studentId}/attendance-disable`,
      { token: adminToken, payload: { reason: "Repeat" } },
    )
    expect(disableAgain.statusCode).toBe(201)
    const stillDisabledLogs = await getPrisma().adminActionLog.findMany({
      where: { targetUserId: studentId, actionType: "STUDENT_ATTENDANCE_DISABLE" },
    })
    expect(stillDisabledLogs).toHaveLength(1)

    const enableResponse = await request(
      "POST",
      `/admin/users/students/${studentId}/attendance-enable`,
      { token: adminToken, payload: { reason: "Reopening" } },
    )
    expect(enableResponse.statusCode).toBe(201)
    const enabled = adminUsersStudentProfileSchema.parse(enableResponse.body)
    expect(enabled.attendanceDisabled).toBe(false)

    const enableLogs = await getPrisma().adminActionLog.findMany({
      where: { targetUserId: studentId, actionType: "STUDENT_ATTENDANCE_ENABLE" },
    })
    expect(enableLogs).toHaveLength(1)
  })

  it("lists teachers with department filter and returns profile with courses", async () => {
    const adminToken = await loginAsAdmin()

    const listResponse = await request(
      "GET",
      `/admin/users/teachers?department=${encodeURIComponent("Computer Science")}&limit=50`,
      { token: adminToken },
    )
    expect(listResponse.statusCode).toBe(200)
    const list = adminUsersTeacherListResponseSchema.parse(listResponse.body)
    expect(list.teachers.length).toBeGreaterThanOrEqual(1)
    const teacher = list.teachers.find((t) => t.teacherId === developmentSeedIds.users.teacher)
    expect(teacher).toBeDefined()
    expect(teacher?.department).toBe("Computer Science")
    expect(teacher?.courseCount).toBeGreaterThanOrEqual(2)

    const profileResponse = await request(
      "GET",
      `/admin/users/teachers/${developmentSeedIds.users.teacher}`,
      { token: adminToken },
    )
    expect(profileResponse.statusCode).toBe(200)
    const profile = adminUsersTeacherProfileSchema.parse(profileResponse.body)
    expect(profile.teacherId).toBe(developmentSeedIds.users.teacher)
    expect(profile.courses.length).toBeGreaterThanOrEqual(2)
  })

  it("rejects users access without an admin token", async () => {
    const response = await request("GET", "/admin/users/students")
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
