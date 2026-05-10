import { getColors } from "@attendease/ui-mobile"
import { Ionicons } from "@expo/vector-icons"
import { useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { mapStudentApiErrorToMessage } from "../student-models"
import { useStudentRefreshAction } from "../student-query"
import { useStudentSession } from "../student-session"
import { buildStudentHistoryRefreshStatus } from "../student-view-state"
import { buildStudentAttendanceInsightModel } from "../student-workflow-models"

import { useStudentAttendanceHistoryData } from "./queries"
import {
  StudentBackButton,
  StudentCard,
  StudentEmptyCard,
  StudentErrorCard,
  StudentLoadingCard,
  StudentScreen,
  StudentSessionSetupCard,
  StudentStatusBanner,
  formatDateTime,
  styles,
  toneColorStyle,
} from "./shared-ui"

export function StudentHistoryScreen() {
  const { session, draft } = useStudentSession()
  const c = getColors()
  const history = useStudentAttendanceHistoryData()
  const refreshStudentExperience = useStudentRefreshAction({
    installId: draft.installId,
  })
  const [isRefreshing, setIsRefreshing] = useState(false)
  const historyStatus = buildStudentHistoryRefreshStatus({
    isLoading: history.historyQuery.isLoading,
    isRefreshing,
    recordCount: history.historyRows.length,
  })
  const historyInsight = buildStudentAttendanceInsightModel({
    attendancePercentage: history.historySummary.attendancePercentage,
    totalSessions: history.historySummary.totalRecords,
    presentSessions: history.historySummary.presentCount,
    absentSessions: history.historySummary.absentCount,
  })

  return (
    <StudentScreen title="Attendance History" subtitle="Your attendance record.">
      <StudentBackButton label="Back to Attendance" />
      {session ? <StudentStatusBanner status={historyStatus} /> : null}
      {!session ? (
        <StudentSessionSetupCard />
      ) : history.historyQuery.isLoading ? (
        <StudentLoadingCard label="Loading your attendance history" />
      ) : history.historyQuery.error ? (
        <StudentErrorCard label={mapStudentApiErrorToMessage(history.historyQuery.error)} />
      ) : history.historyRows.length ? (
        <>
          <StudentCard title={historyInsight.title} subtitle={historyInsight.message}>
            {/* Attendance Progress Bar */}
            <View style={{ gap: 6 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: "800",
                    color: toneColorStyle(historyInsight.tone).color,
                  }}
                >
                  {history.historySummary.attendancePercentage}%
                </Text>
                <Pressable
                  disabled={isRefreshing}
                  onPress={async () => {
                    setIsRefreshing(true)
                    try {
                      await refreshStudentExperience()
                    } finally {
                      setIsRefreshing(false)
                    }
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    opacity: isRefreshing ? 0.5 : 1,
                  }}
                >
                  <Ionicons name="refresh-outline" size={14} color={c.primary} />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: c.primary,
                    }}
                  >
                    {isRefreshing ? "Refreshing…" : "Refresh"}
                  </Text>
                </Pressable>
              </View>
              <View
                style={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: c.surfaceMuted,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: 8,
                    borderRadius: 4,
                    width: `${Math.min(100, history.historySummary.attendancePercentage)}%`,
                    backgroundColor: toneColorStyle(historyInsight.tone).color,
                  }}
                />
              </View>
            </View>

            <View style={styles.cardGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Sessions</Text>
                <Text style={[styles.metricValue, styles.primaryTone]}>
                  {history.historySummary.totalRecords}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Present</Text>
                <Text style={[styles.metricValue, styles.successTone]}>
                  {history.historySummary.presentCount}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Absent</Text>
                <Text style={[styles.metricValue, styles.dangerTone]}>
                  {history.historySummary.absentCount}
                </Text>
              </View>
            </View>
            {history.historySummary.lastRecordedAt ? (
              <Text style={styles.listMeta}>
                Last recorded: {formatDateTime(history.historySummary.lastRecordedAt)}
              </Text>
            ) : null}
          </StudentCard>
          <StudentCard title="Recent Records">
            {history.historyRows.map((item) => {
              const isPresent = item.statusTone === "success"
              return (
                <View
                  key={item.attendanceRecordId}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 12,
                    paddingVertical: 10,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: c.border,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: isPresent ? c.successSoft : c.dangerSoft,
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 2,
                    }}
                  >
                    <Ionicons
                      name={isPresent ? "checkmark-circle" : "close-circle"}
                      size={20}
                      color={isPresent ? c.success : c.danger}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.listTitle}>{item.title}</Text>
                    <Text style={styles.listMeta}>{item.subtitle}</Text>
                    <Text style={[styles.bodyText, toneColorStyle(item.statusTone)]}>
                      {item.statusLabel} · {item.timeLabel}
                    </Text>
                    <Text style={styles.listMeta}>{item.detailLabel}</Text>
                  </View>
                </View>
              )
            })}
          </StudentCard>
        </>
      ) : (
        <StudentEmptyCard label="No attendance records yet." />
      )}
    </StudentScreen>
  )
}
