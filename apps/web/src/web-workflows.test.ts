import type {
  AttendanceSessionHistoryItem,
  AttendanceSessionStudentSummary,
  AttendanceSessionSummary,
  ClassroomSchedule,
  ClassroomSummary,
} from "@attendease/contracts"
import { describe, expect, it } from "vitest"

import {
  adminWorkflowRoutes,
  buildImportMonitorRows,
  buildQrSessionCreateRequest,
  buildQrSessionLiveModel,
  buildQrSessionRosterModel,
  buildQrSessionShellModel,
  buildScheduleSavePayload,
  buildTeacherClassroomLinks,
  buildTeacherSemesterVisibilityRows,
  createScheduleDraftState,
  formatPortalMinutesRange,
  getQrSessionPollInterval,
  getTeacherSessionHistoryPollInterval,
  parseRosterImportRowsText,
  qrSessionLiveRefreshIntervalMs,
  teacherWorkflowRoutes,
  webWorkflowQueryKeys,
} from "./web-workflows.js"

describe("web workflow helpers", () => {
  it("keeps the main teacher and admin workflow routes aligned", () => {
    expect(teacherWorkflowRoutes.classroomCreate).toBe("/teacher/classrooms/new")
    expect(teacherWorkflowRoutes.classroomDetail("classroom_1")).toBe(
      "/teacher/classrooms/classroom_1",
    )
    expect(teacherWorkflowRoutes.classroomRoster("classroom_1")).toBe(
      "/teacher/classrooms/classroom_1/roster",
    )
    expect(teacherWorkflowRoutes.classroomImports("classroom_1")).toBe(
      "/teacher/classrooms/classroom_1/imports",
    )
    expect(teacherWorkflowRoutes.classroomStream("classroom_1")).toBe(
      "/teacher/classrooms/classroom_1/stream",
    )
    expect(teacherWorkflowRoutes.activeSessionProjector("session_1")).toBe(
      "/teacher/sessions/active/session_1/projector",
    )
    expect(adminWorkflowRoutes.devices).toBe("/admin/devices")
    expect(adminWorkflowRoutes.semesters).toBe("/admin/semesters")

    expect(buildTeacherClassroomLinks("classroom_1").map((entry) => entry.label)).toEqual([
      "Course",
      "Roster",
      "Imports",
      "Schedule",
      "Updates",
      "Class Sessions",
    ])
    expect(buildTeacherClassroomLinks("classroom_1").map((entry) => entry.href)).toEqual([
      "/teacher/classrooms/classroom_1",
      "/teacher/classrooms/classroom_1/roster",
      "/teacher/classrooms/classroom_1/imports",
      "/teacher/classrooms/classroom_1/schedule",
      "/teacher/classrooms/classroom_1/stream",
      "/teacher/classrooms/classroom_1/lectures",
    ])
  })

  it("builds stable query keys for classroom, schedule, and import routes", () => {
    expect(webWorkflowQueryKeys.teacherAssignments({ status: "ACTIVE" })).toEqual([
      "web-workflows",
      "teacher-assignments",
      { status: "ACTIVE" },
    ])
    expect(webWorkflowQueryKeys.classrooms({ status: "ACTIVE" })).toEqual([
      "web-workflows",
      "classrooms",
      { status: "ACTIVE" },
    ])
    expect(webWorkflowQueryKeys.classroomSchedule("classroom_1")).toEqual([
      "web-workflows",
      "classroom-schedule",
      "classroom_1",
    ])
    expect(webWorkflowQueryKeys.classroomImportDetail("classroom_1", "job_1")).toEqual([
      "web-workflows",
      "classroom-import-detail",
      "classroom_1",
      "job_1",
    ])
    expect(webWorkflowQueryKeys.sessionHistory({ status: "ENDED" })).toEqual([
      "web-workflows",
      "session-history",
      { status: "ENDED" },
    ])
    expect(webWorkflowQueryKeys.teacherDaywiseReports({ classroomId: "classroom_1" })).toEqual([
      "web-workflows",
      "teacher-daywise-reports",
      { classroomId: "classroom_1" },
    ])
    expect(webWorkflowQueryKeys.teacherSubjectwiseReports({ subjectId: "subject_1" })).toEqual([
      "web-workflows",
      "teacher-subjectwise-reports",
      { subjectId: "subject_1" },
    ])
    expect(
      webWorkflowQueryKeys.teacherStudentPercentageReports({ sectionId: "section_1" }),
    ).toEqual(["web-workflows", "teacher-student-percentage-reports", { sectionId: "section_1" }])
    expect(webWorkflowQueryKeys.exportJobs({ status: "COMPLETED" })).toEqual([
      "web-workflows",
      "export-jobs",
      { status: "COMPLETED" },
    ])
    expect(webWorkflowQueryKeys.adminClassrooms({ status: "ACTIVE" })).toEqual([
      "web-workflows",
      "admin-classrooms",
      { status: "ACTIVE" },
    ])
    expect(webWorkflowQueryKeys.adminClassroomDetail("classroom_1")).toEqual([
      "web-workflows",
      "admin-classroom-detail",
      "classroom_1",
    ])
    expect(webWorkflowQueryKeys.analyticsTrends({ classroomId: "classroom_1" })).toEqual([
      "web-workflows",
      "analytics-trends",
      { classroomId: "classroom_1" },
    ])
    expect(webWorkflowQueryKeys.emailAutomationRules({ classroomId: "classroom_1" })).toEqual([
      "web-workflows",
      "email-automation-rules",
      { classroomId: "classroom_1" },
    ])
    expect(webWorkflowQueryKeys.emailDispatchRuns({ status: "QUEUED" })).toEqual([
      "web-workflows",
      "email-dispatch-runs",
      { status: "QUEUED" },
    ])
    expect(webWorkflowQueryKeys.emailLogs({ dispatchRunId: "run_1" })).toEqual([
      "web-workflows",
      "email-logs",
      { dispatchRunId: "run_1" },
    ])
    expect(webWorkflowQueryKeys.attendanceSessionStudents("session_1")).toEqual([
      "web-workflows",
      "attendance-session-students",
      "session_1",
    ])
  })

  it("parses roster import text into validated row payloads while ignoring bad lines", () => {
    const result = parseRosterImportRowsText(`
student.one@attendease.dev,Student One,23CS001
23CS002,student.two@attendease.dev
# ignored comment
bad line without usable data
student.three@attendease.dev
ROLL-44
    `)

    expect(result.rows).toEqual([
      {
        studentEmail: "student.one@attendease.dev",
        parsedName: "Student One",
        studentRollNumber: "23CS001",
      },
      {
        studentRollNumber: "23CS002",
        studentEmail: "student.two@attendease.dev",
      },
      {
        studentEmail: "student.three@attendease.dev",
      },
      {
        studentRollNumber: "ROLL-44",
      },
    ])
    expect(result.ignoredLineCount).toBe(1)
  })

  it("builds schedule save payloads only for changed or new schedule entries", () => {
    const original: ClassroomSchedule = {
      classroomId: "classroom_1",
      scheduleSlots: [
        {
          id: "slot_1",
          courseOfferingId: "classroom_1",
          weekday: 1,
          startMinutes: 540,
          endMinutes: 600,
          locationLabel: "Room 101",
          status: "ACTIVE",
        },
      ],
      scheduleExceptions: [
        {
          id: "exception_1",
          courseOfferingId: "classroom_1",
          scheduleSlotId: "slot_1",
          exceptionType: "RESCHEDULED",
          effectiveDate: "2026-04-10T00:00:00.000Z",
          startMinutes: 600,
          endMinutes: 660,
          locationLabel: "Room 202",
          reason: "Holiday shift",
        },
      ],
    }

    const draft = createScheduleDraftState(original)
    const firstSlot = draft.slots[0]
    const firstException = draft.exceptions[0]

    if (!firstSlot || !firstException) {
      throw new Error("Expected seeded schedule draft rows to exist in the test fixture.")
    }

    draft.slots[0] = { ...firstSlot, locationLabel: "Room 102" }
    draft.slots.push({
      id: null,
      weekday: 5,
      startMinutes: 660,
      endMinutes: 720,
      locationLabel: "Lab 3",
      status: "ACTIVE",
    })
    draft.exceptions[0] = { ...firstException, reason: "Rescheduled after review" }

    const payload = buildScheduleSavePayload({
      original,
      draft,
      note: "Save and notify",
    })

    expect(payload).toEqual({
      weeklySlotCreates: [
        {
          weekday: 5,
          startMinutes: 660,
          endMinutes: 720,
          locationLabel: "Lab 3",
        },
      ],
      weeklySlotUpdates: [
        {
          slotId: "slot_1",
          weekday: 1,
          startMinutes: 540,
          endMinutes: 600,
          locationLabel: "Room 102",
          status: "ACTIVE",
        },
      ],
      exceptionUpdates: [
        {
          exceptionId: "exception_1",
          scheduleSlotId: "slot_1",
          exceptionType: "RESCHEDULED",
          effectiveDate: "2026-04-10T00:00:00.000Z",
          startMinutes: 600,
          endMinutes: 660,
          locationLabel: "Room 202",
          reason: "Rescheduled after review",
        },
      ],
      note: "Save and notify",
    })
  })

  it("returns null for schedule saves when the draft is unchanged", () => {
    const original: ClassroomSchedule = {
      classroomId: "classroom_1",
      scheduleSlots: [],
      scheduleExceptions: [],
    }

    const draft = createScheduleDraftState(original)

    expect(buildScheduleSavePayload({ original, draft })).toBeNull()
  })

  it("builds teacher semester visibility and admin import monitor rows from classroom data", () => {
    const classrooms: ClassroomSummary[] = [
      {
        id: "classroom_1",
        semesterId: "semester_1",
        classId: "class_1",
        sectionId: "section_a",
        subjectId: "subject_math",
        primaryTeacherId: "teacher_1",
        createdByUserId: "teacher_1",
        code: "CSE6-MATH-A",
        displayTitle: "Maths",
        status: "ACTIVE",
        defaultAttendanceMode: "QR_GPS",
        defaultGpsRadiusMeters: 100,
        defaultSessionDurationMinutes: 15,
        qrRotationWindowSeconds: 15,
        bluetoothRotationWindowSeconds: 10,
        timezone: "Asia/Kolkata",
        requiresTrustedDevice: true,
        archivedAt: null,
        activeJoinCode: null,
      },
      {
        id: "classroom_2",
        semesterId: "semester_1",
        classId: "class_1",
        sectionId: "section_b",
        subjectId: "subject_physics",
        primaryTeacherId: "teacher_1",
        createdByUserId: "teacher_1",
        code: "CSE6-PHY-B",
        displayTitle: "Physics",
        status: "COMPLETED",
        defaultAttendanceMode: "QR_GPS",
        defaultGpsRadiusMeters: 100,
        defaultSessionDurationMinutes: 15,
        qrRotationWindowSeconds: 15,
        bluetoothRotationWindowSeconds: 10,
        timezone: "Asia/Kolkata",
        requiresTrustedDevice: false,
        archivedAt: null,
        activeJoinCode: null,
      },
    ]

    expect(buildTeacherSemesterVisibilityRows(classrooms)).toEqual([
      {
        semesterId: "semester_1",
        classroomCount: 2,
        activeCount: 1,
        completedCount: 1,
        requiresTrustedDeviceCount: 1,
      },
    ])

    expect(
      buildImportMonitorRows({
        classrooms: [...classrooms],
        jobsByClassroom: {
          classroom_1: [
            {
              id: "job_1",
              courseOfferingId: "classroom_1",
              requestedByUserId: "teacher_1",
              sourceFileKey: "imports/job-1.csv",
              sourceFileName: "job-1.csv",
              status: "REVIEW_REQUIRED",
              totalRows: 20,
              validRows: 18,
              invalidRows: 2,
              appliedRows: 0,
              startedAt: "2026-03-14T10:00:00.000Z",
              completedAt: "2026-03-14T10:05:00.000Z",
              reviewedAt: null,
              createdAt: "2026-03-14T09:59:00.000Z",
            },
          ],
        },
      }),
    ).toEqual([
      {
        classroomId: "classroom_1",
        classroomCode: "CSE6-MATH-A",
        classroomTitle: "Maths",
        jobId: "job_1",
        status: "REVIEW_REQUIRED",
        totalRows: 20,
        validRows: 18,
        invalidRows: 2,
        appliedRows: 0,
        createdAt: "2026-03-14T09:59:00.000Z",
        reviewRequired: true,
      },
    ])
  })

  it("builds QR session shell models for control and projector modes", () => {
    const control = buildQrSessionShellModel({
      sessionId: "session_1",
      projector: false,
    })
    const projector = buildQrSessionShellModel({
      sessionId: "session_1",
      projector: true,
    })

    expect(control.sections.map((section) => section.id)).toEqual([
      "session-header",
      "rolling-qr-panel",
      "live-counter",
      "session-timer",
      "session-controls",
    ])
    expect(projector.sections.map((section) => section.id)).toEqual([
      "projector-header",
      "rolling-qr-panel",
      "projector-status",
    ])
    expect(control.sections.some((section) => section.id === "rolling-qr-panel")).toBe(true)
    expect(projector.sections.some((section) => section.id === "rolling-qr-panel")).toBe(true)
    expect(control.title).toBe("Live QR attendance")
    expect(projector.title).toBe("QR classroom display")
    expect(projector.subtitle).toContain("QR, timer, and marked count")
    expect(formatPortalMinutesRange(540, 600)).toBe("09:00 AM - 10:00 AM")
  })

  it("builds QR session create requests from the teacher draft without leaking blank optional fields", () => {
    expect(
      buildQrSessionCreateRequest({
        classroomId: "classroom_1",
        draft: {
          lectureId: "",
          sessionDurationMinutes: "18",
          gpsRadiusMeters: "120",
          anchorType: "TEACHER_SELECTED",
          anchorLatitude: "28.613900",
          anchorLongitude: "77.209000",
          anchorLabel: "  Room 101  ",
        },
      }),
    ).toEqual({
      classroomId: "classroom_1",
      sessionDurationMinutes: 18,
      gpsRadiusMeters: 120,
      anchorType: "TEACHER_SELECTED",
      anchorLatitude: 28.6139,
      anchorLongitude: 77.209,
      anchorLabel: "Room 101",
    })
  })

  it("builds live QR session countdown and poll cadence from the current session state", () => {
    const session: AttendanceSessionSummary = {
      id: "session_1",
      classroomId: "classroom_1",
      lectureId: "lecture_1",
      teacherAssignmentId: "assignment_1",
      mode: "QR_GPS",
      status: "ACTIVE",
      startedAt: "2026-03-14T10:00:00.000Z",
      scheduledEndAt: "2026-03-14T10:20:00.000Z",
      endedAt: null,
      editableUntil: null,
      durationSeconds: 1_200,
      anchorType: "TEACHER_SELECTED",
      anchorLatitude: 28.6139,
      anchorLongitude: 77.209,
      anchorLabel: "Room 101",
      gpsRadiusMeters: 120,
      qrRotationWindowSeconds: 15,
      bluetoothRotationWindowSeconds: null,
      blePublicId: null,
      bleProtocolVersion: null,
      rosterSnapshotCount: 30,
      presentCount: 8,
      absentCount: 22,
      currentQrPayload: '{"sid":"session_1"}',
      currentQrExpiresAt: "2026-03-14T10:00:09.000Z",
    }

    expect(getQrSessionPollInterval(session)).toBe(qrSessionLiveRefreshIntervalMs)

    expect(buildQrSessionLiveModel(session, new Date("2026-03-14T10:00:07.500Z"))).toMatchObject({
      statusLabel: "Active",
      attendanceRatioLabel: "8 / 30",
      canDisplayQr: true,
      qrExpiresLabel: expect.any(String),
      qrRefreshLabel: "Refreshes every 2 seconds",
      locationRuleLabel: "Room 101 · 120 meter check-in zone",
      liveSummaryLabel: "8 present · 22 absent",
    })
  })

  it("stops polling once the QR session is no longer active", () => {
    const session: AttendanceSessionSummary = {
      id: "session_1",
      classroomId: "classroom_1",
      lectureId: null,
      teacherAssignmentId: "assignment_1",
      mode: "QR_GPS",
      status: "ENDED",
      startedAt: "2026-03-14T10:00:00.000Z",
      scheduledEndAt: "2026-03-14T10:20:00.000Z",
      endedAt: "2026-03-14T10:17:00.000Z",
      editableUntil: "2026-03-15T10:17:00.000Z",
      durationSeconds: 1_200,
      anchorType: "TEACHER_SELECTED",
      anchorLatitude: 28.6139,
      anchorLongitude: 77.209,
      anchorLabel: "Room 101",
      gpsRadiusMeters: 120,
      qrRotationWindowSeconds: 15,
      bluetoothRotationWindowSeconds: null,
      blePublicId: null,
      bleProtocolVersion: null,
      rosterSnapshotCount: 30,
      presentCount: 30,
      absentCount: 0,
      currentQrPayload: null,
      currentQrExpiresAt: null,
    }

    expect(getQrSessionPollInterval(session)).toBe(false)
    expect(buildQrSessionLiveModel(session).canDisplayQr).toBe(false)
  })

  it("keeps teacher session lists polling only while a live session exists", () => {
    const sessions: AttendanceSessionHistoryItem[] = [
      {
        id: "session_1",
        classroomId: "classroom_1",
        classroomCode: "CSE6-MATH-A",
        classroomDisplayTitle: "Mathematics A",
        lectureId: "lecture_1",
        lectureTitle: "Integration Basics",
        lectureDate: "2026-03-14T10:00:00.000Z",
        teacherAssignmentId: "assignment_1",
        classId: "class_1",
        classCode: "CSE6",
        classTitle: "Computer Science 6",
        sectionId: "section_1",
        sectionCode: "A",
        sectionTitle: "Section A",
        subjectId: "subject_1",
        subjectCode: "MATH",
        subjectTitle: "Mathematics",
        mode: "QR_GPS",
        status: "ACTIVE",
        startedAt: "2026-03-14T10:00:00.000Z",
        scheduledEndAt: "2026-03-14T10:20:00.000Z",
        endedAt: null,
        editableUntil: null,
        presentCount: 8,
        absentCount: 22,
        editability: {
          isEditable: false,
          state: "PENDING_SESSION_END",
          endedAt: null,
          editableUntil: null,
        },
      },
    ]

    expect(getTeacherSessionHistoryPollInterval(sessions)).toBe(qrSessionLiveRefreshIntervalMs)
    expect(
      getTeacherSessionHistoryPollInterval([
        { ...sessions[0], status: "ENDED" },
      ] as AttendanceSessionHistoryItem[]),
    ).toBe(false)
  })

  it("builds live roster buckets for marked and waiting students", () => {
    const students: AttendanceSessionStudentSummary[] = [
      {
        attendanceRecordId: "record_1",
        enrollmentId: "enrollment_1",
        studentId: "student_1",
        studentDisplayName: "Student One",
        studentEmail: "student.one@attendease.dev",
        studentRollNumber: "23CS001",
        status: "ABSENT",
        markedAt: null,
      },
      {
        attendanceRecordId: "record_2",
        enrollmentId: "enrollment_2",
        studentId: "student_2",
        studentDisplayName: "Student Two",
        studentEmail: "student.two@attendease.dev",
        studentRollNumber: "23CS002",
        status: "PRESENT",
        markedAt: "2026-03-14T10:01:00.000Z",
      },
      {
        attendanceRecordId: "record_3",
        enrollmentId: "enrollment_3",
        studentId: "student_3",
        studentDisplayName: "Student Three",
        studentEmail: "student.three@attendease.dev",
        studentRollNumber: null,
        status: "PRESENT",
        markedAt: "2026-03-14T10:03:00.000Z",
      },
    ]

    expect(buildQrSessionRosterModel(students)).toMatchObject({
      presentSummaryLabel: "2 marked",
      absentSummaryLabel: "1 still absent",
      latestMarkedLabel: expect.stringContaining("Marked"),
      presentRows: [
        {
          attendanceRecordId: "record_3",
          studentDisplayName: "Student Three",
          secondaryLabel: "student.three@attendease.dev",
        },
        {
          attendanceRecordId: "record_2",
          studentDisplayName: "Student Two",
          secondaryLabel: "23CS002",
        },
      ],
      absentRows: [
        {
          attendanceRecordId: "record_1",
          studentDisplayName: "Student One",
          secondaryLabel: "23CS001",
          markedAtLabel: "Waiting to mark",
        },
      ],
    })
  })
})
