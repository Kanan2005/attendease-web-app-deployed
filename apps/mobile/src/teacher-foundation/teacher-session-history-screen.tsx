import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { getColors } from "@attendease/ui-mobile"
import { StatCard } from "@attendease/ui-mobile/animated"
import { Link } from "expo-router"
import Animated, { FadeInDown } from "react-native-reanimated"

import { mapTeacherApiErrorToMessage } from "../teacher-models"
import { teacherRoutes } from "../teacher-routes"
import { useTeacherSession } from "../teacher-session"
import { useTeacherAttendanceSessionsQuery } from "./queries"
import { formatDateTime, formatEnum } from "./shared-ui"

export function TeacherSessionHistoryScreen() {
  const { session } = useTeacherSession()
  const c = getColors()
  const historyQuery = useTeacherAttendanceSessionsQuery()
  const liveSessions = (historyQuery.data ?? []).filter((s) => s.status === "ACTIVE")
  const pastSessions = (historyQuery.data ?? []).filter((s) => s.status !== "ACTIVE")
  const correctionOpenCount = pastSessions.filter((s) => s.editability.isEditable).length
  const totalMarked = (historyQuery.data ?? []).reduce((sum, s) => sum + s.presentCount, 0)

  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Ionicons name="lock-closed-outline" size={40} color={c.textSubtle} />
        <Text style={{ fontSize: 16, fontWeight: "600", color: c.text, marginTop: 12 }}>Sign in required</Text>
      </View>
    )
  }

  if (historyQuery.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 12 }}>Loading sessions…</Text>
      </View>
    )
  }

  if (historyQuery.error) {
    return (
      <View style={{ flex: 1, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Ionicons name="alert-circle" size={40} color={c.danger} />
        <Text style={{ fontSize: 14, color: c.danger, marginTop: 12, textAlign: "center" }}>{mapTeacherApiErrorToMessage(historyQuery.error)}</Text>
      </View>
    )
  }

  if (!historyQuery.data?.length) {
    return (
      <View style={{ flex: 1, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Ionicons name="time-outline" size={40} color={c.textSubtle} />
        <Text style={{ fontSize: 16, fontWeight: "600", color: c.text, marginTop: 12 }}>No sessions yet</Text>
        <Text style={{ fontSize: 13, color: c.textMuted, marginTop: 4 }}>Sessions will appear here after attendance is taken</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.surface }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Stats ── */}
      <View style={hs.statsRow}>
        <StatCard label="Live" value={liveSessions.length} tone="success" index={0} />
        <StatCard label="Corrections" value={correctionOpenCount} tone="warning" index={1} />
        <StatCard label="Saved" value={pastSessions.length} tone="primary" index={2} />
        <StatCard label="Students Marked" value={totalMarked} tone="primary" index={3} />
      </View>
      {correctionOpenCount > 0 ? (
        <Text style={{ fontSize: 12, color: c.warning, fontWeight: "600", paddingHorizontal: 16, marginBottom: 4 }}>
          {correctionOpenCount} session{correctionOpenCount === 1 ? "" : "s"} still open for correction
        </Text>
      ) : null}

      {/* ── Live Now ── */}
      {liveSessions.length > 0 ? (
        <View style={hs.section}>
          <Text style={[hs.sectionTitle, { color: c.text }]}>Live Now</Text>
          {liveSessions.map((s, i) => (
            <Animated.View key={s.id} entering={FadeInDown.duration(200).delay(i * 30)}>
              <Link href={teacherRoutes.sessionDetail(s.id)} asChild>
                <Pressable style={[hs.card, { backgroundColor: c.surfaceRaised, borderColor: c.success }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={[hs.iconCircle, { backgroundColor: c.successSoft }]}>
                      <Ionicons name="radio" size={16} color={c.success} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }} numberOfLines={1}>{s.classroomDisplayTitle}</Text>
                      <Text style={{ fontSize: 11, color: c.textMuted }} numberOfLines={1}>
                        {s.lectureTitle ?? "Attendance session"} · {formatEnum(s.mode)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={c.textSubtle} />
                  </View>
                  <View style={{ flexDirection: "row", gap: 16, marginLeft: 44 }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: c.success }}>{s.presentCount} present</Text>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: c.danger }}>{s.absentCount} absent</Text>
                  </View>
                </Pressable>
              </Link>
            </Animated.View>
          ))}
        </View>
      ) : null}

      {/* ── Recently Saved ── */}
      {pastSessions.length > 0 ? (
        <View style={hs.section}>
          <Text style={[hs.sectionTitle, { color: c.text }]}>Recently Saved</Text>
          {pastSessions.map((s, i) => {
            const isEditable = s.editability.isEditable
            return (
              <Animated.View key={s.id} entering={FadeInDown.duration(200).delay(i * 25)}>
                <Link href={teacherRoutes.sessionDetail(s.id)} asChild>
                  <Pressable style={[hs.card, { backgroundColor: c.surfaceRaised, borderColor: c.border }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View style={[hs.iconCircle, { backgroundColor: isEditable ? c.warningSoft : c.primarySoft }]}>
                        <Ionicons name={isEditable ? "create-outline" : "checkmark-done"} size={16} color={isEditable ? c.warning : c.primary} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }} numberOfLines={1}>{s.classroomDisplayTitle}</Text>
                        <Text style={{ fontSize: 11, color: c.textMuted }} numberOfLines={1}>
                          {s.lectureTitle ?? "Attendance session"} · {formatEnum(s.mode)}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={c.textSubtle} />
                    </View>
                    <View style={{ marginLeft: 44, gap: 2 }}>
                      <View style={{ flexDirection: "row", gap: 16 }}>
                        <Text style={{ fontSize: 12, fontWeight: "600", color: c.success }}>{s.presentCount} present</Text>
                        <Text style={{ fontSize: 12, fontWeight: "600", color: c.danger }}>{s.absentCount} absent</Text>
                      </View>
                      <Text style={{ fontSize: 11, color: c.textMuted }}>
                        Ended {formatDateTime(s.endedAt ?? s.startedAt ?? s.lectureDate ?? new Date().toISOString())}
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: "600", color: isEditable ? c.warning : c.textSubtle }}>
                        {isEditable
                          ? `Corrections open${s.editableUntil ? ` until ${formatDateTime(s.editableUntil)}` : ""}`
                          : "Final result"}
                      </Text>
                    </View>
                  </Pressable>
                </Link>
              </Animated.View>
            )
          })}
        </View>
      ) : null}
    </ScrollView>
  )
}

const hs = StyleSheet.create({
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  section: { paddingHorizontal: 16, marginTop: 12, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 8 },
  iconCircle: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
})
