import { AuthApiClientError } from "@attendease/auth"
import { describe, expect, it } from "vitest"

import {
  friendlyErrorMessage,
  humanizeZodMessage,
  isZodError,
} from "./friendly-error-message"

// ---------------------------------------------------------------------------
// helpers to build fake ZodError-like objects without importing zod
// ---------------------------------------------------------------------------
function fakeZodError(
  issues: { path: (string | number)[]; message: string }[],
): Error & { issues: typeof issues } {
  const err = new Error("ZodError JSON payload") as Error & { issues: typeof issues }
  err.name = "ZodError"
  err.issues = issues
  return err
}

// ===========================================================================
// isZodError
// ===========================================================================
describe("isZodError", () => {
  it("returns true for an Error with name=ZodError and an issues array", () => {
    expect(isZodError(fakeZodError([{ path: ["email"], message: "Invalid email" }]))).toBe(true)
  })

  it("returns false for a plain Error", () => {
    expect(isZodError(new Error("plain"))).toBe(false)
  })

  it("returns false for a non-Error value", () => {
    expect(isZodError("just a string")).toBe(false)
    expect(isZodError(null)).toBe(false)
    expect(isZodError(undefined)).toBe(false)
    expect(isZodError(42)).toBe(false)
  })

  it("returns false if name is ZodError but issues is missing", () => {
    const err = new Error("no issues")
    err.name = "ZodError"
    expect(isZodError(err)).toBe(false)
  })
})

// ===========================================================================
// humanizeZodMessage
// ===========================================================================
describe("humanizeZodMessage", () => {
  it("strips leading 'String ' and replaces 'character(s)' with 'characters'", () => {
    expect(humanizeZodMessage("String must contain at least 8 character(s)")).toBe(
      "Must contain at least 8 characters",
    )
  })

  it("is case-insensitive for the 'String' prefix", () => {
    expect(humanizeZodMessage("string must contain at least 8 character(s)")).toBe(
      "Must contain at least 8 characters",
    )
  })

  it("leaves messages without the String prefix unchanged (except capitalisation)", () => {
    expect(humanizeZodMessage("Invalid email")).toBe("Invalid email")
  })

  it("handles messages that are already clean", () => {
    expect(humanizeZodMessage("Required")).toBe("Required")
  })
})

// ===========================================================================
// friendlyErrorMessage — ZodError branch
// ===========================================================================
describe("friendlyErrorMessage — ZodError", () => {
  it("formats a password-too-short error with a human-readable field label", () => {
    const err = fakeZodError([
      { path: ["password"], message: "String must contain at least 8 character(s)" },
    ])
    expect(friendlyErrorMessage(err, "fallback")).toBe(
      "Password: must contain at least 8 characters",
    )
  })

  it("formats an email validation error", () => {
    const err = fakeZodError([{ path: ["email"], message: "Invalid email" }])
    expect(friendlyErrorMessage(err, "fallback")).toBe("Email: invalid email")
  })

  it("falls back to the raw message when the field has no label", () => {
    const err = fakeZodError([{ path: ["unknownField"], message: "Too long" }])
    expect(friendlyErrorMessage(err, "fallback")).toBe("unknownField: too long")
  })

  it("returns fallback when the issues array is empty", () => {
    const err = fakeZodError([])
    expect(friendlyErrorMessage(err, "fallback")).toBe("fallback")
  })

  it("uses only the first issue when there are multiple", () => {
    const err = fakeZodError([
      { path: ["password"], message: "String must contain at least 8 character(s)" },
      { path: ["email"], message: "Invalid email" },
    ])
    expect(friendlyErrorMessage(err, "fallback")).toBe(
      "Password: must contain at least 8 characters",
    )
  })

  it("returns just the message when path is empty", () => {
    const err = fakeZodError([{ path: [], message: "Invalid input" }])
    expect(friendlyErrorMessage(err, "fallback")).toBe("Invalid input")
  })

  it("supports custom field labels", () => {
    const err = fakeZodError([{ path: ["myField"], message: "Required" }])
    expect(friendlyErrorMessage(err, "fallback", { myField: "My Custom Field" })).toBe(
      "My Custom Field: required",
    )
  })
})

// ===========================================================================
// friendlyErrorMessage — AuthApiClientError branch
// ===========================================================================
describe("friendlyErrorMessage — AuthApiClientError", () => {
  it("extracts the server message from details.message", () => {
    const err = new AuthApiClientError("generic", 409, {
      message: "An account already exists for this email.",
    })
    expect(friendlyErrorMessage(err, "fallback")).toBe(
      "An account already exists for this email.",
    )
  })

  it("returns fallback when details has no message field", () => {
    const err = new AuthApiClientError("generic", 500, { error: "Internal Server Error" })
    expect(friendlyErrorMessage(err, "Server error")).toBe("Server error")
  })

  it("returns fallback when details is null", () => {
    const err = new AuthApiClientError("generic", 500, null)
    expect(friendlyErrorMessage(err, "Server error")).toBe("Server error")
  })
})

// ===========================================================================
// friendlyErrorMessage — generic Error / unknown
// ===========================================================================
describe("friendlyErrorMessage — generic errors", () => {
  it("uses error.message for a plain Error", () => {
    expect(friendlyErrorMessage(new Error("Network timeout"), "fallback")).toBe("Network timeout")
  })

  it("returns fallback for a non-Error value (string)", () => {
    expect(friendlyErrorMessage("random string", "fallback")).toBe("fallback")
  })

  it("returns fallback for null", () => {
    expect(friendlyErrorMessage(null, "Something went wrong")).toBe("Something went wrong")
  })

  it("returns fallback for undefined", () => {
    expect(friendlyErrorMessage(undefined, "Something went wrong")).toBe("Something went wrong")
  })
})
