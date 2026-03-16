import { describe, expect, it, vi } from "vitest"

import { WorkerLogger } from "./worker-logger.js"

describe("WorkerLogger", () => {
  it("redacts sensitive metadata before writing logs", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined)
    const logger = new WorkerLogger({
      NODE_ENV: "test",
      APP_VERSION: "0.1.0",
      LOG_LEVEL: "info",
    } as never)

    logger.info("worker.cycle.complete", {
      authToken: "secret-token",
    })

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"authToken":"[REDACTED]"'))

    logSpy.mockRestore()
  })
})
