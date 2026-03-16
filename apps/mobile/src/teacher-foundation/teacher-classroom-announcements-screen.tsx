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

export function TeacherClassroomAnnouncementsScreen(props: { classroomId: string }) {
  const { session } = useTeacherSession()
  const classroom = useTeacherClassroomDetailData(props.classroomId)
  const announcementMutation = useTeacherCreateAnnouncementMutation(props.classroomId)
  const classroomContext = teacherRoutes.classroomContext(props.classroomId)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [visibility, setVisibility] = useState<"TEACHER_ONLY" | "STUDENT_AND_TEACHER">(
    "TEACHER_ONLY",
  )
  const [shouldNotify, setShouldNotify] = useState(false)

  return (
    <TeacherScreen
      title="Announcements"
      subtitle="Teacher mobile can already read and create classroom stream posts through the live backend."
    >
      {!session ? (
        <TeacherSessionSetupCard />
      ) : classroom.detailQuery.isLoading || classroom.announcementsQuery.isLoading ? (
        <TeacherLoadingCard label="Loading classroom stream" />
      ) : classroom.detailQuery.error || classroom.announcementsQuery.error ? (
        <TeacherErrorCard
          label={mapTeacherApiErrorToMessage(
            classroom.detailQuery.error ?? classroom.announcementsQuery.error,
          )}
        />
      ) : (
        <>
          <TeacherCard
            title={classroom.detailQuery.data?.displayTitle ?? "Classroom"}
            subtitle="Teacher-only and student-visible posts share the same classroom stream route."
          >
            <View style={styles.actionGrid}>
              <TeacherNavAction href={classroomContext.detail} label="Back To Detail" />
              <TeacherNavAction href={classroomContext.roster} label="Open Roster" />
            </View>
          </TeacherCard>

          <TeacherCard
            title="Post Announcement"
            subtitle="Student-visible posts can also request notification fan-out through the backend abstraction."
          >
            <TextInput
              value={title}
              autoCapitalize="sentences"
              placeholder="Optional title"
              onChangeText={setTitle}
              style={styles.input}
            />
            <TextInput
              value={body}
              autoCapitalize="sentences"
              multiline
              placeholder="Announcement body"
              onChangeText={setBody}
              style={[styles.input, styles.multilineInput]}
            />
            <View style={styles.actionGrid}>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setVisibility("TEACHER_ONLY")}
              >
                <Text style={styles.secondaryButtonLabel}>Teacher Only</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setVisibility("STUDENT_AND_TEACHER")}
              >
                <Text style={styles.secondaryButtonLabel}>Student Visible</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setShouldNotify((currentValue) => !currentValue)}
              >
                <Text style={styles.secondaryButtonLabel}>
                  Notify: {shouldNotify ? "On" : "Off"}
                </Text>
              </Pressable>
            </View>
            <Pressable
              style={styles.primaryButton}
              disabled={announcementMutation.isPending || body.trim().length === 0}
              onPress={() =>
                announcementMutation.mutate(
                  {
                    title,
                    body,
                    visibility,
                    shouldNotify,
                  },
                  {
                    onSuccess: () => {
                      setTitle("")
                      setBody("")
                      setVisibility("TEACHER_ONLY")
                      setShouldNotify(false)
                    },
                  },
                )
              }
            >
              <Text style={styles.primaryButtonLabel}>
                {announcementMutation.isPending ? "Posting..." : "Post Announcement"}
              </Text>
            </Pressable>
            {announcementMutation.error ? (
              <Text style={styles.errorText}>
                {mapTeacherApiErrorToMessage(announcementMutation.error)}
              </Text>
            ) : null}
          </TeacherCard>

          <TeacherCard
            title="Announcement Feed"
            subtitle="Teacher mobile sees both operational and student-visible posts."
          >
            {classroom.announcementsQuery.data?.length ? (
              classroom.announcementsQuery.data.map((announcement) => (
                <View key={announcement.id} style={styles.listRow}>
                  <Text style={styles.listTitle}>
                    {announcement.title ?? formatEnum(announcement.postType)}
                  </Text>
                  <Text style={styles.listMeta}>
                    {announcement.authorDisplayName} · {formatEnum(announcement.visibility)} ·{" "}
                    {formatDateTime(announcement.createdAt)}
                  </Text>
                  <Text style={styles.bodyText}>{announcement.body}</Text>
                </View>
              ))
            ) : (
              <TeacherEmptyCard label="No classroom announcements are available yet." />
            )}
          </TeacherCard>
        </>
      )}
    </TeacherScreen>
  )
}
