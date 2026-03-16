import { BadRequestException, HttpException } from "@nestjs/common"
import { describe, expect, it, vi } from "vitest"

import { ApiExceptionFilter } from "./api-exception.filter.js"
import type { ApiLoggerService } from "./api-logger.service.js"
import type { ApiMonitoringService } from "./api-monitoring.service.js"
import { ApiRequestContextService } from "./request-context.service.js"

describe("ApiExceptionFilter", () => {
  it("formats validation errors with request ids", () => {
    const requestContext = new ApiRequestContextService()
    const logger = {
      write: vi.fn(),
    } as unknown as ApiLoggerService
    const monitoring = {
      recordException: vi.fn(),
    } as unknown as ApiMonitoringService
    const filter = new ApiExceptionFilter(requestContext, logger, monitoring)
    const send = vi.fn()
    const response = {
      status: vi.fn().mockReturnThis(),
      send,
    }

    requestContext.run(
      {
        requestId: "req_456",
      },
      () => {
        filter.catch(
          new BadRequestException({
            message: "Invalid request payload.",
            issues: [{ path: ["email"], message: "Required" }],
          }),
          {
            switchToHttp: () => ({
              getRequest: () => ({
                method: "POST",
                url: "/auth/login",
              }),
              getResponse: () => response,
            }),
          } as never,
        )
      },
    )

    expect(response.status).toHaveBeenCalledWith(400)
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: "Invalid request payload.",
        requestId: "req_456",
        issues: [{ path: ["email"], message: "Required" }],
      }),
    )
  })

  it("converts unknown errors into a safe 500 response", () => {
    const logger = {
      write: vi.fn(),
    } as unknown as ApiLoggerService
    const monitoring = {
      recordException: vi.fn(),
    } as unknown as ApiMonitoringService
    const filter = new ApiExceptionFilter(new ApiRequestContextService(), logger, monitoring)
    const send = vi.fn()
    const response = {
      status: vi.fn().mockReturnThis(),
      send,
    }

    filter.catch(new Error("database exploded"), {
      switchToHttp: () => ({
        getRequest: () => ({
          method: "GET",
          url: "/health",
        }),
        getResponse: () => response,
      }),
    } as never)

    expect(response.status).toHaveBeenCalledWith(500)
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: "Internal server error.",
      }),
    )
    expect(monitoring.recordException).toHaveBeenCalledWith(null, expect.any(Error))
    expect(logger.write).toHaveBeenCalledWith(
      "error",
      "http.request.failed",
      expect.objectContaining({
        metadata: expect.objectContaining({
          method: "GET",
          path: "/health",
          statusCode: 500,
          issues: null,
        }),
        error: expect.any(Error),
      }),
    )
  })
})
