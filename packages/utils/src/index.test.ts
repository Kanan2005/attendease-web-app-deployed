import { describe, expect, it } from "vitest"

import { formatStructuredLogEntry, invariant, redactSensitiveData, toIsoTimestamp } from "./index"

describe("utils", () => {
  it("converts dates to iso timestamps", () => {
    expect(toIsoTimestamp(new Date("2026-03-14T00:00:00.000Z"))).toBe("2026-03-14T00:00:00.000Z")
  })

  it("throws when invariant fails", () => {
    expect(() => invariant(false, "failure")).toThrowError("failure")
  })

  it("redacts sensitive values inside nested log metadata", () => {
    expect(
      redactSensitiveData({
        authorization: "Bearer abc",
        password: "secret",
        nested: {
          refreshToken: "refresh",
          safe: "value",
        },
      }),
    ).toEqual({
      authorization: "[REDACTED]",
      password: "[REDACTED]",
      nested: {
        refreshToken: "[REDACTED]",
        safe: "value",
      },
    })
  })

  it("formats structured log entries as json", () => {
    expect(
      formatStructuredLogEntry({
        timestamp: "2026-03-15T00:00:00.000Z",
        level: "info",
        service: "api",
        message: "request.complete",
        metadata: {
          authToken: "abc",
        },
      }),
    ).toContain('"authToken":"[REDACTED]"')
  })
})
