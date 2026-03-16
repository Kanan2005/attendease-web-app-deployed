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

export function TeacherClassroomLecturesScreen(props: { classroomId: string }) {
  const { session } = useTeacherSession()
  const classroom = useTeacherClassroomDetailData(props.classroomId)
  const lectureMutation = useTeacherCreateLectureMutation(props.classroomId)
  const classroomContext = teacherRoutes.classroomContext(props.classroomId)
  const [title, setTitle] = useState("")
  const [lectureDate, setLectureDate] = useState("2026-03-14T09:00:00.000Z")

  return (
    <TeacherScreen
      title="Lectures"
      subtitle="Teacher mobile already reads and creates classroom lectures through the current academic backend."
    >
      {!session ? (
        <TeacherSessionSetupCard />
      ) : classroom.detailQuery.isLoading || classroom.lecturesQuery.isLoading ? (
        <TeacherLoadingCard label="Loading classroom lectures" />
      ) : classroom.detailQuery.error || classroom.lecturesQuery.error ? (
        <TeacherErrorCard
          label={mapTeacherApiErrorToMessage(
            classroom.detailQuery.error ?? classroom.lecturesQuery.error,
          )}
        />
      ) : (
        <>
          <TeacherCard
            title={classroom.detailQuery.data?.displayTitle ?? "Classroom"}
            subtitle="Lecture creation stays close to schedule context so later attendance sessions can reuse the same lecture links."
          >
            <View style={styles.actionGrid}>
              <TeacherNavAction href={classroomContext.detail} label="Back To Detail" />
              <TeacherNavAction href={classroomContext.schedule} label="Open Schedule" />
            </View>
          </TeacherCard>

          <TeacherCard
            title="Create Lecture"
            subtitle="The full calendar editor remains richer on web, but mobile can already add lectures against the live backend."
          >
            <TextInput
              value={title}
              autoCapitalize="sentences"
              placeholder="Lecture title"
              onChangeText={setTitle}
              style={styles.input}
            />
            <TextInput
              value={lectureDate}
              autoCapitalize="none"
              placeholder="2026-03-14T09:00:00.000Z"
              onChangeText={setLectureDate}
              style={styles.input}
            />
            <Pressable
              style={styles.primaryButton}
              disabled={lectureMutation.isPending || lectureDate.trim().length < 10}
              onPress={() =>
                lectureMutation.mutate(
                  {
                    title,
                    lectureDate,
                  },
                  {
                    onSuccess: () => {
                      setTitle("")
                    },
                  },
                )
              }
            >
              <Text style={styles.primaryButtonLabel}>
                {lectureMutation.isPending ? "Creating..." : "Create Lecture"}
              </Text>
            </Pressable>
            {lectureMutation.error ? (
              <Text style={styles.errorText}>
                {mapTeacherApiErrorToMessage(lectureMutation.error)}
              </Text>
            ) : null}
          </TeacherCard>

          <TeacherCard
            title="Lecture List"
            subtitle="Later attendance session routes will attach directly to these lecture records where possible."
          >
            {classroom.lecturesQuery.data?.length ? (
              classroom.lecturesQuery.data.map((lecture) => (
                <View key={lecture.id} style={styles.listRow}>
                  <Text style={styles.listTitle}>{lecture.title ?? "Scheduled lecture"}</Text>
                  <Text style={styles.listMeta}>
                    {formatDateTime(
                      lecture.actualStartAt ?? lecture.plannedStartAt ?? lecture.lectureDate,
                    )}{" "}
                    · {formatEnum(lecture.status)}
                  </Text>
                </View>
              ))
            ) : (
              <TeacherEmptyCard label="No lectures are linked to this classroom yet." />
            )}
          </TeacherCard>
        </>
      )}
    </TeacherScreen>
  )
}
