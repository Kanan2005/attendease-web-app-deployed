import { describe, expect, it, vi } from "vitest"

import type { ApiLoggerService } from "./api-logger.service.js"
import type { ApiMonitoringService } from "./api-monitoring.service.js"
import { RequestContextMiddleware } from "./request-context.middleware.js"
import { ApiRequestContextService } from "./request-context.service.js"

describe("RequestContextMiddleware", () => {
  it("propagates request ids and sets the response header", () => {
    const requestContext = new ApiRequestContextService()
    const logger = {
      info: vi.fn(),
    } as unknown as ApiLoggerService
    const monitoring = {
      startHttpRequestSpan: vi.fn().mockReturnValue(null),
      finishHttpRequestSpan: vi.fn(),
    } as unknown as ApiMonitoringService
    const middleware = new RequestContextMiddleware(
      {
        REQUEST_ID_HEADER: "x-request-id",
      } as never,
      requestContext,
      monitoring,
      logger,
    )
    const response = {
      statusCode: 200,
      header: vi.fn(),
      once: vi.fn((_event: "finish", listener: () => void) => {
        listener()
      }),
    }

    middleware.use(
      {
        method: "GET",
        url: "/health",
        headers: {
          "x-request-id": "req_123",
        },
      },
      response,
      () => {
        expect(requestContext.get()).toMatchObject({
          requestId: "req_123",
          method: "GET",
          path: "/health",
        })
      },
    )

    expect(response.header).toHaveBeenCalledWith("x-request-id", "req_123")
    expect(logger.info).toHaveBeenCalledWith(
      "http.request.completed",
      expect.objectContaining({
        method: "GET",
        path: "/health",
        statusCode: 200,
      }),
    )
  })

  it("falls back to request ids and setHeader when the preferred header helper is unavailable", () => {
    const requestContext = new ApiRequestContextService()
    const logger = {
      info: vi.fn(),
    } as unknown as ApiLoggerService
    const monitoring = {
      startHttpRequestSpan: vi.fn().mockReturnValue(null),
      finishHttpRequestSpan: vi.fn(),
    } as unknown as ApiMonitoringService
    const middleware = new RequestContextMiddleware(
      {
        REQUEST_ID_HEADER: "x-request-id",
      } as never,
      requestContext,
      monitoring,
      logger,
    )
    const response = {
      statusCode: 202,
      setHeader: vi.fn(),
      once: vi.fn((_event: "finish", listener: () => void) => {
        listener()
      }),
    }

    middleware.use(
      {
        id: "req_from_fastify",
        method: "POST",
        originalUrl: "/sessions/qr",
        headers: {},
      },
      response,
      () => {
        expect(requestContext.get()).toMatchObject({
          requestId: "req_from_fastify",
          method: "POST",
          path: "/sessions/qr",
        })
      },
    )

    expect(response.setHeader).toHaveBeenCalledWith("x-request-id", "req_from_fastify")
    expect(logger.info).toHaveBeenCalledWith(
      "http.request.completed",
      expect.objectContaining({
        method: "POST",
        path: "/sessions/qr",
        statusCode: 202,
      }),
    )
  })
})
