import type { WorkerEnv } from "@attendease/config"
import { type Span, trace } from "@opentelemetry/api"
import * as Sentry from "@sentry/node"

let sentryInitialized = false

export class WorkerMonitoring {
  private readonly tracer

  constructor(private readonly env: WorkerEnv) {
    this.tracer = trace.getTracer(this.env.OTEL_SERVICE_NAME)
    this.initializeSentry()
  }

  startSpan(name: string, metadata?: Record<string, unknown>): Span | null {
    if (!this.env.TRACING_ENABLED) {
      return null
    }

    const attributes = metadata ? this.toAttributes(metadata) : undefined

    return this.tracer.startSpan(name, {
      ...(attributes ? { attributes } : {}),
    })
  }

  finishSpan(span: Span | null, metadata?: Record<string, unknown>) {
    if (!span) {
      return
    }

    for (const [key, value] of Object.entries(metadata ?? {})) {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        span.setAttribute(key, value)
      }
    }
    span.end()
  }

  recordException(span: Span | null, error: unknown) {
    span?.recordException(error instanceof Error ? error : new Error(String(error)))

    if (this.env.SENTRY_DSN) {
      Sentry.captureException(error)
    }
  }

  private initializeSentry() {
    if (sentryInitialized || !this.env.SENTRY_DSN) {
      return
    }

    Sentry.init({
      dsn: this.env.SENTRY_DSN,
      environment: this.env.NODE_ENV,
      release: this.env.APP_VERSION,
      tracesSampleRate: this.env.SENTRY_TRACES_SAMPLE_RATE,
    })
    sentryInitialized = true
  }

  private toAttributes(metadata: Record<string, unknown>) {
    const attributes: Record<string, string | number | boolean> = {}

    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        attributes[key] = value
      }
    }

    return attributes
  }
}
