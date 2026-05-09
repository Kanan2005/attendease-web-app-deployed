import { ForbiddenException } from "@nestjs/common"
import { describe, expect, it } from "vitest"

import type { AuthServiceContext } from "./auth.service.types.js"
import type { DeviceTrustEvaluation } from "./auth.types.js"
import { ensureDeviceTrustAllowsAuthentication } from "./auth.service.policies.js"

function makeContext(mode: "DISABLED" | "AUDIT" | "ENFORCE"): AuthServiceContext {
  return {
    env: {
      FEATURE_STRICT_DEVICE_BINDING_MODE: mode,
    },
  } as AuthServiceContext
}

function makeTrust(
  overrides: Partial<DeviceTrustEvaluation> = {},
): DeviceTrustEvaluation {
  return {
    state: "TRUSTED",
    lifecycleState: "TRUSTED",
    reason: "DEVICE_BOUND",
    deviceId: "device_1",
    bindingId: "binding_1",
    ...overrides,
  }
}

describe("ensureDeviceTrustAllowsAuthentication", () => {
  // ── Teacher / Admin exemptions ──

  it("allows teachers regardless of ENFORCE mode and device trust state", () => {
    expect(() =>
      ensureDeviceTrustAllowsAuthentication(
        makeContext("ENFORCE"),
        "TEACHER",
        makeTrust({ state: "MISSING_CONTEXT", lifecycleState: "UNREGISTERED" }),
      ),
    ).not.toThrow()
  })

  it("allows admins regardless of ENFORCE mode and device trust state", () => {
    expect(() =>
      ensureDeviceTrustAllowsAuthentication(
        makeContext("ENFORCE"),
        "ADMIN",
        makeTrust({ state: "BLOCKED", lifecycleState: "BLOCKED" }),
      ),
    ).not.toThrow()
  })

  // ── DISABLED / AUDIT mode ──

  it("allows students in DISABLED mode even with MISSING_CONTEXT", () => {
    expect(() =>
      ensureDeviceTrustAllowsAuthentication(
        makeContext("DISABLED"),
        "STUDENT",
        makeTrust({ state: "MISSING_CONTEXT", lifecycleState: "UNREGISTERED" }),
      ),
    ).not.toThrow()
  })

  it("allows students in AUDIT mode even with BLOCKED state", () => {
    expect(() =>
      ensureDeviceTrustAllowsAuthentication(
        makeContext("AUDIT"),
        "STUDENT",
        makeTrust({ state: "BLOCKED", lifecycleState: "BLOCKED" }),
      ),
    ).not.toThrow()
  })

  // ── ENFORCE mode — student TRUSTED ──

  it("allows students in ENFORCE mode when device is TRUSTED", () => {
    expect(() =>
      ensureDeviceTrustAllowsAuthentication(
        makeContext("ENFORCE"),
        "STUDENT",
        makeTrust({ state: "TRUSTED", lifecycleState: "TRUSTED" }),
      ),
    ).not.toThrow()
  })

  // ── ENFORCE mode — student NOT trusted (each lifecycleState) ──

  it("rejects UNREGISTERED student in ENFORCE mode", () => {
    expect(() =>
      ensureDeviceTrustAllowsAuthentication(
        makeContext("ENFORCE"),
        "STUDENT",
        makeTrust({ state: "MISSING_CONTEXT", lifecycleState: "UNREGISTERED" }),
      ),
    ).toThrow(ForbiddenException)
    expect(() =>
      ensureDeviceTrustAllowsAuthentication(
        makeContext("ENFORCE"),
        "STUDENT",
        makeTrust({ state: "MISSING_CONTEXT", lifecycleState: "UNREGISTERED" }),
      ),
    ).toThrow("Student authentication requires device registration")
  })

  it("rejects PENDING_REPLACEMENT student in ENFORCE mode", () => {
    expect(() =>
      ensureDeviceTrustAllowsAuthentication(
        makeContext("ENFORCE"),
        "STUDENT",
        makeTrust({ state: "BLOCKED", lifecycleState: "PENDING_REPLACEMENT" }),
      ),
    ).toThrow("waiting for admin approval")
  })

  it("rejects REPLACED student device in ENFORCE mode", () => {
    expect(() =>
      ensureDeviceTrustAllowsAuthentication(
        makeContext("ENFORCE"),
        "STUDENT",
        makeTrust({ state: "BLOCKED", lifecycleState: "REPLACED" }),
      ),
    ).toThrow("no longer the trusted attendance device")
  })

  it("rejects BLOCKED student device in ENFORCE mode", () => {
    expect(() =>
      ensureDeviceTrustAllowsAuthentication(
        makeContext("ENFORCE"),
        "STUDENT",
        makeTrust({ state: "BLOCKED", lifecycleState: "BLOCKED" }),
      ),
    ).toThrow("already bound to another student")
  })

  it("rejects NOT_APPLICABLE fallback in ENFORCE mode with generic message", () => {
    expect(() =>
      ensureDeviceTrustAllowsAuthentication(
        makeContext("ENFORCE"),
        "STUDENT",
        makeTrust({ state: "BLOCKED", lifecycleState: "NOT_APPLICABLE" }),
      ),
    ).toThrow("Student authentication requires a trusted registered device.")
  })
})
