import { hashPassword } from "@attendease/auth/password"
import {
  analyticsComparisonsResponseSchema,
  analyticsDistributionResponseSchema,
  analyticsModeUsageResponseSchema,
  analyticsSessionDrilldownResponseSchema,
  analyticsStudentTimelineResponseSchema,
  analyticsTrendResponseSchema,
  authSessionResponseSchema,
  teacherDaywiseAttendanceReportResponseSchema,
  teacherStudentAttendancePercentageReportResponseSchema,
} from "@attendease/contracts"
import {
  buildOutboxEventData,
  createPrismaClient,
  developmentSeedIds,
  disconnectPrismaClient,
} from "@attendease/db"
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify"
import { Test } from "@nestjs/testing"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { AnalyticsRefreshProcessor } from "../../../../worker/src/jobs/analytics-refresh.processor.js"
import { AppModule } from "../../app.module.js"
import {
  type TemporaryDatabase,
  authIntegrationFixtures,
  createTemporaryDatabase,
  destroyTemporaryDatabase,
  seedAuthIntegrationData,
} from "../../test/integration-helpers.js"
import { GoogleOidcService } from "../auth/google-oidc.service.js"

describe("Analytics integration", () => {
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
    database = await createTemporaryDatabase("attendease_analytics")
    await seedAuthIntegrationData(database.databaseUrl)

    process.env.NODE_ENV = "test"
    process.env.TEST_DATABASE_URL = database.databaseUrl
    process.env.AUTH_ACCESS_TOKEN_SECRET = "attendease-analytics-secret-1234567890"
    process.env.AUTH_ISSUER = "attendease-api-test"
    process.env.AUTH_AUDIENCE = "attendease-client-test"
    process.env.GOOGLE_OIDC_CLIENT_ID = "analytics-google-client"
    process.env.GOOGLE_OIDC_CLIENT_SECRET = "analytics-google-secret"
    process.env.GOOGLE_OIDC_REDIRECT_URI = "http://localhost:3000/auth/google/callback"
    process.env.GOOGLE_TEACHER_ALLOWED_DOMAINS = "attendease.dev"
    process.env.GOOGLE_STUDENT_ALLOWED_DOMAINS = "attendease.dev"

    prisma = createPrismaClient({
      databaseUrl: database.databaseUrl,
      singleton: false,
    })

    await seedAnalyticsSessions()
    await seedForeignTeacher()
    await new AnalyticsRefreshProcessor(getPrisma()).processPendingEvents(20)

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

  it("returns compact trend, comparison, and mode-usage payloads for teacher scope", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })

    const [trendsResponse, comparisonsResponse, modesResponse] = await Promise.all([
      request(
        "GET",
        "/analytics/trends?from=2026-03-01T00:00:00.000Z&to=2026-03-31T23:59:59.999Z",
        {
          token: teacherSession.tokens.accessToken,
        },
      ),
      request("GET", "/analytics/comparisons", {
        token: teacherSession.tokens.accessToken,
      }),
      request("GET", "/analytics/modes", {
        token: teacherSession.tokens.accessToken,
      }),
    ])

    expect(trendsResponse.statusCode).toBe(200)
    expect(comparisonsResponse.statusCode).toBe(200)
    expect(modesResponse.statusCode).toBe(200)

    const trends = analyticsTrendResponseSchema.parse(trendsResponse.body)
    const comparisons = analyticsComparisonsResponseSchema.parse(comparisonsResponse.body)
    const modes = analyticsModeUsageResponseSchema.parse(modesResponse.body)

    expect(trends.weekly[0]).toMatchObject({
      sessionCount: 3,
      presentCount: 6,
      absentCount: 4,
      attendancePercentage: 60,
    })
    expect(trends.monthly[0]?.periodKey).toBe("2026-03")
    expect(comparisons.classrooms).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          classroomId: developmentSeedIds.courseOfferings.math,
          totalSessions: 2,
          presentCount: 5,
          absentCount: 3,
          attendancePercentage: 62.5,
        }),
        expect.objectContaining({
          classroomId: developmentSeedIds.courseOfferings.physics,
          totalSessions: 1,
          presentCount: 1,
          absentCount: 1,
          attendancePercentage: 50,
        }),
      ]),
    )
    expect(comparisons.subjects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subjectId: developmentSeedIds.academic.mathSubject,
          totalSessions: 2,
        }),
        expect.objectContaining({
          subjectId: developmentSeedIds.academic.physicsSubject,
          totalSessions: 1,
        }),
      ]),
    )
    expect(modes.totals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          mode: "QR_GPS",
          sessionCount: 2,
          markedCount: 4,
        }),
        expect.objectContaining({
          mode: "BLUETOOTH",
          sessionCount: 1,
          markedCount: 2,
        }),
      ]),
    )
  })

  it("builds distribution buckets from the same finalized attendance truth as teacher reports", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })

    const response = await request(
      "GET",
      `/analytics/distribution?classroomId=${developmentSeedIds.courseOfferings.math}`,
      {
        token: teacherSession.tokens.accessToken,
      },
    )

    expect(response.statusCode).toBe(200)

    const distribution = analyticsDistributionResponseSchema.parse(response.body)

    expect(distribution).toEqual({
      totalStudents: 4,
      buckets: [
        {
          bucket: "ABOVE_90",
          label: "Above 90%",
          studentCount: 2,
        },
        {
          bucket: "BETWEEN_75_AND_90",
          label: "75% to 90%",
          studentCount: 0,
        },
        {
          bucket: "BELOW_75",
          label: "Below 75%",
          studentCount: 2,
        },
      ],
    })
  })

  it("keeps analytics distribution and classroom comparisons aligned with reporting truth", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })

    const [distributionResponse, comparisonsResponse, percentagesResponse, daywiseResponse] =
      await Promise.all([
        request(
          "GET",
          `/analytics/distribution?classroomId=${developmentSeedIds.courseOfferings.math}`,
          {
            token: teacherSession.tokens.accessToken,
          },
        ),
        request(
          "GET",
          "/analytics/comparisons?from=2026-03-01T00:00:00.000Z&to=2026-03-31T23:59:59.999Z",
          {
            token: teacherSession.tokens.accessToken,
          },
        ),
        request(
          "GET",
          `/reports/students/percentages?classroomId=${developmentSeedIds.courseOfferings.math}`,
          {
            token: teacherSession.tokens.accessToken,
          },
        ),
        request(
          "GET",
          `/reports/daywise?classroomId=${developmentSeedIds.courseOfferings.math}&from=2026-03-01T00:00:00.000Z&to=2026-03-31T23:59:59.999Z`,
          {
            token: teacherSession.tokens.accessToken,
          },
        ),
      ])

    expect(distributionResponse.statusCode).toBe(200)
    expect(comparisonsResponse.statusCode).toBe(200)
    expect(percentagesResponse.statusCode).toBe(200)
    expect(daywiseResponse.statusCode).toBe(200)

    const distribution = analyticsDistributionResponseSchema.parse(distributionResponse.body)
    const comparisons = analyticsComparisonsResponseSchema.parse(comparisonsResponse.body)
    const percentageRows = teacherStudentAttendancePercentageReportResponseSchema.parse(
      percentagesResponse.body,
    )
    const daywiseRows = teacherDaywiseAttendanceReportResponseSchema.parse(daywiseResponse.body)

    const expectedBuckets = {
      ABOVE_90: percentageRows.filter((row) => row.attendancePercentage > 90).length,
      BETWEEN_75_AND_90: percentageRows.filter(
        (row) => row.attendancePercentage >= 75 && row.attendancePercentage <= 90,
      ).length,
      BELOW_75: percentageRows.filter((row) => row.attendancePercentage < 75).length,
    }
    const actualBuckets = Object.fromEntries(
      distribution.buckets.map((bucket) => [bucket.bucket, bucket.studentCount]),
    )
    const mathComparison = comparisons.classrooms.find(
      (row) => row.classroomId === developmentSeedIds.courseOfferings.math,
    )
    const daywiseTotals = daywiseRows.reduce(
      (summary, row) => ({
        totalSessions: summary.totalSessions + row.sessionCount,
        presentCount: summary.presentCount + row.presentCount,
        absentCount: summary.absentCount + row.absentCount,
      }),
      {
        totalSessions: 0,
        presentCount: 0,
        absentCount: 0,
      },
    )

    expect(actualBuckets).toEqual(expectedBuckets)
    expect(mathComparison).toMatchObject({
      classroomId: developmentSeedIds.courseOfferings.math,
      totalSessions: daywiseTotals.totalSessions,
      presentCount: daywiseTotals.presentCount,
      absentCount: daywiseTotals.absentCount,
    })
  })

  it("returns student timeline and session drill-down data from finalized attendance truth", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })

    const [timelineResponse, drilldownResponse] = await Promise.all([
      request("GET", `/analytics/students/${authIntegrationFixtures.studentOne.userId}/timeline`, {
        token: teacherSession.tokens.accessToken,
      }),
      request("GET", `/analytics/sessions/${developmentSeedIds.sessions.mathCompleted}/detail`, {
        token: teacherSession.tokens.accessToken,
      }),
    ])

    expect(timelineResponse.statusCode).toBe(200)
    expect(drilldownResponse.statusCode).toBe(200)

    const timeline = analyticsStudentTimelineResponseSchema.parse(timelineResponse.body)
    const drilldown = analyticsSessionDrilldownResponseSchema.parse(drilldownResponse.body)

    expect(timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sessionId: developmentSeedIds.sessions.mathCompleted,
          classroomId: developmentSeedIds.courseOfferings.math,
          attendanceStatus: "PRESENT",
        }),
        expect.objectContaining({
          sessionId: "seed_attendance_session_math_bluetooth_analytics",
          classroomId: developmentSeedIds.courseOfferings.math,
          mode: "BLUETOOTH",
          attendanceStatus: "PRESENT",
        }),
        expect.objectContaining({
          sessionId: "seed_attendance_session_physics_analytics",
          classroomId: developmentSeedIds.courseOfferings.physics,
          attendanceStatus: "PRESENT",
        }),
      ]),
    )
    expect(drilldown.session.id).toBe(developmentSeedIds.sessions.mathCompleted)
    expect(drilldown.students).toHaveLength(4)
  })

  it("enforces analytics access control for student and foreign-teacher contexts", async () => {
    const [studentSession, foreignTeacherSession] = await Promise.all([
      login({
        email: authIntegrationFixtures.studentOne.email,
        password: authIntegrationFixtures.studentOne.password,
        platform: "MOBILE",
        requestedRole: "STUDENT",
        device: authIntegrationFixtures.studentOne.device,
      }),
      login({
        email: "foreign.teacher@attendease.dev",
        password: "ForeignTeacherPass123!",
        platform: "WEB",
        requestedRole: "TEACHER",
      }),
    ])

    const [studentOnAnalytics, foreignTeacherOnTimeline] = await Promise.all([
      request("GET", "/analytics/trends", {
        token: studentSession.tokens.accessToken,
      }),
      request(
        "GET",
        `/analytics/students/${authIntegrationFixtures.studentOne.userId}/timeline?classroomId=${developmentSeedIds.courseOfferings.math}`,
        {
          token: foreignTeacherSession.tokens.accessToken,
        },
      ),
    ])

    expect(studentOnAnalytics.statusCode).toBe(403)
    expect(foreignTeacherOnTimeline.statusCode).toBe(403)
  })

  function getPrisma() {
    if (!prisma) {
      throw new Error("Prisma client is not initialized.")
    }

    return prisma
  }

  async function seedAnalyticsSessions() {
    await getPrisma().attendanceSession.create({
      data: {
        id: "seed_attendance_session_math_bluetooth_analytics",
        courseOfferingId: developmentSeedIds.courseOfferings.math,
        lectureId: developmentSeedIds.lectures.mathCompleted,
        teacherAssignmentId: developmentSeedIds.teacherAssignments.math,
        teacherId: developmentSeedIds.users.teacher,
        semesterId: developmentSeedIds.academic.semester,
        classId: developmentSeedIds.academic.class,
        sectionId: developmentSeedIds.academic.section,
        subjectId: developmentSeedIds.academic.mathSubject,
        mode: "BLUETOOTH",
        status: "ENDED",
        startedAt: new Date("2026-03-12T03:30:00.000Z"),
        scheduledEndAt: new Date("2026-03-12T03:45:00.000Z"),
        endedAt: new Date("2026-03-12T03:45:00.000Z"),
        editableUntil: new Date("2026-03-13T03:45:00.000Z"),
        rosterSnapshotCount: 4,
        presentCount: 2,
        absentCount: 2,
        bleSeed: "analytics-test-ble-seed",
        blePublicId: "analyticble1",
        bleProtocolVersion: 1,
        bluetoothRotationWindowSeconds: 10,
      },
    })
    await getPrisma().attendanceRecord.createMany({
      data: [
        {
          id: "seed_attendance_record_math_analytics_student_one",
          sessionId: "seed_attendance_session_math_bluetooth_analytics",
          enrollmentId: developmentSeedIds.enrollments.math.studentOne,
          studentId: developmentSeedIds.users.studentOne,
          status: "PRESENT",
          markSource: "BLUETOOTH",
          markedAt: new Date("2026-03-12T03:35:00.000Z"),
        },
        {
          id: "seed_attendance_record_math_analytics_student_two",
          sessionId: "seed_attendance_session_math_bluetooth_analytics",
          enrollmentId: developmentSeedIds.enrollments.math.studentTwo,
          studentId: developmentSeedIds.users.studentTwo,
          status: "PRESENT",
          markSource: "BLUETOOTH",
          markedAt: new Date("2026-03-12T03:36:00.000Z"),
        },
        {
          id: "seed_attendance_record_math_analytics_student_three",
          sessionId: "seed_attendance_session_math_bluetooth_analytics",
          enrollmentId: developmentSeedIds.enrollments.math.studentThree,
          studentId: developmentSeedIds.users.studentThree,
          status: "ABSENT",
        },
        {
          id: "seed_attendance_record_math_analytics_student_four",
          sessionId: "seed_attendance_session_math_bluetooth_analytics",
          enrollmentId: developmentSeedIds.enrollments.math.studentFour,
          studentId: developmentSeedIds.users.studentFour,
          status: "ABSENT",
        },
      ],
    })

    await getPrisma().attendanceSession.create({
      data: {
        id: "seed_attendance_session_physics_analytics",
        courseOfferingId: developmentSeedIds.courseOfferings.physics,
        lectureId: developmentSeedIds.lectures.physicsPlanned,
        teacherAssignmentId: developmentSeedIds.teacherAssignments.physics,
        teacherId: developmentSeedIds.users.teacher,
        semesterId: developmentSeedIds.academic.semester,
        classId: developmentSeedIds.academic.class,
        sectionId: developmentSeedIds.academic.section,
        subjectId: developmentSeedIds.academic.physicsSubject,
        mode: "QR_GPS",
        status: "ENDED",
        startedAt: new Date("2026-03-13T05:30:00.000Z"),
        scheduledEndAt: new Date("2026-03-13T05:45:00.000Z"),
        endedAt: new Date("2026-03-13T05:45:00.000Z"),
        editableUntil: new Date("2026-03-14T05:45:00.000Z"),
        rosterSnapshotCount: 2,
        presentCount: 1,
        absentCount: 1,
        qrSeed: "analytics-test-qr-seed",
        gpsAnchorType: "CLASSROOM_FIXED",
        gpsCenterLatitude: 28.6139,
        gpsCenterLongitude: 77.209,
        gpsRadiusMeters: 100,
        qrRotationWindowSeconds: 15,
      },
    })
    await getPrisma().attendanceRecord.createMany({
      data: [
        {
          id: "seed_attendance_record_physics_analytics_student_one",
          sessionId: "seed_attendance_session_physics_analytics",
          enrollmentId: developmentSeedIds.enrollments.physics.studentOne,
          studentId: developmentSeedIds.users.studentOne,
          status: "PRESENT",
          markSource: "QR_GPS",
          markedAt: new Date("2026-03-13T05:35:00.000Z"),
        },
        {
          id: "seed_attendance_record_physics_analytics_student_two",
          sessionId: "seed_attendance_session_physics_analytics",
          enrollmentId: developmentSeedIds.enrollments.physics.studentTwo,
          studentId: developmentSeedIds.users.studentTwo,
          status: "ABSENT",
        },
      ],
    })

    await getPrisma().outboxEvent.create({
      data: buildOutboxEventData({
        topic: "attendance.session.ended",
        aggregateType: "attendance_session",
        aggregateId: "seed_attendance_session_math_bluetooth_analytics",
        payload: {
          sessionId: "seed_attendance_session_math_bluetooth_analytics",
        },
      }),
    })
    await getPrisma().outboxEvent.create({
      data: buildOutboxEventData({
        topic: "attendance.session.ended",
        aggregateType: "attendance_session",
        aggregateId: "seed_attendance_session_physics_analytics",
        payload: {
          sessionId: "seed_attendance_session_physics_analytics",
        },
      }),
    })
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
    } = {},
  ) {
    if (!app) {
      throw new Error("Test application is not initialized.")
    }

    const response = await app.inject({
      method,
      url: path,
      headers: {
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
        ...(options.headers ?? {}),
      },
      ...(options.payload !== undefined
        ? { payload: options.payload as Record<string, unknown> }
        : {}),
    })

    return {
      statusCode: response.statusCode,
      body: response.json(),
    }
  }
})
