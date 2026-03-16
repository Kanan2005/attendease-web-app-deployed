import { pathToFileURL } from "node:url"

import { loadWorkerEnv } from "@attendease/config"
import { type HealthCheckResponse, healthCheckResponseSchema } from "@attendease/contracts"

export function buildWorkerHealthPayload(
  source: Record<string, string | undefined> = process.env,
  now: Date = new Date(),
): HealthCheckResponse {
  const env = loadWorkerEnv(source)

  return healthCheckResponseSchema.parse({
    service: "worker",
    status: "ok",
    version: env.APP_VERSION,
    timestamp: now.toISOString(),
  })
}

const isDirectExecution = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false

if (isDirectExecution) {
  console.log(JSON.stringify(buildWorkerHealthPayload(process.env), null, 2))
}
