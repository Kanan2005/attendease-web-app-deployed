import { describe, expect, it } from "vitest"

import {
  buildMobileAuthFormState,
  buildMobileEntryCardModel,
  mobileEntryRoutes,
  resolveMobileRoleGate,
} from "./mobile-entry-models.js"

describe("mobile entry flow", () => {
  it("routes unauthenticated student and teacher flows to separate sign-in screens", () => {
    expect(resolveMobileRoleGate("student", false)).toEqual({
      allowed: false,
      redirectHref: mobileEntryRoutes.studentSignIn,
    })
    expect(resolveMobileRoleGate("teacher", false)).toEqual({
      allowed: false,
      redirectHref: mobileEntryRoutes.teacherSignIn,
    })
  })

  it("keeps protected routes open after role authentication", () => {
    expect(resolveMobileRoleGate("student", true)).toEqual({
      allowed: true,
      redirectHref: null,
    })
    expect(resolveMobileRoleGate("teacher", true)).toEqual({
      allowed: true,
      redirectHref: null,
    })
  })

  it("builds landing cards with separate sign-in and registration actions when signed out", () => {
    expect(
      buildMobileEntryCardModel({
        role: "student",
        hasSession: false,
      }),
    ).toMatchObject({
      title: "Student",
      primaryLabel: "Student sign in",
      primaryHref: mobileEntryRoutes.studentSignIn,
      secondaryLabel: "Create student account",
      secondaryHref: mobileEntryRoutes.studentRegister,
      canSignOut: false,
    })

    expect(
      buildMobileEntryCardModel({
        role: "teacher",
        hasSession: false,
      }),
    ).toMatchObject({
      title: "Teacher",
      primaryLabel: "Teacher sign in",
      primaryHref: mobileEntryRoutes.teacherSignIn,
      secondaryLabel: "Create teacher account",
      secondaryHref: mobileEntryRoutes.teacherRegister,
      canSignOut: false,
    })
  })

  it("builds landing cards with continue and sign-out actions when already signed in", () => {
    expect(
      buildMobileEntryCardModel({
        role: "student",
        hasSession: true,
        displayName: "Student One",
      }),
    ).toMatchObject({
      primaryLabel: "Open student home",
      secondaryLabel: "Sign out",
      sessionSummary: "Signed in as Student One.",
      canSignOut: true,
    })

    expect(
      buildMobileEntryCardModel({
        role: "teacher",
        hasSession: true,
        displayName: "Teacher One",
      }),
    ).toMatchObject({
      primaryLabel: "Open teacher home",
      secondaryLabel: "Sign out",
      sessionSummary: "Signed in as Teacher One.",
      canSignOut: true,
    })
  })

  it("builds loading and helper text for student and teacher auth screens", () => {
    expect(
      buildMobileAuthFormState({
        role: "student",
        mode: "register",
        status: "bootstrapping",
        hasDevelopmentCredentials: false,
        errorMessage: null,
      }),
    ).toMatchObject({
      title: "Create student account",
      submitLabel: "Creating account...",
      helperText: "Enter your name, email, and password to continue.",
      isSubmitting: true,
    })

    expect(
      buildMobileAuthFormState({
        role: "teacher",
        mode: "sign_in",
        status: "error",
        hasDevelopmentCredentials: true,
        errorMessage: "Teacher sign-in failed.",
      }),
    ).toMatchObject({
      title: "Teacher sign in",
      submitLabel: "Sign in",
      helperText: "Your account details are already filled in. Review them before signing in.",
      errorMessage: "Teacher sign-in failed.",
      isSubmitting: false,
    })
  })
})
