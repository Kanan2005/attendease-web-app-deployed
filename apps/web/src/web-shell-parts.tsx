import { getWebToneColor, webTheme } from "@attendease/ui-web"
import Link from "next/link"
import { metricStyles, sectionStyles, shellStyles, surfaceCardStyles } from "./web-shell-styles"

import type { WebPortalMetric, WebPortalSpotlightSection } from "./web-portal"

type MetricCardTone = Parameters<typeof getWebToneColor>[0]

export function MetricGrid(props: { metrics: WebPortalMetric[] }) {
  return (
    <div style={metricStyles.grid}>
      {props.metrics.map((metric) => (
        <div
          key={metric.label}
          style={{ ...shellStyles.surface, padding: metricStyles.card.padding }}
        >
          <p style={metricStyles.label}>{metric.label}</p>
          <p
            style={{ ...metricStyles.value, color: getWebToneColor(metric.tone as MetricCardTone) }}
          >
            {metric.value}
          </p>
        </div>
      ))}
    </div>
  )
}

export function SpotlightSections(props: { sections: WebPortalSpotlightSection[] }) {
  return (
    <div style={{ display: "grid", gap: 20 }}>
      {props.sections.map((section) => (
        <section key={section.title} style={shellStyles.surface}>
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ margin: "0 0 8px" }}>{section.title}</h3>
            <p style={sectionStyles.sectionMetaText}>{section.description}</p>
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
                <p style={sectionStyles.sectionMetaText}>{card.description}</p>
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

export function QuickActions(props: {
  actions: Array<{ href: string; label: string; description: string }>
}) {
  return (
    <div style={{ ...shellStyles.surface, display: "grid", gap: 16 }}>
      <div>
        <h3 style={{ margin: "0 0 8px" }}>Go to</h3>
        <p style={sectionStyles.sectionMetaText}>
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
            <span style={sectionStyles.sectionMetaText}>{action.description}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function WebTableCard(props: {
  title: string
  description: string
  columns: string[]
  emptyMessage: string
}) {
  return (
    <section style={shellStyles.surface}>
      <h3 style={{ marginTop: 0 }}>{props.title}</h3>
      <p style={sectionStyles.sectionMetaText}>{props.description}</p>
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

export function WebChartCard(props: {
  title: string
  description: string
  seriesLabels: string[]
}) {
  return (
    <section style={shellStyles.surface}>
      <h3 style={{ marginTop: 0 }}>{props.title}</h3>
      <p style={sectionStyles.sectionMetaText}>{props.description}</p>
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
        <div style={surfaceCardStyles}>
          {"Chart space reserved for concise server data and trend views."}
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

export function WebPortalAccessCard(props: {
  access: { title: string; message: string; loginHref: string; loginLabel: string }
}) {
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

export function formatRoleLabel(value: string): string {
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
