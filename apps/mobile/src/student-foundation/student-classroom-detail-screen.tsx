import { getColors, mobileTheme } from "@attendease/ui-mobile"
import { Ionicons } from "@expo/vector-icons"
import { Link } from "expo-router"
import { useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"

import { buildStudentAttendanceGateModel } from "../device-trust"
import { mapStudentApiErrorToMessage } from "../student-models"
import { studentRoutes } from "../student-routes"
import { useStudentSession } from "../student-session"
import {
  buildStudentAttendanceCandidates,
  buildStudentClassroomDetailSummaryModel,
} from "../student-workflow-models"

import { useStudentClassroomDetailData } from "./queries"
import { WeeklyScheduleView } from "./student-classroom-schedule-screen"
import {
  AnnouncementRow,
  StudentCard,
  StudentEmptyCard,
  StudentErrorCard,
  StudentLoadingCard,
  StudentScreen,
  StudentSessionSetupCard,
  formatDateOnly,
  formatDateTime,
  formatEnum,
  styles,
} from "./shared-ui"

// v2.0: 3-tab layout — Attendance (default), Posts, Schedule.
type DetailTab = "attendance" | "posts" | "schedule"

export function StudentClassroomDetailScreen(props: { classroomId: string }) {
  const { session } = useStudentSession()
  const c = getColors()
  const [activeTab, setActiveTab] = useState<DetailTab>("attendance")
  const classroom = useStudentClassroomDetailData(props.classroomId)

  const attendanceGateModel = classroom.attendanceReadyQuery.error
    ? {
        title: "Attendance temporarily blocked",
        message: mapStudentApiErrorToMessage(classroom.attendanceReadyQuery.error),
        tone: "danger" as const,
        supportHint: "Retry the trusted-device check or open Device Status for support guidance.",
        canContinue: false,
      }
    : buildStudentAttendanceGateModel({
        deviceTrust: classroom.meQuery.data?.user.deviceTrust ?? null,
        attendanceReady: classroom.attendanceReadyQuery.data ?? null,
      })

  // v2.0: Build markedSessionIds from history — used to tag candidates as already marked
  const markedSessionIds = new Set(
    (classroom.historyQuery.data ?? [])
      .filter((item) => item.attendanceStatus === "PRESENT" && item.markedAt !== null)
      .map((item) => item.sessionId),
  )

  const attendanceCandidates =
    classroom.detailQuery.data && classroom.membership && classroom.lecturesQuery.data
      ? buildStudentAttendanceCandidates({
          classrooms: [
            {
              ...classroom.membership,
              displayTitle: classroom.detailQuery.data.displayTitle,
              code: classroom.detailQuery.data.code,
              classroomStatus: classroom.detailQuery.data.status,
              defaultAttendanceMode: classroom.detailQuery.data.defaultAttendanceMode,
              timezone: classroom.detailQuery.data.timezone,
              requiresTrustedDevice: classroom.detailQuery.data.requiresTrustedDevice,
            },
          ],
          liveSessions: [
            ...(classroom.qrLiveSessionsQuery.data ?? []),
            ...(classroom.bluetoothLiveSessionsQuery.data ?? []),
          ],
          markedSessionIds,
        })
      : []

  // v2.0: Partition into unmarked (action needed) and marked (info only)
  const unmarkedCandidates = attendanceCandidates.filter((c) => !c.isMarked)
  const markedCandidates = attendanceCandidates.filter((c) => c.isMarked)

  const detailSummary =
    classroom.detailQuery.data && classroom.membership
      ? buildStudentClassroomDetailSummaryModel({
          classroom: {
            id: classroom.detailQuery.data.id,
            code: classroom.detailQuery.data.code,
            displayTitle: classroom.detailQuery.data.displayTitle,
            defaultAttendanceMode: classroom.detailQuery.data.defaultAttendanceMode,
            enrollmentStatus: classroom.membership.enrollmentStatus,
          },
          lectures: classroom.lecturesQuery.data ?? [],
          schedule: classroom.scheduleQuery.data ?? null,
          announcementCount: classroom.announcementsQuery.data?.length ?? 0,
          attendanceCandidates,
          gateModel: attendanceGateModel,
        })
      : null

  const isLoading =
    classroom.meQuery.isLoading ||
    classroom.attendanceReadyQuery.isLoading ||
    classroom.qrLiveSessionsQuery.isLoading ||
    classroom.bluetoothLiveSessionsQuery.isLoading ||
    classroom.detailQuery.isLoading ||
    classroom.announcementsQuery.isLoading ||
    classroom.lecturesQuery.isLoading ||
    classroom.scheduleQuery.isLoading

  const loadError =
    classroom.detailQuery.error ??
    classroom.qrLiveSessionsQuery.error ??
    classroom.bluetoothLiveSessionsQuery.error ??
    classroom.announcementsQuery.error ??
    classroom.lecturesQuery.error ??
    classroom.scheduleQuery.error

  const lectures = classroom.lecturesQuery.data ?? []
  const announcements = classroom.announcementsQuery.data ?? []
  const historyItems = classroom.historyQuery.data ?? []

  const presentCount = historyItems.filter((h) => h.attendanceStatus === "PRESENT").length
  const absentCount = historyItems.filter((h) => h.attendanceStatus === "ABSENT").length
  const totalRecords = historyItems.length
  const attendancePct = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0

  return (
    <StudentScreen
      title={detailSummary?.title ?? "Classroom"}
      subtitle={detailSummary?.subtitle ?? "Course details"}
    >
      {!session ? (
        <StudentSessionSetupCard />
      ) : isLoading ? (
        <StudentLoadingCard label="Loading course details…" />
      ) : loadError ? (
        <StudentErrorCard label={mapStudentApiErrorToMessage(loadError)} />
      ) : (
        <>
          {/* ── Compact Info Strip ── */}
          <View
            style={{
              backgroundColor:
                unmarkedCandidates.length > 0
                  ? c.dangerSoft
                  : markedCandidates.length > 0
                    ? c.successSoft
                    : c.surfaceRaised,
              borderRadius: mobileTheme.radius.sm,
              padding: mobileTheme.spacing.md,
              gap: mobileTheme.spacing.sm,
              borderWidth: 1,
              borderColor:
                unmarkedCandidates.length > 0
                  ? c.dangerBorder
                  : markedCandidates.length > 0
                    ? c.success
                    : c.border,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 }}>
                {unmarkedCandidates.length > 0 ? (
                  <LivePill icon="radio-outline" label={`${unmarkedCandidates.length} Live`} bg={c.danger} />
                ) : markedCandidates.length > 0 ? (
                  <LivePill icon="checkmark-circle" label="Marked" bg={c.success} />
                ) : null}
              </View>
              {totalRecords > 0 ? (
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "800",
                    color: attendancePct >= 75 ? c.success : attendancePct >= 50 ? c.warning : c.danger,
                  }}
                >
                  {attendancePct}%
                </Text>
              ) : null}
            </View>
            {totalRecords > 0 ? (
              <View style={{ height: 4, borderRadius: 2, backgroundColor: c.surfaceMuted, overflow: "hidden" }}>
                <View
                  style={{
                    height: 4,
                    borderRadius: 2,
                    width: `${Math.min(100, attendancePct)}%`,
                    backgroundColor: attendancePct >= 75 ? c.success : attendancePct >= 50 ? c.warning : c.danger,
                  }}
                />
              </View>
            ) : (
              <Text style={{ fontSize: 12, color: c.textMuted }}>No attendance records yet</Text>
            )}
          </View>

          {/* ── 4-Tab Bar ── */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: c.surfaceMuted,
              borderRadius: 10,
              padding: 3,
            }}
          >
            <TabButton
              label="Attendance"
              icon="hand-left-outline"
              active={activeTab === "attendance"}
              count={totalRecords}
              onPress={() => setActiveTab("attendance")}
            />
            <TabButton
              label="Posts"
              icon="megaphone-outline"
              active={activeTab === "posts"}
              count={announcements.length}
              onPress={() => setActiveTab("posts")}
            />
            <TabButton
              label="Schedule"
              icon="calendar-outline"
              active={activeTab === "schedule"}
              onPress={() => setActiveTab("schedule")}
            />
          </View>

          {/* ── Tab Content ── */}
          {activeTab === "attendance" ? (
            <AttendanceTabContent
              classroomId={props.classroomId}
              unmarkedCandidates={unmarkedCandidates}
              markedCandidates={markedCandidates}
              historyItems={historyItems}
              lectures={lectures}
              totalRecords={totalRecords}
              presentCount={presentCount}
              absentCount={absentCount}
              attendancePct={attendancePct}
              subjectId={classroom.membership?.subjectId ?? null}
            />
          ) : activeTab === "posts" ? (
            <PostsTabContent announcements={announcements} />
          ) : (
            <ScheduleTabContent schedule={classroom.scheduleQuery.data ?? null} />
          )}
        </>
      )}
    </StudentScreen>
  )
}

/* ═══════════════════════════════════════════════
 *  ATTENDANCE TAB
 * ═══════════════════════════════════════════════ */
function AttendanceTabContent(props: {
  classroomId: string
  unmarkedCandidates: ReturnType<typeof buildStudentAttendanceCandidates>
  markedCandidates: ReturnType<typeof buildStudentAttendanceCandidates>
  historyItems: Array<{
    attendanceRecordId: string
    lectureTitle: string | null
    lectureDate: string | null
    startedAt: string | null
    markedAt: string | null
    attendanceStatus: string
  }>
  lectures: Array<{
    id: string
    title: string | null
    lectureDate: string
    plannedStartAt: string | null
    actualStartAt: string | null
    status: string
  }>
  totalRecords: number
  presentCount: number
  absentCount: number
  attendancePct: number
  subjectId: string | null
}) {
  const c = getColors()

  return (
    <>
      {/* Red "Live Session" banner with scan buttons */}
      {props.unmarkedCandidates.length > 0 ? (
        <Animated.View entering={FadeInDown.duration(300)}>
          <View style={{ borderRadius: 12, backgroundColor: c.danger, padding: 14, gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#fff" }} />
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#fff" }}>
                {props.unmarkedCandidates.length} Live Session
                {props.unmarkedCandidates.length === 1 ? "" : "s"}
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: "#fff", opacity: 0.85 }}>
              Your teacher has started attendance. Mark your presence now.
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {props.unmarkedCandidates.some((cand) => cand.mode === "QR_GPS") ? (
                <Link href={studentRoutes.qrAttendanceFromClassroom(props.classroomId) as never} asChild>
                  <Pressable style={localStyles.scanButton}>
                    <Ionicons name="qr-code-outline" size={16} color={c.danger} />
                    <Text style={{ fontSize: 13, fontWeight: "700", color: c.danger }}>Scan QR</Text>
                  </Pressable>
                </Link>
              ) : null}
              {props.unmarkedCandidates.some((cand) => cand.mode === "BLUETOOTH") ? (
                <Link href={studentRoutes.bluetoothAttendanceFromClassroom(props.classroomId) as never} asChild>
                  <Pressable style={localStyles.scanButton}>
                    <Ionicons name="bluetooth-outline" size={16} color={c.danger} />
                    <Text style={{ fontSize: 13, fontWeight: "700", color: c.danger }}>Bluetooth</Text>
                  </Pressable>
                </Link>
              ) : null}
            </View>
          </View>
        </Animated.View>
      ) : null}

      {/* Stats chips */}
      {props.totalRecords > 0 ? (
        <Animated.View entering={FadeInDown.duration(300).delay(50)}>
          <View style={{ gap: mobileTheme.spacing.sm }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <StatChip label="Total" value={String(props.totalRecords)} color={c.primary} bg={c.primarySoft} />
              <StatChip label="Present" value={String(props.presentCount)} color={c.success} bg={c.successSoft} />
              <StatChip label="Absent" value={String(props.absentCount)} color={c.danger} bg={c.dangerSoft} />
            </View>
          </View>
        </Animated.View>
      ) : null}

      {/* Attendance Records */}
      <Animated.View entering={FadeInDown.duration(300).delay(100)}>
        <StudentCard title="Attendance Records">
          {props.totalRecords > 0 ? (
            <View style={{ gap: 0 }}>
              {props.historyItems
                .sort(
                  (a, b) =>
                    new Date(b.lectureDate ?? b.markedAt ?? 0).getTime() -
                    new Date(a.lectureDate ?? a.markedAt ?? 0).getTime(),
                )
                .map((record, i, arr) => {
                  const isPresent = record.attendanceStatus === "PRESENT"
                  // v2.0: Use startedAt/markedAt for time; fall back to date-only for lectureDate
                  const timeDisplay = record.startedAt
                    ? formatDateTime(record.startedAt)
                    : record.markedAt
                      ? formatDateTime(record.markedAt)
                      : record.lectureDate
                        ? formatDateOnly(record.lectureDate)
                        : "—"
                  return (
                    <View
                      key={record.attendanceRecordId}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        paddingVertical: 9,
                        borderBottomWidth: i < arr.length - 1 ? StyleSheet.hairlineWidth : 0,
                        borderBottomColor: c.border,
                      }}
                    >
                      <View
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 7,
                          backgroundColor: isPresent ? c.successSoft : c.dangerSoft,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons
                          name={isPresent ? "checkmark" : "close"}
                          size={14}
                          color={isPresent ? c.success : c.danger}
                        />
                      </View>
                      <View style={{ flex: 1, gap: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: "500", color: c.text }} numberOfLines={1}>
                          {record.lectureTitle ?? `Lecture ${arr.length - i}`}
                        </Text>
                        <Text style={{ fontSize: 11, color: c.textMuted }} numberOfLines={1}>
                          {timeDisplay}
                        </Text>
                      </View>
                      <View
                        style={{
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                          borderRadius: 5,
                          backgroundColor: isPresent ? c.successSoft : c.dangerSoft,
                        }}
                      >
                        <Text
                          style={{ fontSize: 10, fontWeight: "700", color: isPresent ? c.success : c.danger }}
                        >
                          {isPresent ? "Present" : "Absent"}
                        </Text>
                      </View>
                    </View>
                  )
                })}
            </View>
          ) : props.lectures.length > 0 ? (
            <View style={{ gap: 0 }}>
              <Text style={[styles.listMeta, { marginBottom: 4 }]}>
                {props.lectures.length} lecture{props.lectures.length === 1 ? "" : "s"} scheduled
              </Text>
              {props.lectures.slice(0, 8).map((lecture, i) => {
                // v2.0: Use actualStartAt/plannedStartAt for time, date-only for lectureDate
                const timeDisplay = lecture.actualStartAt
                  ? formatDateTime(lecture.actualStartAt)
                  : lecture.plannedStartAt
                    ? formatDateTime(lecture.plannedStartAt)
                    : formatDateOnly(lecture.lectureDate)
                return (
                  <View
                    key={lecture.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      paddingVertical: 7,
                      borderBottomWidth:
                        i < Math.min(props.lectures.length, 8) - 1 ? StyleSheet.hairlineWidth : 0,
                      borderBottomColor: c.border,
                    }}
                  >
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        backgroundColor: c.surfaceTint,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "700", color: c.textSubtle }}>
                        {props.lectures.length - i}
                      </Text>
                    </View>
                    <View style={{ flex: 1, gap: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "500", color: c.text }} numberOfLines={1}>
                        {lecture.title ?? `Lecture ${props.lectures.length - i}`}
                      </Text>
                      <Text style={{ fontSize: 11, color: c.textMuted }} numberOfLines={1}>
                        {timeDisplay}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 10, fontWeight: "600", color: c.textSubtle }}>
                      {formatEnum(lecture.status)}
                    </Text>
                  </View>
                )
              })}
            </View>
          ) : (
            <StudentEmptyCard label="No attendance records yet." />
          )}

        </StudentCard>
      </Animated.View>
    </>
  )
}

/* ═══════════════════════════════════════════════
 *  POSTS TAB
 * ═══════════════════════════════════════════════ */
function PostsTabContent(props: { announcements: Array<{ id: string; [key: string]: unknown }> }) {
  return (
    <StudentCard title="Announcements">
      {props.announcements.length > 0 ? (
        props.announcements.map((announcement) => (
          <AnnouncementRow key={announcement.id} announcement={announcement as never} />
        ))
      ) : (
        <StudentEmptyCard label="No announcements from your teacher yet." />
      )}
    </StudentCard>
  )
}

/* ═══════════════════════════════════════════════
 *  SCHEDULE TAB
 * ═══════════════════════════════════════════════ */
function ScheduleTabContent(props: {
  schedule: {
    scheduleSlots: Array<{
      id: string
      weekday: number
      startMinutes: number
      endMinutes: number
      locationLabel: string | null
      status: string
    }>
    scheduleExceptions: Array<{
      id: string
      exceptionType: string
      effectiveDate: string
      startMinutes: number | null
      endMinutes: number | null
      locationLabel: string | null
      scheduleSlotId: string | null
    }>
  } | null
}) {
  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <StudentCard title="Weekly Plan">
        <WeeklyScheduleView schedule={props.schedule} />
      </StudentCard>
    </Animated.View>
  )
}

/* ═══════════════════════════════════════════════
 *  SMALL REUSABLE COMPONENTS
 * ═══════════════════════════════════════════════ */
function LivePill(props: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; bg: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: props.bg,
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 3,
      }}
    >
      <Ionicons name={props.icon} size={11} color="#fff" />
      <Text style={{ fontSize: 10, fontWeight: "700", color: "#fff" }}>{props.label}</Text>
    </View>
  )
}

function StatChip(props: { label: string; value: string; color: string; bg: string }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        backgroundColor: props.bg,
        borderRadius: 8,
        paddingVertical: 8,
        gap: 1,
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: "800", color: props.color }}>{props.value}</Text>
      <Text style={{ fontSize: 10, fontWeight: "600", color: props.color }}>{props.label}</Text>
    </View>
  )
}

function TabButton(props: {
  label: string
  icon: React.ComponentProps<typeof Ionicons>["name"]
  active: boolean
  count?: number
  onPress: () => void
}) {
  const c = getColors()
  return (
    <Pressable
      onPress={props.onPress}
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        paddingVertical: 9,
        borderRadius: 8,
        backgroundColor: props.active ? c.surfaceRaised : "transparent",
        ...(props.active ? mobileTheme.shadow.soft : {}),
      }}
    >
      <Ionicons name={props.icon} size={16} color={props.active ? c.primary : c.textSubtle} />
      <Text
        style={{
          fontSize: 11,
          fontWeight: props.active ? "700" : "500",
          color: props.active ? c.text : c.textMuted,
        }}
        numberOfLines={1}
      >
        {props.label}
      </Text>
      {props.count != null && props.count > 0 ? (
        <View
          style={{
            backgroundColor: props.active ? c.primarySoft : c.surfaceTint,
            borderRadius: 6,
            paddingHorizontal: 5,
            paddingVertical: 1,
            position: "absolute",
            top: 4,
            right: 6,
          }}
        >
          <Text
            style={{ fontSize: 9, fontWeight: "700", color: props.active ? c.primary : c.textSubtle }}
          >
            {props.count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  )
}

const localStyles = StyleSheet.create({
  scanButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 10,
  },
})
