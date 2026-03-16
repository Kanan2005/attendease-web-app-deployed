import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { QrTokenService } from "./qr-token.service.js"

describe("QrTokenService", () => {
  const originalClockSkew = process.env.ATTENDANCE_QR_ALLOWED_CLOCK_SKEW_SLICES
  const sessionId = "attendance_session_1"
  const qrSeed = "qr-seed-for-tests-1234567890"

  beforeEach(() => {
    process.env.ATTENDANCE_QR_ALLOWED_CLOCK_SKEW_SLICES = "1"
  })

  afterEach(() => {
    process.env.ATTENDANCE_QR_ALLOWED_CLOCK_SKEW_SLICES = originalClockSkew
  })

  it("issues and validates a token for the current slice", () => {
    const service = new QrTokenService()
    const now = new Date("2026-03-14T10:00:20.000Z")

    const issued = service.issueToken({
      sessionId,
      qrSeed,
      rotationWindowSeconds: 15,
      now,
    })

    expect(
      service.validateToken({
        sessionId,
        qrSeed,
        rotationWindowSeconds: 15,
        payload: issued.payload,
        now,
      }),
    ).toEqual({
      accepted: true,
      parsed: issued.parsed,
    })
  })

  it("accepts the previous slice inside the allowed skew window", () => {
    const service = new QrTokenService()
    const previousSliceToken = service.issueToken({
      sessionId,
      qrSeed,
      rotationWindowSeconds: 15,
      now: new Date("2026-03-14T10:00:15.000Z"),
    })

    const validation = service.validateToken({
      sessionId,
      qrSeed,
      rotationWindowSeconds: 15,
      payload: previousSliceToken.payload,
      now: new Date("2026-03-14T10:00:29.000Z"),
    })

    expect(validation.accepted).toBe(true)
  })

  it("rejects tokens outside the accepted slice window", () => {
    const service = new QrTokenService()
    const expiredToken = service.issueToken({
      sessionId,
      qrSeed,
      rotationWindowSeconds: 15,
      now: new Date("2026-03-14T09:59:00.000Z"),
    })

    expect(
      service.validateToken({
        sessionId,
        qrSeed,
        rotationWindowSeconds: 15,
        payload: expiredToken.payload,
        now: new Date("2026-03-14T10:00:30.000Z"),
      }),
    ).toEqual({
      accepted: false,
      reason: "EXPIRED",
    })
  })

  it("rejects tokens issued from a future slice even when the signature is valid", () => {
    const service = new QrTokenService()
    const futureToken = service.issueToken({
      sessionId,
      qrSeed,
      rotationWindowSeconds: 15,
      now: new Date("2026-03-14T10:00:45.000Z"),
    })

    expect(
      service.validateToken({
        sessionId,
        qrSeed,
        rotationWindowSeconds: 15,
        payload: futureToken.payload,
        now: new Date("2026-03-14T10:00:20.000Z"),
      }),
    ).toEqual({
      accepted: false,
      reason: "EXPIRED",
    })
  })

  it("rejects tampered signatures and mismatched sessions", () => {
    const service = new QrTokenService()
    const issued = service.issueToken({
      sessionId,
      qrSeed,
      rotationWindowSeconds: 15,
      now: new Date("2026-03-14T10:00:20.000Z"),
    })
    const parsed = JSON.parse(issued.payload) as { v: number; sid: string; ts: number; sig: string }

    expect(
      service.validateToken({
        sessionId,
        qrSeed,
        rotationWindowSeconds: 15,
        payload: JSON.stringify({
          ...parsed,
          sig: `${parsed.sig}tampered`,
        }),
        now: new Date("2026-03-14T10:00:20.000Z"),
      }),
    ).toEqual({
      accepted: false,
      reason: "INVALID",
    })

    expect(
      service.validateToken({
        sessionId: "attendance_session_2",
        qrSeed,
        rotationWindowSeconds: 15,
        payload: issued.payload,
        now: new Date("2026-03-14T10:00:20.000Z"),
      }),
    ).toEqual({
      accepted: false,
      reason: "SESSION_MISMATCH",
    })
  })
})
