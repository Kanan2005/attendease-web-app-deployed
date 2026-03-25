import { getColors } from "@attendease/ui-mobile"
import { StatCard } from "@attendease/ui-mobile/animated"
import { Ionicons } from "@expo/vector-icons"
import { Link } from "expo-router"
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { mapTeacherApiErrorToMessage } from "../teacher-models"
import { teacherRoutes } from "../teacher-routes"
import { useTeacherSession } from "../teacher-session"
import { useTeacherDashboardData } from "./queries"
import { formatDateTime, formatEnum, resolveTeacherDashboardActionHref } from "./shared-ui"

export function TeacherDashboardScreen() {
  const { session, signOut } = useTeacherSession()
  const c = getColors()
  const insets = useSafeAreaInsets()
  const dashboard = useTeacherDashboardData()
  const firstClassroom = dashboard.classroomsQuery.data?.[0] ?? null
  const firstClassroomContext = firstClassroom
    ? teacherRoutes.classroomContext(firstClassroom.id)
    : null
  const dashboardError =
    dashboard.meQuery.error ??
    dashboard.assignmentsQuery.error ??
    dashboard.classroomsQuery.error ??
    dashboard.sessionsQuery.error
  const isLoading =
    dashboard.meQuery.isLoading ||
    dashboard.assignmentsQuery.isLoading ||
    dashboard.classroomsQuery.isLoading ||
    dashboard.sessionsQuery.isLoading

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
        <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 12 }}>Loading dashboard…</Text>
      </View>
    )
  }

  if (dashboardError) {
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
          {mapTeacherApiErrorToMessage(dashboardError)}
        </Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.surface }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={[ds.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[ds.heading, { color: c.text }]}>{dashboard.model.greeting}</Text>
        <Text style={{ fontSize: 13, color: c.textMuted }}>
          Classrooms, attendance, and sessions at a glance
        </Text>
      </View>

      {/* ── Spotlight ── */}
      <Animated.View entering={FadeInDown.duration(250).delay(50)}>
        <View
          style={[ds.spotlightCard, { backgroundColor: c.primarySoft, borderColor: c.primary }]}
        >
          <Text style={{ fontSize: 15, fontWeight: "700", color: c.primary }}>
            {dashboard.model.spotlight.title}
          </Text>
          <Text style={{ fontSize: 13, color: c.text }}>{dashboard.model.spotlight.message}</Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
            <Link
              href={resolveTeacherDashboardActionHref(
                dashboard.model.spotlight.primaryAction,
                firstClassroomContext,
              )}
              asChild
            >
              <Pressable style={[ds.spotlightBtn, { backgroundColor: c.primary }]}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: c.primaryContrast }}>
                  {dashboard.model.spotlight.primaryAction.label}
                </Text>
              </Pressable>
            </Link>
            {dashboard.model.spotlight.secondaryAction ? (
              <Link
                href={resolveTeacherDashboardActionHref(
                  dashboard.model.spotlight.secondaryAction,
                  firstClassroomContext,
                )}
                asChild
              >
                <Pressable
                  style={[
                    ds.spotlightBtn,
                    { backgroundColor: c.surfaceRaised, borderWidth: 1, borderColor: c.border },
                  ]}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: c.text }}>
                    {dashboard.model.spotlight.secondaryAction.label}
                  </Text>
                </Pressable>
              </Link>
            ) : null}
          </View>
        </View>
      </Animated.View>

      {/* ── Today at a glance ── */}
      {dashboard.model.summaryCards.length > 0 ? (
        <View style={ds.statsRow}>
          {dashboard.model.summaryCards.map((card, i) => (
            <StatCard
              key={card.label}
              label={card.label}
              value={card.value}
              tone={card.tone}
              index={i}
            />
          ))}
        </View>
      ) : null}

      {/* ── Classrooms ── */}
      <View style={ds.section}>
        <Text style={[ds.sectionTitle, { color: c.text }]}>Classrooms</Text>
        {dashboard.model.classroomHighlights.length ? (
          dashboard.model.classroomHighlights.map((classroom, i) => {
            const ctx = teacherRoutes.classroomContext(classroom.classroomId)
            return (
              <Animated.View
                key={classroom.classroomId}
                entering={FadeInDown.duration(200).delay(i * 30)}
              >
                <Link href={ctx.detail} asChild>
                  <Pressable
                    style={[ds.card, { backgroundColor: c.surfaceRaised, borderColor: c.border }]}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View style={[ds.iconCircle, { backgroundColor: c.primarySoft }]}>
                        <Ionicons name="library-outline" size={16} color={c.primary} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text
                          style={{ fontSize: 14, fontWeight: "700", color: c.text }}
                          numberOfLines={1}
                        >
                          {classroom.title}
                        </Text>
                        <Text style={{ fontSize: 11, color: c.textMuted }} numberOfLines={1}>
                          {classroom.supportingText}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={c.textSubtle} />
                    </View>
                    <View style={{ flexDirection: "row", gap: 12, marginLeft: 44 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Ionicons name="radio-outline" size={12} color={c.textSubtle} />
                        <Text style={{ fontSize: 11, color: c.textMuted }}>
                          {classroom.sessionStateLabel}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Ionicons name="key-outline" size={12} color={c.textSubtle} />
                        <Text style={{ fontSize: 11, color: c.textMuted }}>
                          {classroom.joinCodeLabel}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                </Link>
              </Animated.View>
            )
          })
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 24 }}>
            <Ionicons name="school-outline" size={32} color={c.textSubtle} />
            <Text style={{ fontSize: 13, color: c.textMuted, marginTop: 6 }}>
              No classrooms yet
            </Text>
          </View>
        )}
      </View>

      {/* ── Recent sessions ── */}
      <View style={ds.section}>
        <Text style={[ds.sectionTitle, { color: c.text }]}>Recent Sessions</Text>
        {dashboard.model.recentSessions.length ? (
          dashboard.model.recentSessions.map((item, i) => {
            const isLive = item.isLive
            return (
              <Animated.View key={item.id} entering={FadeInDown.duration(200).delay(i * 25)}>
                <Link href={teacherRoutes.sessionDetail(item.id)} asChild>
                  <Pressable
                    style={[ds.card, { backgroundColor: c.surfaceRaised, borderColor: c.border }]}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View
                        style={[
                          ds.iconCircle,
                          { backgroundColor: isLive ? c.successSoft : c.surfaceTint },
                        ]}
                      >
                        <Ionicons
                          name={isLive ? "radio" : "timer-outline"}
                          size={16}
                          color={isLive ? c.success : c.textSubtle}
                        />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text
                          style={{ fontSize: 14, fontWeight: "700", color: c.text }}
                          numberOfLines={1}
                        >
                          {item.classroomTitle}
                        </Text>
                        <Text style={{ fontSize: 11, color: c.textMuted }} numberOfLines={1}>
                          {item.title} · {formatEnum(item.mode)} · {formatEnum(item.status)}
                        </Text>
                        <Text style={{ fontSize: 11, color: c.textMuted }}>
                          {item.presentCount} present / {item.absentCount} absent ·{" "}
                          {formatDateTime(item.timestamp)}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={c.textSubtle} />
                    </View>
                  </Pressable>
                </Link>
              </Animated.View>
            )
          })
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 24 }}>
            <Ionicons name="time-outline" size={32} color={c.textSubtle} />
            <Text style={{ fontSize: 13, color: c.textMuted, marginTop: 6 }}>No sessions yet</Text>
          </View>
        )}
      </View>

      {/* ── Sign out ── */}
      <View style={[ds.section, { marginTop: 24 }]}>
        <Pressable
          onPress={signOut}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: c.dangerBorder,
            backgroundColor: c.dangerSoft,
            paddingVertical: 14,
          }}
        >
          <Ionicons name="log-out-outline" size={18} color={c.danger} />
          <Text style={{ color: c.danger, fontSize: 15, fontWeight: "700" }}>Sign out</Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}

const ds = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  heading: { fontSize: 22, fontWeight: "800" },
  spotlightCard: { marginHorizontal: 16, borderWidth: 1, borderRadius: 14, padding: 16, gap: 6 },
  spotlightBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  section: { paddingHorizontal: 16, marginTop: 16, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 8 },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
})
