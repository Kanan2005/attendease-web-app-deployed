"use client"

import { webTheme } from "@attendease/ui-web"
import { useEffect } from "react"
import { createWebAuthBootstrap } from "../auth"
import type { TeacherWebReviewTone } from "../teacher-review-workflows"

export { workflowStyles } from "./shared-styles"
export { getToneStyles, toneForSessionState } from "./shared-tones"

import { workflowStyles } from "./shared-styles"
import { getToneStyles } from "./shared-tones"

export const bootstrap = createWebAuthBootstrap()

const fieldLabelStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: webTheme.colors.textMuted,
  letterSpacing: "0.02em",
} as const

export function WorkflowField(props: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: "text" | "number" | "date" | "datetime-local"
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={fieldLabelStyle}>{props.label}</span>
      <input
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
        type={props.type ?? "text"}
        style={workflowStyles.input}
      />
    </label>
  )
}

export function WorkflowSelectField(props: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={fieldLabelStyle}>{props.label}</span>
      <select
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        style={workflowStyles.input}
      >
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function WorkflowSummaryGrid(props: {
  cards: Array<{ label: string; value: string; tone: TeacherWebReviewTone }>
}) {
  return (
    <div style={workflowStyles.summaryGrid}>
      {props.cards.map((card) => (
        <div
          key={card.label}
          style={{
            ...workflowStyles.summaryMetric,
            borderColor: getToneStyles(card.tone).borderColor,
            background: getToneStyles(card.tone).background,
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background: "var(--ae-card-glow)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "relative",
              color: webTheme.colors.textSubtle,
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {card.label}
          </div>
          <strong
            style={{
              display: "block",
              fontSize: 22,
              marginTop: 6,
              letterSpacing: "-0.02em",
              position: "relative",
            }}
          >
            {card.value}
          </strong>
        </div>
      ))}
    </div>
  )
}

export function WorkflowTonePill(props: {
  label: string
  tone: TeacherWebReviewTone
}) {
  const toneStyles = getToneStyles(props.tone)

  return (
    <span
      style={{
        ...workflowStyles.pill,
        background: toneStyles.background,
        borderColor: toneStyles.borderColor,
        color: toneStyles.textColor,
      }}
    >
      {props.label}
    </span>
  )
}

export function WorkflowStatusCard(props: {
  title: string
  message: string
  tone: TeacherWebReviewTone
}) {
  const toneStyles = getToneStyles(props.tone)

  return (
    <div
      style={{
        ...workflowStyles.rowCard,
        borderColor: toneStyles.borderColor,
        background: toneStyles.background,
        color: toneStyles.textColor,
      }}
    >
      <strong style={{ display: "block", marginBottom: 8 }}>{props.title}</strong>
      <div style={{ lineHeight: 1.7 }}>{props.message}</div>
    </div>
  )
}

export function WorkflowStateCard(props: { message: string }) {
  return <div style={workflowStyles.stateCard}>{props.message}</div>
}

/**
 * Client-side safety net: redirects to the login page when the access token
 * is missing. Handles the edge case where the layout RSC is cached during
 * soft navigation but the session cookies have already expired.
 */
export function useAuthRedirect(accessToken: string | null) {
  useEffect(() => {
    if (!accessToken && typeof window !== "undefined") {
      const next = window.location.pathname + window.location.search
      window.location.href = `/?next=${encodeURIComponent(next)}`
    }
  }, [accessToken])
}

export function WorkflowBanner(props: {
  tone: "info" | "danger"
  message: string
}) {
  const isDanger = props.tone === "danger"
  return (
    <div
      style={{
        borderRadius: 10,
        padding: "12px 16px",
        fontSize: 14,
        lineHeight: 1.5,
        borderColor: isDanger ? webTheme.colors.dangerBorder : webTheme.colors.accentBorder,
        border: `1px solid ${isDanger ? webTheme.colors.dangerBorder : webTheme.colors.accentBorder}`,
        background: isDanger ? webTheme.colors.dangerSoft : webTheme.colors.accentSoft,
        color: isDanger ? webTheme.colors.danger : webTheme.colors.accent,
      }}
    >
      {props.message}
    </div>
  )
}

export function findSelectedFilterLabel(
  options: Array<{ value: string; label: string }>,
  selectedValue: string,
) {
  return options.find((option) => option.value === selectedValue)?.label ?? null
}
