import { describe, expect, it } from "vitest"

import { buildWorkerHealthPayload } from "./health.js"

describe("buildWorkerHealthPayload", () => {
  it("builds a valid worker health payload", () => {
    const payload = buildWorkerHealthPayload(
      {
        APP_VERSION: "0.1.0",
        DATABASE_URL: "postgresql://attendease:attendease@localhost:5432/attendease",
        REDIS_URL: "redis://localhost:6379",
        WORKER_PORT: "4010",
      },
      new Date("2026-03-14T00:00:00.000Z"),
    )

    expect(payload.service).toBe("worker")
    expect(payload.status).toBe("ok")
    expect(payload.timestamp).toBe("2026-03-14T00:00:00.000Z")
  })
})
