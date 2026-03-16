import { describe, expect, it } from "vitest"

import { createMobileAuthBootstrap } from "./auth.js"

describe("mobile auth bootstrap", () => {
  it("builds mobile auth configuration and Google exchange payloads", () => {
    const bootstrap = createMobileAuthBootstrap({
      EXPO_PUBLIC_API_URL: "http://localhost:4000",
      EXPO_PUBLIC_GOOGLE_OIDC_CLIENT_ID: "mobile-client-id",
      EXPO_PUBLIC_STUDENT_DEV_EMAIL: "student.one@attendease.dev",
      EXPO_PUBLIC_STUDENT_DEV_PASSWORD: "StudentOnePass123!",
      EXPO_PUBLIC_TEACHER_DEV_EMAIL: "teacher.one@attendease.dev",
      EXPO_PUBLIC_TEACHER_DEV_PASSWORD: "TeacherOnePass123!",
    })

    expect(bootstrap.apiBaseUrl).toBe("http://localhost:4000")
    expect(bootstrap.googleClientId).toBe("mobile-client-id")
    expect(bootstrap.developmentStudentEmail).toBe("student.one@attendease.dev")
    expect(bootstrap.developmentTeacherEmail).toBe("teacher.one@attendease.dev")
    expect(
      bootstrap.createGoogleExchangePayload({
        requestedRole: "STUDENT",
        idToken: "student-google-token",
        device: {
          installId: "install_1",
          platform: "ANDROID",
          publicKey: "public-key-1",
        },
      }),
    ).toMatchObject({
      platform: "MOBILE",
      requestedRole: "STUDENT",
      idToken: "student-google-token",
      device: {
        installId: "install_1",
        platform: "ANDROID",
      },
    })
  })
})
