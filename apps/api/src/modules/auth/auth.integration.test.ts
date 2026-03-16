import {
  authMeResponseSchema,
  authOperationSuccessSchema,
  authSessionResponseSchema,
  enrollmentSummarySchema,
  enrollmentsResponseSchema,
  studentRegistrationResponseSchema,
  teacherAssignmentSummarySchema,
  teacherAssignmentsResponseSchema,
  teacherRegistrationResponseSchema,
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
import { GoogleOidcService } from "./google-oidc.service.js"

describe("Auth integration", () => {
  const originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
    AUTH_ACCESS_TOKEN_SECRET: process.env.AUTH_ACCESS_TOKEN_SECRET,
    AUTH_ISSUER: process.env.AUTH_ISSUER,
    AUTH_AUDIENCE: process.env.AUTH_AUDIENCE,
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
    database = await createTemporaryDatabase()
    await seedAuthIntegrationData(database.databaseUrl)

    process.env.NODE_ENV = "test"
    process.env.TEST_DATABASE_URL = database.databaseUrl
    process.env.AUTH_ACCESS_TOKEN_SECRET = "attendease-auth-integration-secret-1234567890"
    process.env.AUTH_ISSUER = "attendease-api-test"
    process.env.AUTH_AUDIENCE = "attendease-client-test"
    process.env.GOOGLE_TEACHER_ALLOWED_DOMAINS = "attendease.dev"
    process.env.GOOGLE_STUDENT_ALLOWED_DOMAINS = "attendease.dev"

    prisma = createPrismaClient({
      databaseUrl: database.databaseUrl,
      singleton: false,
    })

    googleOidcService.verifyExchange.mockImplementation(async (request: { idToken?: string }) => {
      if (request.idToken === "teacher-google-token") {
        return authIntegrationFixtures.googleTeacherIdentity
      }

      if (request.idToken === "blocked-domain-token") {
        return {
          ...authIntegrationFixtures.googleTeacherIdentity,
          providerSubject: "teacher-google-subject-blocked",
          email: "teacher@outside.example",
          hostedDomain: "outside.example",
        }
      }

      throw new Error("Unexpected Google test token.")
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
    process.env.GOOGLE_TEACHER_ALLOWED_DOMAINS = originalEnv.GOOGLE_TEACHER_ALLOWED_DOMAINS
    process.env.GOOGLE_STUDENT_ALLOWED_DOMAINS = originalEnv.GOOGLE_STUDENT_ALLOWED_DOMAINS

    if (database) {
      await destroyTemporaryDatabase(database)
    }
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("logs in a teacher, returns session context, and protects student-only routes", async () => {
    const loginResponse = await request("POST", "/auth/login", {
      payload: {
        email: authIntegrationFixtures.teacher.email,
        password: authIntegrationFixtures.teacher.password,
        platform: "WEB",
        requestedRole: "TEACHER",
      },
    })

    expect(loginResponse.statusCode).toBe(201)
    const teacherSession = authSessionResponseSchema.parse(loginResponse.body)

    expect(teacherSession.user.activeRole).toBe("TEACHER")
    expect(teacherSession.user.deviceTrust.state).toBe("NOT_REQUIRED")

    const meResponse = await request("GET", "/auth/me", {
      token: teacherSession.tokens.accessToken,
    })
    const me = authMeResponseSchema.parse(meResponse.body)

    expect(meResponse.statusCode).toBe(200)
    expect(me.assignments.length).toBeGreaterThan(0)
    expect(me.enrollments).toHaveLength(0)

    const assignmentsResponse = await request("GET", "/academic/assignments/me", {
      token: teacherSession.tokens.accessToken,
    })
    expect(assignmentsResponse.statusCode).toBe(200)
    const assignments = teacherAssignmentsResponseSchema.parse(assignmentsResponse.body)
    expect(assignments.length).toBeGreaterThan(0)
    expect(assignments[0]).toMatchObject({
      semesterCode: "SEM6-2026",
      classCode: "BTECH-CSE-2023",
      sectionCode: "A",
      subjectCode: "MATH101",
    })

    const filteredAssignmentsResponse = await request(
      "GET",
      `/academic/assignments/me?subjectId=${assignments[0]?.subjectId ?? ""}`,
      {
        token: teacherSession.tokens.accessToken,
      },
    )
    expect(filteredAssignmentsResponse.statusCode).toBe(200)
    expect(teacherAssignmentsResponseSchema.parse(filteredAssignmentsResponse.body)).toHaveLength(1)

    const assignmentDetailResponse = await request(
      "GET",
      `/academic/assignments/me/${assignments[0]?.id ?? ""}`,
      {
        token: teacherSession.tokens.accessToken,
      },
    )
    expect(assignmentDetailResponse.statusCode).toBe(200)
    expect(teacherAssignmentSummarySchema.parse(assignmentDetailResponse.body).id).toBe(
      assignments[0]?.id,
    )

    const enrollmentsResponse = await request("GET", "/academic/enrollments/me", {
      token: teacherSession.tokens.accessToken,
    })
    expect(enrollmentsResponse.statusCode).toBe(403)
  })

  it("logs in an admin without trusted-device friction and returns admin-only me context", async () => {
    const loginResponse = await request("POST", "/auth/login", {
      payload: {
        email: authIntegrationFixtures.admin.email,
        password: authIntegrationFixtures.admin.password,
        platform: "WEB",
        requestedRole: "ADMIN",
      },
    })

    expect(loginResponse.statusCode).toBe(201)
    const adminSession = authSessionResponseSchema.parse(loginResponse.body)

    expect(adminSession.user.activeRole).toBe("ADMIN")
    expect(adminSession.user.deviceTrust.state).toBe("NOT_REQUIRED")

    const meResponse = await request("GET", "/auth/me", {
      token: adminSession.tokens.accessToken,
    })
    const me = authMeResponseSchema.parse(meResponse.body)

    expect(meResponse.statusCode).toBe(200)
    expect(me.user.activeRole).toBe("ADMIN")
    expect(me.user.deviceTrust.state).toBe("NOT_REQUIRED")
    expect(me.assignments).toHaveLength(0)
    expect(me.enrollments).toHaveLength(0)
  })

  it("registers a student, binds the first device, and opens a trusted mobile session", async () => {
    const email = `student.reset.${Date.now()}@attendease.dev`
    const installId = `install-reset-${Date.now()}`

    const registrationResponse = await request("POST", "/auth/register/student", {
      payload: {
        email,
        password: "StudentResetPass123!",
        displayName: "Student Reset",
        platform: "MOBILE",
        device: {
          installId,
          platform: "ANDROID",
          publicKey: "student-reset-public-key-1234567890",
          appVersion: "1.0.0",
          deviceModel: "Pixel Test",
          osVersion: "Android 15",
        },
      },
    })

    expect(registrationResponse.statusCode).toBe(201)
    const registeredStudent = studentRegistrationResponseSchema.parse(registrationResponse.body)

    expect(registeredStudent.user.activeRole).toBe("STUDENT")
    expect(registeredStudent.user.deviceTrust.state).toBe("TRUSTED")
    expect(registeredStudent.onboarding.recommendedNextStep).toBe("JOIN_CLASSROOM")

    const meResponse = await request("GET", "/auth/me", {
      token: registeredStudent.tokens.accessToken,
    })
    const me = authMeResponseSchema.parse(meResponse.body)

    expect(meResponse.statusCode).toBe(200)
    expect(me.user.email).toBe(email)
    expect(me.enrollments).toHaveLength(0)

    const createdUser = await getPrisma().user.findUnique({
      where: {
        email,
      },
      include: {
        credentials: true,
        roles: true,
        studentProfile: true,
      },
    })

    expect(createdUser?.status).toBe("ACTIVE")
    expect(createdUser?.credentials?.passwordHash).toBeTruthy()
    expect(createdUser?.roles.map((role) => role.role)).toEqual(["STUDENT"])
    expect(createdUser?.studentProfile).toBeTruthy()
    expect(createdUser).toBeTruthy()

    const createdDevice = await getPrisma().device.findUnique({
      where: {
        installId,
      },
    })
    expect(createdDevice).toBeTruthy()

    if (!createdUser || !createdDevice) {
      throw new Error("Expected student registration to persist user and device records.")
    }

    const createdBinding = await getPrisma().userDeviceBinding.findFirst({
      where: {
        userId: createdUser.id,
        deviceId: createdDevice.id,
        bindingType: "STUDENT_ATTENDANCE",
        status: "ACTIVE",
      },
    })
    expect(createdBinding).toBeTruthy()

    if (!createdBinding) {
      throw new Error("Expected student registration to persist an active device binding.")
    }

    const createdSession = await getPrisma().authSession.findUnique({
      where: {
        id: registeredStudent.user.sessionId,
      },
    })
    const deviceBoundEvent = await getPrisma().securityEvent.findFirst({
      where: {
        userId: createdUser.id,
        bindingId: createdBinding.id,
        eventType: "DEVICE_BOUND",
      },
    })

    expect(createdDevice.id).toBe(registeredStudent.user.deviceTrust.deviceId)
    expect(createdBinding.id).toBe(registeredStudent.user.deviceTrust.bindingId)
    expect(createdSession?.deviceId).toBe(createdDevice.id)
    expect(deviceBoundEvent).toBeTruthy()
  })

  it("registers a teacher on web and opens a teacher-owned session without device friction", async () => {
    const email = `teacher.reset.${Date.now()}@attendease.dev`

    const registrationResponse = await request("POST", "/auth/register/teacher", {
      payload: {
        email,
        password: "TeacherResetPass123!",
        displayName: "Teacher Reset",
        platform: "WEB",
      },
    })

    expect(registrationResponse.statusCode).toBe(201)
    const teacherSession = teacherRegistrationResponseSchema.parse(registrationResponse.body)

    expect(teacherSession.user.activeRole).toBe("TEACHER")
    expect(teacherSession.user.deviceTrust.state).toBe("NOT_REQUIRED")
    expect(teacherSession.onboarding.recommendedNextStep).toBe("OPEN_HOME")

    const meResponse = await request("GET", "/auth/me", {
      token: teacherSession.tokens.accessToken,
    })
    const me = authMeResponseSchema.parse(meResponse.body)

    expect(meResponse.statusCode).toBe(200)
    expect(me.user.email).toBe(email)
    expect(me.assignments).toHaveLength(0)
    expect(me.enrollments).toHaveLength(0)

    const assignmentsResponse = await request("GET", "/academic/assignments/me", {
      token: teacherSession.tokens.accessToken,
    })

    expect(assignmentsResponse.statusCode).toBe(200)
    expect(teacherAssignmentsResponseSchema.parse(assignmentsResponse.body)).toHaveLength(0)

    const createdUser = await getPrisma().user.findUnique({
      where: {
        email,
      },
      include: {
        credentials: true,
        roles: true,
        teacherProfile: true,
      },
    })

    expect(createdUser?.status).toBe("ACTIVE")
    expect(createdUser?.credentials?.passwordHash).toBeTruthy()
    expect(createdUser?.roles.map((role) => role.role)).toEqual(["TEACHER"])
    expect(createdUser?.teacherProfile).toBeTruthy()

    const createdSession = await getPrisma().authSession.findUnique({
      where: {
        id: teacherSession.user.sessionId,
      },
    })

    expect(createdSession?.deviceId).toBeNull()
  })

  it("registers a teacher on mobile with an optional device and keeps trust non-blocking", async () => {
    const suffix = Date.now()
    const email = `teacher.mobile.${suffix}@attendease.dev`
    const installId = `install-teacher-${suffix}`

    const registrationResponse = await request("POST", "/auth/register/teacher", {
      payload: {
        email,
        password: "TeacherResetPass123!",
        displayName: "Teacher Mobile",
        platform: "MOBILE",
        device: {
          installId,
          platform: "ANDROID",
          publicKey: "teacher-mobile-public-key-1234567890",
        },
      },
    })

    expect(registrationResponse.statusCode).toBe(201)
    const teacherSession = teacherRegistrationResponseSchema.parse(registrationResponse.body)

    expect(teacherSession.user.platform).toBe("MOBILE")
    expect(teacherSession.user.deviceTrust.state).toBe("NOT_REQUIRED")

    const createdDevice = await getPrisma().device.findUnique({
      where: {
        installId,
      },
    })
    const createdSession = await getPrisma().authSession.findUnique({
      where: {
        id: teacherSession.user.sessionId,
      },
    })
    const createdBindings = await getPrisma().userDeviceBinding.count({
      where: {
        userId: teacherSession.user.id,
      },
    })

    expect(createdDevice?.id).toBeTruthy()
    expect(createdSession?.deviceId).toBe(createdDevice?.id ?? null)
    expect(createdBindings).toBe(0)
  })

  it("rejects duplicate teacher registration email addresses cleanly", async () => {
    const response = await request("POST", "/auth/register/teacher", {
      payload: {
        email: authIntegrationFixtures.teacher.email,
        password: "TeacherResetPass123!",
        displayName: "Duplicate Teacher",
        platform: "WEB",
      },
    })

    expect(response.statusCode).toBe(409)
  })

  it("keeps admin provisioning private by leaving public admin registration unavailable", async () => {
    const email = `admin.public.${Date.now()}@attendease.dev`

    const response = await request("POST", "/auth/register/admin", {
      payload: {
        email,
        password: "AdminResetPass123!",
        displayName: "Admin Public",
        platform: "WEB",
      },
    })

    expect(response.statusCode).toBe(404)

    const createdUser = await getPrisma().user.findUnique({
      where: {
        email,
      },
    })

    expect(createdUser).toBeNull()
  })

  it("logs in a student on a trusted device and protects teacher-only routes", async () => {
    const loginResponse = await request("POST", "/auth/login", {
      payload: {
        email: authIntegrationFixtures.studentOne.email,
        password: authIntegrationFixtures.studentOne.password,
        platform: "MOBILE",
        requestedRole: "STUDENT",
        device: authIntegrationFixtures.studentOne.device,
      },
    })

    expect(loginResponse.statusCode).toBe(201)
    const studentSession = authSessionResponseSchema.parse(loginResponse.body)

    expect(studentSession.user.activeRole).toBe("STUDENT")
    expect(studentSession.user.deviceTrust.state).toBe("TRUSTED")

    const meResponse = await request("GET", "/auth/me", {
      token: studentSession.tokens.accessToken,
    })
    const me = authMeResponseSchema.parse(meResponse.body)

    expect(meResponse.statusCode).toBe(200)
    expect(me.assignments).toHaveLength(0)
    expect(me.enrollments.length).toBeGreaterThan(0)

    const enrollmentsResponse = await request("GET", "/academic/enrollments/me", {
      token: studentSession.tokens.accessToken,
    })
    expect(enrollmentsResponse.statusCode).toBe(200)
    const enrollments = enrollmentsResponseSchema.parse(enrollmentsResponse.body)
    expect(enrollments.length).toBeGreaterThan(0)

    const filteredEnrollmentsResponse = await request(
      "GET",
      `/academic/enrollments/me?courseOfferingId=${enrollments[0]?.courseOfferingId ?? ""}`,
      {
        token: studentSession.tokens.accessToken,
      },
    )
    expect(filteredEnrollmentsResponse.statusCode).toBe(200)
    expect(enrollmentsResponseSchema.parse(filteredEnrollmentsResponse.body)).toHaveLength(1)

    const enrollmentDetailResponse = await request(
      "GET",
      `/academic/enrollments/me/${enrollments[0]?.id ?? ""}`,
      {
        token: studentSession.tokens.accessToken,
      },
    )
    expect(enrollmentDetailResponse.statusCode).toBe(200)
    expect(enrollmentSummarySchema.parse(enrollmentDetailResponse.body).id).toBe(enrollments[0]?.id)

    const assignmentsResponse = await request("GET", "/academic/assignments/me", {
      token: studentSession.tokens.accessToken,
    })
    expect(assignmentsResponse.statusCode).toBe(403)

    const foreignEnrollmentResponse = await request(
      "GET",
      `/academic/enrollments/me/${developmentSeedIds.enrollments.math.studentTwo}`,
      {
        token: studentSession.tokens.accessToken,
      },
    )
    expect(foreignEnrollmentResponse.statusCode).toBe(404)
  })

  it("rejects incomplete student registration payloads before creating an account", async () => {
    const email = `student.missing-device.${Date.now()}@attendease.dev`

    const response = await request("POST", "/auth/register/student", {
      payload: {
        email,
        password: "StudentResetPass123!",
        displayName: "Student Missing Device",
        platform: "MOBILE",
      },
    })

    expect(response.statusCode).toBe(400)

    const createdUser = await getPrisma().user.findUnique({
      where: {
        email,
      },
    })

    expect(createdUser).toBeNull()
  })

  it("rejects duplicate student registration email addresses cleanly", async () => {
    const response = await request("POST", "/auth/register/student", {
      payload: {
        email: authIntegrationFixtures.studentOne.email,
        password: "StudentResetPass123!",
        displayName: "Duplicate Student",
        platform: "MOBILE",
        device: {
          installId: `install-duplicate-${Date.now()}`,
          platform: "ANDROID",
          publicKey: "student-duplicate-public-key-1234567890",
        },
      },
    })

    expect(response.statusCode).toBe(409)
  })

  it("blocks student self-registration on a device that is already bound to another student", async () => {
    const blockedEmail = `student.bound-device.${Date.now()}@attendease.dev`
    const boundDevice = await getPrisma().device.findUniqueOrThrow({
      where: {
        installId: authIntegrationFixtures.studentOne.device.installId,
      },
    })
    const beforeCount = await getPrisma().securityEvent.count({
      where: {
        eventType: "MULTI_ACCOUNT_SAME_DEVICE_ATTEMPT",
        deviceId: boundDevice.id,
        userId: null,
      },
    })

    const response = await request("POST", "/auth/register/student", {
      payload: {
        email: blockedEmail,
        password: "StudentResetPass123!",
        displayName: "Blocked Device Student",
        platform: "MOBILE",
        device: authIntegrationFixtures.studentOne.device,
      },
    })

    expect(response.statusCode).toBe(403)

    const afterCount = await getPrisma().securityEvent.count({
      where: {
        eventType: "MULTI_ACCOUNT_SAME_DEVICE_ATTEMPT",
        deviceId: boundDevice.id,
        userId: null,
      },
    })
    const createdUser = await getPrisma().user.findUnique({
      where: {
        email: blockedEmail,
      },
    })

    expect(afterCount).toBe(beforeCount + 1)
    expect(createdUser).toBeNull()
  })

  it.each(["PENDING", "BLOCKED"] as const)(
    "blocks student self-registration on a device already marked %s in device recovery",
    async (status) => {
      const email = `student.${status.toLowerCase()}.${Date.now()}@attendease.dev`
      const installId = `install-${status.toLowerCase()}-${Date.now()}`
      const device = await getPrisma().device.create({
        data: {
          installId,
          platform: "ANDROID",
          publicKey: `public-key-${status.toLowerCase()}-${Date.now()}`,
          appVersion: "1.0.0",
          deviceModel: "Pixel Test",
          osVersion: "Android 15",
        },
      })

      await getPrisma().userDeviceBinding.create({
        data: {
          userId: authIntegrationFixtures.studentOne.userId,
          deviceId: device.id,
          bindingType: "STUDENT_ATTENDANCE",
          status,
          ...(status === "BLOCKED"
            ? {
                revokedAt: new Date("2026-03-15T08:30:00.000Z"),
                revokeReason: "Support review hold",
              }
            : {}),
        },
      })

      const response = await request("POST", "/auth/register/student", {
        payload: {
          email,
          password: "StudentResetPass123!",
          displayName: `Student ${status}`,
          platform: "MOBILE",
          device: {
            installId,
            platform: "ANDROID",
            publicKey: device.publicKey,
          },
        },
      })

      expect(response.statusCode).toBe(403)

      const createdUser = await getPrisma().user.findUnique({
        where: {
          email,
        },
      })

      expect(createdUser).toBeNull()
    },
  )

  it("requires device registration for student authentication", async () => {
    const response = await request("POST", "/auth/login", {
      payload: {
        email: authIntegrationFixtures.studentOne.email,
        password: authIntegrationFixtures.studentOne.password,
        platform: "MOBILE",
        requestedRole: "STUDENT",
      },
    })

    expect(response.statusCode).toBe(403)
  })

  it("blocks a second student from opening a session on an already bound device", async () => {
    const beforeCount = await getPrisma().securityEvent.count({
      where: {
        eventType: "MULTI_ACCOUNT_SAME_DEVICE_ATTEMPT",
        userId: authIntegrationFixtures.studentTwo.userId,
      },
    })

    const response = await request("POST", "/auth/login", {
      payload: {
        email: authIntegrationFixtures.studentTwo.email,
        password: authIntegrationFixtures.studentTwo.password,
        platform: "MOBILE",
        requestedRole: "STUDENT",
        device: authIntegrationFixtures.studentOne.device,
      },
    })

    expect(response.statusCode).toBe(403)

    const afterCount = await getPrisma().securityEvent.count({
      where: {
        eventType: "MULTI_ACCOUNT_SAME_DEVICE_ATTEMPT",
        userId: authIntegrationFixtures.studentTwo.userId,
      },
    })

    expect(afterCount).toBe(beforeCount + 1)
  })

  it("rotates refresh tokens and invalidates the session on logout", async () => {
    const loginResponse = await request("POST", "/auth/login", {
      payload: {
        email: authIntegrationFixtures.teacher.email,
        password: authIntegrationFixtures.teacher.password,
        platform: "WEB",
        requestedRole: "TEACHER",
      },
    })
    const teacherSession = authSessionResponseSchema.parse(loginResponse.body)

    const refreshResponse = await request("POST", "/auth/refresh", {
      payload: {
        refreshToken: teacherSession.tokens.refreshToken,
        requestedRole: "TEACHER",
      },
    })

    expect(refreshResponse.statusCode).toBe(201)
    const refreshedSession = authSessionResponseSchema.parse(refreshResponse.body)

    expect(refreshedSession.tokens.refreshToken).not.toBe(teacherSession.tokens.refreshToken)

    const staleRefreshResponse = await request("POST", "/auth/refresh", {
      payload: {
        refreshToken: teacherSession.tokens.refreshToken,
      },
    })
    expect(staleRefreshResponse.statusCode).toBe(401)

    const logoutResponse = await request("POST", "/auth/logout", {
      token: refreshedSession.tokens.accessToken,
      payload: {
        refreshToken: refreshedSession.tokens.refreshToken,
      },
    })

    expect(logoutResponse.statusCode).toBe(201)
    expect(authOperationSuccessSchema.parse(logoutResponse.body)).toEqual({ success: true })

    const meAfterLogoutResponse = await request("GET", "/auth/me", {
      token: refreshedSession.tokens.accessToken,
    })
    expect(meAfterLogoutResponse.statusCode).toBe(401)

    const sessionRecord = await getPrisma().authSession.findUnique({
      where: {
        id: refreshedSession.user.sessionId,
      },
    })

    expect(sessionRecord?.status).toBe("REVOKED")
  })

  it("rejects refresh-token role escalation outside the assigned role set", async () => {
    const loginResponse = await request("POST", "/auth/login", {
      payload: {
        email: authIntegrationFixtures.teacher.email,
        password: authIntegrationFixtures.teacher.password,
        platform: "WEB",
        requestedRole: "TEACHER",
      },
    })
    const teacherSession = authSessionResponseSchema.parse(loginResponse.body)

    const refreshResponse = await request("POST", "/auth/refresh", {
      payload: {
        refreshToken: teacherSession.tokens.refreshToken,
        requestedRole: "STUDENT",
      },
    })

    expect(refreshResponse.statusCode).toBe(403)
  })

  it("supports allowed Google teacher exchange and rejects disallowed teacher domains", async () => {
    const allowedResponse = await request("POST", "/auth/google/exchange", {
      payload: {
        idToken: "teacher-google-token",
        platform: "WEB",
        requestedRole: "TEACHER",
      },
    })

    expect(allowedResponse.statusCode).toBe(201)
    const allowedSession = authSessionResponseSchema.parse(allowedResponse.body)
    expect(allowedSession.user.email).toBe(authIntegrationFixtures.googleTeacherIdentity.email)

    const blockedResponse = await request("POST", "/auth/google/exchange", {
      payload: {
        idToken: "blocked-domain-token",
        platform: "WEB",
        requestedRole: "TEACHER",
      },
    })

    expect(blockedResponse.statusCode).toBe(403)

    const blockedUser = await getPrisma().user.findUnique({
      where: {
        email: "teacher@outside.example",
      },
    })

    expect(blockedUser).toBeNull()
    expect(googleOidcService.verifyExchange).toHaveBeenCalledTimes(2)
  })

  it("rejects Google exchange identities whose email is not verified", async () => {
    googleOidcService.verifyExchange.mockResolvedValueOnce({
      ...authIntegrationFixtures.googleTeacherIdentity,
      providerSubject: "teacher-google-unverified",
      emailVerified: false,
    })

    const response = await request("POST", "/auth/google/exchange", {
      payload: {
        idToken: "teacher-google-token",
        platform: "WEB",
        requestedRole: "TEACHER",
      },
    })

    expect(response.statusCode).toBe(401)
  })

  it("prevents teachers from reading assignments outside their own scope", async () => {
    const foreignTeacher = await getPrisma().user.create({
      data: {
        email: "teacher.two@attendease.dev",
        displayName: "Teacher Two",
        status: "ACTIVE",
        roles: {
          create: {
            role: "TEACHER",
          },
        },
        teacherProfile: {
          create: {},
        },
      },
    })

    const foreignAssignment = await getPrisma().teacherAssignment.create({
      data: {
        teacherId: foreignTeacher.id,
        semesterId: developmentSeedIds.academic.semester,
        classId: developmentSeedIds.academic.class,
        sectionId: developmentSeedIds.academic.section,
        subjectId: developmentSeedIds.academic.mathSubject,
        status: "ACTIVE",
      },
    })

    const loginResponse = await request("POST", "/auth/login", {
      payload: {
        email: authIntegrationFixtures.teacher.email,
        password: authIntegrationFixtures.teacher.password,
        platform: "WEB",
        requestedRole: "TEACHER",
      },
    })
    const teacherSession = authSessionResponseSchema.parse(loginResponse.body)

    const assignmentResponse = await request(
      "GET",
      `/academic/assignments/me/${foreignAssignment.id}`,
      {
        token: teacherSession.tokens.accessToken,
      },
    )

    expect(assignmentResponse.statusCode).toBe(404)
  })

  async function request(
    method: "GET" | "POST",
    url: string,
    options: {
      payload?: unknown
      token?: string
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
