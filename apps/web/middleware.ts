import { createAuthApiClient } from "@attendease/auth"
import { type NextRequest, NextResponse } from "next/server"

import { resolveWebAuthApiBaseUrl, resolveWebPortalCookieSecure } from "./src/web-auth-session"
import { webSessionCookieNames } from "./src/web-portal-types"

const PROTECTED_PREFIXES = ["/teacher", "/admin"]

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!isProtectedPath(pathname)) {
    return NextResponse.next()
  }

  const accessToken = request.cookies.get(webSessionCookieNames.accessToken)?.value
  const refreshToken = request.cookies.get(webSessionCookieNames.refreshToken)?.value

  if (accessToken) {
    return NextResponse.next()
  }

  if (!refreshToken) {
    return NextResponse.next()
  }

  const activeRole = request.cookies.get(webSessionCookieNames.activeRole)?.value ?? undefined

  try {
    const authClient = createAuthApiClient({
      baseUrl: resolveWebAuthApiBaseUrl(process.env as Record<string, string | undefined>),
      fetcher: fetch,
    })

    const authSession = await authClient.refresh({
      refreshToken,
      requestedRole: activeRole === "ADMIN" || activeRole === "TEACHER" ? activeRole : undefined,
    })

    const response = NextResponse.next()
    const expires = new Date(authSession.tokens.accessTokenExpiresAt)

    const secure = resolveWebPortalCookieSecure({
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      requestUrl: request.url,
      requestHeaders: request.headers,
    })

    const cookieBase = {
      httpOnly: true as const,
      sameSite: "lax" as const,
      path: "/",
      secure,
      expires,
    }

    response.cookies.set(webSessionCookieNames.accessToken, authSession.tokens.accessToken, cookieBase)
    response.cookies.set(webSessionCookieNames.refreshToken, authSession.tokens.refreshToken, cookieBase)
    response.cookies.set(webSessionCookieNames.activeRole, authSession.user.activeRole, cookieBase)
    response.cookies.set(
      webSessionCookieNames.availableRoles,
      authSession.user.availableRoles.join(","),
      cookieBase,
    )
    response.cookies.set(
      webSessionCookieNames.displayName,
      authSession.user.displayName ?? "",
      cookieBase,
    )
    response.cookies.set(webSessionCookieNames.email, authSession.user.email ?? "", cookieBase)

    return response
  } catch {
    const response = NextResponse.next()
    for (const name of Object.values(webSessionCookieNames)) {
      response.cookies.delete({ name, path: "/" })
    }
    return response
  }
}

export const config = {
  matcher: ["/teacher/:path*", "/admin/:path*"],
}
