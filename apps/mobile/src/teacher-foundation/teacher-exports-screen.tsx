import type { ExportJobType } from "@attendease/contracts"
import { getColors } from "@attendease/ui-mobile"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { mapTeacherApiErrorToMessage } from "../teacher-models"
import { useTeacherSession } from "../teacher-session"
import {
  useTeacherAttendanceSessionsQuery,
  useTeacherClassroomsQuery,
  useTeacherCreateExportJobMutation,
  useTeacherExportJobsQuery,
} from "./queries"
import { TeacherProfileButton, formatDateTime, styles } from "./shared-ui"

// ── Export type definitions (purpose-first) ──
type ExportTypeKey = "attendance_sheet" | "student_report" | "full_register"

const EXPORT_TYPES: Array<{
  key: ExportTypeKey
  icon: keyof typeof Ionicons.glyphMap
  title: string
  description: string
  formats: ExportJobType[]
}> = [
  {
    key: "attendance_sheet",
    icon: "document-text-outline",
    title: "Attendance Sheet",
    description:
      "Export a single lecture's attendance list with student names, roll numbers, and status.",
    formats: ["SESSION_PDF", "SESSION_CSV"],
  },
  {
    key: "student_report",
    icon: "people-outline",
    title: "Student Report",
    description:
      "Per-student attendance percentages across all sessions. Useful for identifying at-risk students.",
    formats: ["STUDENT_PERCENT_CSV"],
  },
  {
    key: "full_register",
    icon: "grid-outline",
    title: "Full Register",
    description:
      "Complete attendance matrix — every student × every session. Ideal for university submission.",
    formats: ["COMPREHENSIVE_CSV"],
  },
]

function fmtEnum(s: string) {
  return s
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

function friendlyJobType(jobType: string) {
  if (jobType === "SESSION_PDF") return "Attendance Sheet (PDF)"
  if (jobType === "SESSION_CSV") return "Attendance Sheet (CSV)"
  if (jobType === "STUDENT_PERCENT_CSV") return "Student Report"
  if (jobType === "COMPREHENSIVE_CSV") return "Full Register"
  return fmtEnum(jobType)
}

export function TeacherExportsScreen() {
  const { session } = useTeacherSession()
  const c = getColors()
  const insets = useSafeAreaInsets()
  const classroomsQuery = useTeacherClassroomsQuery()
  const sessionsQuery = useTeacherAttendanceSessionsQuery()
  const exportJobsQuery = useTeacherExportJobsQuery()
  const createExportJobMutation = useTeacherCreateExportJobMutation()

  const [selectedType, setSelectedType] = useState<ExportTypeKey>("attendance_sheet")
  const [selectedFormat, setSelectedFormat] = useState<ExportJobType>("SESSION_PDF")
  const [selectedSessionId, setSelectedSessionId] = useState("")
  const [selectedClassroomId, setSelectedClassroomId] = useState("")
  const [classroomDropdownOpen, setClassroomDropdownOpen] = useState(false)
  const [showAllSessions, setShowAllSessions] = useState(false)

  const defaultExportType = EXPORT_TYPES[0] as (typeof EXPORT_TYPES)[number]
  const activeExportType = EXPORT_TYPES.find((t) => t.key === selectedType) ?? defaultExportType
  const isSessionExport = selectedType === "attendance_sheet"

  const allSessions = sessionsQuery.data?.filter((s) => s.status !== "ACTIVE") ?? []
  const classrooms = classroomsQuery.data ?? []

  // For session exports: get unique classrooms from sessions, then filter sessions by selected classroom
  const classroomsWithSessions = (() => {
    const seen = new Map<string, { id: string; title: string }>()
    for (const s of allSessions) {
      if (!seen.has(s.classroomId)) {
        seen.set(s.classroomId, { id: s.classroomId, title: s.classroomDisplayTitle })
      }
    }
    return [...seen.values()]
  })()

  const filteredSessions = selectedClassroomId
    ? allSessions.filter((s) => s.classroomId === selectedClassroomId)
    : allSessions

  // Auto-select first classroom with sessions
  useEffect(() => {
    if (isSessionExport && !selectedClassroomId && classroomsWithSessions[0]) {
      setSelectedClassroomId(classroomsWithSessions[0].id)
    }
  }, [isSessionExport, classroomsWithSessions, selectedClassroomId])

  // Auto-select first classroom for non-session exports
  useEffect(() => {
    if (!isSessionExport && !selectedClassroomId && classrooms[0]) {
      setSelectedClassroomId(classrooms[0].id)
    }
  }, [isSessionExport, classrooms, selectedClassroomId])

  // Auto-select first session in filtered list
  useEffect(() => {
    if (isSessionExport && filteredSessions.length > 0) {
      const currentStillValid = filteredSessions.some((s) => s.id === selectedSessionId)
      if (!currentStillValid) setSelectedSessionId(filteredSessions[0]?.id ?? "")
    }
  }, [isSessionExport, filteredSessions, selectedSessionId])

  // Sync format when switching export types
  useEffect(() => {
    if (!activeExportType.formats.includes(selectedFormat)) {
      const next = activeExportType.formats[0]
      if (next) setSelectedFormat(next)
    }
  }, [activeExportType, selectedFormat])

  const selectedClassroomLabel = (() => {
    if (isSessionExport) {
      return (
        classroomsWithSessions.find((cr) => cr.id === selectedClassroomId)?.title ??
        "Select Classroom"
      )
    }
    return classrooms.find((cr) => cr.id === selectedClassroomId)?.displayTitle ?? "All Classrooms"
  })()

  const canSubmit =
    !createExportJobMutation.isPending && (isSessionExport ? Boolean(selectedSessionId) : true)

  async function submitExport() {
    if (!canSubmit) return
    try {
      await createExportJobMutation.mutateAsync(
        isSessionExport
          ? { jobType: selectedFormat, sessionId: selectedSessionId }
          : {
              jobType: selectedFormat,
              filters: selectedClassroomId ? { classroomId: selectedClassroomId } : {},
            },
      )
    } catch {
      // Error stored in mutation
    }
  }

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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.surface }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header with profile icon ── */}
      <View style={[es.header, { paddingTop: insets.top + 8, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }]}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[es.heading, { color: c.text }]}>Exports</Text>
          <Text style={{ fontSize: 13, color: c.textMuted }}>
            Download attendance data for records or submission
          </Text>
        </View>
        <TeacherProfileButton />
      </View>

      {/* ── Export type cards ── */}
      <View style={es.typeSection}>
        {EXPORT_TYPES.map((type) => {
          const active = selectedType === type.key
          return (
            <Pressable
              key={type.key}
              onPress={() => {
                setSelectedType(type.key)
                setClassroomDropdownOpen(false)
              }}
              style={[
                es.typeCard,
                {
                  backgroundColor: active ? c.primarySoft : c.surfaceRaised,
                  borderColor: active ? c.primary : c.border,
                },
              ]}
            >
              <View style={[es.typeIcon, { backgroundColor: active ? c.primary : c.surfaceTint }]}>
                <Ionicons name={type.icon} size={18} color={active ? "#fff" : c.textSubtle} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={{ fontSize: 14, fontWeight: "700", color: active ? c.primary : c.text }}
                >
                  {type.title}
                </Text>
                <Text style={{ fontSize: 11, color: c.textMuted }} numberOfLines={2}>
                  {type.description}
                </Text>
              </View>
              {active ? <Ionicons name="checkmark-circle" size={20} color={c.primary} /> : null}
            </Pressable>
          )
        })}
      </View>

      {/* ── Format toggle (only for attendance sheet — PDF vs CSV) ── */}
      {activeExportType.formats.length > 1 ? (
        <View style={es.section}>
          <Text style={[es.sectionTitle, { color: c.text }]}>Format</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {activeExportType.formats.map((fmt) => {
              const active = selectedFormat === fmt
              const label = fmt.includes("PDF") ? "PDF" : "CSV"
              const icon: keyof typeof Ionicons.glyphMap = fmt.includes("PDF")
                ? "document-outline"
                : "grid-outline"
              return (
                <Pressable
                  key={fmt}
                  onPress={() => setSelectedFormat(fmt)}
                  style={[
                    es.formatChip,
                    {
                      backgroundColor: active ? c.primarySoft : c.surfaceRaised,
                      borderColor: active ? c.primary : c.border,
                    },
                  ]}
                >
                  <Ionicons name={icon} size={14} color={active ? c.primary : c.textSubtle} />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: active ? "700" : "500",
                      color: active ? c.primary : c.text,
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>
      ) : null}

      {/* ── Source selection ── */}
      <View style={es.section}>
        {isSessionExport ? (
          <>
            {/* Classroom filter dropdown for session exports */}
            <Text style={[es.sectionTitle, { color: c.text }]}>Classroom</Text>
            {sessionsQuery.isLoading ? (
              <ActivityIndicator color={c.primary} />
            ) : classroomsWithSessions.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 16 }}>
                <Ionicons name="time-outline" size={28} color={c.textSubtle} />
                <Text style={{ fontSize: 13, color: c.textMuted, marginTop: 6 }}>
                  No completed sessions yet
                </Text>
              </View>
            ) : (
              <>
                <Pressable
                  onPress={() => setClassroomDropdownOpen((v) => !v)}
                  style={[
                    es.dropdownTrigger,
                    {
                      borderColor: classroomDropdownOpen ? c.primary : c.border,
                      backgroundColor: c.surfaceRaised,
                    },
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                    <Ionicons name="school-outline" size={16} color={c.textSubtle} />
                    <Text
                      style={{ fontSize: 14, fontWeight: "600", color: c.text }}
                      numberOfLines={1}
                    >
                      {selectedClassroomLabel}
                    </Text>
                  </View>
                  <Ionicons
                    name={classroomDropdownOpen ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={c.textSubtle}
                  />
                </Pressable>
                {classroomDropdownOpen ? (
                  <View
                    style={[
                      es.dropdownMenu,
                      { borderColor: c.border, backgroundColor: c.surfaceRaised },
                    ]}
                  >
                    {classroomsWithSessions.map((cr) => {
                      const active = selectedClassroomId === cr.id
                      return (
                        <Pressable
                          key={cr.id}
                          onPress={() => {
                            setSelectedClassroomId(cr.id)
                            setClassroomDropdownOpen(false)
                            setSelectedSessionId("")
                            setShowAllSessions(false)
                          }}
                          style={[es.dropdownItem, active && { backgroundColor: c.primarySoft }]}
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
                            {cr.title}
                          </Text>
                          {active ? (
                            <Ionicons name="checkmark" size={16} color={c.primary} />
                          ) : null}
                        </Pressable>
                      )
                    })}
                  </View>
                ) : null}

                {/* Session list (filtered by classroom) */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 12,
                  }}
                >
                  <Text style={[es.sectionTitle, { color: c.text }]}>Session</Text>
                  {filteredSessions.length > 0 ? (
                    <Text style={{ fontSize: 12, color: c.textMuted }}>
                      {filteredSessions.length} total
                    </Text>
                  ) : null}
                </View>
                {filteredSessions.length === 0 ? (
                  <Text style={{ fontSize: 12, color: c.textMuted }}>
                    No sessions in this classroom
                  </Text>
                ) : (
                  <>
                    {(showAllSessions ? filteredSessions : filteredSessions.slice(0, 5)).map(
                      (s, i) => {
                        const active = selectedSessionId === s.id
                        const timeLabel = s.startedAt
                          ? formatDateTime(s.startedAt)
                          : s.lectureDate
                            ? formatDateTime(s.lectureDate)
                            : fmtEnum(s.status)
                        return (
                          <Animated.View
                            key={s.id}
                            entering={FadeInDown.duration(150).delay(i * 20)}
                          >
                            <Pressable
                              onPress={() => setSelectedSessionId(s.id)}
                              style={[
                                es.sourceCard,
                                {
                                  backgroundColor: active ? c.primarySoft : c.surfaceRaised,
                                  borderColor: active ? c.primary : c.border,
                                },
                              ]}
                            >
                              <View
                                style={[
                                  es.sessionBadge,
                                  { backgroundColor: active ? c.primary : c.surfaceTint },
                                ]}
                              >
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: "800",
                                    color: active ? "#fff" : c.textSubtle,
                                  }}
                                >
                                  {s.lectureTitle?.replace(/\D/g, "") || "#"}
                                </Text>
                              </View>
                              <View style={{ flex: 1, gap: 2 }}>
                                <Text
                                  style={{ fontSize: 13, fontWeight: "600", color: c.text }}
                                  numberOfLines={1}
                                >
                                  {s.lectureTitle ?? "Session"}
                                </Text>
                                <Text style={{ fontSize: 11, color: c.textMuted }}>
                                  {timeLabel}
                                  {" · "}
                                  {s.presentCount}P / {s.absentCount}A
                                </Text>
                              </View>
                              {active ? (
                                <Ionicons name="checkmark-circle" size={20} color={c.primary} />
                              ) : (
                                <Ionicons name="ellipse-outline" size={20} color={c.border} />
                              )}
                            </Pressable>
                          </Animated.View>
                        )
                      },
                    )}
                    {!showAllSessions && filteredSessions.length > 5 ? (
                      <Pressable
                        onPress={() => setShowAllSessions(true)}
                        style={{ alignItems: "center", paddingVertical: 10 }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: "600", color: c.primary }}>
                          Show all {filteredSessions.length} sessions
                        </Text>
                      </Pressable>
                    ) : null}
                  </>
                )}
              </>
            )}
          </>
        ) : (
          <>
            {/* Classroom selector for report/register exports */}
            <Text style={[es.sectionTitle, { color: c.text }]}>Classroom</Text>
            {classroomsQuery.isLoading ? (
              <ActivityIndicator color={c.primary} />
            ) : !classrooms.length ? (
              <View style={{ alignItems: "center", paddingVertical: 16 }}>
                <Ionicons name="school-outline" size={28} color={c.textSubtle} />
                <Text style={{ fontSize: 13, color: c.textMuted, marginTop: 6 }}>
                  No classrooms
                </Text>
              </View>
            ) : (
              <>
                <Pressable
                  onPress={() => setClassroomDropdownOpen((v) => !v)}
                  style={[
                    es.dropdownTrigger,
                    {
                      borderColor: classroomDropdownOpen ? c.primary : c.border,
                      backgroundColor: c.surfaceRaised,
                    },
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                    <Ionicons name="school-outline" size={16} color={c.textSubtle} />
                    <Text
                      style={{ fontSize: 14, fontWeight: "600", color: c.text }}
                      numberOfLines={1}
                    >
                      {selectedClassroomLabel}
                    </Text>
                  </View>
                  <Ionicons
                    name={classroomDropdownOpen ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={c.textSubtle}
                  />
                </Pressable>
                {classroomDropdownOpen ? (
                  <View
                    style={[
                      es.dropdownMenu,
                      { borderColor: c.border, backgroundColor: c.surfaceRaised },
                    ]}
                  >
                    <Pressable
                      onPress={() => {
                        setSelectedClassroomId("")
                        setClassroomDropdownOpen(false)
                      }}
                      style={[
                        es.dropdownItem,
                        !selectedClassroomId && { backgroundColor: c.primarySoft },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          color: !selectedClassroomId ? c.primary : c.text,
                          fontWeight: !selectedClassroomId ? "700" : "400",
                        }}
                      >
                        All Classrooms
                      </Text>
                      {!selectedClassroomId ? (
                        <Ionicons name="checkmark" size={16} color={c.primary} />
                      ) : null}
                    </Pressable>
                    {classrooms.map((cr) => {
                      const active = selectedClassroomId === cr.id
                      return (
                        <Pressable
                          key={cr.id}
                          onPress={() => {
                            setSelectedClassroomId(cr.id)
                            setClassroomDropdownOpen(false)
                          }}
                          style={[es.dropdownItem, active && { backgroundColor: c.primarySoft }]}
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
                            {cr.displayTitle}
                          </Text>
                          {active ? (
                            <Ionicons name="checkmark" size={16} color={c.primary} />
                          ) : null}
                        </Pressable>
                      )
                    })}
                  </View>
                ) : null}
              </>
            )}
          </>
        )}
      </View>

      {/* ── Export button ── */}
      <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
        {createExportJobMutation.error ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: c.dangerSoft,
              borderRadius: 10,
              padding: 10,
              marginBottom: 10,
            }}
          >
            <Ionicons name="alert-circle" size={16} color={c.danger} />
            <Text style={{ fontSize: 12, color: c.danger, flex: 1 }}>
              {mapTeacherApiErrorToMessage(createExportJobMutation.error)}
            </Text>
          </View>
        ) : null}
        <Pressable
          style={[styles.primaryButton, { opacity: canSubmit ? 1 : 0.5 }]}
          disabled={!canSubmit}
          onPress={() => {
            void submitExport()
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="download-outline" size={18} color={c.primaryContrast} />
            <Text style={styles.primaryButtonLabel}>
              {createExportJobMutation.isPending
                ? "Requesting..."
                : `Export ${activeExportType.title}`}
            </Text>
          </View>
        </Pressable>
      </View>

      {/* ── Export history ── */}
      <View style={es.section}>
        <Text style={[es.sectionTitle, { color: c.text }]}>Export History</Text>
        {exportJobsQuery.isLoading ? (
          <ActivityIndicator color={c.primary} />
        ) : exportJobsQuery.error ? (
          <Text style={{ fontSize: 12, color: c.danger }}>
            {mapTeacherApiErrorToMessage(exportJobsQuery.error)}
          </Text>
        ) : !exportJobsQuery.data?.length ? (
          <View style={{ alignItems: "center", paddingVertical: 24, gap: 6 }}>
            <Ionicons name="document-outline" size={32} color={c.textSubtle} />
            <Text style={{ fontSize: 13, color: c.textMuted }}>No exports yet</Text>
            <Text
              style={{
                fontSize: 11,
                color: c.textMuted,
                textAlign: "center",
                paddingHorizontal: 24,
              }}
            >
              Your exported files will appear here with download links
            </Text>
          </View>
        ) : (
          exportJobsQuery.data.map((job, i) => {
            const isReady = Boolean(job.latestReadyDownloadUrl)
            const isFailed = job.status === "FAILED"
            const isPending = job.status === "QUEUED" || job.status === "PROCESSING"
            return (
              <Animated.View key={job.id} entering={FadeInDown.duration(200).delay(i * 30)}>
                <View
                  style={[es.jobCard, { backgroundColor: c.surfaceRaised, borderColor: c.border }]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View
                      style={[
                        es.jobIcon,
                        {
                          backgroundColor: isReady
                            ? c.successSoft
                            : isFailed
                              ? c.dangerSoft
                              : c.surfaceTint,
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          isReady
                            ? "checkmark-circle"
                            : isFailed
                              ? "close-circle"
                              : "hourglass-outline"
                        }
                        size={16}
                        color={isReady ? c.success : isFailed ? c.danger : c.textSubtle}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: c.text }}>
                        {friendlyJobType(job.jobType)}
                      </Text>
                      <Text style={{ fontSize: 11, color: c.textMuted }}>
                        {job.courseOfferingDisplayTitle ?? "All classrooms"} ·{" "}
                        {formatDateTime(job.requestedAt)}
                      </Text>
                    </View>
                    <View
                      style={[
                        es.statusBadge,
                        {
                          backgroundColor: isReady
                            ? c.successSoft
                            : isFailed
                              ? c.dangerSoft
                              : c.surfaceTint,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "700",
                          color: isReady ? c.success : isFailed ? c.danger : c.textSubtle,
                        }}
                      >
                        {isPending ? "Processing" : fmtEnum(job.status)}
                      </Text>
                    </View>
                  </View>
                  {job.latestReadyDownloadUrl ? (
                    <Pressable
                      onPress={() => {
                        void Linking.openURL(job.latestReadyDownloadUrl ?? "")
                      }}
                      style={[es.downloadBtn, { borderColor: c.primary }]}
                    >
                      <Ionicons name="cloud-download-outline" size={14} color={c.primary} />
                      <Text style={{ fontSize: 12, fontWeight: "600", color: c.primary }}>
                        Download
                      </Text>
                    </Pressable>
                  ) : null}
                  {isFailed && job.errorMessage ? (
                    <Text style={{ fontSize: 11, color: c.danger }}>{job.errorMessage}</Text>
                  ) : null}
                </View>
              </Animated.View>
            )
          })
        )}
      </View>
    </ScrollView>
  )
}

const es = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 4 },
  heading: { fontSize: 22, fontWeight: "800" },
  typeSection: { paddingHorizontal: 16, gap: 8, paddingVertical: 8 },
  typeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
  },
  typeIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  formatChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
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
  section: { paddingHorizontal: 16, marginTop: 16, gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "700" },
  sourceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  sessionBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  jobCard: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 8 },
  jobIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
})
