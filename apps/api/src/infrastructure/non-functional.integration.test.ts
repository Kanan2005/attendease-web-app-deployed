import { buildTrustedDeviceHeaders } from "@attendease/auth"
import {
  attendanceSessionSummarySchema,
  authSessionResponseSchema,
  queueHealthResponseSchema,
  readinessCheckResponseSchema,
} from "@attendease/contracts"
import { createPrismaClient, developmentSeedIds, disconnectPrismaClient } from "@attendease/db"
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify"
import { Test } from "@nestjs/testing"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { AppModule } from "../app.module.js"
import {
  type TemporaryDatabase,
  authIntegrationFixtures,
  createTemporaryDatabase,
  destroyTemporaryDatabase,
  seedAuthIntegrationData,
} from "../test/integration-helpers.js"

describe("Non-functional integration", () => {
  const originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
    AUTH_ACCESS_TOKEN_SECRET: process.env.AUTH_ACCESS_TOKEN_SECRET,
    AUTH_ISSUER: process.env.AUTH_ISSUER,
    AUTH_AUDIENCE: process.env.AUTH_AUDIENCE,
    GOOGLE_TEACHER_ALLOWED_DOMAINS: process.env.GOOGLE_TEACHER_ALLOWED_DOMAINS,
    GOOGLE_STUDENT_ALLOWED_DOMAINS: process.env.GOOGLE_STUDENT_ALLOWED_DOMAINS,
    REQUEST_ID_HEADER: process.env.REQUEST_ID_HEADER,
    AUTH_RATE_LIMIT_MAX: process.env.AUTH_RATE_LIMIT_MAX,
    AUTH_RATE_LIMIT_WINDOW_SECONDS: process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS,
    RATE_LIMIT_STORE_MODE: process.env.RATE_LIMIT_STORE_MODE,
    RATE_LIMIT_ENABLED: process.env.RATE_LIMIT_ENABLED,
    FEATURE_BLUETOOTH_ATTENDANCE_ENABLED: process.env.FEATURE_BLUETOOTH_ATTENDANCE_ENABLED,
    FEATURE_EMAIL_AUTOMATION_ENABLED: process.env.FEATURE_EMAIL_AUTOMATION_ENABLED,
    FEATURE_STRICT_DEVICE_BINDING_MODE: process.env.FEATURE_STRICT_DEVICE_BINDING_MODE,
    EXPORT_JOB_BATCH_SIZE: process.env.EXPORT_JOB_BATCH_SIZE,
    ROSTER_IMPORT_BATCH_SIZE: process.env.ROSTER_IMPORT_BATCH_SIZE,
    ANNOUNCEMENT_FANOUT_BATCH_SIZE: process.env.ANNOUNCEMENT_FANOUT_BATCH_SIZE,
    ANALYTICS_REFRESH_BATCH_SIZE: process.env.ANALYTICS_REFRESH_BATCH_SIZE,
    EMAIL_AUTOMATION_PROCESS_BATCH_SIZE: process.env.EMAIL_AUTOMATION_PROCESS_BATCH_SIZE,
    EXPORT_JOB_STUCK_TIMEOUT_MS: process.env.EXPORT_JOB_STUCK_TIMEOUT_MS,
    ROSTER_IMPORT_STUCK_TIMEOUT_MS: process.env.ROSTER_IMPORT_STUCK_TIMEOUT_MS,
    OUTBOX_STUCK_TIMEOUT_MS: process.env.OUTBOX_STUCK_TIMEOUT_MS,
    EMAIL_AUTOMATION_STUCK_DISPATCH_TIMEOUT_MS:
      process.env.EMAIL_AUTOMATION_STUCK_DISPATCH_TIMEOUT_MS,
  }

  let database: TemporaryDatabase | null = null
  let app: NestFastifyApplication | null = null
  let prisma: ReturnType<typeof createPrismaClient> | null = null

  beforeAll(async () => {
    database = await createTemporaryDatabase("attendease_non_functional")
    await seedAuthIntegrationData(database.databaseUrl)

    process.env.NODE_ENV = "test"
    process.env.TEST_DATABASE_URL = database.databaseUrl
    process.env.AUTH_ACCESS_TOKEN_SECRET = "attendease-non-functional-secret-1234567890"
    process.env.AUTH_ISSUER = "attendease-api-test"
    process.env.AUTH_AUDIENCE = "attendease-client-test"
    process.env.GOOGLE_TEACHER_ALLOWED_DOMAINS = "attendease.dev"
    process.env.GOOGLE_STUDENT_ALLOWED_DOMAINS = "attendease.dev"
    process.env.REQUEST_ID_HEADER = "x-request-id"
    process.env.AUTH_RATE_LIMIT_MAX = "2"
    process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS = "60"
    process.env.RATE_LIMIT_STORE_MODE = "memory"
    process.env.RATE_LIMIT_ENABLED = "true"
    process.env.FEATURE_BLUETOOTH_ATTENDANCE_ENABLED = "true"
    process.env.FEATURE_EMAIL_AUTOMATION_ENABLED = "true"
    process.env.FEATURE_STRICT_DEVICE_BINDING_MODE = "ENFORCE"
    process.env.EXPORT_JOB_BATCH_SIZE = "2"
    process.env.ROSTER_IMPORT_BATCH_SIZE = "2"
    process.env.ANNOUNCEMENT_FANOUT_BATCH_SIZE = "2"
    process.env.ANALYTICS_REFRESH_BATCH_SIZE = "2"
    process.env.EMAIL_AUTOMATION_PROCESS_BATCH_SIZE = "2"
    process.env.EXPORT_JOB_STUCK_TIMEOUT_MS = "600000"
    process.env.ROSTER_IMPORT_STUCK_TIMEOUT_MS = "600000"
    process.env.OUTBOX_STUCK_TIMEOUT_MS = "600000"
    process.env.EMAIL_AUTOMATION_STUCK_DISPATCH_TIMEOUT_MS = "600000"

    prisma = createPrismaClient({
      databaseUrl: database.databaseUrl,
      singleton: false,
    })

    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

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
    process.env.GOOGLE_TEACHER_ALLOWED_DOMAINS = originalEnv.GOOGLE_TEACHER_ALLOWED_DOMAINS
    process.env.GOOGLE_STUDENT_ALLOWED_DOMAINS = originalEnv.GOOGLE_STUDENT_ALLOWED_DOMAINS
    process.env.REQUEST_ID_HEADER = originalEnv.REQUEST_ID_HEADER
    process.env.AUTH_RATE_LIMIT_MAX = originalEnv.AUTH_RATE_LIMIT_MAX
    process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS = originalEnv.AUTH_RATE_LIMIT_WINDOW_SECONDS
    process.env.RATE_LIMIT_STORE_MODE = originalEnv.RATE_LIMIT_STORE_MODE
    process.env.RATE_LIMIT_ENABLED = originalEnv.RATE_LIMIT_ENABLED
    process.env.FEATURE_BLUETOOTH_ATTENDANCE_ENABLED =
      originalEnv.FEATURE_BLUETOOTH_ATTENDANCE_ENABLED
    process.env.FEATURE_EMAIL_AUTOMATION_ENABLED = originalEnv.FEATURE_EMAIL_AUTOMATION_ENABLED
    process.env.FEATURE_STRICT_DEVICE_BINDING_MODE = originalEnv.FEATURE_STRICT_DEVICE_BINDING_MODE
    process.env.EXPORT_JOB_BATCH_SIZE = originalEnv.EXPORT_JOB_BATCH_SIZE
    process.env.ROSTER_IMPORT_BATCH_SIZE = originalEnv.ROSTER_IMPORT_BATCH_SIZE
    process.env.ANNOUNCEMENT_FANOUT_BATCH_SIZE = originalEnv.ANNOUNCEMENT_FANOUT_BATCH_SIZE
    process.env.ANALYTICS_REFRESH_BATCH_SIZE = originalEnv.ANALYTICS_REFRESH_BATCH_SIZE
    process.env.EMAIL_AUTOMATION_PROCESS_BATCH_SIZE =
      originalEnv.EMAIL_AUTOMATION_PROCESS_BATCH_SIZE
    process.env.EXPORT_JOB_STUCK_TIMEOUT_MS = originalEnv.EXPORT_JOB_STUCK_TIMEOUT_MS
    process.env.ROSTER_IMPORT_STUCK_TIMEOUT_MS = originalEnv.ROSTER_IMPORT_STUCK_TIMEOUT_MS
    process.env.OUTBOX_STUCK_TIMEOUT_MS = originalEnv.OUTBOX_STUCK_TIMEOUT_MS
    process.env.EMAIL_AUTOMATION_STUCK_DISPATCH_TIMEOUT_MS =
      originalEnv.EMAIL_AUTOMATION_STUCK_DISPATCH_TIMEOUT_MS

    if (database) {
      await destroyTemporaryDatabase(database)
    }
  })

  it("propagates request ids through validation errors", async () => {
    const response = await request("POST", "/auth/login", {
      headers: {
        "x-request-id": "req_non_functional_1",
      },
      payload: {
        platform: "WEB",
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.headers["x-request-id"]).toBe("req_non_functional_1")
    expect(response.body).toMatchObject({
      requestId: "req_non_functional_1",
      message: "Invalid request payload.",
    })
  })

  it("rate limits repeated auth attempts", async () => {
    const payload = {
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    }

    const firstResponse = await request("POST", "/auth/login", {
      headers: {
        "x-forwarded-for": "203.0.113.10",
      },
      payload,
    })
    const secondResponse = await request("POST", "/auth/login", {
      headers: {
        "x-forwarded-for": "203.0.113.10",
      },
      payload,
    })
    const thirdResponse = await request("POST", "/auth/login", {
      headers: {
        "x-forwarded-for": "203.0.113.10",
      },
      payload,
    })

    expect(firstResponse.statusCode).toBe(201)
    expect(authSessionResponseSchema.parse(firstResponse.body).user.activeRole).toBe("TEACHER")
    expect(secondResponse.statusCode).toBe(201)
    expect(thirdResponse.statusCode).toBe(429)
    expect(thirdResponse.body).toMatchObject({
      message: "Too many requests. Please try again shortly.",
    })
  })

  it("returns ready readiness state with database and feature checks", async () => {
    const response = await request("GET", "/health/ready", {})

    expect(response.statusCode).toBe(200)

    const readiness = readinessCheckResponseSchema.parse(response.body)
    expect(readiness.status).toBe("ready")
    expect(readiness.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "database",
          status: "up",
        }),
        expect.objectContaining({
          name: "feature-flags",
          status: "up",
        }),
      ]),
    )
  })

  it("reports queued, failed, and stale queue workloads", async () => {
    const client = getPrisma()
    const staleStartedAt = new Date("2026-03-14T00:00:00.000Z")
    const staleLockedAt = new Date("2026-03-14T00:00:00.000Z")

    await Promise.all([
      client.exportJob.create({
        data: {
          requestedByUserId: developmentSeedIds.users.teacher,
          courseOfferingId: developmentSeedIds.courseOfferings.math,
          jobType: "SESSION_CSV",
          status: "QUEUED",
        },
      }),
      client.rosterImportJob.create({
        data: {
          courseOfferingId: developmentSeedIds.courseOfferings.physics,
          requestedByUserId: developmentSeedIds.users.teacher,
          sourceFileKey: "inline://imports/stale.csv",
          sourceFileName: "stale.csv",
          status: "PROCESSING",
          startedAt: staleStartedAt,
        },
      }),
      client.outboxEvent.create({
        data: {
          topic: "classroom.announcement.posted",
          aggregateType: "announcement_post",
          aggregateId: "queue_health_announcement",
          payload: {
            announcementId: "queue_health_announcement",
          },
          status: "PROCESSING",
          lockedAt: staleLockedAt,
        },
      }),
      client.outboxEvent.create({
        data: {
          topic: "attendance.session.edited",
          aggregateType: "attendance_session",
          aggregateId: developmentSeedIds.sessions.mathCompleted,
          payload: {
            sessionId: developmentSeedIds.sessions.mathCompleted,
          },
          status: "FAILED",
        },
      }),
      client.emailDispatchRun.create({
        data: {
          ruleId: developmentSeedIds.emailAutomation.rule,
          requestedByUserId: developmentSeedIds.users.teacher,
          triggerType: "MANUAL",
          dispatchDate: new Date("2026-03-15T00:00:00.000Z"),
          status: "FAILED",
          failedAt: new Date("2026-03-15T09:00:00.000Z"),
          errorMessage: "SES timeout",
        },
      }),
    ])

    const response = await request("GET", "/health/queues", {})

    expect(response.statusCode).toBe(200)

    const queueHealth = queueHealthResponseSchema.parse(response.body)
    expect(queueHealth.status).toBe("degraded")
    expect(queueHealth.queues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "exports",
          queuedCount: 1,
        }),
        expect.objectContaining({
          name: "roster-imports",
          staleCount: 1,
          status: "stalled",
        }),
        expect.objectContaining({
          name: "announcement-fanout",
          staleCount: 1,
          status: "stalled",
        }),
        expect.objectContaining({
          name: "analytics-refresh",
          failedCount: 1,
        }),
        expect.objectContaining({
          name: "email-dispatch",
          failedCount: 1,
        }),
      ]),
    )
  })

  it("returns service unavailable when Bluetooth rollout is disabled", async () => {
    await withIsolatedApp(
      {
        FEATURE_BLUETOOTH_ATTENDANCE_ENABLED: "false",
      },
      async (isolatedApp) => {
        const loginResponse = await requestAgainst(isolatedApp, "POST", "/auth/login", {
          payload: {
            email: authIntegrationFixtures.teacher.email,
            password: authIntegrationFixtures.teacher.password,
            platform: "MOBILE",
            requestedRole: "TEACHER",
          },
        })
        const teacherSession = authSessionResponseSchema.parse(loginResponse.body)

        const response = await requestAgainst(isolatedApp, "POST", "/sessions/bluetooth", {
          headers: {
            authorization: `Bearer ${teacherSession.tokens.accessToken}`,
          },
          payload: {
            classroomId: developmentSeedIds.courseOfferings.math,
            sessionDurationMinutes: 15,
          },
        })

        expect(response.statusCode).toBe(503)
        expect(response.body).toMatchObject({
          statusCode: 503,
          message: "Bluetooth attendance is disabled by the current rollout configuration.",
        })
      },
    )
  })

  it("returns service unavailable when email automation rollout is disabled", async () => {
    await withIsolatedApp(
      {
        FEATURE_EMAIL_AUTOMATION_ENABLED: "false",
      },
      async (isolatedApp) => {
        const loginResponse = await requestAgainst(isolatedApp, "POST", "/auth/login", {
          payload: {
            email: authIntegrationFixtures.teacher.email,
            password: authIntegrationFixtures.teacher.password,
            platform: "WEB",
            requestedRole: "TEACHER",
          },
        })
        const teacherSession = authSessionResponseSchema.parse(loginResponse.body)

        const response = await requestAgainst(isolatedApp, "GET", "/automation/email/rules", {
          headers: {
            authorization: `Bearer ${teacherSession.tokens.accessToken}`,
          },
        })

        expect(response.statusCode).toBe(503)
        expect(response.body).toMatchObject({
          statusCode: 503,
          message: "Email automation is disabled by the current rollout configuration.",
        })
      },
    )
  })

  it("allows student login in audit mode while surfacing untrusted device state", async () => {
    await withIsolatedApp(
      {
        FEATURE_STRICT_DEVICE_BINDING_MODE: "AUDIT",
      },
      async (isolatedApp) => {
        const response = await requestAgainst(isolatedApp, "POST", "/auth/login", {
          payload: {
            email: authIntegrationFixtures.studentOne.email,
            password: authIntegrationFixtures.studentOne.password,
            platform: "MOBILE",
            requestedRole: "STUDENT",
          },
        })

        expect(response.statusCode).toBe(201)

        const session = authSessionResponseSchema.parse(response.body)
        expect(session.user.activeRole).toBe("STUDENT")
        expect(session.user.deviceTrust).toMatchObject({
          state: "MISSING_CONTEXT",
          reason: "MISSING_DEVICE_CONTEXT",
        })
      },
    )
  })

  it("rate limits repeated attendance marks", async () => {
    await withIsolatedApp(
      {
        ATTENDANCE_MARK_RATE_LIMIT_MAX: "2",
        ATTENDANCE_MARK_RATE_LIMIT_WINDOW_SECONDS: "60",
      },
      async (isolatedApp) => {
        const teacherSession = await loginAgainst(isolatedApp, {
          email: authIntegrationFixtures.teacher.email,
          password: authIntegrationFixtures.teacher.password,
          platform: "WEB",
          requestedRole: "TEACHER",
        })
        const studentSession = await loginAgainst(isolatedApp, {
          email: authIntegrationFixtures.studentOne.email,
          password: authIntegrationFixtures.studentOne.password,
          platform: "MOBILE",
          requestedRole: "STUDENT",
          device: authIntegrationFixtures.studentOne.device,
        })
        const qrSession = await createQrSessionAgainst(
          isolatedApp,
          teacherSession.tokens.accessToken,
        )

        const firstMark = await requestAgainst(isolatedApp, "POST", "/attendance/qr/mark", {
          headers: {
            authorization: `Bearer ${studentSession.tokens.accessToken}`,
            ...buildTrustedDeviceHeaders(authIntegrationFixtures.studentOne.device.installId),
          },
          payload: {
            sessionId: qrSession.id,
            qrPayload: qrSession.currentQrPayload,
            latitude: 28.6139,
            longitude: 77.209,
            accuracyMeters: 15,
          },
        })
        const duplicateMark = await requestAgainst(isolatedApp, "POST", "/attendance/qr/mark", {
          headers: {
            authorization: `Bearer ${studentSession.tokens.accessToken}`,
            ...buildTrustedDeviceHeaders(authIntegrationFixtures.studentOne.device.installId),
          },
          payload: {
            sessionId: qrSession.id,
            qrPayload: qrSession.currentQrPayload,
            latitude: 28.6139,
            longitude: 77.209,
            accuracyMeters: 15,
          },
        })
        const limitedMark = await requestAgainst(isolatedApp, "POST", "/attendance/qr/mark", {
          headers: {
            authorization: `Bearer ${studentSession.tokens.accessToken}`,
            ...buildTrustedDeviceHeaders(authIntegrationFixtures.studentOne.device.installId),
          },
          payload: {
            sessionId: qrSession.id,
            qrPayload: qrSession.currentQrPayload,
            latitude: 28.6139,
            longitude: 77.209,
            accuracyMeters: 15,
          },
        })

        expect(firstMark.statusCode).toBe(201)
        expect(duplicateMark.statusCode).toBe(409)
        expect(limitedMark.statusCode).toBe(429)
        expect(limitedMark.body).toMatchObject({
          message: "Too many requests. Please try again shortly.",
        })
      },
    )
  })

  async function request(
    method: "GET" | "POST",
    path: string,
    options: {
      headers?: Record<string, string>
      payload?: Record<string, unknown>
    },
  ): Promise<{
    statusCode: number
    headers: Record<string, string | string[] | undefined>
    body: unknown
  }> {
    if (!app) {
      throw new Error("Nest application is not initialized.")
    }

    return requestAgainst(app, method, path, options)
  }

  async function requestAgainst(
    targetApp: NestFastifyApplication,
    method: "GET" | "POST",
    path: string,
    options: {
      headers?: Record<string, string>
      payload?: Record<string, unknown>
    },
  ): Promise<{
    statusCode: number
    headers: Record<string, string | string[] | undefined>
    body: unknown
  }> {
    const response = await targetApp.inject({
      method,
      url: path,
      ...(options.headers ? { headers: options.headers } : {}),
      ...(options.payload ? { payload: options.payload } : {}),
    })

    return {
      statusCode: response.statusCode,
      headers: response.headers as Record<string, string | string[] | undefined>,
      body: response.body ? JSON.parse(response.body) : null,
    }
  }

  async function withIsolatedApp(
    overrides: Record<string, string>,
    callback: (isolatedApp: NestFastifyApplication) => Promise<void>,
  ) {
    const previousValues = Object.fromEntries(
      Object.keys(overrides).map((key) => [key, process.env[key]]),
    )

    Object.assign(process.env, overrides)

    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    const isolatedApp = testingModule.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    )

    try {
      await isolatedApp.init()
      await isolatedApp.getHttpAdapter().getInstance().ready()
      await callback(isolatedApp)
    } finally {
      await isolatedApp.close()

      for (const [key, value] of Object.entries(previousValues)) {
        if (value === undefined) {
          delete process.env[key]
          continue
        }

        process.env[key] = value
      }
    }
  }

  async function loginAgainst(targetApp: NestFastifyApplication, payload: Record<string, unknown>) {
    const response = await requestAgainst(targetApp, "POST", "/auth/login", {
      payload,
    })

    expect(response.statusCode).toBe(201)
    return authSessionResponseSchema.parse(response.body)
  }

  async function createQrSessionAgainst(
    targetApp: NestFastifyApplication,
    teacherAccessToken: string,
  ) {
    const response = await requestAgainst(targetApp, "POST", "/sessions/qr", {
      headers: {
        authorization: `Bearer ${teacherAccessToken}`,
      },
      payload: {
        classroomId: developmentSeedIds.courseOfferings.math,
        anchorType: "TEACHER_SELECTED",
        anchorLatitude: 28.6139,
        anchorLongitude: 77.209,
        anchorLabel: "Room 101",
        gpsRadiusMeters: 120,
        sessionDurationMinutes: 20,
      },
    })

    expect(response.statusCode).toBe(201)
    return attendanceSessionSummarySchema.parse(response.body)
  }

  function getPrisma(): ReturnType<typeof createPrismaClient> {
    if (!prisma) {
      throw new Error("Prisma client is not initialized.")
    }

    return prisma
  }
})
