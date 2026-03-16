import { randomUUID } from "node:crypto"

import type { ApiEnv } from "@attendease/config"
import { Inject, Injectable, type NestMiddleware } from "@nestjs/common"

import type { AuthRequestContext } from "../modules/auth/auth.types.js"
import { API_ENV } from "./api-env.js"
import { ApiLoggerService } from "./api-logger.service.js"
import { ApiMonitoringService } from "./api-monitoring.service.js"
import { ApiRequestContextService } from "./request-context.service.js"

type RequestWithContext = {
  id?: string
  method?: string
  originalUrl?: string
  url?: string
  headers?: Record<string, string | string[] | undefined>
  auth?: AuthRequestContext
}

type ResponseWithHeader = {
  statusCode?: number
  once: (event: "finish", listener: () => void) => void
  setHeader?: (name: string, value: string) => void
  header?: (name: string, value: string) => void
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(
    @Inject(API_ENV) private readonly env: ApiEnv,
    @Inject(ApiRequestContextService)
    private readonly requestContext: ApiRequestContextService,
    @Inject(ApiMonitoringService)
    private readonly monitoring: ApiMonitoringService,
    @Inject(ApiLoggerService)
    private readonly logger: ApiLoggerService,
  ) {}

  use(request: RequestWithContext, response: ResponseWithHeader, next: () => void) {
    const requestId = this.resolveRequestId(request)
    const path = request.originalUrl ?? request.url ?? "unknown"
    const method = request.method ?? "UNKNOWN"
    const startedAt = Date.now()
    const span = this.monitoring.startHttpRequestSpan({
      method,
      path,
      requestId,
    })

    this.setResponseHeader(response, this.env.REQUEST_ID_HEADER, requestId)

    response.once("finish", () => {
      const durationMs = Date.now() - startedAt
      const statusCode = response.statusCode ?? 200

      this.monitoring.finishHttpRequestSpan(span, {
        statusCode,
      })
      this.logger.info("http.request.completed", {
        method,
        path,
        statusCode,
        durationMs,
        role: request.auth?.activeRole ?? null,
      })
    })

    this.requestContext.run(
      {
        requestId,
        method,
        path,
      },
      () => next(),
    )
  }

  private resolveRequestId(request: RequestWithContext): string {
    const headerValue = request.headers?.[this.env.REQUEST_ID_HEADER]
    const normalizedHeader = Array.isArray(headerValue) ? headerValue[0] : headerValue

    return normalizedHeader?.trim() || request.id || randomUUID()
  }

  private setResponseHeader(response: ResponseWithHeader, name: string, value: string) {
    if (typeof response.header === "function") {
      response.header(name, value)
      return
    }

    response.setHeader?.(name, value)
  }
}
