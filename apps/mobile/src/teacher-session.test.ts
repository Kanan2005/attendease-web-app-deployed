import type { AuthSessionResponse } from "@attendease/contracts"
import { describe, expect, it } from "vitest"

import {
  buildTeacherLoginRequest,
  buildTeacherRegistrationRequest,
  buildTeacherSessionBootstrap,
  ensureTeacherSessionResponse,
  getTeacherAccessToken,
  requireTeacherSession,
} from "./teacher-session.js"

function createTeacherSession(
  overrides: {
    user?: Partial<AuthSessionResponse["user"]>
    tokens?: Partial<AuthSessionResponse["tokens"]>
  } = {},
): AuthSessionResponse {
  return {
    user: {
      id: "teacher_1",
      email: "teacher.one@attendease.dev",
      displayName: "Teacher One",
      status: "ACTIVE",
      availableRoles: ["TEACHER"],
      activeRole: "TEACHER",
      sessionId: "session_1",
      platform: "MOBILE",
      deviceTrust: {
        state: "NOT_REQUIRED",
        lifecycleState: "NOT_APPLICABLE",
        reason: "NOT_STUDENT_ROLE",
        deviceId: null,
        bindingId: null,
      },
      ...(overrides.user ?? {}),
    },
    tokens: {
      accessToken: "teacher-access-token-123456",
      accessTokenExpiresAt: "2026-03-14T09:00:00.000Z",
      refreshToken: "teacher-refresh-token-123456",
      refreshTokenExpiresAt: "2026-03-20T09:00:00.000Z",
      ...(overrides.tokens ?? {}),
    },
  }
}

describe("teacher session bootstrap", () => {
  it("builds a development teacher bootstrap draft from public mobile env", () => {
    const bootstrap = buildTeacherSessionBootstrap({
      EXPO_PUBLIC_API_URL: "http://localhost:4000",
      EXPO_PUBLIC_TEACHER_DEV_EMAIL: "teacher.one@attendease.dev",
      EXPO_PUBLIC_TEACHER_DEV_PASSWORD: "TeacherOnePass123!",
    })

    expect(bootstrap.hasDevelopmentCredentials).toBe(true)
    expect(bootstrap.defaultDraft).toMatchObject({
      displayName: "",
      email: "teacher.one@attendease.dev",
    })
  })

  it("builds a normalized teacher login request", () => {
    const request = buildTeacherLoginRequest({
      displayName: "Teacher One",
      email: " Teacher.One@AttendEase.dev ",
      password: "TeacherOnePass123!",
    })

    expect(request).toMatchObject({
      email: "teacher.one@attendease.dev",
      platform: "MOBILE",
      requestedRole: "TEACHER",
    })
    expect(request).not.toHaveProperty("device")
  })

  it("builds a normalized teacher registration request", () => {
    const request = buildTeacherRegistrationRequest({
      displayName: " Teacher One ",
      email: " Teacher.One@AttendEase.dev ",
      password: "TeacherOnePass123!",
    })

    expect(request).toMatchObject({
      displayName: "Teacher One",
      email: "teacher.one@attendease.dev",
      platform: "MOBILE",
    })
    expect(request).not.toHaveProperty("device")
  })

  it("rejects auth sessions that do not actually resolve to the teacher role", () => {
    expect(() =>
      ensureTeacherSessionResponse(
        createTeacherSession({
          user: {
            activeRole: "STUDENT",
            availableRoles: ["STUDENT", "TEACHER"],
          },
        }),
      ),
    ).toThrow("Teacher mobile requires an authenticated TEACHER role session.")

    expect(() =>
      ensureTeacherSessionResponse(
        createTeacherSession({
          user: {
            activeRole: "TEACHER",
            availableRoles: ["STUDENT"],
          },
        }),
      ),
    ).toThrow("Teacher mobile requires an authenticated TEACHER role session.")
  })

  it("requires a teacher session before exposing the teacher mobile access token", () => {
    expect(() => requireTeacherSession(null)).toThrow(
      "Teacher session is required before calling teacher mobile queries.",
    )

    expect(getTeacherAccessToken(createTeacherSession())).toBe("teacher-access-token-123456")
  })
})
