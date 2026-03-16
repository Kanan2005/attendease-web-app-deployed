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
import { styles } from "./styles"

export function TeacherScreen(props: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerBlock}>
        <Text style={styles.screenTitle}>{props.title}</Text>
        <Text style={styles.screenSubtitle}>{props.subtitle}</Text>
      </View>
      {props.children}
    </ScrollView>
  )
}

export function resolveTeacherDashboardActionHref(
  action: TeacherDashboardActionModel,
  firstClassroomContext?: ReturnType<typeof teacherRoutes.classroomContext> | null,
) {
  switch (action.kind) {
    case "ACTIVE_SESSION":
      return action.sessionId
        ? teacherRoutes.sessionDetail(action.sessionId)
        : teacherRoutes.sessionHistory
    case "BLUETOOTH":
      return firstClassroomContext?.bluetoothCreate ?? teacherRoutes.bluetoothCreate
    case "CLASSROOMS":
      return teacherRoutes.classrooms
    case "REPORTS":
      return teacherRoutes.reports
    case "EXPORTS":
      return teacherRoutes.exports
    default:
      return teacherRoutes.sessionHistory
  }
}

export function TeacherStatusBanner(props: {
  status: {
    tone: "primary" | "success" | "warning" | "danger"
    title: string
    message: string
  }
}) {
  return (
    <View style={[styles.statusBanner, statusCardToneStyle(props.status.tone)]}>
      <Text style={styles.statusBannerTitle}>{props.status.title}</Text>
      <Text style={styles.statusText}>{props.status.message}</Text>
    </View>
  )
}

export function TeacherNavAction(props: {
  href:
    | string
    | {
        pathname: string
        params?: Record<string, string>
      }
  label: string
  variant?: "primary" | "secondary"
}) {
  return (
    <Link href={props.href} asChild>
      <Pressable style={props.variant === "primary" ? styles.primaryNavButton : styles.navButton}>
        <Text
          style={props.variant === "primary" ? styles.primaryNavButtonLabel : styles.navButtonLabel}
        >
          {props.label}
        </Text>
      </Pressable>
    </Link>
  )
}

export function TeacherCard(props: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{props.title}</Text>
      {props.subtitle ? <Text style={styles.cardSubtitle}>{props.subtitle}</Text> : null}
      <View style={styles.cardBody}>{props.children}</View>
    </View>
  )
}

export function TeacherLoadingCard(props: { label: string }) {
  return (
    <View style={styles.statusCard}>
      <ActivityIndicator color={mobileTheme.colors.primary} />
      <Text style={styles.statusText}>{props.label}</Text>
    </View>
  )
}

export function TeacherErrorCard(props: { label: string }) {
  return (
    <View style={[styles.statusCard, styles.errorCard]}>
      <Text style={styles.errorText}>{props.label}</Text>
    </View>
  )
}

export function TeacherEmptyCard(props: { label: string }) {
  return (
    <View style={[styles.statusCard, styles.emptyCard]}>
      <Text style={styles.statusText}>{props.label}</Text>
    </View>
  )
}

export function TeacherSessionSetupCard() {
  return (
    <TeacherCard
      title="Teacher sign in required"
      subtitle="Sign in to open classrooms, Bluetooth attendance, session history, reports, and exports."
    >
      <Link href={mobileEntryRoutes.teacherSignIn} asChild>
        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryButtonLabel}>Open teacher sign in</Text>
        </Pressable>
      </Link>
    </TeacherCard>
  )
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  const normalizedHours = hours % 12 === 0 ? 12 : hours % 12
  const meridiem = hours >= 12 ? "PM" : "AM"

  return `${normalizedHours}:${remainingMinutes.toString().padStart(2, "0")} ${meridiem}`
}

export function formatWeekday(weekday: number) {
  return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][weekday - 1]
}

export function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((segment) => `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`)
    .join(" ")
}

export function toneColorStyle(tone: TeacherCardTone) {
  switch (tone) {
    case "success":
      return styles.successTone
    case "warning":
      return styles.warningTone
    case "danger":
      return styles.dangerTone
    default:
      return styles.primaryTone
  }
}

export function statusCardToneStyle(tone: TeacherCardTone) {
  switch (tone) {
    case "success":
      return styles.successStatusBanner
    case "warning":
      return styles.warningStatusBanner
    case "danger":
      return styles.dangerStatusBanner
    default:
      return styles.primaryStatusBanner
  }
}

export function clampInteger(value: string, fallback: number, minimum: number, maximum: number) {
  const parsed = Number.parseInt(value, 10)

  if (Number.isNaN(parsed)) {
    return fallback
  }

  return Math.min(Math.max(parsed, minimum), maximum)
}

export { styles } from "./styles"
