import { describe, expect, it } from "vitest"

import {
  buildTeacherClassroomsStatus,
  buildTeacherDashboardStatus,
  buildTeacherReportsStatus,
  buildTeacherRosterStatus,
  buildTeacherSessionHistoryStatus,
} from "./teacher-view-state.js"

describe("teacher view-state helpers", () => {
  it("builds signed-out and loading states for teacher home", () => {
    expect(
      buildTeacherDashboardStatus({
        hasSession: false,
        isLoading: false,
        classroomCount: 0,
        liveSessionCount: 0,
        canCreateClassroom: false,
      }),
    ).toMatchObject({
      title: "Teacher sign in required",
      tone: "warning",
    })

    expect(
      buildTeacherDashboardStatus({
        hasSession: true,
        isLoading: true,
        classroomCount: 0,
        liveSessionCount: 0,
        canCreateClassroom: false,
      }),
    ).toMatchObject({
      title: "Getting teacher home ready",
      tone: "primary",
    })
  })

  it("builds empty and ready states for teacher classrooms", () => {
    expect(
      buildTeacherDashboardStatus({
        hasSession: true,
        isLoading: false,
        classroomCount: 0,
        liveSessionCount: 0,
        canCreateClassroom: true,
      }),
    ).toMatchObject({
      title: "Create your first classroom",
      tone: "warning",
    })

    expect(
      buildTeacherDashboardStatus({
        hasSession: true,
        isLoading: false,
        classroomCount: 3,
        liveSessionCount: 0,
        canCreateClassroom: true,
      }),
    ).toMatchObject({
      title: "Teacher home is ready",
      tone: "success",
    })
  })

  it("surfaces live Bluetooth session status ahead of generic ready state", () => {
    expect(
      buildTeacherDashboardStatus({
        hasSession: true,
        isLoading: false,
        classroomCount: 3,
        liveSessionCount: 2,
        canCreateClassroom: false,
      }),
    ).toMatchObject({
      title: "2 attendance sessions are live",
      tone: "success",
    })
  })

  it("preserves explicit home errors", () => {
    expect(
      buildTeacherDashboardStatus({
        hasSession: true,
        isLoading: false,
        errorMessage: "Classrooms could not be loaded.",
        classroomCount: 1,
        liveSessionCount: 0,
        canCreateClassroom: false,
      }),
    ).toMatchObject({
      title: "Teacher home unavailable",
      tone: "danger",
      message: "Classrooms could not be loaded.",
    })
  })

  it("builds classroom-management states for loading, empty, and ready screens", () => {
    expect(
      buildTeacherClassroomsStatus({
        hasSession: true,
        isLoading: true,
        classroomCount: 0,
        canCreateClassroom: true,
      }),
    ).toMatchObject({
      title: "Loading classrooms",
      tone: "primary",
    })

    expect(
      buildTeacherClassroomsStatus({
        hasSession: true,
        isLoading: false,
        classroomCount: 0,
        canCreateClassroom: true,
      }),
    ).toMatchObject({
      title: "Create your first classroom",
      tone: "warning",
    })

    expect(
      buildTeacherClassroomsStatus({
        hasSession: true,
        isLoading: false,
        classroomCount: 2,
        canCreateClassroom: true,
      }),
    ).toMatchObject({
      title: "Classrooms are ready",
      tone: "success",
    })
  })

  it("builds roster-management states for empty, filtered, and ready screens", () => {
    expect(
      buildTeacherRosterStatus({
        hasSession: true,
        isLoading: false,
        totalCount: 0,
        visibleCount: 0,
        hasActiveFilter: false,
      }),
    ).toMatchObject({
      title: "Add your first student",
      tone: "warning",
    })

    expect(
      buildTeacherRosterStatus({
        hasSession: true,
        isLoading: false,
        totalCount: 4,
        visibleCount: 0,
        hasActiveFilter: true,
      }),
    ).toMatchObject({
      title: "No students match this view",
      tone: "warning",
    })

    expect(
      buildTeacherRosterStatus({
        hasSession: true,
        isLoading: false,
        totalCount: 4,
        visibleCount: 2,
        hasActiveFilter: true,
      }),
    ).toMatchObject({
      title: "Showing 2 of 4 students",
      tone: "success",
    })
  })

  it("builds history states for live sessions, correction-ready sessions, and empty history", () => {
    expect(
      buildTeacherSessionHistoryStatus({
        hasSession: true,
        isLoading: false,
        totalCount: 0,
        liveCount: 0,
        correctionOpenCount: 0,
      }),
    ).toMatchObject({
      title: "No attendance sessions yet",
      tone: "warning",
    })

    expect(
      buildTeacherSessionHistoryStatus({
        hasSession: true,
        isLoading: false,
        totalCount: 4,
        liveCount: 1,
        correctionOpenCount: 2,
      }),
    ).toMatchObject({
      title: "1 live attendance session",
      tone: "success",
    })

    expect(
      buildTeacherSessionHistoryStatus({
        hasSession: true,
        isLoading: false,
        totalCount: 3,
        liveCount: 0,
        correctionOpenCount: 2,
      }),
    ).toMatchObject({
      title: "2 saved sessions still allow corrections",
      tone: "warning",
    })
  })

  it("builds report states for no data, follow-up, and ready views", () => {
    expect(
      buildTeacherReportsStatus({
        hasSession: true,
        isLoading: false,
        hasAnyData: false,
        hasClassroomFilter: true,
        hasSubjectFilter: false,
        followUpCount: 0,
      }),
    ).toMatchObject({
      title: "No report data for this view",
      tone: "warning",
    })

    expect(
      buildTeacherReportsStatus({
        hasSession: true,
        isLoading: false,
        hasAnyData: true,
        hasClassroomFilter: false,
        hasSubjectFilter: false,
        followUpCount: 3,
      }),
    ).toMatchObject({
      title: "3 students need follow-up",
      tone: "warning",
    })

    expect(
      buildTeacherReportsStatus({
        hasSession: true,
        isLoading: false,
        hasAnyData: true,
        hasClassroomFilter: true,
        hasSubjectFilter: true,
        followUpCount: 0,
      }),
    ).toMatchObject({
      title: "Reports are ready",
      tone: "success",
    })
  })
})
