/**
 * Teacher schedule screen — Google Calendar-inspired week view.
 * Shows weekly recurring slots and date-specific exceptions on a time grid.
 * Editors open as full-screen modals for adequate touch-target space.
 */
import { getColors, mobileTheme } from "@attendease/ui-mobile"
import { Ionicons } from "@expo/vector-icons"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native"
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import type {
  TeacherScheduleDraft,
  TeacherScheduleExceptionDraft,
  TeacherScheduleSlotDraft,
} from "../teacher-schedule-draft"
import {
  type CalendarEvent,
  type WeekDate,
  DURATION_OPTIONS,
  HOUR_HEIGHT,
  TIME_GUTTER_WIDTH,
  buildCalendarEvents,
  computeVisibleDays,
  computeVisibleHours,
  durationLabel,
  getWeekDates,
  getWeekRangeLabel,
  minutesToTimeLabel,
  weekdayFull,
  weekdayShort,
} from "../teacher-schedule-calendar"

// ── Editor state types ──

export type EditorState =
  | null
  | { mode: "choose-type" }
  | { mode: "add-slot" }
  | { mode: "edit-slot"; localId: string }
  | { mode: "add-extra" }
  | { mode: "edit-extra"; localId: string }

type Props = {
  hasSession: boolean
  isLoading: boolean
  loadErrorMessage: string | null
  classroomTitle: string
  draft: TeacherScheduleDraft | null
  weekOffset: number
  saveStatus: "idle" | "saving" | "saved" | "error"
  saveErrorText: string | null
  editorState: EditorState
  onSetWeekOffset: (offset: number) => void
  onSetEditorState: (state: EditorState) => void
  onSlotSave: (data: {
    localId: string | null
    weekdays: number[]
    startMinutes: number
    endMinutes: number
    locationLabel: string
    applyToAll: boolean
  }) => void
  onSlotRemove: (localId: string, applyToAll: boolean) => void
  onExtraSave: (data: {
    localId: string | null
    effectiveDate: string
    startMinutes: number
    endMinutes: number
    locationLabel: string
    reason: string
  }) => void
  onExtraRemove: (localId: string) => void
}

// ── Main component ──

export function TeacherClassroomScheduleScreenContent(props: Props) {
  const c = getColors()
  const insets = useSafeAreaInsets()

  if (!props.hasSession) {
    return (
      <View style={[ss.center, { backgroundColor: c.surface }]}>
        <Ionicons name="lock-closed-outline" size={40} color={c.textSubtle} />
        <Text style={{ fontSize: 16, fontWeight: "600", color: c.text, marginTop: 12 }}>
          Sign in required
        </Text>
      </View>
    )
  }

  if (props.isLoading) {
    return (
      <View style={[ss.center, { backgroundColor: c.surface }]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 12 }}>Loading schedule…</Text>
      </View>
    )
  }

  if (props.loadErrorMessage) {
    return (
      <View style={[ss.center, { backgroundColor: c.surface }]}>
        <Ionicons name="alert-circle" size={40} color={c.danger} />
        <Text style={{ fontSize: 14, color: c.danger, marginTop: 12, textAlign: "center" }}>
          {props.loadErrorMessage}
        </Text>
      </View>
    )
  }

  const weekDates = getWeekDates(props.weekOffset)
  const events = props.draft ? buildCalendarEvents(props.draft, weekDates) : []
  const visibleDays = computeVisibleDays(events)
  const { startHour, endHour } = computeVisibleHours(events)
  const isCurrentWeek = props.weekOffset === 0
  const activeSlotCount = props.draft?.slots.filter((s) => s.status === "ACTIVE").length ?? 0

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      {/* Week navigation */}
      <WeekNavBar
        weekDates={weekDates}
        isCurrentWeek={isCurrentWeek}
        saveStatus={props.saveStatus}
        saveErrorText={props.saveErrorText}
        slotCount={activeSlotCount}
        onPrev={() => props.onSetWeekOffset(props.weekOffset - 1)}
        onNext={() => props.onSetWeekOffset(props.weekOffset + 1)}
        onToday={() => props.onSetWeekOffset(0)}
      />

      {/* Day header row */}
      <DayHeaderRow weekDates={weekDates} visibleDays={visibleDays} />

      {/* Calendar grid */}
      <CalendarGrid
        events={events}
        weekDates={weekDates}
        visibleDays={visibleDays}
        startHour={startHour}
        endHour={endHour}
        isCurrentWeek={isCurrentWeek}
        onEventTap={(event) => {
          if (event.type === "cancelled") return
          if (event.slotLocalId) {
            props.onSetEditorState({ mode: "edit-slot", localId: event.slotLocalId })
          } else if (event.exceptionLocalId) {
            props.onSetEditorState({ mode: "edit-extra", localId: event.exceptionLocalId })
          }
        }}
      />

      {/* FAB */}
      <Pressable
        onPress={() => props.onSetEditorState({ mode: "choose-type" })}
        style={[
          ss.fab,
          { backgroundColor: c.primary, bottom: insets.bottom + 24, ...mobileTheme.shadow.glow },
        ]}
      >
        <Ionicons name="add" size={28} color={c.primaryContrast} />
      </Pressable>

      {/* Type chooser modal */}
      <TypeChooserModal
        visible={props.editorState?.mode === "choose-type"}
        onClose={() => props.onSetEditorState(null)}
        onChooseSlot={() => props.onSetEditorState({ mode: "add-slot" })}
        onChooseExtra={() => props.onSetEditorState({ mode: "add-extra" })}
      />

      {/* Slot editor modal — key forces remount between add/edit modes */}
      {(props.editorState?.mode === "add-slot" || props.editorState?.mode === "edit-slot") && (
        <SlotEditorModal
          key={props.editorState.mode === "edit-slot" ? `edit-${props.editorState.localId}` : "add"}
          draft={props.draft}
          editorState={props.editorState}
          onSave={props.onSlotSave}
          onRemove={props.onSlotRemove}
          onClose={() => props.onSetEditorState(null)}
        />
      )}

      {/* Extra lecture editor modal — key forces remount between add/edit modes */}
      {(props.editorState?.mode === "add-extra" || props.editorState?.mode === "edit-extra") && (
        <ExtraEditorModal
          key={props.editorState.mode === "edit-extra" ? `edit-${props.editorState.localId}` : "add"}
          draft={props.draft}
          editorState={props.editorState}
          weekDates={weekDates}
          onSave={props.onExtraSave}
          onRemove={props.onExtraRemove}
          onClose={() => props.onSetEditorState(null)}
        />
      )}
    </View>
  )
}

// ── Week navigation bar ──

function WeekNavBar(props: {
  weekDates: WeekDate[]
  isCurrentWeek: boolean
  saveStatus: "idle" | "saving" | "saved" | "error"
  saveErrorText: string | null
  slotCount: number
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}) {
  const c = getColors()
  return (
    <View style={[ss.navBar, { borderBottomColor: c.border }]}>
      <View style={ss.navRow}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Pressable
            onPress={props.onPrev}
            style={[ss.navArrow, { borderColor: c.border }]}
            hitSlop={6}
          >
            <Ionicons name="chevron-back" size={16} color={c.textMuted} />
          </Pressable>
          <Pressable
            onPress={props.onNext}
            style={[ss.navArrow, { borderColor: c.border }]}
            hitSlop={6}
          >
            <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
          </Pressable>
          {!props.isCurrentWeek && (
            <Pressable
              onPress={props.onToday}
              style={[ss.todayBtn, { backgroundColor: c.primarySoft, borderColor: c.primary }]}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: c.primary }}>Today</Text>
            </Pressable>
          )}
        </View>
        <Text style={{ fontSize: 13, fontWeight: "600", color: c.text }}>
          {getWeekRangeLabel(props.weekDates)}
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 11, color: c.textMuted }}>
          {props.slotCount} weekly slot{props.slotCount === 1 ? "" : "s"}
        </Text>
        {props.saveStatus === "saving" && (
          <Text style={{ fontSize: 11, color: c.textMuted }}>Saving…</Text>
        )}
        {props.saveStatus === "saved" && (
          <Text style={{ fontSize: 11, color: c.success, fontWeight: "600" }}>Saved</Text>
        )}
        {props.saveStatus === "error" && (
          <Text style={{ fontSize: 11, color: c.danger }} numberOfLines={1}>
            {props.saveErrorText ?? "Save failed"}
          </Text>
        )}
      </View>
    </View>
  )
}

// ── Day header row ──

function DayHeaderRow(props: { weekDates: WeekDate[]; visibleDays: number[] }) {
  const c = getColors()
  const { width } = useWindowDimensions()
  const dayWidth = (width - TIME_GUTTER_WIDTH - 16) / props.visibleDays.length

  return (
    <View style={[ss.dayHeaderRow, { borderBottomColor: c.border }]}>
      <View style={{ width: TIME_GUTTER_WIDTH }} />
      {props.visibleDays.map((wd) => {
        const date = props.weekDates[wd - 1]
        if (!date) return null
        return (
          <View
            key={wd}
            style={[
              ss.dayHeaderCell,
              {
                width: dayWidth,
                borderLeftColor: c.border,
                backgroundColor: date.isToday ? `${c.primary}10` : "transparent",
              },
            ]}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: date.isToday ? c.primary : c.textMuted,
              }}
            >
              {weekdayShort(wd)}
            </Text>
            <View
              style={
                date.isToday
                  ? [ss.todayCircle, { backgroundColor: c.primary }]
                  : undefined
              }
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: date.isToday ? c.primaryContrast : c.text,
                }}
              >
                {date.dayNum}
              </Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}

// ── Calendar time grid ──

function CalendarGrid(props: {
  events: CalendarEvent[]
  weekDates: WeekDate[]
  visibleDays: number[]
  startHour: number
  endHour: number
  isCurrentWeek: boolean
  onEventTap: (event: CalendarEvent) => void
}) {
  const c = getColors()
  const { width } = useWindowDimensions()
  const dayWidth = (width - TIME_GUTTER_WIDTH - 16) / props.visibleDays.length
  const totalHours = props.endHour - props.startHour
  const gridHeight = totalHours * HOUR_HEIGHT
  const scrollRef = useRef<ScrollView>(null)

  const evtTop = useCallback(
    (startMin: number) => ((startMin - props.startHour * 60) / 60) * HOUR_HEIGHT,
    [props.startHour],
  )
  const evtHeight = useCallback(
    (start: number, end: number) => Math.max(((end - start) / 60) * HOUR_HEIGHT, 20),
    [],
  )

  // Current-time indicator position
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const showTimeIndicator =
    props.isCurrentWeek &&
    currentMinutes >= props.startHour * 60 &&
    currentMinutes <= props.endHour * 60

  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 8 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ height: gridHeight, flexDirection: "row" }}>
        {/* Time gutter */}
        <View style={{ width: TIME_GUTTER_WIDTH, position: "relative" }}>
          {Array.from({ length: totalHours }, (_, i) => (
            <View
              key={i}
              style={{
                position: "absolute",
                top: i * HOUR_HEIGHT,
                left: 0,
                right: 4,
                height: HOUR_HEIGHT,
              }}
            >
              <Text style={{ fontSize: 10, color: c.textSubtle, textAlign: "right", marginTop: -6 }}>
                {i > 0 ? minutesToTimeLabel((props.startHour + i) * 60) : ""}
              </Text>
            </View>
          ))}
        </View>

        {/* Day columns */}
        {props.visibleDays.map((wd) => {
          const date = props.weekDates[wd - 1]
          if (!date) return null
          const dayEvents = props.events.filter((e) => e.weekday === wd)

          return (
            <View
              key={wd}
              style={{
                width: dayWidth,
                position: "relative",
                borderLeftWidth: StyleSheet.hairlineWidth,
                borderLeftColor: c.border,
                backgroundColor: date.isToday ? `${c.primary}06` : "transparent",
              }}
            >
              {/* Horizontal hour lines */}
              {Array.from({ length: totalHours }, (_, i) =>
                i > 0 ? (
                  <View
                    key={i}
                    style={{
                      position: "absolute",
                      top: i * HOUR_HEIGHT,
                      left: 0,
                      right: 0,
                      height: StyleSheet.hairlineWidth,
                      backgroundColor: c.border,
                      opacity: 0.6,
                    }}
                  />
                ) : null,
              )}

              {/* Event blocks */}
              {dayEvents.map((event) => (
                <EventBlock
                  key={event.id}
                  event={event}
                  top={evtTop(event.startMinutes)}
                  height={evtHeight(event.startMinutes, event.endMinutes)}
                  width={dayWidth}
                  onTap={() => props.onEventTap(event)}
                />
              ))}
            </View>
          )
        })}
      </View>

      {/* Current time indicator */}
      {showTimeIndicator && (
        <View
          style={{
            position: "absolute",
            top: evtTop(currentMinutes),
            left: TIME_GUTTER_WIDTH - 4,
            right: 8,
            height: 2,
            backgroundColor: c.danger,
            borderRadius: 1,
            zIndex: 10,
          }}
        >
          <View
            style={{
              position: "absolute",
              left: -3,
              top: -3,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: c.danger,
            }}
          />
        </View>
      )}
    </ScrollView>
  )
}

// ── Event block ──

function EventBlock(props: {
  event: CalendarEvent
  top: number
  height: number
  width: number
  onTap: () => void
}) {
  const c = getColors()
  const { event } = props
  const isCancelled = event.type === "cancelled"
  const isOneOff = event.type === "one-off"

  return (
    <Pressable
      onPress={isCancelled ? undefined : props.onTap}
      disabled={isCancelled}
      style={{
        position: "absolute",
        top: props.top + 1,
        left: 2,
        right: 2,
        height: props.height - 2,
        borderRadius: 6,
        padding: 3,
        overflow: "hidden",
        borderWidth: isOneOff ? 1.5 : 1,
        borderStyle: isOneOff ? "dashed" : "solid",
        borderColor: isCancelled
          ? c.border
          : isOneOff
            ? c.primary
            : "transparent",
        backgroundColor: isCancelled
          ? c.surfaceMuted
          : isOneOff
            ? `${c.primary}18`
            : c.primarySoft,
        opacity: isCancelled ? 0.5 : 1,
      }}
    >
      <Text
        style={{
          fontSize: 9,
          fontWeight: "700",
          color: isCancelled ? c.textSubtle : c.text,
          textDecorationLine: isCancelled ? "line-through" : "none",
        }}
        numberOfLines={1}
      >
        {minutesToTimeLabel(event.startMinutes)}
      </Text>
      {event.locationLabel ? (
        <Text
          style={{ fontSize: 8, color: isCancelled ? c.textSubtle : c.textMuted }}
          numberOfLines={1}
        >
          {event.locationLabel}
        </Text>
      ) : null}
      {isOneOff && (
        <Text style={{ fontSize: 7, color: c.primary, fontWeight: "600" }}>Extra</Text>
      )}
    </Pressable>
  )
}

// ── Type chooser modal (bottom sheet) ──

function TypeChooserModal(props: {
  visible: boolean
  onClose: () => void
  onChooseSlot: () => void
  onChooseExtra: () => void
}) {
  const c = getColors()
  const insets = useSafeAreaInsets()

  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
      <Pressable style={ss.modalOverlay} onPress={props.onClose}>
        <Animated.View
          entering={FadeInDown.duration(200)}
          style={[
            ss.chooserSheet,
            {
              backgroundColor: c.surfaceRaised,
              paddingBottom: insets.bottom + 16,
              borderColor: c.border,
            },
          ]}
        >
          <Text style={{ fontSize: 16, fontWeight: "700", color: c.text, marginBottom: 16 }}>
            Add to Schedule
          </Text>
          <Pressable
            onPress={props.onChooseSlot}
            style={[ss.chooserBtn, { backgroundColor: c.primarySoft, borderColor: c.primary }]}
          >
            <Ionicons name="calendar-outline" size={20} color={c.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: c.text }}>Weekly Slot</Text>
              <Text style={{ fontSize: 12, color: c.textMuted }}>Repeats every week</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.textSubtle} />
          </Pressable>
          <Pressable
            onPress={props.onChooseExtra}
            style={[ss.chooserBtn, { backgroundColor: c.warningSoft, borderColor: c.warning }]}
          >
            <Ionicons name="add-circle-outline" size={20} color={c.warning} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: c.text }}>Extra Lecture</Text>
              <Text style={{ fontSize: 12, color: c.textMuted }}>One-time only</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.textSubtle} />
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  )
}

// ── Scroll-wheel time picker (ScrollView-based, safe inside parent ScrollView) ──

const WHEEL_ITEM_H = 48
const VISIBLE_ITEMS = 3
const WHEEL_HEIGHT = WHEEL_ITEM_H * VISIBLE_ITEMS

const HOUR_DATA = Array.from({ length: 24 }, (_, i) => i)
const MINUTE_DATA = Array.from({ length: 60 }, (_, i) => i)

function WheelColumn(props: {
  data: number[]
  selected: number
  onSelect: (value: number) => void
  formatItem: (value: number) => string
  width: number
}) {
  const c = getColors()
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    const idx = props.data.indexOf(props.selected)
    if (idx >= 0 && scrollRef.current) {
      scrollRef.current.scrollTo({ y: idx * WHEEL_ITEM_H, animated: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y
      const idx = Math.round(y / WHEEL_ITEM_H)
      const clamped = Math.max(0, Math.min(idx, props.data.length - 1))
      const value = props.data[clamped]!
      if (value !== props.selected) props.onSelect(value)
    },
    [props],
  )

  return (
    <View style={{ height: WHEEL_HEIGHT, width: props.width, overflow: "hidden" }}>
      {/* Selection highlight band — behind the scroll content */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: WHEEL_ITEM_H,
          left: 4,
          right: 4,
          height: WHEEL_ITEM_H,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: c.border,
          zIndex: 0,
        }}
      />
      <ScrollView
        ref={scrollRef}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={{
          paddingTop: WHEEL_ITEM_H,
          paddingBottom: WHEEL_ITEM_H,
        }}
      >
        {props.data.map((item, index) => {
          const isSelected = item === props.selected
          return (
            <Pressable
              key={item}
              onPress={() => {
                props.onSelect(item)
                scrollRef.current?.scrollTo({ y: index * WHEEL_ITEM_H, animated: true })
              }}
              style={{
                height: WHEEL_ITEM_H,
                width: props.width,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: isSelected ? 26 : 18,
                  fontWeight: isSelected ? "700" : "400",
                  color: isSelected ? c.text : c.textSubtle,
                  opacity: isSelected ? 1 : 0.4,
                }}
              >
                {props.formatItem(item)}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

function TimePicker(props: {
  label: string
  minutes: number
  onChange: (minutes: number) => void
}) {
  const c = getColors()
  const hour = Math.floor(props.minutes / 60)
  const minute = props.minutes % 60

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted }}>{props.label}</Text>
        <Text style={{ fontSize: 18, fontWeight: "800", color: c.primary }}>
          {minutesToTimeLabel(props.minutes)}
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: c.surfaceMuted,
          borderRadius: 16,
          paddingVertical: 4,
          alignSelf: "center",
        }}
      >
        <WheelColumn
          data={HOUR_DATA}
          selected={hour}
          onSelect={(h) => props.onChange(h * 60 + minute)}
          formatItem={(v) => String(v).padStart(2, "0")}
          width={90}
        />
        <Text style={{ fontSize: 28, fontWeight: "700", color: c.text, marginHorizontal: 2 }}>:</Text>
        <WheelColumn
          data={MINUTE_DATA}
          selected={minute}
          onSelect={(m) => props.onChange(hour * 60 + m)}
          formatItem={(v) => String(v).padStart(2, "0")}
          width={90}
        />
      </View>
    </View>
  )
}

// ── Duration chips ──

function DurationChips(props: { value: number; onChange: (duration: number) => void }) {
  const c = getColors()
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted }}>Duration</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {DURATION_OPTIONS.map((opt) => {
          const active = props.value === opt.value
          return (
            <Pressable
              key={opt.value}
              onPress={() => props.onChange(opt.value)}
              style={[
                ss.durationChip,
                {
                  backgroundColor: active ? c.primary : c.surfaceMuted,
                  borderColor: active ? c.primary : c.border,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: active ? c.primaryContrast : c.textMuted,
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

// ── Day toggle chips (multi-select for add, single display for edit) ──

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"] as const

function DayToggleChips(props: {
  selected: Set<number>
  onToggle: (day: number) => void
  disabled?: boolean
}) {
  const c = getColors()
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted }}>Days</Text>
      <View style={{ flexDirection: "row", gap: 8, justifyContent: "center" }}>
        {DAY_LABELS.map((label, i) => {
          const dayNum = i + 1
          const active = props.selected.has(dayNum)
          return (
            <Pressable
              key={dayNum}
              onPress={() => !props.disabled && props.onToggle(dayNum)}
              disabled={props.disabled}
              style={[
                ss.dayChip,
                {
                  backgroundColor: active ? c.primary : c.surfaceMuted,
                  borderColor: active ? c.primary : c.border,
                  opacity: props.disabled && !active ? 0.4 : 1,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: active ? c.primaryContrast : c.textMuted,
                }}
              >
                {label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

// ── Slot editor modal ──

function SlotEditorModal(props: {
  draft: TeacherScheduleDraft | null
  editorState: { mode: "add-slot" } | { mode: "edit-slot"; localId: string }
  onSave: (data: {
    localId: string | null
    weekdays: number[]
    startMinutes: number
    endMinutes: number
    locationLabel: string
    applyToAll: boolean
  }) => void
  onRemove: (localId: string, applyToAll: boolean) => void
  onClose: () => void
}) {
  const c = getColors()
  const insets = useSafeAreaInsets()
  const isEdit = props.editorState.mode === "edit-slot"
  const editLocalId = isEdit ? (props.editorState as { localId: string }).localId : null

  // For edit: find the existing slot
  const existingSlot = editLocalId
    ? props.draft?.slots.find((s) => s.localId === editLocalId) ?? null
    : null

  // "Apply to all instances" only relevant for saved (server-persisted) slots
  const showApplyToAll = isEdit && existingSlot?.existingId != null

  const [selectedDays, setSelectedDays] = useState<Set<number>>(
    () => new Set(existingSlot ? [existingSlot.weekday] : [1]),
  )
  const [startMinutes, setStartMinutes] = useState(existingSlot?.startMinutes ?? 540)
  const [duration, setDuration] = useState(
    existingSlot ? existingSlot.endMinutes - existingSlot.startMinutes : 60,
  )
  const [location, setLocation] = useState(existingSlot?.locationLabel ?? "")
  const [applyToAll, setApplyToAll] = useState(true)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const endMinutes = startMinutes + duration

  const handleSave = () => {
    props.onSave({
      localId: editLocalId,
      weekdays: [...selectedDays],
      startMinutes,
      endMinutes,
      locationLabel: location,
      applyToAll: showApplyToAll ? applyToAll : true,
    })
  }

  const handleRemove = () => {
    if (!confirmRemove) {
      setConfirmRemove(true)
      return
    }
    if (editLocalId) {
      props.onRemove(editLocalId, showApplyToAll ? applyToAll : true)
    }
  }

  return (
    <Modal visible animationType="slide" onRequestClose={props.onClose}>
      <View style={[ss.editorContainer, { backgroundColor: c.surface, paddingTop: insets.top }]}>
        {/* Header */}
        <View style={[ss.editorHeader, { borderBottomColor: c.border }]}>
          <Pressable onPress={props.onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={c.textMuted} />
          </Pressable>
          <Text style={{ fontSize: 17, fontWeight: "700", color: c.text, flex: 1, marginLeft: 12 }}>
            {isEdit ? "Edit Weekly Slot" : "Add Weekly Slot"}
          </Text>
          <Pressable
            onPress={handleSave}
            disabled={selectedDays.size === 0}
            style={[
              ss.editorSaveBtn,
              { backgroundColor: c.primary, opacity: selectedDays.size === 0 ? 0.5 : 1 },
            ]}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: c.primaryContrast }}>
              {isEdit ? "Save" : "Add"}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: insets.bottom + 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Day selection */}
          {isEdit ? (
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted }}>Day</Text>
              <Text style={{ fontSize: 16, fontWeight: "600", color: c.text }}>
                {existingSlot ? weekdayFull(existingSlot.weekday) : ""}
              </Text>
            </View>
          ) : (
            <DayToggleChips
              selected={selectedDays}
              onToggle={(day) => {
                setSelectedDays((prev) => {
                  const next = new Set(prev)
                  if (next.has(day)) next.delete(day)
                  else next.add(day)
                  return next
                })
              }}
            />
          )}

          {/* Start time */}
          <TimePicker label="Start Time" minutes={startMinutes} onChange={setStartMinutes} />

          {/* Duration */}
          <DurationChips value={duration} onChange={setDuration} />

          {/* Preview */}
          <View style={[ss.previewRow, { backgroundColor: c.surfaceTint, borderColor: c.border }]}>
            <Ionicons name="time-outline" size={14} color={c.textMuted} />
            <Text style={{ fontSize: 13, color: c.text, flex: 1 }}>
              {minutesToTimeLabel(startMinutes)} – {minutesToTimeLabel(endMinutes)} (
              {durationLabel(duration)})
            </Text>
          </View>

          {/* Location */}
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted }}>
              Venue / Room
            </Text>
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. VLTC 204"
              placeholderTextColor={c.textSubtle}
              autoCapitalize="words"
              style={[ss.textInput, { borderColor: c.border, color: c.text, backgroundColor: c.surfaceMuted }]}
            />
          </View>

          {/* "Apply to all instances" checkbox (edit mode, saved slots only) */}
          {showApplyToAll && (
            <Pressable
              onPress={() => {
                setApplyToAll((v) => !v)
                setConfirmRemove(false)
              }}
              style={ss.checkboxRow}
            >
              <View
                style={[
                  ss.checkbox,
                  {
                    borderColor: applyToAll ? c.primary : c.border,
                    backgroundColor: applyToAll ? c.primary : "transparent",
                  },
                ]}
              >
                {applyToAll && <Ionicons name="checkmark" size={14} color={c.primaryContrast} />}
              </View>
              <Text style={{ fontSize: 13, color: c.text, flex: 1 }}>
                Apply changes to all instances
              </Text>
            </Pressable>
          )}

          {/* Scope hint when checkbox is visible */}
          {showApplyToAll && (
            <Text style={{ fontSize: 11, color: c.textSubtle, marginTop: -12 }}>
              {applyToAll
                ? "Save or remove will affect every week."
                : "Save or remove will only affect this week\u2019s instance."}
            </Text>
          )}

          {/* Remove (edit mode only) */}
          {isEdit && (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
              <Pressable
                onPress={handleRemove}
                style={[
                  ss.removeBtn,
                  {
                    backgroundColor: confirmRemove ? c.danger : c.dangerSoft,
                    borderColor: c.danger,
                  },
                ]}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={confirmRemove ? c.primaryContrast : c.danger}
                />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: confirmRemove ? c.primaryContrast : c.danger,
                  }}
                >
                  {confirmRemove ? "Confirm Remove" : "Remove"}
                </Text>
              </Pressable>
              {confirmRemove && (
                <Pressable
                  onPress={() => setConfirmRemove(false)}
                  style={[ss.cancelRemoveBtn, { borderColor: c.border }]}
                >
                  <Text style={{ fontSize: 14, fontWeight: "600", color: c.textMuted }}>Cancel</Text>
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}

// ── Extra lecture editor modal ──

function ExtraEditorModal(props: {
  draft: TeacherScheduleDraft | null
  editorState: { mode: "add-extra" } | { mode: "edit-extra"; localId: string }
  weekDates: WeekDate[]
  onSave: (data: {
    localId: string | null
    effectiveDate: string
    startMinutes: number
    endMinutes: number
    locationLabel: string
    reason: string
  }) => void
  onRemove: (localId: string) => void
  onClose: () => void
}) {
  const c = getColors()
  const insets = useSafeAreaInsets()
  const isEdit = props.editorState.mode === "edit-extra"
  const editLocalId = isEdit ? (props.editorState as { localId: string }).localId : null

  const existing = editLocalId
    ? props.draft?.exceptions.find((e) => e.localId === editLocalId) ?? null
    : null

  // Default to today's date for new extras
  const defaultDate = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, "0")
    const d = String(now.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }, [])

  const [dateStr, setDateStr] = useState(
    existing ? existing.effectiveDate.split("T")[0] ?? defaultDate : defaultDate,
  )
  const [startMinutes, setStartMinutes] = useState(existing?.startMinutes ?? 540)
  const [duration, setDuration] = useState(
    existing && existing.startMinutes != null && existing.endMinutes != null
      ? existing.endMinutes - existing.startMinutes
      : 60,
  )
  const [location, setLocation] = useState(existing?.locationLabel ?? "")
  const [reason, setReason] = useState(existing?.reason ?? "")
  const [confirmRemove, setConfirmRemove] = useState(false)

  const endMinutes = startMinutes + duration

  const handleSave = () => {
    props.onSave({
      localId: editLocalId,
      effectiveDate: `${dateStr}T00:00:00.000Z`,
      startMinutes,
      endMinutes,
      locationLabel: location,
      reason,
    })
  }

  const handleRemove = () => {
    if (!confirmRemove) {
      setConfirmRemove(true)
      return
    }
    if (editLocalId) {
      props.onRemove(editLocalId)
    }
  }

  return (
    <Modal visible animationType="slide" onRequestClose={props.onClose}>
      <View style={[ss.editorContainer, { backgroundColor: c.surface, paddingTop: insets.top }]}>
        {/* Header */}
        <View style={[ss.editorHeader, { borderBottomColor: c.border }]}>
          <Pressable onPress={props.onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={c.textMuted} />
          </Pressable>
          <Text style={{ fontSize: 17, fontWeight: "700", color: c.text, flex: 1, marginLeft: 12 }}>
            {isEdit ? "Edit Extra Lecture" : "Add Extra Lecture"}
          </Text>
          <Pressable
            onPress={handleSave}
            style={[ss.editorSaveBtn, { backgroundColor: c.primary }]}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: c.primaryContrast }}>
              {isEdit ? "Save" : "Add"}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: insets.bottom + 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Date */}
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted }}>Date</Text>
            <TextInput
              value={dateStr}
              onChangeText={setDateStr}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={c.textSubtle}
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
              style={[ss.textInput, { borderColor: c.border, color: c.text, backgroundColor: c.surfaceMuted }]}
            />
          </View>

          {/* Start time */}
          <TimePicker label="Start Time" minutes={startMinutes} onChange={setStartMinutes} />

          {/* Duration */}
          <DurationChips value={duration} onChange={setDuration} />

          {/* Preview */}
          <View style={[ss.previewRow, { backgroundColor: c.surfaceTint, borderColor: c.border }]}>
            <Ionicons name="time-outline" size={14} color={c.textMuted} />
            <Text style={{ fontSize: 13, color: c.text, flex: 1 }}>
              {dateStr} · {minutesToTimeLabel(startMinutes)} – {minutesToTimeLabel(endMinutes)} (
              {durationLabel(duration)})
            </Text>
          </View>

          {/* Location */}
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted }}>
              Venue / Room
            </Text>
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. VLTC 204"
              placeholderTextColor={c.textSubtle}
              autoCapitalize="words"
              style={[ss.textInput, { borderColor: c.border, color: c.text, backgroundColor: c.surfaceMuted }]}
            />
          </View>

          {/* Reason */}
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted }}>
              Reason (optional)
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Guest lecture, makeup class"
              placeholderTextColor={c.textSubtle}
              autoCapitalize="sentences"
              style={[ss.textInput, { borderColor: c.border, color: c.text, backgroundColor: c.surfaceMuted }]}
            />
          </View>

          {/* Remove (edit mode only) */}
          {isEdit && (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <Pressable
                onPress={handleRemove}
                style={[
                  ss.removeBtn,
                  {
                    backgroundColor: confirmRemove ? c.danger : c.dangerSoft,
                    borderColor: c.danger,
                  },
                ]}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={confirmRemove ? c.primaryContrast : c.danger}
                />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: confirmRemove ? c.primaryContrast : c.danger,
                  }}
                >
                  {confirmRemove ? "Confirm Remove" : "Remove"}
                </Text>
              </Pressable>
              {confirmRemove && (
                <Pressable
                  onPress={() => setConfirmRemove(false)}
                  style={[ss.cancelRemoveBtn, { borderColor: c.border }]}
                >
                  <Text style={{ fontSize: 14, fontWeight: "600", color: c.textMuted }}>Cancel</Text>
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}

// ── Styles ──

const ss = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  navBar: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navArrow: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  todayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginLeft: 2,
  },
  dayHeaderRow: {
    flexDirection: "row",
    paddingLeft: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayHeaderCell: {
    alignItems: "center",
    paddingVertical: 6,
    borderLeftWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  todayCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    position: "absolute",
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  chooserSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 12,
    borderTopWidth: 1,
  },
  chooserBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  editorContainer: {
    flex: 1,
  },
  editorHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  editorSaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  /* (scroll-wheel picker styles are inline in the WheelColumn component) */
  durationChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  dayChip: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelRemoveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
})
