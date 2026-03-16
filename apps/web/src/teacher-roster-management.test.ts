import type { ClassroomRosterMemberSummary } from "@attendease/contracts"
import { describe, expect, it } from "vitest"

import {
  buildTeacherWebRosterAddRequest,
  buildTeacherWebRosterFilters,
  buildTeacherWebRosterMemberActions,
  buildTeacherWebRosterMemberIdentityText,
  buildTeacherWebRosterResultSummary,
} from "./teacher-roster-management.js"

function createRosterMember(
  overrides: Partial<ClassroomRosterMemberSummary> = {},
): ClassroomRosterMemberSummary {
  return {
    id: "enrollment_1",
    membershipId: "enrollment_1",
    classroomId: "classroom_1",
    courseOfferingId: "classroom_1",
    studentId: "student_1",
    semesterId: "semester_1",
    classId: "class_1",
    sectionId: "section_1",
    subjectId: "subject_1",
    status: "ACTIVE",
    membershipStatus: "ACTIVE",
    membershipState: "ACTIVE",
    source: "MANUAL",
    membershipSource: "MANUAL",
    studentEmail: "student.one@attendease.dev",
    studentDisplayName: "Student One",
    studentName: "Student One",
    studentIdentifier: "23CS001",
    studentStatus: "ACTIVE",
    rollNumber: "23CS001",
    universityId: "UNI001",
    attendanceDisabled: false,
    joinedAt: "2026-03-15T09:00:00.000Z",
    memberSince: "2026-03-15T09:00:00.000Z",
    droppedAt: null,
    actions: {
      canBlock: true,
      canRemove: true,
      canReactivate: false,
    },
    ...overrides,
  }
}

describe("teacher web roster management helpers", () => {
  it("builds filter-aware roster queries", () => {
    expect(
      buildTeacherWebRosterFilters({
        searchText: " student one ",
        statusFilter: "PENDING",
      }),
    ).toEqual({
      search: "student one",
      membershipStatus: "PENDING",
    })

    expect(
      buildTeacherWebRosterFilters({
        searchText: "   ",
        statusFilter: "ALL",
      }),
    ).toEqual({})
  })

  it("builds add-student payloads from email and identifier lookups", () => {
    expect(
      buildTeacherWebRosterAddRequest({
        lookup: " Student.One@AttendEase.dev ",
        membershipStatus: "ACTIVE",
      }),
    ).toEqual({
      studentEmail: "student.one@attendease.dev",
      membershipStatus: "ACTIVE",
      status: "ACTIVE",
    })

    expect(
      buildTeacherWebRosterAddRequest({
        lookup: " 23CS001 ",
        membershipStatus: "PENDING",
      }),
    ).toEqual({
      studentIdentifier: "23CS001",
      membershipStatus: "PENDING",
      status: "PENDING",
    })
  })

  it("derives roster actions from membership state and permissions", () => {
    expect(buildTeacherWebRosterMemberActions(createRosterMember())).toEqual([
      {
        kind: "UPDATE",
        label: "Mark Pending",
        membershipStatus: "PENDING",
        tone: "secondary",
      },
      {
        kind: "UPDATE",
        label: "Block",
        membershipStatus: "BLOCKED",
        tone: "danger",
      },
      {
        kind: "REMOVE",
        label: "Remove",
        tone: "danger",
      },
    ])

    expect(
      buildTeacherWebRosterMemberActions(
        createRosterMember({
          status: "BLOCKED",
          membershipStatus: "BLOCKED",
          membershipState: "BLOCKED",
          actions: {
            canBlock: false,
            canRemove: true,
            canReactivate: true,
          },
        }),
      ),
    ).toEqual([
      {
        kind: "UPDATE",
        label: "Activate",
        membershipStatus: "ACTIVE",
        tone: "secondary",
      },
      {
        kind: "REMOVE",
        label: "Remove",
        tone: "danger",
      },
    ])
  })

  it("builds member identity and result summary text", () => {
    expect(buildTeacherWebRosterMemberIdentityText(createRosterMember())).toBe(
      "23CS001 · student.one@attendease.dev",
    )

    expect(
      buildTeacherWebRosterResultSummary({
        visibleCount: 2,
        statusFilter: "BLOCKED",
        searchText: "student",
      }),
    ).toBe("Showing 2 matching students")
    expect(
      buildTeacherWebRosterResultSummary({
        visibleCount: 0,
        statusFilter: "ALL",
        searchText: "   ",
      }),
    ).toBe("No students are in this classroom yet.")
  })
})
