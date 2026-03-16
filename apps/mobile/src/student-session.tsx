import type {
  AuthLoginRequest,
  AuthSessionResponse,
  DevicePlatform,
  StudentRegistrationRequest,
} from "@attendease/contracts"
import { useQueryClient } from "@tanstack/react-query"
import { createContext, useContext, useState } from "react"
import type { ReactNode } from "react"

import { createMobileAuthBootstrap } from "./auth"

export interface StudentSessionDraft {
  displayName: string
  email: string
  password: string
  installId: string
  publicKey: string
  devicePlatform: Extract<DevicePlatform, "ANDROID" | "IOS">
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
  hasDevelopmentCredentials: boolean
  updateDraft(nextDraft: Partial<StudentSessionDraft>): void
  signIn(nextDraft?: StudentSessionDraft): Promise<void>
  register(nextDraft?: StudentSessionDraft): Promise<void>
  signOut(): void
}

const studentSessionContext = createContext<StudentSessionContextValue | null>(null)

export function buildStudentSessionBootstrap(
  source: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
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
