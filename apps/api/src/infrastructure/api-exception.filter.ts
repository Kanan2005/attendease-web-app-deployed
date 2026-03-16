import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from "@nestjs/common"

import { ApiLoggerService } from "./api-logger.service.js"
import { ApiMonitoringService } from "./api-monitoring.service.js"
import { ApiRequestContextService } from "./request-context.service.js"

type ResponseWithStatus = {
  status: (code: number) => ResponseWithStatus
  send: (body: unknown) => void
}

type RequestLike = {
  method?: string
  originalUrl?: string
  url?: string
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(ApiRequestContextService)
    private readonly requestContext: ApiRequestContextService,
    @Inject(ApiLoggerService)
    private readonly logger: ApiLoggerService,
    @Inject(ApiMonitoringService)
    private readonly monitoring: ApiMonitoringService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp()
    const request = http.getRequest<RequestLike>()
    const response = http.getResponse<ResponseWithStatus>()
    const context = this.requestContext.get()
    const normalized = this.normalizeException(exception)
    const path = request.originalUrl ?? request.url ?? "unknown"

    if (normalized.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.monitoring.recordException(null, exception)
      this.logger.write("error", "http.request.failed", {
        metadata: {
          method: request.method ?? "UNKNOWN",
          path,
          statusCode: normalized.statusCode,
          issues: normalized.issues ?? null,
        },
        error: exception,
      })
    } else {
      this.logger.write("warn", "http.request.rejected", {
        metadata: {
          method: request.method ?? "UNKNOWN",
          path,
          statusCode: normalized.statusCode,
          issues: normalized.issues ?? null,
        },
      })
    }

    response.status(normalized.statusCode).send({
      statusCode: normalized.statusCode,
      error: normalized.error,
      message: normalized.message,
      requestId: context?.requestId ?? null,
      ...(normalized.issues ? { issues: normalized.issues } : {}),
    })
  }

  private normalizeException(exception: unknown): {
    statusCode: number
    error: string
    message: string
    issues?: unknown
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus()
      const response = exception.getResponse()

      if (typeof response === "string") {
        return {
          statusCode,
          error: this.toErrorLabel(statusCode),
          message: response,
        }
      }

      if (response && typeof response === "object") {
        const responseRecord = response as Record<string, unknown>
        const message = Array.isArray(responseRecord.message)
          ? responseRecord.message.join(", ")
          : typeof responseRecord.message === "string"
            ? responseRecord.message
            : exception.message

        return {
          statusCode,
          error:
            typeof responseRecord.error === "string"
              ? responseRecord.error
              : this.toErrorLabel(statusCode),
          message,
          ...(responseRecord.issues !== undefined ? { issues: responseRecord.issues } : {}),
        }
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: this.toErrorLabel(HttpStatus.INTERNAL_SERVER_ERROR),
      message: "Internal server error.",
    }
  }

  private toErrorLabel(statusCode: number): string {
    const statusName = HttpStatus[statusCode]

    return typeof statusName === "string"
      ? statusName
          .split("_")
          .map((segment) => segment[0] + segment.slice(1).toLowerCase())
          .join(" ")
      : "Error"
  }
}
