import { createAuthApiClient } from "@attendease/auth"
import { loadMobileEnv } from "@attendease/config"
import type {
  AttendanceSessionDetail,
  AttendanceSessionStudentSummary,
  ClassroomDetail,
  ClassroomRosterListQuery,
  ClassroomRosterMemberSummary,
  ExportJobType,
  LectureSummary,
  TeacherReportFilters,
} from "@attendease/contracts"
import {
  buildAttendanceCorrectionSaveMessage,
  buildAttendanceEditChanges,
  createAttendanceEditDraft,
  getAttendanceCorrectionReviewPollInterval,
  updateAttendanceEditDraft,
} from "@attendease/domain"
import { mobileTheme } from "@attendease/ui-mobile"
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"

import { buildTeacherSchedulingPreview } from "../academic-management"
import {
  getMobileAttendanceListPollInterval,
  getMobileAttendanceSessionPollInterval,
} from "../attendance-live"
import {
  useTeacherBluetoothAdvertiser,
  useTeacherBluetoothRuntime,
  useTeacherBluetoothSessionCreateMutation,
  useTeacherBluetoothSessionQuery,
} from "../bluetooth-attendance"
import { buildTeacherRosterImportPreview } from "../classroom-communications"
import { mobileEntryRoutes } from "../mobile-entry-models"
import {
  buildTeacherClassroomCreateRequest,
  buildTeacherClassroomScopeOptions,
  buildTeacherClassroomScopeSummary,
  buildTeacherClassroomSupportingText,
  buildTeacherClassroomUpdateRequest,
  createTeacherClassroomCreateDraft,
  createTeacherClassroomEditDraft,
  hasTeacherClassroomEditChanges,
} from "../teacher-classroom-management"
import {
  type TeacherCardTone,
  type TeacherDashboardActionModel,
  buildTeacherDashboardModel,
  buildTeacherRecentSessionTimeline,
  buildTeacherSessionHistoryPreview,
  mapTeacherApiErrorToMessage,
} from "../teacher-models"
import {
  type TeacherSessionRosterRowModel,
  buildTeacherBluetoothActiveStatusModel,
  buildTeacherBluetoothCandidates,
  buildTeacherBluetoothControlModel,
  buildTeacherBluetoothEndSessionModel,
  buildTeacherBluetoothRecoveryModel,
  buildTeacherBluetoothSessionShellSnapshot,
  buildTeacherBluetoothSetupStatusModel,
  buildTeacherExportAvailabilityModel,
  buildTeacherExportRequestModel,
  buildTeacherJoinCodeActionModel,
  buildTeacherReportFilterOptions,
  buildTeacherReportOverviewModel,
  buildTeacherRosterImportDraftModel,
  buildTeacherSessionDetailOverviewModel,
  buildTeacherSessionDetailStatusModel,
  buildTeacherSessionRosterModel,
} from "../teacher-operational"
import {
  buildTeacherInvalidationKeys,
  invalidateTeacherExperienceQueries,
  teacherQueryKeys,
} from "../teacher-query"
import {
  type TeacherRosterStatusFilter,
  buildTeacherRosterAddRequest,
  buildTeacherRosterFilters,
  buildTeacherRosterMemberActions,
  buildTeacherRosterMemberIdentityText,
  buildTeacherRosterResultSummary,
  teacherRosterStatusFilters,
} from "../teacher-roster-management"
import { teacherRoutes } from "../teacher-routes"
import {
  type TeacherScheduleDraft,
  addTeacherScheduleExceptionDraft,
  addTeacherWeeklySlotDraft,
  buildTeacherScheduleSaveRequest,
  createTeacherScheduleDraft,
  removeTeacherWeeklySlotDraft,
  updateTeacherScheduleExceptionDraft,
  updateTeacherWeeklySlotDraft,
} from "../teacher-schedule-draft"
import {
  buildTeacherLoginRequest,
  getTeacherAccessToken,
  useTeacherSession,
} from "../teacher-session"
import {
  buildTeacherClassroomsStatus,
  buildTeacherDashboardStatus,
  buildTeacherReportsStatus,
  buildTeacherRosterStatus,
  buildTeacherSessionHistoryStatus,
} from "../teacher-view-state"

import {
  useTeacherAddRosterMemberMutation,
  useTeacherApplyRosterImportMutation,
  useTeacherArchiveClassroomMutation,
  useTeacherAssignmentsQuery,
  useTeacherAttendanceSessionDetailQuery,
  useTeacherAttendanceSessionStudentsQuery,
  useTeacherAttendanceSessionsQuery,
  useTeacherBluetoothCandidates,
  useTeacherClassroomDetailData,
  useTeacherClassroomsQuery,
  useTeacherCreateAnnouncementMutation,
  useTeacherCreateClassroomMutation,
  useTeacherCreateExportJobMutation,
  useTeacherCreateLectureMutation,
  useTeacherCreateRosterImportMutation,
  useTeacherDashboardData,
  useTeacherExportAvailability,
  useTeacherExportJobsQuery,
  useTeacherFilteredReportsData,
  useTeacherResetJoinCodeMutation,
  useTeacherSaveScheduleMutation,
  useTeacherUpdateAttendanceSessionMutation,
  useTeacherUpdateClassroomMutation,
  useTeacherUpdateRosterMemberMutation,
} from "./queries"
import {
  TeacherCard,
  TeacherEmptyCard,
  TeacherErrorCard,
  TeacherLoadingCard,
  TeacherNavAction,
  TeacherScreen,
  TeacherSessionSetupCard,
  TeacherStatusBanner,
  clampInteger,
  formatDateTime,
  formatEnum,
  formatMinutes,
  formatWeekday,
  resolveTeacherDashboardActionHref,
  statusCardToneStyle,
  styles,
  toneColorStyle,
} from "./shared-ui"

export function TeacherClassroomScheduleScreen(props: { classroomId: string }) {
  const { session } = useTeacherSession()
  const classroom = useTeacherClassroomDetailData(props.classroomId)
  const saveScheduleMutation = useTeacherSaveScheduleMutation(props.classroomId)
  const preview = buildTeacherSchedulingPreview({
    classroomCount: classroom.detailQuery.data ? 1 : 0,
    slotCount: classroom.scheduleQuery.data?.scheduleSlots.length ?? 0,
    exceptionCount: classroom.scheduleQuery.data?.scheduleExceptions.length ?? 0,
    lectureCount: classroom.lecturesQuery.data?.length ?? 0,
  })
  const [draft, setDraft] = useState<TeacherScheduleDraft | null>(null)
  const [scheduleNote, setScheduleNote] = useState("")
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null)
  const classroomContext = teacherRoutes.classroomContext(props.classroomId)

  useEffect(() => {
    if (classroom.scheduleQuery.data && draft === null) {
      setDraft(createTeacherScheduleDraft(classroom.scheduleQuery.data))
    }
  }, [classroom.scheduleQuery.data, draft])

  const saveRequest =
    classroom.scheduleQuery.data && draft
      ? buildTeacherScheduleSaveRequest({
          original: classroom.scheduleQuery.data,
          draft,
          note: scheduleNote,
        })
      : null

  return (
    <TeacherScreen
      title="Schedule"
      subtitle="Teacher mobile now keeps a local draft calendar flow on top of the live schedule API so weekly and date-specific changes can be reviewed before save-and-notify."
    >
      {!session ? (
        <TeacherSessionSetupCard />
      ) : classroom.detailQuery.isLoading ||
        classroom.scheduleQuery.isLoading ||
        classroom.lecturesQuery.isLoading ? (
        <TeacherLoadingCard label="Loading teacher schedule" />
      ) : classroom.detailQuery.error ||
        classroom.scheduleQuery.error ||
        classroom.lecturesQuery.error ? (
        <TeacherErrorCard
          label={mapTeacherApiErrorToMessage(
            classroom.detailQuery.error ??
              classroom.scheduleQuery.error ??
              classroom.lecturesQuery.error,
          )}
        />
      ) : (
        <>
          <TeacherCard
            title={classroom.detailQuery.data?.displayTitle ?? "Classroom"}
            subtitle={preview.title}
          >
            <Text style={styles.bodyText}>{preview.message}</Text>
            <View style={styles.actionGrid}>
              <TeacherNavAction href={classroomContext.bluetoothCreate} label="Bluetooth Session" />
              <TeacherNavAction href={classroomContext.detail} label="Back To Detail" />
              <TeacherNavAction href={classroomContext.lectures} label="Open Lectures" />
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  if (classroom.scheduleQuery.data) {
                    setDraft(createTeacherScheduleDraft(classroom.scheduleQuery.data))
                    setScheduleNote("")
                    setScheduleMessage("Draft reset to the live classroom schedule.")
                  }
                }}
              >
                <Text style={styles.secondaryButtonLabel}>Discard Draft</Text>
              </Pressable>
            </View>
          </TeacherCard>

          <TeacherCard
            title="Calendar Draft"
            subtitle="Add recurring weekly slots and one-off, cancelled, or rescheduled dates before saving the classroom calendar."
          >
            <View style={styles.actionGrid}>
              <Pressable
                style={styles.secondaryButton}
                onPress={() =>
                  setDraft((currentDraft) =>
                    currentDraft ? addTeacherWeeklySlotDraft(currentDraft) : currentDraft,
                  )
                }
              >
                <Text style={styles.secondaryButtonLabel}>Add Weekly Slot</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={() =>
                  setDraft((currentDraft) =>
                    currentDraft
                      ? addTeacherScheduleExceptionDraft(currentDraft, {
                          exceptionType: "ONE_OFF",
                        })
                      : currentDraft,
                  )
                }
              >
                <Text style={styles.secondaryButtonLabel}>Add One-off</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={() =>
                  setDraft((currentDraft) =>
                    currentDraft
                      ? addTeacherScheduleExceptionDraft(currentDraft, {
                          exceptionType: "CANCELLED",
                          startMinutes: null,
                          endMinutes: null,
                        })
                      : currentDraft,
                  )
                }
              >
                <Text style={styles.secondaryButtonLabel}>Add Cancellation</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={() =>
                  setDraft((currentDraft) =>
                    currentDraft
                      ? addTeacherScheduleExceptionDraft(currentDraft, {
                          exceptionType: "RESCHEDULED",
                        })
                      : currentDraft,
                  )
                }
              >
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
                      setDraft((currentDraft) =>
                        currentDraft
                          ? updateTeacherWeeklySlotDraft(currentDraft, slot.localId, {
                              weekday: clampInteger(value, slot.weekday, 1, 7),
                            })
                          : currentDraft,
                      )
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
                        setDraft((currentDraft) =>
                          currentDraft
                            ? updateTeacherWeeklySlotDraft(currentDraft, slot.localId, {
                                startMinutes: clampInteger(value, slot.startMinutes, 0, 1439),
                              })
                            : currentDraft,
                        )
                      }
                      style={[styles.input, styles.halfInput]}
                    />
                    <TextInput
                      value={String(slot.endMinutes)}
                      autoCapitalize="none"
                      keyboardType="number-pad"
                      placeholder="End minutes"
                      onChangeText={(value) =>
                        setDraft((currentDraft) =>
                          currentDraft
                            ? updateTeacherWeeklySlotDraft(currentDraft, slot.localId, {
                                endMinutes: clampInteger(value, slot.endMinutes, 1, 1440),
                              })
                            : currentDraft,
                        )
                      }
                      style={[styles.input, styles.halfInput]}
                    />
                  </View>
                  <TextInput
                    value={slot.locationLabel}
                    autoCapitalize="sentences"
                    placeholder="Location"
                    onChangeText={(value) =>
                      setDraft((currentDraft) =>
                        currentDraft
                          ? updateTeacherWeeklySlotDraft(currentDraft, slot.localId, {
                              locationLabel: value,
                            })
                          : currentDraft,
                      )
                    }
                    style={styles.input}
                  />
                  <Text style={styles.listMeta}>
                    Preview: {formatWeekday(slot.weekday)} · {formatMinutes(slot.startMinutes)} -{" "}
                    {formatMinutes(slot.endMinutes)} · {slot.status}
                  </Text>
                  <Pressable
                    style={styles.secondaryButton}
                    onPress={() =>
                      setDraft((currentDraft) =>
                        currentDraft
                          ? removeTeacherWeeklySlotDraft(currentDraft, slot.localId)
                          : currentDraft,
                      )
                    }
                  >
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
                        setDraft((currentDraft) =>
                          currentDraft
                            ? updateTeacherScheduleExceptionDraft(currentDraft, exception.localId, {
                                exceptionType: "ONE_OFF",
                                scheduleSlotId: null,
                              })
                            : currentDraft,
                        )
                      }
                    >
                      <Text style={styles.secondaryButtonLabel}>One-off</Text>
                    </Pressable>
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={() =>
                        setDraft((currentDraft) =>
                          currentDraft
                            ? updateTeacherScheduleExceptionDraft(currentDraft, exception.localId, {
                                exceptionType: "CANCELLED",
                                startMinutes: null,
                                endMinutes: null,
                              })
                            : currentDraft,
                        )
                      }
                    >
                      <Text style={styles.secondaryButtonLabel}>Cancelled</Text>
                    </Pressable>
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={() =>
                        setDraft((currentDraft) =>
                          currentDraft
                            ? updateTeacherScheduleExceptionDraft(currentDraft, exception.localId, {
                                exceptionType: "RESCHEDULED",
                              })
                            : currentDraft,
                        )
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
                      setDraft((currentDraft) =>
                        currentDraft
                          ? updateTeacherScheduleExceptionDraft(currentDraft, exception.localId, {
                              effectiveDate: value,
                            })
                          : currentDraft,
                      )
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
                        setDraft((currentDraft) =>
                          currentDraft
                            ? updateTeacherScheduleExceptionDraft(currentDraft, exception.localId, {
                                startMinutes:
                                  value.trim().length === 0
                                    ? null
                                    : clampInteger(value, exception.startMinutes ?? 540, 0, 1439),
                              })
                            : currentDraft,
                        )
                      }
                      style={[styles.input, styles.halfInput]}
                    />
                    <TextInput
                      value={exception.endMinutes === null ? "" : String(exception.endMinutes)}
                      autoCapitalize="none"
                      keyboardType="number-pad"
                      placeholder="End minutes"
                      onChangeText={(value) =>
                        setDraft((currentDraft) =>
                          currentDraft
                            ? updateTeacherScheduleExceptionDraft(currentDraft, exception.localId, {
                                endMinutes:
                                  value.trim().length === 0
                                    ? null
                                    : clampInteger(value, exception.endMinutes ?? 600, 1, 1440),
                              })
                            : currentDraft,
                        )
                      }
                      style={[styles.input, styles.halfInput]}
                    />
                  </View>
                  <TextInput
                    value={exception.locationLabel}
                    autoCapitalize="sentences"
                    placeholder="Location"
                    onChangeText={(value) =>
                      setDraft((currentDraft) =>
                        currentDraft
                          ? updateTeacherScheduleExceptionDraft(currentDraft, exception.localId, {
                              locationLabel: value,
                            })
                          : currentDraft,
                      )
                    }
                    style={styles.input}
                  />
                  <TextInput
                    value={exception.reason}
                    autoCapitalize="sentences"
                    placeholder="Reason"
                    onChangeText={(value) =>
                      setDraft((currentDraft) =>
                        currentDraft
                          ? updateTeacherScheduleExceptionDraft(currentDraft, exception.localId, {
                              reason: value,
                            })
                          : currentDraft,
                      )
                    }
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
            subtitle="The backend still validates schedule rules, but mobile now keeps local draft changes together until a single save request is sent."
          >
            <TextInput
              value={scheduleNote}
              autoCapitalize="sentences"
              multiline
              placeholder="Optional note for the schedule change post"
              onChangeText={setScheduleNote}
              style={[styles.input, styles.multilineInput]}
            />
            <Pressable
              style={styles.primaryButton}
              disabled={saveScheduleMutation.isPending || !saveRequest}
              onPress={() => {
                if (!saveRequest) {
                  return
                }

                setScheduleMessage(null)
                saveScheduleMutation.mutate(saveRequest, {
                  onSuccess: (nextSchedule) => {
                    setDraft(createTeacherScheduleDraft(nextSchedule))
                    setScheduleNote("")
                    setScheduleMessage(
                      "Saved classroom calendar changes and triggered notify flow.",
                    )
                  },
                })
              }}
            >
              <Text style={styles.primaryButtonLabel}>
                {saveScheduleMutation.isPending ? "Saving..." : "Save & Notify"}
              </Text>
            </Pressable>
            {!saveRequest ? (
              <Text style={styles.listMeta}>No unsaved schedule changes are staged right now.</Text>
            ) : null}
            {saveScheduleMutation.error ? (
              <Text style={styles.errorText}>
                {mapTeacherApiErrorToMessage(saveScheduleMutation.error)}
              </Text>
            ) : null}
            {scheduleMessage ? <Text style={styles.successText}>{scheduleMessage}</Text> : null}
          </TeacherCard>
        </>
      )}
    </TeacherScreen>
  )
}
