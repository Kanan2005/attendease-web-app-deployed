import { spawnSync } from "node:child_process"

import { buildTargetedCommand } from "./targeted-command-lib.mjs"

const [, , kind, ...rawArgs] = process.argv

if (!kind) {
  console.error(
    "Missing targeted command kind. Use one of: api-targeted, api-integration, mobile-targeted, web-targeted, android-help, android-validate.",
  )
  process.exit(1)
}

const { command, args } = buildTargetedCommand(kind, rawArgs)
const result = spawnSync(command, args, {
  stdio: "inherit",
})

if (result.error) {
  throw result.error
}

process.exit(result.status ?? 1)
