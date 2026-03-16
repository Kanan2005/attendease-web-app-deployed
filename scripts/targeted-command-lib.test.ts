import { describe, expect, it } from "vitest"

import { buildTargetedCommand, normalizeForwardedArgs } from "./targeted-command-lib.mjs"

describe("targeted command helpers", () => {
  it("removes the pnpm forwarded separator before passing test file filters through", () => {
    expect(normalizeForwardedArgs(["--", "src/student-foundation.test.ts"])).toEqual([
      "src/student-foundation.test.ts",
    ])
  })

  it("defaults API integration commands to the integration-suite glob", () => {
    expect(buildTargetedCommand("api-integration")).toEqual({
      command: "pnpm",
      args: [
        "--filter",
        "@attendease/api",
        "exec",
        "vitest",
        "run",
        "src/**/*.integration.test.ts",
      ],
    })
  })

  it("forwards focused mobile and web test files correctly", () => {
    expect(buildTargetedCommand("mobile-targeted", ["--", "src/student-query.test.ts"])).toEqual({
      command: "pnpm",
      args: [
        "--filter",
        "@attendease/mobile",
        "exec",
        "vitest",
        "run",
        "src/student-query.test.ts",
      ],
    })

    expect(buildTargetedCommand("web-targeted", ["src/web-portal.test.ts"])).toEqual({
      command: "pnpm",
      args: ["--filter", "@attendease/web", "exec", "vitest", "run", "src/web-portal.test.ts"],
    })
  })

  it("keeps Android validation routes explicit", () => {
    expect(buildTargetedCommand("android-help")).toEqual({
      command: "pnpm",
      args: ["--filter", "@attendease/mobile", "exec", "expo", "run:android", "--help"],
    })

    expect(
      buildTargetedCommand("android-validate", ["--", "-d", "emulator-5554", "--port", "8083"]),
    ).toEqual({
      command: "pnpm",
      args: [
        "--filter",
        "@attendease/mobile",
        "exec",
        "expo",
        "run:android",
        "-d",
        "emulator-5554",
        "--port",
        "8083",
      ],
    })
  })
})
