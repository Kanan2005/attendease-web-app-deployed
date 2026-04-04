import { getColors } from "@attendease/ui-mobile"
import { Ionicons } from "@expo/vector-icons"
import React, { useCallback, useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"

import { formatMinutes } from "../student-workflow-models-helpers"
import { mapStudentApiErrorToMessage } from "../student-models"
import { studentRoutes } from "../student-routes"
import { useStudentSession } from "../student-session"

import { useStudentClassroomDetailData } from "./queries"
import {
  StudentCard,
  StudentErrorCard,
  StudentLoadingCard,
  StudentNavAction,
  StudentScreen,
  StudentSessionSetupCard,
  styles,
} from "./shared-ui"

// ── Week helpers ──

const DAY_ABBREV = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const

function getMonday(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function formatWeekRange(monday: Date): string {
  const sunday = addDays(monday, 6)
  const mMonth = MONTH_NAMES[monday.getMonth()]
  const sMonth = MONTH_NAMES[sunday.getMonth()]
  if (monday.getMonth() === sunday.getMonth()) {
    return `${monday.getDate()} – ${sunday.getDate()} ${mMonth} ${monday.getFullYear()}`
  }
  return `${monday.getDate()} ${mMonth} – ${sunday.getDate()} ${sMonth} ${sunday.getFullYear()}`
}

// ── Build weekly events from schedule data ──

interface WeekDayEntry {
  date: Date
  weekday: number
  dayAbbrev: string
  dateNum: number
  isToday: boolean
  events: Array<{
    id: string
    timeLabel: string
    locationLabel: string | null
    type: "slot" | "one-off" | "cancelled"
  }>
}

function buildWeekEntries(
  monday: Date,
  schedule: {
    scheduleSlots: Array<{
      id: string
      weekday: number
      startMinutes: number
      endMinutes: number
      locationLabel: string | null
      status: string
    }>
    scheduleExceptions: Array<{
      id: string
      exceptionType: string
      effectiveDate: string
      startMinutes: number | null
      endMinutes: number | null
      locationLabel: string | null
      scheduleSlotId: string | null
    }>
  } | null,
): WeekDayEntry[] {
  const today = new Date()
  const entries: WeekDayEntry[] = []

  for (let i = 0; i < 7; i++) {
    const date = addDays(monday, i)
    const weekday = i + 1
    const dateStr = date.toISOString().slice(0, 10)

    const dayExceptions = (schedule?.scheduleExceptions ?? []).filter((exc) => {
      const excDate = exc.effectiveDate.slice(0, 10)
      return excDate === dateStr
    })

    const cancelledSlotIds = new Set(
      dayExceptions
        .filter((exc) => exc.exceptionType === "CANCELLED" && exc.scheduleSlotId)
        .map((exc) => exc.scheduleSlotId),
    )

    const dayEvents: WeekDayEntry["events"] = []

    for (const slot of schedule?.scheduleSlots ?? []) {
      if (slot.status !== "ACTIVE" || slot.weekday !== weekday) continue
      if (cancelledSlotIds.has(slot.id)) continue
      dayEvents.push({
        id: `slot-${slot.id}-${dateStr}`,
        timeLabel: `${formatMinutes(slot.startMinutes)} – ${formatMinutes(slot.endMinutes)}`,
        locationLabel: slot.locationLabel,
        type: "slot",
      })
    }

    for (const exc of dayExceptions) {
      if (
        exc.exceptionType === "ONE_OFF" &&
        exc.startMinutes != null &&
        exc.endMinutes != null
      ) {
        dayEvents.push({
          id: `exc-${exc.id}`,
          timeLabel: `${formatMinutes(exc.startMinutes)} – ${formatMinutes(exc.endMinutes)}`,
          locationLabel: exc.locationLabel,
          type: "one-off",
        })
      }
    }

    entries.push({
      date,
      weekday,
      dayAbbrev: DAY_ABBREV[i] ?? "",
      dateNum: date.getDate(),
      isToday: isSameDay(date, today),
      events: dayEvents,
    })
  }

  return entries
}

// ── Reusable weekly schedule view ──

export function WeeklyScheduleView(props: {
  schedule: {
    scheduleSlots: Array<{
      id: string
      weekday: number
      startMinutes: number
      endMinutes: number
      locationLabel: string | null
      status: string
    }>
    scheduleExceptions: Array<{
      id: string
      exceptionType: string
      effectiveDate: string
      startMinutes: number | null
      endMinutes: number | null
      locationLabel: string | null
      scheduleSlotId: string | null
    }>
  } | null
}) {
  const c = getColors()
  const [weekOffset, setWeekOffset] = useState(0)

  const monday = useMemo(() => {
    const base = getMonday(new Date())
    return addDays(base, weekOffset * 7)
  }, [weekOffset])

  const weekLabel = useMemo(() => formatWeekRange(monday), [monday])
  const isCurrentWeek = weekOffset === 0

  const weekEntries = useMemo(
    () => buildWeekEntries(monday, props.schedule),
    [monday, props.schedule],
  )

  const hasAnyEvents = weekEntries.some((d) => d.events.length > 0)

  const goBack = useCallback(() => setWeekOffset((v) => v - 1), [])
  const goForward = useCallback(() => setWeekOffset((v) => v + 1), [])
  const goToday = useCallback(() => setWeekOffset(0), [])

  return (
    <View style={{ gap: 12 }}>
      {/* Week navigation header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable onPress={goBack} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={c.primary} />
        </Pressable>
        <Pressable onPress={goToday}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: c.text,
            }}
          >
            {weekLabel}
          </Text>
        </Pressable>
        <Pressable onPress={goForward} hitSlop={12}>
          <Ionicons name="chevron-forward" size={22} color={c.primary} />
        </Pressable>
      </View>

      {!isCurrentWeek ? (
        <Pressable
          onPress={goToday}
          style={{
            alignSelf: "center",
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 14,
            paddingVertical: 5,
            borderRadius: 16,
            backgroundColor: "#FFF3E0",
          }}
        >
          <Ionicons name="arrow-back-circle-outline" size={14} color="#E65100" />
          <Text style={{ fontSize: 12, fontWeight: "600", color: "#E65100" }}>
            Back to this week
          </Text>
        </Pressable>
      ) : null}

      {/* Day rows */}
      {!hasAnyEvents ? (
        <View style={{ alignItems: "center", paddingVertical: 24 }}>
          <Ionicons name="calendar-outline" size={32} color={c.textSubtle} />
          <Text
            style={{
              fontSize: 13,
              color: c.textMuted,
              marginTop: 8,
              textAlign: "center",
            }}
          >
            No classes scheduled this week
          </Text>
        </View>
      ) : (
        weekEntries
          .filter((day) => {
            const isWeekend = day.weekday === 6 || day.weekday === 7
            return !isWeekend || day.events.length > 0
          })
          .map((day, i) => (
          <Animated.View
            key={day.date.toISOString()}
            entering={FadeInDown.duration(200).delay(i * 30)}
          >
            <View
              style={{
                flexDirection: "row",
                gap: 12,
                minHeight: 48,
              }}
            >
              {/* Day label column */}
              <View
                style={{
                  width: 44,
                  alignItems: "center",
                  paddingTop: 2,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: day.isToday ? c.primary : c.textMuted,
                  }}
                >
                  {day.dayAbbrev}
                </Text>
                <View
                  style={[
                    ws.dateBubble,
                    day.isToday && { backgroundColor: c.primary },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "800",
                      color: day.isToday ? "#fff" : c.text,
                    }}
                  >
                    {day.dateNum}
                  </Text>
                </View>
              </View>

              {/* Events column */}
              <View style={{ flex: 1, gap: 6, paddingBottom: 8 }}>
                {day.events.length === 0 ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingVertical: 12,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: c.border,
                    }}
                  >
                    <Ionicons name="sunny-outline" size={14} color={c.textSubtle} />
                    <Text style={{ fontSize: 12, color: c.textSubtle, fontStyle: "italic" }}>
                      No classes
                    </Text>
                  </View>
                ) : (
                  day.events.map((event) => {
                    const isOneOff = event.type === "one-off"
                    return (
                      <View
                        key={event.id}
                        style={[
                          ws.eventCard,
                          {
                            backgroundColor: isOneOff
                              ? `${c.accent}12`
                              : `${c.primary}10`,
                            borderLeftColor: isOneOff ? c.accent : c.primary,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "600",
                            color: isOneOff ? c.accent : c.primary,
                          }}
                          numberOfLines={1}
                        >
                          {event.timeLabel}
                        </Text>
                        {event.locationLabel ? (
                          <Text
                            style={{ fontSize: 11, color: c.textMuted }}
                            numberOfLines={1}
                          >
                            {event.locationLabel}
                          </Text>
                        ) : null}
                      </View>
                    )
                  })
                )}
              </View>
            </View>
          </Animated.View>
        ))
      )}
    </View>
  )
}

const ws = StyleSheet.create({
  dateBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  eventCard: {
    borderLeftWidth: 3,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
  },
})

// ── Screen wrapper ──

export function StudentClassroomScheduleScreen(props: { classroomId: string }) {
  const { session } = useStudentSession()
  const classroom = useStudentClassroomDetailData(props.classroomId)

  return (
    <StudentScreen title="Classroom Schedule" subtitle="Your weekly class schedule.">
      {!session ? (
        <StudentSessionSetupCard />
      ) : classroom.detailQuery.isLoading ||
        classroom.scheduleQuery.isLoading ||
        classroom.lecturesQuery.isLoading ? (
        <StudentLoadingCard label="Loading classroom schedule" />
      ) : classroom.detailQuery.error ||
        classroom.scheduleQuery.error ||
        classroom.lecturesQuery.error ? (
        <StudentErrorCard
          label={mapStudentApiErrorToMessage(
            classroom.detailQuery.error ??
              classroom.scheduleQuery.error ??
              classroom.lecturesQuery.error,
          )}
        />
      ) : (
        <>
          <StudentCard title={classroom.detailQuery.data?.displayTitle ?? "Classroom"}>
            <View style={styles.actionGrid}>
              <StudentNavAction
                href={studentRoutes.classroomDetail(props.classroomId)}
                label="Back To Classroom"
                icon="arrow-back-outline"
              />
              <StudentNavAction
                href={studentRoutes.classroomStream(props.classroomId)}
                label="Open Stream"
                icon="chatbubble-ellipses-outline"
              />
            </View>
          </StudentCard>

          <StudentCard title="Schedule">
            <WeeklyScheduleView schedule={classroom.scheduleQuery.data ?? null} />
          </StudentCard>
        </>
      )}
    </StudentScreen>
  )
}
