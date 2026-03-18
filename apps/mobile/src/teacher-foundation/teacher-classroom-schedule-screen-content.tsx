import { getColors } from "@attendease/ui-mobile"
import { StatusPill } from "@attendease/ui-mobile/animated"
import { Ionicons } from "@expo/vector-icons"
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import type { TeacherScheduleDraft } from "../teacher-schedule-draft"

import { mapTeacherApiErrorToMessage } from "../teacher-models"
import { clampInteger, formatDateTime, formatEnum, formatMinutes, formatWeekday, styles } from "./shared-ui"

type RoutePath = string | { pathname: string; params?: Record<string, string> }

type RouteLinks = {
  bluetoothCreate: RoutePath
  detail: RoutePath
  lectures: RoutePath
}

type Props = {
  hasSession: boolean
  isLoading: boolean
  loadErrorMessage: string | null
  classroomTitle: string
  previewTitle: string
  previewMessage: string
  routeLinks: RouteLinks
  schedulePreviewMessage: string
  draft: TeacherScheduleDraft | null
  saveMessage: string | null
  isSavePending: boolean
  canSave: boolean
  saveNote: string
  saveErrorMessage: string | null
  onDiscardDraft: () => void
  onAddWeeklySlot: () => void
  onAddOneOffException: () => void
  onAddCancellation: () => void
  onAddReschedule: () => void
  onUpdateSlot: (
    localId: string,
    patch: {
      weekday?: number
      startMinutes?: number
      endMinutes?: number
      locationLabel?: string
    },
  ) => void
  onRemoveSlot: (localId: string) => void
  onUpdateException: (
    localId: string,
    patch: {
      exceptionType?: "ONE_OFF" | "CANCELLED" | "RESCHEDULED"
      scheduleSlotId?: string | null
      effectiveDate?: string
      startMinutes?: number | null
      endMinutes?: number | null
      locationLabel?: string
      reason?: string
    },
  ) => void
  onSetSaveNote: (value: string) => void
  onSave: () => void
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const

function DayChips(props: { selected: number; onSelect: (day: number) => void }) {
  const c = getColors()
  return (
    <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
      {DAY_LABELS.map((label, i) => {
        const dayNum = i + 1
        const active = props.selected === dayNum
        return (
          <Pressable
            key={label}
            onPress={() => props.onSelect(dayNum)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: active ? c.primary : c.surfaceMuted,
              borderWidth: 1,
              borderColor: active ? c.primary : c.border,
            }}
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
  )
}

function TimeInputRow(props: {
  startMinutes: number
  endMinutes: number
  onStartChange: (v: number) => void
  onEndChange: (v: number) => void
}) {
  const c = getColors()
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Ionicons name="time-outline" size={14} color={c.textSubtle} />
        <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: "600" }}>
          {formatMinutes(props.startMinutes)} – {formatMinutes(props.endMinutes)}
        </Text>
      </View>
      <View style={styles.inputRow}>
        <TextInput
          value={String(props.startMinutes)}
          autoCapitalize="none"
          keyboardType="number-pad"
          placeholder="Start (min)"
          placeholderTextColor={c.textSubtle}
          onChangeText={(v) => props.onStartChange(clampInteger(v, props.startMinutes, 0, 1439))}
          style={[styles.input, styles.halfInput]}
        />
        <TextInput
          value={String(props.endMinutes)}
          autoCapitalize="none"
          keyboardType="number-pad"
          placeholder="End (min)"
          placeholderTextColor={c.textSubtle}
          onChangeText={(v) => props.onEndChange(clampInteger(v, props.endMinutes, 1, 1440))}
          style={[styles.input, styles.halfInput]}
        />
      </View>
    </View>
  )
}

function slotStatusTone(status: string): "primary" | "success" | "warning" | "danger" {
  if (status === "ACTIVE") return "success"
  if (status === "DRAFT" || status === "NEW") return "primary"
  return "warning"
}

function exceptionTypeTone(
  type: string,
): "primary" | "success" | "warning" | "danger" {
  if (type === "CANCELLED") return "danger"
  if (type === "RESCHEDULED") return "warning"
  return "primary"
}

function IconButton(props: {
  icon: React.ComponentProps<typeof Ionicons>["name"]
  label: string
  onPress: () => void
  variant?: "primary" | "secondary" | "danger"
}) {
  const c = getColors()
  const isDanger = props.variant === "danger"
  return (
    <Pressable
      style={isDanger ? styles.dangerButton : styles.secondaryButton}
      onPress={props.onPress}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Ionicons
          name={props.icon}
          size={15}
          color={isDanger ? c.primaryContrast : c.primary}
        />
        <Text style={isDanger ? styles.primaryButtonLabel : styles.secondaryButtonLabel}>
          {props.label}
        </Text>
      </View>
    </Pressable>
  )
}

export function TeacherClassroomScheduleScreenContent({
  hasSession,
  isLoading,
  loadErrorMessage,
  classroomTitle,
  previewTitle,
  previewMessage,
  routeLinks,
  schedulePreviewMessage,
  draft,
  saveMessage,
  isSavePending,
  canSave,
  saveNote,
  saveErrorMessage,
  onDiscardDraft,
  onAddWeeklySlot,
  onAddOneOffException,
  onAddCancellation,
  onAddReschedule,
  onUpdateSlot,
  onRemoveSlot,
  onUpdateException,
  onSetSaveNote,
  onSave,
}: Props) {
  const c = getColors()

  if (!hasSession) {
    return (
      <View style={{ flex: 1, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Ionicons name="lock-closed-outline" size={40} color={c.textSubtle} />
        <Text style={{ fontSize: 16, fontWeight: "600", color: c.text, marginTop: 12 }}>Sign in required</Text>
      </View>
    )
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 12 }}>Loading schedule…</Text>
      </View>
    )
  }

  if (loadErrorMessage) {
    return (
      <View style={{ flex: 1, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Ionicons name="alert-circle" size={40} color={c.danger} />
        <Text style={{ fontSize: 14, color: c.danger, marginTop: 12, textAlign: "center" }}>{loadErrorMessage}</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.surface }}
      contentContainerStyle={{ paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={ss.header}>
        <Text style={[ss.heading, { color: c.text }]}>{classroomTitle}</Text>
        <Text style={{ fontSize: 13, color: c.textMuted }}>{previewTitle}</Text>
      </View>

      {/* ── Quick actions ── */}
      <View style={ss.actionsRow}>
        <IconButton icon="add-circle-outline" label="Weekly slot" onPress={onAddWeeklySlot} />
        <IconButton icon="add-circle-outline" label="One-off" onPress={onAddOneOffException} />
        <IconButton icon="close-circle-outline" label="Cancel" onPress={onAddCancellation} />
        <IconButton icon="swap-horizontal-outline" label="Reschedule" onPress={onAddReschedule} />
      </View>

      {/* ── Weekly Slots ── */}
      <View style={ss.section}>
        <Text style={[ss.sectionTitle, { color: c.text }]}>Weekly Slots</Text>
        {draft?.slots.length ? (
          draft.slots.map((slot) => (
            <View key={slot.localId} style={[ss.card, { backgroundColor: c.surfaceRaised, borderColor: c.border }]}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>
                  {slot.existingId ? formatWeekday(slot.weekday) : "New slot"}
                </Text>
                <StatusPill label={slot.status ?? "DRAFT"} tone={slotStatusTone(slot.status ?? "DRAFT")} />
              </View>
              <DayChips selected={slot.weekday} onSelect={(day) => onUpdateSlot(slot.localId, { weekday: day })} />
              <TimeInputRow
                startMinutes={slot.startMinutes} endMinutes={slot.endMinutes}
                onStartChange={(v) => onUpdateSlot(slot.localId, { startMinutes: v })}
                onEndChange={(v) => onUpdateSlot(slot.localId, { endMinutes: v })}
              />
              <TextInput
                value={slot.locationLabel} autoCapitalize="sentences" placeholder="Location (e.g. Room 301)" placeholderTextColor={c.textSubtle}
                onChangeText={(value) => onUpdateSlot(slot.localId, { locationLabel: value })} style={styles.input}
              />
              <IconButton
                icon={slot.existingId ? "archive-outline" : "trash-outline"}
                label={slot.existingId ? "Archive" : "Remove"}
                onPress={() => onRemoveSlot(slot.localId)}
                variant={slot.existingId ? "secondary" : "danger"}
              />
            </View>
          ))
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 24, gap: 6 }}>
            <Ionicons name="calendar-outline" size={32} color={c.textSubtle} />
            <Text style={{ fontSize: 13, color: c.textMuted }}>No weekly slots yet</Text>
          </View>
        )}
      </View>

      {/* ── Date Exceptions ── */}
      <View style={ss.section}>
        <Text style={[ss.sectionTitle, { color: c.text }]}>Date Exceptions</Text>
        {draft?.exceptions.length ? (
          draft.exceptions.map((exception) => {
            const tone = exceptionTypeTone(exception.exceptionType)
            const toneColor = tone === "danger" ? c.danger : tone === "warning" ? c.warning : c.primary
            return (
              <View key={exception.localId} style={[ss.card, { backgroundColor: c.surfaceRaised, borderColor: c.border }]}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons
                      name={exception.exceptionType === "CANCELLED" ? "close-circle-outline" : exception.exceptionType === "RESCHEDULED" ? "swap-horizontal-outline" : "add-circle-outline"}
                      size={18} color={toneColor}
                    />
                    <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>
                      {exception.existingId ? formatEnum(exception.exceptionType) : "New exception"}
                    </Text>
                  </View>
                  <StatusPill label={formatEnum(exception.exceptionType)} tone={tone} />
                </View>

                <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                  {(["ONE_OFF", "CANCELLED", "RESCHEDULED"] as const).map((t) => (
                    <Pressable
                      key={t}
                      onPress={() => onUpdateException(exception.localId, {
                        exceptionType: t,
                        ...(t === "ONE_OFF" ? { scheduleSlotId: null } : {}),
                        ...(t === "CANCELLED" ? { startMinutes: null, endMinutes: null } : {}),
                      })}
                      style={[ss.typeChip, { borderColor: exception.exceptionType === t ? c.primary : c.border, backgroundColor: exception.exceptionType === t ? c.primarySoft : c.surfaceMuted }]}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "600", color: exception.exceptionType === t ? c.primary : c.textMuted }}>
                        {formatEnum(t)}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <TextInput
                  value={exception.effectiveDate} autoCapitalize="none" placeholder="Date (YYYY-MM-DD)" placeholderTextColor={c.textSubtle}
                  onChangeText={(value) => onUpdateException(exception.localId, { effectiveDate: value })} style={styles.input}
                />

                {exception.exceptionType !== "CANCELLED" ? (
                  <TimeInputRow
                    startMinutes={exception.startMinutes ?? 540} endMinutes={exception.endMinutes ?? 600}
                    onStartChange={(v) => onUpdateException(exception.localId, { startMinutes: v })}
                    onEndChange={(v) => onUpdateException(exception.localId, { endMinutes: v })}
                  />
                ) : null}

                <TextInput
                  value={exception.locationLabel} autoCapitalize="sentences" placeholder="Location" placeholderTextColor={c.textSubtle}
                  onChangeText={(value) => onUpdateException(exception.localId, { locationLabel: value })} style={styles.input}
                />
                <TextInput
                  value={exception.reason} autoCapitalize="sentences" placeholder="Reason (optional)" placeholderTextColor={c.textSubtle}
                  onChangeText={(value) => onUpdateException(exception.localId, { reason: value })} style={styles.input}
                />

                <Text style={{ fontSize: 11, color: c.textMuted }}>
                  {formatEnum(exception.exceptionType)} · {formatDateTime(exception.effectiveDate)}
                  {exception.startMinutes !== null && exception.endMinutes !== null
                    ? ` · ${formatMinutes(exception.startMinutes)} – ${formatMinutes(exception.endMinutes)}`
                    : ""}
                </Text>
              </View>
            )
          })
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 24, gap: 6 }}>
            <Ionicons name="alert-circle-outline" size={32} color={c.textSubtle} />
            <Text style={{ fontSize: 13, color: c.textMuted }}>No exceptions yet</Text>
          </View>
        )}
      </View>

      {/* ── Save & Notify ── */}
      <View style={ss.section}>
        <Text style={[ss.sectionTitle, { color: c.text }]}>Save & Notify</Text>
        <View style={[ss.card, { backgroundColor: c.surfaceRaised, borderColor: c.border }]}>
          <TextInput
            value={saveNote} autoCapitalize="sentences" multiline placeholder="Change note (optional)" placeholderTextColor={c.textSubtle}
            onChangeText={onSetSaveNote} style={[styles.input, styles.multilineInput]}
          />
          <Pressable
            style={[styles.primaryButton, isSavePending || !canSave ? { opacity: 0.5 } : null]}
            disabled={isSavePending || !canSave} onPress={onSave}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="cloud-upload-outline" size={18} color={c.primaryContrast} />
              <Text style={styles.primaryButtonLabel}>{isSavePending ? "Saving…" : "Save & notify"}</Text>
            </View>
          </Pressable>
          {!canSave ? <Text style={{ fontSize: 12, color: c.textMuted }}>No unsaved changes.</Text> : null}
          {saveErrorMessage ? <Text style={{ fontSize: 12, color: c.danger }}>{mapTeacherApiErrorToMessage(saveErrorMessage)}</Text> : null}
          {saveMessage ? <Text style={{ fontSize: 12, color: c.success, fontWeight: "600" }}>{saveMessage}</Text> : null}
        </View>

        <Pressable onPress={onDiscardDraft} style={{ alignSelf: "center", paddingVertical: 8 }}>
          <Text style={{ fontSize: 13, color: c.textMuted, fontWeight: "600" }}>Discard draft changes</Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}

const ss = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4, gap: 2 },
  heading: { fontSize: 18, fontWeight: "700" },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  section: { paddingHorizontal: 16, marginTop: 12, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
})
