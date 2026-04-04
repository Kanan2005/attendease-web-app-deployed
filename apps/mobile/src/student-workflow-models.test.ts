import type {
  AuthenticatedUser,
  ClassroomSchedule,
  LectureSummary,
  StudentAttendanceHistoryItem,
  StudentClassroomMembershipSummary,
  StudentReportOverview,
  StudentSubjectReportDetail,
} from "@attendease/contracts"
import { describe, expect, it } from "vitest"

import type { StudentAttendanceGateModel } from "./device-trust.js"
import {
  buildStudentAttendanceCandidates,
  buildStudentAttendanceHistoryRows,
  buildStudentAttendanceHistorySummaryModel,
  buildStudentAttendanceInsightModel,
  buildStudentAttendanceOverviewModel,
  buildStudentClassroomDetailSummaryModel,
  buildStudentCourseDiscoveryCards,
  buildStudentDeviceStatusSummaryModel,
  buildStudentReportOverviewModel,
  buildStudentScheduleOverviewModel,
  buildStudentSubjectReportModel,
  buildStudentSubjectReportSummaryModel,
  createStudentProfileDraft,
  hasStudentProfileDraftChanges,
} from "./student-workflow-models.js"

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

function createAttendanceHistoryItem(
  overrides: Partial<StudentAttendanceHistoryItem> = {},
): StudentAttendanceHistoryItem {
  return {
    attendanceRecordId: "record_1",
    sessionId: "session_1",
    classroomId: "classroom_1",
    classroomCode: "CSE6-MATH-A",
    classroomDisplayTitle: "Mathematics",
    lectureId: "lecture_1",
    lectureTitle: "Linear Algebra",
    lectureDate: "2026-03-14T09:30:00.000Z",
    mode: "QR_GPS",
    sessionStatus: "ENDED",
    attendanceStatus: "PRESENT",
    markSource: "QR_GPS",
    markedAt: "2026-03-14T09:35:00.000Z",
    startedAt: "2026-03-14T09:30:00.000Z",
    endedAt: "2026-03-14T10:00:00.000Z",
    subjectId: "subject_1",
    subjectCode: "MATH101",
    subjectTitle: "Mathematics",
    ...overrides,
  }
}

describe("student workflow models", () => {
  it("builds a weekly schedule and exception overview from classroom schedule data", () => {
    const schedule: ClassroomSchedule = {
      classroomId: "classroom_1",
      scheduleSlots: [
        {
          id: "slot_2",
          courseOfferingId: "classroom_1",
          weekday: 3,
          startMinutes: 780,
          endMinutes: 840,
          locationLabel: "Lab 3",
          status: "ACTIVE",
        },
        {
          id: "slot_1",
          courseOfferingId: "classroom_1",
          weekday: 1,
          startMinutes: 540,
          endMinutes: 600,
          locationLabel: "Room 201",
          status: "ACTIVE",
        },
      ],
      scheduleExceptions: [
        {
          id: "exception_1",
          courseOfferingId: "classroom_1",
          scheduleSlotId: "slot_1",
          exceptionType: "CANCELLED",
          effectiveDate: "2026-03-20T00:00:00.000Z",
          startMinutes: null,
          endMinutes: null,
          locationLabel: null,
          reason: "Holiday",
        },
      ],
    }

    const overview = buildStudentScheduleOverviewModel({
      schedule,
      lectures: [
        createLecture({
          status: "OPEN_FOR_ATTENDANCE",
        }),
      ],
    })

    expect(overview.weeklyItems[0]?.weekdayLabel).toBe("Monday")
    expect(overview.exceptionItems[0]).toMatchObject({
      title: "Cancelled class",
      reason: "Holiday",
      tone: "danger",
    })
    expect(overview.upcomingLectures[0]?.status).toBe("OPEN_FOR_ATTENDANCE")
  })

  it("builds report overview metrics from subject cards", () => {
    const overview = buildStudentReportOverviewModel({
      studentId: "student_1",
      trackedClassroomCount: 2,
      totalSessions: 8,
      presentSessions: 3,
      absentSessions: 5,
      attendancePercentage: 37.5,
      lastSessionAt: "2026-03-14T09:30:00.000Z",
    } satisfies StudentReportOverview)

    expect(overview).toMatchObject({
      trackedClassroomCount: 2,
      totalSessions: 8,
      presentSessions: 3,
      absentSessions: 5,
      attendancePercentage: 37.5,
    })
  })

  it("builds attendance insight states from student report truth", () => {
    expect(
      buildStudentAttendanceInsightModel({
        attendancePercentage: 82.5,
        totalSessions: 8,
        presentSessions: 7,
        absentSessions: 1,
      }),
    ).toMatchObject({
      title: "Attendance is on track",
      tone: "success",
    })

    expect(
      buildStudentAttendanceInsightModel({
        attendancePercentage: 42.86,
        totalSessions: 7,
        presentSessions: 3,
        absentSessions: 4,
      }),
    ).toMatchObject({
      title: "Attendance is at risk",
      tone: "danger",
    })
  })

  it("builds a subject summary model from the student report API", () => {
    const summary = buildStudentSubjectReportSummaryModel({
      subjectId: "subject_1",
      subjectCode: "MATH101",
      subjectTitle: "Mathematics",
      classroomCount: 2,
      totalSessions: 8,
      presentSessions: 6,
      absentSessions: 2,
      attendancePercentage: 75,
      lastSessionAt: "2026-03-14T09:30:00.000Z",
    })

    expect(summary).toMatchObject({
      subjectId: "subject_1",
      subjectCode: "MATH101",
      subjectTitle: "Mathematics",
      classroomCount: 2,
      totalSessions: 8,
      attendancePercentage: 75,
    })
  })

  it("keeps zero-session backend report rows intact instead of re-deriving fallback coverage", () => {
    const summary = buildStudentSubjectReportSummaryModel({
      subjectId: "subject_2",
      subjectCode: "PHY101",
      subjectTitle: "Physics",
      classroomCount: 1,
      totalSessions: 0,
      presentSessions: 0,
      absentSessions: 0,
      attendancePercentage: 0,
      lastSessionAt: null,
    })

    expect(summary).toMatchObject({
      subjectId: "subject_2",
      totalSessions: 0,
      presentSessions: 0,
      absentSessions: 0,
      attendancePercentage: 0,
      lastSessionAt: null,
    })
  })

  it("builds a subject-wise report model from the student report detail API", () => {
    const subject = buildStudentSubjectReportModel({
      subjectId: "subject_1",
      subjectCode: "MATH101",
      subjectTitle: "Mathematics",
      classroomCount: 2,
      totalSessions: 10,
      presentSessions: 8,
      absentSessions: 2,
      attendancePercentage: 80,
      lastSessionAt: "2026-03-14T09:30:00.000Z",
      classrooms: [
        {
          classroomId: "classroom_1",
          classroomCode: "CSE6-MATH-A",
          classroomDisplayTitle: "Mathematics A",
          totalSessions: 6,
          presentSessions: 5,
          absentSessions: 1,
          attendancePercentage: 83.33,
          lastSessionAt: "2026-03-14T09:30:00.000Z",
        },
        {
          classroomId: "classroom_2",
          classroomCode: "CSE6-MATH-B",
          classroomDisplayTitle: "Mathematics B",
          totalSessions: 4,
          presentSessions: 3,
          absentSessions: 1,
          attendancePercentage: 75,
          lastSessionAt: "2026-03-13T09:30:00.000Z",
        },
      ],
    } satisfies StudentSubjectReportDetail)

    expect(subject).toMatchObject({
      subjectId: "subject_1",
      subjectCode: "MATH101",
      subjectTitle: "Mathematics",
      totalSessions: 10,
      attendancePercentage: 80,
    })
    expect(subject.classrooms[0]).toMatchObject({
      classroomId: "classroom_1",
      classroomCode: "CSE6-MATH-A",
      classroomTitle: "Mathematics A",
      totalSessions: 6,
      attendancePercentage: 83.33,
    })
  })

  it("builds a student-owned attendance history summary and rows", () => {
    const items = [
      createAttendanceHistoryItem(),
      createAttendanceHistoryItem({
        attendanceRecordId: "record_2",
        sessionId: "session_2",
        classroomId: "classroom_2",
        classroomCode: "CSE6-PHY-A",
        classroomDisplayTitle: "Physics",
        lectureId: "lecture_2",
        lectureTitle: "Mechanics",
        mode: "BLUETOOTH",
        attendanceStatus: "ABSENT",
        markSource: null,
        markedAt: null,
        startedAt: "2026-03-15T09:30:00.000Z",
        endedAt: "2026-03-15T10:00:00.000Z",
        subjectId: "subject_2",
        subjectCode: "PHY101",
        subjectTitle: "Physics",
      }),
    ]

    const summary = buildStudentAttendanceHistorySummaryModel(items)
    const rows = buildStudentAttendanceHistoryRows(items)

    expect(summary).toMatchObject({
      totalRecords: 2,
      presentCount: 1,
      absentCount: 1,
      attendancePercentage: 50,
    })
    expect(rows[0]).toMatchObject({
      title: "Physics",
      subtitle: "PHY101 · Bluetooth",
      statusLabel: "Absent",
      statusTone: "danger",
    })
    expect(rows[1]).toMatchObject({
      title: "Mathematics",
      statusLabel: "Present",
      statusTone: "success",
    })
  })

  it("summarizes student device status without exposing admin-only internals", () => {
    expect(
      buildStudentDeviceStatusSummaryModel({
        state: "TRUSTED",
        lifecycleState: "TRUSTED",
        reason: "DEVICE_BOUND",
        deviceId: "device_1",
        bindingId: "binding_1",
      }),
    ).toMatchObject({
      label: "Trusted phone",
      tone: "success",
    })

    expect(
      buildStudentDeviceStatusSummaryModel({
        state: "BLOCKED",
        lifecycleState: "PENDING_REPLACEMENT",
        reason: "DEVICE_REPLACEMENT_PENDING_APPROVAL",
        deviceId: "device_2",
        bindingId: "binding_2",
      }),
    ).toMatchObject({
      label: "Pending approval",
      tone: "warning",
    })
  })

  it("builds QR and Bluetooth attendance candidates from live attendance sessions", () => {
    const gateModel: StudentAttendanceGateModel = {
      title: "Trusted device ready",
      message: "Ready",
      tone: "success",
      supportHint: "Continue",
      canContinue: true,
    }

    const qrCandidates = buildStudentAttendanceCandidates({
      classrooms: [
        createClassroom({
          id: "classroom_1",
          subjectId: "subject_1",
          displayTitle: "Mathematics",
          defaultAttendanceMode: "BLUETOOTH",
        }),
        createClassroom({
          id: "classroom_2",
          subjectId: "subject_2",
          displayTitle: "Physics",
          defaultAttendanceMode: "QR_GPS",
        }),
      ],
      liveSessions: [
        {
          id: "session_qr",
          classroomId: "classroom_1",
          classroomCode: "MATH-101",
          classroomDisplayTitle: "Mathematics",
          lectureId: "lecture_qr",
          lectureTitle: "Integration Basics",
          lectureDate: "2026-03-15T09:00:00.000Z",
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
          startedAt: "2026-03-15T09:00:00.000Z",
          scheduledEndAt: "2026-03-15T09:20:00.000Z",
          presentCount: 1,
          absentCount: 3,
        },
        {
          id: "session_ble",
          classroomId: "classroom_2",
          classroomCode: "PHY-101",
          classroomDisplayTitle: "Physics",
          lectureId: null,
          lectureTitle: null,
          lectureDate: null,
          classId: "class_1",
          classCode: "CSE6",
          classTitle: "Computer Science 6",
          sectionId: "section_1",
          sectionCode: "A",
          sectionTitle: "Section A",
          subjectId: "subject_2",
          subjectCode: "PHY",
          subjectTitle: "Physics",
          mode: "BLUETOOTH",
          status: "ACTIVE",
          startedAt: "2026-03-15T09:05:00.000Z",
          scheduledEndAt: "2026-03-15T09:25:00.000Z",
          presentCount: 0,
          absentCount: 4,
        },
      ],
      mode: "QR_GPS",
    })
    const bluetoothCandidates = buildStudentAttendanceCandidates({
      classrooms: [
        createClassroom({
          id: "classroom_1",
          subjectId: "subject_1",
          displayTitle: "Mathematics",
          defaultAttendanceMode: "BLUETOOTH",
        }),
        createClassroom({
          id: "classroom_2",
          subjectId: "subject_2",
          displayTitle: "Physics",
          defaultAttendanceMode: "QR_GPS",
        }),
      ],
      liveSessions: [
        {
          id: "session_qr",
          classroomId: "classroom_1",
          classroomCode: "MATH-101",
          classroomDisplayTitle: "Mathematics",
          lectureId: "lecture_qr",
          lectureTitle: "Integration Basics",
          lectureDate: "2026-03-15T09:00:00.000Z",
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
          startedAt: "2026-03-15T09:00:00.000Z",
          scheduledEndAt: "2026-03-15T09:20:00.000Z",
          presentCount: 1,
          absentCount: 3,
        },
        {
          id: "session_ble",
          classroomId: "classroom_2",
          classroomCode: "PHY-101",
          classroomDisplayTitle: "Physics",
          lectureId: null,
          lectureTitle: null,
          lectureDate: null,
          classId: "class_1",
          classCode: "CSE6",
          classTitle: "Computer Science 6",
          sectionId: "section_1",
          sectionCode: "A",
          sectionTitle: "Section A",
          subjectId: "subject_2",
          subjectCode: "PHY",
          subjectTitle: "Physics",
          mode: "BLUETOOTH",
          status: "ACTIVE",
          startedAt: "2026-03-15T09:05:00.000Z",
          scheduledEndAt: "2026-03-15T09:25:00.000Z",
          presentCount: 0,
          absentCount: 4,
        },
      ],
      mode: "BLUETOOTH",
    })

    const overview = buildStudentAttendanceOverviewModel({
      qrCandidates,
      bluetoothCandidates,
      gateModel,
    })

    expect(qrCandidates[0]?.mode).toBe("QR_GPS")
    expect(qrCandidates[0]?.sessionId).toBe("session_qr")
    expect(bluetoothCandidates[0]?.mode).toBe("BLUETOOTH")
    expect(bluetoothCandidates[0]?.sessionId).toBe("session_ble")
    expect(bluetoothCandidates[0]?.lectureTitle).toBe("Live attendance session")
    expect(overview).toMatchObject({
      totalOpenSessions: 2,
      qrReadyCount: 1,
      bluetoothReadyCount: 1,
      recommendedMode: "QR_GPS",
      gateTone: "success",
    })
  })

  it("builds course-discovery cards with open attendance surfaced first", () => {
    const cards = buildStudentCourseDiscoveryCards({
      classrooms: [
        createClassroom({
          id: "classroom_1",
          displayTitle: "Mathematics",
          code: "CSE6-MATH-A",
          defaultAttendanceMode: "QR_GPS",
        }),
        createClassroom({
          id: "classroom_2",
          displayTitle: "Physics",
          code: "CSE6-PHY-A",
          defaultAttendanceMode: "BLUETOOTH",
        }),
      ],
      lectureSets: [
        {
          classroomId: "classroom_1",
          lectures: [
            createLecture({
              id: "lecture_1",
              status: "OPEN_FOR_ATTENDANCE",
              title: "Calculus",
            }),
          ],
        },
        {
          classroomId: "classroom_2",
          lectures: [
            createLecture({
              id: "lecture_2",
              courseOfferingId: "classroom_2",
              title: "Mechanics",
              plannedStartAt: "2026-03-16T08:00:00.000Z",
            }),
          ],
        },
      ],
      qrCandidates: [
        {
          sessionId: "session_1",
          classroomId: "classroom_1",
          subjectId: "subject_1",
          classroomTitle: "Mathematics",
          lectureId: "lecture_1",
          lectureTitle: "Calculus",
          mode: "QR_GPS",
          timestamp: "2026-03-14T09:30:00.000Z",
          requiresTrustedDevice: true,
          isMarked: false,
        },
      ],
      bluetoothCandidates: [],
    })

    expect(cards[0]).toMatchObject({
      classroomId: "classroom_1",
      attendanceTitle: "Attendance open now",
      attendanceTone: "success",
      hasOpenAttendance: true,
    })
    expect(cards[1]).toMatchObject({
      classroomId: "classroom_2",
      attendanceTitle: "No attendance session open",
      hasOpenAttendance: false,
    })
  })

  it("builds classroom detail summary with open-attendance context", () => {
    const summary = buildStudentClassroomDetailSummaryModel({
      classroom: {
        id: "classroom_1",
        code: "CSE6-MATH-A",
        displayTitle: "Mathematics",
        defaultAttendanceMode: "QR_GPS",
        enrollmentStatus: "ACTIVE",
      },
      lectures: [
        createLecture({
          id: "lecture_1",
          title: "Calculus",
          status: "OPEN_FOR_ATTENDANCE",
        }),
      ],
      schedule: {
        classroomId: "classroom_1",
        scheduleSlots: [
          {
            id: "slot_1",
            courseOfferingId: "classroom_1",
            weekday: 1,
            startMinutes: 540,
            endMinutes: 600,
            locationLabel: "Room 201",
            status: "ACTIVE",
          },
        ],
        scheduleExceptions: [],
      },
      announcementCount: 2,
      attendanceCandidates: [
        {
          sessionId: "session_1",
          classroomId: "classroom_1",
          subjectId: "subject_1",
          classroomTitle: "Mathematics",
          lectureId: "lecture_1",
          lectureTitle: "Calculus",
          mode: "QR_GPS",
          timestamp: "2026-03-14T09:30:00.000Z",
          requiresTrustedDevice: true,
          isMarked: false,
        },
      ],
      gateModel: {
        title: "Trusted device ready",
        message: "Ready",
        tone: "success",
        supportHint: "Continue",
        canContinue: true,
      },
    })

    expect(summary).toMatchObject({
      title: "Mathematics",
      attendanceTitle: "Attendance is open in this course",
      attendanceTone: "success",
      openAttendanceCount: 1,
      updatesLabel: "2 updates",
    })
  })

  it("tracks safe editable student profile fields without touching locked identity data", () => {
    const user: Pick<AuthenticatedUser, "displayName" | "email"> = {
      displayName: "Aarav Sharma",
      email: "student.one@attendease.dev",
    }

    const initialDraft = createStudentProfileDraft(user)

    expect(initialDraft).toMatchObject({
      displayName: "Aarav Sharma",
      preferredShortName: "Aarav",
    })
    expect(
      hasStudentProfileDraftChanges(initialDraft, {
        displayName: "Aarav Sharma",
        preferredShortName: "Aarav S",
        rollNumber: "",
        degree: "",
        branch: "",
      }),
    ).toBe(true)
  })
})
