"use client"

import { webTheme } from "@attendease/ui-web"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useMemo, useRef, useState } from "react"

import { WebThemeToggle } from "./web-nav"

export type LoginMode = "teacher" | "admin"

export function UnifiedLoginForm(props: {
  initialMode?: LoginMode | null
  error?: string | null
}) {
  const searchParams = useSearchParams()
  const modeFromQuery = searchParams?.get("mode")
  const initialMode =
    props.initialMode ??
    (modeFromQuery === "admin" ? "admin" : "teacher")

  const [mode, setMode] = useState<LoginMode>(initialMode)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const formAction = mode === "teacher" ? "/login/password" : "/admin/login/password"
  const nextPath = mode === "teacher" ? "/teacher/dashboard" : "/admin/dashboard"

  const errorMessage = useMemo(() => {
    switch (props.error) {
      case "invalid-form":
        return "Please enter a valid email and password (min 8 characters)."
      case "invalid-credentials":
        return "Invalid username or password."
      case "rate-limited":
        return "Too many login attempts. Please try again later."
      case "server-error":
        return "Something went wrong. Please try again."
      default:
        return null
    }
  }, [props.error])

  return (
    <main
      className="ae-login-main"
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1fr minmax(0, 480px) 1fr",
        alignItems: "center",
        padding: "40px 24px",
        background: webTheme.colors.surfaceHero,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Theme toggle at top-right */}
      <div style={{ position: "absolute", top: 24, right: 28, zIndex: 10 }}>
        <WebThemeToggle />
      </div>

      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${webTheme.colors.accentSoft} 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      <div />

      <section
        className="animate-in ae-login-card"
        style={{
          borderRadius: 20,
          padding: 40,
          background: webTheme.colors.surfaceRaised,
          border: `1px solid ${webTheme.colors.border}`,
          boxShadow: `${webTheme.shadow.hero}, ${webTheme.shadow.glow}`,
          position: "relative",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: webTheme.gradients.accentButton,
                display: "grid",
                placeItems: "center",
                fontSize: 18,
                fontWeight: 800,
                color: "#fff",
                boxShadow: webTheme.shadow.glow,
              }}
            >
              A
            </div>
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: webTheme.colors.text,
                letterSpacing: "-0.03em",
              }}
            >
              AttendEase
            </span>
          </div>
          <h1
            style={{
              margin: "0 0 4px",
              color: webTheme.colors.text,
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Welcome back
          </h1>
          <p style={{ margin: 0, color: webTheme.colors.textMuted, fontSize: 15 }}>
            Sign in to your account to continue.
          </p>
        </div>

        {/* Mode toggle */}
        <div
          role="tablist"
          aria-label="Login mode"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 4,
            marginBottom: 24,
            padding: 4,
            borderRadius: 12,
            background: webTheme.colors.surfaceMuted,
            border: `1px solid ${webTheme.colors.border}`,
          }}
        >
          {(["teacher", "admin"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              style={{
                padding: "10px 16px",
                borderRadius: 9,
                border: "none",
                background: mode === m ? webTheme.gradients.accentButton : "transparent",
                color: mode === m ? "#fff" : webTheme.colors.textMuted,
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: mode === m ? webTheme.shadow.glow : "none",
              }}
            >
              {m === "teacher" ? "Teacher" : "Admin"}
            </button>
          ))}
        </div>

        <form
          ref={formRef}
          action={formAction}
          method="post"
          style={{ display: "grid", gap: 16 }}
          onSubmit={() => setSubmitting(true)}
        >
          <input type="hidden" name="next" value={nextPath} />

          {errorMessage ? (
            <div
              role="alert"
              aria-live="assertive"
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                background: webTheme.colors.dangerSoft,
                color: webTheme.colors.danger,
                border: `1px solid ${webTheme.colors.dangerBorder}`,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {errorMessage}
            </div>
          ) : null}

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ color: webTheme.colors.textMuted, fontSize: 13, fontWeight: 500 }}>
              Email address
            </span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder={mode === "admin" ? "admin@school.edu" : "teacher@school.edu"}
              required
              aria-invalid={props.error === "invalid-form" || props.error === "invalid-credentials"}
              style={inputStyle}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ color: webTheme.colors.textMuted, fontSize: 13, fontWeight: 500 }}>
              Password
            </span>
            <div style={{ position: "relative" }}>
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                required
                minLength={8}
                aria-invalid={props.error === "invalid-form" || props.error === "invalid-credentials"}
                style={{ ...inputStyle, paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: 6,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: webTheme.colors.textSubtle,
                  padding: "4px 8px",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: `color ${webTheme.animation.fast}`,
                }}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="ui-primary-btn"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 8,
              padding: "12px 16px",
              borderRadius: 12,
              border: "none",
              background: webTheme.gradients.accentButton,
              color: "#fff",
              fontWeight: 600,
              fontSize: 15,
              cursor: submitting ? "not-allowed" : "pointer",
              marginTop: 4,
              boxShadow: webTheme.shadow.glow,
              letterSpacing: "-0.01em",
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? (
              <>
                <span
                  style={{
                    width: 16,
                    height: 16,
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    animation: "spin 0.6s linear infinite",
                  }}
                />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        {mode === "teacher" ? (
          <p style={{ margin: "20px 0 0", fontSize: 14, textAlign: "center" }}>
            <span style={{ color: webTheme.colors.textSubtle }}>New here? </span>
            <Link
              href="/register"
              style={{
                color: webTheme.colors.accent,
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Create an account
            </Link>
          </p>
        ) : null}
      </section>

      <div />
    </main>
  )
}

const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 10,
  border: `1px solid ${webTheme.colors.borderStrong}`,
  background: webTheme.colors.surfaceMuted,
  color: webTheme.colors.text,
  fontSize: 14,
  outline: "none",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
} as const
