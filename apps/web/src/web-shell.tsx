import { webTheme } from "@attendease/ui-web"
import type { ReactNode } from "react"

import { WebPortalNav } from "./web-nav"
import type { WebPortalAccessState, WebPortalPageModel, WebPortalSession } from "./web-portal"
import {
  MetricGrid,
  QuickActions,
  SpotlightSections,
  WebChartCard,
  WebPortalAccessCard,
  WebTableCard,
  formatRoleLabel,
} from "./web-shell-parts"
import { sectionStyles, shellStyles } from "./web-shell-styles"

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
          <p style={sectionStyles.rolePill}>AttendEase</p>
          <div>
            <h1 style={{ margin: "0 0 6px", color: "#1f2937", fontSize: 30 }}>
              {props.scopeLabel}
            </h1>
            <p style={sectionStyles.sectionMetaText}>
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
            background: "linear-gradient(180deg, rgba(250,244,236,0.9), rgba(244,236,222,0.72))",
          }}
        >
          <p style={sectionStyles.sectionHeader}>Account</p>
          <strong style={{ color: "#111827" }}>{accountName}</strong>
          <p style={sectionStyles.sectionMetaText}>
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
        <p style={sectionStyles.rolePill}>{props.model.eyebrow}</p>
        <h2 style={sectionStyles.sectionTitleLarge}>{props.model.title}</h2>
        <p style={sectionStyles.sectionDescription}>{props.model.description}</p>
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
          <h3 style={sectionStyles.sectionTitle}>Keep in mind</h3>
          {props.model.notes.map((note) => (
            <p key={note} style={sectionStyles.sectionMetaText}>
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
      <h3 style={{ marginTop: 0 }}>{props.title}</h3>
      {props.description ? (
        <p style={{ ...sectionStyles.sectionMetaText, marginBottom: 18 }}>{props.description}</p>
      ) : null}
      {props.children}
    </section>
  )
}
