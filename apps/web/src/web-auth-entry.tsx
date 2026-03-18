import { webTheme } from "@attendease/ui-web"
import Link from "next/link"

import { type WebAuthScope, resolveWebAuthEntryPath } from "./web-auth-session"

export type WebAuthEntryVariant = "teacher-login" | "teacher-register" | "admin-login"

export type WebAuthEntryModel = {
  scope: WebAuthScope
  eyebrow: string
  title: string
  description: string
  formTitle: string
  formDescription: string
  formAction: string
  submitLabel: string
  nameFieldLabel: string | null
  helperTitle: string
  helperPoints: string[]
  alternateLinks: Array<{
    href: string
    label: string
  }>
}

export function buildWebAuthEntryModel(
  variant: WebAuthEntryVariant,
  nextPath: string | null = null,
): WebAuthEntryModel {
  switch (variant) {
    case "teacher-register":
      return {
        scope: "teacher",
        eyebrow: "Teacher Web",
        title: "Create your teacher workspace",
        description:
          "Set up your teacher account, then move straight into classrooms, attendance sessions, reports, and exports.",
        formTitle: "Create teacher account",
        formDescription: "Your teacher account opens the teaching workspace only.",
        formAction: "/register/password",
        submitLabel: "Create account",
        nameFieldLabel: "Full name",
        helperTitle: "What opens next",
        helperPoints: [
          "Create classrooms, schedules, and announcements from one teacher workspace.",
          "Run QR attendance on web and Bluetooth attendance on mobile with the same account.",
          "Admin support and device recovery stay on the separate admin sign-in path.",
        ],
        alternateLinks: [
          {
            href: resolveWebAuthEntryPath({ scope: "teacher", mode: "login", next: nextPath }),
            label: "Teacher sign in",
          },
          {
            href: resolveWebAuthEntryPath({ scope: "admin", mode: "login" }),
            label: "Admin sign in",
          },
        ],
      }
    case "admin-login":
      return {
        scope: "admin",
        eyebrow: "Admin Web",
        title: "Open student support and governance",
        description:
          "Use your admin sign-in to handle student support, device recovery, imports, and semester controls from one protected workspace.",
        formTitle: "Admin sign in",
        formDescription: "Admin access is provisioned separately from teacher accounts.",
        formAction: "/admin/login/password",
        submitLabel: "Sign in",
        nameFieldLabel: null,
        helperTitle: "What this workspace controls",
        helperPoints: [
          "Review student support first, then move into device recovery only when a case needs it.",
          "Monitor imports and semester controls without mixing them into day-to-day teacher work.",
          "Teacher sign-in and teacher account creation stay on the separate teacher web entry path.",
        ],
        alternateLinks: [
          {
            href: resolveWebAuthEntryPath({ scope: "teacher", mode: "login" }),
            label: "Teacher sign in",
          },
        ],
      }
    default:
      return {
        scope: "teacher",
        eyebrow: "Teacher Web",
        title: "Sign in to your teacher workspace",
        description:
          "Open classrooms, attendance sessions, reports, exports, analytics, and follow-up tools from one teacher sign-in.",
        formTitle: "Teacher sign in",
        formDescription: "Use your teacher account to continue into the teaching workspace.",
        formAction: "/login/password",
        submitLabel: "Sign in",
        nameFieldLabel: null,
        helperTitle: "Teacher workspace scope",
        helperPoints: [
          "Open classrooms, attendance sessions, reports, and exports after sign-in.",
          "Teacher sign-in keeps classroom operations separate from admin support work.",
          "Need a new teacher account? Create it here before opening the workspace.",
        ],
        alternateLinks: [
          {
            href: resolveWebAuthEntryPath({ scope: "teacher", mode: "register", next: nextPath }),
            label: "Create teacher account",
          },
          {
            href: resolveWebAuthEntryPath({ scope: "admin", mode: "login" }),
            label: "Admin sign in",
          },
        ],
      }
  }
}

export function resolveWebAuthErrorMessage(input: {
  variant: WebAuthEntryVariant
  error?: string | null
}) {
  switch (input.error) {
    case "invalid-form":
      return input.variant === "teacher-register"
        ? "Enter your full name, email, and password before continuing."
        : "Enter your email and password before continuing."
    case "invalid-credentials":
      return "The email or password was not accepted for this workspace."
    case "email-in-use":
      return "That email address already belongs to an existing account."
    default:
      return null
  }
}

export function WebAuthEntryPage(props: {
  variant: WebAuthEntryVariant
  error?: string | null
  nextPath?: string | null
}) {
  const model = buildWebAuthEntryModel(props.variant, props.nextPath ?? null)
  const errorMessage = resolveWebAuthErrorMessage({
    variant: props.variant,
    error: props.error ?? null,
  })

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "40px 24px",
        background: webTheme.gradients.page,
      }}
    >
      <section
        style={{
          width: "min(980px, 100%)",
          display: "grid",
          gap: webTheme.spacing.lg,
        }}
      >
        <section
          style={{
            borderRadius: 28,
            padding: webTheme.spacing.xl,
            background: webTheme.colors.surfaceRaised,
            border: `1px solid ${webTheme.colors.border}`,
            boxShadow: webTheme.shadow.hero,
          }}
        >
          <p
            style={{
              margin: "0 0 12px",
              color: webTheme.colors.accent,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontSize: webTheme.typography.eyebrow,
            }}
          >
            {model.eyebrow}
          </p>
          <h1
            style={{
              margin: "0 0 12px",
              color: webTheme.colors.primary,
              fontSize: webTheme.typography.hero,
            }}
          >
            {model.title}
          </h1>
          <p style={{ margin: 0, color: webTheme.colors.textMuted, lineHeight: 1.7 }}>
            {model.description}
          </p>
        </section>

        <div
          style={{
            display: "grid",
            gap: webTheme.spacing.lg,
            gridTemplateColumns: "minmax(0, 1.15fr) minmax(280px, 0.85fr)",
          }}
        >
          <section
            style={{
              borderRadius: 24,
              padding: webTheme.spacing.lg,
              background: webTheme.colors.surfaceRaised,
              border: `1px solid ${webTheme.colors.border}`,
              boxShadow: webTheme.shadow.card,
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 10 }}>{model.formTitle}</h2>
            <p style={{ marginTop: 0, color: webTheme.colors.textMuted, lineHeight: 1.6 }}>
              {model.formDescription}
            </p>
            {errorMessage ? (
              <p
                style={{
                  margin: "0 0 16px",
                  padding: "12px 14px",
                  borderRadius: 14,
                  background: webTheme.colors.dangerSoft,
                  color: webTheme.colors.danger,
                  border: `1px solid ${webTheme.colors.dangerBorder}`,
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {errorMessage}
              </p>
            ) : null}
            <form action={model.formAction} method="post" style={{ display: "grid", gap: 14 }}>
              <input type="hidden" name="next" value={props.nextPath ?? ""} />
              {model.nameFieldLabel ? (
                <label style={{ display: "grid", gap: 6 }}>
                  <span>{model.nameFieldLabel}</span>
                  <input
                    name="displayName"
                    type="text"
                    placeholder="Aarav Sharma"
                    required
                    style={inputStyle}
                  />
                </label>
              ) : null}
              <label style={{ display: "grid", gap: 6 }}>
                <span>Email</span>
                <input
                  name="email"
                  type="email"
                  placeholder={
                    model.scope === "admin"
                      ? "admin@school.edu"
                      : model.nameFieldLabel
                        ? "teacher@school.edu"
                        : "teacher@school.edu"
                  }
                  required
                  style={inputStyle}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Password</span>
                <input
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  required
                  style={inputStyle}
                />
              </label>
              <button
                type="submit"
                style={{
                  display: "inline-flex",
                  justifyContent: "center",
                  padding: "12px 16px",
                  borderRadius: 14,
                  border: "none",
                  background: webTheme.colors.accent,
                  color: webTheme.colors.primaryContrast,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {model.submitLabel}
              </button>
            </form>
            <div
              style={{
                marginTop: webTheme.spacing.md,
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              {model.alternateLinks.map((link) => (
                <Link
                  key={link.href + link.label}
                  href={link.href}
                  style={{
                    color: webTheme.colors.primary,
                    textDecoration: "none",
                    fontWeight: 700,
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </section>

          <section
            style={{
              borderRadius: 24,
              padding: webTheme.spacing.lg,
              background: webTheme.colors.surfaceMuted,
              border: `1px solid ${webTheme.colors.border}`,
              display: "grid",
              gap: webTheme.spacing.md,
              alignContent: "start",
            }}
          >
            <h2 style={{ margin: 0 }}>{model.helperTitle}</h2>
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                display: "grid",
                gap: 10,
                color: webTheme.colors.textMuted,
                lineHeight: 1.6,
              }}
            >
              {model.helperPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </section>
        </div>
      </section>
    </main>
  )
}

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 14,
  border: `1px solid ${webTheme.colors.borderStrong}`,
  background: webTheme.colors.surfaceMuted,
  color: webTheme.colors.text,
} as const
