"use client"

import { webTheme } from "@attendease/ui-web"
import { useState } from "react"

import {
  DURATION_OPTIONS,
  type WeekCalendarEvent,
  durationLabel,
  hhmmToMinutes,
  minutesToHHMM,
  minutesToTimeString,
  weekdayLabel,
  weekdayShortLabel,
} from "../../web-workflows"
import type { ScheduleExceptionDraft, ScheduleSlotDraft } from "../../web-workflows-types"

import { workflowStyles } from "../shared"

/* ---------- Slot editor (add / edit weekly recurring slot) ---------- */

interface SlotEditorProps {
  initial: ScheduleSlotDraft | null
  /** Receives an array of slots (multiple for add-mode weekdays, single for edit) */
  onSave: (slots: ScheduleSlotDraft[], applyToAll: boolean) => void
  onCancel: () => void
  /** Called to remove this slot; `applyToAll` = archive from all weeks vs. cancel this week only */
  onRemove?: ((applyToAll: boolean) => void) | undefined
  /** True when this is a saved recurring slot (shows the "all instances" checkbox) */
  hasSiblings?: boolean
}

export function SlotEditorPanel(props: SlotEditorProps) {
  const isEdit = props.initial?.id != null
  const [weekdays, setWeekdays] = useState<number[]>(
    props.initial ? [props.initial.weekday] : [],
  )
  const [startTime, setStartTime] = useState(
    minutesToHHMM(props.initial?.startMinutes ?? 540),
  )
  const [duration, setDuration] = useState(
    props.initial ? props.initial.endMinutes - props.initial.startMinutes : 60,
  )
  const [location, setLocation] = useState(props.initial?.locationLabel ?? "")
  const [applyToAll, setApplyToAll] = useState(false)
  const [confirmingRemove, setConfirmingRemove] = useState(false)

  function handleSave() {
    const start = hhmmToMinutes(startTime)
    const end = start + duration
    // Build all slots at once so the parent handles them in a single batch
    const slots = (weekdays.length ? weekdays : [1]).map((wd) => ({
      id: props.initial?.id ?? null,
      weekday: wd,
      startMinutes: start,
      endMinutes: end,
      locationLabel: location,
      status: "ACTIVE" as const,
    }))
    props.onSave(slots, applyToAll)
  }

  function handleRemoveClick() {
    if (!confirmingRemove) {
      setConfirmingRemove(true)
      return
    }
    props.onRemove?.(applyToAll)
  }

  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid var(--ae-card-border)",
        background: "var(--ae-card-surface)",
        boxShadow: "var(--ae-card-shadow)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--ae-card-border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 16 }}>📅</span>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: webTheme.colors.text }}>
          {isEdit ? "Edit Weekly Slot" : "Add Weekly Slot"}
        </h3>
      </div>

      <div style={{ padding: "16px 20px", display: "grid", gap: 16 }}>
        {/* Day of week selector */}
        {!isEdit ? (
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: webTheme.colors.textMuted, marginBottom: 6, display: "block" }}>
              Days of week
            </label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[1, 2, 3, 4, 5, 6, 7].map((wd) => {
                const active = weekdays.includes(wd)
                return (
                  <button
                    key={wd}
                    type="button"
                    onClick={() =>
                      setWeekdays((prev) =>
                        active ? prev.filter((d) => d !== wd) : [...prev, wd],
                      )
                    }
                    style={{
                      padding: "6px 14px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 500,
                      border: active
                        ? `1.5px solid ${webTheme.colors.accent}`
                        : "1.5px solid var(--ae-card-border)",
                      background: active ? webTheme.colors.accentSoft : "transparent",
                      color: active ? webTheme.colors.accent : webTheme.colors.textMuted,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {weekdayShortLabel(wd)}
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: webTheme.colors.textMuted, marginBottom: 6, display: "block" }}>
              Day
            </label>
            <span style={{ fontSize: 14, color: webTheme.colors.text }}>
              {weekdayLabel(props.initial?.weekday ?? 1)}
            </span>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: webTheme.colors.textMuted, marginBottom: 6, display: "block" }}>
              Start time
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--ae-card-border)",
                background: "var(--ae-card-surface)",
                color: webTheme.colors.text,
                fontSize: 14,
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: webTheme.colors.textMuted, marginBottom: 6, display: "block" }}>
              Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--ae-card-border)",
                background: "var(--ae-card-surface)",
                color: webTheme.colors.text,
                fontSize: 14,
              }}
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: webTheme.colors.textMuted, marginBottom: 6, display: "block" }}>
              Venue / Room
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. VLTC 204"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--ae-card-border)",
                background: "var(--ae-card-surface)",
                color: webTheme.colors.text,
                fontSize: 14,
              }}
            />
          </div>
        </div>

        {/* Preview */}
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: webTheme.colors.surfaceMuted,
            fontSize: 12,
            color: webTheme.colors.textMuted,
          }}
        >
          {weekdays.length || isEdit
            ? `${(isEdit ? [props.initial?.weekday ?? 1] : weekdays).map((d) => weekdayShortLabel(d)).join(", ")} · ${minutesToTimeString(hhmmToMinutes(startTime))} - ${minutesToTimeString(hhmmToMinutes(startTime) + duration)} (${durationLabel(0, duration)})`
            : "Select at least one day"}
          {location ? ` · ${location}` : ""}
        </div>

        {/* Actions row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Left side: Remove button + "Apply to all" checkbox */}
          {isEdit && props.onRemove ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: "auto" }}>
              <button
                type="button"
                onClick={handleRemoveClick}
                style={{
                  border: `1px solid ${webTheme.colors.dangerBorder}`,
                  borderRadius: 10,
                  padding: "7px 16px",
                  background: confirmingRemove ? webTheme.colors.danger : webTheme.colors.dangerSoft,
                  color: confirmingRemove ? "#fff" : webTheme.colors.danger,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {confirmingRemove ? "Confirm Remove" : "Remove"}
              </button>
              {confirmingRemove ? (
                <button
                  type="button"
                  onClick={() => setConfirmingRemove(false)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: webTheme.colors.textMuted,
                    fontSize: 12,
                    cursor: "pointer",
                    padding: "4px 8px",
                  }}
                >
                  Cancel
                </button>
              ) : null}
              {/* "Apply to all instances" checkbox — only shown when siblings exist */}
              {props.hasSiblings ? (
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    color: webTheme.colors.textMuted,
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={applyToAll}
                    onChange={(e) => setApplyToAll(e.target.checked)}
                    style={{ accentColor: webTheme.colors.accent, width: 14, height: 14 }}
                  />
                  Apply to all instances
                </label>
              ) : null}
            </div>
          ) : null}

          {/* Right side: Cancel + Save */}
          <button type="button" onClick={props.onCancel} style={workflowStyles.secondaryButton}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isEdit && weekdays.length === 0}
            className="ui-primary-btn"
            style={{
              ...workflowStyles.primaryButton,
              opacity: !isEdit && weekdays.length === 0 ? 0.5 : 1,
            }}
          >
            {isEdit ? "Save" : "Add Slot"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------- Extra lecture form (one-off exception) — add & edit ---------- */

interface ExtraLectureFormProps {
  /** Pass an existing exception to enter edit mode; null = add mode */
  initial?: ScheduleExceptionDraft | null
  onSave: (exception: ScheduleExceptionDraft) => void
  onCancel: () => void
  /** Only present in edit mode — removes this extra lecture */
  onRemove?: (() => void) | undefined
}

export function ExtraLecturePanel(props: ExtraLectureFormProps) {
  const isEdit = props.initial?.id != null
  const todayStr = new Date().toISOString().split("T")[0] ?? ""

  const [date, setDate] = useState(
    props.initial ? (props.initial.effectiveDate.split("T")[0] ?? todayStr) : todayStr,
  )
  const [startTime, setStartTime] = useState(
    props.initial?.startMinutes != null ? minutesToHHMM(props.initial.startMinutes) : "09:00",
  )
  const [duration, setDuration] = useState(
    props.initial?.startMinutes != null && props.initial?.endMinutes != null
      ? props.initial.endMinutes - props.initial.startMinutes
      : 60,
  )
  const [location, setLocation] = useState(props.initial?.locationLabel ?? "")
  const [reason, setReason] = useState(props.initial?.reason ?? "")
  const [confirmingRemove, setConfirmingRemove] = useState(false)

  function handleSave() {
    const start = hhmmToMinutes(startTime)
    props.onSave({
      id: props.initial?.id ?? null,
      scheduleSlotId: props.initial?.scheduleSlotId ?? null,
      exceptionType: "ONE_OFF",
      effectiveDate: `${date}T00:00:00.000Z`,
      startMinutes: start,
      endMinutes: start + duration,
      locationLabel: location,
      reason,
    })
  }

  function handleRemoveClick() {
    if (!confirmingRemove) {
      setConfirmingRemove(true)
      return
    }
    props.onRemove?.()
  }

  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid var(--ae-card-border)",
        background: "var(--ae-card-surface)",
        boxShadow: "var(--ae-card-shadow)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--ae-card-border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 16 }}>{isEdit ? "✏️" : "➕"}</span>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: webTheme.colors.text }}>
          {isEdit ? "Edit Extra Lecture" : "Add Extra Lecture"}
        </h3>
      </div>

      <div style={{ padding: "16px 20px", display: "grid", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: webTheme.colors.textMuted, marginBottom: 6, display: "block" }}>
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--ae-card-border)",
                background: "var(--ae-card-surface)",
                color: webTheme.colors.text,
                fontSize: 14,
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: webTheme.colors.textMuted, marginBottom: 6, display: "block" }}>
              Start time
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--ae-card-border)",
                background: "var(--ae-card-surface)",
                color: webTheme.colors.text,
                fontSize: 14,
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: webTheme.colors.textMuted, marginBottom: 6, display: "block" }}>
              Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--ae-card-border)",
                background: "var(--ae-card-surface)",
                color: webTheme.colors.text,
                fontSize: 14,
              }}
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: webTheme.colors.textMuted, marginBottom: 6, display: "block" }}>
              Venue / Room
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. VLTC 204"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--ae-card-border)",
                background: "var(--ae-card-surface)",
                color: webTheme.colors.text,
                fontSize: 14,
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: webTheme.colors.textMuted, marginBottom: 6, display: "block" }}>
            Reason (optional)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Guest lecture, makeup class"
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid var(--ae-card-border)",
              background: "var(--ae-card-surface)",
              color: webTheme.colors.text,
              fontSize: 14,
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Remove button (edit mode only) */}
          {isEdit && props.onRemove ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: "auto" }}>
              <button
                type="button"
                onClick={handleRemoveClick}
                style={{
                  border: `1px solid ${webTheme.colors.dangerBorder}`,
                  borderRadius: 10,
                  padding: "7px 16px",
                  background: confirmingRemove ? webTheme.colors.danger : webTheme.colors.dangerSoft,
                  color: confirmingRemove ? "#fff" : webTheme.colors.danger,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {confirmingRemove ? "Confirm Remove" : "Remove"}
              </button>
              {confirmingRemove ? (
                <button
                  type="button"
                  onClick={() => setConfirmingRemove(false)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: webTheme.colors.textMuted,
                    fontSize: 12,
                    cursor: "pointer",
                    padding: "4px 8px",
                  }}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          ) : null}

          <button type="button" onClick={props.onCancel} style={workflowStyles.secondaryButton}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="ui-primary-btn"
            style={workflowStyles.primaryButton}
          >
            {isEdit ? "Save" : "Add Extra Lecture"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------- Schedule summary list (below calendar) ---------- */

export function ScheduleSummaryList(props: {
  events: WeekCalendarEvent[]
  onEdit: (event: WeekCalendarEvent) => void
}) {
  if (props.events.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "32px 20px",
          color: webTheme.colors.textSubtle,
          fontSize: 14,
        }}
      >
        No schedule slots yet. Add your first weekly slot to get started.
      </div>
    )
  }

  const slots = props.events.filter((e) => e.type === "slot")
  const extras = props.events.filter((e) => e.type === "one-off")

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {slots.map((event) => (
        <button
          key={event.id}
          type="button"
          onClick={() => props.onEdit(event)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 16px",
            borderRadius: 10,
            border: "1px solid var(--ae-card-border)",
            background: "var(--ae-card-surface)",
            cursor: "pointer",
            textAlign: "left",
            width: "100%",
            transition: "background 0.15s ease",
          }}
          className="ui-card-link"
        >
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: webTheme.colors.accentSoft,
              display: "grid",
              placeItems: "center",
              fontSize: 12,
              fontWeight: 700,
              color: webTheme.colors.accent,
              flexShrink: 0,
            }}
          >
            {weekdayShortLabel(event.weekday).slice(0, 2)}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: webTheme.colors.text }}>
              {weekdayLabel(event.weekday)} &middot; {event.label}
            </div>
            <div style={{ fontSize: 12, color: webTheme.colors.textMuted }}>
              {durationLabel(event.startMinutes, event.endMinutes)}
              {event.locationLabel ? ` · ${event.locationLabel}` : ""}
            </div>
          </div>
          <span style={{ fontSize: 14, color: webTheme.colors.textSubtle }}>✎</span>
        </button>
      ))}
      {extras.map((event) => (
        <div
          key={event.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 16px",
            borderRadius: 10,
            border: `1.5px dashed ${webTheme.colors.accentBorder}`,
            background: "rgba(167, 139, 250, 0.04)",
          }}
        >
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(167, 139, 250, 0.12)",
              display: "grid",
              placeItems: "center",
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            ➕
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: webTheme.colors.text }}>
              Extra · {event.label}
            </div>
            <div style={{ fontSize: 12, color: webTheme.colors.textMuted }}>
              {event.locationLabel ?? "No venue"}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
