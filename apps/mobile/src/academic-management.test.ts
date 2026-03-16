import { describe, expect, it } from "vitest"

import {
  buildTeacherSchedulingPreview,
  createMobileAcademicManagementBootstrap,
} from "./academic-management.js"

describe("mobile academic management bootstrap", () => {
  it("builds the teacher scheduling bootstrap and preview model", () => {
    const bootstrap = createMobileAcademicManagementBootstrap({
      EXPO_PUBLIC_API_URL: "http://localhost:4000",
    })

    expect(bootstrap.apiBaseUrl).toBe("http://localhost:4000")
    expect(bootstrap.screenTitle).toBe("Teacher Scheduling")
    expect(
      buildTeacherSchedulingPreview({
        classroomCount: 1,
        slotCount: 2,
        exceptionCount: 1,
        lectureCount: 3,
      }).title,
    ).toContain("Teacher scheduling is ready")
  })
})
