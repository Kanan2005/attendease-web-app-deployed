import type {
  AuthLoginRequest,
  AuthSessionResponse,
  TeacherRegistrationRequest,
} from "@attendease/contracts"
import { useQueryClient } from "@tanstack/react-query"
import { createContext, useContext, useState } from "react"
import type { ReactNode } from "react"

import { createMobileAuthBootstrap } from "./auth"
import { mobileEnvSource } from "./mobile-env"

export interface TeacherSessionDraft {
  displayName: string
  email: string
  password: string
}

export interface TeacherSessionBootstrap {
  hasDevelopmentCredentials: boolean
  defaultDraft: TeacherSessionDraft
}

export type TeacherSessionStatus =
  | "idle"
  | "bootstrapping"
  | "authenticated"
  | "error"
  | "signed_out"

interface TeacherSessionContextValue {
  session: AuthSessionResponse | null
  draft: TeacherSessionDraft
  status: TeacherSessionStatus
  errorMessage: string | null
  hasDevelopmentCredentials: boolean
  updateDraft(nextDraft: Partial<TeacherSessionDraft>): void
  signIn(nextDraft?: TeacherSessionDraft): Promise<void>
  register(nextDraft?: TeacherSessionDraft): Promise<void>
  signOut(): void
}

const teacherSessionContext = createContext<TeacherSessionContextValue | null>(null)

export function buildTeacherSessionBootstrap(
  source: Record<string, string | undefined> = mobileEnvSource,
): TeacherSessionBootstrap {
  const authBootstrap = createMobileAuthBootstrap(source)
  const defaultDraft: TeacherSessionDraft = {
    displayName: "",
    email: authBootstrap.developmentTeacherEmail ?? "",
    password: authBootstrap.developmentTeacherPassword ?? "",
  }

  return {
    hasDevelopmentCredentials: Boolean(defaultDraft.email && defaultDraft.password),
    defaultDraft,
  }
}

export function buildTeacherLoginRequest(draft: TeacherSessionDraft): AuthLoginRequest {
  return {
    email: draft.email.trim().toLowerCase(),
    password: draft.password,
    platform: "MOBILE",
    requestedRole: "TEACHER",
  }
}

export function buildTeacherRegistrationRequest(
  draft: TeacherSessionDraft,
): TeacherRegistrationRequest {
  return {
    displayName: draft.displayName.trim(),
    email: draft.email.trim().toLowerCase(),
    password: draft.password,
    platform: "MOBILE",
  }
}

export function ensureTeacherSessionResponse(session: AuthSessionResponse): AuthSessionResponse {
  if (session.user.activeRole !== "TEACHER" || !session.user.availableRoles.includes("TEACHER")) {
    throw new Error("Teacher mobile requires an authenticated TEACHER role session.")
  }

  return session
}

export function requireTeacherSession(session: AuthSessionResponse | null): AuthSessionResponse {
  if (!session) {
    throw new Error("Teacher session is required before calling teacher mobile queries.")
  }

  return ensureTeacherSessionResponse(session)
}

export function getTeacherAccessToken(session: AuthSessionResponse | null): string {
  return requireTeacherSession(session).tokens.accessToken
}

export function TeacherSessionProvider(props: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [authBootstrap] = useState(() => createMobileAuthBootstrap())
  const [bootstrap] = useState(() => buildTeacherSessionBootstrap())
  const [draft, setDraft] = useState<TeacherSessionDraft>(bootstrap.defaultDraft)
  const [session, setSession] = useState<AuthSessionResponse | null>(null)
  const [status, setStatus] = useState<TeacherSessionStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function signIn(nextDraft: TeacherSessionDraft = draft) {
    setStatus("bootstrapping")
    setErrorMessage(null)
    setDraft(nextDraft)

    try {
      const authenticatedSession = ensureTeacherSessionResponse(
        await authBootstrap.authClient.login(buildTeacherLoginRequest(nextDraft)),
      )

      setSession(authenticatedSession)
      setStatus("authenticated")
      queryClient.invalidateQueries({
        queryKey: ["teacher"],
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Teacher sign-in failed."

      setSession(null)
      setStatus("error")
      setErrorMessage(message)
    }
  }

  async function register(nextDraft: TeacherSessionDraft = draft) {
    setStatus("bootstrapping")
    setErrorMessage(null)
    setDraft(nextDraft)

    try {
      const authenticatedSession = ensureTeacherSessionResponse(
        await authBootstrap.authClient.registerTeacherAccount(
          buildTeacherRegistrationRequest(nextDraft),
        ),
      )

      setSession(authenticatedSession)
      setStatus("authenticated")
      queryClient.invalidateQueries({
        queryKey: ["teacher"],
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Teacher account creation failed."

      setSession(null)
      setStatus("error")
      setErrorMessage(message)
    }
  }

  function updateDraft(nextDraft: Partial<TeacherSessionDraft>) {
    setErrorMessage(null)
    setDraft((currentDraft) => ({
      ...currentDraft,
      ...nextDraft,
    }))
  }

  function signOut() {
    setSession(null)
    setStatus("signed_out")
    setErrorMessage(null)
    setDraft(bootstrap.defaultDraft)
    queryClient.removeQueries({
      queryKey: ["teacher"],
    })
  }

  return (
    <teacherSessionContext.Provider
      value={{
        session,
        draft,
        status,
        errorMessage,
        hasDevelopmentCredentials: bootstrap.hasDevelopmentCredentials,
        updateDraft,
        signIn,
        register,
        signOut,
      }}
    >
      {props.children}
    </teacherSessionContext.Provider>
  )
}

export function useTeacherSession() {
  const context = useContext(teacherSessionContext)

  if (!context) {
    throw new Error("Teacher session provider is required before using teacher session hooks.")
  }

  return context
}
