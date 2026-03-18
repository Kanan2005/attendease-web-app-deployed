import type { AuthLoginRequest, AuthSessionResponse } from "@attendease/contracts"
import { useQueryClient } from "@tanstack/react-query"
import { createContext, useContext, useState } from "react"
import type { ReactNode } from "react"

import { mapAdminApiErrorToMessage } from "./admin-models"
import { createMobileAuthBootstrap } from "./auth"
import { mobileEnvSource } from "./mobile-env"

export interface AdminSessionDraft {
  email: string
  password: string
}

export interface AdminSessionBootstrap {
  hasDevelopmentCredentials: boolean
  defaultDraft: AdminSessionDraft
}

export type AdminSessionStatus =
  | "idle"
  | "bootstrapping"
  | "authenticated"
  | "error"
  | "signed_out"

interface AdminSessionContextValue {
  session: AuthSessionResponse | null
  draft: AdminSessionDraft
  status: AdminSessionStatus
  errorMessage: string | null
  hasDevelopmentCredentials: boolean
  updateDraft(nextDraft: Partial<AdminSessionDraft>): void
  signIn(nextDraft?: AdminSessionDraft): Promise<void>
  signOut(): void
}

const adminSessionContext = createContext<AdminSessionContextValue | null>(null)

export function buildAdminSessionBootstrap(
  source: Record<string, string | undefined> = mobileEnvSource,
): AdminSessionBootstrap {
  const devEmail = source["EXPO_PUBLIC_ADMIN_DEV_EMAIL"] ?? ""
  const devPassword = source["EXPO_PUBLIC_ADMIN_DEV_PASSWORD"] ?? ""

  return {
    hasDevelopmentCredentials: Boolean(devEmail && devPassword),
    defaultDraft: { email: devEmail, password: devPassword },
  }
}

export function buildAdminLoginRequest(draft: AdminSessionDraft): AuthLoginRequest {
  return {
    email: draft.email.trim().toLowerCase(),
    password: draft.password,
    platform: "MOBILE",
    requestedRole: "ADMIN",
  }
}

export function ensureAdminSessionResponse(session: AuthSessionResponse): AuthSessionResponse {
  if (session.user.activeRole !== "ADMIN" || !session.user.availableRoles.includes("ADMIN")) {
    throw new Error("Admin mobile requires an authenticated ADMIN role session.")
  }
  return session
}

export function requireAdminSession(session: AuthSessionResponse | null): AuthSessionResponse {
  if (!session) {
    throw new Error("Admin session is required before calling admin mobile queries.")
  }
  return ensureAdminSessionResponse(session)
}

export function getAdminAccessToken(session: AuthSessionResponse | null): string {
  return requireAdminSession(session).tokens.accessToken
}

export function AdminSessionProvider(props: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [authBootstrap] = useState(() => createMobileAuthBootstrap())
  const [bootstrap] = useState(() => buildAdminSessionBootstrap())
  const [draft, setDraft] = useState<AdminSessionDraft>(bootstrap.defaultDraft)
  const [session, setSession] = useState<AuthSessionResponse | null>(null)
  const [status, setStatus] = useState<AdminSessionStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function signIn(nextDraft: AdminSessionDraft = draft) {
    setStatus("bootstrapping")
    setErrorMessage(null)
    setDraft(nextDraft)

    try {
      const authenticatedSession = ensureAdminSessionResponse(
        await authBootstrap.authClient.login(buildAdminLoginRequest(nextDraft)),
      )
      setSession(authenticatedSession)
      setStatus("authenticated")
      queryClient.invalidateQueries({ queryKey: ["admin"] })
    } catch (error) {
      setSession(null)
      setStatus("error")
      setErrorMessage(mapAdminApiErrorToMessage(error))
    }
  }

  function updateDraft(nextDraft: Partial<AdminSessionDraft>) {
    setErrorMessage(null)
    setDraft((currentDraft) => ({ ...currentDraft, ...nextDraft }))
  }

  function signOut() {
    setSession(null)
    setStatus("signed_out")
    setErrorMessage(null)
    setDraft(bootstrap.defaultDraft)
    queryClient.removeQueries({ queryKey: ["admin"] })
  }

  return (
    <adminSessionContext.Provider
      value={{
        session,
        draft,
        status,
        errorMessage,
        hasDevelopmentCredentials: bootstrap.hasDevelopmentCredentials,
        updateDraft,
        signIn,
        signOut,
      }}
    >
      {props.children}
    </adminSessionContext.Provider>
  )
}

export function useAdminSession() {
  const context = useContext(adminSessionContext)
  if (!context) {
    throw new Error("Admin session provider is required before using admin session hooks.")
  }
  return context
}
