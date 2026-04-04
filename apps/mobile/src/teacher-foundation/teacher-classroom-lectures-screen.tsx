import { getColors, mobileTheme } from "@attendease/ui-mobile"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
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

import { mapTeacherApiErrorToMessage } from "../teacher-models"
import { teacherRoutes } from "../teacher-routes"
import { useTeacherSession } from "../teacher-session"
import {
  useTeacherAttendanceSessionsQuery,
  useTeacherClassroomDetailData,
  useTeacherCreateLectureMutation,
} from "./queries"
import { formatDateTime, styles } from "./shared-ui"

function fmtEnum(s: string) {
  return s
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

export function TeacherClassroomLecturesScreen(props: { classroomId: string }) {
  const { session } = useTeacherSession()
  const router = useRouter()
  const c = getColors()
  const classroom = useTeacherClassroomDetailData(props.classroomId)
  const lectureMutation = useTeacherCreateLectureMutation(props.classroomId)
  const classroomContext = teacherRoutes.classroomContext(props.classroomId)
  const [title, setTitle] = useState("")
  // Use local date (not UTC) so "today" matches the teacher's timezone
  const [lectureDate, setLectureDate] = useState(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, "0")
    const d = String(now.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  })
  const [showCreateForm, setShowCreateForm] = useState(false)

  const sessionsQuery = useTeacherAttendanceSessionsQuery()
  const sessions = sessionsQuery.data ?? []
  const lectures = classroom.lecturesQuery.data ?? []
  const nextLectureNumber = lectures.length + 1
  const defaultTitle = `Lecture ${nextLectureNumber}`
  const canLaunchBluetooth =
    classroom.detailQuery.data?.status !== "ARCHIVED" &&
    classroom.detailQuery.data?.status !== "COMPLETED"

  const isLoading = classroom.detailQuery.isLoading || classroom.lecturesQuery.isLoading
  const loadError = classroom.detailQuery.error ?? classroom.lecturesQuery.error

  if (!session) {
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

  if (isLoading) {
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
        <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 12 }}>Loading lectures…</Text>
      </View>
    )
  }

  if (loadError) {
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
          {mapTeacherApiErrorToMessage(loadError)}
        </Text>
      </View>
    )
  }

  // Sort by creation time descending so newest lectures appear first
  const sorted = [...lectures]
    .map((lecture, idx) => ({ lecture, idx }))
    .sort((a, b) => {
      const d =
        new Date(b.lecture.createdAt).getTime() - new Date(a.lecture.createdAt).getTime()
      return d !== 0 ? d : b.idx - a.idx
    })

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={ls.header}>
          <Text style={[ls.heading, { color: c.text }]}>
            {lectures.length} Lecture{lectures.length === 1 ? "" : "s"}
          </Text>
        </View>

        {/* ── Create form (inline) ── */}
        {showCreateForm ? (
          <View
            style={[ls.createCard, { backgroundColor: c.surfaceRaised, borderColor: c.border }]}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: c.text }}>New Lecture</Text>
            <TextInput
              value={title}
              autoCapitalize="sentences"
              placeholder="Lecture title (optional)"
              placeholderTextColor={c.textSubtle}
              onChangeText={setTitle}
              style={styles.input}
            />
            <TextInput
              value={lectureDate}
              autoCapitalize="none"
              placeholder="YYYY-MM-DD"
              placeholderTextColor={c.textSubtle}
              onChangeText={setLectureDate}
              style={styles.input}
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                style={[
                  styles.primaryButton,
                  {
                    flex: 1,
                    opacity: lectureMutation.isPending || lectureDate.trim().length < 10 ? 0.5 : 1,
                  },
                ]}
                disabled={lectureMutation.isPending || lectureDate.trim().length < 10}
                onPress={() =>
                  lectureMutation.mutate(
                    { title: title || defaultTitle, lectureDate: `${lectureDate}T00:00:00.000Z` },
                    {
                      onSuccess: () => {
                        setTitle("")
                        setShowCreateForm(false)
                      },
                    },
                  )
                }
              >
                <Text style={styles.primaryButtonLabel}>
                  {lectureMutation.isPending ? "Creating…" : "Create"}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.secondaryButton, { flex: 1 }]}
                onPress={() => setShowCreateForm(false)}
              >
                <Text style={styles.secondaryButtonLabel}>Cancel</Text>
              </Pressable>
            </View>
            {lectureMutation.error ? (
              <Text style={{ fontSize: 12, color: c.danger }}>
                {mapTeacherApiErrorToMessage(lectureMutation.error)}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* ── Lecture list ── */}
        <View style={ls.list}>
          {sorted.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 40, gap: 8 }}>
              <Ionicons name="book-outline" size={40} color={c.textSubtle} />
              <Text style={{ fontSize: 15, fontWeight: "600", color: c.text }}>
                No lectures yet
              </Text>
              <Text style={{ fontSize: 13, color: c.textMuted }}>
                Tap + to create your first lecture
              </Text>
            </View>
          ) : (
            sorted.map(({ lecture, idx }, i) => {
              const num = idx + 1
              // Always show the lecture creation timestamp
              const dateStr = formatDateTime(lecture.createdAt)
              const isCompleted = lecture.status === "COMPLETED"
              const isActive = lecture.status === "OPEN_FOR_ATTENDANCE"
              const hasSession = isActive || isCompleted
              const matchedSession = sessions.find((s) => s.lectureId === lecture.id)
              const sessionTotal = matchedSession
                ? matchedSession.presentCount + matchedSession.absentCount
                : 0
              const sessionPct =
                sessionTotal > 0
                  ? Math.round(((matchedSession?.presentCount ?? 0) / sessionTotal) * 100)
                  : null

              return (
                <Animated.View key={lecture.id} entering={FadeInDown.duration(220).delay(i * 35)}>
                  <Pressable
                    onPress={() => {
                      if (isCompleted && matchedSession) {
                        router.push(
                          teacherRoutes.sessionDetail(
                            matchedSession.id,
                            props.classroomId,
                          ) as never,
                        )
                      } else if (isCompleted) {
                        router.push(teacherRoutes.sessionHistory)
                      } else if (canLaunchBluetooth) {
                        router.push(classroomContext.bluetoothCreateForLecture(lecture.id) as never)
                      }
                    }}
                    style={[
                      ls.lectureCard,
                      {
                        backgroundColor: c.surfaceRaised,
                        borderColor: isActive ? c.successBorder : c.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        ls.lectureNum,
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
                          fontSize: 14,
                          fontWeight: "800",
                          color: isCompleted ? c.success : isActive ? c.primary : c.textSubtle,
                        }}
                      >
                        {num}
                      </Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text
                        style={{ fontSize: 15, fontWeight: "600", color: c.text }}
                        numberOfLines={1}
                      >
                        {lecture.title ?? `Lecture ${num}`}
                      </Text>
                      <Text style={{ fontSize: 12, color: c.textMuted }}>{dateStr}</Text>
                      {matchedSession && sessionPct !== null ? (
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "600",
                            color:
                              sessionPct >= 75
                                ? c.success
                                : sessionPct >= 50
                                  ? c.warning
                                  : c.danger,
                          }}
                        >
                          {matchedSession.presentCount}P / {matchedSession.absentCount}A ·{" "}
                          {sessionPct}%
                        </Text>
                      ) : null}
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      <View
                        style={[
                          ls.statusBadge,
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
                            fontSize: 10,
                            fontWeight: "700",
                            color: isCompleted ? c.success : isActive ? c.primary : c.textSubtle,
                          }}
                        >
                          {fmtEnum(lecture.status)}
                        </Text>
                      </View>
                      {isActive ? (
                        <Ionicons name="radio-outline" size={14} color={c.success} />
                      ) : null}
                      {canLaunchBluetooth && !hasSession ? (
                        <Ionicons name="bluetooth-outline" size={14} color={c.primary} />
                      ) : null}
                      {isCompleted ? (
                        <Ionicons name="checkmark-circle-outline" size={13} color={c.success} />
                      ) : null}
                    </View>
                  </Pressable>
                </Animated.View>
              )
            })
          )}
        </View>
      </ScrollView>

      {!showCreateForm ? (
        <Pressable
          onPress={() => {
            setTitle(`Lecture ${lectures.length + 1}`)
            setShowCreateForm(true)
          }}
          style={[ls.fab, { backgroundColor: c.primary, ...mobileTheme.shadow.glow }]}
        >
          <Ionicons name="add" size={28} color={c.primaryContrast} />
        </Pressable>
      ) : null}
    </View>
  )
}

const ls = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  heading: { fontSize: 18, fontWeight: "700" },
  createCard: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    marginBottom: 8,
  },
  list: { paddingHorizontal: 16, gap: 10 },
  lectureCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  lectureNum: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  fab: {
    position: "absolute",
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
})
