import type {
  AdminClassroomGovernanceDetail,
  AdminClassroomGovernanceSummary,
  ClassroomStatus,
} from "@attendease/contracts"

function buildScopeSummary(input: {
  semesterCode?: string | null | undefined
  semesterTitle?: string | null | undefined
  classCode?: string | null | undefined
  classTitle?: string | null | undefined
  sectionCode?: string | null | undefined
  sectionTitle?: string | null | undefined
  subjectCode?: string | null | undefined
  subjectTitle?: string | null | undefined
}) {
  const semesterLabel = input.semesterTitle ?? input.semesterCode ?? "Semester"
  const cohortLabel =
    [input.classCode, input.sectionCode].filter(Boolean).join(" ") ||
    [input.classTitle, input.sectionTitle].filter(Boolean).join(" ") ||
    "Classroom"
  const subjectLabel = input.subjectTitle ?? input.subjectCode ?? "Subject"

  return `${semesterLabel} · ${cohortLabel} · ${subjectLabel}`
}

export function buildAdminClassroomGovernanceSummaryMessage(count: number, query: string) {
  if (count === 0) {
    return `No classrooms matched "${query}".`
  }

  if (count === 1) {
    return `Loaded 1 classroom for "${query}".`
  }

  return `Loaded ${count} classrooms for "${query}".`
}

export function buildAdminClassroomArchiveReadiness(input: {
  classroomStatus: ClassroomStatus
  liveAttendanceSessionCount: number
  reason: string
  acknowledged: boolean
}) {
  if (input.classroomStatus === "ARCHIVED") {
    return {
      allowed: false,
      message: "Archived classrooms stay read-only and keep their history intact.",
    }
  }

  if (input.reason.trim().length < 3) {
    return {
      allowed: false,
      message: "Add a clear governance reason before you archive this classroom.",
    }
  }

  if (!input.acknowledged) {
    return {
      allowed: false,
      message: "Confirm that you reviewed history impact before you archive this classroom.",
    }
  }

  if (input.liveAttendanceSessionCount > 0) {
    return {
      allowed: false,
      message: "End the live attendance session before you archive this classroom.",
    }
  }

  return {
    allowed: true,
    message:
      "Archiving revokes the join code and stops new classroom changes while keeping attendance history and audits available.",
  }
}

export function buildAdminClassroomGovernanceListCard(
  classroom: Pick<
    AdminClassroomGovernanceSummary,
    | "id"
    | "displayTitle"
    | "classroomTitle"
    | "code"
    | "courseCode"
    | "semesterCode"
    | "semesterTitle"
    | "classCode"
    | "classTitle"
    | "sectionCode"
    | "sectionTitle"
    | "subjectCode"
    | "subjectTitle"
    | "primaryTeacherDisplayName"
    | "status"
    | "governance"
  >,
) {
  return {
    classroomId: classroom.id,
    classroomTitle: classroom.classroomTitle ?? classroom.displayTitle,
    courseCode: classroom.courseCode ?? classroom.code,
    scopeSummary: buildScopeSummary(classroom),
    teacherLabel: classroom.primaryTeacherDisplayName ?? "Teacher not assigned",
    statusLabel: classroom.status,
    historyLabel: `${classroom.governance.attendanceSessionCount} attendance session${
      classroom.governance.attendanceSessionCount === 1 ? "" : "s"
    } · ${classroom.governance.activeStudentCount} active student${
      classroom.governance.activeStudentCount === 1 ? "" : "s"
    }`,
    nextStepLabel: classroom.governance.archiveEffectLabel,
  }
}

export function buildAdminClassroomGovernanceImpactModel(
  detail: Pick<
    AdminClassroomGovernanceDetail,
    "governance" | "classroomTitle" | "displayTitle" | "courseCode" | "code"
  >,
) {
  return {
    classroomLabel: detail.classroomTitle ?? detail.displayTitle,
    courseCodeLabel: detail.courseCode ?? detail.code,
    archiveEffectLabel: detail.governance.archiveEffectLabel,
    archiveEffectMessage: detail.governance.archiveEffectMessage,
    historyPreservedNote: detail.governance.historyPreservedNote,
    attendanceTotalsLabel: `${detail.governance.presentRecordCount} present · ${detail.governance.absentRecordCount} absent`,
    rosterTotalsLabel: `${detail.governance.activeStudentCount} active · ${detail.governance.pendingStudentCount} pending · ${detail.governance.blockedStudentCount} blocked · ${detail.governance.droppedStudentCount} dropped`,
  }
}
