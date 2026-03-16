import { webTheme } from "@attendease/ui-web"
import type { ReactNode } from "react"

import { WebProfileDropdown } from "./web-nav"
import type { WebPortalAccessState, WebPortalPageModel, WebPortalSession } from "./web-portal"
import { MetricGrid, WebChartCard, WebPortalAccessCard, WebTableCard } from "./web-shell-parts"
import { sectionStyles, shellStyles } from "./web-shell-styles"

export function WebPortalLayout(props: {
  scopeLabel: string
  session: WebPortalSession | null
  access: WebPortalAccessState
  children: ReactNode
  navItems: Array<{ href: string; label: string; description: string }>
  scopeDescription?: string
}) {
  return (
    <main style={shellStyles.frame}>
      <nav style={shellStyles.topNav}>
        <div style={shellStyles.topNavLeft}>
          <a
            href={props.scopeLabel === "Admin" ? "/admin/dashboard" : "/teacher/dashboard"}
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span
              style={{
                color: webTheme.colors.accent,
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: "-0.03em",
              }}
            >
              AttendEase
            </span>
          </a>
          <span
            style={{
              width: 1,
              height: 24,
              background: webTheme.colors.border,
            }}
          />
          <a
            href={props.scopeLabel === "Admin" ? "/admin/dashboard" : "/teacher/dashboard"}
            style={{
              textDecoration: "none",
              color: webTheme.colors.textMuted,
              fontSize: 14,
              fontWeight: 500,
              transition: `color ${webTheme.animation.fast}`,
            }}
          >
            Dashboard
          </a>
        </div>

        <div style={shellStyles.topNavRight}>
          <WebProfileDropdown session={props.session} scopeLabel={props.scopeLabel} />
        </div>
      </nav>

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
      <header style={{ padding: "8px 0" }}>
        <p style={sectionStyles.rolePill}>{props.model.eyebrow}</p>
        <h2 style={sectionStyles.sectionTitleLarge}>{props.model.title}</h2>
        <p style={sectionStyles.sectionDescription}>{props.model.description}</p>
      </header>

      {props.model.metrics.length > 0 ? <MetricGrid metrics={props.model.metrics} /> : null}

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
