import { type MobileEntryMode, type MobileEntryRole, buildMobileSessionEntryCopy } from "./shell"
import { studentRoutes } from "./student-routes"
import { teacherRoutes } from "./teacher-routes"

export const mobileEntryRoutes = {
  landing: "/" as const,
  studentSignIn: "/(entry)/student/sign-in" as const,
  studentRegister: "/(entry)/student/register" as const,
  teacherSignIn: "/(entry)/teacher/sign-in" as const,
  teacherRegister: "/(entry)/teacher/register" as const,
} as const

export interface MobileRoleGate {
  allowed: boolean
  redirectHref: string | null
}

export interface MobileEntryCardModel {
  role: MobileEntryRole
  title: string
  description: string
  primaryLabel: string
  primaryHref: string
  secondaryLabel: string
  secondaryHref?: string
  sessionSummary?: string
  canSignOut: boolean
}

export interface MobileAuthFormState {
  title: string
  subtitle: string
  submitLabel: string
  helperText: string
  alternateLabel: string
  isSubmitting: boolean
  errorMessage: string | null
}

export function resolveMobileRoleGate(role: MobileEntryRole, hasSession: boolean): MobileRoleGate {
  if (hasSession) {
    return {
      allowed: true,
      redirectHref: null,
    }
  }

  return {
    allowed: false,
    redirectHref:
      role === "student" ? mobileEntryRoutes.studentSignIn : mobileEntryRoutes.teacherSignIn,
  }
}

export function buildMobileEntryCardModel(input: {
  role: MobileEntryRole
  hasSession: boolean
  displayName?: string | null | undefined
}): MobileEntryCardModel {
  const entryCopy = buildMobileSessionEntryCopy(input.role, "sign_in")
  const registerCopy = buildMobileSessionEntryCopy(input.role, "register")

  if (input.hasSession) {
    return {
      role: input.role,
      title: input.role === "student" ? "Student" : "Teacher",
      description: entryCopy.roleSummary,
      primaryLabel: input.role === "student" ? "Open student home" : "Open teacher home",
      primaryHref: input.role === "student" ? studentRoutes.home : teacherRoutes.dashboard,
      secondaryLabel: "Sign out",
      sessionSummary: input.displayName ? `Signed in as ${input.displayName}.` : "Signed in.",
      canSignOut: true,
    }
  }

  return {
    role: input.role,
    title: input.role === "student" ? "Student" : "Teacher",
    description: entryCopy.roleSummary,
    primaryLabel: entryCopy.title,
    primaryHref:
      input.role === "student" ? mobileEntryRoutes.studentSignIn : mobileEntryRoutes.teacherSignIn,
    secondaryLabel: registerCopy.title,
    secondaryHref:
      input.role === "student"
        ? mobileEntryRoutes.studentRegister
        : mobileEntryRoutes.teacherRegister,
    canSignOut: false,
  }
}

export function buildMobileAuthFormState(input: {
  role: MobileEntryRole
  mode: MobileEntryMode
  status: "idle" | "bootstrapping" | "authenticated" | "error" | "signed_out"
  hasDevelopmentCredentials: boolean
  errorMessage: string | null
}): MobileAuthFormState {
  const copy = buildMobileSessionEntryCopy(input.role, input.mode)
  const isSubmitting = input.status === "bootstrapping"

  return {
    title: copy.title,
    subtitle: copy.subtitle,
    submitLabel: isSubmitting ? copy.submittingLabel : copy.submitLabel,
    helperText: input.hasDevelopmentCredentials ? copy.prefilledHint : copy.manualHint,
    alternateLabel: copy.alternateLabel,
    isSubmitting,
    errorMessage: input.errorMessage,
  }
}
