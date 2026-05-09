import {
  adminRecordsArchiveResponseSchema,
  adminRecordsCourseListResponseSchema,
  adminRecordsCourseSearchResponseSchema,
  adminRecordsDepartmentListResponseSchema,
  adminRecordsStudentListResponseSchema,
  adminRecordsTeacherListResponseSchema,
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

describe("Admin records explorer integration", () => {
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
    database = await createTemporaryDatabase("attendease_admin_records")
    await seedAuthIntegrationData(database.databaseUrl)

    process.env.NODE_ENV = "test"
    process.env.TEST_DATABASE_URL = database.databaseUrl
    process.env.AUTH_ACCESS_TOKEN_SECRET = "attendease-admin-records-secret-1234567890"
    process.env.AUTH_ISSUER = "attendease-api-test"
    process.env.AUTH_AUDIENCE = "attendease-client-test"
    process.env.GOOGLE_OIDC_CLIENT_ID = "admin-records-test-google-client"
    process.env.GOOGLE_OIDC_CLIENT_SECRET = "admin-records-test-google-secret"
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

  it("walks the full department -> teacher -> course -> students drilldown", async () => {
    const adminToken = await loginAsAdmin()

    // Level 1: departments
    const departmentResponse = await request("GET", "/admin/records/departments", {
      token: adminToken,
    })
    expect(departmentResponse.statusCode).toBe(200)
    const departments = adminRecordsDepartmentListResponseSchema.parse(departmentResponse.body)
    expect(departments.departments.length).toBeGreaterThanOrEqual(1)
    const cse = departments.departments.find((d) => d.department === "Computer Science")
    expect(cse).toBeDefined()
    expect(cse?.teacherCount).toBe(1)
    expect(cse?.courseCount).toBeGreaterThanOrEqual(2)
    expect(cse?.activeCourseCount).toBeGreaterThanOrEqual(2)
    expect(cse?.archivedCourseCount).toBe(0)

    // Level 2: teachers in CSE
    const teacherListResponse = await request(
      "GET",
      `/admin/records/departments/${encodeURIComponent("Computer Science")}/teachers`,
      { token: adminToken },
    )
    expect(teacherListResponse.statusCode).toBe(200)
    const teacherList = adminRecordsTeacherListResponseSchema.parse(teacherListResponse.body)
    expect(teacherList.department).toBe("Computer Science")
    expect(teacherList.teachers).toHaveLength(1)
    const teacherSummary = teacherList.teachers[0]
    expect(teacherSummary?.teacherId).toBe(developmentSeedIds.users.teacher)
    expect(teacherSummary?.courseCount).toBeGreaterThanOrEqual(2)

    // Level 3: courses owned by teacher
    const courseListResponse = await request(
      "GET",
      `/admin/records/teachers/${developmentSeedIds.users.teacher}/courses`,
      { token: adminToken },
    )
    expect(courseListResponse.statusCode).toBe(200)
    const courseList = adminRecordsCourseListResponseSchema.parse(courseListResponse.body)
    expect(courseList.teacherId).toBe(developmentSeedIds.users.teacher)
    expect(courseList.courses.length).toBeGreaterThanOrEqual(2)
    const mathCourse = courseList.courses.find(
      (c) => c.courseOfferingId === developmentSeedIds.courseOfferings.math,
    )
    expect(mathCourse).toBeDefined()
    expect(mathCourse?.studentCount).toBeGreaterThan(0)
    expect(mathCourse?.sessionsConductedCount).toBeGreaterThan(0)

    // Level 4: students in math course
    const studentListResponse = await request(
      "GET",
      `/admin/records/courses/${developmentSeedIds.courseOfferings.math}/students`,
      { token: adminToken },
    )
    expect(studentListResponse.statusCode).toBe(200)
    const studentList = adminRecordsStudentListResponseSchema.parse(studentListResponse.body)
    expect(studentList.courseOfferingId).toBe(developmentSeedIds.courseOfferings.math)
    expect(studentList.students.length).toBeGreaterThanOrEqual(4)
    expect(studentList.lowAttendanceThresholdPercent).toBe(75)
    for (const student of studentList.students) {
      expect(["LOW", "NORMAL"]).toContain(student.attendanceStatus)
    }
  })

  it("searches courses by partial code or title (case-insensitive)", async () => {
    const adminToken = await loginAsAdmin()
    const response = await request("GET", "/admin/records/courses/search?q=math", {
      token: adminToken,
    })
    expect(response.statusCode).toBe(200)
    const result = adminRecordsCourseSearchResponseSchema.parse(response.body)
    expect(result.query).toBe("math")
    expect(result.hits.length).toBeGreaterThanOrEqual(1)
    expect(
      result.hits.some((hit) => hit.courseOfferingId === developmentSeedIds.courseOfferings.math),
    ).toBe(true)
  })

  it("archives and unarchives a course offering and writes admin action log entries", async () => {
    const adminToken = await loginAsAdmin()
    const offeringId = developmentSeedIds.courseOfferings.physics

    const archiveResponse = await request("POST", `/admin/records/courses/${offeringId}/archive`, {
      token: adminToken,
      payload: { reason: "End of semester wrap-up" },
    })
    expect(archiveResponse.statusCode).toBe(201)
    const archived = adminRecordsArchiveResponseSchema.parse(archiveResponse.body)
    expect(archived.status).toBe("ARCHIVED")
    expect(archived.isArchived).toBe(true)
    expect(archived.archivedAt).not.toBeNull()

    // Idempotent re-archive should not throw and not add a duplicate log.
    const archivedAgain = await request("POST", `/admin/records/courses/${offeringId}/archive`, {
      token: adminToken,
      payload: { reason: "Already archived check" },
    })
    expect(archivedAgain.statusCode).toBe(201)
    const archivedAgainBody = adminRecordsArchiveResponseSchema.parse(archivedAgain.body)
    expect(archivedAgainBody.isArchived).toBe(true)

    // Verify admin action log has exactly ONE archive entry for this offering.
    const archiveLogs = await getPrisma().adminActionLog.findMany({
      where: {
        targetCourseOfferingId: offeringId,
        actionType: "COURSE_OFFERING_ARCHIVE",
      },
    })
    expect(archiveLogs).toHaveLength(1)

    // Unarchive
    const unarchiveResponse = await request(
      "POST",
      `/admin/records/courses/${offeringId}/unarchive`,
      { token: adminToken, payload: { reason: "Reopening for re-exam batch" } },
    )
    expect(unarchiveResponse.statusCode).toBe(201)
    const unarchived = adminRecordsArchiveResponseSchema.parse(unarchiveResponse.body)
    expect(unarchived.status).toBe("ACTIVE")
    expect(unarchived.isArchived).toBe(false)

    const unarchiveLogs = await getPrisma().adminActionLog.findMany({
      where: {
        targetCourseOfferingId: offeringId,
        actionType: "COURSE_OFFERING_UNARCHIVE",
      },
    })
    expect(unarchiveLogs).toHaveLength(1)
  })

  it("rejects records access without an admin token", async () => {
    const response = await request("GET", "/admin/records/departments")
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
