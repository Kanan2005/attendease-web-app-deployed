import { Pressable, Text, View } from "react-native"

import { mapTeacherApiErrorToMessage } from "../teacher-models"
import { teacherRoutes } from "../teacher-routes"
import type { buildTeacherReportsStatus } from "../teacher-view-state"
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
  styles,
  toneColorStyle,
} from "./shared-ui"

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
    }>
    daywiseRows: Array<{
      classroomId: string
      attendanceDate: string
      classroomTitle: string
      attendanceLabel: string
      sessionSummary: string
      tone: "primary" | "success" | "warning" | "danger"
      lastActivityLabel: string
    }>
  }
  filterOptions: {
    classroomOptions: Array<{ label: string; value: string }>
    subjectOptions: Array<{ label: string; value: string }>
  }
  classroomsQuery: { isLoading: boolean; error: unknown | null }
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

export function TeacherReportsScreenContent({
  session,
  reports,
  selectedClassroomId,
  selectedSubjectId,
  reportsStatus,
  setSelectedClassroomId,
  setSelectedSubjectId,
}: Props) {
  const classroomsLoading = reports.classroomsQuery.isLoading
  const daywiseLoading = reports.daywiseQuery.isLoading
  const subjectwiseLoading = reports.subjectwiseQuery.isLoading
  const percentagesLoading = reports.studentPercentagesQuery.isLoading
  const optionsLoading = reports.subjectOptionsQuery.isLoading
  const loadError =
    reports.classroomsQuery.error ??
    reports.daywiseQuery.error ??
    reports.subjectwiseQuery.error ??
    reports.studentPercentagesQuery.error ??
    reports.subjectOptionsQuery.error

  if (!session) {
    return <TeacherSessionSetupCard />
  }

  if (
    classroomsLoading ||
    daywiseLoading ||
    subjectwiseLoading ||
    percentagesLoading ||
    optionsLoading
  ) {
    return <TeacherLoadingCard label="Loading teacher reports" />
  }

  if (loadError) {
    return <TeacherErrorCard label={mapTeacherApiErrorToMessage(loadError)} />
  }

  return (
    <TeacherScreen
      title="Reports"
      subtitle="Review attendance trends, follow-up risk, and export-ready totals without leaving teacher mobile."
    >
      <TeacherStatusBanner status={reportsStatus} />

      <TeacherCard
        title="Filters"
        subtitle="Choose the classroom and subject you want to review, then keep exports close when you need a file."
      >
        <Text style={styles.listMeta}>Classroom</Text>
        <View style={styles.actionGrid}>
          <Pressable
            style={[
              styles.secondaryButton,
              !selectedClassroomId ? styles.selectedActionButton : null,
            ]}
            onPress={() => setSelectedClassroomId("")}
          >
            <Text style={styles.secondaryButtonLabel}>All Classrooms</Text>
          </Pressable>
          {reports.filterOptions.classroomOptions.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.secondaryButton,
                selectedClassroomId === option.value ? styles.selectedActionButton : null,
              ]}
              onPress={() => setSelectedClassroomId(option.value)}
            >
              <Text style={styles.secondaryButtonLabel}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.listMeta}>Subject</Text>
        <View style={styles.actionGrid}>
          <Pressable
            style={[
              styles.secondaryButton,
              !selectedSubjectId ? styles.selectedActionButton : null,
            ]}
            onPress={() => setSelectedSubjectId("")}
          >
            <Text style={styles.secondaryButtonLabel}>All Subjects</Text>
          </Pressable>
          {reports.filterOptions.subjectOptions.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.secondaryButton,
                selectedSubjectId === option.value ? styles.selectedActionButton : null,
              ]}
              onPress={() => setSelectedSubjectId(option.value)}
            >
              <Text style={styles.secondaryButtonLabel}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.actionGrid}>
          <TeacherNavAction href={teacherRoutes.exports} label="Open Exports" />
        </View>
      </TeacherCard>

      <TeacherCard title="Overview" subtitle={reports.model.availabilityMessage}>
        <View style={styles.cardGrid}>
          {reports.model.summaryCards.map((card) => (
            <View key={card.label} style={styles.metricCard}>
              <Text style={styles.metricLabel}>{card.label}</Text>
              <Text style={[styles.metricValue, toneColorStyle(card.tone)]}>{card.value}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.listMeta}>{reports.model.filterSummary}</Text>
        <Text style={styles.listMeta}>{reports.model.subjectSummary}</Text>
        <Text style={styles.listMeta}>{reports.model.studentSummary}</Text>
        <Text style={styles.listMeta}>{reports.model.daywiseSummary}</Text>
        <View style={styles.actionGrid}>
          <TeacherNavAction href={teacherRoutes.exports} label="Queue Export" />
          <TeacherNavAction href={teacherRoutes.sessionHistory} label="Session History" />
        </View>
      </TeacherCard>

      <TeacherCard
        title="Subject View"
        subtitle="Review each classroom and subject combination with one attendance summary card."
      >
        {reports.model.subjectRows.length ? (
          reports.model.subjectRows.map((row) => (
            <View key={`${row.classroomId}-${row.subjectId}`} style={styles.highlightCard}>
              <Text style={styles.listTitle}>{row.subjectTitle}</Text>
              <Text style={styles.listMeta}>
                {row.classroomTitle} · {row.attendanceLabel}
              </Text>
              <Text style={[styles.listMeta, toneColorStyle(row.tone)]}>{row.sessionSummary}</Text>
              <Text style={styles.listMeta}>{row.lastActivityLabel}</Text>
            </View>
          ))
        ) : (
          <TeacherEmptyCard label="No subject-wise report rows are available for the current filters." />
        )}
      </TeacherCard>

      <TeacherCard
        title="Student Follow-Up"
        subtitle="Use the student list to spot strong attendance first and follow-up work next."
      >
        {reports.model.studentRows.length ? (
          reports.model.studentRows.map((row) => (
            <View key={`${row.classroomId}-${row.studentId}`} style={styles.highlightCard}>
              <Text style={styles.listTitle}>{row.studentDisplayName}</Text>
              <Text style={styles.listMeta}>
                {row.classroomTitle} · {row.subjectTitle} · {row.attendanceLabel}
              </Text>
              <Text style={[styles.listMeta, toneColorStyle(row.tone)]}>{row.followUpLabel}</Text>
              <Text style={styles.listMeta}>{row.sessionSummary}</Text>
              <Text style={styles.listMeta}>
                {row.lastSessionAt
                  ? `Last class session ${formatDateTime(row.lastSessionAt)}`
                  : "No recent class session recorded"}
              </Text>
            </View>
          ))
        ) : (
          <TeacherEmptyCard label="No student percentage rows are available for the current filters." />
        )}
      </TeacherCard>

      <TeacherCard
        title="Day-wise Trend"
        subtitle="Scan recent teaching days quickly before you decide whether to correct a session or export the data."
      >
        {reports.model.daywiseRows.length ? (
          reports.model.daywiseRows.map((row) => (
            <View key={`${row.classroomId}-${row.attendanceDate}`} style={styles.highlightCard}>
              <Text style={styles.listTitle}>{row.classroomTitle}</Text>
              <Text style={styles.listMeta}>
                {formatDateTime(row.attendanceDate)} · {row.attendanceLabel}
              </Text>
              <Text style={[styles.listMeta, toneColorStyle(row.tone)]}>{row.sessionSummary}</Text>
              <Text style={styles.listMeta}>{row.lastActivityLabel}</Text>
            </View>
          ))
        ) : (
          <TeacherEmptyCard label="No day-wise attendance rows are available for the current filters." />
        )}

        <View style={styles.actionGrid}>
          <TeacherNavAction href={teacherRoutes.exports} label="Open Exports" />
          <TeacherNavAction href={teacherRoutes.home} label="Home" />
        </View>
      </TeacherCard>
    </TeacherScreen>
  )
}
