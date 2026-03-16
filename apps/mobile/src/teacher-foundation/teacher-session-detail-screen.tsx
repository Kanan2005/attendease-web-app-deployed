import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { Pressable, Text, View } from "react-native"

import {
  buildAttendanceCorrectionSaveMessage,
  buildAttendanceEditChanges,
  createAttendanceEditDraft,
  getAttendanceCorrectionReviewPollInterval,
  updateAttendanceEditDraft,
} from "@attendease/domain"
import { mapTeacherApiErrorToMessage } from "../teacher-models"
import {
  buildTeacherSessionDetailOverviewModel,
  buildTeacherSessionDetailStatusModel,
  buildTeacherSessionRosterModel,
} from "../teacher-operational"
import { teacherQueryKeys } from "../teacher-query"
import { teacherRoutes } from "../teacher-routes"
import { useTeacherSession } from "../teacher-session"
import {
  useTeacherAttendanceSessionDetailQuery,
  useTeacherAttendanceSessionStudentsQuery,
  useTeacherUpdateAttendanceSessionMutation,
} from "./queries"
import {
  TeacherCard,
  TeacherEmptyCard,
  TeacherErrorCard,
  TeacherLoadingCard,
  TeacherNavAction,
  TeacherScreen,
  TeacherSessionSetupCard,
  TeacherStatusBanner,
  formatDateTime,
  formatEnum,
  styles,
  toneColorStyle,
} from "./shared-ui"
import { TeacherSessionStudentSection } from "./teacher-session-student-section"

export function TeacherSessionDetailScreen(props: { sessionId: string }) {
  const { session } = useTeacherSession()
  const queryClient = useQueryClient()
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
  const detailStatus = buildTeacherSessionDetailStatusModel({
    sessionStatus: detailQuery.data?.status ?? null,
    editability: detailQuery.data?.editability ?? null,
    pendingChangeCount: pendingChanges.length,
  })
  const rosterModel = buildTeacherSessionRosterModel({
    students,
    draft,
    isEditable: detailQuery.data?.editability.isEditable ?? false,
  })
  const detailOverview = buildTeacherSessionDetailOverviewModel({
    session: detailQuery.data ?? null,
    pendingChangeCount: pendingChanges.length,
  })

  useEffect(() => {
    if (!studentsQuery.data) {
      return
    }

    setDraft(createAttendanceEditDraft(studentsQuery.data))
  }, [studentsQuery.data])

  return (
    <TeacherScreen
      title="Session Detail"
      subtitle="Review final attendance quickly, then correct present or absent counts from one clean session screen."
    >
      {!session ? (
        <TeacherSessionSetupCard />
      ) : detailQuery.isLoading || studentsQuery.isLoading ? (
        <TeacherLoadingCard label="Loading session detail" />
      ) : detailQuery.error || studentsQuery.error ? (
        <TeacherErrorCard
          label={mapTeacherApiErrorToMessage(detailQuery.error ?? studentsQuery.error)}
        />
      ) : detailQuery.data ? (
        <>
          <TeacherStatusBanner
            status={{
              tone: detailStatus.stateTone,
              title: detailStatus.title,
              message: detailStatus.message,
            }}
          />
          <TeacherCard
            title={detailQuery.data.classroomDisplayTitle}
            subtitle={`${formatEnum(detailQuery.data.mode)} · ${formatEnum(detailQuery.data.status)}`}
          >
            <Text style={styles.listMeta}>
              {detailQuery.data.lectureTitle?.length
                ? detailQuery.data.lectureTitle
                : "Attendance session"}
            </Text>
            <View style={styles.cardGrid}>
              {detailOverview.summaryCards.map((card) => (
                <View key={card.label} style={styles.metricCard}>
                  <Text style={styles.metricLabel}>{card.label}</Text>
                  <Text style={[styles.metricValue, toneColorStyle(card.tone)]}>{card.value}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.bodyText}>{detailOverview.rosterSummary}</Text>
            <Text style={styles.listMeta}>
              Teacher: {detailQuery.data.teacherDisplayName} · {detailQuery.data.subjectCode}
            </Text>
            <Text style={styles.listMeta}>{detailOverview.timingSummary}</Text>
            <Text style={styles.listMeta}>
              Risk signals stay informational only: {detailQuery.data.suspiciousAttemptCount}
            </Text>
          </TeacherCard>

          <TeacherCard title="Present Students" subtitle={detailOverview.presentSectionSubtitle}>
            <Text style={styles.listMeta}>{rosterModel.presentSummary}</Text>
            <TeacherSessionStudentSection
              title="Present"
              subtitle={detailOverview.presentSectionSubtitle}
              rows={rosterModel.presentRows}
              emptyLabel="No students are currently marked present."
              isEditable={detailQuery.data.editability.isEditable}
              onToggleStatus={(row) => {
                if (row.actionTargetStatus !== "PRESENT" && row.actionTargetStatus !== "ABSENT") {
                  return
                }

                const nextStatus = row.actionTargetStatus

                setDraft((current) =>
                  updateAttendanceEditDraft(current, row.attendanceRecordId, nextStatus),
                )
              }}
            />
          </TeacherCard>

          <TeacherCard title="Absent Students" subtitle={detailOverview.absentSectionSubtitle}>
            <Text style={styles.listMeta}>{rosterModel.absentSummary}</Text>
            <TeacherSessionStudentSection
              title="Absent"
              subtitle={detailOverview.absentSectionSubtitle}
              rows={rosterModel.absentRows}
              emptyLabel="No students are currently marked absent."
              isEditable={detailQuery.data.editability.isEditable}
              onToggleStatus={(row) => {
                if (row.actionTargetStatus !== "PRESENT" && row.actionTargetStatus !== "ABSENT") {
                  return
                }

                const nextStatus = row.actionTargetStatus

                setDraft((current) =>
                  updateAttendanceEditDraft(current, row.attendanceRecordId, nextStatus),
                )
              }}
            />
          </TeacherCard>

          <TeacherCard
            title="Corrections"
            subtitle={
              detailQuery.data.editability.isEditable
                ? "Review grouped present and absent lists, then save once when right."
                : detailQuery.data.status === "ACTIVE"
                  ? "Bluetooth attendance is still live. End the session before manual corrections."
                  : "This attendance session is now read-only."
            }
          >
            <Text style={styles.listMeta}>{detailOverview.correctionSummary}</Text>
            {statusMessage ? <Text style={styles.bodyText}>{statusMessage}</Text> : null}
            {updateAttendanceMutation.error ? (
              <Text style={styles.errorText}>
                {mapTeacherApiErrorToMessage(updateAttendanceMutation.error)}
              </Text>
            ) : null}
            <View style={styles.actionGrid}>
              <Pressable
                style={[
                  styles.primaryButton,
                  !detailQuery.data.editability.isEditable ||
                  updateAttendanceMutation.isPending ||
                  pendingChanges.length === 0
                    ? styles.disabledButton
                    : null,
                ]}
                disabled={
                  !detailQuery.data.editability.isEditable ||
                  updateAttendanceMutation.isPending ||
                  pendingChanges.length === 0
                }
                onPress={() => {
                  void updateAttendanceMutation
                    .mutateAsync({
                      changes: pendingChanges,
                    })
                    .then(async (result) => {
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
                }}
              >
                <Text style={styles.primaryButtonLabel}>
                  {updateAttendanceMutation.isPending ? "Saving..." : "Save Attendance Changes"}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.secondaryButton,
                  pendingChanges.length === 0 ? styles.disabledSecondaryButton : null,
                ]}
                disabled={pendingChanges.length === 0}
                onPress={() => {
                  setDraft(createAttendanceEditDraft(students))
                  setStatusMessage("Reset the local edit draft back to the saved session state.")
                }}
              >
                <Text style={styles.secondaryButtonLabel}>Reset Draft</Text>
              </Pressable>
            </View>
          </TeacherCard>

          <TeacherCard
            title="Navigation"
            subtitle="Keep session history, reports, and teacher home close while you review final attendance."
          >
            <View style={styles.actionGrid}>
              <TeacherNavAction href={teacherRoutes.sessionHistory} label="Session History" />
              <TeacherNavAction href={teacherRoutes.reports} label="Reports" />
              <TeacherNavAction href={teacherRoutes.home} label="Home" />
            </View>
          </TeacherCard>
        </>
      ) : (
        <TeacherEmptyCard label="Session detail is unavailable for this attendance session." />
      )}
    </TeacherScreen>
  )
}
