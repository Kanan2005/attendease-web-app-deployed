// Next.js only inlines direct process.env.NEXT_PUBLIC_* member expressions at
// build time. Passing `process.env` as a whole object to a function loses the
// inlining — every key resolves to `undefined` on the client side, causing Zod
// defaults (e.g. http://localhost:4000) to kick in.
//
// This module builds the source object with direct references so the bundler
// can replace each one with its literal value at bundle time.

import { loadWebEnv } from "@attendease/config"

export const webEnvSource: Record<string, string | undefined> = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  WEB_INTERNAL_API_URL: process.env.WEB_INTERNAL_API_URL,
  NEXT_PUBLIC_GOOGLE_OIDC_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_OIDC_CLIENT_ID,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  NEXT_PUBLIC_FEATURE_BLUETOOTH_ATTENDANCE_ENABLED:
    process.env.NEXT_PUBLIC_FEATURE_BLUETOOTH_ATTENDANCE_ENABLED,
  NEXT_PUBLIC_FEATURE_EMAIL_AUTOMATION_ENABLED:
    process.env.NEXT_PUBLIC_FEATURE_EMAIL_AUTOMATION_ENABLED,
}

export const webEnv = loadWebEnv(webEnvSource)
