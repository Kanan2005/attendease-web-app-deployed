import { describe, expect, it } from "vitest"

import {
  academicProductLanguage,
  deriveClassroomCrudPermissions,
  deriveClassroomStudentActions,
  getAcademicProductTerm,
  resolveClassSessionId,
  resolveClassroomId,
  resolveClassroomTitle,
  resolveCourseCode,
  resolveStudentIdentifierLabel,
  resolveStudentMembershipId,
  resolveStudentMembershipSource,
  resolveStudentMembershipStatus,
} from "./academic-language"

describe("academicProductLanguage", () => {
  it("locks the reset-track glossary for classroom and session terms", () => {
    expect(academicProductLanguage.classroom.singular).toBe("Classroom")
    expect(academicProductLanguage.courseCode.singular).toBe("Course code")
    expect(academicProductLanguage.classSession.singular).toBe("Class session")
    expect(academicProductLanguage.attendanceSession.singular).toBe("Attendance session")
  })

  it("returns singular and plural product terms", () => {
    expect(getAcademicProductTerm("student")).toBe("Student")
    expect(getAcademicProductTerm("student", 2)).toBe("Students")
  })

  it("resolves classroom references from product and legacy ids", () => {
    expect(resolveClassroomId({ classroomId: "classroom_1" })).toBe("classroom_1")
    expect(resolveClassroomId({ courseOfferingId: "classroom_2" })).toBe("classroom_2")
    expect(resolveClassroomId({ id: "classroom_3" })).toBe("classroom_3")
    expect(resolveCourseCode({ courseCode: "CSE6-MATH-A" })).toBe("CSE6-MATH-A")
    expect(resolveCourseCode({ code: "CSE6-PHY-A" })).toBe("CSE6-PHY-A")
    expect(resolveClassroomTitle({ classroomTitle: "Physics Classroom" })).toBe("Physics Classroom")
    expect(resolveClassroomTitle({ displayTitle: "Math Classroom" })).toBe("Math Classroom")
  })

  it("resolves membership identity, status, and source aliases", () => {
    expect(resolveStudentMembershipId({ membershipId: "membership_1" })).toBe("membership_1")
    expect(resolveStudentMembershipId({ enrollmentId: "enrollment_1" })).toBe("enrollment_1")
    expect(resolveStudentMembershipStatus({ membershipStatus: "ACTIVE" })).toBe("ACTIVE")
    expect(resolveStudentMembershipStatus({ enrollmentStatus: "PENDING" })).toBe("PENDING")
    expect(resolveStudentMembershipSource({ membershipSource: "MANUAL" })).toBe("MANUAL")
    expect(resolveStudentMembershipSource({ source: "JOIN_CODE" })).toBe("JOIN_CODE")
    expect(resolveStudentIdentifierLabel({ rollNumber: "23CS001" })).toBe("23CS001")
    expect(resolveStudentIdentifierLabel({ universityId: "UNI001" })).toBe("UNI001")
    expect(resolveStudentIdentifierLabel({ studentEmail: "student.one@attendease.dev" })).toBe(
      "student.one@attendease.dev",
    )
  })

  it("resolves class-session ids from either alias", () => {
    expect(resolveClassSessionId({ classSessionId: "session_1" })).toBe("session_1")
    expect(resolveClassSessionId({ lectureId: "lecture_1" })).toBe("lecture_1")
    expect(resolveClassSessionId({ id: "session_2" })).toBe("session_2")
  })

  it("derives classroom CRUD permissions by role and archive state", () => {
    expect(
      deriveClassroomCrudPermissions({
        role: "TEACHER",
        status: "ACTIVE",
      }),
    ).toEqual({
      canEdit: true,
      canArchive: true,
      canEditCourseInfo: true,
      canEditAcademicScope: false,
      canReassignTeacher: false,
    })

    expect(
      deriveClassroomCrudPermissions({
        role: "ADMIN",
        status: "COMPLETED",
      }),
    ).toEqual({
      canEdit: true,
      canArchive: true,
      canEditCourseInfo: true,
      canEditAcademicScope: true,
      canReassignTeacher: true,
    })

    expect(
      deriveClassroomCrudPermissions({
        role: "STUDENT",
        status: "ACTIVE",
      }),
    ).toEqual({
      canEdit: false,
      canArchive: false,
      canEditCourseInfo: false,
      canEditAcademicScope: false,
      canReassignTeacher: false,
    })
  })

  it("derives roster row actions from classroom lifecycle and membership state", () => {
    expect(
      deriveClassroomStudentActions({
        classroomStatus: "ACTIVE",
        semesterStatus: "ACTIVE",
        membershipStatus: "ACTIVE",
        studentStatus: "ACTIVE",
      }),
    ).toEqual({
      canBlock: true,
      canRemove: true,
      canReactivate: false,
    })

    expect(
      deriveClassroomStudentActions({
        classroomStatus: "ACTIVE",
        semesterStatus: "ACTIVE",
        membershipStatus: "DROPPED",
        studentStatus: "ACTIVE",
      }),
    ).toEqual({
      canBlock: false,
      canRemove: false,
      canReactivate: true,
    })

    expect(
      deriveClassroomStudentActions({
        classroomStatus: "ARCHIVED",
        semesterStatus: "ACTIVE",
        membershipStatus: "BLOCKED",
        studentStatus: "ACTIVE",
      }),
    ).toEqual({
      canBlock: false,
      canRemove: false,
      canReactivate: false,
    })
  })
})
