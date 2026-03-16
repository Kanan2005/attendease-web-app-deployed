import { AuthApiClientError } from "@attendease/auth"
import type {
  AttendanceSessionHistoryItem,
  AuthMeResponse,
  ClassroomSummary,
  LectureSummary,
  TeacherAssignmentSummary,
} from "@attendease/contracts"
import { describe, expect, it } from "vitest"

import {
  buildTeacherDashboardModel,
  buildTeacherRecentSessionTimeline,
  buildTeacherSessionHistoryPreview,
  mapTeacherApiErrorToMessage,
} from "./teacher-models.js"

function createAssignment(
  overrides: Partial<TeacherAssignmentSummary> = {},
): TeacherAssignmentSummary {
  return {
    id: "assignment_1",
    teacherId: "teacher_1",
    semesterId: "semester_1",
    classId: "class_1",
    sectionId: "section_1",
    subjectId: "subject_1",
    status: "ACTIVE",
    canSelfCreateCourseOffering: true,
    ...overrides,
  }
}

function createClassroom(overrides: Partial<ClassroomSummary> = {}): ClassroomSummary {
  return {
    id: "classroom_1",
    semesterId: "semester_1",
    classId: "class_1",
    sectionId: "section_1",
    subjectId: "subject_1",
    primaryTeacherId: "teacher_1",
    createdByUserId: "teacher_1",
    code: "CSE6-MATH-A",
    displayTitle: "Mathematics",
    status: "ACTIVE",
    defaultAttendanceMode: "BLUETOOTH",
    defaultGpsRadiusMeters: 75,
    defaultSessionDurationMinutes: 50,
    qrRotationWindowSeconds: 15,
    bluetoothRotationWindowSeconds: 10,
    timezone: "Asia/Kolkata",
    requiresTrustedDevice: true,
    archivedAt: null,
    activeJoinCode: {
      id: "join_code_1",
      courseOfferingId: "classroom_1",
      code: "JOIN42",
      status: "ACTIVE",
      expiresAt: "2026-03-20T09:00:00.000Z",
    },
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

function createAttendanceSession(
  overrides: Partial<AttendanceSessionHistoryItem> = {},
): AttendanceSessionHistoryItem {
  return {
    id: "session_1",
    classroomId: "classroom_1",
    classroomCode: "CSE6-MATH-A",
    classroomDisplayTitle: "Mathematics",
    lectureId: "lecture_1",
    lectureTitle: "Lecture 1",
    lectureDate: "2026-03-14T09:30:00.000Z",
    teacherAssignmentId: "assignment_1",
    mode: "BLUETOOTH",
    status: "ENDED",
    startedAt: "2026-03-14T09:30:00.000Z",
    scheduledEndAt: "2026-03-14T10:20:00.000Z",
    endedAt: "2026-03-14T10:21:00.000Z",
    editableUntil: "2026-03-14T11:00:00.000Z",
    classId: "class_1",
    classCode: "CSE6",
    classTitle: "CSE 6",
    sectionId: "section_1",
    sectionCode: "A",
    sectionTitle: "Section A",
    subjectId: "subject_1",
    subjectCode: "MATH",
    subjectTitle: "Mathematics",
    presentCount: 24,
    absentCount: 6,
    editability: {
      isEditable: true,
      state: "OPEN",
      endedAt: "2026-03-14T10:21:00.000Z",
      editableUntil: "2026-03-14T11:00:00.000Z",
    },
    ...overrides,
  }
}

describe("teacher mobile view models", () => {
  it("builds a recent teacher lecture timeline sorted by latest timestamp", () => {
    const timeline = buildTeacherRecentSessionTimeline({
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
      mode: "BLUETOOTH",
      presentCount: 0,
      isLive: false,
    })
  })

  it("builds session previews from live teacher attendance history", () => {
    const sessions = buildTeacherSessionHistoryPreview({
      sessions: [
        createAttendanceSession({
          id: "session_older",
          classroomDisplayTitle: "Physics",
          startedAt: "2026-03-13T09:30:00.000Z",
        }),
        createAttendanceSession({
          id: "session_live",
          status: "ACTIVE",
          startedAt: "2026-03-15T08:30:00.000Z",
          endedAt: null,
          editableUntil: null,
          presentCount: 12,
          absentCount: 1,
        }),
      ],
    })

    expect(sessions[0]).toMatchObject({
      id: "session_live",
      status: "ACTIVE",
      isLive: true,
      presentCount: 12,
      absentCount: 1,
    })
  })

  it("builds teacher home cards, spotlight, and classroom highlights from live sessions", () => {
    const me: AuthMeResponse = {
      user: {
        id: "teacher_1",
        email: "teacher.one@attendease.dev",
        displayName: "Teacher One",
        status: "ACTIVE",
        availableRoles: ["TEACHER"],
        activeRole: "TEACHER",
        sessionId: "session_1",
        platform: "MOBILE",
        deviceTrust: {
          state: "NOT_REQUIRED",
          lifecycleState: "NOT_APPLICABLE",
          reason: "NOT_STUDENT_ROLE",
          deviceId: null,
          bindingId: null,
        },
      },
      assignments: [],
      enrollments: [],
    }

    const dashboard = buildTeacherDashboardModel({
      me,
      assignments: [createAssignment()],
      classrooms: [createClassroom()],
      recentSessions: buildTeacherSessionHistoryPreview({
        sessions: [
          createAttendanceSession({
            id: "session_live",
            status: "ACTIVE",
            startedAt: "2026-03-15T08:30:00.000Z",
            endedAt: null,
            editableUntil: null,
          }),
        ],
      }),
    })

    expect(dashboard.greeting).toContain("Teacher One")
    expect(dashboard.canCreateClassroom).toBe(true)
    expect(dashboard.summaryCards[0]).toMatchObject({
      label: "Active Classrooms",
      value: "1",
    })
    expect(dashboard.summaryCards[1]).toMatchObject({
      label: "Live Sessions",
      value: "1",
    })
    expect(dashboard.spotlight).toMatchObject({
      title: "Mathematics is live",
      primaryAction: {
        kind: "ACTIVE_SESSION",
        label: "Resume live session",
        sessionId: "session_live",
      },
    })
    expect(dashboard.classroomHighlights[0]).toMatchObject({
      title: "Mathematics",
      joinCodeLabel: "Course code JOIN42",
      sessionStateLabel: "1 live attendance session",
    })
  })

  it("keeps teacher home stable when there are no classrooms yet", () => {
    const dashboard = buildTeacherDashboardModel({
      me: null,
      assignments: [],
      classrooms: [],
      recentSessions: [],
    })

    expect(dashboard).toMatchObject({
      greeting: "Teacher Home",
      canCreateClassroom: false,
    })
    expect(dashboard.summaryCards[0]).toMatchObject({
      label: "Active Classrooms",
      value: "0",
      tone: "warning",
    })
    expect(dashboard.summaryCards[3]).toMatchObject({
      label: "Join Codes Live",
      value: "0",
      tone: "warning",
    })
    expect(dashboard.spotlight).toMatchObject({
      title: "Waiting for classrooms",
      primaryAction: {
        kind: "CLASSROOMS",
        label: "Open classrooms",
      },
    })
  })

  it("maps teacher api conflicts into mobile-friendly messages", () => {
    const message = mapTeacherApiErrorToMessage(
      new AuthApiClientError("Conflict", 409, {
        message: "Classroom join code cannot be rotated in an archived semester.",
      }),
    )

    expect(message).toContain("archived semester")
  })

  it("preserves report policy errors for teacher mobile screens", () => {
    const message = mapTeacherApiErrorToMessage(
      new AuthApiClientError("Forbidden", 403, {
        message: "This teacher report is outside your classroom scope.",
      }),
    )

    expect(message).toBe("This teacher report is outside your classroom scope.")
  })
})
