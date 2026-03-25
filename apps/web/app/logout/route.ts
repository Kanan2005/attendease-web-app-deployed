import { createAuthApiClient } from "@attendease/auth"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { resolveWebAuthApiBaseUrl } from "../../src/web-auth-session"
import { webSessionCookieNames } from "../../src/web-portal"

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(webSessionCookieNames.accessToken)?.value

  if (accessToken) {
    try {
      const authClient = createAuthApiClient({
        baseUrl: resolveWebAuthApiBaseUrl(process.env as Record<string, string | undefined>),
        fetcher: fetch,
      })
      await authClient.logout(accessToken)
    } catch {
      // Best-effort server session invalidation; proceed with cookie cleanup
    }
  }

  for (const name of Object.values(webSessionCookieNames)) {
    cookieStore.delete({ name, path: "/" })
  }

  const url = new URL("/", request.url)
  return NextResponse.redirect(url, 303)
}
