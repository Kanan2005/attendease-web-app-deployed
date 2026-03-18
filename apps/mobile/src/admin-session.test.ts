import { describe, expect, it } from "vitest"

import {
  buildAdminLoginRequest,
  buildAdminSessionBootstrap,
  ensureAdminSessionResponse,
  getAdminAccessToken,
  requireAdminSession,
} from "./admin-session"

describe("admin session", () => {
  it("builds admin session bootstrap from environment variables", () => {
    const bootstrap = buildAdminSessionBootstrap({
      EXPO_PUBLIC_ADMIN_DEV_EMAIL: "admin@attendease.dev",
      EXPO_PUBLIC_ADMIN_DEV_PASSWORD: "AdminPass123!",
    })

    expect(bootstrap.hasDevelopmentCredentials).toBe(true)
    expect(bootstrap.defaultDraft.email).toBe("admin@attendease.dev")
    expect(bootstrap.defaultDraft.password).toBe("AdminPass123!")
  })

  it("detects missing admin development credentials", () => {
    const bootstrap = buildAdminSessionBootstrap({})

    expect(bootstrap.hasDevelopmentCredentials).toBe(false)
    expect(bootstrap.defaultDraft.email).toBe("")
    expect(bootstrap.defaultDraft.password).toBe("")
  })

  it("builds admin login request with MOBILE platform and ADMIN role", () => {
    const request = buildAdminLoginRequest({
      email: "  Admin@Example.COM  ",
      password: "securepass",
    })

    expect(request).toEqual({
      email: "admin@example.com",
      password: "securepass",
      platform: "MOBILE",
      requestedRole: "ADMIN",
    })
  })

  it("trims and lowercases email in admin login request", () => {
    const request = buildAdminLoginRequest({
      email: "  ADMIN@SCHOOL.EDU  ",
      password: "pass123",
    })

    expect(request.email).toBe("admin@school.edu")
  })

  it("ensures session response has ADMIN active role", () => {
    const validSession = {
      user: {
        id: "1",
        email: "admin@test.com",
        displayName: "Admin",
        activeRole: "ADMIN" as const,
        availableRoles: ["ADMIN" as const],
        deviceTrust: null,
      },
      tokens: {
        accessToken: "token-123",
        refreshToken: "refresh-456",
      },
    }

    expect(() => ensureAdminSessionResponse(validSession as any)).not.toThrow()
  })

  it("rejects session response without ADMIN role", () => {
    const invalidSession = {
      user: {
        id: "1",
        email: "student@test.com",
        displayName: "Student",
        activeRole: "STUDENT" as const,
        availableRoles: ["STUDENT" as const],
        deviceTrust: null,
      },
      tokens: {
        accessToken: "token-123",
        refreshToken: "refresh-456",
      },
    }

    expect(() => ensureAdminSessionResponse(invalidSession as any)).toThrow(
      "Admin mobile requires an authenticated ADMIN role session.",
    )
  })

  it("throws when admin session is null", () => {
    expect(() => requireAdminSession(null)).toThrow(
      "Admin session is required before calling admin mobile queries.",
    )
  })

  it("extracts access token from valid admin session", () => {
    const session = {
      user: {
        id: "1",
        email: "admin@test.com",
        displayName: "Admin",
        activeRole: "ADMIN" as const,
        availableRoles: ["ADMIN" as const],
        deviceTrust: null,
      },
      tokens: {
        accessToken: "admin-access-token-xyz",
        refreshToken: "refresh-456",
      },
    }

    expect(getAdminAccessToken(session as any)).toBe("admin-access-token-xyz")
  })

  it("throws when extracting token from null session", () => {
    expect(() => getAdminAccessToken(null)).toThrow()
  })
})
