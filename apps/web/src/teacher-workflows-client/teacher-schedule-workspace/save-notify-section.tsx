"use client"

import { webTheme } from "@attendease/ui-web"

import { workflowStyles } from "../shared"

export function ScheduleActionBar(props: {
  isSaving: boolean
  statusMessage: string | null
  statusTone: "info" | "danger" | "success"
  onAddSlot: () => void
  onAddExtra: () => void
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
      }}
    >
      <button
        type="button"
        onClick={props.onAddSlot}
        style={{
          ...workflowStyles.secondaryButton,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
        Weekly Slot
      </button>

      <button
        type="button"
        onClick={props.onAddExtra}
        style={{
          ...workflowStyles.secondaryButton,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
        Extra Lecture
      </button>

      <div style={{ flex: 1 }} />

      {props.isSaving ? (
        <span style={{ fontSize: 12, color: webTheme.colors.textMuted, fontWeight: 500 }}>
          Saving…
        </span>
      ) : props.statusMessage ? (
        <span
          style={{
            fontSize: 12,
            color:
              props.statusTone === "danger"
                ? webTheme.colors.danger
                : props.statusTone === "success"
                  ? webTheme.colors.success
                  : webTheme.colors.textMuted,
            fontWeight: 500,
          }}
        >
          {props.statusMessage}
        </span>
      ) : null}
    </div>
  )
}
