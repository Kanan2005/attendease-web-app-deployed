import { describe, expect, it, vi } from "vitest"

import {
  buildStudentInvalidationKeys,
  invalidateStudentExperienceQueries,
  requireStudentAccessToken,
  studentQueryKeys,
} from "./student-query.js"

describe("student query helpers", () => {
  it("builds invalidation keys for join and attendance success paths", () => {
    const keys = buildStudentInvalidationKeys({
      classroomId: "classroom_1",
      classroomIds: ["classroom_1", "classroom_2"],
      subjectId: "subject_1",
      installId: "install_1",
    })

    expect(keys).toContainEqual(studentQueryKeys.me())
    expect(keys).toContainEqual(studentQueryKeys.classroomDetail("classroom_1"))
    expect(keys).toContainEqual(studentQueryKeys.classroomSchedule("classroom_1"))
    expect(keys).toContainEqual(studentQueryKeys.classroomLectures("classroom_2"))
    expect(keys).toContainEqual(studentQueryKeys.reportsSubjects())
    expect(keys).toContainEqual(studentQueryKeys.reportSubject("subject_1"))
    expect(keys).toContainEqual(studentQueryKeys.attendanceReady("install_1"))
  })

  it("invalidates the student experience cache after a successful action", async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined)

    await invalidateStudentExperienceQueries(
      {
        invalidateQueries,
      },
      {
        classroomId: "classroom_1",
        classroomIds: ["classroom_1", "classroom_2"],
        subjectId: "subject_1",
        installId: "install_1",
      },
    )

    expect(invalidateQueries).toHaveBeenCalled()
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: studentQueryKeys.me(),
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: studentQueryKeys.classroomAnnouncements("classroom_1"),
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: studentQueryKeys.classroomLectures("classroom_2"),
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: studentQueryKeys.reportsSubjects(),
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: studentQueryKeys.reportSubject("subject_1"),
    })
  })

  it("requires an authenticated student session before calling protected queries", () => {
    expect(() => requireStudentAccessToken(null)).toThrow(
      "Student session is required before calling mobile student queries.",
    )
  })
})
