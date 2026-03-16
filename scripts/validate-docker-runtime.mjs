import process from "node:process"
import { setTimeout as delay } from "node:timers/promises"

const apiBaseUrl =
  process.env.API_BASE_URL ?? `http://127.0.0.1:${process.env.API_HOST_PORT ?? "4000"}`
const webBaseUrl =
  process.env.WEB_BASE_URL ?? `http://127.0.0.1:${process.env.WEB_HOST_PORT ?? "3000"}`
const timeoutMs = Number.parseInt(process.env.DOCKER_SMOKE_TIMEOUT_MS ?? "120000", 10)
const intervalMs = Number.parseInt(process.env.DOCKER_SMOKE_INTERVAL_MS ?? "2000", 10)

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}`)
  }

  return response.json()
}

async function waitForCheck(label, url, validate) {
  const deadline = Date.now() + timeoutMs
  let lastError = null

  while (Date.now() < deadline) {
    try {
      const payload = await fetchJson(url)
      validate(payload)
      console.log(`[docker-smoke] ${label} ok`)
      console.log(JSON.stringify(payload, null, 2))
      return payload
    } catch (error) {
      lastError = error
      await delay(intervalMs)
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError)
  throw new Error(`${label} failed before timeout: ${message}`)
}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} payload must be an object`)
  }
}

await waitForCheck("api health", `${apiBaseUrl}/health`, (payload) => {
  assertObject(payload, "api health")

  if (payload.service !== "api" || payload.status !== "ok") {
    throw new Error("api health payload did not report service=api and status=ok")
  }
})

await waitForCheck("api readiness", `${apiBaseUrl}/health/ready`, (payload) => {
  assertObject(payload, "api readiness")

  if (payload.service !== "api" || payload.status !== "ready") {
    throw new Error("api readiness payload did not report service=api and status=ready")
  }
})

await waitForCheck("api queue health", `${apiBaseUrl}/health/queues`, (payload) => {
  assertObject(payload, "api queue health")

  if (payload.service !== "api" || payload.status !== "healthy") {
    throw new Error("api queue health payload did not report service=api and status=healthy")
  }

  if (!Array.isArray(payload.queues)) {
    throw new Error("api queue health payload is missing queues")
  }
})

await waitForCheck("web health", `${webBaseUrl}/health`, (payload) => {
  assertObject(payload, "web health")

  if (payload.service !== "web" || payload.status !== "ok") {
    throw new Error("web health payload did not report service=web and status=ok")
  }
})

console.log("[docker-smoke] all runtime HTTP health checks passed")
