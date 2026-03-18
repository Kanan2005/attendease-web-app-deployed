import { describe, expect, it } from "vitest"

import { teacherRoutes } from "./teacher-routes.js"

describe("teacher route helpers", () => {
  it("keeps the teacher dashboard and classroom list routes centralized", () => {
    expect(teacherRoutes.home).toBe("/(teacher)/(tabs)/classrooms")
    expect(teacherRoutes.dashboard).toBe("/(teacher)/(tabs)/classrooms")
    expect(teacherRoutes.classrooms).toBe("/(teacher)/(tabs)/classrooms")
    expect(teacherRoutes.sessionHistory).toBe("/(teacher)/sessions")
    expect(teacherRoutes.bluetoothCreate).toBe("/(teacher)/bluetooth/create")
    expect(teacherRoutes.bluetoothCreateWithContext("classroom_1")).toEqual({
      pathname: "/(teacher)/bluetooth/create",
      params: {
        classroomId: "classroom_1",
      },
    })
    expect(teacherRoutes.reports).toBe("/(teacher)/(tabs)/reports")
    expect(teacherRoutes.exports).toBe("/(teacher)/(tabs)/exports")
    expect(teacherRoutes.sessionDetail("session_1")).toEqual({
      pathname: "/(teacher)/sessions/[sessionId]",
      params: {
        sessionId: "session_1",
      },
    })
  })

  it("builds dynamic classroom hub routes with params", () => {
    expect(teacherRoutes.classroomDetail("classroom_1")).toEqual({
      pathname: "/(teacher)/classroom/[classroomId]",
      params: {
        classroomId: "classroom_1",
      },
    })
    expect(teacherRoutes.classroomRoster("classroom_1")).toEqual({
      pathname: "/(teacher)/classroom/[classroomId]/roster",
      params: {
        classroomId: "classroom_1",
      },
    })
    expect(teacherRoutes.classroomAnnouncements("classroom_1")).toEqual({
      pathname: "/(teacher)/classroom/[classroomId]/announcements",
      params: {
        classroomId: "classroom_1",
      },
    })
    expect(
      teacherRoutes.bluetoothActive({
        sessionId: "preview-session",
        classroomId: "classroom_1",
        classroomTitle: "Mathematics",
        lectureTitle: "Lecture 1",
        durationMinutes: "50",
        rotationWindowSeconds: "10",
      }),
    ).toEqual({
      pathname: "/(teacher)/bluetooth/active/[sessionId]",
      params: {
        sessionId: "preview-session",
        classroomId: "classroom_1",
        classroomTitle: "Mathematics",
        lectureTitle: "Lecture 1",
        durationMinutes: "50",
        rotationWindowSeconds: "10",
      },
    })
  })

  it("keeps classroom-context navigation under one helper for teacher flows", () => {
    const ctx = teacherRoutes.classroomContext("classroom_42")
    expect(ctx).toMatchObject({
      detail: {
        pathname: "/(teacher)/classroom/[classroomId]",
        params: {
          classroomId: "classroom_42",
        },
      },
      roster: {
        pathname: "/(teacher)/classroom/[classroomId]/roster",
        params: {
          classroomId: "classroom_42",
        },
      },
      schedule: {
        pathname: "/(teacher)/classroom/[classroomId]/schedule",
        params: {
          classroomId: "classroom_42",
        },
      },
      announcements: {
        pathname: "/(teacher)/classroom/[classroomId]/announcements",
        params: {
          classroomId: "classroom_42",
        },
      },
      lectures: {
        pathname: "/(teacher)/classroom/[classroomId]/lectures",
        params: {
          classroomId: "classroom_42",
        },
      },
      bluetoothCreate: {
        pathname: "/(teacher)/bluetooth/create",
        params: {
          classroomId: "classroom_42",
        },
      },
    })
    expect(typeof ctx.bluetoothCreateForLecture).toBe("function")
  })
})
