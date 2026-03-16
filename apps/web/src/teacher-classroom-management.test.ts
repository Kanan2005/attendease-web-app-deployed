import type {
  ClassroomDetail,
  ClassroomSummary,
  TeacherAssignmentSummary,
} from "@attendease/contracts"
import { describe, expect, it } from "vitest"

import {
  buildTeacherWebClassroomCreateRequest,
  buildTeacherWebClassroomListCards,
  buildTeacherWebClassroomScopeOptions,
  buildTeacherWebClassroomUpdateRequest,
  createTeacherWebClassroomCreateDraft,
  createTeacherWebClassroomEditDraft,
  hasTeacherWebClassroomEditChanges,
} from "./teacher-classroom-management.js"

function createAssignment(
  overrides: Partial<TeacherAssignmentSummary> = {},
): TeacherAssignmentSummary {
  return {
    id: "assignment_1",
    teacherId: "teacher_1",
    semesterId: "semester_1",
    semesterCode: "SEM6",
    semesterTitle: "Semester 6",
    classId: "class_1",
    classCode: "CSE6",
    classTitle: "CSE 6",
    sectionId: "section_1",
    sectionCode: "A",
    sectionTitle: "Section A",
    subjectId: "subject_1",
    subjectCode: "MATH101",
    subjectTitle: "Mathematics",
    status: "ACTIVE",
    canSelfCreateCourseOffering: true,
    ...overrides,
  }
}

function createClassroomSummary(overrides: Partial<ClassroomSummary> = {}): ClassroomSummary {
  return {
    id: "classroom_1",
    semesterId: "semester_1",
    semesterCode: "SEM6",
    semesterTitle: "Semester 6",
    classId: "class_1",
    classCode: "CSE6",
    classTitle: "CSE 6",
    sectionId: "section_1",
    sectionCode: "A",
    sectionTitle: "Section A",
    subjectId: "subject_1",
    subjectCode: "MATH101",
    subjectTitle: "Mathematics",
    primaryTeacherId: "teacher_1",
    primaryTeacherDisplayName: "Teacher One",
    createdByUserId: "teacher_1",
    code: "CSE6-MATH-A",
    courseCode: "CSE6-MATH-A",
    displayTitle: "Mathematics",
    classroomTitle: "Mathematics",
    status: "ACTIVE",
    defaultAttendanceMode: "QR_GPS",
    defaultGpsRadiusMeters: 100,
    defaultSessionDurationMinutes: 15,
    qrRotationWindowSeconds: 15,
    bluetoothRotationWindowSeconds: 10,
    timezone: "Asia/Kolkata",
    requiresTrustedDevice: true,
    archivedAt: null,
    activeJoinCode: {
      id: "join_1",
      courseOfferingId: "classroom_1",
      classroomId: "classroom_1",
      code: "MATH12",
      status: "ACTIVE",
      expiresAt: "2026-03-15T10:00:00.000Z",
    },
    permissions: {
      canEdit: true,
      canArchive: true,
      canEditCourseInfo: true,
      canEditAcademicScope: false,
      canReassignTeacher: false,
    },
    ...overrides,
  }
}

function createClassroomDetail(overrides: Partial<ClassroomDetail> = {}): ClassroomDetail {
  return {
    ...createClassroomSummary(),
    scheduleSlots: [],
    scheduleExceptions: [],
    ...overrides,
  }
}

describe("teacher web classroom management helpers", () => {
  it("builds creatable teaching scope options from teacher assignments", () => {
    const options = buildTeacherWebClassroomScopeOptions([
      createAssignment(),
      createAssignment({
        id: "assignment_2",
        subjectCode: "PHY101",
        subjectTitle: "Physics",
        classCode: "CSE8",
        classTitle: "CSE 8",
      }),
      createAssignment({
        id: "assignment_3",
        canSelfCreateCourseOffering: false,
      }),
    ])

    expect(options).toHaveLength(2)
    expect(options[0]).toMatchObject({
      key: "assignment_1",
      title: "Mathematics · CSE6 A",
      supportingText: "Semester 6 · CSE6 A · Mathematics",
    })
  })

  it("builds a create request from a selected teaching scope and reset-friendly fields", () => {
    const scopeOptions = buildTeacherWebClassroomScopeOptions([createAssignment()])
    const draft = createTeacherWebClassroomCreateDraft(scopeOptions[0]?.key)

    draft.classroomTitle = " Mechanics Lab "
    draft.courseCode = " cse6-phy-a "
    draft.defaultAttendanceMode = "BLUETOOTH"
    draft.defaultGpsRadiusMeters = "80"
    draft.defaultSessionDurationMinutes = "45"
    draft.timezone = " Asia/Kolkata "
    draft.requiresTrustedDevice = false

    expect(buildTeacherWebClassroomCreateRequest(scopeOptions, draft)).toEqual({
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      classroomTitle: "Mechanics Lab",
      courseCode: "CSE6-PHY-A",
      defaultAttendanceMode: "BLUETOOTH",
      defaultGpsRadiusMeters: 80,
      defaultSessionDurationMinutes: 45,
      timezone: "Asia/Kolkata",
      requiresTrustedDevice: false,
    })
  })

  it("builds edit drafts and only sends changed teacher-managed classroom fields", () => {
    const classroom = createClassroomDetail()
    const draft = createTeacherWebClassroomEditDraft(classroom)

    expect(hasTeacherWebClassroomEditChanges(classroom, draft)).toBe(false)

    draft.classroomTitle = "Advanced Mathematics"
    draft.courseCode = " cse6-math-b "
    draft.defaultAttendanceMode = "MANUAL"
    draft.defaultGpsRadiusMeters = "120"
    draft.defaultSessionDurationMinutes = "20"
    draft.timezone = "UTC"
    draft.requiresTrustedDevice = false

    expect(buildTeacherWebClassroomUpdateRequest(classroom, draft)).toEqual({
      classroomTitle: "Advanced Mathematics",
      courseCode: "CSE6-MATH-B",
      defaultAttendanceMode: "MANUAL",
      defaultGpsRadiusMeters: 120,
      defaultSessionDurationMinutes: 20,
      timezone: "UTC",
      requiresTrustedDevice: false,
    })
    expect(hasTeacherWebClassroomEditChanges(classroom, draft)).toBe(true)
  })

  it("builds classroom list cards with reset-friendly labels and permission hints", () => {
    expect(buildTeacherWebClassroomListCards([createClassroomSummary()])).toEqual([
      {
        classroomId: "classroom_1",
        classroomTitle: "Mathematics",
        courseCode: "CSE6-MATH-A",
        scopeSummary: "Semester 6 · CSE6 A · Mathematics",
        statusLabel: "ACTIVE",
        joinCodeLabel: "MATH12",
        attendanceModeLabel: "QR + GPS",
        deviceRuleLabel: "Device registration required",
        canEdit: true,
        canArchive: true,
      },
    ])
  })
})
