import { describe, expect, it } from "vitest"

import {
  buildAnnouncementComposerHint,
  buildTeacherClassroomHubSummary,
  createWebClassroomCommunicationsBootstrap,
} from "./classroom-communications.js"

describe("web classroom communications bootstrap", () => {
  it("builds the teacher classroom hub bootstrap from public web env", () => {
    const bootstrap = createWebClassroomCommunicationsBootstrap({
      NEXT_PUBLIC_API_URL: "http://localhost:4000",
    })

    expect(bootstrap.apiBaseUrl).toBe("http://localhost:4000")
    expect(bootstrap.pageTitle).toBe("Teacher Classroom Hub")
  })

  it("formats classroom hub and announcement helper copy", () => {
    expect(
      buildTeacherClassroomHubSummary({
        classroomCount: 2,
        rosterCount: 18,
        announcementCount: 3,
        importJobCount: 2,
        reviewRequiredCount: 1,
      }),
    ).toContain("Loaded 2 classrooms")

    expect(
      buildAnnouncementComposerHint({
        shouldNotify: true,
        visibility: "STUDENT_AND_TEACHER",
      }),
    ).toContain("fan out")

    expect(
      buildAnnouncementComposerHint({
        shouldNotify: false,
        visibility: "TEACHER_ONLY",
      }),
    ).toContain("without sending notifications")
  })
})
