import { describe, expect, it } from "vitest"

import { buildSessionChannel, realtimeChannels } from "./index"

describe("realtime helpers", () => {
  it("keeps the agreed channel names", () => {
    expect(realtimeChannels).toEqual({
      session: "session",
      exportJob: "export-job",
      analytics: "analytics",
    })
  })

  it("builds per-session channel names", () => {
    expect(buildSessionChannel("session-123")).toBe("session:session-123")
  })
})
