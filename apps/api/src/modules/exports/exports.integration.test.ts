import { hashPassword } from "@attendease/auth/password"
import {
  authSessionResponseSchema,
  exportJobDetailSchema,
  exportJobsResponseSchema,
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
import { ExportStorageService } from "./export-storage.service.js"

describe("Exports integration", () => {
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
  const exportStorageService = {
    getDownloadUrl: vi.fn(
      async (objectKey: string) => `https://downloads.attendease.dev/${objectKey}`,
    ),
  }

  beforeAll(async () => {
    database = await createTemporaryDatabase("attendease_exports")
    await seedAuthIntegrationData(database.databaseUrl)

    process.env.NODE_ENV = "test"
    process.env.TEST_DATABASE_URL = database.databaseUrl
    process.env.AUTH_ACCESS_TOKEN_SECRET = "attendease-exports-secret-1234567890"
    process.env.AUTH_ISSUER = "attendease-api-test"
    process.env.AUTH_AUDIENCE = "attendease-client-test"
    process.env.GOOGLE_OIDC_CLIENT_ID = "exports-google-client"
    process.env.GOOGLE_OIDC_CLIENT_SECRET = "exports-google-secret"
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
      .overrideProvider(ExportStorageService)
      .useValue(exportStorageService)
      .compile()

    app = testingModule.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    await app.init()
    await app.getHttpAdapter().getInstance().ready()

    await seedForeignTeacher()
  })

  beforeEach(() => {
    vi.clearAllMocks()
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

  it("creates export jobs and returns signed download URLs for ready files", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })

    const createResponse = await request("POST", "/exports", {
      token: teacherSession.tokens.accessToken,
      payload: {
        jobType: "SESSION_CSV",
        sessionId: developmentSeedIds.sessions.mathCompleted,
      },
    })

    expect(createResponse.statusCode).toBe(201)
    const created = exportJobDetailSchema.parse(createResponse.body)
    expect(created.status).toBe("QUEUED")
    expect(created.files).toEqual([])

    await getPrisma().exportJob.update({
      where: {
        id: created.id,
      },
      data: {
        status: "COMPLETED",
        startedAt: new Date("2026-03-15T09:00:03.000Z"),
        completedAt: new Date("2026-03-15T09:00:08.000Z"),
        files: {
          create: {
            objectKey: `exports/${created.id}/session.csv`,
            fileName: "session.csv",
            mimeType: "text/csv",
            status: "READY",
            sizeBytes: 2048,
            checksumSha256: "checksum-value",
            readyAt: new Date("2026-03-15T09:00:08.000Z"),
            expiresAt: new Date("2027-03-15T09:00:08.000Z"),
          },
        },
      },
    })

    const [listResponse, detailResponse] = await Promise.all([
      request("GET", "/exports?status=COMPLETED", {
        token: teacherSession.tokens.accessToken,
      }),
      request("GET", `/exports/${created.id}`, {
        token: teacherSession.tokens.accessToken,
      }),
    ])

    expect(listResponse.statusCode).toBe(200)
    expect(detailResponse.statusCode).toBe(200)

    const list = exportJobsResponseSchema.parse(listResponse.body)
    const detail = exportJobDetailSchema.parse(detailResponse.body)

    expect(list[0]).toMatchObject({
      id: created.id,
      readyFileCount: 1,
      totalFileCount: 1,
      latestReadyDownloadUrl: `https://downloads.attendease.dev/exports/${created.id}/session.csv`,
    })
    expect(detail.files[0]).toMatchObject({
      fileName: "session.csv",
      status: "READY",
      downloadUrl: `https://downloads.attendease.dev/exports/${created.id}/session.csv`,
    })
    expect(exportStorageService.getDownloadUrl).toHaveBeenCalled()
  })

  it("hides signed download URLs for files that are past their retention window", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })

    const createResponse = await request("POST", "/exports", {
      token: teacherSession.tokens.accessToken,
      payload: {
        jobType: "SESSION_PDF",
        sessionId: developmentSeedIds.sessions.mathCompleted,
      },
    })

    expect(createResponse.statusCode).toBe(201)
    const created = exportJobDetailSchema.parse(createResponse.body)

    await getPrisma().exportJob.update({
      where: {
        id: created.id,
      },
      data: {
        status: "COMPLETED",
        startedAt: new Date("2026-03-10T09:00:03.000Z"),
        completedAt: new Date("2026-03-10T09:00:08.000Z"),
        files: {
          create: {
            objectKey: `exports/${created.id}/session.pdf`,
            fileName: "session.pdf",
            mimeType: "application/pdf",
            status: "READY",
            sizeBytes: 4096,
            checksumSha256: "expired-checksum",
            readyAt: new Date("2026-03-10T09:00:08.000Z"),
            expiresAt: new Date("2026-03-11T09:00:08.000Z"),
          },
        },
      },
    })

    const [listResponse, detailResponse] = await Promise.all([
      request("GET", "/exports?status=COMPLETED", {
        token: teacherSession.tokens.accessToken,
      }),
      request("GET", `/exports/${created.id}`, {
        token: teacherSession.tokens.accessToken,
      }),
    ])

    expect(listResponse.statusCode).toBe(200)
    expect(detailResponse.statusCode).toBe(200)

    const list = exportJobsResponseSchema.parse(listResponse.body)
    const detail = exportJobDetailSchema.parse(detailResponse.body)
    const expiredJob = list.find((job) => job.id === created.id)

    expect(expiredJob).toMatchObject({
      id: created.id,
      readyFileCount: 0,
      totalFileCount: 1,
      latestReadyDownloadUrl: null,
    })
    expect(detail.files[0]).toMatchObject({
      fileName: "session.pdf",
      status: "EXPIRED",
      downloadUrl: null,
    })
    expect(exportStorageService.getDownloadUrl).not.toHaveBeenCalledWith(
      `exports/${created.id}/session.pdf`,
    )
  })

  it("filters export job lists by lifecycle status and job type", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })

    const [failedJob, processingJob, queuedJob] = await Promise.all([
      getPrisma().exportJob.create({
        data: {
          requestedByUserId: authIntegrationFixtures.teacher.userId,
          courseOfferingId: developmentSeedIds.courseOfferings.math,
          jobType: "COMPREHENSIVE_CSV",
          status: "FAILED",
          requestedAt: new Date("2026-03-15T09:00:00.000Z"),
          startedAt: new Date("2026-03-15T09:00:02.000Z"),
          failedAt: new Date("2026-03-15T09:00:04.000Z"),
          errorMessage: "Storage unavailable",
          filterSnapshot: {
            jobType: "COMPREHENSIVE_CSV",
            filters: {
              classroomId: developmentSeedIds.courseOfferings.math,
            },
          },
        },
      }),
      getPrisma().exportJob.create({
        data: {
          requestedByUserId: authIntegrationFixtures.teacher.userId,
          courseOfferingId: developmentSeedIds.courseOfferings.math,
          jobType: "SESSION_CSV",
          status: "PROCESSING",
          requestedAt: new Date("2026-03-15T09:10:00.000Z"),
          startedAt: new Date("2026-03-15T09:10:02.000Z"),
          filterSnapshot: {
            jobType: "SESSION_CSV",
            sessionId: developmentSeedIds.sessions.mathCompleted,
          },
        },
      }),
      getPrisma().exportJob.create({
        data: {
          requestedByUserId: authIntegrationFixtures.teacher.userId,
          courseOfferingId: developmentSeedIds.courseOfferings.math,
          jobType: "SESSION_PDF",
          status: "QUEUED",
          requestedAt: new Date("2026-03-15T09:20:00.000Z"),
          filterSnapshot: {
            jobType: "SESSION_PDF",
            sessionId: developmentSeedIds.sessions.mathCompleted,
          },
        },
      }),
    ])

    const response = await request("GET", "/exports?status=FAILED&jobType=COMPREHENSIVE_CSV", {
      token: teacherSession.tokens.accessToken,
    })

    expect(response.statusCode).toBe(200)

    const rows = exportJobsResponseSchema.parse(response.body)

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      id: failedJob.id,
      status: "FAILED",
      jobType: "COMPREHENSIVE_CSV",
      errorMessage: "Storage unavailable",
    })
    expect(rows.some((row) => row.id === processingJob.id)).toBe(false)
    expect(rows.some((row) => row.id === queuedJob.id)).toBe(false)
  })

  it("blocks students from export routes", async () => {
    const studentSession = await login({
      email: authIntegrationFixtures.studentOne.email,
      password: authIntegrationFixtures.studentOne.password,
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: authIntegrationFixtures.studentOne.device,
    })

    const response = await request("GET", "/exports", {
      token: studentSession.tokens.accessToken,
    })

    expect(response.statusCode).toBe(403)
  })

  it("blocks foreign teachers from exporting attendance outside their classroom scope", async () => {
    const foreignTeacherSession = await login({
      email: "foreign.teacher@attendease.dev",
      password: "ForeignTeacherPass123!",
      platform: "WEB",
      requestedRole: "TEACHER",
    })

    const response = await request("POST", "/exports", {
      token: foreignTeacherSession.tokens.accessToken,
      payload: {
        jobType: "SESSION_PDF",
        sessionId: developmentSeedIds.sessions.mathCompleted,
      },
    })

    expect(response.statusCode).toBe(403)
    expect(response.body).toMatchObject({
      message: "The teacher cannot export that attendance session.",
    })
  })

  function getPrisma() {
    if (!prisma) {
      throw new Error("Prisma client is not initialized.")
    }

    return prisma
  }

  async function seedForeignTeacher() {
    const passwordHash = await hashPassword("ForeignTeacherPass123!")

    await getPrisma().user.upsert({
      where: {
        email: "foreign.teacher@attendease.dev",
      },
      update: {
        displayName: "Foreign Teacher",
        status: "ACTIVE",
      },
      create: {
        id: "seed_user_teacher_foreign",
        email: "foreign.teacher@attendease.dev",
        displayName: "Foreign Teacher",
        status: "ACTIVE",
      },
    })

    await getPrisma().userRole.upsert({
      where: {
        userId_role: {
          userId: "seed_user_teacher_foreign",
          role: "TEACHER",
        },
      },
      update: {},
      create: {
        userId: "seed_user_teacher_foreign",
        role: "TEACHER",
      },
    })

    await getPrisma().userCredential.upsert({
      where: {
        userId: "seed_user_teacher_foreign",
      },
      update: {
        passwordHash,
      },
      create: {
        userId: "seed_user_teacher_foreign",
        passwordHash,
      },
    })
  }

  async function login(input: {
    email: string
    password: string
    platform: "WEB" | "MOBILE"
    requestedRole: "ADMIN" | "TEACHER" | "STUDENT"
    device?: {
      installId: string
      platform: "ANDROID" | "IOS"
      publicKey: string
      deviceModel?: string | null
      osVersion?: string | null
      appVersion?: string | null
    }
  }) {
    const response = await request("POST", "/auth/login", {
      payload: input,
    })

    expect(response.statusCode).toBe(201)
    return authSessionResponseSchema.parse(response.body)
  }

  async function request(
    method: "GET" | "POST",
    path: string,
    options: {
      token?: string
      payload?: unknown
      headers?: Record<string, string>
    },
  ) {
    if (!app) {
      throw new Error("Nest application is not initialized.")
    }

    const response = await app.inject({
      method,
      url: path,
      headers: {
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
        ...(options.headers ?? {}),
      },
      ...(options.payload !== undefined
        ? {
            payload: options.payload as Record<string, unknown> | string | Buffer,
          }
        : {}),
    })

    return {
      statusCode: response.statusCode,
      body: response.json(),
    }
  }
})
