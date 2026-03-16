import { describe, expect, it } from "vitest"

import { FeatureFlagsService } from "./feature-flags.service.js"

describe("FeatureFlagsService", () => {
  it("exposes rollout flags and strict device-binding mode helpers", () => {
    const service = new FeatureFlagsService({
      FEATURE_BLUETOOTH_ATTENDANCE_ENABLED: true,
      FEATURE_EMAIL_AUTOMATION_ENABLED: false,
      FEATURE_STRICT_DEVICE_BINDING_MODE: "AUDIT",
    } as never)

    expect(service.isBluetoothAttendanceEnabled()).toBe(true)
    expect(service.isEmailAutomationEnabled()).toBe(false)
    expect(service.getStrictDeviceBindingMode()).toBe("AUDIT")
    expect(service.isStrictDeviceBindingEnforced()).toBe(false)
  })

  it("treats enforce mode as the only strict auth gate", () => {
    const service = new FeatureFlagsService({
      FEATURE_BLUETOOTH_ATTENDANCE_ENABLED: true,
      FEATURE_EMAIL_AUTOMATION_ENABLED: true,
      FEATURE_STRICT_DEVICE_BINDING_MODE: "ENFORCE",
    } as never)

    expect(service.getStrictDeviceBindingMode()).toBe("ENFORCE")
    expect(service.isStrictDeviceBindingEnforced()).toBe(true)
  })

  it("throws when disabled rollout features are accessed", () => {
    const service = new FeatureFlagsService({
      FEATURE_BLUETOOTH_ATTENDANCE_ENABLED: false,
      FEATURE_EMAIL_AUTOMATION_ENABLED: false,
      FEATURE_STRICT_DEVICE_BINDING_MODE: "ENFORCE",
    } as never)

    expect(() => service.assertBluetoothAttendanceEnabled()).toThrowError(
      "Bluetooth attendance is disabled",
    )
    expect(() => service.assertEmailAutomationEnabled()).toThrowError(
      "Email automation is disabled",
    )
  })
})
