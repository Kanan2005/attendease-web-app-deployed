import {
  emailAutomationRuleResponseSchema,
  emailAutomationRulesResponseSchema,
  emailDispatchRunsResponseSchema,
  emailLogsResponseSchema,
  lowAttendanceEmailPreviewResponseSchema,
  manualLowAttendanceEmailSendResponseSchema,
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
import { login, request, seedForeignTeacher } from "./automation.integration.test-support.js"

describe("Email automation integration", () => {
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
    database = await createTemporaryDatabase("attendease_automation")
    await seedAuthIntegrationData(database.databaseUrl)

    process.env.NODE_ENV = "test"
    process.env.TEST_DATABASE_URL = database.databaseUrl
    process.env.AUTH_ACCESS_TOKEN_SECRET = "attendease-automation-secret-1234567890"
    process.env.AUTH_ISSUER = "attendease-api-test"
    process.env.AUTH_AUDIENCE = "attendease-client-test"
    process.env.GOOGLE_OIDC_CLIENT_ID = "automation-google-client"
    process.env.GOOGLE_OIDC_CLIENT_SECRET = "automation-google-secret"
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

    await seedForeignTeacher(getPrisma())
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

  it("creates teacher automation rules and lists them within teacher scope", async () => {
    const teacherSession = await login(getApp(), {
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })

    const createResponse = await request(getApp(), "POST", "/automation/email/rules", {
      token: teacherSession.tokens.accessToken,
      payload: {
        classroomId: developmentSeedIds.courseOfferings.physics,
        thresholdPercent: 70,
        scheduleHourLocal: 19,
        scheduleMinuteLocal: 15,
        timezone: "Asia/Kolkata",
        templateSubject: "Attendance alert for {{classroomTitle}}",
        templateBody: "Hello {{studentName}}, your attendance is {{attendancePercentage}}.",
        status: "ACTIVE",
      },
    })

    expect(createResponse.statusCode).toBe(201)
    const createdRule = emailAutomationRuleResponseSchema.parse(createResponse.body)
    expect(createdRule).toMatchObject({
      classroomId: developmentSeedIds.courseOfferings.physics,
      thresholdPercent: 70,
      scheduleHourLocal: 19,
      scheduleMinuteLocal: 15,
      status: "ACTIVE",
    })

    const [listResponse, updateResponse] = await Promise.all([
      request(getApp(), "GET", "/automation/email/rules", {
        token: teacherSession.tokens.accessToken,
      }),
      request(getApp(), "PATCH", `/automation/email/rules/${createdRule.id}`, {
        token: teacherSession.tokens.accessToken,
        payload: {
          status: "PAUSED",
        },
      }),
    ])

    expect(listResponse.statusCode).toBe(200)
    expect(updateResponse.statusCode).toBe(200)

    const rules = emailAutomationRulesResponseSchema.parse(listResponse.body)
    const updatedRule = emailAutomationRuleResponseSchema.parse(updateResponse.body)

    expect(rules.map((rule) => rule.id)).toContain(createdRule.id)
    expect(updatedRule.status).toBe("PAUSED")
  })

  it("renders previews, queues manual sends, and exposes dispatch runs from final attendance truth", async () => {
    const teacherSession = await login(getApp(), {
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })

    const [previewResponse, manualSendResponse] = await Promise.all([
      request(getApp(), "POST", "/automation/email/preview", {
        token: teacherSession.tokens.accessToken,
        payload: {
          ruleId: developmentSeedIds.emailAutomation.rule,
          from: "2026-03-01T00:00:00.000Z",
          to: "2026-03-31T23:59:59.999Z",
          templateSubject: "Attendance below {{thresholdPercent}} in {{classroomTitle}}",
          templateBody:
            "Hello {{studentName}}, attendance in {{classroomTitle}} is {{attendancePercentage}}.",
        },
      }),
      request(getApp(), "POST", "/automation/email/send-manual", {
        token: teacherSession.tokens.accessToken,
        payload: {
          ruleId: developmentSeedIds.emailAutomation.rule,
          from: "2026-03-01T00:00:00.000Z",
          to: "2026-03-31T23:59:59.999Z",
          thresholdPercent: 75,
        },
      }),
    ])

    expect(previewResponse.statusCode).toBe(201)
    expect(manualSendResponse.statusCode).toBe(201)

    const preview = lowAttendanceEmailPreviewResponseSchema.parse(previewResponse.body)
    const queuedRun = manualLowAttendanceEmailSendResponseSchema.parse(manualSendResponse.body)

    expect(preview.recipientCount).toBe(1)
    expect(preview.sampleRecipients[0]).toMatchObject({
      studentId: developmentSeedIds.users.studentFour,
      attendancePercentage: 0,
    })
    expect(preview.previewSubject).toContain("[AttendEase test]")
    expect(preview.previewText).toContain(preview.sampleRecipients[0]?.studentDisplayName ?? "")
    expect(preview.previewText).toContain("Mathematics")
    expect(preview.previewHtml).toContain("<p>")
    expect(preview.previewHtml).toContain(preview.sampleRecipients[0]?.studentDisplayName ?? "")
    expect(queuedRun.dispatchRun).toMatchObject({
      ruleId: developmentSeedIds.emailAutomation.rule,
      triggerType: "MANUAL",
      status: "QUEUED",
    })

    const [runsResponse, logsResponse, dispatchRun] = await Promise.all([
      request(
        getApp(),
        "GET",
        `/automation/email/runs?ruleId=${developmentSeedIds.emailAutomation.rule}`,
        {
          token: teacherSession.tokens.accessToken,
        },
      ),
      request(
        getApp(),
        "GET",
        `/automation/email/logs?ruleId=${developmentSeedIds.emailAutomation.rule}`,
        {
          token: teacherSession.tokens.accessToken,
        },
      ),
      getPrisma().emailDispatchRun.findUnique({
        where: {
          id: queuedRun.dispatchRun.id,
        },
      }),
    ])

    expect(runsResponse.statusCode).toBe(200)
    expect(logsResponse.statusCode).toBe(200)

    const runs = emailDispatchRunsResponseSchema.parse(runsResponse.body)
    const logs = emailLogsResponseSchema.parse(logsResponse.body)

    expect(runs.some((run) => run.id === queuedRun.dispatchRun.id)).toBe(true)
    expect(logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: developmentSeedIds.emailAutomation.emailLog,
          studentId: developmentSeedIds.users.studentFour,
          status: "SENT",
        }),
      ]),
    )
    expect(dispatchRun?.filterSnapshot).toMatchObject({
      ruleId: developmentSeedIds.emailAutomation.rule,
      thresholdPercent: 75,
      from: "2026-03-01T00:00:00.000Z",
      to: "2026-03-31T23:59:59.999Z",
    })
  })

  it("enforces teacher scope and route-role boundaries", async () => {
    const [studentSession, foreignTeacherSession] = await Promise.all([
      login(getApp(), {
        email: authIntegrationFixtures.studentOne.email,
        password: authIntegrationFixtures.studentOne.password,
        platform: "MOBILE",
        requestedRole: "STUDENT",
        device: authIntegrationFixtures.studentOne.device,
      }),
      login(getApp(), {
        email: "foreign.teacher@attendease.dev",
        password: "ForeignTeacherPass123!",
        platform: "WEB",
        requestedRole: "TEACHER",
      }),
    ])

    const [studentResponse, foreignTeacherResponse] = await Promise.all([
      request(getApp(), "GET", "/automation/email/rules", {
        token: studentSession.tokens.accessToken,
      }),
      request(getApp(), "POST", "/automation/email/preview", {
        token: foreignTeacherSession.tokens.accessToken,
        payload: {
          ruleId: developmentSeedIds.emailAutomation.rule,
        },
      }),
    ])

    expect(studentResponse.statusCode).toBe(403)
    expect(foreignTeacherResponse.statusCode).toBe(403)
    expect(foreignTeacherResponse.body).toMatchObject({
      message: "The teacher cannot manage the requested course offering.",
    })
  })

  function getPrisma() {
    if (!prisma) {
      throw new Error("Prisma client is not initialized.")
    }

    return prisma
  }

  function getApp() {
    if (!app) {
      throw new Error("Nest app is not initialized.")
    }

    return app
  }
})
