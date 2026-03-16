import { AuthApiClientError } from "@attendease/auth"
import type {
  AuthMeResponse,
  LectureSummary,
  StudentClassroomMembershipSummary,
} from "@attendease/contracts"
import { describe, expect, it } from "vitest"

import {
  buildStudentDashboardModel,
  buildStudentLectureTimeline,
  mapStudentApiErrorToMessage,
} from "./student-models.js"

function createClassroom(
  overrides: Partial<StudentClassroomMembershipSummary>,
): StudentClassroomMembershipSummary {
  return {
    id: "classroom_1",
    semesterId: "semester_1",
    classId: "class_1",
    sectionId: "section_1",
    subjectId: "subject_1",
    primaryTeacherId: "teacher_1",
    code: "CSE6-MATH-A",
    displayTitle: "Mathematics",
    classroomStatus: "ACTIVE",
    defaultAttendanceMode: "QR_GPS",
    timezone: "Asia/Kolkata",
    requiresTrustedDevice: true,
    enrollmentId: "enrollment_1",
    enrollmentStatus: "ACTIVE",
    enrollmentSource: "JOIN_CODE",
    joinedAt: "2026-03-14T10:00:00.000Z",
    droppedAt: null,
    ...overrides,
  }
}

function createLecture(overrides: Partial<LectureSummary> = {}): LectureSummary {
  return {
    id: "lecture_1",
    courseOfferingId: "classroom_1",
    scheduleSlotId: "slot_1",
    scheduleExceptionId: null,
    createdByUserId: "teacher_1",
    title: "Lecture 1",
    lectureDate: "2026-03-14T09:00:00.000Z",
    plannedStartAt: "2026-03-14T09:30:00.000Z",
    plannedEndAt: "2026-03-14T10:30:00.000Z",
    actualStartAt: null,
    actualEndAt: null,
    status: "PLANNED",
    ...overrides,
  }
}

describe("student foundation view models", () => {
  it("builds a recent lecture timeline sorted by newest timestamp", () => {
    const timeline = buildStudentLectureTimeline({
      classrooms: [
        createClassroom({
          id: "classroom_1",
          displayTitle: "Mathematics",
        }),
        createClassroom({
          id: "classroom_2",
          displayTitle: "Physics",
        }),
      ],
      lectureSets: [
        {
          classroomId: "classroom_1",
          lectures: [createLecture()],
        },
        {
          classroomId: "classroom_2",
          lectures: [
            createLecture({
              id: "lecture_2",
              courseOfferingId: "classroom_2",
              title: "Mechanics",
              plannedStartAt: "2026-03-15T08:00:00.000Z",
            }),
          ],
        },
      ],
    })

    expect(timeline).toHaveLength(2)
    expect(timeline[0]).toMatchObject({
      id: "lecture_2",
      classroomTitle: "Physics",
    })
  })

  it("builds dashboard cards from live student and classroom state", () => {
    const me: AuthMeResponse = {
      user: {
        id: "student_1",
        email: "student.one@attendease.dev",
        displayName: "Student One",
        status: "ACTIVE",
        availableRoles: ["STUDENT"],
        activeRole: "STUDENT",
        sessionId: "session_1",
        platform: "MOBILE",
        deviceTrust: {
          state: "TRUSTED",
          lifecycleState: "TRUSTED",
          reason: "DEVICE_BOUND",
          deviceId: "device_1",
          bindingId: "binding_1",
        },
      },
      assignments: [],
      enrollments: [],
    }

    const dashboard = buildStudentDashboardModel({
      me,
      classrooms: [
        createClassroom({
          id: "classroom_1",
          enrollmentStatus: "ACTIVE",
        }),
        createClassroom({
          id: "classroom_2",
          enrollmentStatus: "PENDING",
        }),
      ],
      recentTimeline: [
        {
          id: "lecture_1",
          classroomId: "classroom_1",
          classroomTitle: "Mathematics",
          title: "Lecture 1",
          status: "PLANNED",
          timestamp: "2026-03-14T09:30:00.000Z",
        },
      ],
      attendanceOverview: {
        totalOpenSessions: 2,
        qrReadyCount: 1,
        bluetoothReadyCount: 1,
        recommendedMode: "QR_GPS",
      },
      attendanceGate: {
        title: "Trusted device ready",
        message: "The device is trusted for student attendance on this account.",
        tone: "success",
        canContinue: true,
      },
    })

    expect(dashboard.greeting).toContain("Student")
    expect(dashboard.summaryCards[0]).toMatchObject({
      label: "Classrooms",
      value: "1",
    })
    expect(dashboard.summaryCards[2]).toMatchObject({
      label: "Pending Joins",
      value: "1",
    })
    expect(dashboard.summaryCards[3]).toMatchObject({
      label: "Device Status",
      value: "Trusted",
    })
    expect(dashboard.spotlight).toMatchObject({
      title: "2 attendance sessions are open",
      tone: "success",
      primaryAction: {
        kind: "ATTENDANCE",
        label: "Open attendance",
      },
    })
    expect(dashboard.classroomHighlights[0]).toMatchObject({
      title: "Mathematics",
      supportingText: "CSE6-MATH-A · Joined · QR + GPS",
    })
  })

  it("maps api conflicts into student-friendly join feedback", () => {
    const message = mapStudentApiErrorToMessage(
      new AuthApiClientError("Conflict", 409, {
        message: "Student is already actively enrolled in this classroom.",
      }),
    )

    expect(message).toContain("already actively enrolled")
  })

  it("surfaces pending replacement device state on the student dashboard", () => {
    const dashboard = buildStudentDashboardModel({
      me: {
        user: {
          id: "student_1",
          email: "student.one@attendease.dev",
          displayName: "Student One",
          status: "ACTIVE",
          availableRoles: ["STUDENT"],
          activeRole: "STUDENT",
          sessionId: "session_1",
          platform: "MOBILE",
          deviceTrust: {
            state: "BLOCKED",
            lifecycleState: "PENDING_REPLACEMENT",
            reason: "DEVICE_REPLACEMENT_PENDING_APPROVAL",
            deviceId: "device_2",
            bindingId: "binding_pending",
          },
        },
        assignments: [],
        enrollments: [],
      },
      classrooms: [],
      recentTimeline: [],
      attendanceOverview: {
        totalOpenSessions: 0,
        qrReadyCount: 0,
        bluetoothReadyCount: 0,
        recommendedMode: null,
      },
      attendanceGate: {
        title: "Replacement phone pending approval",
        message:
          "This phone is waiting for admin approval before it can become the attendance device for this student.",
        tone: "warning",
        canContinue: false,
      },
    })

    expect(dashboard.summaryCards[3]).toMatchObject({
      label: "Device Status",
      value: "Pending approval",
      tone: "warning",
    })
    expect(dashboard.spotlight).toMatchObject({
      title: "Join your first classroom",
      primaryAction: {
        kind: "JOIN_CLASSROOM",
        label: "Join classroom",
      },
    })
  })

  it("surfaces device approval blockers ahead of attendance when classrooms already exist", () => {
    const dashboard = buildStudentDashboardModel({
      me: {
        user: {
          id: "student_1",
          email: "student.one@attendease.dev",
          displayName: "Student One",
          status: "ACTIVE",
          availableRoles: ["STUDENT"],
          activeRole: "STUDENT",
          sessionId: "session_1",
          platform: "MOBILE",
          deviceTrust: {
            state: "BLOCKED",
            lifecycleState: "PENDING_REPLACEMENT",
            reason: "DEVICE_REPLACEMENT_PENDING_APPROVAL",
            deviceId: "device_2",
            bindingId: "binding_pending",
          },
        },
        assignments: [],
        enrollments: [],
      },
      classrooms: [
        createClassroom({
          id: "classroom_1",
        }),
      ],
      recentTimeline: [],
      attendanceOverview: {
        totalOpenSessions: 1,
        qrReadyCount: 1,
        bluetoothReadyCount: 0,
        recommendedMode: "QR_GPS",
      },
      attendanceGate: {
        title: "Replacement phone pending approval",
        message:
          "This phone is waiting for admin approval before it can become the attendance device for this student.",
        tone: "warning",
        canContinue: false,
      },
    })

    expect(dashboard.spotlight).toMatchObject({
      title: "Replacement phone pending approval",
      primaryAction: {
        kind: "DEVICE_STATUS",
        label: "Open device status",
      },
      secondaryAction: {
        kind: "CLASSROOM",
        label: "Open classroom",
        classroomId: "classroom_1",
      },
    })
  })

  it("preserves policy error details for report and classroom screens", () => {
    const message = mapStudentApiErrorToMessage(
      new AuthApiClientError("Forbidden", 403, {
        message: "This student report is only available after device trust is restored.",
      }),
    )

    expect(message).toBe("This student report is only available after device trust is restored.")
  })
})
