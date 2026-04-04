import { webTheme } from "@attendease/ui-web"
import type { ReactNode } from "react"

import { WebNavLinks, WebProfileDropdown, WebThemeToggle } from "./web-nav"
import type { WebPortalAccessState, WebPortalPageModel, WebPortalSession } from "./web-portal"
import { MetricGrid, WebChartCard, WebPortalAccessPage, WebTableCard } from "./web-shell-parts"
import { sectionStyles, shellStyles } from "./web-shell-styles"

export function WebPortalLayout(props: {
  scopeLabel: string
  session: WebPortalSession | null
  access: WebPortalAccessState
  children: ReactNode
  navItems: Array<{ href: string; label: string; description: string }>
  scopeDescription?: string
}) {
  if (!props.access.allowed) {
    return <WebPortalAccessPage access={props.access} scopeLabel={props.scopeLabel} />
  }

  return (
    <main style={shellStyles.frame}>
      <nav className="ae-shell-nav" style={shellStyles.topNav}>
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
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: webTheme.gradients.accentButton,
                display: "grid",
                placeItems: "center",
                fontSize: 14,
                fontWeight: 800,
                color: "#fff",
              }}
            >
              A
            </div>
            <span
              style={{
                color: webTheme.colors.text,
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: "-0.03em",
              }}
            >
              AttendEase
            </span>
          </a>

          {props.navItems.length > 1 ? (
            <>
              <span
                style={{
                  width: 1,
                  height: 20,
                  background: webTheme.colors.border,
                }}
              />
              <WebNavLinks items={props.navItems} />
            </>
          ) : (
            <span
              style={{
                color: webTheme.colors.textSubtle,
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: "-0.01em",
              }}
            >
              {props.scopeLabel} Portal
            </span>
          )}
        </div>

        <div style={shellStyles.topNavRight}>
          <WebThemeToggle />
          <WebProfileDropdown session={props.session} scopeLabel={props.scopeLabel} />
        </div>
      </nav>

      <section className="ae-shell-body" style={shellStyles.body}>
        {props.children}
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
  const hasActions = (props.model.actions?.length ?? 0) > 0
  const hasSpotlight = (props.model.spotlightSections?.length ?? 0) > 0

  return (
    <section style={{ display: "grid", gap: 24 }}>
      <header style={{ padding: "8px 0" }}>
        <p style={sectionStyles.rolePill}>{props.model.eyebrow}</p>
        <h2 style={sectionStyles.sectionTitleLarge}>{props.model.title}</h2>
        <p style={sectionStyles.sectionDescription}>{props.model.description}</p>
      </header>

      {props.model.metrics.length > 0 ? <MetricGrid metrics={props.model.metrics} /> : null}

      {hasActions ? (
        <div
          style={{
            display: "grid",
            gap: 10,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          {props.model.actions?.map((action) => (
            <a
              key={action.href}
              href={action.href}
              className="portal-action-card"
              style={{
                ...shellStyles.surface,
                textDecoration: "none",
                display: "block",
                padding: "18px 20px",
              }}
            >
              <p
                style={{ margin: 0, fontSize: 14, fontWeight: 600, color: webTheme.colors.accent }}
              >
                {action.label}
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 13,
                  color: webTheme.colors.textMuted,
                  lineHeight: 1.5,
                }}
              >
                {action.description}
              </p>
            </a>
          ))}
        </div>
      ) : null}

      {hasSpotlight ? (
        <div style={{ display: "grid", gap: 28 }}>
          {props.model.spotlightSections?.map((section) => (
            <div key={section.title} style={{ display: "grid", gap: 14 }}>
              <div>
                <h3
                  style={{ margin: 0, fontSize: 18, fontWeight: 600, color: webTheme.colors.text }}
                >
                  {section.title}
                </h3>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 14,
                    color: webTheme.colors.textMuted,
                    lineHeight: 1.5,
                  }}
                >
                  {section.description}
                </p>
              </div>
              <div
                style={{
                  display: "grid",
                  gap: 12,
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                }}
              >
                {section.cards.map((card) => (
                  <a
                    key={card.href}
                    href={card.href}
                    className="portal-action-card"
                    style={{
                      ...shellStyles.surface,
                      textDecoration: "none",
                      display: "block",
                      padding: "20px 22px",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 11,
                        fontWeight: 600,
                        color: webTheme.colors.accent,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      {card.eyebrow}
                    </p>
                    <p
                      style={{
                        margin: "6px 0 4px",
                        fontSize: 15,
                        fontWeight: 600,
                        color: webTheme.colors.text,
                      }}
                    >
                      {card.title}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        color: webTheme.colors.textMuted,
                        lineHeight: 1.5,
                      }}
                    >
                      {card.description}
                    </p>
                    <p
                      style={{
                        margin: "10px 0 0",
                        fontSize: 13,
                        fontWeight: 600,
                        color: webTheme.colors.accent,
                      }}
                    >
                      {card.ctaLabel} →
                    </p>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

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
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--ae-card-glow)",
          pointerEvents: "none",
        }}
      />
      <h3
        style={{
          marginTop: 0,
          fontSize: 16,
          fontWeight: 600,
          color: webTheme.colors.text,
          position: "relative",
        }}
      >
        {props.title}
      </h3>
      {props.description ? (
        <p
          style={{
            ...sectionStyles.sectionMetaText,
            marginBottom: 18,
            position: "relative",
          }}
        >
          {props.description}
        </p>
      ) : null}
      <div style={{ position: "relative" }}>{props.children}</div>
    </section>
  )
}
