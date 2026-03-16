import { hashPassword } from "@attendease/auth/password"
import {
  attendanceSessionHistoryResponseSchema,
  attendanceSessionStudentsResponseSchema,
  attendanceSessionSummarySchema,
  authSessionResponseSchema,
  studentReportOverviewSchema,
  studentSubjectReportDetailSchema,
  studentSubjectReportSummaryResponseSchema,
  teacherDaywiseAttendanceReportResponseSchema,
  teacherStudentAttendancePercentageReportResponseSchema,
  teacherSubjectwiseAttendanceReportResponseSchema,
  updateAttendanceSessionAttendanceResponseSchema,
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

describe("Reports integration", () => {
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
    database = await createTemporaryDatabase("attendease_reports")
    await seedAuthIntegrationData(database.databaseUrl)

    process.env.NODE_ENV = "test"
    process.env.TEST_DATABASE_URL = database.databaseUrl
    process.env.AUTH_ACCESS_TOKEN_SECRET = "attendease-reports-secret-1234567890"
    process.env.AUTH_ISSUER = "attendease-api-test"
    process.env.AUTH_AUDIENCE = "attendease-client-test"
    process.env.GOOGLE_OIDC_CLIENT_ID = "reports-google-client"
    process.env.GOOGLE_OIDC_CLIENT_SECRET = "reports-google-secret"
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

  it("returns teacher and admin rollups from finalized attendance truth", async () => {
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

    const [teacherDaywiseResponse, teacherSubjectwiseResponse, adminDaywiseResponse] =
      await Promise.all([
        request("GET", "/reports/daywise?classroomId=seed_course_offering_math", {
          token: teacherSession.tokens.accessToken,
        }),
        request(
          "GET",
          "/reports/subjectwise?from=2026-03-01T00:00:00.000Z&to=2026-03-31T23:59:59.999Z",
          {
            token: teacherSession.tokens.accessToken,
          },
        ),
        request("GET", "/reports/daywise?subjectId=seed_subject_math", {
          token: adminSession.tokens.accessToken,
        }),
      ])

    expect(teacherDaywiseResponse.statusCode).toBe(200)
    expect(teacherSubjectwiseResponse.statusCode).toBe(200)
    expect(adminDaywiseResponse.statusCode).toBe(200)

    const teacherDaywise = teacherDaywiseAttendanceReportResponseSchema.parse(
      teacherDaywiseResponse.body,
    )
    const teacherSubjectwise = teacherSubjectwiseAttendanceReportResponseSchema.parse(
      teacherSubjectwiseResponse.body,
    )
    const adminDaywise = teacherDaywiseAttendanceReportResponseSchema.parse(
      adminDaywiseResponse.body,
    )

    expect(teacherDaywise[0]).toMatchObject({
      classroomId: developmentSeedIds.courseOfferings.math,
      sessionCount: 1,
      presentCount: 3,
      absentCount: 1,
      attendancePercentage: 75,
    })
    expect(teacherSubjectwise[0]).toMatchObject({
      subjectId: developmentSeedIds.academic.mathSubject,
      totalSessions: 1,
      presentCount: 3,
      absentCount: 1,
      attendancePercentage: 75,
    })
    expect(adminDaywise[0]?.classroomId).toBe(developmentSeedIds.courseOfferings.math)
  })

  it("returns teacher student percentages using final manual-edit attendance truth", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "MOBILE",
      requestedRole: "TEACHER",
    })

    const response = await request(
      "GET",
      `/reports/students/percentages?classroomId=${developmentSeedIds.courseOfferings.math}`,
      {
        token: teacherSession.tokens.accessToken,
      },
    )

    expect(response.statusCode).toBe(200)
    const rows = teacherStudentAttendancePercentageReportResponseSchema.parse(response.body)
    const studentThree = rows.find(
      (row) => row.studentId === authIntegrationFixtures.studentThree.userId,
    )
    const studentFour = rows.find(
      (row) => row.studentId === authIntegrationFixtures.studentFour.userId,
    )

    expect(rows).toHaveLength(4)
    expect(studentThree).toMatchObject({
      studentId: authIntegrationFixtures.studentThree.userId,
      presentSessions: 1,
      absentSessions: 0,
      attendancePercentage: 100,
    })
    expect(studentFour).toMatchObject({
      studentId: authIntegrationFixtures.studentFour.userId,
      presentSessions: 0,
      absentSessions: 1,
      attendancePercentage: 0,
    })
  })

  it("returns student self-report overview and subject breakdowns scoped to the authenticated student", async () => {
    const studentSession = await login({
      email: authIntegrationFixtures.studentOne.email,
      password: authIntegrationFixtures.studentOne.password,
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: authIntegrationFixtures.studentOne.device,
    })

    const [overviewResponse, subjectsResponse, detailResponse] = await Promise.all([
      request("GET", "/students/me/reports/overview", {
        token: studentSession.tokens.accessToken,
      }),
      request("GET", "/students/me/reports/subjects", {
        token: studentSession.tokens.accessToken,
      }),
      request("GET", `/students/me/reports/subjects/${developmentSeedIds.academic.mathSubject}`, {
        token: studentSession.tokens.accessToken,
      }),
    ])

    expect(overviewResponse.statusCode).toBe(200)
    expect(subjectsResponse.statusCode).toBe(200)
    expect(detailResponse.statusCode).toBe(200)

    const overview = studentReportOverviewSchema.parse(overviewResponse.body)
    const subjects = studentSubjectReportSummaryResponseSchema.parse(subjectsResponse.body)
    const detail = studentSubjectReportDetailSchema.parse(detailResponse.body)

    expect(overview).toMatchObject({
      studentId: authIntegrationFixtures.studentOne.userId,
      trackedClassroomCount: 2,
      totalSessions: 1,
      presentSessions: 1,
      absentSessions: 0,
      attendancePercentage: 100,
    })
    expect(subjects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subjectId: developmentSeedIds.academic.mathSubject,
          totalSessions: 1,
          attendancePercentage: 100,
        }),
        expect.objectContaining({
          subjectId: developmentSeedIds.academic.physicsSubject,
          totalSessions: 0,
          attendancePercentage: 0,
        }),
      ]),
    )
    expect(detail).toMatchObject({
      subjectId: developmentSeedIds.academic.mathSubject,
      classroomCount: 1,
      totalSessions: 1,
      attendancePercentage: 100,
      classrooms: [
        expect.objectContaining({
          classroomId: developmentSeedIds.courseOfferings.math,
          attendancePercentage: 100,
        }),
      ],
    })
  })

  it("keeps teacher and student report views aligned to the same finalized attendance truth", async () => {
    const [teacherSession, studentSession] = await Promise.all([
      login({
        email: authIntegrationFixtures.teacher.email,
        password: authIntegrationFixtures.teacher.password,
        platform: "WEB",
        requestedRole: "TEACHER",
      }),
      login({
        email: authIntegrationFixtures.studentOne.email,
        password: authIntegrationFixtures.studentOne.password,
        platform: "MOBILE",
        requestedRole: "STUDENT",
        device: authIntegrationFixtures.studentOne.device,
      }),
    ])

    const [teacherPercentagesResponse, studentDetailResponse] = await Promise.all([
      request(
        "GET",
        `/reports/students/percentages?classroomId=${developmentSeedIds.courseOfferings.math}&subjectId=${developmentSeedIds.academic.mathSubject}`,
        {
          token: teacherSession.tokens.accessToken,
        },
      ),
      request("GET", `/students/me/reports/subjects/${developmentSeedIds.academic.mathSubject}`, {
        token: studentSession.tokens.accessToken,
      }),
    ])

    expect(teacherPercentagesResponse.statusCode).toBe(200)
    expect(studentDetailResponse.statusCode).toBe(200)

    const teacherPercentages = teacherStudentAttendancePercentageReportResponseSchema.parse(
      teacherPercentagesResponse.body,
    )
    const studentDetail = studentSubjectReportDetailSchema.parse(studentDetailResponse.body)
    const teacherStudentRow = teacherPercentages.find(
      (row) => row.studentId === authIntegrationFixtures.studentOne.userId,
    )
    const studentClassroomRow = studentDetail.classrooms.find(
      (row) => row.classroomId === developmentSeedIds.courseOfferings.math,
    )

    expect(teacherStudentRow).toMatchObject({
      classroomId: developmentSeedIds.courseOfferings.math,
      subjectId: developmentSeedIds.academic.mathSubject,
      totalSessions: 1,
      presentSessions: 1,
      absentSessions: 0,
      attendancePercentage: 100,
    })
    expect(studentClassroomRow).toMatchObject({
      classroomId: developmentSeedIds.courseOfferings.math,
      totalSessions: 1,
      presentSessions: 1,
      absentSessions: 0,
      attendancePercentage: 100,
    })
  })

  it("applies date filters while keeping in-scope student percentage rows stable", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })

    const [daywiseResponse, subjectwiseResponse, percentagesResponse] = await Promise.all([
      request(
        "GET",
        `/reports/daywise?classroomId=${developmentSeedIds.courseOfferings.math}&from=2026-04-01T00:00:00.000Z&to=2026-04-30T23:59:59.999Z`,
        {
          token: teacherSession.tokens.accessToken,
        },
      ),
      request(
        "GET",
        `/reports/subjectwise?classroomId=${developmentSeedIds.courseOfferings.math}&from=2026-04-01T00:00:00.000Z&to=2026-04-30T23:59:59.999Z`,
        {
          token: teacherSession.tokens.accessToken,
        },
      ),
      request(
        "GET",
        `/reports/students/percentages?classroomId=${developmentSeedIds.courseOfferings.math}&from=2026-04-01T00:00:00.000Z&to=2026-04-30T23:59:59.999Z`,
        {
          token: teacherSession.tokens.accessToken,
        },
      ),
    ])

    expect(daywiseResponse.statusCode).toBe(200)
    expect(subjectwiseResponse.statusCode).toBe(200)
    expect(percentagesResponse.statusCode).toBe(200)

    const daywise = teacherDaywiseAttendanceReportResponseSchema.parse(daywiseResponse.body)
    const subjectwise = teacherSubjectwiseAttendanceReportResponseSchema.parse(
      subjectwiseResponse.body,
    )
    const percentages = teacherStudentAttendancePercentageReportResponseSchema.parse(
      percentagesResponse.body,
    )

    expect(daywise).toEqual([])
    expect(subjectwise).toEqual([])
    expect(percentages).toHaveLength(4)
    expect(percentages.every((row) => row.totalSessions === 0)).toBe(true)
    expect(percentages.every((row) => row.presentSessions === 0)).toBe(true)
    expect(percentages.every((row) => row.absentSessions === 0)).toBe(true)
    expect(percentages.every((row) => row.attendancePercentage === 0)).toBe(true)
  })

  it("keeps history and reports aligned after a manual attendance correction", async () => {
    const [teacherSession, studentSession] = await Promise.all([
      login({
        email: authIntegrationFixtures.teacher.email,
        password: authIntegrationFixtures.teacher.password,
        platform: "WEB",
        requestedRole: "TEACHER",
      }),
      login({
        email: authIntegrationFixtures.studentOne.email,
        password: authIntegrationFixtures.studentOne.password,
        platform: "MOBILE",
        requestedRole: "STUDENT",
        device: authIntegrationFixtures.studentOne.device,
      }),
    ])

    const created = await createQrSession(teacherSession.tokens.accessToken)
    const endResponse = await request("POST", `/sessions/${created.id}/end`, {
      token: teacherSession.tokens.accessToken,
    })

    expect(endResponse.statusCode).toBe(201)

    const studentsResponse = await request("GET", `/sessions/${created.id}/students`, {
      token: teacherSession.tokens.accessToken,
    })

    expect(studentsResponse.statusCode).toBe(200)
    const students = attendanceSessionStudentsResponseSchema.parse(studentsResponse.body)
    const studentOneRow = students.find(
      (row) => row.studentId === authIntegrationFixtures.studentOne.userId,
    )

    if (!studentOneRow) {
      throw new Error("Expected Student One to exist in the corrected math session.")
    }

    const patchResponse = await request("PATCH", `/sessions/${created.id}/attendance`, {
      token: teacherSession.tokens.accessToken,
      payload: {
        changes: [
          {
            attendanceRecordId: studentOneRow.attendanceRecordId,
            status: "PRESENT",
          },
        ],
      },
    })

    expect(patchResponse.statusCode).toBe(200)
    const patchResult = updateAttendanceSessionAttendanceResponseSchema.parse(patchResponse.body)
    expect(patchResult.appliedChangeCount).toBe(1)
    expect(patchResult.session.presentCount).toBe(1)
    expect(patchResult.session.absentCount).toBe(3)

    const [
      historyResponse,
      subjectwiseResponse,
      teacherPercentagesResponse,
      studentDetailResponse,
    ] = await Promise.all([
      request("GET", "/sessions", {
        token: teacherSession.tokens.accessToken,
      }),
      request(
        "GET",
        `/reports/subjectwise?classroomId=${developmentSeedIds.courseOfferings.math}`,
        {
          token: teacherSession.tokens.accessToken,
        },
      ),
      request(
        "GET",
        `/reports/students/percentages?classroomId=${developmentSeedIds.courseOfferings.math}&subjectId=${developmentSeedIds.academic.mathSubject}`,
        {
          token: teacherSession.tokens.accessToken,
        },
      ),
      request("GET", `/students/me/reports/subjects/${developmentSeedIds.academic.mathSubject}`, {
        token: studentSession.tokens.accessToken,
      }),
    ])

    expect(historyResponse.statusCode).toBe(200)
    expect(subjectwiseResponse.statusCode).toBe(200)
    expect(teacherPercentagesResponse.statusCode).toBe(200)
    expect(studentDetailResponse.statusCode).toBe(200)

    const history = attendanceSessionHistoryResponseSchema.parse(historyResponse.body)
    const subjectwise = teacherSubjectwiseAttendanceReportResponseSchema.parse(
      subjectwiseResponse.body,
    )
    const teacherPercentages = teacherStudentAttendancePercentageReportResponseSchema.parse(
      teacherPercentagesResponse.body,
    )
    const studentDetail = studentSubjectReportDetailSchema.parse(studentDetailResponse.body)
    const historyRow = history.find((row) => row.id === created.id)
    const mathSubjectRow = subjectwise.find(
      (row) => row.classroomId === developmentSeedIds.courseOfferings.math,
    )
    const teacherStudentRow = teacherPercentages.find(
      (row) => row.studentId === authIntegrationFixtures.studentOne.userId,
    )
    const studentClassroomRow = studentDetail.classrooms.find(
      (row) => row.classroomId === developmentSeedIds.courseOfferings.math,
    )

    expect(historyRow).toMatchObject({
      id: created.id,
      presentCount: 1,
      absentCount: 3,
    })
    expect(mathSubjectRow).toMatchObject({
      classroomId: developmentSeedIds.courseOfferings.math,
      totalSessions: 2,
      presentCount: 4,
      absentCount: 4,
      attendancePercentage: 50,
    })
    expect(teacherStudentRow).toMatchObject({
      studentId: authIntegrationFixtures.studentOne.userId,
      classroomId: developmentSeedIds.courseOfferings.math,
      totalSessions: 2,
      presentSessions: 2,
      absentSessions: 0,
      attendancePercentage: 100,
    })
    expect(studentClassroomRow).toMatchObject({
      classroomId: developmentSeedIds.courseOfferings.math,
      totalSessions: 2,
      presentSessions: 2,
      absentSessions: 0,
      attendancePercentage: 100,
    })
  }, 15_000)

  it("enforces teacher and student report access boundaries", async () => {
    const studentSession = await login({
      email: authIntegrationFixtures.studentOne.email,
      password: authIntegrationFixtures.studentOne.password,
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: authIntegrationFixtures.studentOne.device,
    })
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })
    const foreignTeacherSession = await login({
      email: "foreign.teacher@attendease.dev",
      password: "ForeignTeacherPass123!",
      platform: "WEB",
      requestedRole: "TEACHER",
    })

    const [studentOnTeacherRoute, teacherOnStudentRoute, foreignTeacherOnClassroom] =
      await Promise.all([
        request("GET", "/reports/daywise", {
          token: studentSession.tokens.accessToken,
        }),
        request("GET", "/students/me/reports/overview", {
          token: teacherSession.tokens.accessToken,
        }),
        request("GET", `/reports/daywise?classroomId=${developmentSeedIds.courseOfferings.math}`, {
          token: foreignTeacherSession.tokens.accessToken,
        }),
      ])

    expect(studentOnTeacherRoute.statusCode).toBe(403)
    expect(teacherOnStudentRoute.statusCode).toBe(403)
    expect(foreignTeacherOnClassroom.statusCode).toBe(403)
    expect(foreignTeacherOnClassroom.body).toMatchObject({
      message: "The teacher cannot manage the requested course offering.",
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

  async function createQrSession(token: string) {
    const response = await request("POST", "/sessions/qr", {
      token,
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

  async function request(
    method: "GET" | "POST" | "PATCH",
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

    const headers: Record<string, string> = {
      ...(options.headers ?? {}),
    }

    if (options.token) {
      headers.authorization = `Bearer ${options.token}`
    }

    const response = await app.inject({
      method,
      url: path,
      headers,
      ...(options.payload !== undefined
        ? { payload: options.payload as Record<string, unknown> | string }
        : {}),
    })

    return {
      statusCode: response.statusCode,
      body: response.body ? JSON.parse(response.body) : null,
    }
  }
})
