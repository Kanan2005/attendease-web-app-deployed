import type { loadApiEnv } from "@attendease/config"
import type { AppRole } from "@attendease/contracts"

import type { DatabaseService } from "../../database/database.service.js"
import type { AssignmentsService } from "../academic/assignments.service.js"
import type { EnrollmentsService } from "../academic/enrollments.service.js"
import type { DeviceTrustEvaluation } from "./auth.types.js"
import type { DeviceBindingService } from "./device-binding.service.js"
import type { GoogleOidcService } from "./google-oidc.service.js"

export type SessionUserRecord = {
  id: string
  email: string
  displayName: string
  status: string
  roles: { role: AppRole }[]
}

export type AuthServiceContext = {
  database: DatabaseService
  assignmentsService: AssignmentsService
  enrollmentsService: EnrollmentsService
  googleOidcService: GoogleOidcService
  deviceBindingService: DeviceBindingService
  env: ReturnType<typeof loadApiEnv>
}

export type CreateAuthenticatedSessionParams = {
  user: SessionUserRecord
  availableRoles: AppRole[]
  activeRole: AppRole
  platform: "WEB" | "MOBILE"
  deviceTrust: DeviceTrustEvaluation
  provider: "GOOGLE" | null
}
