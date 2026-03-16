import type { AppRole, SessionPlatform, TrustedDeviceContext } from "@attendease/contracts"

export type AuthRequestContext = {
  userId: string
  sessionId: string
  activeRole: AppRole
  availableRoles: AppRole[]
  platform: SessionPlatform
  deviceId: string | null
}

export type VerifiedGoogleIdentity = {
  providerSubject: string
  email: string
  emailVerified: boolean
  displayName: string
  avatarUrl?: string | null
  hostedDomain?: string | null
}

export type DeviceTrustEvaluation = TrustedDeviceContext & {
  deviceId: string | null
  bindingId: string | null
}
