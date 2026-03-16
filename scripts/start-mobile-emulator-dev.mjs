import { spawn, spawnSync } from "node:child_process"

import { buildEmulatorLaunchPlan } from "./mobile-emulator-lib.mjs"

function parseArgs(rawArgs) {
  const options = {}

  for (let index = 0; index < rawArgs.length; index += 1) {
    const current = rawArgs[index]
    const next = rawArgs[index + 1]

    if ((current === "--device" || current === "-d") && next) {
      options.deviceSerial = next
      index += 1
      continue
    }

    if ((current === "--port" || current === "-p") && next) {
      options.metroPort = Number(next)
      index += 1
      continue
    }

    if (current === "--api-port" && next) {
      options.apiPort = Number(next)
      index += 1
    }
  }

  return options
}

const options = parseArgs(process.argv.slice(2))
const plan = buildEmulatorLaunchPlan(options)

for (const reverseArgs of plan.reverseCommands) {
  const reverseResult = spawnSync("adb", reverseArgs, {
    stdio: "inherit",
  })

  if (reverseResult.error) {
    throw reverseResult.error
  }

  if ((reverseResult.status ?? 1) !== 0) {
    process.exit(reverseResult.status ?? 1)
  }
}

console.log(
  `Starting emulator-safe Metro on port ${plan.metroPort} with EXPO_PUBLIC_API_URL=${plan.apiUrl}`,
)

const child = spawn("pnpm", plan.expoArgs, {
  stdio: "inherit",
  env: {
    ...process.env,
    EXPO_PUBLIC_API_URL: plan.apiUrl,
  },
})

child.on("exit", (code) => {
  process.exit(code ?? 1)
})
