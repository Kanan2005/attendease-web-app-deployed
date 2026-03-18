import { describe, expect, it } from "vitest"

import { studentRoutes } from "./student-routes.js"

describe("student route helpers", () => {
  it("keeps static student routes centralized", () => {
    expect(studentRoutes.classrooms).toBe("/(student)/(tabs)/classrooms")
    expect(studentRoutes.attendance).toBe("/(student)/attendance")
    expect(studentRoutes.qrAttendance).toBe("/(student)/attendance/qr-scan")
    expect(studentRoutes.reports).toBe("/(student)/(tabs)/reports")
  })

  it("builds dynamic classroom and subject routes with params", () => {
    expect(studentRoutes.classroomDetail("classroom_1")).toEqual({
      pathname: "/(student)/classroom/[classroomId]",
      params: {
        classroomId: "classroom_1",
      },
    })
    expect(studentRoutes.classroomStream("classroom_1")).toEqual({
      pathname: "/(student)/classroom/[classroomId]/stream",
      params: {
        classroomId: "classroom_1",
      },
    })
    expect(studentRoutes.subjectReport("subject_1")).toEqual({
      pathname: "/(student)/reports/subject/[subjectId]",
      params: {
        subjectId: "subject_1",
      },
    })
  })
})
