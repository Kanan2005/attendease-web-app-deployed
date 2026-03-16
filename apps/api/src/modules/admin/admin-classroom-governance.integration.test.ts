import {
  adminClassroomGovernanceDetailSchema,
  adminClassroomGovernanceResponseSchema,
  attendanceSessionSummarySchema,
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

describe("Admin classroom governance integration", () => {
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
    database = await createTemporaryDatabase("attendease_admin_classrooms")
    await seedAuthIntegrationData(database.databaseUrl)

    process.env.NODE_ENV = "test"
    process.env.TEST_DATABASE_URL = database.databaseUrl
    process.env.AUTH_ACCESS_TOKEN_SECRET = "attendease-admin-classrooms-secret-1234567890"
    process.env.AUTH_ISSUER = "attendease-api-test"
    process.env.AUTH_AUDIENCE = "attendease-client-test"
    process.env.GOOGLE_OIDC_CLIENT_ID = "admin-classrooms-test-google-client"
    process.env.GOOGLE_OIDC_CLIENT_SECRET = "admin-classrooms-test-google-secret"
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

  it("lists searchable classroom governance summaries and detail for admins", async () => {
    const adminSession = await login({
      email: authIntegrationFixtures.admin.email,
      password: authIntegrationFixtures.admin.password,
      platform: "WEB",
      requestedRole: "ADMIN",
    })

    const listResponse = await request(
      "GET",
      "/admin/classrooms?query=maths&status=ACTIVE&limit=5",
      {
        token: adminSession.tokens.accessToken,
      },
    )

    expect(listResponse.statusCode).toBe(200)
    const list = adminClassroomGovernanceResponseSchema.parse(listResponse.body)
    expect(list).toHaveLength(1)
    expect(list[0]?.id).toBe(developmentSeedIds.courseOfferings.math)
    expect(list[0]?.governance.activeStudentCount).toBe(4)
    expect(list[0]?.governance.attendanceSessionCount).toBe(1)
    expect(list[0]?.governance.historyPreservedNote).toContain("attendance sessions")

    const detailResponse = await request(
      "GET",
      `/admin/classrooms/${developmentSeedIds.courseOfferings.math}`,
      {
        token: adminSession.tokens.accessToken,
      },
    )

    expect(detailResponse.statusCode).toBe(200)
    const detail = adminClassroomGovernanceDetailSchema.parse(detailResponse.body)
    expect(detail.classroomTitle).toContain("Mathematics")
    expect(detail.primaryTeacherDisplayName).toBe("Prof. Anurag Agarwal")
    expect(detail.governance.attendanceSessionCount).toBe(1)
    expect(detail.governance.presentRecordCount).toBe(3)
    expect(detail.governance.absentRecordCount).toBe(1)
    expect(detail.governance.canArchiveNow).toBe(true)
  })

  it("archives a classroom with an admin reason and keeps attendance history intact", async () => {
    const adminSession = await login({
      email: authIntegrationFixtures.admin.email,
      password: authIntegrationFixtures.admin.password,
      platform: "WEB",
      requestedRole: "ADMIN",
    })

    const beforeSessionCount = await getPrisma().attendanceSession.count({
      where: {
        courseOfferingId: developmentSeedIds.courseOfferings.math,
      },
    })
    const beforeRecordCount = await getPrisma().attendanceRecord.count({
      where: {
        sessionId: developmentSeedIds.sessions.mathCompleted,
      },
    })

    const archiveResponse = await request(
      "POST",
      `/admin/classrooms/${developmentSeedIds.courseOfferings.math}/archive`,
      {
        token: adminSession.tokens.accessToken,
        payload: {
          reason: "Registrar closed the classroom after the term wrap-up review.",
        },
      },
    )

    expect(archiveResponse.statusCode).toBe(201)
    const archived = adminClassroomGovernanceDetailSchema.parse(archiveResponse.body)
    expect(archived.status).toBe("ARCHIVED")
    expect(archived.governance.canArchiveNow).toBe(false)
    expect(archived.governance.historyPreservedNote).toContain("audit records")

    const afterSessionCount = await getPrisma().attendanceSession.count({
      where: {
        courseOfferingId: developmentSeedIds.courseOfferings.math,
      },
    })
    const afterRecordCount = await getPrisma().attendanceRecord.count({
      where: {
        sessionId: developmentSeedIds.sessions.mathCompleted,
      },
    })
    const archivedJoinCodes = await getPrisma().classroomJoinCode.findMany({
      where: {
        courseOfferingId: developmentSeedIds.courseOfferings.math,
      },
      orderBy: {
        createdAt: "desc",
      },
    })
    const adminAction = await getPrisma().adminActionLog.findFirst({
      where: {
        adminUserId: authIntegrationFixtures.admin.userId,
        targetCourseOfferingId: developmentSeedIds.courseOfferings.math,
        actionType: "CLASSROOM_ARCHIVE",
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    expect(afterSessionCount).toBe(beforeSessionCount)
    expect(afterRecordCount).toBe(beforeRecordCount)
    expect(archivedJoinCodes.some((code) => code.status === "REVOKED")).toBe(true)
    expect(adminAction?.metadata).toMatchObject({
      classroomId: developmentSeedIds.courseOfferings.math,
      reason: "Registrar closed the classroom after the term wrap-up review.",
    })
  })

  it("blocks admin archive while a live attendance session is still active", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })
    const adminSession = await login({
      email: authIntegrationFixtures.admin.email,
      password: authIntegrationFixtures.admin.password,
      platform: "WEB",
      requestedRole: "ADMIN",
    })

    const sessionResponse = await request("POST", "/sessions/qr", {
      token: teacherSession.tokens.accessToken,
      payload: {
        classroomId: developmentSeedIds.courseOfferings.physics,
        sessionDurationMinutes: 30,
        anchorLatitude: 12.9716,
        anchorLongitude: 77.5946,
        anchorLabel: "Room 101",
      },
    })

    expect(sessionResponse.statusCode).toBe(201)
    const activeSession = attendanceSessionSummarySchema.parse(sessionResponse.body)
    expect(activeSession.status).toBe("ACTIVE")

    const archiveResponse = await request(
      "POST",
      `/admin/classrooms/${developmentSeedIds.courseOfferings.physics}/archive`,
      {
        token: adminSession.tokens.accessToken,
        payload: {
          reason: "Archive should stop until the live session is closed.",
        },
      },
    )

    expect(archiveResponse.statusCode).toBe(400)
    expect(archiveResponse.body).toMatchObject({
      message: expect.stringContaining("End the live attendance session"),
    })
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
    if (!prisma) {
      throw new Error("Prisma client is not initialized.")
    }

    return prisma
  }
})
