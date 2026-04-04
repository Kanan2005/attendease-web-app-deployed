import { createAuthApiClient } from "@attendease/auth"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import {
  buildWebPortalCookieDefinitions,
  resolveWebAuthApiBaseUrl,
  resolveWebPortalCookieSecure,
} from "../../../../src/web-auth-session"
import { webSessionCookieNames } from "../../../../src/web-portal-types"

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get(webSessionCookieNames.refreshToken)?.value
  const activeRole = cookieStore.get(webSessionCookieNames.activeRole)?.value

  if (!refreshToken) {
    return NextResponse.json({ refreshed: false }, { status: 401 })
  }

  try {
    const authClient = createAuthApiClient({
      baseUrl: resolveWebAuthApiBaseUrl(process.env as Record<string, string | undefined>),
      fetcher: fetch,
    })

    const authSession = await authClient.refresh({
      refreshToken,
      requestedRole: activeRole === "ADMIN" || activeRole === "TEACHER" ? activeRole : undefined,
    })

    const secure = resolveWebPortalCookieSecure({
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      requestUrl: request.url,
      requestHeaders: request.headers,
    })

    for (const cookie of buildWebPortalCookieDefinitions({ authSession, secure })) {
      cookieStore.set(cookie.name, cookie.value, cookie.options)
    }

    return NextResponse.json({ refreshed: true })
  } catch {
    for (const name of Object.values(webSessionCookieNames)) {
      cookieStore.delete({ name, path: "/" })
    }
    return NextResponse.json({ refreshed: false }, { status: 401 })
  }
}
