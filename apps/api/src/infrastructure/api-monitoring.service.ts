import type { ApiEnv } from "@attendease/config"
import { Inject, Injectable } from "@nestjs/common"
import { type Span, trace } from "@opentelemetry/api"
import * as Sentry from "@sentry/node"

import { API_ENV } from "./api-env.js"

let sentryInitialized = false

@Injectable()
export class ApiMonitoringService {
  private readonly tracer

  constructor(@Inject(API_ENV) private readonly env: ApiEnv) {
    this.tracer = trace.getTracer(this.env.OTEL_SERVICE_NAME)
    this.initializeSentry()
  }

  startHttpRequestSpan(params: { method: string; path: string; requestId: string }): Span | null {
    if (!this.env.TRACING_ENABLED) {
      return null
    }

    return this.tracer.startSpan("http.request", {
      attributes: {
        "http.method": params.method,
        "http.route": params.path,
        "attendease.request_id": params.requestId,
      },
    })
  }

  finishHttpRequestSpan(span: Span | null, params: { statusCode: number }) {
    if (!span) {
      return
    }

    span.setAttribute("http.status_code", params.statusCode)
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
}
