import { describe, expect, it } from "vitest"

import {
  buildTeacherAcademicSummary,
  createWebAcademicManagementBootstrap,
} from "./academic-management.js"

describe("web academic management bootstrap", () => {
  it("builds the teacher academic scheduling bootstrap and summary copy", () => {
    const bootstrap = createWebAcademicManagementBootstrap({
      NEXT_PUBLIC_API_URL: "http://localhost:4000",
    })

    expect(bootstrap.apiBaseUrl).toBe("http://localhost:4000")
    expect(bootstrap.pageTitle).toBe("Teacher Academic Scheduling")
    expect(
      buildTeacherAcademicSummary({
        classroomCount: 2,
        slotCount: 3,
        exceptionCount: 1,
        lectureCount: 4,
      }),
    ).toContain("Loaded 2 classrooms")
  })
})
