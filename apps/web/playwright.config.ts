import { defineConfig, devices } from "@playwright/test"

/**
 * Playwright config for the Attendease web admin E2E suite.
 *
 * IMPORTANT — Prerequisites for running this locally:
 *   1. The API must be running and reachable. By default the suite assumes
 *      `http://localhost:4000`. Start it via `pnpm --filter @attendease/api dev`.
 *   2. The DB must have the development seed data loaded (admin/teacher/students
 *      with the fixtures used below). Reset via:
 *        pnpm --filter @attendease/db reset:seed
 *   3. The web app must be running on `http://localhost:3000`. Either start it
 *      manually with `pnpm --filter @attendease/web dev` or let Playwright
 *      auto-start it via the `webServer` block below.
 *
 * The suite intentionally does NOT spin up the API automatically because the
 * API needs a fresh DB + seed data, which is a multi-step setup that's better
 * handled by the developer once before running the suite.
 *
 * Run:
 *   pnpm --filter @attendease/web test:e2e          # headless
 *   pnpm --filter @attendease/web test:e2e:ui       # Playwright inspector UI
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "line" : "list",
  timeout: 30_000,
  expect: { timeout: 8_000 },

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: process.env.PLAYWRIGHT_NO_WEB_SERVER
    ? undefined
    : {
        command: "pnpm exec next dev -H 127.0.0.1 -p 3000",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
