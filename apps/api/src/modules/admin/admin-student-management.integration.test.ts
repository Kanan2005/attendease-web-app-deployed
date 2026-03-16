import {
  adminStudentManagementDetailSchema,
  adminStudentManagementSummariesResponseSchema,
  adminUpdateStudentStatusResponseSchema,
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

describe("Admin student management integration", () => {
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
    database = await createTemporaryDatabase("attendease_admin_students")
    await seedAuthIntegrationData(database.databaseUrl)

    process.env.NODE_ENV = "test"
    process.env.TEST_DATABASE_URL = database.databaseUrl
    process.env.AUTH_ACCESS_TOKEN_SECRET = "attendease-admin-students-secret-1234567890"
    process.env.AUTH_ISSUER = "attendease-api-test"
    process.env.AUTH_AUDIENCE = "attendease-client-test"
    process.env.GOOGLE_OIDC_CLIENT_ID = "admin-students-test-google-client"
    process.env.GOOGLE_OIDC_CLIENT_SECRET = "admin-students-test-google-secret"
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

  it("lists and loads student governance records for admins", async () => {
    await login({
      email: authIntegrationFixtures.studentOne.email,
      password: authIntegrationFixtures.studentOne.password,
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: authIntegrationFixtures.studentOne.device,
    })
    const adminSession = await login({
      email: authIntegrationFixtures.admin.email,
      password: authIntegrationFixtures.admin.password,
      platform: "WEB",
      requestedRole: "ADMIN",
    })

    const listResponse = await request("GET", "/admin/students?query=student.one", {
      token: adminSession.tokens.accessToken,
    })

    expect(listResponse.statusCode).toBe(200)
    const summaries = adminStudentManagementSummariesResponseSchema.parse(listResponse.body)
    expect(summaries).toHaveLength(1)
    expect(summaries[0]?.student.status).toBe("ACTIVE")
    expect(summaries[0]?.enrollmentCounts.totalCount).toBeGreaterThan(0)
    expect(summaries[0]?.actions.canDeactivate).toBe(true)

    const detailResponse = await request(
      "GET",
      `/admin/students/${authIntegrationFixtures.studentOne.userId}`,
      {
        token: adminSession.tokens.accessToken,
      },
    )

    expect(detailResponse.statusCode).toBe(200)
    const detail = adminStudentManagementDetailSchema.parse(detailResponse.body)
    expect(detail.student.programName).toBeTruthy()
    expect(detail.recentClassrooms.length).toBeGreaterThan(0)
    expect(detail.activeBinding?.device.installId).toBe(
      authIntegrationFixtures.studentOne.device.installId,
    )
  })

  it("rejects teacher and student access to admin student-governance endpoints", async () => {
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

    const teacherListResponse = await request("GET", "/admin/students", {
      token: teacherSession.tokens.accessToken,
    })
    const studentListResponse = await request("GET", "/admin/students", {
      token: studentSession.tokens.accessToken,
    })
    const teacherStatusResponse = await request(
      "POST",
      `/admin/students/${authIntegrationFixtures.studentTwo.userId}/status`,
      {
        token: teacherSession.tokens.accessToken,
        payload: {
          nextStatus: "BLOCKED",
          reason: "Teachers must not change student governance state.",
        },
      },
    )

    expect(teacherListResponse.statusCode).toBe(403)
    expect(studentListResponse.statusCode).toBe(403)
    expect(teacherStatusResponse.statusCode).toBe(403)
  })

  it("deactivates a student account, revokes sessions, and blocks later sign-in", async () => {
    const studentSession = await login({
      email: authIntegrationFixtures.studentTwo.email,
      password: authIntegrationFixtures.studentTwo.password,
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: authIntegrationFixtures.studentTwo.device,
    })
    const adminSession = await login({
      email: authIntegrationFixtures.admin.email,
      password: authIntegrationFixtures.admin.password,
      platform: "WEB",
      requestedRole: "ADMIN",
    })

    const response = await request(
      "POST",
      `/admin/students/${authIntegrationFixtures.studentTwo.userId}/status`,
      {
        token: adminSession.tokens.accessToken,
        payload: {
          nextStatus: "BLOCKED",
          reason: "Support verified the student requested a temporary account hold.",
        },
      },
    )

    expect(response.statusCode).toBe(201)
    const result = adminUpdateStudentStatusResponseSchema.parse(response.body)
    expect(result.student.student.status).toBe("BLOCKED")
    expect(result.revokedSessionCount).toBe(1)

    const updatedStudent = await getPrisma().user.findUnique({
      where: {
        id: authIntegrationFixtures.studentTwo.userId,
      },
      select: {
        status: true,
      },
    })
    const revokedSession = await getPrisma().authSession.findUnique({
      where: {
        id: studentSession.user.sessionId,
      },
      select: {
        status: true,
        revokedAt: true,
      },
    })
    const statusChangeAction = await getPrisma().adminActionLog.findFirst({
      where: {
        targetUserId: authIntegrationFixtures.studentTwo.userId,
        actionType: "USER_STATUS_CHANGE",
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    expect(updatedStudent?.status).toBe("BLOCKED")
    expect(revokedSession?.status).toBe("REVOKED")
    expect(revokedSession?.revokedAt).not.toBeNull()
    expect(statusChangeAction?.metadata).toMatchObject({
      previousStatus: "ACTIVE",
      nextStatus: "BLOCKED",
    })

    const blockedLoginResponse = await request("POST", "/auth/login", {
      payload: {
        email: authIntegrationFixtures.studentTwo.email,
        password: authIntegrationFixtures.studentTwo.password,
        platform: "MOBILE",
        requestedRole: "STUDENT",
        device: authIntegrationFixtures.studentTwo.device,
      },
    })

    expect(blockedLoginResponse.statusCode).toBe(403)
  })

  it("archives a student account and keeps the support detail auditable", async () => {
    const studentSession = await login({
      email: authIntegrationFixtures.studentFour.email,
      password: authIntegrationFixtures.studentFour.password,
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: {
        installId: "student-four-archive-check",
        platform: "ANDROID",
        publicKey: "student-four-archive-check-public-key",
      },
    })
    const adminSession = await login({
      email: authIntegrationFixtures.admin.email,
      password: authIntegrationFixtures.admin.password,
      platform: "WEB",
      requestedRole: "ADMIN",
    })

    const response = await request(
      "POST",
      `/admin/students/${authIntegrationFixtures.studentFour.userId}/status`,
      {
        token: adminSession.tokens.accessToken,
        payload: {
          nextStatus: "ARCHIVED",
          reason: "Support archived the student account after governance review.",
        },
      },
    )

    expect(response.statusCode).toBe(201)
    const result = adminUpdateStudentStatusResponseSchema.parse(response.body)
    expect(result.student.student.status).toBe("ARCHIVED")
    expect(result.student.actions.canArchive).toBe(false)
    expect(result.revokedSessionCount).toBe(1)

    const archivedSession = await getPrisma().authSession.findUnique({
      where: {
        id: studentSession.user.sessionId,
      },
      select: {
        status: true,
      },
    })

    expect(archivedSession?.status).toBe("REVOKED")

    const detailResponse = await request(
      "GET",
      `/admin/students/${authIntegrationFixtures.studentFour.userId}`,
      {
        token: adminSession.tokens.accessToken,
      },
    )

    expect(detailResponse.statusCode).toBe(200)
    const detail = adminStudentManagementDetailSchema.parse(detailResponse.body)
    expect(detail.student.status).toBe("ARCHIVED")
    expect(detail.recentClassrooms.length).toBeGreaterThan(0)
    expect(detail.adminActions.some((action) => action.actionType === "USER_STATUS_CHANGE")).toBe(
      true,
    )
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
