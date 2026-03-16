import { describe, expect, it } from "vitest"

import {
  buildStudentAttendanceRefreshStatus,
  buildStudentDashboardStatus,
  buildStudentHistoryRefreshStatus,
  buildStudentJoinBanner,
  buildStudentReportsStatus,
} from "./student-view-state.js"

describe("student view-state helpers", () => {
  it("builds dashboard loading and empty states", () => {
    expect(
      buildStudentDashboardStatus({
        hasSession: false,
        isLoading: false,
        classroomCount: 0,
        recentLectureCount: 0,
        openAttendanceCount: 0,
        attendanceBlocked: false,
      }),
    ).toMatchObject({
      title: "Student sign in required",
      tone: "warning",
    })

    expect(
      buildStudentDashboardStatus({
        hasSession: true,
        isLoading: true,
        classroomCount: 0,
        recentLectureCount: 0,
        openAttendanceCount: 0,
        attendanceBlocked: false,
      }),
    ).toMatchObject({
      title: "Getting your home ready",
      tone: "primary",
    })

    expect(
      buildStudentDashboardStatus({
        hasSession: true,
        isLoading: false,
        classroomCount: 0,
        recentLectureCount: 0,
        openAttendanceCount: 0,
        attendanceBlocked: false,
      }),
    ).toMatchObject({
      title: "No classrooms yet",
      tone: "warning",
    })
  })

  it("surfaces blocked and open-attendance dashboard states", () => {
    expect(
      buildStudentDashboardStatus({
        hasSession: true,
        isLoading: false,
        classroomCount: 2,
        recentLectureCount: 0,
        openAttendanceCount: 2,
        attendanceBlocked: true,
      }),
    ).toMatchObject({
      title: "Attendance needs approval",
      tone: "warning",
    })

    expect(
      buildStudentDashboardStatus({
        hasSession: true,
        isLoading: false,
        classroomCount: 2,
        recentLectureCount: 1,
        openAttendanceCount: 2,
        attendanceBlocked: false,
      }),
    ).toMatchObject({
      title: "Attendance is open now",
      tone: "success",
    })
  })

  it("builds join classroom success and error banners", () => {
    expect(
      buildStudentJoinBanner({
        state: "pending",
      }),
    ).toMatchObject({
      title: "Joining classroom",
      tone: "primary",
    })

    expect(
      buildStudentJoinBanner({
        state: "success",
        classroomTitle: "Mathematics",
      }),
    ).toMatchObject({
      title: "Classroom joined",
      tone: "success",
    })

    expect(
      buildStudentJoinBanner({
        state: "error",
        errorMessage: "Join code expired.",
      }),
    ).toMatchObject({
      title: "Join failed",
      tone: "danger",
    })
  })

  it("builds history refresh messaging", () => {
    expect(
      buildStudentHistoryRefreshStatus({
        isLoading: true,
        isRefreshing: false,
        recordCount: 0,
      }),
    ).toMatchObject({
      title: "Loading attendance history",
      tone: "primary",
    })

    expect(
      buildStudentHistoryRefreshStatus({
        isLoading: false,
        isRefreshing: true,
        recordCount: 2,
      }),
    ).toMatchObject({
      title: "Refreshing history",
      tone: "primary",
    })

    expect(
      buildStudentHistoryRefreshStatus({
        isLoading: false,
        isRefreshing: false,
        recordCount: 0,
      }),
    ).toMatchObject({
      title: "No history yet",
      tone: "warning",
    })
  })

  it("builds attendance refresh messaging for all-session and Bluetooth-only views", () => {
    expect(
      buildStudentAttendanceRefreshStatus({
        isRefreshing: true,
        openAttendanceCount: 0,
        mode: "ALL",
      }),
    ).toMatchObject({
      title: "Refreshing attendance",
      tone: "primary",
    })

    expect(
      buildStudentAttendanceRefreshStatus({
        isRefreshing: false,
        openAttendanceCount: 0,
        mode: "BLUETOOTH",
      }),
    ).toMatchObject({
      title: "Waiting for a Bluetooth session",
      tone: "warning",
    })

    expect(
      buildStudentAttendanceRefreshStatus({
        isRefreshing: false,
        openAttendanceCount: 2,
        mode: "BLUETOOTH",
      }),
    ).toMatchObject({
      title: "2 Bluetooth sessions ready",
      tone: "success",
    })
  })

  it("builds report empty and ready states", () => {
    expect(
      buildStudentReportsStatus({
        hasSession: false,
        isLoading: false,
        subjectCount: 0,
        classroomCount: 0,
      }),
    ).toMatchObject({
      title: "Student sign in required",
      tone: "warning",
    })

    expect(
      buildStudentReportsStatus({
        hasSession: true,
        isLoading: false,
        subjectCount: 0,
        classroomCount: 0,
      }),
    ).toMatchObject({
      title: "No report data yet",
      tone: "warning",
    })

    expect(
      buildStudentReportsStatus({
        hasSession: true,
        isLoading: false,
        subjectCount: 0,
        classroomCount: 2,
      }),
    ).toMatchObject({
      title: "No attendance history yet",
      tone: "warning",
    })

    expect(
      buildStudentReportsStatus({
        hasSession: true,
        isLoading: false,
        subjectCount: 0,
        classroomCount: 0,
      }),
    ).toMatchObject({
      title: "No report data yet",
      tone: "warning",
    })

    expect(
      buildStudentReportsStatus({
        hasSession: true,
        isLoading: false,
        subjectCount: 2,
        classroomCount: 2,
      }),
    ).toMatchObject({
      title: "Reports ready",
      tone: "success",
    })

    expect(
      buildStudentReportsStatus({
        hasSession: true,
        isLoading: true,
        subjectCount: 2,
        classroomCount: 2,
      }),
    ).toMatchObject({
      title: "Loading reports",
      tone: "primary",
    })
  })
})
