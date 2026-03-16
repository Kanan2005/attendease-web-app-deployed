import { type HealthCheckResponse, healthCheckResponseSchema } from "@attendease/contracts"

export function buildWebHealthPayload(now: Date = new Date()): HealthCheckResponse {
  return healthCheckResponseSchema.parse({
    service: "web",
    status: "ok",
    version: process.env.APP_VERSION ?? "0.1.0",
    timestamp: now.toISOString(),
  })
}
