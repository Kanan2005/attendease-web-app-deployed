import { getColors, mobileTheme } from "@attendease/ui-mobile"
import { Ionicons } from "@expo/vector-icons"
import { useState } from "react"
import { Link } from "expo-router"
import { Pressable, StyleSheet, Text, View } from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"

import { buildStudentAttendanceGateModel } from "../device-trust"
import {
  mapStudentApiErrorToMessage,
} from "../student-models"
import { studentRoutes } from "../student-routes"
import { useStudentSession } from "../student-session"
import {
  buildStudentAttendanceCandidates,
  buildStudentClassroomDetailSummaryModel,
} from "../student-workflow-models"

import {
  useStudentClassroomDetailData,
} from "./queries"
import {
  AnnouncementRow,
  StudentCard,
  StudentEmptyCard,
  StudentErrorCard,
  StudentLoadingCard,
  StudentNavAction,
  StudentScreen,
  StudentSessionSetupCard,
  formatDateTime,
  formatEnum,
  styles,
} from "./shared-ui"

export function StudentClassroomDetailScreen(props: { classroomId: string }) {
  const { session } = useStudentSession()
  const c = getColors()
  const [activeTab, setActiveTab] = useState<"overview" | "announcements" | "attendance">("overview")
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
        })
      : []

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
  const lastPresentRecord = historyItems
    .filter((h) => h.attendanceStatus === "PRESENT")
    .sort((a, b) => new Date(b.markedAt ?? b.lectureDate ?? 0).getTime() - new Date(a.markedAt ?? a.lectureDate ?? 0).getTime())[0] ?? null

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
          {/* Quick Info Strip */}
          <View
            style={{
              backgroundColor: attendanceCandidates.length > 0 ? c.dangerSoft : c.surfaceRaised,
              borderRadius: 14,
              padding: 16,
              gap: 10,
              borderWidth: 1.5,
              borderColor: attendanceCandidates.length > 0 ? c.dangerBorder : c.border,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 8,
                    backgroundColor: c.primarySoft,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: c.primary }}>
                    {(classroom.detailQuery.data?.code ?? "").toUpperCase()}
                  </Text>
                </View>
                {attendanceCandidates.length > 0 ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.danger, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Ionicons name="radio-outline" size={12} color="#fff" />
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}>
                      {attendanceCandidates.length} Live
                    </Text>
                  </View>
                ) : null}
              </View>
              {totalRecords > 0 ? (
                <Text style={{ fontSize: 18, fontWeight: "800", color: attendancePct >= 75 ? c.success : attendancePct >= 50 ? c.warning : c.danger }}>
                  {attendancePct}%
                </Text>
              ) : null}
            </View>
            {totalRecords > 0 ? (
              <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surfaceMuted, overflow: "hidden" }}>
                <View
                  style={{
                    height: 6,
                    borderRadius: 3,
                    width: `${Math.min(100, attendancePct)}%`,
                    backgroundColor: attendancePct >= 75 ? c.success : attendancePct >= 50 ? c.warning : c.danger,
                  }}
                />
              </View>
            ) : (
              <Text style={{ fontSize: 13, color: c.textMuted }}>No attendance records yet</Text>
            )}
          </View>

          {/* Tab Bar */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: c.surfaceMuted,
              borderRadius: 12,
              padding: 3,
            }}
          >
            <TabButton
              label="Overview"
              icon="grid-outline"
              active={activeTab === "overview"}
              onPress={() => setActiveTab("overview")}
            />
            <TabButton
              label="Posts"
              icon="megaphone-outline"
              active={activeTab === "announcements"}
              count={announcements.length}
              onPress={() => setActiveTab("announcements")}
            />
            <TabButton
              label="Attendance"
              icon="hand-left-outline"
              active={activeTab === "attendance"}
              count={totalRecords}
              onPress={() => setActiveTab("attendance")}
            />
          </View>

          {/* Tab Content */}
          {activeTab === "overview" ? (
            <>
              {/* Quick Navigation */}
              <Animated.View entering={FadeInDown.duration(300)}>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <QuickNavTile
                    icon="calendar-outline"
                    label="Schedule"
                    href={studentRoutes.classroomSchedule(props.classroomId)}
                    color={c.primary}
                    bg={c.primarySoft}
                  />
                  <QuickNavTile
                    icon="chatbubble-ellipses-outline"
                    label="Stream"
                    href={studentRoutes.classroomStream(props.classroomId)}
                    color={c.accent}
                    bg={c.accentSoft}
                  />
                  {classroom.membership ? (
                    <QuickNavTile
                      icon="bar-chart-outline"
                      label="Report"
                      href={studentRoutes.subjectReport(classroom.membership.subjectId)}
                      color={c.success}
                      bg={c.successSoft}
                    />
                  ) : null}
                </View>
              </Animated.View>

              {/* Live Sessions — Mark Attendance */}
              {attendanceCandidates.length > 0 ? (
                <Animated.View entering={FadeInDown.duration(350).delay(50)}>
                  <View
                    style={{
                      borderRadius: 14,
                      backgroundColor: c.danger,
                      padding: 16,
                      gap: 12,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" }} />
                      <Text style={{ fontSize: 16, fontWeight: "800", color: "#fff" }}>
                        {attendanceCandidates.length} Live Session{attendanceCandidates.length === 1 ? "" : "s"}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 13, color: "#fff", opacity: 0.85 }}>
                      Your teacher has started attendance. Mark your presence now.
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {attendanceCandidates.some(cand => cand.mode === "QR_GPS") ? (
                        <Link href={studentRoutes.qrAttendanceFromClassroom(props.classroomId) as never} asChild>
                          <Pressable
                            style={{
                              flex: 1,
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                              backgroundColor: "#fff",
                              borderRadius: 10,
                              paddingVertical: 12,
                            }}
                          >
                            <Ionicons name="qr-code-outline" size={18} color={c.danger} />
                            <Text style={{ fontSize: 14, fontWeight: "700", color: c.danger }}>Scan QR</Text>
                          </Pressable>
                        </Link>
                      ) : null}
                      {attendanceCandidates.some(cand => cand.mode === "BLUETOOTH") ? (
                        <Link href={studentRoutes.bluetoothAttendanceFromClassroom(props.classroomId) as never} asChild>
                          <Pressable
                            style={{
                              flex: 1,
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                              backgroundColor: "#fff",
                              borderRadius: 10,
                              paddingVertical: 12,
                            }}
                          >
                            <Ionicons name="bluetooth-outline" size={18} color={c.danger} />
                            <Text style={{ fontSize: 14, fontWeight: "700", color: c.danger }}>Bluetooth</Text>
                          </Pressable>
                        </Link>
                      ) : null}
                    </View>
                  </View>
                </Animated.View>
              ) : null}

              {/* Attendance Summary */}
              <Animated.View entering={FadeInDown.duration(350).delay(100)}>
                <StudentCard title="Attendance Summary">
                  {totalRecords > 0 ? (
                    <View style={{ gap: 8 }}>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <StatChip label="Total" value={String(totalRecords)} color={c.primary} bg={c.primarySoft} />
                        <StatChip label="Present" value={String(presentCount)} color={c.success} bg={c.successSoft} />
                        <StatChip label="Absent" value={String(absentCount)} color={c.danger} bg={c.dangerSoft} />
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          backgroundColor: attendancePct >= 75 ? c.successSoft : attendancePct >= 50 ? c.warningSoft : c.dangerSoft,
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                      >
                        <Ionicons
                          name={attendancePct >= 75 ? "checkmark-circle" : attendancePct >= 50 ? "alert-circle" : "close-circle"}
                          size={18}
                          color={attendancePct >= 75 ? c.success : attendancePct >= 50 ? c.warning : c.danger}
                        />
                        <Text style={{
                          fontSize: 15,
                          fontWeight: "700",
                          color: attendancePct >= 75 ? c.success : attendancePct >= 50 ? c.warning : c.danger,
                        }}>
                          {attendancePct}% Attendance
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <StudentEmptyCard label="No attendance records yet." />
                  )}
                </StudentCard>
              </Animated.View>

              {/* Recent Announcements Preview */}
              {announcements.length > 0 ? (
                <Animated.View entering={FadeInDown.duration(350).delay(150)}>
                  <StudentCard title={`Latest Post`}>
                    <AnnouncementRow announcement={announcements[0]!} />
                    {announcements.length > 1 ? (
                      <Pressable onPress={() => setActiveTab("announcements")} style={{ paddingVertical: 6 }}>
                        <Text style={{ fontSize: 13, fontWeight: "600", color: c.primary }}>
                          View all {announcements.length} posts →
                        </Text>
                      </Pressable>
                    ) : null}
                  </StudentCard>
                </Animated.View>
              ) : null}
            </>
          ) : activeTab === "announcements" ? (
            <>
              <StudentCard title="Announcements">
                {announcements.length > 0 ? (
                  announcements.map((announcement) => (
                    <AnnouncementRow key={announcement.id} announcement={announcement} />
                  ))
                ) : (
                  <StudentEmptyCard label="No announcements from your teacher yet." />
                )}
              </StudentCard>
            </>
          ) : (
            <>
              {/* Live Session Banner — only when active */}
              {attendanceCandidates.length > 0 ? (
                <Animated.View entering={FadeInDown.duration(300)}>
                  <View
                    style={{
                      borderRadius: 14,
                      backgroundColor: c.danger,
                      padding: 16,
                      gap: 12,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" }} />
                      <Text style={{ fontSize: 16, fontWeight: "800", color: "#fff" }}>
                        {attendanceCandidates.length} Live Session{attendanceCandidates.length === 1 ? "" : "s"}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 13, color: "#fff", opacity: 0.85 }}>
                      Your teacher has started attendance. Mark your presence now.
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {attendanceCandidates.some(cand => cand.mode === "QR_GPS") ? (
                        <Link href={studentRoutes.qrAttendanceFromClassroom(props.classroomId) as never} asChild>
                          <Pressable
                            style={{
                              flex: 1,
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                              backgroundColor: "#fff",
                              borderRadius: 10,
                              paddingVertical: 12,
                            }}
                          >
                            <Ionicons name="qr-code-outline" size={18} color={c.danger} />
                            <Text style={{ fontSize: 14, fontWeight: "700", color: c.danger }}>Scan QR</Text>
                          </Pressable>
                        </Link>
                      ) : null}
                      {attendanceCandidates.some(cand => cand.mode === "BLUETOOTH") ? (
                        <Link href={studentRoutes.bluetoothAttendanceFromClassroom(props.classroomId) as never} asChild>
                          <Pressable
                            style={{
                              flex: 1,
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                              backgroundColor: "#fff",
                              borderRadius: 10,
                              paddingVertical: 12,
                            }}
                          >
                            <Ionicons name="bluetooth-outline" size={18} color={c.danger} />
                            <Text style={{ fontSize: 14, fontWeight: "700", color: c.danger }}>Bluetooth</Text>
                          </Pressable>
                        </Link>
                      ) : null}
                    </View>
                  </View>
                </Animated.View>
              ) : null}

              {/* Attendance Records */}
              <StudentCard title="Attendance Records">
                {totalRecords > 0 ? (
                  <View style={{ gap: 10 }}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <StatChip label="Total" value={String(totalRecords)} color={c.primary} bg={c.primarySoft} />
                      <StatChip label="Present" value={String(presentCount)} color={c.success} bg={c.successSoft} />
                      <StatChip label="Absent" value={String(absentCount)} color={c.danger} bg={c.dangerSoft} />
                    </View>
                    <View style={{ gap: 0, marginTop: 4 }}>
                      {historyItems
                        .sort((a, b) => new Date(b.lectureDate ?? b.markedAt ?? 0).getTime() - new Date(a.lectureDate ?? a.markedAt ?? 0).getTime())
                        .map((record, i, arr) => {
                          const isPresent = record.attendanceStatus === "PRESENT"
                          return (
                            <View
                              key={record.attendanceRecordId}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 10,
                                paddingVertical: 10,
                                borderBottomWidth: i < arr.length - 1 ? StyleSheet.hairlineWidth : 0,
                                borderBottomColor: c.border,
                              }}
                            >
                              <View
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 8,
                                  backgroundColor: isPresent ? c.successSoft : c.dangerSoft,
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Ionicons
                                  name={isPresent ? "checkmark" : "close"}
                                  size={16}
                                  color={isPresent ? c.success : c.danger}
                                />
                              </View>
                              <View style={{ flex: 1, gap: 1 }}>
                                <Text style={{ fontSize: 14, fontWeight: "500", color: c.text }} numberOfLines={1}>
                                  {record.lectureTitle ?? `Lecture ${arr.length - i}`}
                                </Text>
                                <Text style={{ fontSize: 12, color: c.textMuted }}>
                                  {formatDateTime(record.lectureDate ?? record.markedAt ?? new Date().toISOString())}
                                </Text>
                              </View>
                              <View
                                style={{
                                  paddingHorizontal: 8,
                                  paddingVertical: 3,
                                  borderRadius: 6,
                                  backgroundColor: isPresent ? c.successSoft : c.dangerSoft,
                                }}
                              >
                                <Text style={{
                                  fontSize: 11,
                                  fontWeight: "700",
                                  color: isPresent ? c.success : c.danger,
                                }}>
                                  {isPresent ? "Present" : "Absent"}
                                </Text>
                              </View>
                            </View>
                          )
                        })}
                    </View>
                  </View>
                ) : lectures.length > 0 ? (
                  <View style={{ gap: 0 }}>
                    <Text style={[styles.listMeta, { marginBottom: 6 }]}>
                      {lectures.length} lecture{lectures.length === 1 ? "" : "s"} scheduled
                    </Text>
                    {lectures.slice(0, 8).map((lecture, i) => (
                      <View
                        key={lecture.id}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                          paddingVertical: 8,
                          borderBottomWidth: i < Math.min(lectures.length, 8) - 1 ? StyleSheet.hairlineWidth : 0,
                          borderBottomColor: c.border,
                        }}
                      >
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            backgroundColor: c.surfaceTint,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: "700", color: c.textSubtle }}>
                            {lectures.length - i}
                          </Text>
                        </View>
                        <View style={{ flex: 1, gap: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: "500", color: c.text }} numberOfLines={1}>
                            {lecture.title ?? `Lecture ${lectures.length - i}`}
                          </Text>
                          <Text style={{ fontSize: 12, color: c.textMuted }}>
                            {formatDateTime(lecture.actualStartAt ?? lecture.plannedStartAt ?? lecture.lectureDate)}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11, fontWeight: "600", color: c.textSubtle }}>
                          {formatEnum(lecture.status)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <StudentEmptyCard label="No attendance records yet." />
                )}

                {classroom.membership ? (
                  <View style={{ marginTop: 10 }}>
                    <StudentNavAction
                      href={studentRoutes.subjectReport(classroom.membership.subjectId)}
                      label="View Detailed Report"
                      icon="bar-chart-outline"
                    />
                  </View>
                ) : null}
              </StudentCard>
            </>
          )}
        </>
      )}
    </StudentScreen>
  )
}

function StatChip(props: { label: string; value: string; color: string; bg: string }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        backgroundColor: props.bg,
        borderRadius: 10,
        paddingVertical: 10,
        gap: 2,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "800", color: props.color }}>{props.value}</Text>
      <Text style={{ fontSize: 11, fontWeight: "600", color: props.color }}>{props.label}</Text>
    </View>
  )
}

function QuickNavTile(props: {
  icon: React.ComponentProps<typeof Ionicons>["name"]
  label: string
  href: string | { pathname: string; params?: Record<string, string> }
  color: string
  bg: string
}) {
  return (
    <Link href={props.href} asChild>
      <Pressable
        style={{
          flex: 1,
          alignItems: "center",
          gap: 6,
          paddingVertical: 14,
          borderRadius: 14,
          backgroundColor: props.bg,
          borderWidth: 1,
          borderColor: props.color + "30",
        }}
      >
        <Ionicons name={props.icon} size={22} color={props.color} />
        <Text style={{ fontSize: 12, fontWeight: "700", color: props.color }}>{props.label}</Text>
      </Pressable>
    </Link>
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
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 11,
        borderRadius: 10,
        backgroundColor: props.active ? c.surfaceRaised : "transparent",
        ...(props.active ? mobileTheme.shadow.soft : {}),
      }}
    >
      <Ionicons name={props.icon} size={15} color={props.active ? c.primary : c.textSubtle} />
      <Text
        style={{
          fontSize: 13,
          fontWeight: props.active ? "700" : "500",
          color: props.active ? c.text : c.textMuted,
        }}
      >
        {props.label}
      </Text>
      {props.count != null && props.count > 0 ? (
        <View
          style={{
            backgroundColor: props.active ? c.primarySoft : c.surfaceTint,
            borderRadius: 8,
            paddingHorizontal: 6,
            paddingVertical: 1,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "700", color: props.active ? c.primary : c.textSubtle }}>
            {props.count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  )
}
