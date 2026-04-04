import type {
  AttendanceMode,
  ClassroomSchedule,
  LectureSummary,
  LiveAttendanceSessionSummary,
  StudentClassroomMembershipSummary,
} from "@attendease/contracts"

import type { StudentAttendanceGateModel } from "./device-trust"
import type { CardTone } from "./student-models"
import {
  buildAttendanceCandidateMessage,
  formatAttendanceModeLabel,
  formatDateTimeLabel,
  formatEnrollmentStatusLabel,
  pluralizeLabel,
  resolveLectureTimestamp,
} from "./student-workflow-models-helpers"
import type {
  StudentAttendanceCandidate,
  StudentAttendanceOverviewModel,
  StudentClassroomDetailSummaryModel,
  StudentCourseDiscoveryCardModel,
} from "./student-workflow-models-types"

export function buildStudentAttendanceCandidates(input: {
  classrooms: StudentClassroomMembershipSummary[]
  liveSessions: LiveAttendanceSessionSummary[]
  mode?: Extract<AttendanceMode, "QR_GPS" | "BLUETOOTH">
  // v2.0: Set of sessionIds where the student already has a PRESENT record.
  markedSessionIds?: Set<string>
}): StudentAttendanceCandidate[] {
  return input.classrooms
    .filter((classroom) => classroom.enrollmentStatus === "ACTIVE")
    .flatMap((classroom) => {
      return input.liveSessions
        .filter((session) => session.classroomId === classroom.id)
        .filter((session) => session.status === "ACTIVE")
        .filter((session) => (input.mode ? session.mode === input.mode : true))
        .map((session) => ({
          sessionId: session.id,
          classroomId: classroom.id,
          subjectId: classroom.subjectId,
          classroomTitle: classroom.displayTitle,
          lectureId: session.lectureId,
          lectureTitle: session.lectureTitle ?? "Live attendance session",
          mode: session.mode as Extract<AttendanceMode, "QR_GPS" | "BLUETOOTH">,
          timestamp:
            session.startedAt ??
            session.lectureDate ??
            session.scheduledEndAt ??
            new Date().toISOString(),
          requiresTrustedDevice: classroom.requiresTrustedDevice,
          isMarked: input.markedSessionIds?.has(session.id) ?? false,
        }))
    })
    .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime())
}

export function buildStudentAttendanceOverviewModel(input: {
  qrCandidates: StudentAttendanceCandidate[]
  bluetoothCandidates: StudentAttendanceCandidate[]
  gateModel: StudentAttendanceGateModel
}): StudentAttendanceOverviewModel {
  const totalOpenSessions = input.qrCandidates.length + input.bluetoothCandidates.length
  const recommendedMode =
    input.qrCandidates.length === 0 && input.bluetoothCandidates.length === 0
      ? null
      : input.qrCandidates.length >= input.bluetoothCandidates.length
        ? "QR_GPS"
        : "BLUETOOTH"

  return {
    totalOpenSessions,
    qrReadyCount: input.qrCandidates.length,
    bluetoothReadyCount: input.bluetoothCandidates.length,
    recommendedMode,
    gateTone: input.gateModel.tone,
  }
}

export function buildStudentCourseDiscoveryCards(input: {
  classrooms: StudentClassroomMembershipSummary[]
  lectureSets: Array<{ classroomId: string; lectures: LectureSummary[] }>
  qrCandidates: StudentAttendanceCandidate[]
  bluetoothCandidates: StudentAttendanceCandidate[]
}): StudentCourseDiscoveryCardModel[] {
  const activeCandidates = [...input.qrCandidates, ...input.bluetoothCandidates]

  return [...input.classrooms]
    .filter((classroom) => classroom.enrollmentStatus === "ACTIVE")
    .map((classroom) => {
      const candidates = activeCandidates.filter(
        (candidate) => candidate.classroomId === classroom.id,
      )
      const lectures =
        input.lectureSets.find((lectureSet) => lectureSet.classroomId === classroom.id)?.lectures ??
        []
      const nextSession = lectures
        .filter((lecture) => lecture.status !== "CANCELLED")
        .sort(
          (left, right) =>
            new Date(resolveLectureTimestamp(left)).getTime() -
            new Date(resolveLectureTimestamp(right)).getTime(),
        )[0]

      // v2.0: Partition candidates into marked (already submitted) and unmarked.
      const unmarked = candidates.filter((c) => !c.isMarked)
      const allMarked = candidates.length > 0 && unmarked.length === 0

      return {
        classroomId: classroom.id,
        title: classroom.displayTitle,
        subtitle: `${classroom.code} · ${formatAttendanceModeLabel(classroom.defaultAttendanceMode)}`,
        teacherName: classroom.primaryTeacherDisplayName ?? null,
        attendanceTitle: allMarked
          ? "Attendance marked"
          : candidates.length > 0
            ? candidates.length === 1
              ? "Attendance open now"
              : `${candidates.length} attendance sessions open`
            : "No attendance session open",
        attendanceMessage: allMarked
          ? "Your attendance has been recorded for this session."
          : candidates.length > 0
            ? buildAttendanceCandidateMessage(candidates)
            : nextSession
              ? `Next class session: ${formatDateTimeLabel(resolveLectureTimestamp(nextSession))}`
              : "No class session is published yet.",
        attendanceTone: (allMarked ? "success" : candidates.length > 0 ? "success" : "primary") as CardTone,
        updatesLabel: "Open updates and schedule from the course page.",
        scheduleLabel: nextSession
          ? `Next: ${formatDateTimeLabel(resolveLectureTimestamp(nextSession))}`
          : "Open schedule",
        hasOpenAttendance: candidates.length > 0,
        hasMarkedAttendance: allMarked,
        unmarkedCandidateCount: unmarked.length,
      }
    })
    .sort((left, right) => {
      if (left.hasOpenAttendance !== right.hasOpenAttendance) {
        return left.hasOpenAttendance ? -1 : 1
      }

      return left.title.localeCompare(right.title)
    })
}

export function buildStudentClassroomDetailSummaryModel(input: {
  classroom: Pick<
    StudentClassroomMembershipSummary,
    "id" | "code" | "displayTitle" | "defaultAttendanceMode" | "enrollmentStatus"
  >
  lectures: LectureSummary[]
  schedule: ClassroomSchedule | null
  announcementCount: number
  attendanceCandidates: StudentAttendanceCandidate[]
  gateModel: StudentAttendanceGateModel
}): StudentClassroomDetailSummaryModel {
  const nextSession = [...input.lectures]
    .filter((lecture) => lecture.status !== "CANCELLED")
    .sort(
      (left, right) =>
        new Date(resolveLectureTimestamp(left)).getTime() -
        new Date(resolveLectureTimestamp(right)).getTime(),
    )[0]

  if (input.attendanceCandidates.length > 0 && input.gateModel.canContinue) {
    return {
      title: input.classroom.displayTitle,
      subtitle: `${input.classroom.code} · ${formatEnrollmentStatusLabel(input.classroom.enrollmentStatus)}`,
      attendanceTitle:
        input.attendanceCandidates.length === 1
          ? "Attendance is open in this course"
          : `${input.attendanceCandidates.length} attendance sessions are open in this course`,
      attendanceMessage: buildAttendanceCandidateMessage(input.attendanceCandidates),
      attendanceTone: "success",
      updatesLabel: `${input.announcementCount} ${pluralizeLabel("update", input.announcementCount)}`,
      scheduleLabel: `${input.schedule?.scheduleSlots.length ?? 0} weekly ${pluralizeLabel(
        "slot",
        input.schedule?.scheduleSlots.length ?? 0,
      )}`,
      nextSessionLabel: nextSession
        ? `Next class session: ${formatDateTimeLabel(resolveLectureTimestamp(nextSession))}`
        : "No future class session is published yet.",
      openAttendanceCount: input.attendanceCandidates.length,
    }
  }

  if (input.attendanceCandidates.length > 0 && !input.gateModel.canContinue) {
    return {
      title: input.classroom.displayTitle,
      subtitle: `${input.classroom.code} · ${formatEnrollmentStatusLabel(input.classroom.enrollmentStatus)}`,
      attendanceTitle: input.gateModel.title,
      attendanceMessage: input.gateModel.message,
      attendanceTone: input.gateModel.tone,
      updatesLabel: `${input.announcementCount} ${pluralizeLabel("update", input.announcementCount)}`,
      scheduleLabel: `${input.schedule?.scheduleSlots.length ?? 0} weekly ${pluralizeLabel(
        "slot",
        input.schedule?.scheduleSlots.length ?? 0,
      )}`,
      nextSessionLabel: nextSession
        ? `Next class session: ${formatDateTimeLabel(resolveLectureTimestamp(nextSession))}`
        : "No future class session is published yet.",
      openAttendanceCount: input.attendanceCandidates.length,
    }
  }

  return {
    title: input.classroom.displayTitle,
    subtitle: `${input.classroom.code} · ${formatEnrollmentStatusLabel(input.classroom.enrollmentStatus)}`,
    attendanceTitle: "No attendance session is open right now",
    attendanceMessage: nextSession
      ? `Next class session: ${formatDateTimeLabel(resolveLectureTimestamp(nextSession))}`
      : `This course is set up for ${formatAttendanceModeLabel(input.classroom.defaultAttendanceMode)} attendance when the next session opens.`,
    attendanceTone: "primary",
    updatesLabel: `${input.announcementCount} ${pluralizeLabel("update", input.announcementCount)}`,
    scheduleLabel: `${input.schedule?.scheduleSlots.length ?? 0} weekly ${pluralizeLabel(
      "slot",
      input.schedule?.scheduleSlots.length ?? 0,
    )}`,
    nextSessionLabel: nextSession
      ? `Next class session: ${formatDateTimeLabel(resolveLectureTimestamp(nextSession))}`
      : "No future class session is published yet.",
    openAttendanceCount: 0,
  }
}
