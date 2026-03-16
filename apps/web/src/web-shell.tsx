import { getWebToneColor, webTheme } from "@attendease/ui-web"
import Link from "next/link"
import type { ReactNode } from "react"

import { WebPortalNav } from "./web-nav"
import type {
  WebPortalAccessState,
  WebPortalMetric,
  WebPortalPageModel,
  WebPortalSession,
  WebPortalSpotlightSection,
} from "./web-portal"

const shellStyles = {
  frame: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "264px minmax(0, 1fr)",
    background: webTheme.gradients.page,
  },
  sidebar: {
    borderRight: `1px solid ${webTheme.colors.border}`,
    padding: `${webTheme.spacing.xl}px ${webTheme.spacing.lg}px ${webTheme.spacing.xxl}px`,
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(18px)",
    display: "grid",
    alignContent: "start",
    gap: webTheme.spacing.lg,
  },
  body: {
    padding: `${webTheme.spacing.xl}px ${webTheme.spacing.xl}px 56px`,
    display: "grid",
    gap: webTheme.spacing.lg,
  },
  surface: {
    borderRadius: webTheme.radius.card,
    background: webTheme.colors.surfaceRaised,
    border: `1px solid ${webTheme.colors.border}`,
    boxShadow: webTheme.shadow.card,
    padding: webTheme.spacing.lg,
  },
} as const

export function WebPortalLayout(props: {
  scopeLabel: string
  session: WebPortalSession | null
  access: WebPortalAccessState
  children: ReactNode
  navItems: Array<{ href: string; label: string; description: string }>
  scopeDescription?: string
}) {
  const accountName =
    props.session?.displayName?.trim() || props.session?.email?.trim() || "Signed-out account"
  const accountRole = props.session ? formatRoleLabel(props.session.activeRole) : null

  return (
    <main style={shellStyles.frame}>
      <aside style={shellStyles.sidebar}>
        <div style={{ display: "grid", gap: 10 }}>
          <p
            style={{
              margin: 0,
              color: webTheme.colors.accent,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontSize: 12,
            }}
          >
            AttendEase
          </p>
          <div>
            <h1 style={{ margin: "0 0 6px", color: webTheme.colors.primary, fontSize: 30 }}>
              {props.scopeLabel}
            </h1>
            <p style={{ margin: 0, color: webTheme.colors.textMuted, lineHeight: 1.6 }}>
              {props.scopeDescription ?? "Open the right workspace and keep daily work moving."}
            </p>
          </div>
        </div>

        <section
          style={{
            ...shellStyles.surface,
            display: "grid",
            gap: 6,
            padding: 18,
            boxShadow: "none",
            background: webTheme.colors.surfaceMuted,
          }}
        >
          <p
            style={{
              margin: 0,
              color: webTheme.colors.textMuted,
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Account
          </p>
          <strong style={{ color: webTheme.colors.text }}>{accountName}</strong>
          <p style={{ margin: 0, color: webTheme.colors.textMuted, lineHeight: 1.5 }}>
            {props.session
              ? `${props.session.email ?? "Signed in"} · ${accountRole}`
              : "Sign in to open a teacher or admin workspace."}
          </p>
        </section>

        <WebPortalNav navItems={props.navItems} />
      </aside>

      <section style={shellStyles.body}>
        {!props.access.allowed ? <WebPortalAccessCard access={props.access} /> : props.children}
      </section>
    </main>
  )
}

export function WebPortalPage(props: {
  model: WebPortalPageModel
  children?: ReactNode
}) {
  const hasTables = props.model.tables.length > 0
  const hasCharts = props.model.charts.length > 0

  return (
    <section style={{ display: "grid", gap: 24 }}>
      <header
        style={{
          ...shellStyles.surface,
          padding: webTheme.spacing.xl,
        }}
      >
        <p
          style={{
            margin: "0 0 10px",
            color: webTheme.colors.accent,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontSize: 12,
          }}
        >
          {props.model.eyebrow}
        </p>
        <h2 style={{ margin: "0 0 12px", color: webTheme.colors.primary, fontSize: 36 }}>
          {props.model.title}
        </h2>
        <p style={{ margin: 0, color: webTheme.colors.textMuted, maxWidth: 880, lineHeight: 1.6 }}>
          {props.model.description}
        </p>
      </header>

      {props.model.metrics.length > 0 ? <MetricGrid metrics={props.model.metrics} /> : null}
      {props.model.spotlightSections?.length ? (
        <SpotlightSections sections={props.model.spotlightSections} />
      ) : null}
      {props.model.actions.length > 0 ? <QuickActions actions={props.model.actions} /> : null}

      {hasTables || hasCharts ? (
        <div
          style={{
            display: "grid",
            gap: 20,
            gridTemplateColumns: hasCharts ? "minmax(0, 1.2fr) minmax(0, 1fr)" : "1fr",
          }}
        >
          {hasTables ? (
            <div style={{ display: "grid", gap: 20 }}>
              {props.model.tables.map((table) => (
                <WebTableCard
                  key={table.title}
                  title={table.title}
                  description={table.description}
                  columns={table.columns}
                  emptyMessage={table.emptyMessage}
                />
              ))}
            </div>
          ) : null}

          {hasCharts ? (
            <div style={{ display: "grid", gap: 20 }}>
              {props.model.charts.map((chart) => (
                <WebChartCard
                  key={chart.title}
                  title={chart.title}
                  description={chart.description}
                  seriesLabels={chart.seriesLabels}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {props.children}

      {props.model.notes.length > 0 ? (
        <div style={{ ...shellStyles.surface, display: "grid", gap: 10 }}>
          <h3 style={{ margin: 0 }}>Keep in mind</h3>
          {props.model.notes.map((note) => (
            <p key={note} style={{ margin: 0, color: webTheme.colors.textMuted, lineHeight: 1.6 }}>
              {note}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  )
}

export function WebSectionCard(props: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section style={shellStyles.surface}>
      <h3 style={{ marginTop: 0, marginBottom: 10 }}>{props.title}</h3>
      {props.description ? (
        <p
          style={{
            marginTop: 0,
            marginBottom: 18,
            color: webTheme.colors.textMuted,
            lineHeight: 1.5,
          }}
        >
          {props.description}
        </p>
      ) : null}
      {props.children}
    </section>
  )
}

function MetricGrid(props: { metrics: WebPortalMetric[] }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 18,
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      }}
    >
      {props.metrics.map((metric) => (
        <div key={metric.label} style={{ ...shellStyles.surface, padding: webTheme.spacing.md }}>
          <p style={{ margin: "0 0 8px", color: webTheme.colors.textMuted, fontSize: 14 }}>
            {metric.label}
          </p>
          <p
            style={{
              margin: 0,
              color: getWebToneColor(metric.tone),
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            {metric.value}
          </p>
        </div>
      ))}
    </div>
  )
}

function SpotlightSections(props: { sections: WebPortalSpotlightSection[] }) {
  return (
    <div style={{ display: "grid", gap: 20 }}>
      {props.sections.map((section) => (
        <section key={section.title} style={shellStyles.surface}>
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ margin: "0 0 8px" }}>{section.title}</h3>
            <p style={{ margin: 0, color: webTheme.colors.textMuted, lineHeight: 1.5 }}>
              {section.description}
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gap: 14,
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            {section.cards.map((card) => (
              <Link
                key={`${section.title}-${card.href}-${card.title}`}
                href={card.href}
                style={{
                  borderRadius: 22,
                  background: webTheme.colors.surfaceTint,
                  border: `1px solid ${webTheme.colors.borderStrong}`,
                  color: "inherit",
                  display: "grid",
                  gap: 8,
                  minHeight: 190,
                  padding: 18,
                  textDecoration: "none",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: getWebToneColor(card.tone),
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {card.eyebrow}
                </p>
                <strong style={{ fontSize: 20, lineHeight: 1.3 }}>{card.title}</strong>
                <p style={{ margin: 0, color: webTheme.colors.textMuted, lineHeight: 1.6 }}>
                  {card.description}
                </p>
                <span
                  style={{
                    alignSelf: "end",
                    color: webTheme.colors.primaryStrong,
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {card.ctaLabel}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function QuickActions(props: {
  actions: Array<{ href: string; label: string; description: string }>
}) {
  return (
    <div style={{ ...shellStyles.surface, display: "grid", gap: 16 }}>
      <div>
        <h3 style={{ margin: "0 0 8px" }}>Go to</h3>
        <p style={{ margin: 0, color: webTheme.colors.textMuted, lineHeight: 1.5 }}>
          Open the next workspace task without stepping through extra pages.
        </p>
      </div>
      <div
        style={{
          display: "grid",
          gap: 14,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        {props.actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            style={{
              borderRadius: 18,
              background: webTheme.colors.surfaceTint,
              border: `1px solid ${webTheme.colors.borderStrong}`,
              padding: 16,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <strong style={{ display: "block", marginBottom: 6 }}>{action.label}</strong>
            <span style={{ color: webTheme.colors.textMuted, fontSize: 14, lineHeight: 1.4 }}>
              {action.description}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function WebTableCard(props: {
  title: string
  description: string
  columns: string[]
  emptyMessage: string
}) {
  return (
    <section style={shellStyles.surface}>
      <h3 style={{ marginTop: 0 }}>{props.title}</h3>
      <p style={{ marginTop: 0, color: webTheme.colors.textMuted, lineHeight: 1.5 }}>
        {props.description}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${props.columns.length}, minmax(0, 1fr))`,
          gap: 12,
          marginBottom: 16,
          color: webTheme.colors.textMuted,
          fontSize: 13,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {props.columns.map((column) => (
          <span key={column}>{column}</span>
        ))}
      </div>
      <div
        style={{
          borderRadius: 18,
          padding: 18,
          background: webTheme.colors.surfaceMuted,
          border: `1px dashed ${webTheme.colors.border}`,
          color: webTheme.colors.textMuted,
        }}
      >
        {props.emptyMessage}
      </div>
    </section>
  )
}

function WebChartCard(props: {
  title: string
  description: string
  seriesLabels: string[]
}) {
  return (
    <section style={shellStyles.surface}>
      <h3 style={{ marginTop: 0 }}>{props.title}</h3>
      <p style={{ marginTop: 0, color: webTheme.colors.textMuted, lineHeight: 1.5 }}>
        {props.description}
      </p>
      <div
        style={{
          minHeight: 220,
          borderRadius: 18,
          border: `1px dashed ${webTheme.colors.border}`,
          background: webTheme.gradients.chart,
          padding: 18,
          display: "grid",
          alignContent: "space-between",
        }}
      >
        <div style={{ color: webTheme.colors.textMuted, lineHeight: 1.5 }}>
          Chart space reserved for concise server data and trend views.
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {props.seriesLabels.map((label) => (
            <span
              key={label}
              style={{
                borderRadius: 999,
                padding: "8px 12px",
                background: "rgba(255,255,255,0.9)",
                border: `1px solid ${webTheme.colors.border}`,
                color: webTheme.colors.text,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

function WebPortalAccessCard(props: { access: WebPortalAccessState }) {
  return (
    <section
      style={{
        ...shellStyles.surface,
        borderColor: webTheme.colors.borderStrong,
        background: webTheme.colors.surfaceTint,
        color: webTheme.colors.primaryStrong,
        maxWidth: 880,
      }}
    >
      <p
        style={{
          margin: "0 0 10px",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        Protected page
      </p>
      <h2 style={{ marginTop: 0 }}>{props.access.title}</h2>
      <p style={{ marginTop: 0, lineHeight: 1.6 }}>{props.access.message}</p>
      <Link
        href={props.access.loginHref}
        style={{
          display: "inline-flex",
          marginTop: 8,
          padding: "12px 16px",
          borderRadius: 14,
          background: webTheme.colors.primary,
          color: "#ffffff",
          textDecoration: "none",
          fontWeight: 700,
        }}
      >
        {props.access.loginLabel}
      </Link>
    </section>
  )
}

function formatRoleLabel(value: string): string {
  switch (value) {
    case "ADMIN":
      return "Admin"
    case "TEACHER":
      return "Teacher"
    case "STUDENT":
      return "Student"
    default:
      return value
  }
}
