import { describe, expect, it } from "vitest"

import {
  buildStudentLoginRequest,
  buildStudentRegistrationRequest,
  buildStudentSessionBootstrap,
} from "./student-session.js"

describe("student session bootstrap", () => {
  it("builds a development bootstrap draft from public mobile env", () => {
    const bootstrap = buildStudentSessionBootstrap({
      EXPO_PUBLIC_API_URL: "http://localhost:4000",
      EXPO_PUBLIC_STUDENT_DEV_EMAIL: "student.one@attendease.dev",
      EXPO_PUBLIC_STUDENT_DEV_PASSWORD: "StudentOnePass123!",
      EXPO_PUBLIC_STUDENT_DEV_INSTALL_ID: "student-dev-install-01",
      EXPO_PUBLIC_STUDENT_DEV_PUBLIC_KEY: "student-dev-public-key-01",
      EXPO_PUBLIC_STUDENT_DEV_PLATFORM: "IOS",
    })

    expect(bootstrap.hasDevelopmentCredentials).toBe(true)
    expect(bootstrap.defaultDraft).toMatchObject({
      displayName: "",
      email: "student.one@attendease.dev",
      installId: "student-dev-install-01",
      publicKey: "student-dev-public-key-01",
      devicePlatform: "IOS",
    })
  })

  it("builds a normalized student login request with device context", () => {
    const request = buildStudentLoginRequest({
      email: " Student.One@AttendEase.dev ",
      password: "StudentOnePass123!",
      displayName: "Student One",
      installId: "student-dev-install-01",
      publicKey: "student-dev-public-key-01",
      devicePlatform: "ANDROID",
    })

    expect(request).toMatchObject({
      email: "student.one@attendease.dev",
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: {
        installId: "student-dev-install-01",
        platform: "ANDROID",
        publicKey: "student-dev-public-key-01",
      },
    })
  })

  it("builds a normalized student registration request with device context", () => {
    const request = buildStudentRegistrationRequest({
      displayName: " Student One ",
      email: " Student.One@AttendEase.dev ",
      password: "StudentOnePass123!",
      installId: "student-dev-install-01",
      publicKey: "student-dev-public-key-01",
      devicePlatform: "ANDROID",
    })

    expect(request).toMatchObject({
      displayName: "Student One",
      email: "student.one@attendease.dev",
      platform: "MOBILE",
      device: {
        installId: "student-dev-install-01",
        platform: "ANDROID",
        publicKey: "student-dev-public-key-01",
      },
    })
  })
})
