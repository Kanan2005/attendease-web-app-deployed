import type {
  AuthLoginRequest,
  AuthSessionResponse,
  DevicePlatform,
  StudentRegistrationRequest,
} from "@attendease/contracts"
import { AuthApiClientError } from "@attendease/auth"
import { useQueryClient } from "@tanstack/react-query"
import { createContext, useContext, useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"

import { createMobileAuthBootstrap } from "./auth"
import {
  type DeviceBindingErrorModel,
  buildDeviceBindingErrorModel,
} from "./device-identity-models"
import { mobileEnvSource } from "./mobile-env"

export interface StudentSessionDraft {
  displayName: string
  email: string
  password: string
  installId: string
  publicKey: string
  devicePlatform: Extract<DevicePlatform, "ANDROID" | "IOS">
  degree?: "B.Tech" | "M.Tech"
  branch?: "CSE" | "ECE" | "EE" | "ME" | "CHE" | "Civil" | "Meta"
}

export interface StudentSessionBootstrap {
  hasDevelopmentCredentials: boolean
  defaultDraft: StudentSessionDraft
}

export type StudentSessionStatus =
  | "idle"
  | "bootstrapping"
  | "authenticated"
  | "error"
  | "signed_out"

interface StudentSessionContextValue {
  session: AuthSessionResponse | null
  draft: StudentSessionDraft
  status: StudentSessionStatus
  errorMessage: string | null
  deviceBindingError: DeviceBindingErrorModel | null
  deviceReady: boolean
  hasDevelopmentCredentials: boolean
  updateDraft(nextDraft: Partial<StudentSessionDraft>): void
  signIn(nextDraft?: StudentSessionDraft): Promise<void>
  register(nextDraft?: StudentSessionDraft): Promise<void>
  signOut(): void
}

const studentSessionContext = createContext<StudentSessionContextValue | null>(null)

export function buildStudentSessionBootstrap(
  source: Record<string, string | undefined> = mobileEnvSource,
): StudentSessionBootstrap {
  const authBootstrap = createMobileAuthBootstrap(source)
  const defaultDraft: StudentSessionDraft = {
    displayName: "",
    email: authBootstrap.developmentStudentEmail ?? "",
    password: authBootstrap.developmentStudentPassword ?? "",
    installId: authBootstrap.developmentInstallId,
    publicKey: authBootstrap.developmentPublicKey,
    devicePlatform: authBootstrap.developmentDevicePlatform,
  }

  return {
    hasDevelopmentCredentials: Boolean(defaultDraft.email && defaultDraft.password),
    defaultDraft,
  }
}

export function buildStudentLoginRequest(draft: StudentSessionDraft): AuthLoginRequest {
  return {
    email: draft.email.trim().toLowerCase(),
    password: draft.password,
    platform: "MOBILE",
    requestedRole: "STUDENT",
    device: {
      installId: draft.installId.trim(),
      platform: draft.devicePlatform,
      publicKey: draft.publicKey.trim(),
    },
  }
}

export function buildStudentRegistrationRequest(
  draft: StudentSessionDraft,
): StudentRegistrationRequest {
  return {
    displayName: draft.displayName.trim(),
    email: draft.email.trim().toLowerCase(),
    password: draft.password,
    platform: "MOBILE",
    device: {
      installId: draft.installId.trim(),
      platform: draft.devicePlatform,
      publicKey: draft.publicKey.trim(),
    },
    ...(draft.degree ? { degree: draft.degree } : {}),
    ...(draft.branch ? { branch: draft.branch } : {}),
  }
}

export function StudentSessionProvider(props: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [authBootstrap] = useState(() => createMobileAuthBootstrap())
  const [bootstrap] = useState(() => buildStudentSessionBootstrap())
  const [draft, setDraft] = useState<StudentSessionDraft>(bootstrap.defaultDraft)
  const [session, setSession] = useState<AuthSessionResponse | null>(null)
  const [status, setStatus] = useState<StudentSessionStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [deviceReady, setDeviceReady] = useState(bootstrap.hasDevelopmentCredentials)

  // Resolve real device identity on mount (async file system read).
  // In dev mode with prefilled credentials, the env-based defaults are kept.
  useEffect(() => {
    if (bootstrap.hasDevelopmentCredentials) {
      setDeviceReady(true)
      return
    }
    let cancelled = false
    import("./device-identity")
      .then((mod) => mod.resolveDeviceIdentity())
      .then((identity) => {
        if (cancelled) return
        setDraft((prev) => ({
          ...prev,
          installId: identity.installId,
          publicKey: identity.publicKey,
          devicePlatform: identity.platform === "WEB" ? prev.devicePlatform : identity.platform,
        }))
        setDeviceReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [bootstrap.hasDevelopmentCredentials])

  // v2.0: Auto-sign-out on 401 — subscribe to the query cache and detect expired
  // student tokens globally. When any student query fails with HTTP 401, clear
  // the session so the layout gate redirects to the sign-in screen.
  const signOutRef = useRef<(() => void) | null>(null)
  signOutRef.current = () => {
    setSession(null)
    setStatus("signed_out")
    setErrorMessage(null)
    setDraft(bootstrap.defaultDraft)
    queryClient.removeQueries({ queryKey: ["student"] })
  }

  useEffect(() => {
    const cache = queryClient.getQueryCache()
    const unsubscribe = cache.subscribe((event) => {
      if (event.type !== "updated" || event.action.type !== "error") return
      const error = event.action.error
      if (error instanceof AuthApiClientError && error.status === 401) {
        const queryKey = event.query.queryKey
        if (Array.isArray(queryKey) && queryKey[0] === "student") {
          signOutRef.current?.()
        }
      }
    })
    return unsubscribe
  }, [queryClient])

  async function signIn(nextDraft: StudentSessionDraft = draft) {
    setStatus("bootstrapping")
    setErrorMessage(null)
    setDraft(nextDraft)

    try {
      const authenticatedSession = await authBootstrap.authClient.login(
        buildStudentLoginRequest(nextDraft),
      )

      setSession(authenticatedSession)
      setStatus("authenticated")
      queryClient.invalidateQueries({
        queryKey: ["student"],
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Student sign-in failed."

      setSession(null)
      setStatus("error")
      setErrorMessage(message)
    }
  }

  async function register(nextDraft: StudentSessionDraft = draft) {
    setStatus("bootstrapping")
    setErrorMessage(null)
    setDraft(nextDraft)

    try {
      const authenticatedSession = await authBootstrap.authClient.registerStudentAccount(
        buildStudentRegistrationRequest(nextDraft),
      )

      setSession(authenticatedSession)
      setStatus("authenticated")
      queryClient.invalidateQueries({
        queryKey: ["student"],
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Student account creation failed."

      setSession(null)
      setStatus("error")
      setErrorMessage(message)
    }
  }

  const deviceBindingError = errorMessage ? buildDeviceBindingErrorModel(errorMessage) : null

  function updateDraft(nextDraft: Partial<StudentSessionDraft>) {
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
      queryKey: ["student"],
    })
  }

  return (
    <studentSessionContext.Provider
      value={{
        session,
        draft,
        status,
        errorMessage,
        deviceBindingError,
        deviceReady,
        hasDevelopmentCredentials: bootstrap.hasDevelopmentCredentials,
        updateDraft,
        signIn,
        register,
        signOut,
      }}
    >
      {props.children}
    </studentSessionContext.Provider>
  )
}

export function useStudentSession() {
  const context = useContext(studentSessionContext)

  if (!context) {
    throw new Error("Student session provider is required before using student session hooks.")
  }

  return context
}
