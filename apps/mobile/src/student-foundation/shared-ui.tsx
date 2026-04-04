import { createAuthApiClient } from "@attendease/auth"
import { loadMobileEnv } from "@attendease/config"
import type { AttendanceMode, TrustedDeviceAttendanceReadyResponse } from "@attendease/contracts"
import { getColors } from "@attendease/ui-mobile"
import { AnimatedCard, GradientHeader, StatusPill } from "@attendease/ui-mobile/animated"
import { Ionicons } from "@expo/vector-icons"
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import type { ComponentType, ReactNode } from "react"
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

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
import { styles } from "./styles"

type SupportedAttendanceMode = Extract<AttendanceMode, "QR_GPS" | "BLUETOOTH">

export function StudentScreen(props: {
  title: string
  subtitle: string
  children: ReactNode
  headerRight?: ReactNode
  onRefresh?: () => void
  refreshing?: boolean
}) {
  const insets = useSafeAreaInsets()
  const c = getColors()

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.screenContent,
        { paddingTop: insets.top, paddingBottom: insets.bottom + 32 },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        props.onRefresh ? (
          <RefreshControl
            refreshing={props.refreshing ?? false}
            onRefresh={props.onRefresh}
            tintColor={c.primary}
            colors={[c.primary]}
          />
        ) : undefined
      }
    >
      <View style={{ position: "relative" }}>
        <GradientHeader
          title={props.title}
          subtitle={props.subtitle}
          eyebrow="Student"
          icon={<Ionicons name="school" size={14} color={c.primary} />}
        />
        {props.headerRight ? (
          <View style={{ position: "absolute", top: 12, right: 4 }}>{props.headerRight}</View>
        ) : null}
      </View>
      {props.children}
    </ScrollView>
  )
}

export function StudentProfileButton() {
  const router = useRouter()
  const c = getColors()
  return (
    <Pressable
      onPress={() => router.push(studentRoutes.profile)}
      hitSlop={10}
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: c.primarySoft,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name="person-circle-outline" size={22} color={c.primary} />
    </Pressable>
  )
}

export function StudentBackButton(props: { label: string }) {
  const router = useRouter()
  const c = getColors()
  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={8}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingVertical: 6,
        marginBottom: 4,
      }}
    >
      <Ionicons name="arrow-back" size={20} color={c.primary} />
      <Text style={{ fontSize: 15, fontWeight: "600", color: c.primary }}>{props.label}</Text>
    </Pressable>
  )
}

export function StudentQuickActions() {
  return (
    <AnimatedCard index={2}>
      <Text style={styles.cardTitle}>Quick actions</Text>
      <View style={styles.quickActionGrid}>
        <QuickActionTile
          href={studentRoutes.classrooms}
          label="Classrooms"
          icon="library-outline"
        />
        <QuickActionTile href={studentRoutes.join} label="Join" icon="enter-outline" />
        <QuickActionTile href={studentRoutes.reports} label="Reports" icon="bar-chart-outline" />
        <QuickActionTile href={studentRoutes.history} label="History" icon="time-outline" />
        <QuickActionTile href={studentRoutes.profile} label="Profile" icon="person-outline" />
        <QuickActionTile
          href={studentRoutes.deviceStatus}
          label="Device"
          icon="phone-portrait-outline"
        />
      </View>
    </AnimatedCard>
  )
}

function QuickActionTile(props: {
  href: string
  label: string
  icon: React.ComponentProps<typeof Ionicons>["name"]
}) {
  const c = getColors()
  return (
    <Link href={props.href} asChild>
      <Pressable style={styles.quickActionTile}>
        <View style={styles.quickActionIcon}>
          <Ionicons name={props.icon} size={22} color={c.primary} />
        </View>
        <Text style={styles.quickActionLabel}>{props.label}</Text>
      </Pressable>
    </Link>
  )
}

function spotlightActionIcon(kind: string): React.ComponentProps<typeof Ionicons>["name"] {
  switch (kind) {
    case "ATTENDANCE":
      return "hand-left-outline"
    case "DEVICE_STATUS":
      return "phone-portrait-outline"
    case "JOIN_CLASSROOM":
      return "enter-outline"
    case "REPORTS":
      return "bar-chart-outline"
    case "CLASSROOM":
      return "library-outline"
    default:
      return "arrow-forward-outline"
  }
}

export function StudentDashboardSpotlightCard(props: {
  spotlight: ReturnType<typeof buildStudentDashboardModel>["spotlight"]
}) {
  return (
    <AnimatedCard index={0} glow style={spotlightToneStyle(props.spotlight.tone)}>
      <Text style={[styles.cardEyebrow, toneColorStyle(props.spotlight.tone)]}>Student home</Text>
      <Text style={styles.spotlightTitle}>{props.spotlight.title}</Text>
      <Text style={styles.spotlightMessage}>{props.spotlight.message}</Text>
      <View style={styles.actionGrid}>
        <StudentNavAction
          href={resolveStudentDashboardActionHref(props.spotlight.primaryAction)}
          label={props.spotlight.primaryAction.label}
          icon={spotlightActionIcon(props.spotlight.primaryAction.kind)}
        />
        {props.spotlight.secondaryAction ? (
          <StudentNavAction
            href={resolveStudentDashboardActionHref(props.spotlight.secondaryAction)}
            label={props.spotlight.secondaryAction.label}
            icon={spotlightActionIcon(props.spotlight.secondaryAction.kind)}
          />
        ) : null}
      </View>
    </AnimatedCard>
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
  icon?: React.ComponentProps<typeof Ionicons>["name"]
}) {
  const c = getColors()
  return (
    <Link href={props.href} asChild>
      <Pressable style={styles.navButton}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {props.icon ? <Ionicons name={props.icon} size={15} color={c.primary} /> : null}
          <Text style={styles.navButtonLabel}>{props.label}</Text>
        </View>
      </Pressable>
    </Link>
  )
}

export function resolveStudentDashboardActionHref(action: StudentDashboardActionModel) {
  switch (action.kind) {
    case "ATTENDANCE":
      return studentRoutes.classrooms
    case "DEVICE_STATUS":
      return studentRoutes.deviceStatus
    case "JOIN_CLASSROOM":
      return studentRoutes.join
    case "REPORTS":
      return studentRoutes.reports
    case "CLASSROOM":
      return studentRoutes.classroomDetail(action.classroomId ?? "")
    default:
      return studentRoutes.classrooms
  }
}

export function StudentCard(props: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <AnimatedCard>
      <Text style={styles.cardTitle}>{props.title}</Text>
      {props.subtitle ? <Text style={styles.cardSubtitle}>{props.subtitle}</Text> : null}
      <View style={styles.cardBody}>{props.children}</View>
    </AnimatedCard>
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
    <Animated.View entering={FadeInDown.duration(400)} style={[styles.statusCard, bannerStyle]}>
      <Text style={styles.cardTitle}>{props.status.title}</Text>
      <Text style={styles.statusText}>{props.status.message}</Text>
    </Animated.View>
  )
}

export function StudentLoadingCard(props: { label: string; compact?: boolean }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      style={[styles.statusCard, props.compact ? styles.compactStatusCard : null]}
    >
      <ActivityIndicator color={getColors().primary} />
      <Text style={styles.statusText}>{props.label}</Text>
    </Animated.View>
  )
}

export function StudentErrorCard(props: { label: string }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      style={[styles.statusCard, styles.errorCard]}
    >
      <Ionicons name="alert-circle" size={20} color={getColors().danger} />
      <Text style={styles.errorText}>{props.label}</Text>
    </Animated.View>
  )
}

export function StudentEmptyCard(props: { label: string }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      style={[styles.statusCard, styles.emptyCard]}
    >
      <Ionicons name="folder-open-outline" size={20} color={getColors().textSubtle} />
      <Text style={styles.statusText}>{props.label}</Text>
    </Animated.View>
  )
}

export function StudentSessionSetupCard() {
  return (
    <StudentCard
      title="Student sign in required"
      subtitle="Sign in to access your student dashboard."
    >
      <Link href={mobileEntryRoutes.studentSignIn} asChild>
        <Pressable style={styles.primaryButton}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="log-in-outline" size={18} color={getColors().primaryContrast} />
            <Text style={styles.primaryButtonLabel}>Open student sign in</Text>
          </View>
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

// v2.0: Date-only format — avoids the "5:30 am" bug caused by date-only
// strings (e.g. "2026-03-27") being parsed as midnight UTC, which shows
// as 5:30 AM in IST when timeStyle is included.
export function formatDateOnly(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    dateStyle: "medium",
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

export { styles } from "./styles"
