import { createAuthApiClient } from "@attendease/auth"
import { loadMobileEnv } from "@attendease/config"
import type { AttendanceMode, TrustedDeviceAttendanceReadyResponse } from "@attendease/contracts"
import { mobileTheme } from "@attendease/ui-mobile"
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "expo-router"
import { useEffect, useState } from "react"
import type { ComponentType, ReactNode } from "react"
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"

import { getMobileAttendanceListPollInterval } from "../attendance-live"
import {
  buildStudentBluetoothDetectionBanner,
  buildStudentBluetoothScannerBanner,
  buildStudentBluetoothSubmissionBanner,
  describeBluetoothSignalStrength,
  mapBluetoothAvailabilityToPermissionState,
  resolveSelectedBluetoothDetection,
  usePreferredBluetoothDetection,
  useStudentBluetoothMarkAttendanceMutation,
  useStudentBluetoothScanner,
} from "../bluetooth-attendance"
import { buildStudentAttendanceGateModel, createMobileDeviceTrustBootstrap } from "../device-trust"
import { mobileEntryRoutes } from "../mobile-entry-models"
import {
  type StudentAttendancePermissionState,
  type StudentQrLocationSnapshot,
  type StudentQrLocationState,
  buildStudentAttendanceControllerSnapshot,
  buildStudentBluetoothAttendanceErrorBanner,
  buildStudentBluetoothMarkRequest,
  buildStudentQrAttendanceErrorBanner,
  buildStudentQrLocationBanner,
  buildStudentQrMarkRequest,
  buildStudentQrScanBanner,
  resolveStudentQrCameraPermissionState,
  studentAttendancePermissionStateValues,
} from "../student-attendance"
import {
  type CardTone,
  type StudentDashboardActionModel,
  type buildStudentDashboardModel,
  buildStudentLectureTimeline,
  mapStudentApiErrorToMessage,
} from "../student-models"
import {
  buildStudentInvalidationKeys,
  invalidateStudentExperienceQueries,
  requireStudentAccessToken,
  studentQueryKeys,
  useStudentRefreshAction,
} from "../student-query"
import { studentRoutes } from "../student-routes"
import { useStudentSession } from "../student-session"
import {
  type StudentScreenStatus,
  buildStudentAttendanceRefreshStatus,
  buildStudentDashboardStatus,
  buildStudentHistoryRefreshStatus,
  buildStudentJoinBanner,
  buildStudentReportsStatus,
} from "../student-view-state"
import {
  type StudentAttendanceCandidate,
  type StudentProfileDraft,
  buildStudentAttendanceCandidates,
  buildStudentAttendanceHistoryRows,
  buildStudentAttendanceHistorySummaryModel,
  buildStudentAttendanceInsightModel,
  buildStudentAttendanceOverviewModel,
  buildStudentClassroomDetailSummaryModel,
  buildStudentCourseDiscoveryCards,
  buildStudentDeviceStatusSummaryModel,
  buildStudentReportOverviewModel,
  buildStudentScheduleOverviewModel,
  buildStudentSubjectReportModel,
  buildStudentSubjectReportSummaryModel,
  createStudentProfileDraft,
  hasStudentProfileDraftChanges,
  normalizeStudentProfileDraft,
} from "../student-workflow-models"

type SupportedAttendanceMode = Extract<AttendanceMode, "QR_GPS" | "BLUETOOTH">

export function StudentScreen(props: {
  title: string
  subtitle: string
  children: ReactNode
}) {
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

export function StudentQuickActions() {
  return (
    <StudentCard
      title="Go to"
      subtitle="Move quickly between attendance, reports, account help, and classroom access."
    >
      <View style={styles.actionGrid}>
        <StudentNavAction href={studentRoutes.attendance} label="Attendance" />
        <StudentNavAction href={studentRoutes.classrooms} label="Classrooms" />
        <StudentNavAction href={studentRoutes.join} label="Join classroom" />
        <StudentNavAction href={studentRoutes.reports} label="Reports" />
        <StudentNavAction href={studentRoutes.history} label="Attendance history" />
        <StudentNavAction href={studentRoutes.profile} label="Profile" />
        <StudentNavAction href={studentRoutes.deviceStatus} label="Device status" />
      </View>
    </StudentCard>
  )
}

export function StudentDashboardSpotlightCard(props: {
  spotlight: ReturnType<typeof buildStudentDashboardModel>["spotlight"]
}) {
  return (
    <View style={[styles.card, spotlightToneStyle(props.spotlight.tone)]}>
      <Text style={[styles.cardEyebrow, toneColorStyle(props.spotlight.tone)]}>Student home</Text>
      <Text style={styles.spotlightTitle}>{props.spotlight.title}</Text>
      <Text style={styles.spotlightMessage}>{props.spotlight.message}</Text>
      <View style={styles.actionGrid}>
        <StudentNavAction
          href={resolveStudentDashboardActionHref(props.spotlight.primaryAction)}
          label={props.spotlight.primaryAction.label}
        />
        {props.spotlight.secondaryAction ? (
          <StudentNavAction
            href={resolveStudentDashboardActionHref(props.spotlight.secondaryAction)}
            label={props.spotlight.secondaryAction.label}
          />
        ) : null}
      </View>
    </View>
  )
}

export function StudentNavAction(props: {
  href:
    | string
    | {
        pathname: string
        params?: Record<string, string>
      }
  label: string
}) {
  return (
    <Link href={props.href} asChild>
      <Pressable style={styles.navButton}>
        <Text style={styles.navButtonLabel}>{props.label}</Text>
      </Pressable>
    </Link>
  )
}

export function resolveStudentDashboardActionHref(action: StudentDashboardActionModel) {
  switch (action.kind) {
    case "ATTENDANCE":
      return studentRoutes.attendance
    case "DEVICE_STATUS":
      return studentRoutes.deviceStatus
    case "JOIN_CLASSROOM":
      return studentRoutes.join
    case "REPORTS":
      return studentRoutes.reports
    case "CLASSROOM":
      return studentRoutes.classroomDetail(action.classroomId ?? "")
    default:
      return studentRoutes.home
  }
}

export function StudentCard(props: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{props.title}</Text>
      {props.subtitle ? <Text style={styles.cardSubtitle}>{props.subtitle}</Text> : null}
      <View style={styles.cardBody}>{props.children}</View>
    </View>
  )
}

export function StudentStatusBanner(props: { status: StudentScreenStatus }) {
  const bannerStyle =
    props.status.tone === "danger"
      ? styles.errorCard
      : props.status.tone === "success"
        ? styles.successCard
        : props.status.tone === "warning"
          ? styles.warningCard
          : styles.infoCard

  return (
    <View style={[styles.statusCard, bannerStyle]}>
      <Text style={styles.cardTitle}>{props.status.title}</Text>
      <Text style={styles.statusText}>{props.status.message}</Text>
    </View>
  )
}

export function StudentLoadingCard(props: { label: string; compact?: boolean }) {
  return (
    <View style={[styles.statusCard, props.compact ? styles.compactStatusCard : null]}>
      <ActivityIndicator color={mobileTheme.colors.primary} />
      <Text style={styles.statusText}>{props.label}</Text>
    </View>
  )
}

export function StudentErrorCard(props: { label: string }) {
  return (
    <View style={[styles.statusCard, styles.errorCard]}>
      <Text style={styles.errorText}>{props.label}</Text>
    </View>
  )
}

export function StudentEmptyCard(props: { label: string }) {
  return (
    <View style={[styles.statusCard, styles.emptyCard]}>
      <Text style={styles.statusText}>{props.label}</Text>
    </View>
  )
}

export function StudentSessionSetupCard() {
  return (
    <StudentCard
      title="Student sign in required"
      subtitle="Choose the student space from the app landing screen before opening protected student pages."
    >
      <Link href={mobileEntryRoutes.studentSignIn} asChild>
        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryButtonLabel}>Open student sign in</Text>
        </Pressable>
      </Link>
    </StudentCard>
  )
}

export function AnnouncementRow(props: {
  announcement: {
    id: string
    title: string | null
    postType: string
    authorDisplayName: string
    createdAt: string
    body: string
  }
}) {
  return (
    <View key={props.announcement.id} style={styles.listRow}>
      <Text style={styles.listTitle}>
        {props.announcement.title ?? formatEnum(props.announcement.postType)}
      </Text>
      <Text style={styles.listMeta}>
        {props.announcement.authorDisplayName} · {formatDateTime(props.announcement.createdAt)}
      </Text>
      <Text style={styles.bodyText}>{props.announcement.body}</Text>
    </View>
  )
}

export function AttendanceCandidateRow(props: {
  candidate: StudentAttendanceCandidate
  selected: boolean
  onPress?: () => void
}) {
  const content = (
    <>
      <Text style={styles.listTitle}>{props.candidate.classroomTitle}</Text>
      <Text style={styles.listMeta}>
        {props.candidate.lectureTitle} · {formatDateTime(props.candidate.timestamp)} ·{" "}
        {formatAttendanceMode(props.candidate.mode)}
      </Text>
      <Text style={styles.listMeta}>
        Trusted device: {props.candidate.requiresTrustedDevice ? "Required" : "Not required"}
      </Text>
    </>
  )

  if (!props.onPress) {
    return (
      <View style={[styles.selectionRow, props.selected ? styles.selectedRow : null]}>
        {content}
      </View>
    )
  }

  return (
    <Pressable
      style={[styles.selectionRow, props.selected ? styles.selectedRow : null]}
      onPress={props.onPress}
    >
      {content}
    </Pressable>
  )
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((segment) => `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`)
    .join(" ")
}

export function formatAttendanceMode(mode: SupportedAttendanceMode) {
  return mode === "QR_GPS" ? "QR + GPS" : "Bluetooth"
}

export function toneColorStyle(tone: CardTone) {
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

export function spotlightToneStyle(tone: CardTone) {
  switch (tone) {
    case "success":
      return styles.spotlightSuccess
    case "warning":
      return styles.spotlightWarning
    case "danger":
      return styles.spotlightDanger
    default:
      return styles.spotlightPrimary
  }
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
  cardEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
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
  spotlightPrimary: {
    borderColor: mobileTheme.colors.borderStrong,
    backgroundColor: mobileTheme.colors.surfaceHero,
  },
  spotlightSuccess: {
    borderColor: mobileTheme.colors.successBorder,
    backgroundColor: mobileTheme.colors.successSoft,
  },
  spotlightWarning: {
    borderColor: mobileTheme.colors.warningBorder,
    backgroundColor: mobileTheme.colors.warningSoft,
  },
  spotlightDanger: {
    borderColor: mobileTheme.colors.dangerBorder,
    backgroundColor: mobileTheme.colors.dangerSoft,
  },
  spotlightTitle: {
    color: mobileTheme.colors.text,
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 32,
  },
  spotlightMessage: {
    color: mobileTheme.colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  navButton: {
    borderRadius: mobileTheme.radius.button,
    backgroundColor: mobileTheme.colors.surfaceRaised,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: mobileTheme.spacing.md,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  navButtonLabel: {
    color: mobileTheme.colors.text,
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
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: mobileTheme.colors.border,
  },
  linkRow: {
    gap: 4,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: mobileTheme.colors.border,
  },
  selectionRow: {
    gap: 4,
    padding: mobileTheme.spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    backgroundColor: mobileTheme.colors.surfaceRaised,
  },
  selectedRow: {
    borderColor: mobileTheme.colors.accent,
    backgroundColor: mobileTheme.colors.accentSoft,
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
  bodyText: {
    color: mobileTheme.colors.text,
    fontSize: 14,
    lineHeight: 20,
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
  cameraPreviewFrame: {
    minHeight: 260,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: mobileTheme.colors.borderStrong,
    backgroundColor: mobileTheme.colors.primary,
  },
  cameraPreview: {
    flex: 1,
    minHeight: 260,
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
  statusCard: {
    borderRadius: 20,
    padding: mobileTheme.spacing.lg,
    backgroundColor: mobileTheme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    gap: mobileTheme.spacing.sm,
    alignItems: "flex-start",
  },
  compactStatusCard: {
    paddingVertical: 12,
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
  infoCard: {
    borderColor: mobileTheme.colors.borderStrong,
    backgroundColor: mobileTheme.colors.surfaceHero,
  },
  successCard: {
    borderColor: mobileTheme.colors.successBorder,
    backgroundColor: mobileTheme.colors.successSoft,
  },
  warningCard: {
    borderColor: mobileTheme.colors.warningBorder,
    backgroundColor: mobileTheme.colors.warningSoft,
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
