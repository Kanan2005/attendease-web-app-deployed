import type { ApiEnv } from "@attendease/config"
import {
  type StructuredLogLevel,
  formatStructuredLogEntry,
  serializeError,
} from "@attendease/utils"
import { Inject, Injectable, type LoggerService } from "@nestjs/common"

import { API_ENV } from "./api-env.js"
import { ApiRequestContextService } from "./request-context.service.js"

type LogMetadata = {
  context?: string
  metadata?: unknown
  error?: unknown
  requestId?: string | null
  userId?: string | null
}

const levelPriority: Record<StructuredLogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

@Injectable()
export class ApiLoggerService implements LoggerService {
  constructor(
    @Inject(API_ENV) private readonly env: ApiEnv,
    @Inject(ApiRequestContextService)
    private readonly requestContext: ApiRequestContextService,
  ) {}

  log(message: unknown, context?: string) {
    this.write("info", this.stringifyMessage(message), {
      ...(context ? { context } : {}),
    })
  }

  error(message: unknown, trace?: string, context?: string) {
    this.write("error", this.stringifyMessage(message), {
      ...(context ? { context } : {}),
      ...(trace ? { error: new Error(trace) } : {}),
    })
  }

  warn(message: unknown, context?: string) {
    this.write("warn", this.stringifyMessage(message), {
      ...(context ? { context } : {}),
    })
  }

  debug(message: unknown, context?: string) {
    this.write("debug", this.stringifyMessage(message), {
      ...(context ? { context } : {}),
    })
  }

  verbose(message: unknown, context?: string) {
    this.debug(message, context)
  }

  info(message: string, metadata?: unknown, context?: string) {
    this.write("info", message, {
      ...(context ? { context } : {}),
      ...(metadata !== undefined ? { metadata } : {}),
    })
  }

  write(level: StructuredLogLevel, message: string, details: LogMetadata = {}) {
    if (levelPriority[level] < levelPriority[this.env.LOG_LEVEL]) {
      return
    }

    const requestContext = this.requestContext.get()
    const serializedError = details.error !== undefined ? serializeError(details.error) : undefined
    const entry = formatStructuredLogEntry({
      timestamp: new Date().toISOString(),
      level,
      service: "api",
      message,
      ...(details.context ? { context: details.context } : {}),
      requestId: details.requestId ?? requestContext?.requestId ?? null,
      userId: details.userId ?? requestContext?.userId ?? null,
      ...(details.metadata !== undefined ? { metadata: details.metadata } : {}),
      ...(serializedError !== undefined ? { error: serializedError } : {}),
    })

    if (level === "error") {
      console.error(entry)
      return
    }

    console.log(entry)
  }

  private stringifyMessage(message: unknown): string {
    if (typeof message === "string") {
      return message
    }

    if (message instanceof Error) {
      return message.message
    }

    return String(message)
  }
}
