import { Pressable, Text, TextInput, View } from "react-native"

import { mapTeacherApiErrorToMessage } from "../teacher-models"
import {
  TeacherCard,
  TeacherEmptyCard,
  TeacherErrorCard,
  TeacherLoadingCard,
  TeacherNavAction,
  TeacherScreen,
  TeacherSessionSetupCard,
  TeacherStatusBanner,
  formatEnum,
  styles,
} from "./shared-ui"

type ClassroomActionModel = {
  resetButtonLabel: string
  helperMessage: string
  currentCodeLabel: string
}

type RoutePath = string | { pathname: string; params?: Record<string, string> }

type RouteLinks = {
  bluetoothCreate: RoutePath
  roster: RoutePath
  announcements: RoutePath
  schedule: RoutePath
  lectures: RoutePath
}

type CourseInfoDraft = {
  classroomTitle: string
  courseCode: string
}

type Props = {
  hasSession: boolean
  isLoading: boolean
  loadErrorMessage: string | null
  detailStatus: {
    tone: "primary" | "success" | "warning" | "danger"
    title: string
    message: string
  }
  classroomTitle: string
  classroomSubtitle: string
  supportingText: string
  joinCodeLabel: string
  joinCodeExpiryLabel: string
  courseCode: string
  scopeSummary: string
  defaultAttendanceMode: "QR_GPS" | "BLUETOOTH" | string
  timezone: string
  routeLinks: RouteLinks
  canLaunchBluetooth: boolean
  canRotateJoinCode: boolean
  canEditCourseInfo: boolean
  canArchiveClassroom: boolean
  classroomActions: ClassroomActionModel
  isRotateJoinCodePending: boolean
  rotateJoinCodeError: unknown | null
  joinCodeMessage: string | null
  canSaveCourseInfo: boolean
  isEditingCourseInfo: boolean
  courseInfoDraft: CourseInfoDraft | null
  hasCourseChanges: boolean
  isCourseInfoSaving: boolean
  courseInfoMessage: string | null
  courseInfoError: unknown | null
  isArchivePending: boolean
  archiveError: unknown | null
  isArchived: boolean
  rosterCount: number
  announcementsCount: number
  lecturesCount: number
  importsCount: number
  onStartEditCourseInfo: () => void
  onCourseInfoDraftTitleChange: (value: string) => void
  onCourseInfoDraftCodeChange: (value: string) => void
  onSaveCourseInfo: () => void
  onCancelCourseInfo: () => void
  onRotateJoinCode: () => void
  onClearCourseInfoMessage: () => void
  onClearJoinCodeMessage: () => void
  onClearCourseInfoErrorState: () => void
  onArchiveClassroom: () => void
  onBackToClassrooms: () => void
}

export function TeacherClassroomDetailScreenContent({
  hasSession,
  isLoading,
  loadErrorMessage,
  detailStatus,
  classroomTitle,
  classroomSubtitle,
  supportingText,
  joinCodeLabel,
  joinCodeExpiryLabel,
  courseCode,
  scopeSummary,
  defaultAttendanceMode,
  timezone,
  routeLinks,
  canLaunchBluetooth,
  canRotateJoinCode,
  canEditCourseInfo,
  canArchiveClassroom,
  classroomActions,
  isRotateJoinCodePending,
  rotateJoinCodeError,
  joinCodeMessage,
  canSaveCourseInfo,
  isEditingCourseInfo,
  courseInfoDraft,
  hasCourseChanges,
  isCourseInfoSaving,
  courseInfoMessage,
  courseInfoError,
  isArchivePending,
  archiveError,
  isArchived,
  rosterCount,
  announcementsCount,
  lecturesCount,
  importsCount,
  onStartEditCourseInfo,
  onCourseInfoDraftTitleChange,
  onCourseInfoDraftCodeChange,
  onSaveCourseInfo,
  onCancelCourseInfo,
  onRotateJoinCode,
  onClearCourseInfoMessage,
  onClearJoinCodeMessage,
  onClearCourseInfoErrorState,
  onArchiveClassroom,
  onBackToClassrooms,
}: Props) {
  if (!hasSession) {
    return <TeacherSessionSetupCard />
  }

  const safeCourseInfoDraft = courseInfoDraft ?? {
    classroomTitle: "",
    courseCode: "",
  }

  if (isLoading) {
    return (
      <TeacherScreen
        title="Classroom Detail"
        subtitle="Course info, roster, schedule, updates, and Bluetooth launch stay together in one teacher-owned course hub."
      >
        <TeacherLoadingCard label="Loading classroom hub" />
      </TeacherScreen>
    )
  }

  if (loadErrorMessage) {
    return (
      <TeacherScreen
        title="Classroom Detail"
        subtitle="Course info, roster, schedule, updates, and Bluetooth launch stay together in one teacher-owned course hub."
      >
        <TeacherErrorCard label={loadErrorMessage} />
      </TeacherScreen>
    )
  }

  const canSaveCourse =
    Boolean(isEditingCourseInfo && safeCourseInfoDraft) &&
    canSaveCourseInfo &&
    !isCourseInfoSaving &&
    hasCourseChanges &&
    safeCourseInfoDraft.classroomTitle.trim().length >= 3 &&
    safeCourseInfoDraft.courseCode.trim().length >= 3

  return (
    <TeacherScreen
      title="Classroom Detail"
      subtitle="Course info, roster, schedule, updates, and Bluetooth launch stay together in one teacher-owned course hub."
    >
      <TeacherStatusBanner status={detailStatus} />

      <TeacherCard title={classroomTitle} subtitle={classroomSubtitle}>
        <Text style={styles.listMeta}>{supportingText}</Text>
        <Text style={styles.listMeta}>Join code: {classroomActions.currentCodeLabel}</Text>
        <Text style={styles.listMeta}>Join code expiry: {joinCodeExpiryLabel}</Text>
        <Text style={styles.listMeta}>Academic scope: {scopeSummary}</Text>
        <Text style={styles.listMeta}>
          Default attendance mode: {formatEnum(defaultAttendanceMode as never)}
        </Text>
        <Text style={styles.listMeta}>Timezone: {timezone}</Text>

        <View style={styles.actionGrid}>
          {canLaunchBluetooth ? (
            <TeacherNavAction href={routeLinks.bluetoothCreate} label="Bluetooth Session" />
          ) : null}
          <TeacherNavAction href={routeLinks.roster} label="Roster" />
          <TeacherNavAction href={routeLinks.announcements} label="Announcements" />
          <TeacherNavAction href={routeLinks.schedule} label="Schedule" />
          <TeacherNavAction href={routeLinks.lectures} label="Lectures" />
        </View>

        {canRotateJoinCode ? (
          <Pressable
            style={styles.secondaryButton}
            disabled={isRotateJoinCodePending}
            onPress={() => {
              onClearCourseInfoErrorState()
              onClearJoinCodeMessage()
              onRotateJoinCode()
            }}
          >
            <Text style={styles.secondaryButtonLabel}>{classroomActions.resetButtonLabel}</Text>
          </Pressable>
        ) : null}
        <Text style={styles.listMeta}>{classroomActions.helperMessage}</Text>
        <Text style={styles.listMeta}>Last code shown: {joinCodeLabel}</Text>
        {joinCodeMessage ? <Text style={styles.successText}>{joinCodeMessage}</Text> : null}
        {rotateJoinCodeError ? (
          <Text style={styles.errorText}>{mapTeacherApiErrorToMessage(rotateJoinCodeError)}</Text>
        ) : null}
      </TeacherCard>

      <TeacherCard
        title="Course Info"
        subtitle={
          canEditCourseInfo
            ? "Update the classroom title and course code without leaving the teacher course hub."
            : "This classroom is read-only on this phone."
        }
      >
        <Text style={styles.listMeta}>{scopeSummary}</Text>
        {canEditCourseInfo && courseInfoDraft ? (
          <>
            {!isEditingCourseInfo ? (
              <View style={styles.actionGrid}>
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => {
                    onClearCourseInfoMessage()
                    onStartEditCourseInfo()
                  }}
                >
                  <Text style={styles.primaryButtonLabel}>Edit Course Info</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={styles.fieldLabel}>Classroom title</Text>
                <TextInput
                  value={courseInfoDraft.classroomTitle}
                  autoCapitalize="words"
                  placeholder="Applied Mathematics"
                  onChangeText={onCourseInfoDraftTitleChange}
                  style={styles.input}
                />
                <Text style={styles.fieldLabel}>Course code</Text>
                <TextInput
                  value={courseInfoDraft.courseCode}
                  autoCapitalize="characters"
                  placeholder="CSE6-MATH-A"
                  onChangeText={onCourseInfoDraftCodeChange}
                  style={styles.input}
                />
                <View style={styles.actionGrid}>
                  <Pressable
                    style={[styles.primaryButton, !canSaveCourse ? styles.disabledButton : null]}
                    disabled={!canSaveCourse}
                    onPress={() => {
                      onClearCourseInfoMessage()
                      onSaveCourseInfo()
                    }}
                  >
                    <Text style={styles.primaryButtonLabel}>
                      {isCourseInfoSaving ? "Saving..." : "Save Course Info"}
                    </Text>
                  </Pressable>
                  <Pressable style={styles.secondaryButton} onPress={onCancelCourseInfo}>
                    <Text style={styles.secondaryButtonLabel}>Cancel</Text>
                  </Pressable>
                </View>
              </>
            )}
          </>
        ) : (
          <>
            <Text style={styles.listMeta}>
              Course info changes are controlled by classroom permissions from the backend.
            </Text>
            <Text style={styles.listMeta}>Title: {classroomTitle}</Text>
            <Text style={styles.listMeta}>Course code: {courseCode}</Text>
          </>
        )}
        {courseInfoMessage ? <Text style={styles.successText}>{courseInfoMessage}</Text> : null}
        {courseInfoError ? (
          <Text style={styles.errorText}>{mapTeacherApiErrorToMessage(courseInfoError)}</Text>
        ) : null}
      </TeacherCard>

      {canArchiveClassroom ? (
        <TeacherCard
          title="Archive Classroom"
          subtitle="Archive keeps attendance history safe while removing the classroom from active teaching work."
        >
          <Text style={styles.listMeta}>
            Archive when the course is finished or should no longer accept active classroom work.
          </Text>
          <Pressable
            style={[styles.dangerButton, isArchivePending ? styles.disabledButton : null]}
            disabled={isArchivePending}
            onPress={onArchiveClassroom}
          >
            <Text style={styles.primaryButtonLabel}>
              {isArchivePending ? "Archiving..." : "Archive Classroom"}
            </Text>
          </Pressable>
          {archiveError ? (
            <Text style={styles.errorText}>{mapTeacherApiErrorToMessage(archiveError)}</Text>
          ) : null}
          {isArchived ? (
            <View style={styles.actionGrid}>
              <Pressable style={styles.secondaryButton} onPress={onBackToClassrooms}>
                <Text style={styles.secondaryButtonLabel}>Back To Classrooms</Text>
              </Pressable>
            </View>
          ) : null}
        </TeacherCard>
      ) : null}

      <TeacherCard
        title="Classroom Hub Preview"
        subtitle="Counts here come from the same live endpoints the dedicated classroom student, schedule, update, and lecture routes use."
      >
        <View style={styles.cardGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Roster Members</Text>
            <Text style={[styles.metricValue, styles.primaryTone]}>{rosterCount}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Announcements</Text>
            <Text style={[styles.metricValue, styles.successTone]}>{announcementsCount}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Lectures</Text>
            <Text style={[styles.metricValue, styles.warningTone]}>{lecturesCount}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Import Jobs</Text>
            <Text style={[styles.metricValue, styles.dangerTone]}>{importsCount}</Text>
          </View>
        </View>
      </TeacherCard>
    </TeacherScreen>
  )
}
