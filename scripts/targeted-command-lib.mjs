const targetedCommandConfigs = {
  "api-targeted": {
    command: "pnpm",
    args: ["--filter", "@attendease/api", "exec", "vitest", "run"],
    defaultArgs: [],
  },
  "api-integration": {
    command: "pnpm",
    args: ["--filter", "@attendease/api", "exec", "vitest", "run"],
    defaultArgs: ["src/**/*.integration.test.ts"],
  },
  "mobile-targeted": {
    command: "pnpm",
    args: ["--filter", "@attendease/mobile", "exec", "vitest", "run"],
    defaultArgs: [],
  },
  "web-targeted": {
    command: "pnpm",
    args: ["--filter", "@attendease/web", "exec", "vitest", "run"],
    defaultArgs: [],
  },
  "android-help": {
    command: "pnpm",
    args: ["--filter", "@attendease/mobile", "exec", "expo", "run:android", "--help"],
    defaultArgs: [],
  },
  "android-validate": {
    command: "pnpm",
    args: ["--filter", "@attendease/mobile", "exec", "expo", "run:android"],
    defaultArgs: [],
  },
}

export function normalizeForwardedArgs(rawArgs) {
  return rawArgs.filter((entry, index) => !(index === 0 && entry === "--"))
}

export function buildTargetedCommand(kind, rawArgs = []) {
  const config = targetedCommandConfigs[kind]

  if (!config) {
    throw new Error(
      `Unknown targeted command kind "${kind}". Expected one of: ${Object.keys(
        targetedCommandConfigs,
      ).join(", ")}.`,
    )
  }

  const forwardedArgs = normalizeForwardedArgs(rawArgs)

  return {
    command: config.command,
    args: [...config.args, ...(forwardedArgs.length > 0 ? forwardedArgs : config.defaultArgs)],
  }
}
