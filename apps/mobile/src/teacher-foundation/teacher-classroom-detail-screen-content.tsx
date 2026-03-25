import { getColors, mobileTheme } from "@attendease/ui-mobile"
import { Ionicons } from "@expo/vector-icons"
import { Link, useRouter } from "expo-router"
import { useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { mapTeacherApiErrorToMessage } from "../teacher-models"
import { styles } from "./shared-ui"

type ClassroomActionModel = {
  resetButtonLabel: string
  helperMessage: string
  currentCodeLabel: string
}

type RoutePath = string | { pathname: string; params?: Record<string, string> }

type RouteLinks = {
  bluetoothCreate: RoutePath
  roster: RoutePath
  announcements: RoutePath
  schedule: RoutePath
  lectures: RoutePath
}

type CourseInfoDraft = {
  classroomTitle: string
  courseCode: string
}

type AnnouncementItem = {
  id: string
  title: string
  body: string
  createdAt: string
}

type LectureItem = {
  id: string
  title: string
  lectureDate: string
  status: string
}

type Props = {
  hasSession: boolean
  isLoading: boolean
  loadErrorMessage: string | null
  detailStatus: {
    tone: "primary" | "success" | "warning" | "danger"
    title: string
    message: string
  }
  classroomTitle: string
  classroomSubtitle: string
  supportingText: string
  joinCodeLabel: string
  joinCodeExpiryLabel: string
  courseCode: string
  scopeSummary: string
  defaultAttendanceMode: "QR_GPS" | "BLUETOOTH" | string
  timezone: string
  routeLinks: RouteLinks
  canLaunchBluetooth: boolean
  canRotateJoinCode: boolean
  canEditCourseInfo: boolean
  canArchiveClassroom: boolean
  classroomActions: ClassroomActionModel
  isRotateJoinCodePending: boolean
  rotateJoinCodeError: unknown | null
  joinCodeMessage: string | null
  canSaveCourseInfo: boolean
  isEditingCourseInfo: boolean
  courseInfoDraft: CourseInfoDraft | null
  hasCourseChanges: boolean
  isCourseInfoSaving: boolean
  courseInfoMessage: string | null
  courseInfoError: unknown | null
  isArchivePending: boolean
  archiveError: unknown | null
  isArchived: boolean
  rosterCount: number
  announcementsCount: number
  lecturesCount: number
  importsCount: number
  announcements?: AnnouncementItem[]
  lectures?: LectureItem[]
  onStartEditCourseInfo: () => void
  onCourseInfoDraftTitleChange: (value: string) => void
  onCourseInfoDraftCodeChange: (value: string) => void
  onSaveCourseInfo: () => void
  onCancelCourseInfo: () => void
  onRotateJoinCode: () => void
  onClearCourseInfoMessage: () => void
  onClearJoinCodeMessage: () => void
  onClearCourseInfoErrorState: () => void
  onArchiveClassroom: () => void
  onBackToClassrooms: () => void
}

function fmtDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

function fmtEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ")
}

export function TeacherClassroomDetailScreenContent(props: Props) {
  const c = getColors()
  const insets = useSafeAreaInsets()
  const router = useRouter()

  if (!props.hasSession) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.surface,
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
        }}
      >
        <Ionicons name="lock-closed-outline" size={40} color={c.textSubtle} />
        <Text style={{ fontSize: 16, fontWeight: "600", color: c.text, marginTop: 12 }}>
          Sign in required
        </Text>
      </View>
    )
  }

  if (props.isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.surface,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 12 }}>Loading classroom…</Text>
      </View>
    )
  }

  if (props.loadErrorMessage) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.surface,
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
        }}
      >
        <Ionicons name="alert-circle" size={40} color={c.danger} />
        <Text style={{ fontSize: 14, color: c.danger, marginTop: 12, textAlign: "center" }}>
          {props.loadErrorMessage}
        </Text>
      </View>
    )
  }

  const safeDraft = props.courseInfoDraft ?? { classroomTitle: "", courseCode: "" }
  const canSaveCourse =
    props.isEditingCourseInfo &&
    props.canSaveCourseInfo &&
    !props.isCourseInfoSaving &&
    props.hasCourseChanges &&
    safeDraft.classroomTitle.trim().length >= 3 &&
    safeDraft.courseCode.trim().length >= 3

  const allLectures = props.lectures ?? []
  const sortedLectures = allLectures
    .map((l, idx) => ({ l, idx }))
    .sort((a, b) => {
      const d = new Date(b.l.lectureDate).getTime() - new Date(a.l.lectureDate).getTime()
      return d !== 0 ? d : b.idx - a.idx
    })
  const recentLectures = sortedLectures.slice(0, 5)

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.surface }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* ── Compact course header ── */}
      <View style={ds.header}>
        <Text style={[ds.title, { color: c.text }]} numberOfLines={2}>
          {props.classroomTitle}
        </Text>
        <Text style={{ fontSize: 13, color: c.textMuted }}>{props.classroomSubtitle}</Text>

        {/* Join code row */}
        <View style={[ds.joinRow, { backgroundColor: c.surfaceTint, borderColor: c.border }]}>
          <Ionicons name="key-outline" size={14} color={c.primary} />
          <Text style={{ fontSize: 13, fontWeight: "700", color: c.primary, letterSpacing: 1 }}>
            {props.classroomActions.currentCodeLabel}
          </Text>
          {props.canRotateJoinCode ? (
            <Pressable
              disabled={props.isRotateJoinCodePending}
              onPress={() => {
                props.onClearCourseInfoErrorState()
                props.onClearJoinCodeMessage()
                props.onRotateJoinCode()
              }}
              hitSlop={8}
              style={{ marginLeft: "auto" }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: props.isRotateJoinCodePending ? c.textSubtle : c.primary,
                }}
              >
                {props.isRotateJoinCodePending ? "Rotating…" : "Reset"}
              </Text>
            </Pressable>
          ) : null}
        </View>
        {props.joinCodeMessage ? (
          <Text style={{ fontSize: 12, color: c.success, marginTop: 2 }}>
            {props.joinCodeMessage}
          </Text>
        ) : null}
        {props.rotateJoinCodeError ? (
          <Text style={{ fontSize: 12, color: c.danger, marginTop: 2 }}>
            {mapTeacherApiErrorToMessage(props.rotateJoinCodeError)}
          </Text>
        ) : null}
      </View>

      {/* ── Quick action tiles ── */}
      <View style={ds.actionsRow}>
        <QuickTile
          href={props.routeLinks.roster}
          icon="people-outline"
          label="Students"
          {...(props.rosterCount > 0 ? { badge: `${props.rosterCount}` } : {})}
        />
        <QuickTile
          href={props.routeLinks.lectures}
          icon="book-outline"
          label="Lectures"
          {...(props.lecturesCount > 0 ? { badge: `${props.lecturesCount}` } : {})}
        />
        <QuickTile href={props.routeLinks.schedule} icon="calendar-outline" label="Schedule" />
        <QuickTile
          href={props.routeLinks.announcements}
          icon="megaphone-outline"
          label="Updates"
          {...(props.announcementsCount > 0 ? { badge: `${props.announcementsCount}` } : {})}
        />
      </View>

      {/* ── Recent lectures ── */}
      <View style={ds.section}>
        <View
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <Text style={{ fontSize: 16, fontWeight: "700", color: c.text }}>Recent Lectures</Text>
          {allLectures.length > 5 ? (
            <Link href={props.routeLinks.lectures} asChild>
              <Pressable hitSlop={8}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: c.primary }}>See All</Text>
              </Pressable>
            </Link>
          ) : null}
        </View>

        {recentLectures.length > 0 ? (
          recentLectures.map(({ l, idx }, i) => {
            const num = idx + 1
            const isCompleted = l.status === "COMPLETED"
            const isActive = l.status === "OPEN_FOR_ATTENDANCE"
            return (
              <Animated.View key={l.id} entering={FadeInDown.duration(200).delay(i * 40)}>
                <Pressable
                  onPress={() => router.push(props.routeLinks.lectures as never)}
                  style={[
                    ds.lectureCard,
                    {
                      backgroundColor: c.surfaceRaised,
                      borderColor: isActive ? c.successBorder : c.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      ds.lectureNum,
                      {
                        backgroundColor: isCompleted
                          ? c.successSoft
                          : isActive
                            ? c.primarySoft
                            : c.surfaceTint,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "800",
                        color: isCompleted ? c.success : isActive ? c.primary : c.textSubtle,
                      }}
                    >
                      {num}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 1 }}>
                    <Text
                      style={{ fontSize: 14, fontWeight: "600", color: c.text }}
                      numberOfLines={1}
                    >
                      {l.title || `Lecture ${num}`}
                    </Text>
                    <Text style={{ fontSize: 12, color: c.textMuted }}>
                      {fmtDate(l.lectureDate)}
                    </Text>
                  </View>
                  <View
                    style={[
                      ds.statusBadge,
                      {
                        backgroundColor: isCompleted
                          ? c.successSoft
                          : isActive
                            ? c.primarySoft
                            : c.surfaceTint,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: isCompleted ? c.success : isActive ? c.primary : c.textSubtle,
                      }}
                    >
                      {fmtEnum(l.status)}
                    </Text>
                  </View>
                  {isActive ? <Ionicons name="radio-outline" size={14} color={c.success} /> : null}
                </Pressable>
              </Animated.View>
            )
          })
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 24, gap: 6 }}>
            <Ionicons name="book-outline" size={32} color={c.textSubtle} />
            <Text style={{ fontSize: 13, color: c.textMuted }}>No lectures yet</Text>
          </View>
        )}
      </View>

      {/* ── Course Settings (collapsible) ── */}
      <View style={ds.section}>
        <CourseSettingsSection {...props} safeDraft={safeDraft} canSaveCourse={canSaveCourse} />
      </View>
    </ScrollView>
  )
}

function QuickTile(props: {
  href: RoutePath
  icon: React.ComponentProps<typeof Ionicons>["name"]
  label: string
  badge?: string
}) {
  const c = getColors()
  return (
    <Link href={props.href} asChild>
      <Pressable style={ds.quickTile}>
        <View style={[ds.quickIcon, { backgroundColor: c.primarySoft }]}>
          <Ionicons name={props.icon} size={20} color={c.primary} />
          {props.badge ? (
            <View style={[ds.badge, { backgroundColor: c.primary }]}>
              <Text style={{ fontSize: 9, fontWeight: "800", color: c.primaryContrast }}>
                {props.badge}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted, textAlign: "center" }}>
          {props.label}
        </Text>
      </Pressable>
    </Link>
  )
}

function CourseSettingsSection(
  props: Props & { safeDraft: CourseInfoDraft; canSaveCourse: boolean },
) {
  const [expanded, setExpanded] = useState(false)
  const c = getColors()

  return (
    <>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="settings-outline" size={16} color={c.textSubtle} />
          <Text style={{ fontSize: 15, fontWeight: "600", color: c.textMuted }}>
            Course Settings
          </Text>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={c.textSubtle} />
      </Pressable>

      {expanded ? (
        <View style={{ gap: 16, marginTop: 8 }}>
          {/* Course info */}
          <View
            style={[ds.settingsCard, { backgroundColor: c.surfaceRaised, borderColor: c.border }]}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>Course Info</Text>
            <Text style={{ fontSize: 12, color: c.textMuted }}>{props.scopeSummary}</Text>

            {props.canEditCourseInfo && props.courseInfoDraft ? (
              !props.isEditingCourseInfo ? (
                <Pressable
                  style={[styles.secondaryButton, { paddingVertical: 10 }]}
                  onPress={() => {
                    props.onClearCourseInfoMessage()
                    props.onStartEditCourseInfo()
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: c.text }}>
                    Edit Course Info
                  </Text>
                </Pressable>
              ) : (
                <>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted }}>Title</Text>
                  <TextInput
                    value={props.safeDraft.classroomTitle}
                    autoCapitalize="words"
                    placeholder="Applied Mathematics"
                    onChangeText={props.onCourseInfoDraftTitleChange}
                    style={styles.input}
                  />
                  <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted }}>Code</Text>
                  <TextInput
                    value={props.safeDraft.courseCode}
                    autoCapitalize="characters"
                    placeholder="CSE6-MATH-A"
                    onChangeText={props.onCourseInfoDraftCodeChange}
                    style={styles.input}
                  />
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Pressable
                      style={[
                        styles.primaryButton,
                        { flex: 1, paddingVertical: 10, opacity: props.canSaveCourse ? 1 : 0.5 },
                      ]}
                      disabled={!props.canSaveCourse}
                      onPress={() => {
                        props.onClearCourseInfoMessage()
                        props.onSaveCourseInfo()
                      }}
                    >
                      <Text style={styles.primaryButtonLabel}>
                        {props.isCourseInfoSaving ? "Saving…" : "Save"}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.secondaryButton, { flex: 1, paddingVertical: 10 }]}
                      onPress={props.onCancelCourseInfo}
                    >
                      <Text style={styles.secondaryButtonLabel}>Cancel</Text>
                    </Pressable>
                  </View>
                </>
              )
            ) : (
              <>
                <Text style={{ fontSize: 13, color: c.textMuted }}>
                  Title: {props.classroomTitle}
                </Text>
                <Text style={{ fontSize: 13, color: c.textMuted }}>Code: {props.courseCode}</Text>
              </>
            )}
            {props.courseInfoMessage ? (
              <Text style={{ fontSize: 12, color: c.success }}>{props.courseInfoMessage}</Text>
            ) : null}
            {props.courseInfoError ? (
              <Text style={{ fontSize: 12, color: c.danger }}>
                {mapTeacherApiErrorToMessage(props.courseInfoError)}
              </Text>
            ) : null}
          </View>

          {/* Archive */}
          {props.canArchiveClassroom ? (
            <View
              style={[
                ds.settingsCard,
                { backgroundColor: c.dangerSoft, borderColor: c.dangerBorder },
              ]}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: c.danger }}>
                Archive Classroom
              </Text>
              <Text style={{ fontSize: 12, color: c.textMuted }}>
                Removes from active classrooms. History is preserved.
              </Text>
              <Pressable
                style={[
                  styles.dangerButton,
                  { paddingVertical: 10, opacity: props.isArchivePending ? 0.5 : 1 },
                ]}
                disabled={props.isArchivePending}
                onPress={props.onArchiveClassroom}
              >
                <Text style={styles.primaryButtonLabel}>
                  {props.isArchivePending ? "Archiving…" : "Archive"}
                </Text>
              </Pressable>
              {props.archiveError ? (
                <Text style={{ fontSize: 12, color: c.danger }}>
                  {mapTeacherApiErrorToMessage(props.archiveError)}
                </Text>
              ) : null}
              {props.isArchived ? (
                <Pressable
                  style={[styles.secondaryButton, { paddingVertical: 10 }]}
                  onPress={props.onBackToClassrooms}
                >
                  <Text style={styles.secondaryButtonLabel}>Back To Classrooms</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </>
  )
}

const ds = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  joinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 6,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickTile: {
    alignItems: "center",
    gap: 6,
    width: 70,
  },
  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 10,
  },
  lectureCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  lectureNum: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  settingsCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
})
