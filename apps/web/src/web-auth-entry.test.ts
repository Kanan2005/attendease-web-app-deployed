import { findWebContentIssues } from "@attendease/ui-web"
import { describe, expect, it } from "vitest"

import { buildWebAuthEntryModel, resolveWebAuthErrorMessage } from "./web-auth-entry.js"

describe("web auth entry models", () => {
  it("builds separated teacher and admin entry models with scoped links", () => {
    const teacherLogin = buildWebAuthEntryModel("teacher-login", "/teacher/classrooms")
    const teacherRegister = buildWebAuthEntryModel("teacher-register", "/teacher/dashboard")
    const adminLogin = buildWebAuthEntryModel("admin-login", "/admin/devices")

    expect(teacherLogin).toMatchObject({
      scope: "teacher",
      formAction: "/login/password",
      submitLabel: "Sign in",
    })
    expect(teacherLogin.alternateLinks).toEqual([
      {
        href: "/register?next=%2Fteacher%2Fclassrooms",
        label: "Create teacher account",
      },
      {
        href: "/admin/login",
        label: "Admin sign in",
      },
    ])

    expect(teacherRegister).toMatchObject({
      scope: "teacher",
      formAction: "/register/password",
      submitLabel: "Create account",
      nameFieldLabel: "Full name",
    })
    expect(teacherRegister.alternateLinks[0]).toEqual({
      href: "/login?next=%2Fteacher%2Fdashboard",
      label: "Teacher sign in",
    })

    expect(adminLogin).toMatchObject({
      scope: "admin",
      formAction: "/admin/login/password",
      submitLabel: "Sign in",
      nameFieldLabel: null,
      title: "Open student support and governance",
      helperTitle: "What this workspace controls",
    })
    expect(adminLogin.alternateLinks).toEqual([
      {
        href: "/login",
        label: "Teacher sign in",
      },
    ])
  })

  it("keeps auth entry copy short and product-facing", () => {
    const models = [
      buildWebAuthEntryModel("teacher-login"),
      buildWebAuthEntryModel("teacher-register"),
      buildWebAuthEntryModel("admin-login"),
    ]

    const copySamples = models.flatMap((model) => [
      model.eyebrow,
      model.title,
      model.description,
      model.formTitle,
      model.formDescription,
      model.submitLabel,
      model.helperTitle,
      ...model.helperPoints,
      ...model.alternateLinks.flatMap((link) => [link.label]),
    ])

    expect(copySamples.flatMap((copy) => findWebContentIssues(copy))).toEqual([])
  })

  it("maps auth entry error codes to clear user-facing messages", () => {
    expect(
      resolveWebAuthErrorMessage({
        variant: "teacher-register",
        error: "invalid-form",
      }),
    ).toBe("Enter your full name, email, and password before continuing.")
    expect(
      resolveWebAuthErrorMessage({
        variant: "teacher-login",
        error: "invalid-credentials",
      }),
    ).toBe("The email or password was not accepted for this workspace.")
    expect(
      resolveWebAuthErrorMessage({
        variant: "teacher-register",
        error: "email-in-use",
      }),
    ).toBe("That email address already belongs to an existing account.")
    expect(
      resolveWebAuthErrorMessage({
        variant: "admin-login",
        error: "unknown",
      }),
    ).toBeNull()
  })
})
