import { describe, expect, it } from "vitest"

import {
  academicProductLanguage,
  buildAttendanceCorrectionSaveMessage,
  buildAttendanceDistribution,
  canTeacherCreateCourseOffering,
  canTeacherManageCourseOffering,
  deriveClassroomCrudPermissions,
  deriveClassroomStudentActions,
  deriveSessionWindowState,
  getAcademicProductTerm,
  getAttendanceCorrectionActionLabel,
  getAttendanceCorrectionPendingLabel,
  getAttendanceCorrectionReviewPollInterval,
  isStudentEligibleForCourseOffering,
  matchesAcademicScope,
  resolveClassroomId,
  resolveClassroomTitle,
  resolveCourseCode,
  resolveStudentIdentifierLabel,
  toDispatchDateForRule,
} from "./index"

describe("deriveSessionWindowState", () => {
  it("returns draft before a session starts", () => {
    expect(
      deriveSessionWindowState({
        now: new Date("2026-03-14T09:00:00.000Z"),
      }),
    ).toBe("DRAFT")
  })

  it("returns active while a session is open", () => {
    expect(
      deriveSessionWindowState({
        now: new Date("2026-03-14T09:00:00.000Z"),
        startedAt: new Date("2026-03-14T08:55:00.000Z"),
      }),
    ).toBe("ACTIVE")
  })

  it("returns ended during the edit window", () => {
    expect(
      deriveSessionWindowState({
        now: new Date("2026-03-14T09:00:00.000Z"),
        startedAt: new Date("2026-03-14T08:55:00.000Z"),
        endedAt: new Date("2026-03-14T08:59:00.000Z"),
        editableUntil: new Date("2026-03-15T08:59:00.000Z"),
      }),
    ).toBe("ENDED")
  })

  it("returns locked after the edit window closes", () => {
    expect(
      deriveSessionWindowState({
        now: new Date("2026-03-16T09:00:00.000Z"),
        startedAt: new Date("2026-03-14T08:55:00.000Z"),
        endedAt: new Date("2026-03-14T08:59:00.000Z"),
        editableUntil: new Date("2026-03-15T08:59:00.000Z"),
      }),
    ).toBe("LOCKED")
  })

  it("matches academic scopes and enforces teacher management boundaries", () => {
    const assignment = {
      teacherId: "teacher_1",
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      status: "ACTIVE" as const,
      canSelfCreateCourseOffering: true,
    }
    const courseOffering = {
      id: "offering_1",
      primaryTeacherId: "teacher_1",
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      status: "ACTIVE" as const,
    }

    expect(matchesAcademicScope(assignment, courseOffering)).toBe(true)
    expect(canTeacherManageCourseOffering("teacher_1", assignment, courseOffering)).toBe(true)
    expect(
      canTeacherCreateCourseOffering("teacher_1", assignment, {
        semesterId: "semester_1",
        classId: "class_1",
        sectionId: "section_1",
        subjectId: "subject_1",
      }),
    ).toBe(true)
  })

  it("enforces student eligibility against enrollment scope", () => {
    const courseOffering = {
      id: "offering_1",
      primaryTeacherId: "teacher_1",
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      status: "ACTIVE" as const,
    }

    expect(
      isStudentEligibleForCourseOffering(
        "student_1",
        {
          id: "enrollment_1",
          studentId: "student_1",
          courseOfferingId: "offering_1",
          semesterId: "semester_1",
          classId: "class_1",
          sectionId: "section_1",
          subjectId: "subject_1",
          status: "ACTIVE",
        },
        courseOffering,
      ),
    ).toBe(true)
    expect(
      isStudentEligibleForCourseOffering("student_2", {
        id: "enrollment_1",
        studentId: "student_1",
        courseOfferingId: "offering_1",
        semesterId: "semester_1",
        classId: "class_1",
        sectionId: "section_1",
        subjectId: "subject_1",
        status: "ACTIVE",
      }),
    ).toBe(false)
  })

  it("exports analytics helpers for attendance distribution summaries", () => {
    expect(buildAttendanceDistribution([100, 70])).toEqual([
      {
        bucket: "ABOVE_90",
        label: "Above 90%",
        studentCount: 1,
      },
      {
        bucket: "BETWEEN_75_AND_90",
        label: "75% to 90%",
        studentCount: 0,
      },
      {
        bucket: "BELOW_75",
        label: "Below 75%",
        studentCount: 1,
      },
    ])
  })

  it("re-exports email automation helpers through the package index", () => {
    expect(toDispatchDateForRule(new Date("2026-03-15T20:00:00.000Z"), "Asia/Kolkata")).toEqual(
      new Date("2026-03-16T00:00:00.000Z"),
    )
  })

  it("re-exports academic naming helpers through the package index", () => {
    expect(academicProductLanguage.classroom.singular).toBe("Classroom")
    expect(getAcademicProductTerm("classSession", 2)).toBe("Class sessions")
    expect(resolveClassroomId({ courseOfferingId: "classroom_1" })).toBe("classroom_1")
    expect(resolveCourseCode({ code: "CSE6-MATH-A" })).toBe("CSE6-MATH-A")
    expect(resolveClassroomTitle({ displayTitle: "Maths" })).toBe("Maths")
    expect(resolveStudentIdentifierLabel({ rollNumber: "23CS001" })).toBe("23CS001")
    expect(deriveClassroomCrudPermissions({ role: "TEACHER", status: "ACTIVE" })).toEqual({
      canEdit: true,
      canArchive: true,
      canEditCourseInfo: true,
      canEditAcademicScope: false,
      canReassignTeacher: false,
    })
    expect(
      deriveClassroomStudentActions({
        classroomStatus: "ACTIVE",
        semesterStatus: "ACTIVE",
        membershipStatus: "BLOCKED",
        studentStatus: "ACTIVE",
      }),
    ).toEqual({
      canBlock: false,
      canRemove: true,
      canReactivate: true,
    })
    expect(getAttendanceCorrectionPendingLabel("PRESENT")).toBe("Will save as present")
    expect(getAttendanceCorrectionActionLabel("ABSENT")).toBe("Mark absent")
    expect(
      getAttendanceCorrectionReviewPollInterval({
        status: "ENDED",
        editability: {
          isEditable: true,
        },
      }),
    ).toBe(5_000)
    expect(buildAttendanceCorrectionSaveMessage(1)).toBe(
      "Saved 1 attendance edit and refreshed the session totals.",
    )
  })
})
