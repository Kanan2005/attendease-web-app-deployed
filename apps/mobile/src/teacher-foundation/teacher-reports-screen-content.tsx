import { getColors } from "@attendease/ui-mobile"
import { Ionicons } from "@expo/vector-icons"
import { useCallback, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { mapTeacherApiErrorToMessage } from "../teacher-models"
import type { buildTeacherReportsStatus } from "../teacher-view-state"
import { useTeacherSendThresholdEmailsMutation } from "./queries-reports"
import { TeacherProfileButton, formatDateTime } from "./shared-ui"

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
      studentEmail: string
      studentParentEmail: string | null
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

type TabKey = "students" | "email" | "trends"

const TABS: Array<{ key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "students", label: "Students", icon: "people-outline" },
  { key: "email", label: "Send Email", icon: "mail-outline" },
  { key: "trends", label: "Trends", icon: "trending-up-outline" },
]

const EMAIL_SUBJECT_TEMPLATE =
  "Attendance below {{thresholdPercent}} for {{classroomTitle}}"
const EMAIL_BODY_TEMPLATE = [
  "Hello,",
  "",
  "This is regarding {{studentName}}'s attendance for {{subjectTitle}} in {{classroomTitle}}, which is currently {{attendancePercentage}} — below the required threshold of {{thresholdPercent}}.",
  "",
  "Please take necessary steps to improve attendance.",
  "",
  "Regards,",
  "AttendEase",
].join("\n")

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
  // (showAllTrends removed — trends tab now shows a bar chart)

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
  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase()
    const belowThreshold = [...reports.model.studentRows]
      .filter((r) => r.attendancePercentage < 75)
      .sort((a, b) => a.attendancePercentage - b.attendancePercentage)
    return query
      ? belowThreshold.filter((r) => r.studentDisplayName.toLowerCase().includes(query))
      : belowThreshold
  }, [reports.model.studentRows, studentSearch])

  // ── Email tab state ──
  const [emailThreshold, setEmailThreshold] = useState(75)
  const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(new Set())
  const [emailStudentsToggle, setEmailStudentsToggle] = useState(true)
  const [emailParentsToggle, setEmailParentsToggle] = useState(true)
  const sendEmailMutation = useTeacherSendThresholdEmailsMutation()

  const emailEligibleStudents = useMemo(() => {
    return [...reports.model.studentRows]
      .filter((r) => r.attendancePercentage < emailThreshold)
      .sort((a, b) => a.attendancePercentage - b.attendancePercentage)
  }, [reports.model.studentRows, emailThreshold])

  const allEmailSelected =
    emailEligibleStudents.length > 0 &&
    emailEligibleStudents.every((r) => selectedEmailIds.has(r.studentId))

  const toggleEmailStudent = useCallback((studentId: string) => {
    setSelectedEmailIds((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) next.delete(studentId)
      else next.add(studentId)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (allEmailSelected) {
      setSelectedEmailIds(new Set())
    } else {
      setSelectedEmailIds(new Set(emailEligibleStudents.map((r) => r.studentId)))
    }
  }, [allEmailSelected, emailEligibleStudents])

  const handleSendEmails = useCallback(() => {
    if (!selectedClassroomId || selectedEmailIds.size === 0) return
    const selectedStudents = emailEligibleStudents.filter((r) => selectedEmailIds.has(r.studentId))
    if (selectedStudents.length === 0) return

    Alert.alert(
      "Send Follow-up Emails",
      `Send emails to ${selectedStudents.length} student${selectedStudents.length !== 1 ? "s" : ""}${emailStudentsToggle ? " (student)" : ""}${emailParentsToggle ? " (parent)" : ""}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: () => {
            sendEmailMutation.mutate(
              {
                studentIds: selectedStudents.map((s) => s.studentId),
                classroomId: selectedClassroomId,
                emailStudents: emailStudentsToggle,
                emailParents: emailParentsToggle,
                subject: EMAIL_SUBJECT_TEMPLATE,
                body: EMAIL_BODY_TEMPLATE,
                thresholdPercent: emailThreshold,
              },
              {
                onSuccess: (data) => {
                  const parts: string[] = []
                  if (data.sentCount > 0) parts.push(`${data.sentCount} sent`)
                  if (data.failedCount > 0) parts.push(`${data.failedCount} failed`)
                  if (data.skippedNoParentEmail > 0)
                    parts.push(`${data.skippedNoParentEmail} skipped (no parent email)`)
                  Alert.alert(
                    "Emails Sent",
                    parts.length > 0 ? parts.join(", ") : "No emails were sent.",
                  )
                  setSelectedEmailIds(new Set())
                },
                onError: (error) => {
                  Alert.alert(
                    "Email Failed",
                    error instanceof Error ? error.message : "Failed to send emails.",
                  )
                },
              },
            )
          },
        },
      ],
    )
  }, [
    selectedClassroomId,
    selectedEmailIds,
    emailEligibleStudents,
    emailStudentsToggle,
    emailParentsToggle,
    emailThreshold,
    sendEmailMutation,
  ])

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
      {/* ── Header with profile icon ── */}
      <View style={[rs.header, { paddingTop: insets.top + 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
        <Text style={[rs.heading, { color: c.text }]}>Reports</Text>
        <TeacherProfileButton />
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
              : tab.key === "email"
                ? emailEligibleStudents.length
                : reports.model.sessionTrendRows.length
          return (
            <Pressable
              key={tab.key}
              onPress={() => {
                setActiveTab(tab.key)
                setShowAllStudents(false)
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
                  {studentSearch
                    ? `No students match "${studentSearch}"`
                    : "All students are above 75% attendance"}
                </Text>
              ) : (
                <>
                  <View style={[rs.sectionHeader, { backgroundColor: c.dangerSoft }]}>
                    <Ionicons name="warning-outline" size={14} color={c.danger} />
                    <Text style={{ fontSize: 12, fontWeight: "700", color: c.danger }}>
                      Needs Attention ({filteredStudents.length})
                    </Text>
                  </View>
                  {(showAllStudents ? filteredStudents : filteredStudents.slice(0, 10)).map(
                    (row, i) => renderStudentRow(row, i),
                  )}

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

        {/* ── SEND EMAIL TAB ── */}
        {activeTab === "email" ? (
          !selectedClassroomId ? (
            <View style={{ alignItems: "center", paddingVertical: 32 }}>
              <Ionicons name="mail-outline" size={36} color={c.textSubtle} />
              <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 8, textAlign: "center" }}>
                Select a classroom to send follow-up emails
              </Text>
            </View>
          ) : (
            <>
              {/* Threshold input */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: c.text }}>Threshold</Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 8,
                    backgroundColor: c.surfaceRaised,
                    paddingHorizontal: 10,
                    gap: 2,
                  }}
                >
                  <TextInput
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: c.text,
                      textAlign: "center",
                      width: 36,
                      paddingVertical: 6,
                    }}
                    keyboardType="numeric"
                    value={String(emailThreshold)}
                    onChangeText={(v) => {
                      const n = Number.parseInt(v, 10)
                      if (!Number.isNaN(n) && n >= 0 && n <= 100) setEmailThreshold(n)
                      else if (v === "") setEmailThreshold(0)
                    }}
                  />
                  <Text style={{ fontSize: 13, color: c.textMuted }}>%</Text>
                </View>
              </View>

              {emailEligibleStudents.length === 0 ? (
                <Text
                  style={{
                    fontSize: 13,
                    color: c.textMuted,
                    textAlign: "center",
                    paddingVertical: 16,
                  }}
                >
                  No students below {emailThreshold}% threshold
                </Text>
              ) : (
                <>
                  {/* Header with count + select all */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingVertical: 4,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: c.text }}>
                        Below threshold
                      </Text>
                      <View style={[rs.tabBadge, { backgroundColor: c.dangerSoft }]}>
                        <Text style={{ fontSize: 10, fontWeight: "700", color: c.danger }}>
                          {emailEligibleStudents.length}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={toggleSelectAll}
                      style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                    >
                      <Ionicons
                        name={allEmailSelected ? "checkbox" : "square-outline"}
                        size={18}
                        color={allEmailSelected ? c.primary : c.textMuted}
                      />
                      <Text style={{ fontSize: 12, color: c.primary, fontWeight: "600" }}>
                        Select All
                      </Text>
                    </Pressable>
                  </View>

                  {/* Student rows with checkboxes */}
                  {emailEligibleStudents.map((row) => {
                    const selected = selectedEmailIds.has(row.studentId)
                    return (
                      <Pressable
                        key={`${row.classroomId}-${row.studentId}`}
                        onPress={() => toggleEmailStudent(row.studentId)}
                      >
                        <View
                          style={[
                            rs.studentRow,
                            {
                              backgroundColor: selected ? c.primarySoft : c.surfaceRaised,
                              borderColor: selected ? c.primary : c.border,
                            },
                          ]}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                            <Ionicons
                              name={selected ? "checkbox" : "square-outline"}
                              size={20}
                              color={selected ? c.primary : c.textMuted}
                            />
                            <View style={{ flex: 1, gap: 2 }}>
                              <Text
                                style={{ fontSize: 13, fontWeight: "600", color: c.text }}
                                numberOfLines={1}
                              >
                                {row.studentDisplayName}
                              </Text>
                              <Text
                                style={{ fontSize: 11, color: c.textMuted }}
                                numberOfLines={1}
                              >
                                {row.subjectTitle} · {row.presentSessions}/{row.totalSessions}{" "}
                                present
                              </Text>
                            </View>
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
                        </View>
                      </Pressable>
                    )
                  })}

                  {/* Recipient toggles */}
                  <View style={{ gap: 8, paddingTop: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: c.text }}>
                      Send email to:
                    </Text>
                    <View style={{ flexDirection: "row", gap: 16 }}>
                      <Pressable
                        onPress={() => setEmailStudentsToggle((v) => !v)}
                        style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                      >
                        <Ionicons
                          name={emailStudentsToggle ? "checkbox" : "square-outline"}
                          size={18}
                          color={emailStudentsToggle ? c.primary : c.textMuted}
                        />
                        <Text style={{ fontSize: 13, color: c.text }}>Students</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setEmailParentsToggle((v) => !v)}
                        style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                      >
                        <Ionicons
                          name={emailParentsToggle ? "checkbox" : "square-outline"}
                          size={18}
                          color={emailParentsToggle ? c.primary : c.textMuted}
                        />
                        <Text style={{ fontSize: 13, color: c.text }}>Parents</Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Send button */}
                  <Pressable
                    onPress={handleSendEmails}
                    disabled={
                      selectedEmailIds.size === 0 ||
                      (!emailStudentsToggle && !emailParentsToggle) ||
                      sendEmailMutation.isPending
                    }
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      paddingVertical: 14,
                      borderRadius: 12,
                      marginTop: 8,
                      backgroundColor:
                        selectedEmailIds.size > 0 && (emailStudentsToggle || emailParentsToggle)
                          ? c.primary
                          : c.textMuted,
                      opacity: sendEmailMutation.isPending ? 0.6 : 1,
                    }}
                  >
                    {sendEmailMutation.isPending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="send" size={16} color="#fff" />
                        <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>
                          Email {selectedEmailIds.size} student
                          {selectedEmailIds.size !== 1 ? "s" : ""}
                        </Text>
                      </>
                    )}
                  </Pressable>
                </>
              )}
            </>
          )
        ) : null}

        {/* ── TRENDS TAB — Vertical bar chart ── */}
        {activeTab === "trends" ? (
          <AttendanceBarChart
            sessionTrendRows={reports.model.sessionTrendRows}
          />
        ) : null}
      </View>
    </ScrollView>
  )
}

// ── Attendance bar chart — horizontal bars, vertical layout ──

const CHART_X_TICKS = [0, 25, 50, 75, 100]
const CHART_ROW_HEIGHT = 32
const CHART_DATE_WIDTH = 52
const CHART_PCT_WIDTH = 36

type ChartPoint = {
  dateLabel: string
  pct: number
  tone: "primary" | "success" | "warning" | "danger"
}

function AttendanceBarChart(props: {
  sessionTrendRows: Array<{
    sessionId: string
    startedAt: string | null
    presentCount: number
    absentCount: number
    attendancePercentage: number
    tone: "primary" | "success" | "warning" | "danger"
  }>
}) {
  const c = getColors()
  const { width: screenWidth } = useWindowDimensions()

  const points = useMemo<ChartPoint[]>(() => {
    const rows = [...props.sessionTrendRows]
    const fmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" })
    return rows.map((r) => ({
      dateLabel: r.startedAt ? fmt.format(new Date(r.startedAt)) : "—",
      pct: r.attendancePercentage,
      tone: r.tone,
    }))
  }, [props.sessionTrendRows])

  if (points.length === 0) {
    return (
      <View style={{ alignItems: "center", paddingVertical: 32 }}>
        <Ionicons name="bar-chart-outline" size={36} color={c.textSubtle} />
        <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 8 }}>
          No session data for these filters
        </Text>
      </View>
    )
  }

  const barTrackWidth = screenWidth - 32 - CHART_DATE_WIDTH - CHART_PCT_WIDTH - 8
  const chartHeight = points.length * CHART_ROW_HEIGHT

  return (
    <Animated.View entering={FadeInDown.duration(200)} style={{ gap: 8, paddingTop: 4 }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: c.text, paddingHorizontal: 4 }}>
        Attendance % per session
      </Text>

      {/* Legend (above chart) */}
      <View style={{ flexDirection: "row", gap: 12, justifyContent: "center", paddingVertical: 2 }}>
        {(
          [
            { tone: "success", label: "≥75%" },
            { tone: "warning", label: "50-74%" },
            { tone: "danger", label: "<50%" },
          ] as const
        ).map((item) => (
          <View key={item.tone} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                backgroundColor: toneColor(item.tone, c),
              }}
            />
            <Text style={{ fontSize: 10, color: c.textMuted }}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* X-axis tick labels (above chart) */}
      <View
        style={{
          flexDirection: "row",
          paddingLeft: CHART_DATE_WIDTH,
          marginBottom: -2,
        }}
      >
        {CHART_X_TICKS.map((tick) => (
          <Text
            key={tick}
            style={{
              position: "absolute",
              left: CHART_DATE_WIDTH + (tick / 100) * barTrackWidth - 8,
              fontSize: 9,
              color: c.textSubtle,
              width: 24,
              textAlign: "center",
            }}
          >
            {tick}%
          </Text>
        ))}
      </View>

      {/* Chart body */}
      <View style={{ position: "relative", height: chartHeight, marginTop: 10 }}>
        {/* Vertical grid lines */}
        {CHART_X_TICKS.map((tick) => (
          <View
            key={tick}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: CHART_DATE_WIDTH + (tick / 100) * barTrackWidth,
              width: 1,
              backgroundColor: c.border,
              opacity: tick === 0 ? 1 : 0.4,
            }}
          />
        ))}

        {/* Rows */}
        {points.map((pt, i) => {
          const barW = Math.max(2, (pt.pct / 100) * barTrackWidth)
          return (
            <View
              key={i}
              style={{
                position: "absolute",
                top: i * CHART_ROW_HEIGHT,
                left: 0,
                right: 0,
                height: CHART_ROW_HEIGHT,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              {/* Date label */}
              <Text
                style={{
                  width: CHART_DATE_WIDTH,
                  fontSize: 9,
                  color: c.textSubtle,
                  textAlign: "right",
                  paddingRight: 6,
                }}
                numberOfLines={1}
              >
                {pt.dateLabel}
              </Text>

              {/* Bar */}
              <View
                style={{
                  width: barW,
                  height: Math.min(20, CHART_ROW_HEIGHT - 6),
                  borderRadius: 4,
                  backgroundColor: toneColor(pt.tone, c),
                  opacity: 0.85,
                }}
              />

              {/* Percentage value */}
              <Text
                style={{
                  width: CHART_PCT_WIDTH,
                  fontSize: 9,
                  fontWeight: "700",
                  color: toneColor(pt.tone, c),
                  paddingLeft: 4,
                }}
              >
                {pt.pct}%
              </Text>
            </View>
          )
        })}
      </View>

    </Animated.View>
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
  /* trendRow and dateBadge removed — trends tab now uses a bar chart */
})
