import { getColors } from "@attendease/ui-mobile"
import { Ionicons } from "@expo/vector-icons"
import { useMemo, useState } from "react"
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
import type { buildTeacherReportsStatus } from "../teacher-view-state"
import { formatDateTime } from "./shared-ui"

type ReportsStatus = ReturnType<typeof buildTeacherReportsStatus>

type ReportModel = {
  model: {
    availabilityMessage: string
    summaryCards: Array<{
      label: string
      value: string
      tone: "primary" | "success" | "warning" | "danger"
    }>
    filterSummary: string
    subjectSummary: string
    studentSummary: string
    daywiseSummary: string
    subjectRows: Array<{
      classroomId: string
      subjectId: string
      subjectTitle: string
      classroomTitle: string
      attendanceLabel: string
      sessionSummary: string
      tone: "primary" | "success" | "warning" | "danger"
      lastActivityLabel: string
      attendancePercentage: number
      totalSessions: number
      presentCount: number
      absentCount: number
    }>
    studentRows: Array<{
      classroomId: string
      studentId: string
      studentDisplayName: string
      classroomTitle: string
      subjectTitle: string
      attendanceLabel: string
      tone: "primary" | "success" | "warning" | "danger"
      followUpLabel: string
      sessionSummary: string
      lastSessionAt: string | null
      attendancePercentage: number
      presentSessions: number
      totalSessions: number
    }>
    daywiseRows: Array<{
      classroomId: string
      attendanceDate: string
      classroomTitle: string
      attendanceLabel: string
      sessionSummary: string
      tone: "primary" | "success" | "warning" | "danger"
      lastActivityLabel: string
      attendancePercentage: number
      presentCount: number
      totalStudents: number
    }>
    sessionTrendRows: Array<{
      sessionId: string
      classroomId: string
      classroomTitle: string
      subjectTitle: string
      startedAt: string | null
      endedAt: string | null
      status: string
      mode: string
      presentCount: number
      absentCount: number
      totalStudents: number
      attendancePercentage: number
      tone: "primary" | "success" | "warning" | "danger"
    }>
  }
  filterOptions: {
    classroomOptions: Array<{ label: string; value: string }>
    subjectOptions: Array<{ label: string; value: string }>
  }
  classroomsQuery: { isLoading: boolean; error: unknown | null }
  sessionsQuery: { isLoading: boolean; error: unknown | null }
  daywiseQuery: { isLoading: boolean; error: unknown | null }
  subjectwiseQuery: { isLoading: boolean; error: unknown | null }
  studentPercentagesQuery: { isLoading: boolean; error: unknown | null }
  subjectOptionsQuery: { isLoading: boolean; error: unknown | null }
}

type Props = {
  session: unknown
  reports: ReportModel
  selectedClassroomId: string
  selectedSubjectId: string
  reportsStatus: ReportsStatus
  setSelectedClassroomId: (classroomId: string) => void
  setSelectedSubjectId: (subjectId: string) => void
}

type TabKey = "students" | "subjects" | "trends"

const TABS: Array<{ key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "students", label: "Students", icon: "people-outline" },
  { key: "subjects", label: "Subjects", icon: "library-outline" },
  { key: "trends", label: "Trends", icon: "trending-up-outline" },
]

function toneColor(tone: string, c: ReturnType<typeof getColors>) {
  if (tone === "success") return c.success
  if (tone === "warning") return c.warning
  if (tone === "danger") return c.danger
  return c.primary
}

function toneBg(tone: string, c: ReturnType<typeof getColors>) {
  if (tone === "success") return c.successSoft
  if (tone === "warning") return c.warningSoft
  if (tone === "danger") return c.dangerSoft
  return c.primarySoft
}

// ── Attendance bar component ──
function AttendanceBar({
  percentage,
  tone,
  c,
}: { percentage: number; tone: string; c: ReturnType<typeof getColors> }) {
  return (
    <View style={[rs.barTrack, { backgroundColor: c.surfaceTint }]}>
      <View
        style={[
          rs.barFill,
          {
            width: `${Math.min(100, Math.max(0, percentage))}%`,
            backgroundColor: toneColor(tone, c),
          },
        ]}
      />
    </View>
  )
}

export function TeacherReportsScreenContent({
  session,
  reports,
  selectedClassroomId,
  selectedSubjectId,
  reportsStatus,
  setSelectedClassroomId,
  setSelectedSubjectId,
}: Props) {
  const c = getColors()
  const insets = useSafeAreaInsets()
  const [classroomOpen, setClassroomOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>("students")
  const [studentSearch, setStudentSearch] = useState("")
  const [showAllStudents, setShowAllStudents] = useState(false)
  const [showAllTrends, setShowAllTrends] = useState(false)

  const isLoading =
    reports.classroomsQuery.isLoading ||
    reports.sessionsQuery.isLoading ||
    reports.daywiseQuery.isLoading ||
    reports.subjectwiseQuery.isLoading ||
    reports.studentPercentagesQuery.isLoading ||
    reports.subjectOptionsQuery.isLoading
  const loadError =
    reports.classroomsQuery.error ??
    reports.daywiseQuery.error ??
    reports.subjectwiseQuery.error ??
    reports.studentPercentagesQuery.error ??
    reports.subjectOptionsQuery.error

  const selectedClassroomLabel = selectedClassroomId
    ? (reports.filterOptions.classroomOptions.find((o) => o.value === selectedClassroomId)?.label ??
      "All Classes")
    : "All Classes"

  // ── Sorted & grouped students ──
  const { atRiskStudents, healthyStudents, filteredStudents } = useMemo(() => {
    const query = studentSearch.trim().toLowerCase()
    const all = [...reports.model.studentRows].sort(
      (a, b) => a.attendancePercentage - b.attendancePercentage,
    )
    const filtered = query
      ? all.filter((r) => r.studentDisplayName.toLowerCase().includes(query))
      : all
    const atRisk = filtered.filter((r) => r.followUpLabel.toLowerCase().includes("follow"))
    const healthy = filtered.filter((r) => !r.followUpLabel.toLowerCase().includes("follow"))
    return { atRiskStudents: atRisk, healthyStudents: healthy, filteredStudents: filtered }
  }, [reports.model.studentRows, studentSearch])

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
        <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 12 }}>Loading reports…</Text>
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

  // ── Render student row ──
  function renderStudentRow(row: (typeof reports.model.studentRows)[0], i: number) {
    const isAtRisk = row.followUpLabel.toLowerCase().includes("follow")
    return (
      <Animated.View
        key={`${row.classroomId}-${row.studentId}`}
        entering={FadeInDown.duration(150).delay(i * 20)}
      >
        <View style={[rs.studentRow, { backgroundColor: c.surfaceRaised, borderColor: c.border }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={[
                rs.avatar,
                { backgroundColor: isAtRisk ? toneBg(row.tone, c) : c.surfaceTint },
              ]}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "800",
                  color: isAtRisk ? toneColor(row.tone, c) : c.primary,
                }}
              >
                {row.studentDisplayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: c.text }} numberOfLines={1}>
                {row.studentDisplayName}
              </Text>
              <Text style={{ fontSize: 11, color: c.textMuted }} numberOfLines={1}>
                {row.subjectTitle} · {row.presentSessions}/{row.totalSessions} present
              </Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 2 }}>
              <Text style={{ fontSize: 14, fontWeight: "800", color: toneColor(row.tone, c) }}>
                {row.attendancePercentage}%
              </Text>
              {isAtRisk ? (
                <View style={[rs.riskBadge, { backgroundColor: toneBg(row.tone, c) }]}>
                  <Text style={{ fontSize: 9, fontWeight: "700", color: toneColor(row.tone, c) }}>
                    {row.followUpLabel.toLowerCase().includes("immediate") ? "CRITICAL" : "AT RISK"}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
          <AttendanceBar percentage={row.attendancePercentage} tone={row.tone} c={c} />
        </View>
      </Animated.View>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.surface }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={[rs.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[rs.heading, { color: c.text }]}>Reports</Text>
      </View>

      {/* ── Classroom filter ── */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <Pressable
          onPress={() => setClassroomOpen((v) => !v)}
          style={[
            rs.dropdownTrigger,
            { borderColor: classroomOpen ? c.primary : c.border, backgroundColor: c.surfaceRaised },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
            <Ionicons name="school-outline" size={16} color={c.textSubtle} />
            <Text style={{ fontSize: 14, fontWeight: "600", color: c.text }} numberOfLines={1}>
              {selectedClassroomLabel}
            </Text>
          </View>
          <Ionicons
            name={classroomOpen ? "chevron-up" : "chevron-down"}
            size={16}
            color={c.textSubtle}
          />
        </Pressable>
        {classroomOpen ? (
          <View
            style={[rs.dropdownMenu, { borderColor: c.border, backgroundColor: c.surfaceRaised }]}
          >
            <Pressable
              onPress={() => {
                setSelectedClassroomId("")
                setClassroomOpen(false)
              }}
              style={[rs.dropdownItem, !selectedClassroomId && { backgroundColor: c.primarySoft }]}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: !selectedClassroomId ? c.primary : c.text,
                  fontWeight: !selectedClassroomId ? "700" : "400",
                }}
              >
                All Classes
              </Text>
              {!selectedClassroomId ? (
                <Ionicons name="checkmark" size={16} color={c.primary} />
              ) : null}
            </Pressable>
            {reports.filterOptions.classroomOptions.map((opt) => {
              const active = selectedClassroomId === opt.value
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    setSelectedClassroomId(opt.value)
                    setClassroomOpen(false)
                  }}
                  style={[rs.dropdownItem, active && { backgroundColor: c.primarySoft }]}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      color: active ? c.primary : c.text,
                      fontWeight: active ? "700" : "400",
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {opt.label}
                  </Text>
                  {active ? <Ionicons name="checkmark" size={16} color={c.primary} /> : null}
                </Pressable>
              )
            })}
          </View>
        ) : null}
      </View>

      {/* ── Summary stats (3-card row) ── */}
      {reports.model.summaryCards.length > 0 ? (
        <View style={rs.statsRow}>
          {reports.model.summaryCards.map((card) => (
            <View
              key={card.label}
              style={[rs.statCell, { backgroundColor: c.surfaceRaised, borderColor: c.border }]}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "600",
                  color: c.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {card.label}
              </Text>
              <Text style={{ fontSize: 18, fontWeight: "800", color: toneColor(card.tone, c) }}>
                {card.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* ── Tab bar ── */}
      <View style={[rs.tabBar, { borderBottomColor: c.border }]}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key
          const count =
            tab.key === "students"
              ? filteredStudents.length
              : tab.key === "subjects"
                ? reports.model.subjectRows.length
                : reports.model.sessionTrendRows.length
          return (
            <Pressable
              key={tab.key}
              onPress={() => {
                setActiveTab(tab.key)
                setShowAllStudents(false)
                setShowAllTrends(false)
              }}
              style={[rs.tab, active && { borderBottomColor: c.primary, borderBottomWidth: 2 }]}
            >
              <Ionicons name={tab.icon} size={16} color={active ? c.primary : c.textMuted} />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: active ? "700" : "500",
                  color: active ? c.primary : c.textMuted,
                }}
              >
                {tab.label}
              </Text>
              {count > 0 ? (
                <View
                  style={[rs.tabBadge, { backgroundColor: active ? c.primarySoft : c.surfaceTint }]}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color: active ? c.primary : c.textSubtle,
                    }}
                  >
                    {count}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          )
        })}
      </View>

      {/* ── Tab content ── */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 8 }}>
        {/* ── STUDENTS TAB ── */}
        {activeTab === "students" ? (
          reports.model.studentRows.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 32 }}>
              <Ionicons name="people-outline" size={36} color={c.textSubtle} />
              <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 8 }}>
                No student data for these filters
              </Text>
            </View>
          ) : (
            <>
              {/* Search */}
              <View
                style={[rs.searchBar, { backgroundColor: c.surfaceRaised, borderColor: c.border }]}
              >
                <Ionicons name="search-outline" size={16} color={c.textSubtle} />
                <TextInput
                  style={{ flex: 1, fontSize: 13, color: c.text, paddingVertical: 0 }}
                  placeholder="Search students..."
                  placeholderTextColor={c.textSubtle}
                  value={studentSearch}
                  onChangeText={setStudentSearch}
                />
                {studentSearch ? (
                  <Pressable onPress={() => setStudentSearch("")}>
                    <Ionicons name="close-circle" size={16} color={c.textSubtle} />
                  </Pressable>
                ) : null}
              </View>

              {filteredStudents.length === 0 ? (
                <Text
                  style={{
                    fontSize: 13,
                    color: c.textMuted,
                    textAlign: "center",
                    paddingVertical: 16,
                  }}
                >
                  No students match "{studentSearch}"
                </Text>
              ) : (
                <>
                  {/* At-risk section */}
                  {atRiskStudents.length > 0 ? (
                    <>
                      <View style={[rs.sectionHeader, { backgroundColor: c.dangerSoft }]}>
                        <Ionicons name="warning-outline" size={14} color={c.danger} />
                        <Text style={{ fontSize: 12, fontWeight: "700", color: c.danger }}>
                          Needs Attention ({atRiskStudents.length})
                        </Text>
                      </View>
                      {(showAllStudents ? atRiskStudents : atRiskStudents.slice(0, 10)).map(
                        (row, i) => renderStudentRow(row, i),
                      )}
                    </>
                  ) : null}

                  {/* Healthy section */}
                  {healthyStudents.length > 0 ? (
                    <>
                      <View style={[rs.sectionHeader, { backgroundColor: c.successSoft }]}>
                        <Ionicons name="checkmark-circle-outline" size={14} color={c.success} />
                        <Text style={{ fontSize: 12, fontWeight: "700", color: c.success }}>
                          Healthy ({healthyStudents.length})
                        </Text>
                      </View>
                      {(showAllStudents ? healthyStudents : healthyStudents.slice(0, 5)).map(
                        (row, i) => renderStudentRow(row, i + atRiskStudents.length),
                      )}
                    </>
                  ) : null}

                  {/* Show all toggle */}
                  {!showAllStudents && filteredStudents.length > 10 ? (
                    <Pressable
                      onPress={() => setShowAllStudents(true)}
                      style={{ alignItems: "center", paddingVertical: 10 }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "600", color: c.primary }}>
                        Show all {filteredStudents.length} students
                      </Text>
                    </Pressable>
                  ) : null}
                </>
              )}
            </>
          )
        ) : null}

        {/* ── SUBJECTS TAB ── */}
        {activeTab === "subjects" ? (
          reports.model.subjectRows.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 32 }}>
              <Ionicons name="library-outline" size={36} color={c.textSubtle} />
              <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 8 }}>
                No subject data for these filters
              </Text>
            </View>
          ) : (
            reports.model.subjectRows.map((row, i) => (
              <Animated.View
                key={`${row.classroomId}-${row.subjectId}`}
                entering={FadeInDown.duration(150).delay(i * 30)}
              >
                <View
                  style={[
                    rs.subjectCard,
                    { backgroundColor: c.surfaceRaised, borderColor: c.border },
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={[rs.avatar, { backgroundColor: toneBg(row.tone, c) }]}>
                      <Ionicons name="library-outline" size={16} color={toneColor(row.tone, c)} />
                    </View>
                    <View style={{ flex: 1, gap: 1 }}>
                      <Text
                        style={{ fontSize: 14, fontWeight: "700", color: c.text }}
                        numberOfLines={1}
                      >
                        {row.subjectTitle}
                      </Text>
                      <Text style={{ fontSize: 11, color: c.textMuted }} numberOfLines={1}>
                        {row.classroomTitle}
                      </Text>
                    </View>
                    <Text
                      style={{ fontSize: 18, fontWeight: "800", color: toneColor(row.tone, c) }}
                    >
                      {row.attendancePercentage}%
                    </Text>
                  </View>
                  <AttendanceBar percentage={row.attendancePercentage} tone={row.tone} c={c} />
                  <View
                    style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}
                  >
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        backgroundColor: c.surfaceTint,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: "600", color: c.textMuted }}>
                        {row.totalSessions} sessions
                      </Text>
                    </View>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        backgroundColor: c.successSoft,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: "600", color: c.success }}>
                        {row.presentCount} present
                      </Text>
                    </View>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        backgroundColor: c.dangerSoft,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: "600", color: c.danger }}>
                        {row.absentCount} absent
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 10, color: c.textSubtle }}>{row.lastActivityLabel}</Text>
                </View>
              </Animated.View>
            ))
          )
        ) : null}

        {/* ── TRENDS TAB ── */}
        {activeTab === "trends" ? (
          reports.model.sessionTrendRows.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 32 }}>
              <Ionicons name="trending-up-outline" size={36} color={c.textSubtle} />
              <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 8 }}>
                No session data for these filters
              </Text>
            </View>
          ) : (
            <>
              {(showAllTrends
                ? reports.model.sessionTrendRows
                : reports.model.sessionTrendRows.slice(0, 15)
              ).map((row, i) => {
                const dt = row.startedAt ? new Date(row.startedAt) : null
                const timeStr = dt
                  ? dt.toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })
                  : "—"
                const modeIcon: keyof typeof Ionicons.glyphMap =
                  row.mode === "BLUETOOTH" ? "bluetooth-outline" : "qr-code-outline"
                return (
                  <Animated.View
                    key={row.sessionId}
                    entering={FadeInDown.duration(150).delay(i * 20)}
                  >
                    <View
                      style={[
                        rs.trendRow,
                        { backgroundColor: c.surfaceRaised, borderColor: c.border },
                      ]}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <View style={[rs.dateBadge, { backgroundColor: toneBg(row.tone, c) }]}>
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "800",
                              color: toneColor(row.tone, c),
                            }}
                          >
                            {dt ? dt.toLocaleDateString("en-IN", { day: "2-digit" }) : "—"}
                          </Text>
                          <Text
                            style={{
                              fontSize: 8,
                              fontWeight: "600",
                              color: toneColor(row.tone, c),
                              opacity: 0.7,
                            }}
                          >
                            {dt ? dt.toLocaleDateString("en-IN", { month: "short" }) : ""}
                          </Text>
                        </View>
                        <View style={{ flex: 1, gap: 3 }}>
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Text
                              style={{ fontSize: 13, fontWeight: "600", color: c.text, flex: 1 }}
                              numberOfLines={1}
                            >
                              {row.subjectTitle}
                            </Text>
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "800",
                                color: toneColor(row.tone, c),
                              }}
                            >
                              {row.attendancePercentage}%
                            </Text>
                          </View>
                          <AttendanceBar
                            percentage={row.attendancePercentage}
                            tone={row.tone}
                            c={c}
                          />
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <Text style={{ fontSize: 10, color: c.textMuted }}>
                              {row.presentCount}P / {row.absentCount}A · {row.classroomTitle}
                            </Text>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                              <Ionicons name={modeIcon} size={10} color={c.textSubtle} />
                              <Text style={{ fontSize: 10, color: c.textSubtle }}>{timeStr}</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                  </Animated.View>
                )
              })}
              {!showAllTrends && reports.model.sessionTrendRows.length > 15 ? (
                <Pressable
                  onPress={() => setShowAllTrends(true)}
                  style={{ alignItems: "center", paddingVertical: 10 }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: c.primary }}>
                    Show all {reports.model.sessionTrendRows.length} sessions
                  </Text>
                </Pressable>
              ) : null}
            </>
          )
        ) : null}
      </View>
    </ScrollView>
  )
}

const rs = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 6 },
  heading: { fontSize: 22, fontWeight: "800" },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownMenu: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  statCell: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 2,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginTop: 8,
    marginHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  studentRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  riskBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  barTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  barFill: { height: 4, borderRadius: 2 },
  subjectCard: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 8 },
  trendRow: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  dateBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
})
