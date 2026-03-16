import type { AppRole } from "@attendease/contracts"

import {
  type WebPortalAccessState,
  type WebPortalScope,
  type WebPortalSession,
  webSessionCookieNames,
} from "./web-portal-types"

const appRoleValues = ["ADMIN", "TEACHER", "STUDENT"] as const

export function readWebPortalSession(input: {
  get(name: string): { value: string } | undefined
}): WebPortalSession | null {
  const accessToken = input.get(webSessionCookieNames.accessToken)?.value?.trim() ?? ""
  const activeRoleValue = input.get(webSessionCookieNames.activeRole)?.value?.trim() ?? ""
  const activeRole = normalizeAppRole(activeRoleValue)

  if (!accessToken || !activeRole) {
    return null
  }

  const availableRoles = parseAvailableRoles(
    input.get(webSessionCookieNames.availableRoles)?.value ?? activeRole,
  )

  return {
    accessToken,
    activeRole,
    availableRoles: availableRoles.length > 0 ? availableRoles : [activeRole],
    displayName: input.get(webSessionCookieNames.displayName)?.value ?? null,
    email: input.get(webSessionCookieNames.email)?.value ?? null,
  }
}
export function evaluateWebPortalAccess(
  session: WebPortalSession | null,
  scope: WebPortalScope,
): WebPortalAccessState {
  if (!session) {
    return {
      allowed: false,
      title: scope === "admin" ? "Admin sign in required" : "Sign in required",
      message:
        scope === "admin"
          ? "Use an admin account to open student support, device recovery, imports, and semester controls."
          : "Sign in to open this workspace.",
      loginHref:
        scope === "admin" ? "/admin/login?next=/admin/dashboard" : "/login?next=/teacher/dashboard",
      loginLabel: scope === "admin" ? "Open admin sign in" : "Open teacher sign in",
    }
  }

  if (scope === "teacher") {
    const teacherAllowed =
      session.activeRole === "TEACHER" ||
      session.activeRole === "ADMIN" ||
      session.availableRoles.includes("TEACHER") ||
      session.availableRoles.includes("ADMIN")

    if (teacherAllowed) {
      return {
        allowed: true,
        title: "Teacher access granted",
        message: "This account can open teacher workspaces.",
        loginHref: "/login?next=/teacher/dashboard",
        loginLabel: "Open teacher sign in",
      }
    }

    return {
      allowed: false,
      title: "Teacher access required",
      message: "This account does not have teacher access.",
      loginHref: "/login?next=/teacher/dashboard",
      loginLabel: "Open teacher sign in",
    }
  }

  if (session.activeRole === "ADMIN" || session.availableRoles.includes("ADMIN")) {
    return {
      allowed: true,
      title: "Admin access granted",
      message: "This account can open admin support and governance workspaces.",
      loginHref: "/admin/login?next=/admin/dashboard",
      loginLabel: "Open admin sign in",
    }
  }

  return {
    allowed: false,
    title: "Admin account required",
    message: "This signed-in account cannot open admin support or governance pages.",
    loginHref: "/admin/login?next=/admin/dashboard",
    loginLabel: "Open admin sign in",
  }
}
function parseAvailableRoles(value: string): AppRole[] {
  return value
    .split(",")
    .map((segment) => normalizeAppRole(segment.trim()))
    .filter((role): role is AppRole => Boolean(role))
}

function normalizeAppRole(value: string): AppRole | null {
  return appRoleValues.includes(value as AppRole) ? (value as AppRole) : null
}
