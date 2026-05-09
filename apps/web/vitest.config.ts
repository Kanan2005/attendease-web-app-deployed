import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    // Vitest discovers any *.test.* / *.spec.* file by default. The Playwright
    // E2E suite under apps/web/e2e/ is a separate runner ("pnpm test:e2e") and
    // must NOT be picked up here, otherwise calls like
    // `test.describe.configure({ mode: "serial" })` fail because Vitest's
    // `test.describe` does not implement `.configure()`.
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "e2e/**"],
  },
})
