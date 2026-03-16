import { webTheme } from "@attendease/ui-web"
import Link from "next/link"

export default function HomePage() {
  return (
    <main
      style={{
        display: "grid",
        placeItems: "center",
        padding: "48px 24px",
        minHeight: "100vh",
        background: webTheme.gradients.page,
      }}
    >
      <section
        style={{
          width: "min(920px, 100%)",
          display: "grid",
          gap: webTheme.spacing.lg,
          border: `1px solid ${webTheme.colors.border}`,
          borderRadius: webTheme.radius.card,
          background: webTheme.colors.surfaceRaised,
          padding: webTheme.spacing.xl,
          boxShadow: webTheme.shadow.hero,
        }}
      >
        <p
          style={{
            margin: "0 0 10px",
            color: webTheme.colors.accent,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontWeight: 700,
            fontSize: webTheme.typography.eyebrow,
          }}
        >
          AttendEase
        </p>
        <h1
          style={{
            marginTop: 0,
            marginBottom: 12,
            color: webTheme.colors.primary,
            fontSize: webTheme.typography.hero,
          }}
        >
          Teacher and admin web workspace
        </h1>
        <p style={{ margin: "0 0 18px", color: webTheme.colors.textMuted, lineHeight: 1.7 }}>
          Choose the right web workspace for daily teaching or admin support. Teacher and admin
          access stay separate even though they share one platform.
        </p>

        <div
          style={{
            display: "grid",
            gap: webTheme.spacing.md,
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          <RoleCard
            title="Teacher workspace"
            description="Open classrooms, run attendance sessions, review reports, and follow up with exports or analytics."
            primaryHref="/login?next=/teacher/dashboard"
            primaryLabel="Teacher sign in"
            secondaryHref="/register"
            secondaryLabel="Create teacher account"
            background={webTheme.colors.surfaceTint}
          />
          <RoleCard
            title="Admin workspace"
            description="Handle student support, device recovery, imports, and semester changes."
            primaryHref="/admin/login?next=/admin/dashboard"
            primaryLabel="Admin sign in"
            background={webTheme.colors.surfaceMuted}
          />
        </div>

        <div
          style={{
            borderRadius: 18,
            padding: webTheme.spacing.md,
            background: webTheme.colors.surfaceMuted,
            border: `1px solid ${webTheme.colors.border}`,
            color: webTheme.colors.textMuted,
            lineHeight: 1.6,
          }}
        >
          Teacher accounts can sign in or register from the teacher entry. Admin access is
          provisioned separately and always starts from the admin sign-in page.
        </div>
      </section>
    </main>
  )
}

function RoleCard(props: {
  title: string
  description: string
  primaryHref: string
  primaryLabel: string
  secondaryHref?: string
  secondaryLabel?: string
  background: string
}) {
  return (
    <section
      style={{
        borderRadius: 20,
        padding: webTheme.spacing.lg,
        background: props.background,
        border: `1px solid ${webTheme.colors.borderStrong}`,
        display: "grid",
        gap: webTheme.spacing.sm,
      }}
    >
      <h2 style={{ margin: 0, color: webTheme.colors.text, fontSize: 24 }}>{props.title}</h2>
      <p style={{ margin: 0, color: webTheme.colors.textMuted, lineHeight: 1.6 }}>
        {props.description}
      </p>
      <Link
        href={props.primaryHref}
        style={{
          display: "inline-flex",
          justifyContent: "center",
          alignItems: "center",
          marginTop: webTheme.spacing.sm,
          padding: "12px 20px",
          borderRadius: webTheme.radius.button,
          background: webTheme.colors.accent,
          color: "#0D0D0D",
          textDecoration: "none",
          fontWeight: 600,
          fontSize: 14,
          transition: `all 0.15s`,
        }}
      >
        {props.primaryLabel}
      </Link>
      {props.secondaryHref && props.secondaryLabel ? (
        <Link
          href={props.secondaryHref}
          style={{
            color: webTheme.colors.accent,
            textDecoration: "none",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {props.secondaryLabel}
        </Link>
      ) : null}
    </section>
  )
}
