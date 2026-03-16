import { createAuthApiClient } from "@attendease/auth"
import { loadMobileEnv } from "@attendease/config"
import type { AttendanceMode, TrustedDeviceAttendanceReadyResponse } from "@attendease/contracts"
import { getColors } from "@attendease/ui-mobile"
import { AnimatedCard, GradientHeader, StatusPill } from "@attendease/ui-mobile/animated"
import { Ionicons } from "@expo/vector-icons"
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "expo-router"
import { useEffect, useState } from "react"
import type { ComponentType, ReactNode } from "react"
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"

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
}) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
    >
      <GradientHeader title={props.title} subtitle={props.subtitle} eyebrow="Student" />
      {props.children}
    </ScrollView>
  )
}

export function StudentQuickActions() {
  return (
    <AnimatedCard index={2}>
      <Text style={styles.cardTitle}>Quick actions</Text>
      <View style={styles.actionGrid}>
        <StudentNavAction href={studentRoutes.attendance} label="Attendance" />
        <StudentNavAction href={studentRoutes.classrooms} label="Classrooms" />
        <StudentNavAction href={studentRoutes.join} label="Join" />
        <StudentNavAction href={studentRoutes.reports} label="Reports" />
        <StudentNavAction href={studentRoutes.history} label="History" />
        <StudentNavAction href={studentRoutes.profile} label="Profile" />
        <StudentNavAction href={studentRoutes.deviceStatus} label="Device" />
      </View>
    </AnimatedCard>
  )
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
        />
        {props.spotlight.secondaryAction ? (
          <StudentNavAction
            href={resolveStudentDashboardActionHref(props.spotlight.secondaryAction)}
            label={props.spotlight.secondaryAction.label}
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

export { styles } from "./styles"
