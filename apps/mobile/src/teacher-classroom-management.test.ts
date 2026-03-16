import type { ClassroomDetail, TeacherAssignmentSummary } from "@attendease/contracts"
import { describe, expect, it } from "vitest"

import {
  buildTeacherClassroomCreateRequest,
  buildTeacherClassroomScopeOptions,
  buildTeacherClassroomSupportingText,
  buildTeacherClassroomUpdateRequest,
  createTeacherClassroomCreateDraft,
  createTeacherClassroomEditDraft,
  hasTeacherClassroomEditChanges,
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

function createClassroom(overrides: Partial<ClassroomDetail> = {}): ClassroomDetail {
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
    defaultAttendanceMode: "BLUETOOTH",
    defaultGpsRadiusMeters: 75,
    defaultSessionDurationMinutes: 45,
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
      canEditAcademicScope: false,
      canReassignTeacher: false,
    },
    scheduleSlots: [],
    scheduleExceptions: [],
    ...overrides,
  }
}

describe("teacher classroom management helpers", () => {
  it("builds labeled classroom scope options from teacher assignments", () => {
    const options = buildTeacherClassroomScopeOptions([
      createAssignment(),
      createAssignment({
        id: "assignment_2",
        subjectCode: "PHY101",
        subjectTitle: "Physics",
        classId: "class_2",
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

  it("builds a create payload from the selected academic scope", () => {
    const scopeOptions = buildTeacherClassroomScopeOptions([createAssignment()])
    const draft = createTeacherClassroomCreateDraft(scopeOptions[0]?.key)

    draft.classroomTitle = " Mechanics Lab "
    draft.courseCode = " cse6-phy-a "

    expect(buildTeacherClassroomCreateRequest(scopeOptions, draft)).toMatchObject({
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      classroomTitle: "Mechanics Lab",
      courseCode: "CSE6-PHY-A",
    })
  })

  it("builds edit drafts and only sends changed course fields", () => {
    const classroom = createClassroom()
    const draft = createTeacherClassroomEditDraft(classroom)

    expect(hasTeacherClassroomEditChanges(classroom, draft)).toBe(false)

    draft.classroomTitle = "Advanced Mathematics"
    draft.courseCode = " cse6-math-b "

    expect(buildTeacherClassroomUpdateRequest(classroom, draft)).toEqual({
      classroomTitle: "Advanced Mathematics",
      courseCode: "CSE6-MATH-B",
    })
    expect(hasTeacherClassroomEditChanges(classroom, draft)).toBe(true)
  })

  it("builds concise classroom supporting text for teacher list cards", () => {
    expect(buildTeacherClassroomSupportingText(createClassroom())).toBe(
      "Course code CSE6-MATH-A · Semester 6 · CSE6 A · Mathematics",
    )
  })
})
