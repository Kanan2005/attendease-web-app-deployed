import { describe, expect, it } from "vitest"

import {
  buildStudentClassroomStreamPreview,
  buildTeacherRosterImportPreview,
  createMobileClassroomCommunicationsBootstrap,
} from "./classroom-communications.js"

describe("mobile classroom communications bootstrap", () => {
  it("builds the mobile classroom stream bootstrap", () => {
    const bootstrap = createMobileClassroomCommunicationsBootstrap({
      EXPO_PUBLIC_API_URL: "http://localhost:4000",
    })

    expect(bootstrap.apiBaseUrl).toBe("http://localhost:4000")
    expect(bootstrap.teacherScreenTitle).toBe("Teacher Classroom Stream")
    expect(bootstrap.studentScreenTitle).toBe("Student Classroom Stream")
  })

  it("formats student stream and teacher roster-import preview copy", () => {
    expect(
      buildStudentClassroomStreamPreview({
        classroomCount: 2,
        announcementCount: 5,
        hiddenTeacherOnlyCount: 1,
      }).title,
    ).toContain("Student stream is ready")

    expect(
      buildTeacherRosterImportPreview({
        rosterMemberCount: 42,
        importJobCount: 3,
        reviewRequiredCount: 1,
      }).message,
    ).toContain("42 roster members")
  })
})
