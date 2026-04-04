import { describe, expect, it } from "vitest"

import type { AuthSessionResponse } from "@attendease/contracts"

import {
  buildWebPortalCookieDefinitions,
  buildWebPortalSessionFromAuthSession,
  resolvePostLoginPath,
  resolveScopedWebPortalPath,
  resolveWebAuthApiBaseUrl,
  resolveWebAuthEntryPath,
  resolveWebPortalCookieSecure,
} from "./web-auth-session.js"
import { webSessionCookieNames } from "./web-portal.js"

function createAuthSessionResponse(role: "TEACHER" | "ADMIN"): AuthSessionResponse {
  return {
    user: {
      id: "user_1",
      email: role === "ADMIN" ? "admin@attendease.dev" : "teacher@attendease.dev",
      displayName: role === "ADMIN" ? "Admin One" : "Teacher One",
      status: "ACTIVE",
      availableRoles: [role],
      activeRole: role,
      sessionId: "session_1",
      platform: "WEB",
      deviceTrust: {
        state: "NOT_REQUIRED",
        lifecycleState: "NOT_APPLICABLE",
        reason: "NOT_STUDENT_ROLE",
        deviceId: null,
        bindingId: null,
      },
    },
    tokens: {
      accessToken: "access_token_1234567890",
      accessTokenExpiresAt: "2026-03-15T10:00:00.000Z",
      refreshToken: "refresh_token_1234567890",
      refreshTokenExpiresAt: "2026-04-15T10:00:00.000Z",
    },
  }
}

describe("web auth session helpers", () => {
  it("builds a web portal session from the shared auth response", () => {
    expect(buildWebPortalSessionFromAuthSession(createAuthSessionResponse("TEACHER"))).toEqual({
      accessToken: "access_token_1234567890",
      activeRole: "TEACHER",
      availableRoles: ["TEACHER"],
      displayName: "Teacher One",
      email: "teacher@attendease.dev",
    })
  })

  it("builds httpOnly cookie definitions aligned with the shared cookie contract", () => {
    const cookies = buildWebPortalCookieDefinitions({
      authSession: createAuthSessionResponse("ADMIN"),
      secure: false,
    })

    expect(cookies).toHaveLength(6)
    expect(cookies.map((entry) => entry.name)).toEqual([
      webSessionCookieNames.accessToken,
      webSessionCookieNames.refreshToken,
      webSessionCookieNames.activeRole,
      webSessionCookieNames.availableRoles,
      webSessionCookieNames.displayName,
      webSessionCookieNames.email,
    ])
    expect(cookies[0]).toMatchObject({
      name: webSessionCookieNames.accessToken,
      value: "access_token_1234567890",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false,
        expires: new Date("2026-03-15T10:00:00.000Z"),
      },
    })
    expect(cookies[1]).toMatchObject({
      name: webSessionCookieNames.refreshToken,
      value: "refresh_token_1234567890",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false,
        expires: new Date("2026-03-15T10:00:00.000Z"),
      },
    })
    expect(cookies[2]?.value).toBe("ADMIN")
    expect(cookies[2]?.options.expires).toEqual(new Date("2026-03-15T10:00:00.000Z"))
  })

  it("prefers the internal web API url when one is configured", () => {
    expect(
      resolveWebAuthApiBaseUrl({
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        NEXT_PUBLIC_API_URL: "http://localhost:4000",
        WEB_INTERNAL_API_URL: "http://api:4000",
      }),
    ).toBe("http://api:4000")

    expect(
      resolveWebAuthApiBaseUrl({
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        NEXT_PUBLIC_API_URL: "http://localhost:4000",
      }),
    ).toBe("http://localhost:4000")
  })

  it("uses request-aware secure cookies so localhost login works over http", () => {
    expect(
      resolveWebPortalCookieSecure({
        appUrl: "http://localhost:3000",
        requestUrl: "http://localhost:3000/login/password",
      }),
    ).toBe(false)

    expect(
      resolveWebPortalCookieSecure({
        appUrl: "http://localhost:3000",
        requestUrl: "http://localhost:3000/login/password",
        requestHeaders: {
          get(name: string) {
            return name === "x-forwarded-proto" ? "https" : null
          },
        },
      }),
    ).toBe(true)

    expect(
      resolveWebPortalCookieSecure({
        appUrl: "https://portal.attendease.example",
      }),
    ).toBe(true)
  })

  it("keeps redirect targets internal and role-aware", () => {
    expect(resolvePostLoginPath({ next: "/teacher/classrooms", requestedRole: "TEACHER" })).toBe(
      "/teacher/classrooms",
    )
    expect(resolvePostLoginPath({ next: "/admin/dashboard", requestedRole: "TEACHER" })).toBe(
      "/teacher/dashboard",
    )
    expect(resolvePostLoginPath({ next: "//evil.test", requestedRole: "ADMIN" })).toBe(
      "/admin/dashboard",
    )
    expect(resolvePostLoginPath({ next: "/teacher/dashboard", requestedRole: "ADMIN" })).toBe(
      "/admin/dashboard",
    )
  })

  it("keeps auth entry routes separated by teacher and admin scope", () => {
    expect(resolveScopedWebPortalPath("/teacher/dashboard", "teacher")).toBe("/teacher/dashboard")
    expect(resolveScopedWebPortalPath("/admin/dashboard", "teacher")).toBeNull()
    expect(resolveScopedWebPortalPath("/teacher/dashboard", "admin")).toBeNull()
    expect(resolveScopedWebPortalPath("/admin/devices", "admin")).toBe("/admin/devices")

    expect(
      resolveWebAuthEntryPath({
        scope: "teacher",
        mode: "register",
        next: "/teacher/classrooms",
      }),
    ).toBe("/register?next=%2Fteacher%2Fclassrooms")
    expect(
      resolveWebAuthEntryPath({
        scope: "admin",
        mode: "login",
        next: "/teacher/dashboard",
      }),
    ).toBe("/admin/login")
  })
})
