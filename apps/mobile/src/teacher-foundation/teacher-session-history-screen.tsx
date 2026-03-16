import { Text, View } from "react-native"

import { mapTeacherApiErrorToMessage } from "../teacher-models"
import { teacherRoutes } from "../teacher-routes"
import { useTeacherSession } from "../teacher-session"
import { buildTeacherSessionHistoryStatus } from "../teacher-view-state"
import { useTeacherAttendanceSessionsQuery } from "./queries"
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
} from "./shared-ui"

export function TeacherSessionHistoryScreen() {
  const { session } = useTeacherSession()
  const historyQuery = useTeacherAttendanceSessionsQuery()
  const liveSessions = (historyQuery.data ?? []).filter(
    (sessionItem) => sessionItem.status === "ACTIVE",
  )
  const pastSessions = (historyQuery.data ?? []).filter(
    (sessionItem) => sessionItem.status !== "ACTIVE",
  )
  const correctionOpenCount = pastSessions.filter(
    (sessionItem) => sessionItem.editability.isEditable,
  ).length
  const historyStatus = buildTeacherSessionHistoryStatus({
    hasSession: Boolean(session),
    isLoading: historyQuery.isLoading,
    errorMessage: historyQuery.error ? mapTeacherApiErrorToMessage(historyQuery.error) : null,
    totalCount: historyQuery.data?.length ?? 0,
    liveCount: liveSessions.length,
    correctionOpenCount,
  })

  return (
    <TeacherScreen
      title="Session History"
      subtitle="Open live attendance quickly, review saved results, and jump into corrections without leaving teacher mobile."
    >
      {!session ? (
        <TeacherSessionSetupCard />
      ) : historyQuery.isLoading ? (
        <TeacherLoadingCard label="Loading attendance session history" />
      ) : historyQuery.error ? (
        <TeacherErrorCard label={mapTeacherApiErrorToMessage(historyQuery.error)} />
      ) : historyQuery.data?.length ? (
        <>
          <TeacherStatusBanner status={historyStatus} />
          <TeacherCard
            title="At A Glance"
            subtitle="Live sessions, correction windows, and saved totals stay visible before you drill into one class."
          >
            <View style={styles.cardGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Live</Text>
                <Text style={[styles.metricValue, styles.successTone]}>{liveSessions.length}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Corrections Open</Text>
                <Text style={[styles.metricValue, styles.warningTone]}>{correctionOpenCount}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Saved Sessions</Text>
                <Text style={[styles.metricValue, styles.primaryTone]}>{pastSessions.length}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Students Marked</Text>
                <Text style={[styles.metricValue, styles.primaryTone]}>
                  {(historyQuery.data ?? []).reduce(
                    (sum, sessionItem) => sum + sessionItem.presentCount,
                    0,
                  )}
                </Text>
              </View>
            </View>
            <Text style={styles.listMeta}>
              {correctionOpenCount > 0
                ? `${correctionOpenCount} session${correctionOpenCount === 1 ? "" : "s"} still open for correction.`
                : "Saved sessions are ready to review whenever you need attendance proof or a quick check."}
            </Text>
          </TeacherCard>

          {liveSessions.length ? (
            <TeacherCard
              title="Live Now"
              subtitle="Use live rows to see who is already marked before you end Bluetooth attendance."
            >
              {liveSessions.map((sessionItem) => (
                <View key={sessionItem.id} style={styles.highlightCard}>
                  <Text style={styles.listTitle}>{sessionItem.classroomDisplayTitle}</Text>
                  <Text style={styles.listMeta}>
                    {sessionItem.lectureTitle ?? "Attendance session"} ·{" "}
                    {formatEnum(sessionItem.mode)}
                  </Text>
                  <Text style={styles.listMeta}>
                    {sessionItem.presentCount} present · {sessionItem.absentCount} absent
                  </Text>
                  <Text style={styles.listMeta}>
                    Started{" "}
                    {formatDateTime(
                      sessionItem.startedAt ??
                        sessionItem.lectureDate ??
                        sessionItem.scheduledEndAt ??
                        new Date().toISOString(),
                    )}
                  </Text>
                  <Text style={styles.listMeta}>
                    Bluetooth attendance is still live. End the session before making corrections.
                  </Text>
                  <View style={styles.actionGrid}>
                    <TeacherNavAction
                      href={teacherRoutes.sessionDetail(sessionItem.id)}
                      label="Open Live Session"
                      variant="primary"
                    />
                  </View>
                </View>
              ))}
            </TeacherCard>
          ) : null}

          {pastSessions.length ? (
            <TeacherCard
              title="Recently Saved"
              subtitle="Review final present or absent lists, then correct a saved session while the edit window is still open."
            >
              {pastSessions.map((sessionItem) => (
                <View key={sessionItem.id} style={styles.highlightCard}>
                  <Text style={styles.listTitle}>{sessionItem.classroomDisplayTitle}</Text>
                  <Text style={styles.listMeta}>
                    {sessionItem.lectureTitle ?? "Attendance session"} ·{" "}
                    {formatEnum(sessionItem.mode)}
                  </Text>
                  <Text style={styles.listMeta}>
                    {sessionItem.presentCount} present · {sessionItem.absentCount} absent
                  </Text>
                  <Text style={styles.listMeta}>
                    Ended{" "}
                    {formatDateTime(
                      sessionItem.endedAt ??
                        sessionItem.startedAt ??
                        sessionItem.lectureDate ??
                        new Date().toISOString(),
                    )}
                  </Text>
                  <Text
                    style={[
                      styles.listMeta,
                      sessionItem.editability.isEditable ? styles.warningTone : styles.primaryTone,
                    ]}
                  >
                    {sessionItem.editability.isEditable
                      ? `Corrections open until ${sessionItem.editableUntil ? formatDateTime(sessionItem.editableUntil) : "the window closes"}.`
                      : "Read-only final result."}
                  </Text>
                  <View style={styles.actionGrid}>
                    <TeacherNavAction
                      href={teacherRoutes.sessionDetail(sessionItem.id)}
                      label={
                        sessionItem.editability.isEditable
                          ? "Review And Correct"
                          : "Review Final Result"
                      }
                    />
                  </View>
                </View>
              ))}
            </TeacherCard>
          ) : null}

          <TeacherCard
            title="Next Step"
            subtitle="Return home or jump back into classrooms when you are ready for the next session."
          >
            <View style={styles.actionGrid}>
              <TeacherNavAction href={teacherRoutes.home} label="Home" />
              <TeacherNavAction href={teacherRoutes.classrooms} label="Classrooms" />
              <TeacherNavAction href={teacherRoutes.reports} label="Reports" />
            </View>
          </TeacherCard>
        </>
      ) : (
        <>
          <TeacherStatusBanner status={historyStatus} />
          <TeacherEmptyCard label="No attendance sessions are available for this teacher scope yet." />
        </>
      )}
    </TeacherScreen>
  )
}
