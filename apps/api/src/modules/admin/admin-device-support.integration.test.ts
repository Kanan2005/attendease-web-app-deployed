import { buildTrustedDeviceHeaders } from "@attendease/auth"
import {
  adminApproveReplacementDeviceResponseSchema,
  adminDelinkStudentDevicesResponseSchema,
  adminDeviceSupportDetailSchema,
  adminDeviceSupportSummariesResponseSchema,
  authOperationSuccessSchema,
  authSessionResponseSchema,
  studentRegistrationResponseSchema,
  trustedDeviceAttendanceReadyResponseSchema,
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

describe("Admin device support integration", () => {
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
    database = await createTemporaryDatabase("attendease_admin_devices")
    await seedAuthIntegrationData(database.databaseUrl)

    process.env.NODE_ENV = "test"
    process.env.TEST_DATABASE_URL = database.databaseUrl
    process.env.AUTH_ACCESS_TOKEN_SECRET = "attendease-admin-devices-secret-1234567890"
    process.env.AUTH_ISSUER = "attendease-api-test"
    process.env.AUTH_AUDIENCE = "attendease-client-test"
    process.env.GOOGLE_OIDC_CLIENT_ID = "admin-devices-test-google-client"
    process.env.GOOGLE_OIDC_CLIENT_SECRET = "admin-devices-test-google-secret"
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

  it("lists and loads student device support records for admins", async () => {
    const studentSession = await login({
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

    const listResponse = await request("GET", "/admin/device-bindings?query=student.one", {
      token: adminSession.tokens.accessToken,
    })

    expect(listResponse.statusCode).toBe(200)
    const summaries = adminDeviceSupportSummariesResponseSchema.parse(listResponse.body)
    expect(summaries).toHaveLength(1)
    expect(summaries[0]?.student.id).toBe(authIntegrationFixtures.studentOne.userId)
    expect(summaries[0]?.activeBinding?.binding.id).toBe(studentSession.user.deviceTrust.bindingId)
    expect(summaries[0]?.recovery.recommendedAction).toBe("NO_ACTION_REQUIRED")
    expect(summaries[0]?.recovery.currentDeviceLabel).toBe(
      authIntegrationFixtures.studentOne.device.installId,
    )

    const detailResponse = await request(
      "GET",
      `/admin/device-bindings/${authIntegrationFixtures.studentOne.userId}`,
      {
        token: adminSession.tokens.accessToken,
      },
    )

    expect(detailResponse.statusCode).toBe(200)
    const detail = adminDeviceSupportDetailSchema.parse(detailResponse.body)
    expect(detail.student.email).toBe(authIntegrationFixtures.studentOne.email)
    expect(detail.bindings[0]?.binding.deviceId).toBe(studentSession.user.deviceTrust.deviceId)
    expect(detail.recovery.actions.canDeregisterCurrentDevice).toBe(true)
    expect(detail.recovery.strictPolicyNote).toContain("One-device enforcement stays strict")
  })

  it("rejects teacher and student access to admin device recovery endpoints", async () => {
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

    const beforeAdminActionCount = await getPrisma().adminActionLog.count({
      where: {
        targetUserId: authIntegrationFixtures.studentTwo.userId,
      },
    })

    const teacherListResponse = await request("GET", "/admin/device-bindings", {
      token: teacherSession.tokens.accessToken,
    })
    const studentListResponse = await request("GET", "/admin/device-bindings", {
      token: studentSession.tokens.accessToken,
    })
    const teacherDelinkResponse = await request(
      "POST",
      `/admin/device-bindings/${authIntegrationFixtures.studentTwo.userId}/delink`,
      {
        token: teacherSession.tokens.accessToken,
        payload: {
          reason: "Teacher should not be allowed to run support recovery actions.",
        },
      },
    )
    const studentDelinkResponse = await request(
      "POST",
      `/admin/device-bindings/${authIntegrationFixtures.studentTwo.userId}/delink`,
      {
        token: studentSession.tokens.accessToken,
        payload: {
          reason: "Student should not be allowed to run support recovery actions.",
        },
      },
    )

    expect(teacherListResponse.statusCode).toBe(403)
    expect(studentListResponse.statusCode).toBe(403)
    expect(teacherDelinkResponse.statusCode).toBe(403)
    expect(studentDelinkResponse.statusCode).toBe(403)

    const afterAdminActionCount = await getPrisma().adminActionLog.count({
      where: {
        targetUserId: authIntegrationFixtures.studentTwo.userId,
      },
    })

    expect(afterAdminActionCount).toBe(beforeAdminActionCount)
  })

  it("revokes an active binding and blocks later attendance-ready access", async () => {
    const studentSession = await login({
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

    const bindingId = studentSession.user.deviceTrust.bindingId
    if (!bindingId) {
      throw new Error("Student test session should include an active binding id.")
    }

    const beforeAdminActionCount = await getPrisma().adminActionLog.count({
      where: {
        adminUserId: authIntegrationFixtures.admin.userId,
        targetBindingId: bindingId,
        actionType: "DEVICE_REVOKE",
      },
    })

    const revokeResponse = await request("POST", `/admin/device-bindings/${bindingId}/revoke`, {
      token: adminSession.tokens.accessToken,
      payload: {
        reason: "Student reported the previous phone as stolen.",
      },
    })

    expect(revokeResponse.statusCode).toBe(201)
    authOperationSuccessSchema.parse(revokeResponse.body)

    const binding = await getPrisma().userDeviceBinding.findUnique({
      where: {
        id: bindingId,
      },
    })

    expect(binding?.status).toBe("REVOKED")
    expect(binding?.revokeReason).toBe("Student reported the previous phone as stolen.")

    const afterAdminActionCount = await getPrisma().adminActionLog.count({
      where: {
        adminUserId: authIntegrationFixtures.admin.userId,
        targetBindingId: bindingId,
        actionType: "DEVICE_REVOKE",
      },
    })

    expect(afterAdminActionCount).toBe(beforeAdminActionCount + 1)

    const attendanceReadyResponse = await request("GET", "/devices/trust/attendance-ready", {
      token: studentSession.tokens.accessToken,
      headers: buildTrustedDeviceHeaders(authIntegrationFixtures.studentOne.device.installId),
    })

    expect(attendanceReadyResponse.statusCode).toBe(403)
  })

  it("delinks all active student bindings and records the revoked count", async () => {
    await login({
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

    const delinkResponse = await request(
      "POST",
      `/admin/device-bindings/${authIntegrationFixtures.studentTwo.userId}/delink`,
      {
        token: adminSession.tokens.accessToken,
        payload: {
          reason: "Support reset before handing over a replacement device.",
        },
      },
    )

    expect(delinkResponse.statusCode).toBe(201)
    const result = adminDelinkStudentDevicesResponseSchema.parse(delinkResponse.body)
    expect(result.revokedBindingCount).toBe(1)

    const activeBindings = await getPrisma().userDeviceBinding.count({
      where: {
        userId: authIntegrationFixtures.studentTwo.userId,
        bindingType: "STUDENT_ATTENDANCE",
        status: "ACTIVE",
      },
    })

    expect(activeBindings).toBe(0)
  })

  it("shows pending replacement state to admins after a student tries a second phone", async () => {
    const studentEmail = `student.pending.${Date.now()}@attendease.dev`
    const initialInstallId = `student-pending-initial-${Date.now()}`
    const studentRegistration = await request("POST", "/auth/register/student", {
      payload: {
        email: studentEmail,
        password: "StudentPendingPass123!",
        displayName: "Student Pending",
        platform: "MOBILE",
        device: {
          installId: initialInstallId,
          platform: "ANDROID",
          publicKey: `student-pending-public-key-${Date.now()}`,
          appVersion: "1.0.0",
          deviceModel: "Pixel 8",
          osVersion: "Android 15",
        },
      },
    })
    expect(studentRegistration.statusCode).toBe(201)
    const studentSession = studentRegistrationResponseSchema.parse(studentRegistration.body)
    const adminSession = await login({
      email: authIntegrationFixtures.admin.email,
      password: authIntegrationFixtures.admin.password,
      platform: "WEB",
      requestedRole: "ADMIN",
    })

    const secondDeviceResponse = await request("POST", "/devices/register", {
      token: studentSession.tokens.accessToken,
      payload: {
        installId: "student-one-pending-replacement-install",
        platform: "ANDROID",
        publicKey: "student-one-pending-replacement-public-key",
        appVersion: "1.1.0",
        deviceModel: "Pixel 9",
        osVersion: "Android 16",
      },
    })

    expect(secondDeviceResponse.statusCode).toBe(201)

    const listResponse = await request(
      "GET",
      `/admin/device-bindings?query=${encodeURIComponent(studentEmail)}`,
      {
        token: adminSession.tokens.accessToken,
      },
    )
    expect(listResponse.statusCode).toBe(200)

    const allSummaries = adminDeviceSupportSummariesResponseSchema.parse(listResponse.body)
    const targetSummary = allSummaries.find((summary) => summary.student.email === studentEmail)

    expect(targetSummary?.attendanceDeviceState).toBe("PENDING_REPLACEMENT")
    expect(targetSummary?.pendingBinding?.binding.status).toBe("PENDING")
    expect(targetSummary?.pendingBinding?.device.installId).toBe(
      "student-one-pending-replacement-install",
    )
    expect(targetSummary?.recovery.recommendedAction).toBe("APPROVE_PENDING_REPLACEMENT")

    const detailResponse = await request(
      "GET",
      `/admin/device-bindings/${studentSession.user.id}`,
      {
        token: adminSession.tokens.accessToken,
      },
    )

    expect(detailResponse.statusCode).toBe(200)
    const detail = adminDeviceSupportDetailSchema.parse(detailResponse.body)
    expect(detail.attendanceDeviceState).toBe("PENDING_REPLACEMENT")
    expect(detail.bindings.some((binding) => binding.binding.status === "PENDING")).toBe(true)
    expect(detail.recovery.pendingBindingCount).toBe(1)
    expect(detail.recovery.strictPolicyNote).toContain("never becomes trusted automatically")
    expect(
      detail.securityEvents.some(
        (event) => event.eventType === "SECOND_DEVICE_FOR_STUDENT_ATTEMPT",
      ),
    ).toBe(true)
  })

  it("keeps a pending replacement blocked after the current phone is deregistered", async () => {
    const studentEmail = `student.pending.clear.${Date.now()}@attendease.dev`
    const studentPassword = "StudentPendingClearPass123!"
    const initialInstallId = `student-pending-clear-initial-${Date.now()}`
    const pendingInstallId = `student-pending-clear-replacement-${Date.now()}`
    const pendingPublicKey = `student-pending-clear-public-key-${Date.now()}`
    const studentRegistration = await request("POST", "/auth/register/student", {
      payload: {
        email: studentEmail,
        password: studentPassword,
        displayName: "Student Pending Clear",
        platform: "MOBILE",
        device: {
          installId: initialInstallId,
          platform: "ANDROID",
          publicKey: `student-pending-clear-initial-public-key-${Date.now()}`,
          appVersion: "1.0.0",
          deviceModel: "Pixel 8",
          osVersion: "Android 15",
        },
      },
    })
    expect(studentRegistration.statusCode).toBe(201)
    const studentSession = studentRegistrationResponseSchema.parse(studentRegistration.body)
    const adminSession = await login({
      email: authIntegrationFixtures.admin.email,
      password: authIntegrationFixtures.admin.password,
      platform: "WEB",
      requestedRole: "ADMIN",
    })

    const secondDeviceResponse = await request("POST", "/devices/register", {
      token: studentSession.tokens.accessToken,
      payload: {
        installId: pendingInstallId,
        platform: "ANDROID",
        publicKey: pendingPublicKey,
        appVersion: "1.1.0",
        deviceModel: "Pixel 9",
        osVersion: "Android 16",
      },
    })

    expect(secondDeviceResponse.statusCode).toBe(201)

    const delinkResponse = await request(
      "POST",
      `/admin/device-bindings/${studentSession.user.id}/delink`,
      {
        token: adminSession.tokens.accessToken,
        payload: {
          reason:
            "Student confirmed the old phone is gone before support approves the replacement.",
        },
      },
    )

    expect(delinkResponse.statusCode).toBe(201)
    const delinkResult = adminDelinkStudentDevicesResponseSchema.parse(delinkResponse.body)
    expect(delinkResult.revokedBindingCount).toBe(1)

    const pendingLoginResponse = await request("POST", "/auth/login", {
      payload: {
        email: studentEmail,
        password: studentPassword,
        platform: "MOBILE",
        requestedRole: "STUDENT",
        device: {
          installId: pendingInstallId,
          platform: "ANDROID",
          publicKey: pendingPublicKey,
        },
      },
    })

    expect(pendingLoginResponse.statusCode).toBe(403)

    const detailResponse = await request(
      "GET",
      `/admin/device-bindings/${studentSession.user.id}`,
      {
        token: adminSession.tokens.accessToken,
      },
    )

    expect(detailResponse.statusCode).toBe(200)
    const detail = adminDeviceSupportDetailSchema.parse(detailResponse.body)
    expect(detail.recovery.activeBindingCount).toBe(0)
    expect(detail.recovery.pendingBindingCount).toBe(1)
    expect(detail.recovery.recommendedAction).toBe("APPROVE_PENDING_REPLACEMENT")
    expect(detail.recovery.strictPolicyNote).toContain("never becomes trusted automatically")
  })

  it("approves a replacement device and allows the student to continue on the new install", async () => {
    const originalDevice = {
      installId: "student-four-original-install",
      platform: "ANDROID" as const,
      publicKey: "student-four-original-public-key",
      appVersion: "0.1.0",
      deviceModel: "Pixel 8",
      osVersion: "Android 15",
    }
    const studentSession = await login({
      email: authIntegrationFixtures.studentFour.email,
      password: authIntegrationFixtures.studentFour.password,
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: originalDevice,
    })
    const adminSession = await login({
      email: authIntegrationFixtures.admin.email,
      password: authIntegrationFixtures.admin.password,
      platform: "WEB",
      requestedRole: "ADMIN",
    })

    const replacementInstallId = "student-one-approved-replacement-install"
    const approveResponse = await request(
      "POST",
      `/admin/device-bindings/${authIntegrationFixtures.studentFour.userId}/approve-new-device`,
      {
        token: adminSession.tokens.accessToken,
        payload: {
          installId: replacementInstallId,
          platform: "ANDROID",
          publicKey: "student-one-approved-replacement-public-key",
          appVersion: "0.2.0",
          deviceModel: "Pixel 9",
          osVersion: "Android 16",
          reason: "Old phone is broken and a replacement device was verified by support.",
        },
      },
    )

    expect(approveResponse.statusCode).toBe(201)
    const approved = adminApproveReplacementDeviceResponseSchema.parse(approveResponse.body)
    expect(approved.binding.binding.status).toBe("ACTIVE")
    expect(approved.binding.device.installId).toBe(replacementInstallId)
    expect(approved.revokedBindingCount).toBe(1)

    const newStudentSession = await login({
      email: authIntegrationFixtures.studentFour.email,
      password: authIntegrationFixtures.studentFour.password,
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: {
        installId: replacementInstallId,
        platform: "ANDROID",
        publicKey: "student-one-approved-replacement-public-key",
      },
    })

    const readyResponse = await request("GET", "/devices/trust/attendance-ready", {
      token: newStudentSession.tokens.accessToken,
      headers: buildTrustedDeviceHeaders(replacementInstallId),
    })

    expect(readyResponse.statusCode).toBe(200)
    const ready = trustedDeviceAttendanceReadyResponseSchema.parse(readyResponse.body)
    expect(ready.binding.deviceId).toBe(approved.binding.binding.deviceId)

    const oldDeviceResponse = await request("GET", "/devices/trust/attendance-ready", {
      token: studentSession.tokens.accessToken,
      headers: buildTrustedDeviceHeaders(originalDevice.installId),
    })

    expect(oldDeviceResponse.statusCode).toBe(403)
  })

  it("rejects replacement approval when the submitted device is already bound to another student", async () => {
    const conflictingStudent = await getPrisma().user.create({
      data: {
        email: "student.conflict@attendease.dev",
        displayName: "Student Conflict",
        status: "ACTIVE",
        roles: {
          create: {
            role: "STUDENT",
          },
        },
        studentProfile: {
          create: {
            rollNumber: "ROLL-CONFLICT",
          },
        },
      },
    })
    const conflictingDevice = await getPrisma().device.create({
      data: {
        installId: "student-four-conflicting-install",
        platform: "ANDROID",
        publicKey: "student-four-conflicting-public-key",
        appVersion: "0.3.0",
        deviceModel: "Pixel 9",
        osVersion: "Android 16",
      },
    })
    await getPrisma().userDeviceBinding.create({
      data: {
        userId: conflictingStudent.id,
        deviceId: conflictingDevice.id,
        bindingType: "STUDENT_ATTENDANCE",
        status: "ACTIVE",
        activatedAt: new Date("2026-03-14T12:00:00.000Z"),
      },
    })
    const adminSession = await login({
      email: authIntegrationFixtures.admin.email,
      password: authIntegrationFixtures.admin.password,
      platform: "WEB",
      requestedRole: "ADMIN",
    })

    const beforeEventCount = await getPrisma().securityEvent.count({
      where: {
        userId: authIntegrationFixtures.studentTwo.userId,
        eventType: "MULTI_ACCOUNT_SAME_DEVICE_ATTEMPT",
      },
    })
    const beforeActiveBindingCount = await getPrisma().userDeviceBinding.count({
      where: {
        userId: authIntegrationFixtures.studentTwo.userId,
        bindingType: "STUDENT_ATTENDANCE",
        status: "ACTIVE",
      },
    })

    const approveResponse = await request(
      "POST",
      `/admin/device-bindings/${authIntegrationFixtures.studentTwo.userId}/approve-new-device`,
      {
        token: adminSession.tokens.accessToken,
        payload: {
          installId: "student-four-conflicting-install",
          platform: "ANDROID",
          publicKey: "student-four-conflicting-public-key",
          reason: "Support attempted to approve a phone that already belongs to another student.",
        },
      },
    )

    expect(approveResponse.statusCode).toBe(403)

    const afterEventCount = await getPrisma().securityEvent.count({
      where: {
        userId: authIntegrationFixtures.studentTwo.userId,
        eventType: "MULTI_ACCOUNT_SAME_DEVICE_ATTEMPT",
      },
    })
    const afterActiveBindingCount = await getPrisma().userDeviceBinding.count({
      where: {
        userId: authIntegrationFixtures.studentTwo.userId,
        bindingType: "STUDENT_ATTENDANCE",
        status: "ACTIVE",
      },
    })

    expect(afterEventCount).toBe(beforeEventCount + 1)
    expect(afterActiveBindingCount).toBe(beforeActiveBindingCount)
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
