import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { BluetoothTokenService } from "./bluetooth-token.service.js"

describe("BluetoothTokenService", () => {
  const originalClockSkew = process.env.ATTENDANCE_BLUETOOTH_ALLOWED_CLOCK_SKEW_SLICES
  const publicId = "ble-public-id-123456"
  const bleSeed = "ble-seed-for-tests-1234567890"
  const protocolVersion = 1

  beforeEach(() => {
    process.env.ATTENDANCE_BLUETOOTH_ALLOWED_CLOCK_SKEW_SLICES = "1"
  })

  afterEach(() => {
    process.env.ATTENDANCE_BLUETOOTH_ALLOWED_CLOCK_SKEW_SLICES = originalClockSkew
  })

  it("issues and validates a BLE token for the current slice", () => {
    const service = new BluetoothTokenService()
    const now = new Date("2026-03-14T10:00:20.000Z")

    const issued = service.issueToken({
      publicId,
      bleSeed,
      protocolVersion,
      rotationWindowSeconds: 10,
      now,
    })

    expect(
      service.validateToken({
        publicId,
        bleSeed,
        protocolVersion,
        rotationWindowSeconds: 10,
        payload: issued.payload,
        now,
      }),
    ).toEqual({
      accepted: true,
      parsed: issued.parsed,
    })
  })

  it("accepts the previous slice inside the allowed skew window", () => {
    const service = new BluetoothTokenService()
    const previousSliceToken = service.issueToken({
      publicId,
      bleSeed,
      protocolVersion,
      rotationWindowSeconds: 10,
      now: new Date("2026-03-14T10:00:10.000Z"),
    })

    const validation = service.validateToken({
      publicId,
      bleSeed,
      protocolVersion,
      rotationWindowSeconds: 10,
      payload: previousSliceToken.payload,
      now: new Date("2026-03-14T10:00:19.000Z"),
    })

    expect(validation.accepted).toBe(true)
  })

  it("rejects tokens outside the accepted slice window", () => {
    const service = new BluetoothTokenService()
    const expiredToken = service.issueToken({
      publicId,
      bleSeed,
      protocolVersion,
      rotationWindowSeconds: 10,
      now: new Date("2026-03-14T09:59:00.000Z"),
    })

    expect(
      service.validateToken({
        publicId,
        bleSeed,
        protocolVersion,
        rotationWindowSeconds: 10,
        payload: expiredToken.payload,
        now: new Date("2026-03-14T10:00:30.000Z"),
      }),
    ).toEqual({
      accepted: false,
      reason: "EXPIRED",
    })
  })

  it("rejects tokens from a future slice and sessions missing BLE config", () => {
    const service = new BluetoothTokenService()
    const futureToken = service.issueToken({
      publicId,
      bleSeed,
      protocolVersion,
      rotationWindowSeconds: 10,
      now: new Date("2026-03-14T10:00:40.000Z"),
    })

    expect(
      service.validateToken({
        publicId,
        bleSeed,
        protocolVersion,
        rotationWindowSeconds: 10,
        payload: futureToken.payload,
        now: new Date("2026-03-14T10:00:20.000Z"),
      }),
    ).toEqual({
      accepted: false,
      reason: "EXPIRED",
    })

    expect(
      service.validateToken({
        publicId: null,
        bleSeed: null,
        protocolVersion: null,
        rotationWindowSeconds: null,
        payload: futureToken.payload,
      }),
    ).toEqual({
      accepted: false,
      reason: "INVALID",
    })
  })

  it("rejects tampered identifiers and mismatched protocol/session metadata", () => {
    const service = new BluetoothTokenService()
    const issued = service.issueToken({
      publicId,
      bleSeed,
      protocolVersion,
      rotationWindowSeconds: 10,
      now: new Date("2026-03-14T10:00:20.000Z"),
    })
    const parsed = JSON.parse(issued.payload) as {
      v: number
      pid: string
      ts: number
      eid: string
    }

    expect(
      service.validateToken({
        publicId,
        bleSeed,
        protocolVersion,
        rotationWindowSeconds: 10,
        payload: JSON.stringify({
          ...parsed,
          eid: `${parsed.eid}tampered`,
        }),
        now: new Date("2026-03-14T10:00:20.000Z"),
      }),
    ).toEqual({
      accepted: false,
      reason: "INVALID",
    })

    expect(
      service.validateToken({
        publicId: "other-public-id",
        bleSeed,
        protocolVersion,
        rotationWindowSeconds: 10,
        payload: issued.payload,
        now: new Date("2026-03-14T10:00:20.000Z"),
      }),
    ).toEqual({
      accepted: false,
      reason: "SESSION_MISMATCH",
    })

    expect(
      service.validateToken({
        publicId,
        bleSeed,
        protocolVersion: 2,
        rotationWindowSeconds: 10,
        payload: issued.payload,
        now: new Date("2026-03-14T10:00:20.000Z"),
      }),
    ).toEqual({
      accepted: false,
      reason: "SESSION_MISMATCH",
    })
  })
})
