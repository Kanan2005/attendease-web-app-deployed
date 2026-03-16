import { describe, expect, it } from "vitest"

import {
  buildTrustedDeviceHeaders,
  canStudentMarkAttendanceWithDeviceTrust,
  isStaffRole,
  resolveActiveRole,
  trustedDeviceInstallIdHeaderName,
} from "./index"
import { hashPassword, verifyPassword } from "./password"
import { issueAccessToken, verifyAccessToken } from "./tokens"

describe("auth helpers", () => {
  it("treats admin and teacher as staff roles", () => {
    expect(isStaffRole("ADMIN")).toBe(true)
    expect(isStaffRole("TEACHER")).toBe(true)
    expect(isStaffRole("STUDENT")).toBe(false)
  })

  it("resolves the active role deterministically and rejects unavailable selections", () => {
    expect(resolveActiveRole(["STUDENT", "TEACHER"])).toBe("TEACHER")
    expect(resolveActiveRole(["STUDENT", "TEACHER"], "STUDENT")).toBe("STUDENT")

    expect(() => resolveActiveRole(["STUDENT"], "ADMIN")).toThrow(
      "The requested role is not available for this user.",
    )
  })

  it("hashes and verifies passwords safely", async () => {
    const encodedHash = await hashPassword("Password123!")

    expect(encodedHash.startsWith("scrypt$")).toBe(true)
    await expect(verifyPassword("Password123!", encodedHash)).resolves.toBe(true)
    await expect(verifyPassword("wrong-password", encodedHash)).resolves.toBe(false)
  })

  it("issues and verifies AttendEase access tokens", async () => {
    const envelope = await issueAccessToken(
      {
        userId: "user_1",
        sessionId: "session_1",
        activeRole: "TEACHER",
        availableRoles: ["TEACHER"],
        platform: "WEB",
      },
      {
        secret: "attendease-test-secret-attendease-test-secret",
        issuer: "attendease-api",
        audience: "attendease-clients",
        expiresInMinutes: 15,
      },
    )

    const payload = await verifyAccessToken(envelope.token, {
      secret: "attendease-test-secret-attendease-test-secret",
      issuer: "attendease-api",
      audience: "attendease-clients",
    })

    expect(payload.userId).toBe("user_1")
    expect(payload.activeRole).toBe("TEACHER")
    expect(payload.availableRoles).toEqual(["TEACHER"])
    expect(payload.expiresAt.getTime()).toBeLessThanOrEqual(envelope.expiresAt.getTime())
    expect(payload.expiresAt.getTime()).toBeGreaterThan(envelope.expiresAt.getTime() - 1000)
  })

  it("applies student-specific device-trust helpers", () => {
    expect(canStudentMarkAttendanceWithDeviceTrust("TRUSTED")).toBe(true)
    expect(canStudentMarkAttendanceWithDeviceTrust("BLOCKED")).toBe(false)
    expect(buildTrustedDeviceHeaders("install_1")).toEqual({
      [trustedDeviceInstallIdHeaderName]: "install_1",
    })
  })
})
