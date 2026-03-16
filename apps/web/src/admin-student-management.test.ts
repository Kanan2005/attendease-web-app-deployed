import { describe, expect, it } from "vitest"

import {
  buildAdminStudentManagementSummaryMessage,
  buildAdminStudentStatusActionLabel,
  buildAdminStudentStatusActionReadiness,
} from "./admin-student-management.js"

describe("admin student management helpers", () => {
  it("formats student support summary copy", () => {
    expect(buildAdminStudentManagementSummaryMessage(0, "student.one")).toBe(
      'No student accounts matched "student.one".',
    )
    expect(buildAdminStudentManagementSummaryMessage(1, "student.one")).toBe(
      'Loaded 1 student account for "student.one".',
    )
    expect(buildAdminStudentManagementSummaryMessage(3, "all students")).toBe(
      'Loaded 3 student accounts for "all students".',
    )
  })

  it("requires a reason and acknowledgement before status changes", () => {
    expect(
      buildAdminStudentStatusActionReadiness({
        currentStatus: "ACTIVE",
        nextStatus: "BLOCKED",
        reason: "",
        acknowledged: false,
      }),
    ).toEqual({
      allowed: false,
      message: "Add a clear governance reason before you change account access.",
    })

    expect(
      buildAdminStudentStatusActionReadiness({
        currentStatus: "ACTIVE",
        nextStatus: "BLOCKED",
        reason: "Support reviewed the request.",
        acknowledged: false,
      }),
    ).toEqual({
      allowed: false,
      message: "Confirm that the support request was verified before you save a status change.",
    })
  })

  it("blocks invalid or terminal transitions and labels valid actions", () => {
    expect(
      buildAdminStudentStatusActionReadiness({
        currentStatus: "ACTIVE",
        nextStatus: "ACTIVE",
        reason: "Support reviewed the request.",
        acknowledged: true,
      }),
    ).toEqual({
      allowed: false,
      message: "Choose a different account state before you save this admin action.",
    })

    expect(
      buildAdminStudentStatusActionReadiness({
        currentStatus: "ARCHIVED",
        nextStatus: "ACTIVE",
        reason: "Support reviewed the request.",
        acknowledged: true,
      }),
    ).toEqual({
      allowed: false,
      message: "Archived student accounts stay read-only in this reset track.",
    })

    expect(
      buildAdminStudentStatusActionReadiness({
        currentStatus: "BLOCKED",
        nextStatus: "ACTIVE",
        reason: "Support reviewed the request.",
        acknowledged: true,
      }),
    ).toEqual({
      allowed: true,
      message:
        "This restores sign-in access without changing classroom memberships or phone history.",
    })

    expect(buildAdminStudentStatusActionLabel("BLOCKED")).toBe("Deactivate student")
    expect(buildAdminStudentStatusActionLabel("ACTIVE")).toBe("Reactivate student")
    expect(buildAdminStudentStatusActionLabel("ARCHIVED")).toBe("Archive student")
  })
})
