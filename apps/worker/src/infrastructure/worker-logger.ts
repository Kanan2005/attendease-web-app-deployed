import type { WorkerEnv } from "@attendease/config"
import {
  type StructuredLogLevel,
  formatStructuredLogEntry,
  serializeError,
} from "@attendease/utils"

type WorkerLogOptions = {
  service?: string
}

type WorkerLogMetadata = {
  metadata?: unknown
  error?: unknown
}

const levelPriority: Record<StructuredLogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

export class WorkerLogger {
  constructor(
    private readonly env: WorkerEnv,
    private readonly options: WorkerLogOptions = {},
  ) {}

  debug(message: string, metadata?: unknown) {
    this.write("debug", message, { metadata })
  }

  info(message: string, metadata?: unknown) {
    this.write("info", message, { metadata })
  }

  warn(message: string, metadata?: unknown) {
    this.write("warn", message, { metadata })
  }

  error(message: string, error?: unknown, metadata?: unknown) {
    this.write("error", message, {
      ...(error !== undefined ? { error } : {}),
      ...(metadata !== undefined ? { metadata } : {}),
    })
  }

  private write(level: StructuredLogLevel, message: string, details: WorkerLogMetadata = {}) {
    if (levelPriority[level] < levelPriority[this.env.LOG_LEVEL]) {
      return
    }

    const serializedError = details.error !== undefined ? serializeError(details.error) : undefined
    const output = formatStructuredLogEntry({
      timestamp: new Date().toISOString(),
      level,
      service: this.options.service ?? "worker",
      message,
      ...(details.metadata !== undefined ? { metadata: details.metadata } : {}),
      ...(serializedError !== undefined ? { error: serializedError } : {}),
    })

    if (level === "error") {
      console.error(output)
      return
    }

    console.log(output)
  }
}
