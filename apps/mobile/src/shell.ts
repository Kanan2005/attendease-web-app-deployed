import type { MobileEnv } from "@attendease/config"

export interface MobileShellSummary {
  title: string
  description: string
  apiUrl: string
  mode: MobileEnv["EXPO_PUBLIC_APP_ENV"]
  deviceTrustDescription: string
}

export type MobileEntryRole = "student" | "teacher"
export type MobileEntryMode = "sign_in" | "register"

export interface MobileSessionEntryCopy {
  title: string
  subtitle: string
  submitLabel: string
  submittingLabel: string
  prefilledHint: string
  manualHint: string
  alternateLabel: string
  roleSummary: string
}

export function buildMobileShellSummary(env: MobileEnv): MobileShellSummary {
  return {
    title: "AttendEase",
    description:
      "Open the student or teacher space, then manage classrooms, attendance, and reports in one app.",
    apiUrl: env.EXPO_PUBLIC_API_URL,
    mode: env.EXPO_PUBLIC_APP_ENV,
    deviceTrustDescription:
      "Students register one phone for attendance and can ask for support if they change devices.",
  }
}

export function buildMobileSessionEntryCopy(
  role: MobileEntryRole,
  mode: MobileEntryMode,
): MobileSessionEntryCopy {
  if (role === "student" && mode === "sign_in") {
    return {
      title: "Student sign in",
      subtitle:
        "Sign in to join classrooms, mark attendance, check reports, and manage your device.",
      submitLabel: "Sign in",
      submittingLabel: "Signing in...",
      prefilledHint: "Your account details are already filled in. Review them before signing in.",
      manualHint: "Enter your account details to continue.",
      alternateLabel: "Create student account",
      roleSummary: "Join classrooms, mark attendance, and track present or absent records.",
    }
  }

  if (role === "student") {
    return {
      title: "Create student account",
      subtitle: "Create your account and register this phone for attendance from the start.",
      submitLabel: "Create account",
      submittingLabel: "Creating account...",
      prefilledHint:
        "Your account details are already filled in. Review them before creating the account.",
      manualHint: "Enter your name, email, and password to continue.",
      alternateLabel: "Student sign in",
      roleSummary: "Self-register once, then use the same phone for attendance.",
    }
  }

  if (mode === "sign_in") {
    return {
      title: "Teacher sign in",
      subtitle:
        "Sign in to manage classrooms, run Bluetooth attendance, and review reports or exports.",
      submitLabel: "Sign in",
      submittingLabel: "Signing in...",
      prefilledHint: "Your account details are already filled in. Review them before signing in.",
      manualHint: "Enter your account details to continue.",
      alternateLabel: "Create teacher account",
      roleSummary: "Run classrooms, Bluetooth attendance, reports, and exports from mobile.",
    }
  }

  return {
    title: "Create teacher account",
    subtitle:
      "Create your teacher account, then open classrooms, Bluetooth attendance, and reports.",
    submitLabel: "Create account",
    submittingLabel: "Creating account...",
    prefilledHint:
      "Your account details are already filled in. Review them before creating the account.",
    manualHint: "Enter your name, email, and password to continue.",
    alternateLabel: "Teacher sign in",
    roleSummary: "Manage classrooms, Bluetooth sessions, reports, and exports.",
  }
}
