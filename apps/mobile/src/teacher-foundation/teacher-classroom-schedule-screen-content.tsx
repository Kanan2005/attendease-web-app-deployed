import { Pressable, Text, TextInput, View } from "react-native"
import type { TeacherScheduleDraft } from "../teacher-schedule-draft"

import { mapTeacherApiErrorToMessage } from "../teacher-models"
import { clampInteger, formatDateTime, formatEnum, formatMinutes, formatWeekday } from "./shared-ui"
import {
  TeacherCard,
  TeacherEmptyCard,
  TeacherErrorCard,
  TeacherLoadingCard,
  TeacherNavAction,
  TeacherScreen,
  TeacherSessionSetupCard,
  styles,
} from "./shared-ui"

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
  if (!hasSession) {
    return <TeacherSessionSetupCard />
  }

  if (isLoading) {
    return (
      <TeacherScreen
        title="Schedule"
        subtitle="Teacher mobile keeps a local draft calendar while we validate schedule operations before save-and-notify."
      >
        <TeacherLoadingCard label="Loading teacher schedule" />
      </TeacherScreen>
    )
  }

  if (loadErrorMessage) {
    return (
      <TeacherScreen
        title="Schedule"
        subtitle="Teacher mobile keeps a local draft calendar while we validate schedule operations before save-and-notify."
      >
        <TeacherErrorCard label={loadErrorMessage} />
      </TeacherScreen>
    )
  }

  return (
    <TeacherScreen title="Schedule" subtitle={schedulePreviewMessage}>
      <TeacherCard title={classroomTitle} subtitle={previewTitle}>
        <Text style={styles.bodyText}>{previewMessage}</Text>
        <View style={styles.actionGrid}>
          <TeacherNavAction href={routeLinks.bluetoothCreate} label="Bluetooth Session" />
          <TeacherNavAction href={routeLinks.detail} label="Back To Detail" />
          <TeacherNavAction href={routeLinks.lectures} label="Open Lectures" />
          <Pressable style={styles.secondaryButton} onPress={onDiscardDraft}>
            <Text style={styles.secondaryButtonLabel}>Discard Draft</Text>
          </Pressable>
        </View>
      </TeacherCard>

      <TeacherCard
        title="Calendar Draft"
        subtitle="Add recurring weekly slots and one-off, cancelled, or rescheduled dates before saving."
      >
        <View style={styles.actionGrid}>
          <Pressable style={styles.secondaryButton} onPress={onAddWeeklySlot}>
            <Text style={styles.secondaryButtonLabel}>Add Weekly Slot</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={onAddOneOffException}>
            <Text style={styles.secondaryButtonLabel}>Add One-off</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={onAddCancellation}>
            <Text style={styles.secondaryButtonLabel}>Add Cancellation</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={onAddReschedule}>
            <Text style={styles.secondaryButtonLabel}>Add Reschedule</Text>
          </Pressable>
        </View>
      </TeacherCard>

      <TeacherCard
        title="Weekly Slots"
        subtitle="Recurring slot edits stay local until Save & Notify sends a single batch to the backend."
      >
        {draft?.slots.length ? (
          draft.slots.map((slot) => (
            <View key={slot.localId} style={styles.memberCard}>
              <Text style={styles.listTitle}>
                {slot.existingId ? formatWeekday(slot.weekday) : "New weekly slot"}
              </Text>
              <TextInput
                value={String(slot.weekday)}
                autoCapitalize="none"
                keyboardType="number-pad"
                placeholder="Weekday 1-7"
                onChangeText={(value) =>
                  onUpdateSlot(slot.localId, {
                    weekday: clampInteger(value, slot.weekday, 1, 7),
                  })
                }
                style={styles.input}
              />
              <View style={styles.inputRow}>
                <TextInput
                  value={String(slot.startMinutes)}
                  autoCapitalize="none"
                  keyboardType="number-pad"
                  placeholder="Start minutes"
                  onChangeText={(value) =>
                    onUpdateSlot(slot.localId, {
                      startMinutes: clampInteger(value, slot.startMinutes, 0, 1439),
                    })
                  }
                  style={[styles.input, styles.halfInput]}
                />
                <TextInput
                  value={String(slot.endMinutes)}
                  autoCapitalize="none"
                  keyboardType="number-pad"
                  placeholder="End minutes"
                  onChangeText={(value) =>
                    onUpdateSlot(slot.localId, {
                      endMinutes: clampInteger(value, slot.endMinutes, 1, 1440),
                    })
                  }
                  style={[styles.input, styles.halfInput]}
                />
              </View>
              <TextInput
                value={slot.locationLabel}
                autoCapitalize="sentences"
                placeholder="Location"
                onChangeText={(value) => onUpdateSlot(slot.localId, { locationLabel: value })}
                style={styles.input}
              />
              <Text style={styles.listMeta}>
                Preview: {formatWeekday(slot.weekday)} · {formatMinutes(slot.startMinutes)} -{" "}
                {formatMinutes(slot.endMinutes)} · {slot.status}
              </Text>
              <Pressable style={styles.secondaryButton} onPress={() => onRemoveSlot(slot.localId)}>
                <Text style={styles.secondaryButtonLabel}>
                  {slot.existingId ? "Archive Slot" : "Remove Draft"}
                </Text>
              </Pressable>
            </View>
          ))
        ) : (
          <TeacherEmptyCard label="No recurring weekly schedule slots are available yet." />
        )}
      </TeacherCard>

      <TeacherCard
        title="Date-specific Exceptions"
        subtitle="One-off, cancelled, and rescheduled classes stay in the local draft until Save & Notify is triggered."
      >
        {draft?.exceptions.length ? (
          draft.exceptions.map((exception) => (
            <View key={exception.localId} style={styles.memberCard}>
              <Text style={styles.listTitle}>
                {exception.existingId ? formatEnum(exception.exceptionType) : "New exception"}
              </Text>
              <View style={styles.actionGrid}>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() =>
                    onUpdateException(exception.localId, {
                      exceptionType: "ONE_OFF",
                      scheduleSlotId: null,
                    })
                  }
                >
                  <Text style={styles.secondaryButtonLabel}>One-off</Text>
                </Pressable>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() =>
                    onUpdateException(exception.localId, {
                      exceptionType: "CANCELLED",
                      startMinutes: null,
                      endMinutes: null,
                    })
                  }
                >
                  <Text style={styles.secondaryButtonLabel}>Cancelled</Text>
                </Pressable>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() =>
                    onUpdateException(exception.localId, {
                      exceptionType: "RESCHEDULED",
                    })
                  }
                >
                  <Text style={styles.secondaryButtonLabel}>Rescheduled</Text>
                </Pressable>
              </View>
              <TextInput
                value={exception.effectiveDate}
                autoCapitalize="none"
                placeholder="2026-03-20T00:00:00.000Z"
                onChangeText={(value) =>
                  onUpdateException(exception.localId, {
                    effectiveDate: value,
                  })
                }
                style={styles.input}
              />
              <View style={styles.inputRow}>
                <TextInput
                  value={exception.startMinutes === null ? "" : String(exception.startMinutes)}
                  autoCapitalize="none"
                  keyboardType="number-pad"
                  placeholder="Start minutes"
                  onChangeText={(value) =>
                    onUpdateException(exception.localId, {
                      startMinutes:
                        value.trim().length === 0
                          ? null
                          : clampInteger(value, exception.startMinutes ?? 540, 0, 1439),
                    })
                  }
                  style={[styles.input, styles.halfInput]}
                />
                <TextInput
                  value={exception.endMinutes === null ? "" : String(exception.endMinutes)}
                  autoCapitalize="none"
                  keyboardType="number-pad"
                  placeholder="End minutes"
                  onChangeText={(value) =>
                    onUpdateException(exception.localId, {
                      endMinutes:
                        value.trim().length === 0
                          ? null
                          : clampInteger(value, exception.endMinutes ?? 600, 1, 1440),
                    })
                  }
                  style={[styles.input, styles.halfInput]}
                />
              </View>
              <TextInput
                value={exception.locationLabel}
                autoCapitalize="sentences"
                placeholder="Location"
                onChangeText={(value) =>
                  onUpdateException(exception.localId, { locationLabel: value })
                }
                style={styles.input}
              />
              <TextInput
                value={exception.reason}
                autoCapitalize="sentences"
                placeholder="Reason"
                onChangeText={(value) => onUpdateException(exception.localId, { reason: value })}
                style={styles.input}
              />
              <Text style={styles.listMeta}>
                Preview: {formatEnum(exception.exceptionType)} ·{" "}
                {formatDateTime(exception.effectiveDate)}
                {exception.startMinutes !== null && exception.endMinutes !== null
                  ? ` · ${formatMinutes(exception.startMinutes)} - ${formatMinutes(exception.endMinutes)}`
                  : ""}
              </Text>
            </View>
          ))
        ) : (
          <TeacherEmptyCard label="No schedule exceptions are active right now." />
        )}
      </TeacherCard>

      <TeacherCard
        title="Save & Notify"
        subtitle="The backend validates schedule rules, but teacher mobile keeps local draft changes together until a single save request is sent."
      >
        <TextInput
          value={saveNote}
          autoCapitalize="sentences"
          multiline
          placeholder="Optional note for the schedule change post"
          onChangeText={onSetSaveNote}
          style={[styles.input, styles.multilineInput]}
        />
        <Pressable
          style={styles.primaryButton}
          disabled={isSavePending || !canSave}
          onPress={onSave}
        >
          <Text style={styles.primaryButtonLabel}>
            {isSavePending ? "Saving..." : "Save & Notify"}
          </Text>
        </Pressable>
        {!canSave ? (
          <Text style={styles.listMeta}>No unsaved schedule changes are staged right now.</Text>
        ) : null}
        {saveErrorMessage ? (
          <Text style={styles.errorText}>{mapTeacherApiErrorToMessage(saveErrorMessage)}</Text>
        ) : null}
        {saveMessage ? <Text style={styles.successText}>{saveMessage}</Text> : null}
      </TeacherCard>
    </TeacherScreen>
  )
}
