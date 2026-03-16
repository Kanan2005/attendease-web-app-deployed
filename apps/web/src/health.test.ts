import { describe, expect, it } from "vitest"

import { buildWebHealthPayload } from "./health"

describe("buildWebHealthPayload", () => {
  it("builds a valid web health payload", () => {
    const payload = buildWebHealthPayload(new Date("2026-03-14T00:00:00.000Z"))

    expect(payload.service).toBe("web")
    expect(payload.status).toBe("ok")
    expect(payload.timestamp).toBe("2026-03-14T00:00:00.000Z")
  })
})
