import { describe, expect, it } from "vitest"

import { findMobileContentIssues } from "@attendease/ui-mobile"

import { buildMobileSessionEntryCopy, buildMobileShellSummary } from "./shell"

describe("buildMobileShellSummary", () => {
  it("creates the mobile shell summary from public env", () => {
    const summary = buildMobileShellSummary({
      EXPO_PUBLIC_API_URL: "http://localhost:4000",
      EXPO_PUBLIC_APP_ENV: "development",
      EXPO_PUBLIC_ATTENDANCE_BLUETOOTH_SERVICE_UUID: "12345678-1234-5678-1234-56789abc0001",
      EXPO_PUBLIC_DEVICE_ATTESTATION_ANDROID_MODE: "placeholder",
      EXPO_PUBLIC_DEVICE_ATTESTATION_APPLE_MODE: "placeholder",
      EXPO_PUBLIC_FEATURE_BLUETOOTH_ATTENDANCE_ENABLED: true,
      EXPO_PUBLIC_FEATURE_EMAIL_AUTOMATION_ENABLED: true,
      EXPO_PUBLIC_STUDENT_DEV_PLATFORM: "ANDROID",
    })

    expect(summary.title).toBe("AttendEase")
    expect(summary.apiUrl).toBe("http://localhost:4000")
    expect(summary.mode).toBe("development")
    expect(summary.deviceTrustDescription).toContain("register one phone")
  })

  it("keeps the shared mobile summary free of developer-facing copy", () => {
    const summary = buildMobileShellSummary({
      EXPO_PUBLIC_API_URL: "http://localhost:4000",
      EXPO_PUBLIC_APP_ENV: "development",
      EXPO_PUBLIC_ATTENDANCE_BLUETOOTH_SERVICE_UUID: "12345678-1234-5678-1234-56789abc0001",
      EXPO_PUBLIC_DEVICE_ATTESTATION_ANDROID_MODE: "placeholder",
      EXPO_PUBLIC_DEVICE_ATTESTATION_APPLE_MODE: "placeholder",
      EXPO_PUBLIC_FEATURE_BLUETOOTH_ATTENDANCE_ENABLED: true,
      EXPO_PUBLIC_FEATURE_EMAIL_AUTOMATION_ENABLED: true,
      EXPO_PUBLIC_STUDENT_DEV_PLATFORM: "ANDROID",
    })

    expect(findMobileContentIssues(summary.description)).toEqual([])
    expect(findMobileContentIssues(summary.deviceTrustDescription)).toEqual([])
  })

  it("builds concise role-specific sign-in copy for student and teacher entry", () => {
    const student = buildMobileSessionEntryCopy("student", "sign_in")
    const teacher = buildMobileSessionEntryCopy("teacher", "sign_in")

    expect(student).toMatchObject({
      title: "Student sign in",
      submitLabel: "Sign in",
      submittingLabel: "Signing in...",
    })
    expect(teacher).toMatchObject({
      title: "Teacher sign in",
      submitLabel: "Sign in",
      submittingLabel: "Signing in...",
    })

    expect(findMobileContentIssues(student.subtitle)).toEqual([])
    expect(findMobileContentIssues(student.prefilledHint)).toEqual([])
    expect(findMobileContentIssues(teacher.subtitle)).toEqual([])
    expect(findMobileContentIssues(teacher.manualHint)).toEqual([])
  })

  it("builds concise role-specific registration copy for student and teacher entry", () => {
    const student = buildMobileSessionEntryCopy("student", "register")
    const teacher = buildMobileSessionEntryCopy("teacher", "register")

    expect(student).toMatchObject({
      title: "Create student account",
      submitLabel: "Create account",
      alternateLabel: "Student sign in",
    })
    expect(teacher).toMatchObject({
      title: "Create teacher account",
      submitLabel: "Create account",
      alternateLabel: "Teacher sign in",
    })

    expect(findMobileContentIssues(student.subtitle)).toEqual([])
    expect(findMobileContentIssues(teacher.subtitle)).toEqual([])
  })

  it("builds admin sign-in copy with platform governance description", () => {
    const admin = buildMobileSessionEntryCopy("admin", "sign_in")

    expect(admin).toMatchObject({
      title: "Admin sign in",
      submitLabel: "Sign in",
      submittingLabel: "Signing in...",
      alternateLabel: "Back to role choice",
    })
    expect(admin.subtitle).toContain("manage students")
    expect(admin.roleSummary).toContain("governance")

    expect(findMobileContentIssues(admin.subtitle)).toEqual([])
    expect(findMobileContentIssues(admin.roleSummary)).toEqual([])
  })
})
