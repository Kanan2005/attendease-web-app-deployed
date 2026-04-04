/**
 * Calendar utility functions for the teacher schedule week-view.
 * Ported from web-workflows-schedule.ts and adapted for mobile.
 */

import type { TeacherScheduleDraft } from "./teacher-schedule-draft"

// ── Constants ──

export const DURATION_OPTIONS = [
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hr" },
  { value: 90, label: "1.5 hr" },
  { value: 120, label: "2 hr" },
] as const

export const HOUR_HEIGHT = 52
export const CALENDAR_START_HOUR = 7
export const CALENDAR_END_HOUR = 21
export const TIME_GUTTER_WIDTH = 44

const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const

// ── Types ──

export interface WeekDate {
  date: Date
  weekday: number // 1=Mon ... 7=Sun
  dayNum: number
  monthShort: string
  isToday: boolean
  isoDate: string // YYYY-MM-DD
}

export interface CalendarEvent {
  id: string
  weekday: number
  startMinutes: number
  endMinutes: number
  timeLabel: string
  locationLabel: string | null
  type: "slot" | "one-off" | "cancelled"
  /** Links back to the draft slot for editing */
  slotLocalId: string | null
  /** Links back to the draft exception for editing */
  exceptionLocalId: string | null
}

// ── Time formatting ──

export function minutesToTimeLabel(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const hour12 = ((h + 11) % 12) + 1
  const suffix = h >= 12 ? "PM" : "AM"
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`
}

export function durationLabel(minutes: number): string {
  if (minutes <= 0) return ""
  if (minutes % 60 === 0) return `${minutes / 60} hr`
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

// ── Weekday helpers ──

export function weekdayShort(weekday: number): string {
  return WEEKDAY_SHORT[(weekday - 1) % 7] ?? `D${weekday}`
}

export function weekdayFull(weekday: number): string {
  const labels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
  return labels[(weekday - 1) % 7] ?? `Day ${weekday}`
}

// ── Week date calculation ──

export function getWeekDates(weekOffset: number): WeekDate[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Find Monday of the current week
  const dow = today.getDay()
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset + weekOffset * 7)

  const dates: WeekDate[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const y = d.getFullYear()
    const mo = String(d.getMonth() + 1).padStart(2, "0")
    const da = String(d.getDate()).padStart(2, "0")
    dates.push({
      date: d,
      weekday: i + 1,
      dayNum: d.getDate(),
      monthShort: MONTHS_SHORT[d.getMonth()]!,
      isToday: d.getTime() === today.getTime(),
      isoDate: `${y}-${mo}-${da}`,
    })
  }
  return dates
}

export function getWeekRangeLabel(dates: WeekDate[]): string {
  const first = dates[0]
  const last = dates[dates.length - 1]
  if (!first || !last) return ""
  if (first.monthShort === last.monthShort) {
    return `${first.dayNum} – ${last.dayNum} ${first.monthShort} ${first.date.getFullYear()}`
  }
  return `${first.dayNum} ${first.monthShort} – ${last.dayNum} ${last.monthShort} ${last.date.getFullYear()}`
}

// ── Visible range computation ──

/** Mon-Fri always shown; Sat/Sun only if they have events */
export function computeVisibleDays(events: CalendarEvent[]): number[] {
  const days = [1, 2, 3, 4, 5]
  if (events.some((e) => e.weekday === 6)) days.push(6)
  if (events.some((e) => e.weekday === 7)) days.push(7)
  return days
}

/** Clip visible hours to 1 hr before earliest event and 1 hr after latest; fallback 8-18 */
export function computeVisibleHours(events: CalendarEvent[]): {
  startHour: number
  endHour: number
} {
  if (events.length === 0) return { startHour: 8, endHour: 18 }
  let min = Infinity
  let max = -Infinity
  for (const e of events) {
    if (e.startMinutes < min) min = e.startMinutes
    if (e.endMinutes > max) max = e.endMinutes
  }
  return {
    startHour: Math.max(CALENDAR_START_HOUR, Math.floor(min / 60) - 1),
    endHour: Math.min(CALENDAR_END_HOUR, Math.ceil(max / 60) + 1),
  }
}

// ── Event building ──

/**
 * Build calendar events from the schedule draft for a specific week.
 * Weekly slots appear every week; exceptions only on the week of their effectiveDate.
 */
export function buildCalendarEvents(
  draft: TeacherScheduleDraft,
  weekDates: WeekDate[],
): CalendarEvent[] {
  const events: CalendarEvent[] = []
  const weekIsos = new Set(weekDates.map((d) => d.isoDate))

  // Weekly recurring slots appear on their weekday every week
  for (const slot of draft.slots) {
    if (slot.status === "ARCHIVED") continue
    events.push({
      id: `slot-${slot.localId}`,
      weekday: slot.weekday,
      startMinutes: slot.startMinutes,
      endMinutes: slot.endMinutes,
      timeLabel: `${minutesToTimeLabel(slot.startMinutes)} – ${minutesToTimeLabel(slot.endMinutes)}`,
      locationLabel: slot.locationLabel || null,
      type: "slot",
      slotLocalId: slot.localId,
      exceptionLocalId: null,
    })
  }

  // Exceptions only show on the week containing their effectiveDate
  for (const exc of draft.exceptions) {
    const effDateStr = exc.effectiveDate.split("T")[0] ?? ""
    if (!weekIsos.has(effDateStr)) continue

    const dateObj = new Date(exc.effectiveDate)
    const jsDay = dateObj.getUTCDay()
    const weekday = jsDay === 0 ? 7 : jsDay

    if (exc.exceptionType === "ONE_OFF" && exc.startMinutes != null && exc.endMinutes != null) {
      events.push({
        id: `exc-${exc.localId}`,
        weekday,
        startMinutes: exc.startMinutes,
        endMinutes: exc.endMinutes,
        timeLabel: `${minutesToTimeLabel(exc.startMinutes)} – ${minutesToTimeLabel(exc.endMinutes)}`,
        locationLabel: exc.locationLabel || null,
        type: "one-off",
        slotLocalId: null,
        exceptionLocalId: exc.localId,
      })
    } else if (exc.exceptionType === "CANCELLED") {
      // Show cancelled overlay at the time of the linked weekly slot
      const linked = exc.scheduleSlotId
        ? draft.slots.find(
            (s) => s.localId === exc.scheduleSlotId || s.existingId === exc.scheduleSlotId,
          )
        : null
      if (linked) {
        events.push({
          id: `exc-${exc.localId}`,
          weekday,
          startMinutes: linked.startMinutes,
          endMinutes: linked.endMinutes,
          timeLabel: `${minutesToTimeLabel(linked.startMinutes)} – ${minutesToTimeLabel(linked.endMinutes)}`,
          locationLabel: null,
          type: "cancelled",
          slotLocalId: null,
          exceptionLocalId: exc.localId,
        })
      }
    }
  }

  return events
}
