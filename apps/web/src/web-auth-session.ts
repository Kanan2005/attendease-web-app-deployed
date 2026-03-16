import { loadWebEnv } from "@attendease/config"
import type { AppRole, AuthSessionResponse } from "@attendease/contracts"

import type { WebPortalSession } from "./web-portal"
import { webSessionCookieNames } from "./web-portal"

export type WebPortalCookieDefinition = {
  name: string
  value: string
  options: {
    httpOnly: true
    sameSite: "lax"
    path: "/"
    secure: boolean
    expires: Date
  }
}

export type WebAuthScope = "teacher" | "admin"
export type WebAuthMode = "login" | "register"

export function buildWebPortalSessionFromAuthSession(
  authSession: AuthSessionResponse,
): WebPortalSession {
  return {
    accessToken: authSession.tokens.accessToken,
    activeRole: authSession.user.activeRole,
    availableRoles: authSession.user.availableRoles,
    displayName: authSession.user.displayName,
    email: authSession.user.email,
  }
}

export function buildWebPortalCookieDefinitions(input: {
  authSession: AuthSessionResponse
  secure: boolean
}): WebPortalCookieDefinition[] {
  const session = buildWebPortalSessionFromAuthSession(input.authSession)
  const expires = new Date(input.authSession.tokens.accessTokenExpiresAt)

  return [
    createCookieDefinition(
      webSessionCookieNames.accessToken,
      session.accessToken,
      expires,
      input.secure,
    ),
    createCookieDefinition(
      webSessionCookieNames.activeRole,
      session.activeRole,
      expires,
      input.secure,
    ),
    createCookieDefinition(
      webSessionCookieNames.availableRoles,
      session.availableRoles.join(","),
      expires,
      input.secure,
    ),
    createCookieDefinition(
      webSessionCookieNames.displayName,
      session.displayName ?? "",
      expires,
      input.secure,
    ),
    createCookieDefinition(webSessionCookieNames.email, session.email ?? "", expires, input.secure),
  ]
}

export function resolveWebAuthApiBaseUrl(
  source: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
) {
  const env = loadWebEnv(source)

  return env.WEB_INTERNAL_API_URL ?? env.NEXT_PUBLIC_API_URL
}

export function resolveWebPortalCookieSecure(input: {
  appUrl: string
  requestUrl?: string | null
  requestHeaders?: Pick<Headers, "get"> | null
}) {
  const forwardedProto = input.requestHeaders?.get("x-forwarded-proto")?.split(",")[0]?.trim()

  if (forwardedProto === "https") {
    return true
  }

  if (forwardedProto === "http") {
    return false
  }

  const requestProtocol = parseUrlProtocol(input.requestUrl)

  if (requestProtocol) {
    return requestProtocol === "https:"
  }

  return parseUrlProtocol(input.appUrl) === "https:"
}

export function resolveScopedWebPortalPath(
  next: string | null | undefined,
  scope: WebAuthScope,
): string | null {
  const nextPath = next?.trim()

  if (!nextPath?.startsWith("/") || nextPath.startsWith("//")) {
    return null
  }

  if (scope === "admin") {
    return nextPath === "/admin" || nextPath.startsWith("/admin/") ? nextPath : null
  }

  return nextPath === "/teacher" || nextPath.startsWith("/teacher/") ? nextPath : null
}

export function resolveWebAuthEntryPath(input: {
  scope: WebAuthScope
  mode?: WebAuthMode
  next?: string | null
}) {
  const basePath =
    input.scope === "admin" ? "/admin/login" : input.mode === "register" ? "/register" : "/login"
  const scopedNext = resolveScopedWebPortalPath(input.next, input.scope)

  if (!scopedNext) {
    return basePath
  }

  return `${basePath}?next=${encodeURIComponent(scopedNext)}`
}

export function resolvePostLoginPath(input: {
  next?: string | null
  requestedRole: AppRole
}) {
  const scope = input.requestedRole === "ADMIN" ? "admin" : "teacher"
  const nextPath = resolveScopedWebPortalPath(input.next, scope)

  if (nextPath) {
    return nextPath
  }

  return input.requestedRole === "ADMIN" ? "/admin/dashboard" : "/teacher/dashboard"
}

function createCookieDefinition(
  name: string,
  value: string,
  expires: Date,
  secure: boolean,
): WebPortalCookieDefinition {
  return {
    name,
    value,
    options: {
      expires,
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure,
    },
  }
}

function parseUrlProtocol(value?: string | null) {
  if (!value) {
    return null
  }

  try {
    return new URL(value).protocol
  } catch {
    return null
  }
}
