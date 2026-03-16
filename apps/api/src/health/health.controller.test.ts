import { describe, expect, it } from "vitest"

import { HealthController } from "./health.controller.js"

describe("HealthController", () => {
  it("returns a valid health payload", () => {
    const controller = new HealthController({
      getLiveness: () => ({
        service: "api",
        status: "ok",
        version: "0.1.0",
        timestamp: "2026-03-15T00:00:00.000Z",
      }),
    } as never)
    const payload = controller.getHealth()

    expect(payload.service).toBe("api")
    expect(payload.status).toBe("ok")
  })

  it("marks degraded readiness responses as service unavailable", async () => {
    let statusCode = 200
    const controller = new HealthController({
      getLiveness: () => ({
        service: "api",
        status: "ok",
        version: "0.1.0",
        timestamp: "2026-03-15T00:00:00.000Z",
      }),
      getReadiness: async () => ({
        service: "api",
        status: "degraded",
        version: "0.1.0",
        timestamp: "2026-03-15T00:00:00.000Z",
        checks: [],
      }),
    } as never)

    const payload = await controller.getReadiness({
      code(nextStatusCode: number) {
        statusCode = nextStatusCode
      },
    } as never)

    expect(statusCode).toBe(503)
    expect(payload.status).toBe("degraded")
  })
})
