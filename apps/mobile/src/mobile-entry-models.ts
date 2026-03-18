import { adminRoutes } from "./admin-routes"
import { type MobileEntryMode, type MobileEntryRole, buildMobileSessionEntryCopy } from "./shell"
import { studentRoutes } from "./student-routes"
import { teacherRoutes } from "./teacher-routes"

export const mobileEntryRoutes = {
  landing: "/" as const,
  studentSignIn: "/(entry)/student/sign-in" as const,
  studentRegister: "/(entry)/student/register" as const,
  teacherSignIn: "/(entry)/teacher/sign-in" as const,
  teacherRegister: "/(entry)/teacher/register" as const,
  adminSignIn: "/(entry)/admin/sign-in" as const,
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

  const signInRoutes: Record<MobileEntryRole, string> = {
    student: mobileEntryRoutes.studentSignIn,
    teacher: mobileEntryRoutes.teacherSignIn,
    admin: mobileEntryRoutes.adminSignIn,
  }

  return {
    allowed: false,
    redirectHref: signInRoutes[role],
  }
}

export function buildMobileEntryCardModel(input: {
  role: MobileEntryRole
  hasSession: boolean
  displayName?: string | null | undefined
}): MobileEntryCardModel {
  const entryCopy = buildMobileSessionEntryCopy(input.role, "sign_in")

  const roleTitles: Record<MobileEntryRole, string> = {
    student: "Student",
    teacher: "Teacher",
    admin: "Admin",
  }

  const homeHrefs: Record<MobileEntryRole, string> = {
    student: studentRoutes.classrooms,
    teacher: teacherRoutes.dashboard,
    admin: adminRoutes.dashboard,
  }

  const signInHrefs: Record<MobileEntryRole, string> = {
    student: mobileEntryRoutes.studentSignIn,
    teacher: mobileEntryRoutes.teacherSignIn,
    admin: mobileEntryRoutes.adminSignIn,
  }

  if (input.hasSession) {
    return {
      role: input.role,
      title: roleTitles[input.role],
      description: entryCopy.roleSummary,
      primaryLabel: `Open ${input.role} home`,
      primaryHref: homeHrefs[input.role],
      secondaryLabel: "Sign out",
      sessionSummary: input.displayName ? `Signed in as ${input.displayName}.` : "Signed in.",
      canSignOut: true,
    }
  }

  const hasRegister = input.role !== "admin"

  const base = {
    role: input.role,
    title: roleTitles[input.role],
    description: entryCopy.roleSummary,
    primaryLabel: entryCopy.title,
    primaryHref: signInHrefs[input.role],
    secondaryLabel: hasRegister ? buildMobileSessionEntryCopy(input.role, "register").title : "",
    canSignOut: false as const,
  }

  if (hasRegister) {
    return {
      ...base,
      secondaryHref:
        input.role === "student"
          ? mobileEntryRoutes.studentRegister
          : mobileEntryRoutes.teacherRegister,
    }
  }

  return base
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
