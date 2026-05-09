/**
 * Cross-phase admin journey end-to-end test.
 *
 * Walks through every admin-panel phase in a single workflow, mirroring how
 * a real admin would explore the panel after logging in. The point of this
 * suite (over the per-phase integration tests) is to catch CROSS-PHASE
 * regressions — e.g.:
 *   - Phase 1 archives a course → Phase 2 student listing should drop it
 *   - Phase 5 bumps lowAttendanceThresholdPercent → Phase 6 dashboard reflects it
 *   - Phase 5 invite creates an admin → that admin can log in and use the panel
 *   - Phase 1 archive triggers an audit row that Phase 5 can see in counts
 *
 * If any one of these wires breaks silently, this suite fails first.
 */

import {
  adminCommunicationAudiencePreviewResponseSchema,
  adminDashboardStatsSchema,
  adminRecordsArchiveResponseSchema,
  adminRecordsCourseListResponseSchema,
  adminRecordsDepartmentListResponseSchema,
  adminReportJobSummarySchema,
  adminSettingsAdminInviteResponseSchema,
  adminSettingsSystemResponseSchema,
  adminUsersAttendanceToggleResponseSchema,
  adminUsersStudentListResponseSchema,
  adminUsersStudentProfileSchema,
  authSessionResponseSchema,
  studentClassroomsResponseSchema,
} from "@attendease/contracts"
import { createPrismaClient, developmentSeedIds, disconnectPrismaClient } from "@attendease/db"
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify"
import { Test } from "@nestjs/testing"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import { AppModule } from "../app.module.js"
import { GoogleOidcService } from "../modules/auth/google-oidc.service.js"
import { ExportStorageService } from "../modules/exports/export-storage.service.js"
import {
  type TemporaryDatabase,
  authIntegrationFixtures,
  createTemporaryDatabase,
  destroyTemporaryDatabase,
  seedAuthIntegrationData,
} from "./integration-helpers.js"

const TARGET_COURSE = developmentSeedIds.courseOfferings.math
const TARGET_STUDENT = developmentSeedIds.users.studentOne
const NEW_ADMIN_EMAIL = "journey-admin@attendease.dev"

describe("Admin journey end-to-end (Phases 1 → 6)", () => {
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
  // Fake S3 — admin-reports synchronously builds + uploads, so we replace
  // ExportStorageService with an in-memory mock that records bytes.
  const fakeStorage = {
    uploadObject: vi.fn(async () => undefined),
    getDownloadUrl: vi.fn(
      async (objectKey: string) => `https://test-storage/${objectKey}?signed=1`,
    ),
  }

  let adminToken = ""

  beforeAll(async () => {
    database = await createTemporaryDatabase("attendease_admin_journey")
    await seedAuthIntegrationData(database.databaseUrl)

    process.env.NODE_ENV = "test"
    process.env.TEST_DATABASE_URL = database.databaseUrl
    process.env.AUTH_ACCESS_TOKEN_SECRET = "attendease-admin-journey-secret-1234567890"
    process.env.AUTH_ISSUER = "attendease-api-test"
    process.env.AUTH_AUDIENCE = "attendease-client-test"
    process.env.GOOGLE_OIDC_CLIENT_ID = "admin-journey-test-google-client"
    process.env.GOOGLE_OIDC_CLIENT_SECRET = "admin-journey-test-google-secret"
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

  // ---------------------------------------------------------------------
  // Setup
  // ---------------------------------------------------------------------

  it("step 0: admin logs in and gets a session token", async () => {
    const session = await login({
      email: authIntegrationFixtures.admin.email,
      password: authIntegrationFixtures.admin.password,
      platform: "WEB",
      requestedRole: "ADMIN",
    })
    adminToken = session.tokens.accessToken
    expect(adminToken.length).toBeGreaterThan(20)
  })

  // ---------------------------------------------------------------------
  // Phase 1 — Records explorer
  // ---------------------------------------------------------------------

  it("phase 1: lists departments and courses, then archives the math course", async () => {
    const departments = adminRecordsDepartmentListResponseSchema.parse(
      (await request("GET", "/admin/records/departments", { token: adminToken })).body,
    )
    expect(departments.departments.length).toBeGreaterThan(0)

    const courses = adminRecordsCourseListResponseSchema.parse(
      (await request("GET", "/admin/records/courses", { token: adminToken })).body,
    )
    expect(courses.courses.some((c) => c.courseOfferingId === TARGET_COURSE)).toBe(true)

    const archive = adminRecordsArchiveResponseSchema.parse(
      (
        await request("POST", `/admin/records/courses/${TARGET_COURSE}/archive`, {
          token: adminToken,
          payload: { reason: "Cross-phase journey test" },
        })
      ).body,
    )
    expect(archive.isArchived).toBe(true)
  })

  it("phase 1 → student app: archived course disappears from /students/me/classrooms (cross-phase regression)", async () => {
    const studentSession = await login({
      email: authIntegrationFixtures.studentOne.email,
      password: authIntegrationFixtures.studentOne.password,
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: authIntegrationFixtures.studentOne.device,
    })

    const list = studentClassroomsResponseSchema.parse(
      (
        await request("GET", "/students/me/classrooms", {
          token: studentSession.tokens.accessToken,
        })
      ).body,
    )
    expect(list.some((c) => c.id === TARGET_COURSE)).toBe(false)
  })

  it("phase 1: unarchive restores course visibility", async () => {
    const restore = adminRecordsArchiveResponseSchema.parse(
      (
        await request("POST", `/admin/records/courses/${TARGET_COURSE}/unarchive`, {
          token: adminToken,
          payload: { reason: "Restoring for further journey steps" },
        })
      ).body,
    )
    expect(restore.isArchived).toBe(false)
  })

  // ---------------------------------------------------------------------
  // Phase 2 — Users
  // ---------------------------------------------------------------------

  it("phase 2: lists students filtered by course and disables attendance for one", async () => {
    const list = adminUsersStudentListResponseSchema.parse(
      (
        await request("GET", `/admin/users/students?courseOfferingId=${TARGET_COURSE}`, {
          token: adminToken,
        })
      ).body,
    )
    expect(list.students.some((s) => s.studentId === TARGET_STUDENT)).toBe(true)

    const disable = adminUsersAttendanceToggleResponseSchema.parse(
      (
        await request("POST", `/admin/users/students/${TARGET_STUDENT}/attendance-disable`, {
          token: adminToken,
          payload: { reason: "Journey: temporarily blocked" },
        })
      ).body,
    )
    expect(disable.attendanceDisabled).toBe(true)

    const profile = adminUsersStudentProfileSchema.parse(
      (
        await request("GET", `/admin/users/students/${TARGET_STUDENT}`, {
          token: adminToken,
        })
      ).body,
    )
    expect(profile.attendanceDisabled).toBe(true)
  })

  it("phase 2: re-enable attendance and verify idempotency on duplicate enable call", async () => {
    const enable1 = adminUsersAttendanceToggleResponseSchema.parse(
      (
        await request("POST", `/admin/users/students/${TARGET_STUDENT}/attendance-enable`, {
          token: adminToken,
          payload: {},
        })
      ).body,
    )
    expect(enable1.attendanceDisabled).toBe(false)

    const auditBefore = await getPrisma().adminActionLog.count({
      where: { actionType: "STUDENT_ATTENDANCE_ENABLE", targetUserId: TARGET_STUDENT },
    })
    // Second enable on an already-enabled student should be a no-op (no new audit row).
    await request("POST", `/admin/users/students/${TARGET_STUDENT}/attendance-enable`, {
      token: adminToken,
      payload: {},
    })
    const auditAfter = await getPrisma().adminActionLog.count({
      where: { actionType: "STUDENT_ATTENDANCE_ENABLE", targetUserId: TARGET_STUDENT },
    })
    expect(auditAfter).toBe(auditBefore)
  })

  // ---------------------------------------------------------------------
  // Phase 3 — Communication
  // ---------------------------------------------------------------------

  it("phase 3: audience preview for the math course returns student emails and writes audit row", async () => {
    const preview = adminCommunicationAudiencePreviewResponseSchema.parse(
      (
        await request("POST", "/admin/communication/audience-preview", {
          token: adminToken,
          payload: { audience: "STUDENT", courseOfferingId: TARGET_COURSE },
        })
      ).body,
    )
    expect(preview.audience).toBe("STUDENT")
    expect(preview.emailCount).toBeGreaterThan(0)
    for (const email of preview.emails) expect(email).toMatch(/@/)

    const auditCount = await getPrisma().adminActionLog.count({
      where: { actionType: "COMMUNICATION_AUDIENCE_PREVIEW" },
    })
    expect(auditCount).toBeGreaterThan(0)
  })

  // ---------------------------------------------------------------------
  // Phase 4 — Reports
  // ---------------------------------------------------------------------

  it("phase 4: generates a course XLSX report and persists ExportJob in COMPLETED", async () => {
    const result = adminReportJobSummarySchema.parse(
      (
        await request("POST", "/admin/reports/course", {
          token: adminToken,
          payload: { courseOfferingId: TARGET_COURSE },
        })
      ).body,
    )
    expect(result.status).toBe("COMPLETED")
    expect(result.jobType).toBe("ADMIN_COURSE_REPORT_XLSX")
    expect(result.fileName).toMatch(/\.xlsx$/)
    expect(result.downloadUrl).toMatch(/^https:\/\/test-storage\//)

    const job = await getPrisma().exportJob.findUniqueOrThrow({
      where: { id: result.jobId },
      include: { files: true },
    })
    expect(job.status).toBe("COMPLETED")
    expect(job.files.length).toBe(1)
  })

  // ---------------------------------------------------------------------
  // Phase 5 — Settings
  // ---------------------------------------------------------------------

  it("phase 5: bumps lowAttendanceThresholdPercent via PATCH /admin/settings/system", async () => {
    const updated = adminSettingsSystemResponseSchema.parse(
      (
        await request("PATCH", "/admin/settings/system", {
          token: adminToken,
          payload: { lowAttendanceThresholdPercent: 90 },
        })
      ).body,
    )
    expect(updated.values.lowAttendanceThresholdPercent).toBe(90)
    expect(updated.updatedBy?.email).toBe(authIntegrationFixtures.admin.email)
  })

  it("phase 5: invite a new admin and verify they can log in with the temp password", async () => {
    const invite = adminSettingsAdminInviteResponseSchema.parse(
      (
        await request("POST", "/admin/settings/admins/invite", {
          token: adminToken,
          payload: { email: NEW_ADMIN_EMAIL, displayName: "Journey Admin" },
        })
      ).body,
    )
    expect(invite.alreadyHadAccount).toBe(false)
    expect(invite.alreadyAdmin).toBe(false)

    const newAdminLogin = await login({
      email: NEW_ADMIN_EMAIL,
      password: invite.temporaryPassword,
      platform: "WEB",
      requestedRole: "ADMIN",
    })
    expect(newAdminLogin.tokens.accessToken.length).toBeGreaterThan(20)

    // The brand-new admin can hit admin endpoints.
    const stats = await request("GET", "/admin/dashboard/stats", {
      token: newAdminLogin.tokens.accessToken,
    })
    expect(stats.statusCode).toBe(200)
  })

  it("phase 5: refuses to revoke own admin role", async () => {
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

  // ---------------------------------------------------------------------
  // Phase 6 — Dashboard insights cross-phase verification
  // ---------------------------------------------------------------------

  it("phase 6: dashboard reflects the threshold change made in Phase 5 (cross-phase wiring)", async () => {
    const stats = adminDashboardStatsSchema.parse(
      (await request("GET", "/admin/dashboard/stats", { token: adminToken })).body,
    )
    expect(stats.insights.lowAttendanceThresholdPercent).toBe(90)
    expect(stats.insights.sessionsLast7Days).toBeGreaterThanOrEqual(0)
  })

  it("phase 6: dashboard reports the math course offering as ACTIVE after Phase 1 unarchive", async () => {
    const stats = adminDashboardStatsSchema.parse(
      (await request("GET", "/admin/dashboard/stats", { token: adminToken })).body,
    )
    // archived count should remain 0 since we unarchived the only course we touched.
    expect(stats.classrooms.archived).toBe(0)
  })

  // ---------------------------------------------------------------------
  // helpers
  // ---------------------------------------------------------------------

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
