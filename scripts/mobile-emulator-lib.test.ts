import { describe, expect, it } from "vitest"

import {
  buildAdbReverseArgs,
  buildEmulatorLaunchPlan,
  resolveEmulatorApiUrl,
} from "./mobile-emulator-lib.mjs"

describe("mobile emulator launch helpers", () => {
  it("builds the localhost API URL for adb-reversed emulator traffic", () => {
    expect(resolveEmulatorApiUrl()).toBe("http://127.0.0.1:4000")
    expect(resolveEmulatorApiUrl({ apiPort: 4555 })).toBe("http://127.0.0.1:4555")
  })

  it("builds adb reverse args with or without a device serial", () => {
    expect(buildAdbReverseArgs(8101)).toEqual(["reverse", "tcp:8101", "tcp:8101"])
    expect(buildAdbReverseArgs(4000, "emulator-5554")).toEqual([
      "-s",
      "emulator-5554",
      "reverse",
      "tcp:4000",
      "tcp:4000",
    ])
  })

  it("builds the full emulator launch plan", () => {
    const plan = buildEmulatorLaunchPlan({ deviceSerial: "emulator-5554" })

    expect(plan.apiUrl).toBe("http://127.0.0.1:4000")
    expect(plan.reverseCommands).toEqual([
      ["-s", "emulator-5554", "reverse", "tcp:8101", "tcp:8101"],
      ["-s", "emulator-5554", "reverse", "tcp:4000", "tcp:4000"],
    ])
    expect(plan.expoArgs).toEqual([
      "--filter",
      "@attendease/mobile",
      "exec",
      "expo",
      "start",
      "--clear",
      "--host",
      "localhost",
      "--port",
      "8101",
    ])
  })
})
