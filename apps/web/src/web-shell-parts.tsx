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
        <div
          style={{
            ...surfaceCardStyles,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center" as const,
          }}
        >
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

export function WebPortalAccessPage(props: {
  access: { title: string; message: string; loginHref: string; loginLabel: string }
  scopeLabel: string
}) {
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
          width: "min(440px, 100%)",
          display: "grid",
          gap: 0,
          textAlign: "center",
        }}
      >
        <div
          style={{
            borderRadius: 24,
            padding: "48px 36px 40px",
            background: webTheme.colors.surfaceRaised,
            border: `1px solid ${webTheme.colors.border}`,
            boxShadow: webTheme.shadow.hero,
            display: "grid",
            gap: 0,
            justifyItems: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: webTheme.gradients.accentButton,
              display: "grid",
              placeItems: "center",
              fontSize: 22,
              fontWeight: 800,
              color: "#fff",
              marginBottom: 28,
            }}
          >
            A
          </div>

          <p
            style={{
              margin: "0 0 8px",
              color: webTheme.colors.accent,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontSize: 11,
            }}
          >
            {props.scopeLabel} Portal
          </p>

          <h1
            style={{
              margin: "0 0 10px",
              color: webTheme.colors.primary,
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.025em",
              lineHeight: 1.2,
            }}
          >
            {props.access.title}
          </h1>

          <p
            style={{
              margin: "0 0 32px",
              color: webTheme.colors.textMuted,
              lineHeight: 1.7,
              fontSize: 15,
              maxWidth: 340,
            }}
          >
            {props.access.message}
          </p>

          <Link
            href={props.access.loginHref}
            style={{
              display: "flex",
              justifyContent: "center",
              width: "100%",
              padding: "14px 24px",
              borderRadius: 14,
              border: "none",
              background: webTheme.gradients.accentButton,
              color: "#fff",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: "-0.01em",
            }}
          >
            {props.access.loginLabel}
          </Link>
        </div>

        <div
          style={{
            marginTop: 20,
            display: "flex",
            justifyContent: "center",
            gap: 6,
            fontSize: 13,
            color: webTheme.colors.textSubtle,
          }}
        >
          <span>Powered by</span>
          <Link
            href="/"
            style={{
              color: webTheme.colors.textMuted,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            AttendEase
          </Link>
        </div>
      </section>
    </main>
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
