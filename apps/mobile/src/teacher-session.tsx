import { AuthApiClientError } from "@attendease/auth"
import type {
  AuthLoginRequest,
  AuthSessionResponse,
  TeacherRegistrationRequest,
} from "@attendease/contracts"
import { useQueryClient } from "@tanstack/react-query"
import { createContext, useContext, useEffect, useRef, useState } from "react"
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

  // v2.0: Auto-sign-out on 401 — subscribe to the query cache and detect expired
  // teacher tokens globally. Clears the session so the layout gate redirects to sign-in.
  const signOutRef = useRef<(() => void) | null>(null)
  signOutRef.current = () => {
    setSession(null)
    setStatus("signed_out")
    setErrorMessage(null)
    setDraft(bootstrap.defaultDraft)
    queryClient.removeQueries({ queryKey: ["teacher"] })
  }

  useEffect(() => {
    const cache = queryClient.getQueryCache()
    const unsubscribe = cache.subscribe((event) => {
      if (event.type !== "updated" || event.action.type !== "error") return
      const error = event.action.error
      if (error instanceof AuthApiClientError && error.status === 401) {
        const queryKey = event.query.queryKey
        if (Array.isArray(queryKey) && queryKey[0] === "teacher") {
          signOutRef.current?.()
        }
      }
    })
    return unsubscribe
  }, [queryClient])

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
      const message = friendlyErrorMessage(error, "Teacher sign-in failed.")

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
      const message = friendlyErrorMessage(error, "Teacher account creation failed.")

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

const FIELD_LABELS: Record<string, string> = {
  email: "Email",
  password: "Password",
  displayName: "Full name",
}

function isZodError(err: unknown): err is Error & { issues: { path: (string | number)[]; message: string }[] } {
  return err instanceof Error && err.name === "ZodError" && Array.isArray((err as unknown as Record<string, unknown>).issues)
}

function humanizeZodMessage(raw: string): string {
  let msg = raw
    .replace(/^String /i, "")
    .replace(/character\(s\)/g, "characters")
  msg = msg.charAt(0).toUpperCase() + msg.slice(1)
  return msg
}

function friendlyErrorMessage(error: unknown, fallback: string): string {
  if (isZodError(error)) {
    const first = error.issues[0]
    if (!first) return fallback
    const field = first.path.length > 0 ? (FIELD_LABELS[String(first.path[0])] ?? String(first.path[0])) : null
    const msg = humanizeZodMessage(first.message)
    return field ? `${field}: ${msg.charAt(0).toLowerCase()}${msg.slice(1)}` : msg
  }
  if (error instanceof AuthApiClientError) {
    const body = error.details as Record<string, unknown> | null
    if (body && typeof body.message === "string") return body.message
    return fallback
  }
  if (error instanceof Error) {
    return error.message
  }
  return fallback
}
