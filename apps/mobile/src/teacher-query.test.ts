import { describe, expect, it, vi } from "vitest"

import {
  buildTeacherInvalidationKeys,
  invalidateTeacherExperienceQueries,
  teacherQueryKeys,
} from "./teacher-query.js"

describe("teacher query helpers", () => {
  it("builds teacher invalidation keys for classroom-centric mutations", () => {
    const keys = buildTeacherInvalidationKeys({
      classroomId: "classroom_1",
      sessionId: "session_1",
    })

    expect(keys).toContainEqual(teacherQueryKeys.me())
    expect(keys).toContainEqual(teacherQueryKeys.classrooms())
    expect(keys).toContainEqual(teacherQueryKeys.bluetoothCandidates())
    expect(keys).toContainEqual(teacherQueryKeys.sessionHistory())
    expect(keys).toContainEqual(teacherQueryKeys.bluetoothRuntime("session_1"))
    expect(keys).toContainEqual(teacherQueryKeys.bluetoothSession("session_1"))
    expect(keys).toContainEqual(teacherQueryKeys.sessionDetail("session_1"))
    expect(keys).toContainEqual(teacherQueryKeys.sessionStudents("session_1"))
    expect(keys).toContainEqual(teacherQueryKeys.reports())
    expect(keys).toContainEqual(teacherQueryKeys.exportJobs())
    expect(keys).toContainEqual(teacherQueryKeys.classroomDetail("classroom_1"))
    expect(keys).toContainEqual(teacherQueryKeys.classroomRoster("classroom_1"))
    expect(keys).toContainEqual(teacherQueryKeys.classroomSchedule("classroom_1"))
    expect(keys).toContainEqual(teacherQueryKeys.classroomAnnouncements("classroom_1"))
    expect(keys).toContainEqual(teacherQueryKeys.classroomLectures("classroom_1"))
    expect(keys).toContainEqual(teacherQueryKeys.classroomRosterImports("classroom_1"))
  })

  it("keeps invalidation keys unique so classroom actions do not over-invalidate duplicates", () => {
    const keys = buildTeacherInvalidationKeys({
      classroomId: "classroom_1",
      sessionId: "session_1",
    }).map((queryKey) => JSON.stringify(queryKey))

    expect(new Set(keys).size).toBe(keys.length)
  })

  it("invalidates the teacher experience cache after classroom mutations", async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined)

    await invalidateTeacherExperienceQueries(
      {
        invalidateQueries,
      },
      {
        classroomId: "classroom_1",
        sessionId: "session_1",
      },
    )

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: teacherQueryKeys.dashboardRecentActivity(),
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: teacherQueryKeys.reports(),
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: teacherQueryKeys.exportsAvailability(),
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: teacherQueryKeys.exportJobs(),
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: teacherQueryKeys.sessionHistory(),
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: teacherQueryKeys.bluetoothRuntime("session_1"),
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: teacherQueryKeys.bluetoothSession("session_1"),
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: teacherQueryKeys.sessionDetail("session_1"),
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: teacherQueryKeys.sessionStudents("session_1"),
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: teacherQueryKeys.classroomLectures("classroom_1"),
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: teacherQueryKeys.classroomRosterImports("classroom_1"),
    })
  })

  it("builds filter-aware teacher report query keys", () => {
    expect(
      teacherQueryKeys.reportDaywise({
        classroomId: "classroom_1",
        subjectId: "subject_1",
      }),
    ).toEqual([
      "teacher",
      "reports",
      "daywise",
      {
        classroomId: "classroom_1",
        subjectId: "subject_1",
      },
    ])

    expect(
      teacherQueryKeys.reportStudentPercentages({
        classroomId: "classroom_1",
      }),
    ).toEqual([
      "teacher",
      "reports",
      "students",
      "percentages",
      {
        classroomId: "classroom_1",
      },
    ])
  })

  it("builds filter-aware teacher roster query keys", () => {
    expect(
      teacherQueryKeys.classroomRoster("classroom_1", {
        membershipStatus: "ACTIVE",
        search: "student",
      }),
    ).toEqual([
      "teacher",
      "classrooms",
      "classroom_1",
      "roster",
      {
        membershipStatus: "ACTIVE",
        search: "student",
      },
    ])
  })
})
