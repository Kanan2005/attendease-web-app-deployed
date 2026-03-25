import { useQueryClient } from "@tanstack/react-query"
import { useNavigation, useRouter } from "expo-router"
import { useEffect, useLayoutEffect, useState } from "react"
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"

import {
  buildAttendanceCorrectionSaveMessage,
  buildAttendanceEditChanges,
  createAttendanceEditDraft,
  getAttendanceCorrectionReviewPollInterval,
  updateAttendanceEditDraft,
} from "@attendease/domain"
import { getColors } from "@attendease/ui-mobile"
import { StatCard } from "@attendease/ui-mobile/animated"
import { Ionicons } from "@expo/vector-icons"
import { mapTeacherApiErrorToMessage } from "../teacher-models"
import {
  buildTeacherSessionDetailOverviewModel,
  buildTeacherSessionRosterModel,
} from "../teacher-operational"
import { teacherQueryKeys } from "../teacher-query"
import { useTeacherSession } from "../teacher-session"
import {
  useTeacherAttendanceSessionDetailQuery,
  useTeacherAttendanceSessionStudentsQuery,
  useTeacherUpdateAttendanceSessionMutation,
} from "./queries"
import { formatEnum, styles } from "./shared-ui"
import { TeacherSessionStudentSection } from "./teacher-session-student-section"

export function TeacherSessionDetailScreen(props: {
  sessionId: string
  classroomId?: string | undefined
}) {
  const { session } = useTeacherSession()
  const c = getColors()
  const queryClient = useQueryClient()
  const router = useRouter()
  const navigation = useNavigation()
  const detailQuery = useTeacherAttendanceSessionDetailQuery(props.sessionId, {
    refetchInterval: (query) => getAttendanceCorrectionReviewPollInterval(query.state.data ?? null),
  })
  const studentsQuery = useTeacherAttendanceSessionStudentsQuery(props.sessionId, {
    refetchInterval: getAttendanceCorrectionReviewPollInterval(detailQuery.data ?? null),
  })
  const updateAttendanceMutation = useTeacherUpdateAttendanceSessionMutation(props.sessionId)
  const [draft, setDraft] = useState<Record<string, "PRESENT" | "ABSENT">>({})
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const students = studentsQuery.data ?? []
  const pendingChanges = buildAttendanceEditChanges(students, draft)
  const rosterModel = buildTeacherSessionRosterModel({
    students,
    draft,
    isEditable: detailQuery.data?.editability.isEditable ?? false,
  })
  const detailOverview = buildTeacherSessionDetailOverviewModel({
    session: detailQuery.data ?? null,
    pendingChangeCount: pendingChanges.length,
  })

  const resolvedClassroomId = props.classroomId ?? detailQuery.data?.classroomId

  useLayoutEffect(() => {
    if (resolvedClassroomId) {
      navigation.setOptions({
        headerLeft: () => (
          <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginLeft: 4 }}>
            <Ionicons name="chevron-back" size={26} color={getColors().primary} />
          </Pressable>
        ),
      })
    }
  }, [resolvedClassroomId, navigation, router])

  useEffect(() => {
    if (!studentsQuery.data) return
    setDraft(createAttendanceEditDraft(studentsQuery.data))
  }, [studentsQuery.data])

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

  if (detailQuery.isLoading || studentsQuery.isLoading) {
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
        <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 12 }}>Loading session…</Text>
      </View>
    )
  }

  if (detailQuery.error || studentsQuery.error) {
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
          {mapTeacherApiErrorToMessage(detailQuery.error ?? studentsQuery.error)}
        </Text>
      </View>
    )
  }

  if (!detailQuery.data) {
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
        <Ionicons name="help-circle-outline" size={40} color={c.textSubtle} />
        <Text style={{ fontSize: 16, fontWeight: "600", color: c.text, marginTop: 12 }}>
          Session not found
        </Text>
      </View>
    )
  }

  const sessionData = detailQuery.data
  const isEditable = sessionData.editability.isEditable

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.surface }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Overview header ── */}
      <View style={sd.headerSection}>
        <Text style={[sd.sessionTitle, { color: c.text }]} numberOfLines={2}>
          {sessionData.lectureTitle?.length
            ? sessionData.lectureTitle
            : sessionData.classroomDisplayTitle}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Text style={{ fontSize: 13, color: c.textMuted }}>
            {formatEnum(sessionData.mode)} · {formatEnum(sessionData.status)}
          </Text>
          {isEditable ? (
            <View style={[sd.badge, { backgroundColor: c.warningSoft }]}>
              <Ionicons name="create-outline" size={11} color={c.warning} />
              <Text style={{ fontSize: 11, fontWeight: "700", color: c.warning }}>Editable</Text>
            </View>
          ) : sessionData.status !== "ACTIVE" ? (
            <View style={[sd.badge, { backgroundColor: c.primarySoft }]}>
              <Ionicons name="checkmark-done" size={11} color={c.primary} />
              <Text style={{ fontSize: 11, fontWeight: "700", color: c.primary }}>Final</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* ── Stat cards ── */}
      <View style={sd.statsRow}>
        {detailOverview.summaryCards.map((card, i) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            tone={card.tone}
            index={i}
          />
        ))}
      </View>
      {detailOverview.timingSummary ? (
        <Text style={{ fontSize: 12, color: c.textMuted, paddingHorizontal: 16, marginBottom: 4 }}>
          {detailOverview.timingSummary}
        </Text>
      ) : null}

      {/* ── Present ── */}
      <View style={sd.section}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={[sd.sectionIcon, { backgroundColor: c.successSoft }]}>
            <Ionicons name="checkmark-circle" size={16} color={c.success} />
          </View>
          <Text style={[sd.sectionTitle, { color: c.text }]}>Present</Text>
          <View style={[sd.countBadge, { backgroundColor: c.successSoft }]}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: c.success }}>
              {rosterModel.presentRows.length}
            </Text>
          </View>
        </View>
        <TeacherSessionStudentSection
          title="Present"
          subtitle=""
          rows={rosterModel.presentRows}
          emptyLabel="No students marked present."
          isEditable={isEditable}
          onToggleStatus={(row) => {
            const target = row.actionTargetStatus
            if (target !== "PRESENT" && target !== "ABSENT") return
            setDraft((current) =>
              updateAttendanceEditDraft(current, row.attendanceRecordId, target),
            )
          }}
        />
      </View>

      {/* ── Absent ── */}
      <View style={sd.section}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={[sd.sectionIcon, { backgroundColor: c.dangerSoft }]}>
            <Ionicons name="close-circle" size={16} color={c.danger} />
          </View>
          <Text style={[sd.sectionTitle, { color: c.text }]}>Absent</Text>
          <View style={[sd.countBadge, { backgroundColor: c.dangerSoft }]}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: c.danger }}>
              {rosterModel.absentRows.length}
            </Text>
          </View>
        </View>
        <TeacherSessionStudentSection
          title="Absent"
          subtitle=""
          rows={rosterModel.absentRows}
          emptyLabel="No students marked absent."
          isEditable={isEditable}
          onToggleStatus={(row) => {
            const target = row.actionTargetStatus
            if (target !== "PRESENT" && target !== "ABSENT") return
            setDraft((current) =>
              updateAttendanceEditDraft(current, row.attendanceRecordId, target),
            )
          }}
        />
      </View>

      {/* ── Corrections ── */}
      {isEditable ? (
        <View style={[sd.section, { gap: 10 }]}>
          <Text style={[sd.sectionTitle, { color: c.text }]}>Corrections</Text>
          {detailOverview.correctionSummary ? (
            <Text style={{ fontSize: 12, color: c.textMuted }}>
              {detailOverview.correctionSummary}
            </Text>
          ) : null}
          {statusMessage ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: c.successSoft,
                borderRadius: 10,
                padding: 10,
              }}
            >
              <Ionicons name="checkmark-circle" size={16} color={c.success} />
              <Text style={{ fontSize: 13, color: c.success, flex: 1 }}>{statusMessage}</Text>
            </View>
          ) : null}
          {updateAttendanceMutation.error ? (
            <Text style={{ fontSize: 13, color: c.danger }}>
              {mapTeacherApiErrorToMessage(updateAttendanceMutation.error)}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              style={[
                styles.primaryButton,
                {
                  flex: 1,
                  opacity:
                    updateAttendanceMutation.isPending || pendingChanges.length === 0 ? 0.5 : 1,
                },
              ]}
              disabled={updateAttendanceMutation.isPending || pendingChanges.length === 0}
              onPress={() => {
                void updateAttendanceMutation
                  .mutateAsync({ changes: pendingChanges })
                  .then((result) => {
                    setStatusMessage(
                      buildAttendanceCorrectionSaveMessage(result.appliedChangeCount),
                    )
                    setDraft(createAttendanceEditDraft(result.students))
                    queryClient.setQueryData(
                      teacherQueryKeys.sessionDetail(props.sessionId),
                      result.session,
                    )
                    queryClient.setQueryData(
                      teacherQueryKeys.sessionStudents(props.sessionId),
                      result.students,
                    )
                  })
                  .catch((err) => {
                    setStatusMessage(err instanceof Error ? err.message : "Failed to save.")
                  })
              }}
            >
              <Text style={styles.primaryButtonLabel}>
                {updateAttendanceMutation.isPending
                  ? "Saving…"
                  : `Save Changes${pendingChanges.length > 0 ? ` (${pendingChanges.length})` : ""}`}
              </Text>
            </Pressable>
            <Pressable
              style={{
                borderRadius: 10,
                borderWidth: 1,
                borderColor: c.border,
                paddingHorizontal: 16,
                paddingVertical: 12,
                alignItems: "center",
                justifyContent: "center",
                opacity: pendingChanges.length === 0 ? 0.4 : 1,
              }}
              disabled={pendingChanges.length === 0}
              onPress={() => {
                setDraft(createAttendanceEditDraft(students))
                setStatusMessage("Changes discarded.")
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: c.text }}>Reset</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </ScrollView>
  )
}

const sd = StyleSheet.create({
  headerSection: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4, gap: 4 },
  sessionTitle: { fontSize: 18, fontWeight: "700" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  section: { paddingHorizontal: 16, marginTop: 16, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
})
