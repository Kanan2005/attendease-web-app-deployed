import { describe, expect, it } from "vitest"

import { teacherRoutes } from "./teacher-routes.js"

describe("teacher route helpers", () => {
  it("keeps the teacher dashboard and classroom list routes centralized", () => {
    expect(teacherRoutes.home).toBe("/(teacher)")
    expect(teacherRoutes.dashboard).toBe("/(teacher)")
    expect(teacherRoutes.classrooms).toBe("/(teacher)/classrooms")
    expect(teacherRoutes.sessionHistory).toBe("/(teacher)/sessions")
    expect(teacherRoutes.bluetoothCreate).toBe("/(teacher)/bluetooth/create")
    expect(teacherRoutes.bluetoothCreateWithContext("classroom_1")).toEqual({
      pathname: "/(teacher)/bluetooth/create",
      params: {
        classroomId: "classroom_1",
      },
    })
    expect(teacherRoutes.reports).toBe("/(teacher)/reports")
    expect(teacherRoutes.exports).toBe("/(teacher)/exports")
    expect(teacherRoutes.sessionDetail("session_1")).toEqual({
      pathname: "/(teacher)/sessions/[sessionId]",
      params: {
        sessionId: "session_1",
      },
    })
  })

  it("builds dynamic classroom hub routes with params", () => {
    expect(teacherRoutes.classroomDetail("classroom_1")).toEqual({
      pathname: "/(teacher)/classrooms/[classroomId]",
      params: {
        classroomId: "classroom_1",
      },
    })
    expect(teacherRoutes.classroomRoster("classroom_1")).toEqual({
      pathname: "/(teacher)/classrooms/[classroomId]/roster",
      params: {
        classroomId: "classroom_1",
      },
    })
    expect(teacherRoutes.classroomAnnouncements("classroom_1")).toEqual({
      pathname: "/(teacher)/classrooms/[classroomId]/announcements",
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
    expect(teacherRoutes.classroomContext("classroom_42")).toEqual({
      detail: {
        pathname: "/(teacher)/classrooms/[classroomId]",
        params: {
          classroomId: "classroom_42",
        },
      },
      roster: {
        pathname: "/(teacher)/classrooms/[classroomId]/roster",
        params: {
          classroomId: "classroom_42",
        },
      },
      schedule: {
        pathname: "/(teacher)/classrooms/[classroomId]/schedule",
        params: {
          classroomId: "classroom_42",
        },
      },
      announcements: {
        pathname: "/(teacher)/classrooms/[classroomId]/announcements",
        params: {
          classroomId: "classroom_42",
        },
      },
      lectures: {
        pathname: "/(teacher)/classrooms/[classroomId]/lectures",
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
  })
})
