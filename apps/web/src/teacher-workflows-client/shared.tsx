"use client"

import { webTheme } from "@attendease/ui-web"
import { createWebAuthBootstrap } from "../auth"
import type { TeacherWebReviewTone } from "../teacher-review-workflows"

export { workflowStyles } from "./shared-styles"
export { getToneStyles, toneForSessionState } from "./shared-tones"

import { workflowStyles } from "./shared-styles"
import { getToneStyles } from "./shared-tones"

export const bootstrap = createWebAuthBootstrap(process.env as Record<string, string | undefined>)

export function WorkflowField(props: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: "text" | "number" | "date"
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span>{props.label}</span>
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
      <span>{props.label}</span>
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
          <div style={{ color: webTheme.colors.textMuted, fontSize: 13 }}>{card.label}</div>
          <strong style={{ display: "block", fontSize: 24, marginTop: 6 }}>{card.value}</strong>
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

export function WorkflowBanner(props: {
  tone: "info" | "danger"
  message: string
}) {
  return (
    <div
      style={{
        ...workflowStyles.rowCard,
        borderColor:
          props.tone === "danger" ? webTheme.colors.dangerBorder : webTheme.colors.borderStrong,
        background:
          props.tone === "danger" ? webTheme.colors.dangerSoft : webTheme.colors.surfaceHero,
        color: props.tone === "danger" ? webTheme.colors.danger : webTheme.colors.primary,
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
