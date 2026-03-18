import { redirect } from "next/navigation"
import { Suspense } from "react"

import { UnifiedLoginForm } from "../src/unified-login-form"
import type { LoginMode } from "../src/unified-login-form"
import { getWebPortalSession } from "../src/web-session"

export default async function HomePage(props: {
  searchParams?: Promise<{ error?: string; mode?: string }>
}) {
  const searchParams = (await props.searchParams) ?? {}

  if (!searchParams.error) {
    const session = await getWebPortalSession()
    if (session?.accessToken) {
      const dest = session.activeRole === "ADMIN" ? "/admin/dashboard" : "/teacher/dashboard"
      redirect(dest)
    }
  }

  const error = searchParams.error ?? null
  const modeParam = searchParams.mode
  const initialMode: LoginMode | null =
    modeParam === "admin" ? "admin" : modeParam === "teacher" ? "teacher" : null

  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            background: "var(--ae-gradient-page)",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "linear-gradient(135deg, #A78BFA 0%, #818CF8 100%)",
                display: "grid",
                placeItems: "center",
                fontSize: 20,
                fontWeight: 800,
                color: "#fff",
                margin: "0 auto 14px",
              }}
            >
              A
            </div>
            <div
              className="skeleton"
              style={{
                width: 160,
                height: 12,
                borderRadius: 6,
                margin: "0 auto",
              }}
            />
          </div>
        </div>
      }
    >
      <UnifiedLoginForm initialMode={initialMode} error={error} />
    </Suspense>
  )
}
