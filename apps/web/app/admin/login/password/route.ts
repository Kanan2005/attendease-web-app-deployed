import { createAuthApiClient } from "@attendease/auth"
import { loadWebEnv } from "@attendease/config"
import { NextResponse } from "next/server"

import {
  buildWebPortalCookieDefinitions,
  resolvePostLoginPath,
  resolveWebAuthApiBaseUrl,
  resolveWebAuthEntryPath,
  resolveWebPortalCookieSecure,
} from "../../../../src/web-auth-session"

export async function POST(request: Request) {
  const formData = await request.formData()
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const next = String(formData.get("next") ?? "").trim()
  const env = loadWebEnv(process.env as Record<string, string | undefined>)

  const failureUrl = new URL(
    resolveWebAuthEntryPath({ scope: "admin", mode: "login", next }),
    env.NEXT_PUBLIC_APP_URL,
  )

  if (!email || password.length < 8) {
    failureUrl.searchParams.set("error", "invalid-form")
    return NextResponse.redirect(failureUrl, 303)
  }

  const authClient = createAuthApiClient({
    baseUrl: resolveWebAuthApiBaseUrl(process.env as Record<string, string | undefined>),
    fetcher: fetch,
  })

  try {
    const authSession = await authClient.loginAdmin({
      email,
      password,
      platform: "WEB",
      requestedRole: "ADMIN",
    })
    const redirectUrl = new URL(
      resolvePostLoginPath({
        next,
        requestedRole: "ADMIN",
      }),
      env.NEXT_PUBLIC_APP_URL,
    )
    const response = NextResponse.redirect(redirectUrl, 303)

    for (const cookie of buildWebPortalCookieDefinitions({
      authSession,
      secure: resolveWebPortalCookieSecure({
        appUrl: env.NEXT_PUBLIC_APP_URL,
        requestUrl: request.url,
        requestHeaders: request.headers,
      }),
    })) {
      response.cookies.set(cookie.name, cookie.value, cookie.options)
    }

    return response
  } catch (error) {
    console.error("Admin web sign-in failed.", {
      email,
      error,
    })
    failureUrl.searchParams.set("error", "invalid-credentials")
    return NextResponse.redirect(failureUrl, 303)
  }
}
