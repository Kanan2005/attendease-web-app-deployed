import { describe, expect, it } from "vitest"

import {
  buildDeviceBindingErrorModel,
  buildPlaceholderDeviceIdentity,
  classifyDeviceBindingError,
} from "./device-identity-models.js"

describe("device identity", () => {
  it("builds a placeholder identity with defaults", () => {
    const identity = buildPlaceholderDeviceIdentity()

    expect(identity).toMatchObject({
      installId: "student-dev-install",
      publicKey: "student-dev-public-key",
      platform: "ANDROID",
      resolved: true,
    })
  })

  it("builds a placeholder identity with custom values", () => {
    const identity = buildPlaceholderDeviceIdentity("custom-install", "custom-key", "IOS")

    expect(identity).toMatchObject({
      installId: "custom-install",
      publicKey: "custom-key",
      platform: "IOS",
      resolved: true,
    })
  })
})

describe("classifyDeviceBindingError", () => {
  it("classifies multi-account same device error", () => {
    expect(
      classifyDeviceBindingError("This device is already registered to another student."),
    ).toBe("DEVICE_BOUND_TO_ANOTHER")

    expect(
      classifyDeviceBindingError(
        "This device is already bound to another student's attendance profile.",
      ),
    ).toBe("DEVICE_BOUND_TO_ANOTHER")

    expect(
      classifyDeviceBindingError(
        "This device is already bound to another student and could not be verified for your account.",
      ),
    ).toBe("DEVICE_BOUND_TO_ANOTHER")
  })

  it("classifies replacement pending error", () => {
    expect(
      classifyDeviceBindingError(
        "This phone is waiting for admin approval as the replacement attendance device.",
      ),
    ).toBe("REPLACEMENT_PENDING")
  })

  it("classifies device replaced error", () => {
    expect(
      classifyDeviceBindingError(
        "This phone is no longer the trusted attendance device for this student.",
      ),
    ).toBe("DEVICE_REPLACED")
  })

  it("classifies device unregistered error", () => {
    expect(
      classifyDeviceBindingError(
        "Student authentication requires device registration on the attendance phone.",
      ),
    ).toBe("DEVICE_UNREGISTERED")

    expect(
      classifyDeviceBindingError("Student authentication requires a trusted registered device."),
    ).toBe("DEVICE_UNREGISTERED")
  })

  it("classifies device blocked error", () => {
    expect(
      classifyDeviceBindingError("This device could not be verified for student registration."),
    ).toBe("DEVICE_BLOCKED")
  })

  it("returns null for unrelated errors", () => {
    expect(classifyDeviceBindingError("Invalid email or password.")).toBe(null)
    expect(classifyDeviceBindingError("Network error")).toBe(null)
  })
})

describe("buildDeviceBindingErrorModel", () => {
  it("builds a model for multi-account error", () => {
    const model = buildDeviceBindingErrorModel(
      "This device is already registered to another student.",
    )

    expect(model).not.toBeNull()
    expect(model?.kind).toBe("DEVICE_BOUND_TO_ANOTHER")
    expect(model?.title).toBe("Phone already linked")
    expect(model?.supportHint).toContain("one student")
  })

  it("builds a model for replacement pending error", () => {
    const model = buildDeviceBindingErrorModel(
      "This phone is waiting for admin approval as the replacement attendance device.",
    )

    expect(model).not.toBeNull()
    expect(model?.kind).toBe("REPLACEMENT_PENDING")
    expect(model?.title).toBe("Approval needed")
  })

  it("returns null for non-device errors", () => {
    const model = buildDeviceBindingErrorModel("Invalid email or password.")
    expect(model).toBeNull()
  })
})
