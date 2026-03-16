import { ConflictException, ForbiddenException, UnauthorizedException } from "@nestjs/common"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { hashPassword } from "@attendease/auth/password"

import { AuthService } from "./auth.service.js"

describe("AuthService", () => {
  const database = {
    prisma: {
      user: {
        findUnique: vi.fn(),
      },
      loginEvent: {
        create: vi.fn(),
      },
      oAuthAccount: {
        findUnique: vi.fn(),
      },
    },
  }
  const assignmentsService = {
    listTeacherAssignments: vi.fn(),
  }
  const enrollmentsService = {
    listStudentEnrollments: vi.fn(),
  }
  const googleOidcService = {
    verifyExchange: vi.fn(),
  }
  const deviceBindingService = {
    evaluateLoginDeviceTrust: vi.fn(),
    getSessionDeviceTrust: vi.fn(),
  }

  let service: AuthService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new AuthService(
      database as never,
      assignmentsService as never,
      enrollmentsService as never,
      googleOidcService as never,
      deviceBindingService as never,
    )
  })

  it("rejects password login when the requested role is not assigned", async () => {
    const passwordHash = await hashPassword("TeacherPass123!")

    database.prisma.user.findUnique.mockResolvedValue({
      id: "teacher_1",
      email: "teacher@attendease.dev",
      displayName: "Teacher One",
      status: "ACTIVE",
      credentials: {
        passwordHash,
      },
      roles: [{ role: "TEACHER" }],
    })

    await expect(
      service.login({
        email: "teacher@attendease.dev",
        password: "TeacherPass123!",
        platform: "WEB",
        requestedRole: "STUDENT",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException)

    expect(deviceBindingService.evaluateLoginDeviceTrust).not.toHaveBeenCalled()
  })

  it("rejects Google admin login in the foundation phase", async () => {
    googleOidcService.verifyExchange.mockResolvedValue({
      providerSubject: "google-subject-admin",
      email: "admin@attendease.dev",
      emailVerified: true,
      displayName: "Admin User",
      hostedDomain: "attendease.dev",
      avatarUrl: null,
    })

    await expect(
      service.exchangeGoogleIdentity({
        idToken: "a".repeat(16),
        platform: "WEB",
        requestedRole: "ADMIN",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException)

    expect(database.prisma.oAuthAccount.findUnique).not.toHaveBeenCalled()
  })

  it("rejects Google login when the verified identity email is not verified", async () => {
    googleOidcService.verifyExchange.mockResolvedValue({
      providerSubject: "google-subject-student",
      email: "student@attendease.dev",
      emailVerified: false,
      displayName: "Student User",
      hostedDomain: "attendease.dev",
      avatarUrl: null,
    })

    await expect(
      service.exchangeGoogleIdentity({
        idToken: "b".repeat(16),
        platform: "MOBILE",
        requestedRole: "STUDENT",
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException)

    expect(database.prisma.oAuthAccount.findUnique).not.toHaveBeenCalled()
  })

  it("rejects teacher registration when the email is already in use", async () => {
    database.prisma.user.findUnique.mockResolvedValue({
      id: "existing_teacher",
    })

    await expect(
      service.registerTeacherAccount({
        email: "teacher@attendease.dev",
        password: "TeacherPass123!",
        displayName: "Teacher One",
        platform: "WEB",
      }),
    ).rejects.toBeInstanceOf(ConflictException)

    expect(deviceBindingService.evaluateLoginDeviceTrust).not.toHaveBeenCalled()
  })
})
