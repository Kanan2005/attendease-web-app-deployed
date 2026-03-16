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

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: mobileTheme.colors.surface,
  },
  screenContent: {
    paddingHorizontal: mobileTheme.spacing.xl,
    paddingTop: mobileTheme.spacing.xl,
    paddingBottom: mobileTheme.spacing.xxl,
    gap: mobileTheme.spacing.lg,
  },
  headerBlock: {
    gap: mobileTheme.spacing.sm,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: mobileTheme.spacing.lg,
    borderRadius: mobileTheme.radius.card,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    backgroundColor: mobileTheme.colors.surfaceRaised,
    shadowColor: mobileTheme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 18,
    },
    shadowOpacity: 0.08,
    shadowRadius: 28,
  },
  screenTitle: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.typography.hero,
    fontWeight: "800",
  },
  screenSubtitle: {
    color: mobileTheme.colors.textMuted,
    fontSize: mobileTheme.typography.body,
    lineHeight: 24,
  },
  card: {
    backgroundColor: mobileTheme.colors.surfaceRaised,
    borderRadius: mobileTheme.radius.card,
    padding: mobileTheme.spacing.xl,
    gap: mobileTheme.spacing.md,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    shadowColor: mobileTheme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 18,
    },
    shadowOpacity: 0.09,
    shadowRadius: 32,
  },
  cardTitle: {
    color: mobileTheme.colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  cardSubtitle: {
    color: mobileTheme.colors.textMuted,
    fontSize: mobileTheme.typography.bodySmall,
    lineHeight: 22,
  },
  cardBody: {
    gap: 10,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statusBanner: {
    borderRadius: 18,
    padding: 18,
    gap: 6,
    borderWidth: 1,
    shadowColor: mobileTheme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.06,
    shadowRadius: 20,
  },
  statusBannerTitle: {
    color: mobileTheme.colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  primaryStatusBanner: {
    backgroundColor: mobileTheme.colors.surfaceHero,
    borderColor: mobileTheme.colors.borderStrong,
  },
  successStatusBanner: {
    backgroundColor: mobileTheme.colors.successSoft,
    borderColor: mobileTheme.colors.successBorder,
  },
  warningStatusBanner: {
    backgroundColor: mobileTheme.colors.warningSoft,
    borderColor: mobileTheme.colors.warningBorder,
  },
  dangerStatusBanner: {
    backgroundColor: mobileTheme.colors.dangerSoft,
    borderColor: mobileTheme.colors.dangerBorder,
  },
  navButton: {
    borderRadius: mobileTheme.radius.button,
    backgroundColor: mobileTheme.colors.surfaceRaised,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: mobileTheme.spacing.md,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  primaryNavButton: {
    borderRadius: mobileTheme.radius.button,
    backgroundColor: mobileTheme.colors.primary,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: mobileTheme.spacing.md,
    borderWidth: 1,
    borderColor: mobileTheme.colors.primary,
  },
  navButtonLabel: {
    color: mobileTheme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  primaryNavButtonLabel: {
    color: mobileTheme.colors.primaryContrast,
    fontSize: 14,
    fontWeight: "700",
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    minWidth: "47%",
    flexGrow: 1,
    borderRadius: 20,
    backgroundColor: mobileTheme.colors.surfaceTint,
    padding: mobileTheme.spacing.md,
    gap: 6,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  metricLabel: {
    color: mobileTheme.colors.textSubtle,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  primaryTone: {
    color: mobileTheme.colors.primary,
  },
  successTone: {
    color: mobileTheme.colors.success,
  },
  warningTone: {
    color: mobileTheme.colors.warning,
  },
  dangerTone: {
    color: mobileTheme.colors.danger,
  },
  listRow: {
    gap: 4,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: mobileTheme.colors.border,
  },
  linkRow: {
    gap: 4,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: mobileTheme.colors.border,
  },
  highlightCard: {
    gap: 6,
    borderRadius: 20,
    backgroundColor: mobileTheme.colors.surfaceTint,
    padding: mobileTheme.spacing.md,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  selectedRow: {
    borderRadius: 14,
    backgroundColor: mobileTheme.colors.accentSoft,
    paddingHorizontal: 12,
  },
  memberCard: {
    gap: 6,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: mobileTheme.colors.border,
  },
  listTitle: {
    color: mobileTheme.colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  listMeta: {
    color: mobileTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTitle: {
    color: mobileTheme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  sessionSection: {
    gap: 10,
    marginTop: 8,
  },
  sessionStudentCard: {
    gap: 6,
    borderRadius: 20,
    backgroundColor: mobileTheme.colors.surfaceTint,
    padding: mobileTheme.spacing.md,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  sessionStudentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  primaryChip: {
    backgroundColor: mobileTheme.colors.surfaceHero,
  },
  successChip: {
    backgroundColor: mobileTheme.colors.successSoft,
  },
  warningChip: {
    backgroundColor: mobileTheme.colors.warningSoft,
  },
  dangerChip: {
    backgroundColor: mobileTheme.colors.dangerSoft,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: mobileTheme.colors.text,
  },
  pendingText: {
    color: mobileTheme.colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  bodyText: {
    color: mobileTheme.colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  fieldLabel: {
    color: mobileTheme.colors.text,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  optionGrid: {
    gap: 10,
  },
  selectionCard: {
    gap: 6,
    borderRadius: 20,
    backgroundColor: mobileTheme.colors.surfaceRaised,
    padding: mobileTheme.spacing.md,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  selectionCardActive: {
    backgroundColor: mobileTheme.colors.accentSoft,
    borderColor: mobileTheme.colors.accent,
  },
  input: {
    borderWidth: 1,
    borderColor: mobileTheme.colors.borderStrong,
    borderRadius: mobileTheme.radius.button,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: mobileTheme.spacing.md,
    backgroundColor: mobileTheme.colors.surfaceRaised,
    color: mobileTheme.colors.text,
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
  },
  halfInput: {
    flex: 1,
  },
  multilineInput: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  primaryButton: {
    borderRadius: mobileTheme.radius.button,
    backgroundColor: mobileTheme.colors.primary,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: 15,
    alignItems: "center",
  },
  primaryButtonLabel: {
    color: mobileTheme.colors.primaryContrast,
    fontSize: 15,
    fontWeight: "700",
  },
  dangerButton: {
    borderRadius: mobileTheme.radius.button,
    backgroundColor: mobileTheme.colors.danger,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: 15,
    alignItems: "center",
  },
  secondaryButton: {
    borderRadius: mobileTheme.radius.button,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    backgroundColor: mobileTheme.colors.surfaceRaised,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: 15,
    alignItems: "center",
  },
  secondaryButtonLabel: {
    color: mobileTheme.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  selectedActionButton: {
    borderColor: mobileTheme.colors.accent,
    backgroundColor: mobileTheme.colors.accentSoft,
  },
  disabledButton: {
    opacity: 0.55,
  },
  disabledSecondaryButton: {
    opacity: 0.55,
  },
  statusCard: {
    borderRadius: 20,
    padding: mobileTheme.spacing.lg,
    backgroundColor: mobileTheme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    gap: 8,
    alignItems: "flex-start",
  },
  statusText: {
    color: mobileTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  errorCard: {
    borderColor: mobileTheme.colors.dangerBorder,
    backgroundColor: mobileTheme.colors.dangerSoft,
  },
  emptyCard: {
    borderColor: mobileTheme.colors.border,
    backgroundColor: mobileTheme.colors.surfaceTint,
  },
  errorText: {
    color: mobileTheme.colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  successText: {
    color: mobileTheme.colors.success,
    fontSize: 14,
    lineHeight: 20,
  },
})
