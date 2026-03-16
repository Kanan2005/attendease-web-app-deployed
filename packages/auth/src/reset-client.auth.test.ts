import { describe, expect, it, vi } from "vitest"

import { createAuthApiClient } from "./client.js"
import { authSessionResponse, liveAttendanceSession } from "./reset-client.fixtures.js"

describe("reset auth api client helpers", () => {
  it("locks student and teacher registration endpoints", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          ...authSessionResponse,
          user: {
            ...authSessionResponse.user,
            email: "student.one@attendease.dev",
            availableRoles: ["STUDENT"],
            activeRole: "STUDENT",
            platform: "MOBILE",
            deviceTrust: {
              state: "TRUSTED",
              lifecycleState: "TRUSTED",
              reason: "DEVICE_BOUND",
              deviceId: "device_1",
              bindingId: "binding_1",
            },
          },
          onboarding: {
            recommendedNextStep: "JOIN_CLASSROOM",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          ...authSessionResponse,
          onboarding: {
            recommendedNextStep: "OPEN_HOME",
          },
        }),
      })

    const client = createAuthApiClient({
      baseUrl: "http://localhost:4000",
      fetcher,
    })

    await client.registerStudentAccount({
      email: "student.one@attendease.dev",
      password: "StudentOnePass123!",
      displayName: "Student One",
      platform: "MOBILE",
      device: {
        installId: "install-student-one",
        platform: "ANDROID",
        publicKey: "student-public-key-123456",
      },
    })
    await client.registerTeacherAccount({
      email: "teacher@attendease.dev",
      password: "TeacherPass123!",
      displayName: "Teacher One",
      platform: "WEB",
    })

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "http://localhost:4000/auth/register/student",
      expect.objectContaining({ method: "POST" }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "http://localhost:4000/auth/register/teacher",
      expect.objectContaining({ method: "POST" }),
    )

    expect(JSON.parse((fetcher.mock.calls[0]?.[1] as { body: string }).body)).toMatchObject({
      platform: "MOBILE",
      device: {
        installId: "install-student-one",
      },
    })
    expect(JSON.parse((fetcher.mock.calls[1]?.[1] as { body: string }).body)).toMatchObject({
      platform: "WEB",
      email: "teacher@attendease.dev",
    })
  })

  it("keeps role-specific login and google exchange helpers explicit", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => authSessionResponse,
    })

    const client = createAuthApiClient({
      baseUrl: "http://localhost:4000",
      fetcher,
    })

    await client.loginStudent({
      email: "student.one@attendease.dev",
      password: "StudentOnePass123!",
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: {
        installId: "install-student-one",
        platform: "ANDROID",
        publicKey: "student-public-key-123456",
      },
    })
    await client.loginAdmin({
      email: "admin@attendease.dev",
      password: "AdminPass123!",
      platform: "WEB",
      requestedRole: "ADMIN",
    })
    await client.exchangeTeacherGoogleIdentity({
      platform: "WEB",
      requestedRole: "TEACHER",
      authorizationCode: "teacher-auth-code",
      redirectUri: "https://attendease.dev/auth/google/callback",
      codeVerifier: "teacher-code-verifier",
    })

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "http://localhost:4000/auth/login",
      expect.objectContaining({ method: "POST" }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "http://localhost:4000/auth/login",
      expect.objectContaining({ method: "POST" }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      3,
      "http://localhost:4000/auth/google/exchange",
      expect.objectContaining({ method: "POST" }),
    )

    expect(JSON.parse((fetcher.mock.calls[0]?.[1] as { body: string }).body)).toMatchObject({
      platform: "MOBILE",
      requestedRole: "STUDENT",
    })
    expect(JSON.parse((fetcher.mock.calls[1]?.[1] as { body: string }).body)).toMatchObject({
      platform: "WEB",
      requestedRole: "ADMIN",
    })
    expect(JSON.parse((fetcher.mock.calls[2]?.[1] as { body: string }).body)).toMatchObject({
      platform: "WEB",
      requestedRole: "TEACHER",
    })
  })

  it("maps live attendance discovery to the active sessions endpoint", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [liveAttendanceSession],
    })

    const client = createAuthApiClient({
      baseUrl: "http://localhost:4000",
      fetcher,
    })

    await expect(
      client.listLiveAttendanceSessions("teacher_token", {
        classroomId: "classroom_1",
        mode: "QR_GPS",
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: "session_1",
        classroomCode: "CSE6-MATH-A",
        mode: "QR_GPS",
        presentCount: 12,
      }),
    ])

    expect(fetcher).toHaveBeenCalledWith(
      "http://localhost:4000/sessions/live?classroomId=classroom_1&mode=QR_GPS",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          authorization: "Bearer teacher_token",
        }),
      }),
    )
  })
})
