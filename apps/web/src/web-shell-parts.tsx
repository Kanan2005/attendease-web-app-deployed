import { getWebToneColor, webTheme } from "@attendease/ui-web"
import Link from "next/link"
import { metricStyles, sectionStyles, shellStyles, surfaceCardStyles } from "./web-shell-styles"

import type { WebPortalMetric } from "./web-portal"

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

export function WebTableCard(props: {
  title: string
  description: string
  columns: string[]
  emptyMessage: string
}) {
  return (
    <section style={shellStyles.surface}>
      <h3 style={{ marginTop: 0, color: webTheme.colors.text }}>{props.title}</h3>
      <p style={sectionStyles.sectionMetaText}>{props.description}</p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${props.columns.length}, minmax(0, 1fr))`,
          gap: 12,
          marginBottom: 16,
          color: webTheme.colors.textSubtle,
          fontSize: 12,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {props.columns.map((column) => (
          <span key={column}>{column}</span>
        ))}
      </div>
      <div
        style={{
          borderRadius: 12,
          padding: 18,
          background: webTheme.colors.surfaceMuted,
          border: `1px dashed ${webTheme.colors.border}`,
          color: webTheme.colors.textMuted,
          fontSize: 14,
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
      <h3 style={{ marginTop: 0, color: webTheme.colors.text }}>{props.title}</h3>
      <p style={sectionStyles.sectionMetaText}>{props.description}</p>
      <div
        style={{
          minHeight: 220,
          borderRadius: 12,
          border: `1px solid ${webTheme.colors.border}`,
          background: webTheme.gradients.chart,
          padding: 18,
          display: "grid",
          alignContent: "space-between",
        }}
      >
        <div style={{ ...surfaceCardStyles, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" as const }}>
          <div>
            <p style={{ margin: 0, fontSize: 32, opacity: 0.3 }}>📊</p>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: webTheme.colors.textSubtle }}>
              Chart data will appear once attendance sessions are recorded.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {props.seriesLabels.map((label) => (
            <span
              key={label}
              style={{
                borderRadius: 999,
                padding: "6px 12px",
                background: webTheme.colors.surfaceTint,
                border: `1px solid ${webTheme.colors.borderStrong}`,
                color: webTheme.colors.textMuted,
                fontSize: 12,
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
        maxWidth: 580,
      }}
    >
      <p
        style={{
          margin: "0 0 10px",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          fontSize: 11,
          fontWeight: 600,
          color: webTheme.colors.accent,
        }}
      >
        Protected page
      </p>
      <h2 style={{ marginTop: 0, color: webTheme.colors.text }}>{props.access.title}</h2>
      <p style={{ marginTop: 0, lineHeight: 1.6, color: webTheme.colors.textMuted }}>
        {props.access.message}
      </p>
      <Link
        href={props.access.loginHref}
        style={{
          display: "inline-flex",
          marginTop: 8,
          padding: "12px 20px",
          borderRadius: webTheme.radius.button,
          background: webTheme.colors.accent,
          color: "#0D0D0D",
          textDecoration: "none",
          fontWeight: 600,
          fontSize: 14,
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
