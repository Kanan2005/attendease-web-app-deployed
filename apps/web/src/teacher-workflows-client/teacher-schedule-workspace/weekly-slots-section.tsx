"use client"

import { webTheme } from "@attendease/ui-web"
import { useMemo } from "react"

import {
  CALENDAR_END_HOUR,
  CALENDAR_START_HOUR,
  type WeekCalendarEvent,
  HOUR_HEIGHT_PX,
  minutesToTimeString,
  weekdayShortLabel,
} from "../../web-workflows"

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** Format a date as "31 Mar" */
function formatShortDate(date: Date): string {
  return `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]}`
}

/** Format the week range for the navigation header */
function formatWeekRange(weekDates: Date[]): string {
  const first = weekDates[0]
  const last = weekDates[6]
  if (!first || !last) return ""
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()} – ${last.getDate()} ${SHORT_MONTHS[first.getMonth()]} ${first.getFullYear()}`
  }
  return `${formatShortDate(first)} – ${formatShortDate(last)} ${last.getFullYear()}`
}

/**
 * Hide Sat/Sun unless they have events. Always show Mon–Fri.
 */
function computeVisibleDays(events: WeekCalendarEvent[]): number[] {
  const hasWeekend = (wd: number) => events.some((e) => e.weekday === wd)
  const days = [1, 2, 3, 4, 5]
  if (hasWeekend(6)) days.push(6)
  if (hasWeekend(7)) days.push(7)
  return days
}

/**
 * Clip visible hours to 1 hr before earliest event and 1 hr after latest.
 * Falls back to 8–18 when empty.
 */
function computeVisibleHours(events: WeekCalendarEvent[]): { startHour: number; endHour: number } {
  if (events.length === 0) return { startHour: 8, endHour: 18 }
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (const e of events) {
    if (e.startMinutes < min) min = e.startMinutes
    if (e.endMinutes > max) max = e.endMinutes
  }
  return {
    startHour: Math.max(CALENDAR_START_HOUR, Math.floor(min / 60) - 1),
    endHour: Math.min(CALENDAR_END_HOUR, Math.ceil(max / 60) + 1),
  }
}

/* ---- Pencil (edit) icon SVG rendered inline ---- */

function PencilIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" style={{ display: "block" }}>
      <path d="M12.146.854a.5.5 0 0 1 .708 0l2.292 2.292a.5.5 0 0 1 0 .708l-9.793 9.792a.5.5 0 0 1-.168.11l-3.5 1.5a.5.5 0 0 1-.65-.65l1.5-3.5a.5.5 0 0 1 .11-.168L12.146.854zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 3 10.707V11h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l7.5-7.5z" />
    </svg>
  )
}

/* ---- Main week calendar grid ---- */

export function WeekCalendarGrid(props: {
  events: WeekCalendarEvent[]
  weekDates: Date[]
  /** Called when the user clicks the edit icon on an event */
  onEditEvent: (event: WeekCalendarEvent) => void
  /** Week navigation */
  onPrevWeek: () => void
  onNextWeek: () => void
  onToday: () => void
  isCurrentWeek: boolean
}) {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`

  const visibleDays = useMemo(() => computeVisibleDays(props.events), [props.events])
  const { startHour, endHour } = useMemo(() => computeVisibleHours(props.events), [props.events])
  const totalHours = endHour - startHour
  const gridHeight = totalHours * HOUR_HEIGHT_PX
  const gridCols = `56px repeat(${visibleDays.length}, 1fr)`

  function evtTop(startMinutes: number): number {
    return ((startMinutes - startHour * 60) / 60) * HOUR_HEIGHT_PX
  }
  function evtHeight(start: number, end: number): number {
    return Math.max(((end - start) / 60) * HOUR_HEIGHT_PX, 18)
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
      {/* Week navigation bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          borderBottom: "1px solid var(--ae-card-border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            onClick={props.onPrevWeek}
            title="Previous week"
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: "1px solid var(--ae-card-border)",
              background: "transparent",
              color: webTheme.colors.textMuted,
              fontSize: 14,
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
            }}
            className="ui-secondary-btn"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={props.onNextWeek}
            title="Next week"
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: "1px solid var(--ae-card-border)",
              background: "transparent",
              color: webTheme.colors.textMuted,
              fontSize: 14,
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
            }}
            className="ui-secondary-btn"
          >
            ›
          </button>
          {!props.isCurrentWeek ? (
            <button
              type="button"
              onClick={props.onToday}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: `1px solid ${webTheme.colors.accentBorder}`,
                background: webTheme.colors.accentSoft,
                color: webTheme.colors.accent,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                marginLeft: 2,
              }}
            >
              Today
            </button>
          ) : null}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: webTheme.colors.text, letterSpacing: "-0.01em" }}>
          {formatWeekRange(props.weekDates)}
        </span>
      </div>

      {/* Day header row */}
      <div style={{ display: "grid", gridTemplateColumns: gridCols, borderBottom: "1px solid var(--ae-card-border)" }}>
        <div style={{ padding: "8px 4px" }} />
        {visibleDays.map((wd) => {
          const date = props.weekDates[wd - 1]
          if (!date) return null
          const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
          const isToday = dateKey === todayStr
          return (
            <div
              key={wd}
              style={{
                padding: "8px 4px",
                textAlign: "center",
                borderLeft: "1px solid var(--ae-card-border)",
                background: isToday ? "rgba(167, 139, 250, 0.06)" : "transparent",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: isToday ? webTheme.colors.accent : webTheme.colors.textMuted }}>
                {weekdayShortLabel(wd)}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: isToday ? webTheme.colors.accent : webTheme.colors.text, marginTop: 1 }}>
                {date.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Body */}
      <div style={{ display: "grid", gridTemplateColumns: gridCols, position: "relative", height: gridHeight, overflow: "visible" }}>
        {/* Time gutter */}
        <div style={{ position: "relative" }}>
          {Array.from({ length: totalHours }, (_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: i * HOUR_HEIGHT_PX,
                left: 0,
                right: 0,
                height: HOUR_HEIGHT_PX,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "flex-end",
                paddingRight: 8,
                paddingTop: 2,
                fontSize: 10,
                color: webTheme.colors.textSubtle,
                borderTop: i > 0 ? "1px solid var(--ae-card-border)" : "none",
              }}
            >
              {minutesToTimeString((startHour + i) * 60)}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {visibleDays.map((wd) => {
          const date = props.weekDates[wd - 1]
          if (!date) return null
          const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
          const isToday = dateKey === todayStr
          const dayEvents = props.events.filter((e) => e.weekday === wd)

          return (
            <div
              key={wd}
              style={{
                position: "relative",
                borderLeft: "1px solid var(--ae-card-border)",
                background: isToday ? "rgba(167, 139, 250, 0.03)" : "transparent",
              }}
            >
              {Array.from({ length: totalHours }, (_, hi) => (
                <div
                  key={hi}
                  style={{
                    position: "absolute",
                    top: hi * HOUR_HEIGHT_PX,
                    left: 0,
                    right: 0,
                    height: 1,
                    background: hi > 0 ? "var(--ae-card-border)" : "transparent",
                    opacity: 0.5,
                  }}
                />
              ))}

              {dayEvents.map((event) => {
                const top = evtTop(event.startMinutes)
                const height = evtHeight(event.startMinutes, event.endMinutes)
                const isCancelled = event.type === "cancelled"
                const isOneOff = event.type === "one-off"

                return (
                  <div
                    key={event.id}
                    style={{
                      position: "absolute",
                      top: top + 1,
                      left: 3,
                      right: 3,
                      height: height - 2,
                      borderRadius: 6,
                      padding: "4px 6px",
                      fontSize: 10,
                      lineHeight: 1.3,
                      overflow: "hidden",
                      border: isOneOff
                        ? `1.5px dashed ${webTheme.colors.accent}`
                        : "1px solid transparent",
                      background: isCancelled
                        ? webTheme.colors.surfaceMuted
                        : isOneOff
                          ? "rgba(167, 139, 250, 0.12)"
                          : webTheme.colors.accentSoft,
                      color: isCancelled ? webTheme.colors.textSubtle : webTheme.colors.text,
                      textDecoration: isCancelled ? "line-through" : "none",
                      opacity: isCancelled ? 0.5 : 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                    }}
                  >
                    <span style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {minutesToTimeString(event.startMinutes)}
                    </span>
                    {event.locationLabel ? (
                      <span style={{ opacity: 0.7, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {event.locationLabel}
                      </span>
                    ) : null}
                    {isOneOff ? (
                      <span style={{ fontSize: 9, opacity: 0.6 }}>Extra</span>
                    ) : null}

                    {/* Edit icon — hidden for cancelled events */}
                    {!isCancelled ? (
                      <button
                        type="button"
                        title="Edit slot"
                        onClick={(e) => {
                          e.stopPropagation()
                          props.onEditEvent(event)
                        }}
                        style={{
                          position: "absolute",
                          top: 3,
                          right: 3,
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          border: "none",
                          background: "rgba(0,0,0,0.25)",
                          color: "#fff",
                          cursor: "pointer",
                          display: "grid",
                          placeItems: "center",
                          opacity: 0.6,
                          transition: "opacity 0.15s ease",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1" }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.6" }}
                        className="ui-cal-edit-icon"
                      >
                        <PencilIcon />
                      </button>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
