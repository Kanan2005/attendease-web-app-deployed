import type {
  AdminClassroomGovernanceDetail,
  AdminClassroomGovernanceSummary,
} from "@attendease/contracts"
import { describe, expect, it } from "vitest"

import {
  buildAdminClassroomArchiveReadiness,
  buildAdminClassroomGovernanceImpactModel,
  buildAdminClassroomGovernanceListCard,
  buildAdminClassroomGovernanceSummaryMessage,
} from "./admin-classroom-governance.js"

function createSummary(
  overrides: Partial<AdminClassroomGovernanceSummary> = {},
): AdminClassroomGovernanceSummary {
  return {
    id: "classroom_1",
    semesterId: "semester_1",
    classId: "class_1",
    sectionId: "section_1",
    subjectId: "subject_1",
    primaryTeacherId: "teacher_1",
    primaryTeacherDisplayName: "Prof. Teacher",
    createdByUserId: "admin_1",
    code: "CSE6-MATH-A",
    courseCode: "CSE6-MATH-A",
    displayTitle: "Mathematics Classroom",
    classroomTitle: "Mathematics Classroom",
    semesterCode: "SEM6",
    semesterTitle: "Semester 6",
    classCode: "CSE6",
    classTitle: "Computer Science 6",
    sectionCode: "A",
    sectionTitle: "Section A",
    subjectCode: "MATH101",
    subjectTitle: "Mathematics",
    status: "ACTIVE",
    defaultAttendanceMode: "QR_GPS",
    defaultGpsRadiusMeters: 100,
    defaultSessionDurationMinutes: 15,
    qrRotationWindowSeconds: 15,
    bluetoothRotationWindowSeconds: 10,
    timezone: "Asia/Kolkata",
    requiresTrustedDevice: true,
    archivedAt: null,
    activeJoinCode: null,
    permissions: {
      canEdit: true,
      canArchive: true,
      canEditCourseInfo: true,
      canEditAcademicScope: true,
      canReassignTeacher: true,
    },
    governance: {
      activeStudentCount: 4,
      pendingStudentCount: 0,
      blockedStudentCount: 0,
      droppedStudentCount: 0,
      attendanceSessionCount: 2,
      liveAttendanceSessionCount: 0,
      presentRecordCount: 6,
      absentRecordCount: 2,
      latestAttendanceAt: "2026-03-15T10:00:00.000Z",
      canArchiveNow: true,
      archiveEffectLabel: "Archive the classroom",
      archiveEffectMessage:
        "Archiving revokes the join code, stops new classroom changes, and keeps attendance history available for review and audits.",
      historyPreservedNote:
        "Archive keeps saved attendance sessions, present and absent counts, roster history, and admin audit records.",
    },
    ...overrides,
  }
}

function createDetail(
  overrides: Partial<AdminClassroomGovernanceDetail> = {},
): AdminClassroomGovernanceDetail {
  return {
    ...createSummary(),
    scheduleSlots: [],
    scheduleExceptions: [],
    ...overrides,
  }
}

describe("admin classroom governance helpers", () => {
  it("formats classroom search summary copy", () => {
    expect(buildAdminClassroomGovernanceSummaryMessage(0, "math")).toBe(
      'No classrooms matched "math".',
    )
    expect(buildAdminClassroomGovernanceSummaryMessage(1, "math")).toBe(
      'Loaded 1 classroom for "math".',
    )
    expect(buildAdminClassroomGovernanceSummaryMessage(3, "semester 6")).toBe(
      'Loaded 3 classrooms for "semester 6".',
    )
  })

  it("requires reason, acknowledgement, and no live session before archive", () => {
    expect(
      buildAdminClassroomArchiveReadiness({
        classroomStatus: "ACTIVE",
        liveAttendanceSessionCount: 0,
        reason: "",
        acknowledged: false,
      }),
    ).toEqual({
      allowed: false,
      message: "Add a clear governance reason before you archive this classroom.",
    })

    expect(
      buildAdminClassroomArchiveReadiness({
        classroomStatus: "ACTIVE",
        liveAttendanceSessionCount: 0,
        reason: "Registrar review complete.",
        acknowledged: false,
      }),
    ).toEqual({
      allowed: false,
      message: "Confirm that you reviewed history impact before you archive this classroom.",
    })

    expect(
      buildAdminClassroomArchiveReadiness({
        classroomStatus: "ACTIVE",
        liveAttendanceSessionCount: 1,
        reason: "Registrar review complete.",
        acknowledged: true,
      }),
    ).toEqual({
      allowed: false,
      message: "End the live attendance session before you archive this classroom.",
    })

    expect(
      buildAdminClassroomArchiveReadiness({
        classroomStatus: "ARCHIVED",
        liveAttendanceSessionCount: 0,
        reason: "Already archived.",
        acknowledged: true,
      }),
    ).toEqual({
      allowed: false,
      message: "Archived classrooms stay read-only and keep their history intact.",
    })
  })

  it("builds list-card and impact models from governance data", () => {
    expect(buildAdminClassroomGovernanceListCard(createSummary())).toEqual({
      classroomId: "classroom_1",
      classroomTitle: "Mathematics Classroom",
      courseCode: "CSE6-MATH-A",
      scopeSummary: "Semester 6 · CSE6 A · Mathematics",
      teacherLabel: "Prof. Teacher",
      statusLabel: "ACTIVE",
      historyLabel: "2 attendance sessions · 4 active students",
      nextStepLabel: "Archive the classroom",
    })

    expect(buildAdminClassroomGovernanceImpactModel(createDetail())).toEqual({
      classroomLabel: "Mathematics Classroom",
      courseCodeLabel: "CSE6-MATH-A",
      archiveEffectLabel: "Archive the classroom",
      archiveEffectMessage:
        "Archiving revokes the join code, stops new classroom changes, and keeps attendance history available for review and audits.",
      historyPreservedNote:
        "Archive keeps saved attendance sessions, present and absent counts, roster history, and admin audit records.",
      attendanceTotalsLabel: "6 present · 2 absent",
      rosterTotalsLabel: "4 active · 0 pending · 0 blocked · 0 dropped",
    })
  })
})
