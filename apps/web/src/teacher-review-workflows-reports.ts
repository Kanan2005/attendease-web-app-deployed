import type {
  TeacherDaywiseAttendanceReportRow,
  TeacherStudentAttendancePercentageReportRow,
  TeacherSubjectwiseAttendanceReportRow,
} from "@attendease/contracts"
import { calculateAttendancePercentage } from "@attendease/domain"

import {
  formatEnumLabel,
  formatReviewDateTime,
  toneForAttendancePercentage,
} from "./teacher-review-workflows-shared"
import type { TeacherWebReportOverviewModel } from "./teacher-review-workflows-types"

export function buildTeacherWebReportOverviewModel(input: {
  daywiseRows: TeacherDaywiseAttendanceReportRow[]
  subjectRows: TeacherSubjectwiseAttendanceReportRow[]
  studentRows: TeacherStudentAttendancePercentageReportRow[]
  filterSummary: string
}): TeacherWebReportOverviewModel {
  const uniqueClassroomIds = new Set(input.subjectRows.map((row) => row.classroomId))
  const uniqueSubjectIds = new Set(input.subjectRows.map((row) => row.subjectId))
  const uniqueStudentIds = new Set(input.studentRows.map((row) => row.studentId))
  const totalPresent = input.studentRows.reduce((sum, row) => sum + row.presentSessions, 0)
  const totalSessions = input.studentRows.reduce((sum, row) => sum + row.totalSessions, 0)
  const studentsNeedingFollowUp = input.studentRows.filter(
    (row) => row.totalSessions > 0 && row.attendancePercentage < 75,
  ).length
  const overallAttendance = calculateAttendancePercentage({
    presentCount: totalPresent,
    totalCount: totalSessions,
  })
  const latestDaywiseRow = [...input.daywiseRows].sort(
    (left, right) =>
      new Date(right.lastSessionAt ?? right.attendanceDate).getTime() -
      new Date(left.lastSessionAt ?? left.attendanceDate).getTime(),
  )[0]

  return {
    summaryCards: [
      {
        label: "Classrooms",
        value: String(uniqueClassroomIds.size),
        tone: uniqueClassroomIds.size > 0 ? "primary" : "warning",
      },
      {
        label: "Subjects",
        value: String(uniqueSubjectIds.size),
        tone: uniqueSubjectIds.size > 0 ? "success" : "warning",
      },
      {
        label: "Students",
        value: String(uniqueStudentIds.size),
        tone: uniqueStudentIds.size > 0 ? "primary" : "warning",
      },
      {
        label: "Attendance",
        value: `${overallAttendance}%`,
        tone: toneForAttendancePercentage(overallAttendance),
      },
    ],
    filterSummary: input.filterSummary,
    availabilityMessage:
      "Reports now use the same final attendance truth as session review, manual corrections, and exports.",
    subjectSummary:
      input.subjectRows.length > 0
        ? `${input.subjectRows.length} course rollup${input.subjectRows.length === 1 ? "" : "s"} are in scope right now.`
        : "No subject rollups match the current filter yet.",
    studentSummary:
      uniqueStudentIds.size > 0
        ? `${studentsNeedingFollowUp} student${studentsNeedingFollowUp === 1 ? "" : "s"} need follow-up in this view.`
        : "No student attendance rows match the current filter yet.",
    daywiseSummary: latestDaywiseRow
      ? `Most recent teaching day: ${formatReviewDateTime(latestDaywiseRow.lastSessionAt ?? latestDaywiseRow.attendanceDate)}.`
      : "No day-wise trend is available for the current filter yet.",
    subjectRows: [...input.subjectRows]
      .sort(
        (left, right) =>
          left.attendancePercentage - right.attendancePercentage ||
          left.subjectTitle.localeCompare(right.subjectTitle),
      )
      .map((row) => ({
        subjectId: row.subjectId,
        classroomId: row.classroomId,
        title: row.subjectTitle,
        courseContextLabel: `${row.classTitle} · ${row.sectionTitle} · ${row.classroomDisplayTitle}`,
        attendancePercentage: row.attendancePercentage,
        attendanceLabel: `${row.attendancePercentage}% attendance`,
        sessionSummary: `${row.totalSessions} session${row.totalSessions === 1 ? "" : "s"} · ${row.presentCount} present · ${row.absentCount} absent`,
        lastSessionAt: row.lastSessionAt,
        tone: toneForAttendancePercentage(row.attendancePercentage),
      })),
    studentRows: [...input.studentRows]
      .sort(
        (left, right) =>
          left.attendancePercentage - right.attendancePercentage ||
          left.studentDisplayName.localeCompare(right.studentDisplayName),
      )
      .map((row) => ({
        studentId: row.studentId,
        title: row.studentDisplayName,
        supportingLabel: row.studentRollNumber
          ? `${row.studentRollNumber} · ${row.classroomDisplayTitle} · ${row.subjectTitle}`
          : `${row.studentEmail} · ${row.classroomDisplayTitle} · ${row.subjectTitle}`,
        attendancePercentage: row.attendancePercentage,
        attendanceLabel: `${row.attendancePercentage}% attendance`,
        sessionSummary: `${row.presentSessions}/${row.totalSessions} present · ${formatEnumLabel(row.enrollmentStatus)}`,
        followUpLabel:
          row.totalSessions === 0
            ? "No sessions yet"
            : row.attendancePercentage >= 75
              ? "Healthy attendance"
              : row.attendancePercentage >= 50
                ? "Needs follow-up"
                : "Immediate follow-up",
        lastSessionAt: row.lastSessionAt,
        tone: toneForAttendancePercentage(row.attendancePercentage),
      })),
    daywiseRows: [...input.daywiseRows]
      .sort(
        (left, right) =>
          new Date(right.lastSessionAt ?? right.attendanceDate).getTime() -
          new Date(left.lastSessionAt ?? left.attendanceDate).getTime(),
      )
      .map((row) => ({
        attendanceDate: row.attendanceDate,
        classroomId: row.classroomId,
        title: `${row.subjectTitle} · ${row.classroomDisplayTitle}`,
        dateLabel: formatReviewDateTime(row.lastSessionAt ?? row.attendanceDate),
        attendancePercentage: row.attendancePercentage,
        attendanceLabel: `${row.attendancePercentage}% attendance`,
        sessionSummary: `${row.sessionCount} session${row.sessionCount === 1 ? "" : "s"} · ${row.presentCount} present · ${row.absentCount} absent`,
        lastSessionAt: row.lastSessionAt,
        tone: toneForAttendancePercentage(row.attendancePercentage),
      })),
    hasAnyData:
      input.daywiseRows.length > 0 || input.subjectRows.length > 0 || input.studentRows.length > 0,
  }
}
