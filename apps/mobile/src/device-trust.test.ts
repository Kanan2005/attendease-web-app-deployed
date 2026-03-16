import { describe, expect, it } from "vitest"

import {
  buildStudentAttendanceGateModel,
  createMobileDeviceTrustBootstrap,
} from "./device-trust.js"

describe("mobile device trust bootstrap", () => {
  it("builds registration payloads with placeholder attestation providers", () => {
    const bootstrap = createMobileDeviceTrustBootstrap({
      EXPO_PUBLIC_API_URL: "http://localhost:4000",
      EXPO_PUBLIC_GOOGLE_OIDC_CLIENT_ID: "mobile-client-id",
      EXPO_PUBLIC_DEVICE_ATTESTATION_ANDROID_MODE: "placeholder",
      EXPO_PUBLIC_DEVICE_ATTESTATION_APPLE_MODE: "native",
    })

    expect(bootstrap.installHeaderName).toBe("x-attendease-install-id")
    expect(bootstrap.androidAttestation.provider).toBe("play-integrity-placeholder")
    expect(bootstrap.appleAttestation.provider).toBe("apple-app-attest")

    expect(
      bootstrap.buildRegistrationPayload({
        installId: "install_1",
        platform: "ANDROID",
        publicKey: "public-key-1",
      }),
    ).toMatchObject({
      installId: "install_1",
      platform: "ANDROID",
      attestationProvider: "play-integrity-placeholder",
    })
  })

  it("builds blocked attendance UX content for high-risk device states", () => {
    const model = buildStudentAttendanceGateModel({
      deviceTrust: {
        state: "BLOCKED",
        lifecycleState: "PENDING_REPLACEMENT",
        reason: "DEVICE_REPLACEMENT_PENDING_APPROVAL",
        deviceId: "device_1",
        bindingId: "binding_1",
      },
    })

    expect(model.canContinue).toBe(false)
    expect(model.tone).toBe("warning")
    expect(model.message).toContain("waiting for admin approval")
  })

  it("surfaces trusted and replaced device lifecycle states explicitly", () => {
    const trusted = buildStudentAttendanceGateModel({
      deviceTrust: {
        state: "TRUSTED",
        lifecycleState: "TRUSTED",
        reason: "DEVICE_BOUND",
        deviceId: "device_1",
        bindingId: "binding_1",
      },
    })
    const replaced = buildStudentAttendanceGateModel({
      deviceTrust: {
        state: "BLOCKED",
        lifecycleState: "REPLACED",
        reason: "DEVICE_REPLACED",
        deviceId: "device_old",
        bindingId: "binding_old",
      },
    })

    expect(trusted.canContinue).toBe(true)
    expect(trusted.title).toBe("Trusted device ready")
    expect(replaced.canContinue).toBe(false)
    expect(replaced.title).toBe("This phone was replaced")
  })
})
