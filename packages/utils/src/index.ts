export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

export function toIsoTimestamp(date: Date): string {
  return date.toISOString()
}

export type StructuredLogLevel = "debug" | "info" | "warn" | "error"

export type StructuredLogEntry = {
  timestamp: string
  level: StructuredLogLevel
  service: string
  message: string
  context?: string
  requestId?: string | null
  userId?: string | null
  metadata?: unknown
  error?: {
    name: string
    message: string
    stack?: string
  }
}

const redactedKeyPattern =
  /authorization|cookie|password|secret|token|attestation|credential|accesskey|secretkey/i

export function redactSensitiveData(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => redactSensitiveData(entry))
  }

  if (value instanceof Error) {
    return serializeError(value)
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        redactedKeyPattern.test(key) ? "[REDACTED]" : redactSensitiveData(entry),
      ]),
    )
  }

  return value
}

export function serializeError(error: unknown): StructuredLogEntry["error"] {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
    }
  }

  return {
    name: "UnknownError",
    message: typeof error === "string" ? error : "Unknown error",
  }
}

export function formatStructuredLogEntry(entry: StructuredLogEntry): string {
  return JSON.stringify(redactSensitiveData(entry))
}
