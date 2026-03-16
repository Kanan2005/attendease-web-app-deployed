import { describe, expect, it, vi } from "vitest"

import { ApiLoggerService } from "./api-logger.service.js"
import { ApiRequestContextService } from "./request-context.service.js"

describe("ApiLoggerService", () => {
  it("adds request context and redacts sensitive metadata", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined)
    const requestContext = new ApiRequestContextService()
    const logger = new ApiLoggerService(
      {
        LOG_LEVEL: "info",
      } as never,
      requestContext,
    )

    requestContext.run(
      {
        requestId: "req_logger_1",
        userId: "teacher_1",
      },
      () => {
        logger.info("auth.session.created", {
          authorization: "Bearer secret",
          nested: {
            refreshToken: "refresh-token",
            safe: "visible",
          },
        })
      },
    )

    expect(logSpy).toHaveBeenCalledWith(expect.any(String))
    const entry = String(logSpy.mock.calls[0]?.[0] ?? "")
    expect(entry).toContain('"requestId":"req_logger_1"')
    expect(entry).toContain('"userId":"teacher_1"')
    expect(entry).toContain('"authorization":"[REDACTED]"')
    expect(entry).toContain('"refreshToken":"[REDACTED]"')
    expect(entry).toContain('"safe":"visible"')

    logSpy.mockRestore()
  })

  it("skips debug logs when the configured level is higher", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined)
    const logger = new ApiLoggerService(
      {
        LOG_LEVEL: "warn",
      } as never,
      new ApiRequestContextService(),
    )

    logger.debug("debug.message")

    expect(logSpy).not.toHaveBeenCalled()

    logSpy.mockRestore()
  })
})
