import type {
  AttendanceSessionDetail,
  AttendanceSessionStudentSummary,
  ClassroomSummary,
  LectureSummary,
  TeacherDaywiseAttendanceReportRow,
  TeacherStudentAttendancePercentageReportRow,
  TeacherSubjectwiseAttendanceReportRow,
} from "@attendease/contracts"
import { describe, expect, it } from "vitest"

import {
  buildTeacherBluetoothActiveStatusModel,
  buildTeacherBluetoothCandidates,
  buildTeacherBluetoothControlModel,
  buildTeacherBluetoothEndSessionModel,
  buildTeacherBluetoothRecoveryModel,
  buildTeacherBluetoothSessionShellSnapshot,
  buildTeacherBluetoothSetupStatusModel,
  buildTeacherExportAvailabilityModel,
  buildTeacherExportRequestModel,
  buildTeacherJoinCodeActionModel,
  buildTeacherReportFilterOptions,
  buildTeacherReportOverviewModel,
  buildTeacherRosterImportDraftModel,
  buildTeacherSessionDetailOverviewModel,
  buildTeacherSessionDetailStatusModel,
  buildTeacherSessionRosterModel,
} from "./teacher-operational.js"

function createClassroom(overrides: Partial<ClassroomSummary> = {}): ClassroomSummary {
  return {
    id: "classroom_1",
    semesterId: "semester_1",
    classId: "class_1",
    sectionId: "section_1",
    subjectId: "subject_math",
    primaryTeacherId: "teacher_1",
    createdByUserId: "teacher_1",
    code: "MATH-101",
    displayTitle: "Mathematics",
    status: "ACTIVE",
    defaultAttendanceMode: "BLUETOOTH",
    defaultGpsRadiusMeters: 60,
    defaultSessionDurationMinutes: 50,
    qrRotationWindowSeconds: 20,
    bluetoothRotationWindowSeconds: 10,
    timezone: "Asia/Kolkata",
    requiresTrustedDevice: true,
    archivedAt: null,
    activeJoinCode: null,
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
    status: "OPEN_FOR_ATTENDANCE",
    ...overrides,
  }
}

function createAttendanceStudent(
  overrides: Partial<AttendanceSessionStudentSummary> = {},
): AttendanceSessionStudentSummary {
  return {
    attendanceRecordId: "attendance_record_1",
    enrollmentId: "enrollment_1",
    studentId: "student_1",
    studentDisplayName: "Aarav Patel",
    studentEmail: "aarav@attendease.dev",
    studentRollNumber: "CSE2301",
    status: "ABSENT",
    markedAt: null,
    ...overrides,
  }
}

function createAttendanceSessionDetail(
  overrides: Partial<AttendanceSessionDetail> = {},
): AttendanceSessionDetail {
  return {
    id: "session_1",
    classroomId: "classroom_1",
    classroomCode: "MATH-101",
    classroomDisplayTitle: "Mathematics",
    lectureId: "lecture_1",
    lectureTitle: "Lecture 1",
    lectureDate: "2026-03-15T09:30:00.000Z",
    teacherAssignmentId: "assignment_1",
    mode: "BLUETOOTH",
    status: "ENDED",
    startedAt: "2026-03-15T09:30:00.000Z",
    scheduledEndAt: "2026-03-15T10:20:00.000Z",
    endedAt: "2026-03-15T10:21:00.000Z",
    editableUntil: "2026-03-15T11:21:00.000Z",
    classCode: "CSE6",
    classTitle: "CSE 6",
    sectionCode: "A",
    sectionTitle: "Section A",
    subjectCode: "MATH101",
    subjectTitle: "Mathematics",
    semesterCode: "SEM-1",
    semesterTitle: "Semester 1",
    teacherId: "teacher_1",
    teacherDisplayName: "Teacher One",
    teacherEmail: "teacher.one@attendease.dev",
    durationSeconds: 3_000,
    anchorType: null,
    anchorLatitude: null,
    anchorLongitude: null,
    anchorLabel: null,
    gpsRadiusMeters: null,
    qrRotationWindowSeconds: null,
    bluetoothRotationWindowSeconds: 10,
    blePublicId: "ble_public_1",
    bleProtocolVersion: 1,
    rosterSnapshotCount: 30,
    currentQrPayload: null,
    currentQrExpiresAt: null,
    presentCount: 22,
    absentCount: 8,
    suspiciousAttemptCount: 2,
    blockedUntrustedDeviceCount: 0,
    locationValidationFailureCount: 0,
    bluetoothValidationFailureCount: 0,
    revokedDeviceAttemptCount: 0,
    editability: {
      isEditable: true,
      state: "OPEN",
      endedAt: "2026-03-15T10:21:00.000Z",
      editableUntil: "2026-03-15T11:21:00.000Z",
    },
    ...overrides,
  }
}

describe("teacher operational helpers", () => {
  it("builds bluetooth launch candidates from live classrooms and lectures", () => {
    const candidates = buildTeacherBluetoothCandidates({
      classrooms: [createClassroom()],
      lectureSets: [
        {
          classroomId: "classroom_1",
          lectures: [createLecture()],
        },
      ],
    })

    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toMatchObject({
      classroomId: "classroom_1",
      lectureId: "lecture_1",
      durationMinutes: 50,
    })
  })

  it("falls back to a shell-only bluetooth candidate when no lecture is linked yet", () => {
    const candidates = buildTeacherBluetoothCandidates({
      classrooms: [createClassroom()],
      lectureSets: [],
    })

    expect(candidates[0]).toMatchObject({
      lectureId: null,
      status: "SHELL_ONLY",
    })
  })

  it("builds roster import rows and tracks invalid lines", () => {
    const draft = buildTeacherRosterImportDraftModel(`
teacher.one@attendease.dev, Teacher One
ROLL-42, Teacher Two
bad line, still bad, because, too, many
    `)

    expect(draft.rows).toHaveLength(2)
    expect(draft.invalidLines).toHaveLength(1)
    expect(draft.rows[0]).toMatchObject({
      studentEmail: "teacher.one@attendease.dev",
      parsedName: "Teacher One",
    })
    expect(draft.rows[1]).toMatchObject({
      studentRollNumber: "ROLL-42",
      parsedName: "Teacher Two",
    })
  })

  it("builds report filter options and overview data from final report API rows", () => {
    const subjectRows: TeacherSubjectwiseAttendanceReportRow[] = [
      {
        classroomId: "classroom_1",
        classroomCode: "MATH-101",
        classroomDisplayTitle: "Mathematics",
        classId: "class_1",
        classCode: "CSE6",
        classTitle: "CSE 6",
        sectionId: "section_1",
        sectionCode: "A",
        sectionTitle: "Section A",
        subjectId: "subject_math",
        subjectCode: "MATH101",
        subjectTitle: "Mathematics",
        totalSessions: 8,
        totalStudents: 30,
        presentCount: 22,
        absentCount: 8,
        attendancePercentage: 73.33,
        lastSessionAt: "2026-03-14T09:30:00.000Z",
      },
      {
        classroomId: "classroom_2",
        classroomCode: "PHY-101",
        classroomDisplayTitle: "Physics",
        classId: "class_1",
        classCode: "CSE6",
        classTitle: "CSE 6",
        sectionId: "section_1",
        sectionCode: "A",
        sectionTitle: "Section A",
        subjectId: "subject_phy",
        subjectCode: "PHY101",
        subjectTitle: "Physics",
        totalSessions: 6,
        totalStudents: 28,
        presentCount: 21,
        absentCount: 7,
        attendancePercentage: 75,
        lastSessionAt: "2026-03-15T09:30:00.000Z",
      },
    ]
    const studentRows: TeacherStudentAttendancePercentageReportRow[] = [
      {
        classroomId: "classroom_1",
        classroomCode: "MATH-101",
        classroomDisplayTitle: "Mathematics",
        classId: "class_1",
        classCode: "CSE6",
        classTitle: "CSE 6",
        sectionId: "section_1",
        sectionCode: "A",
        sectionTitle: "Section A",
        subjectId: "subject_math",
        subjectCode: "MATH101",
        subjectTitle: "Mathematics",
        studentId: "student_1",
        studentEmail: "student.one@attendease.dev",
        studentDisplayName: "Student One",
        studentRollNumber: "R1",
        enrollmentStatus: "ACTIVE",
        totalSessions: 8,
        presentSessions: 6,
        absentSessions: 2,
        attendancePercentage: 75,
        lastSessionAt: "2026-03-14T09:30:00.000Z",
      },
      {
        classroomId: "classroom_2",
        classroomCode: "PHY-101",
        classroomDisplayTitle: "Physics",
        classId: "class_1",
        classCode: "CSE6",
        classTitle: "CSE 6",
        sectionId: "section_1",
        sectionCode: "A",
        sectionTitle: "Section A",
        subjectId: "subject_phy",
        subjectCode: "PHY101",
        subjectTitle: "Physics",
        studentId: "student_2",
        studentEmail: "student.two@attendease.dev",
        studentDisplayName: "Student Two",
        studentRollNumber: "R2",
        enrollmentStatus: "ACTIVE",
        totalSessions: 6,
        presentSessions: 3,
        absentSessions: 3,
        attendancePercentage: 50,
        lastSessionAt: "2026-03-15T09:30:00.000Z",
      },
    ]
    const daywiseRows: TeacherDaywiseAttendanceReportRow[] = [
      {
        attendanceDate: "2026-03-14T00:00:00.000Z",
        classroomId: "classroom_1",
        classroomCode: "MATH-101",
        classroomDisplayTitle: "Mathematics",
        classId: "class_1",
        classCode: "CSE6",
        classTitle: "CSE 6",
        sectionId: "section_1",
        sectionCode: "A",
        sectionTitle: "Section A",
        subjectId: "subject_math",
        subjectCode: "MATH101",
        subjectTitle: "Mathematics",
        sessionCount: 1,
        totalStudents: 30,
        presentCount: 22,
        absentCount: 8,
        attendancePercentage: 73.33,
        lastSessionAt: "2026-03-14T09:30:00.000Z",
      },
    ]

    const filterOptions = buildTeacherReportFilterOptions({
      classrooms: [
        createClassroom(),
        createClassroom({
          id: "classroom_2",
          code: "PHY-101",
          subjectId: "subject_phy",
          displayTitle: "Physics",
        }),
      ],
      subjectRows,
    })

    const report = buildTeacherReportOverviewModel({
      daywiseRows,
      subjectRows,
      studentRows,
      filterLabels: {
        classroom: "All Classrooms",
        subject: "All Subjects",
      },
    })

    expect(filterOptions.classroomOptions).toHaveLength(2)
    expect(filterOptions.subjectOptions).toHaveLength(2)
    expect(report.summaryCards[0]).toMatchObject({
      label: "Classrooms",
      value: "2",
    })
    expect(report.summaryCards[3]).toMatchObject({
      label: "Attendance",
      value: "64.29%",
    })
    expect(report.subjectRows).toHaveLength(2)
    expect(report.studentRows).toHaveLength(2)
    expect(report.daywiseRows).toHaveLength(1)
    expect(report.availabilityMessage).toContain("final")
    expect(report.subjectSummary).toContain("2 subject")
    expect(report.studentSummary).toContain("1 student")
    expect(report.daywiseSummary).toContain("Most recent teaching day")
    expect(report.subjectRows[0]).toMatchObject({
      attendanceLabel: "73.33% attendance",
      sessionSummary: "8 sessions · 22 present · 8 absent",
      tone: "warning",
    })
    expect(report.studentRows[1]).toMatchObject({
      followUpLabel: "Needs follow-up",
      sessionSummary: "3/6 present · Active",
      tone: "warning",
    })
    expect(report.daywiseRows[0]).toMatchObject({
      lastActivityLabel: expect.stringContaining("Last class session 14 Mar 2026"),
    })
  })

  it("keeps teacher report overview empty states explicit when the filtered API response has no rows", () => {
    const report = buildTeacherReportOverviewModel({
      daywiseRows: [],
      subjectRows: [],
      studentRows: [],
      filterLabels: {
        classroom: "Mathematics",
        subject: "Physics",
      },
    })

    expect(report.hasAnyData).toBe(false)
    expect(report.filterSummary).toBe("Classroom: Mathematics · Subject: Physics")
    expect(report.summaryCards).toMatchObject([
      {
        label: "Classrooms",
        value: "0",
        tone: "warning",
      },
      {
        label: "Subjects",
        value: "0",
        tone: "warning",
      },
      {
        label: "Students",
        value: "0",
        tone: "warning",
      },
      {
        label: "Attendance",
        value: "0%",
        tone: "danger",
      },
    ])
  })

  it("builds export availability and bluetooth shell states around the live export backend", () => {
    expect(buildTeacherExportAvailabilityModel()).toMatchObject({
      canRequestExport: true,
      supportedFormats: ["SESSION_PDF", "SESSION_CSV", "STUDENT_PERCENT_CSV", "COMPREHENSIVE_CSV"],
    })

    const fallbackCandidate = buildTeacherBluetoothCandidates({
      classrooms: [createClassroom()],
      lectureSets: [],
    })[0]

    if (!fallbackCandidate) {
      throw new Error("Expected a fallback teacher Bluetooth candidate for the shell test.")
    }

    expect(
      buildTeacherBluetoothSessionShellSnapshot({
        candidate: null,
        advertiserState: "IDLE",
      }),
    ).toMatchObject({
      canOpenActiveShell: false,
      stateTone: "warning",
    })

    expect(
      buildTeacherBluetoothSessionShellSnapshot({
        candidate: fallbackCandidate,
        advertiserState: "ADVERTISING",
      }),
    ).toMatchObject({
      canOpenActiveShell: true,
      stateTone: "success",
    })
  })

  it("keeps Bluetooth session shell states ready for the later native BLE phase", () => {
    const fallbackCandidate = buildTeacherBluetoothCandidates({
      classrooms: [createClassroom()],
      lectureSets: [],
    })[0]

    if (!fallbackCandidate) {
      throw new Error("Expected a fallback teacher Bluetooth candidate for the shell-state test.")
    }

    expect(
      buildTeacherBluetoothSessionShellSnapshot({
        candidate: fallbackCandidate,
        advertiserState: "PERMISSION_REQUIRED",
      }),
    ).toMatchObject({
      stateTone: "warning",
      canOpenActiveShell: true,
    })

    expect(buildTeacherBluetoothControlModel("READY")).toMatchObject({
      startLabel: "Start Broadcast",
      canStart: true,
      canStop: false,
    })
    expect(buildTeacherBluetoothControlModel("ADVERTISING")).toMatchObject({
      startLabel: "Bluetooth Live",
      stopLabel: "Pause Broadcast",
      canStart: false,
      canStop: true,
    })
    expect(buildTeacherBluetoothControlModel("FAILED")).toMatchObject({
      startLabel: "Retry Bluetooth",
      canStart: true,
    })
  })

  it("builds teacher Bluetooth setup guidance for empty, classroom-only, and live-lecture states", () => {
    expect(
      buildTeacherBluetoothSetupStatusModel({
        candidate: null,
        durationMinutes: 50,
        isCreating: false,
      }),
    ).toMatchObject({
      title: "Choose a classroom to begin",
      stateTone: "warning",
      startLabel: "Choose A Classroom First",
    })

    const shellCandidate = buildTeacherBluetoothCandidates({
      classrooms: [createClassroom()],
      lectureSets: [],
    })[0]

    if (!shellCandidate) {
      throw new Error("Expected a fallback Bluetooth candidate for setup guidance.")
    }

    expect(
      buildTeacherBluetoothSetupStatusModel({
        candidate: shellCandidate,
        durationMinutes: 45,
        isCreating: false,
      }),
    ).toMatchObject({
      title: "Ready to start from classroom context",
      stateTone: "primary",
      startLabel: "Start Bluetooth Attendance",
    })

    const liveCandidate = buildTeacherBluetoothCandidates({
      classrooms: [createClassroom()],
      lectureSets: [
        {
          classroomId: "classroom_1",
          lectures: [createLecture()],
        },
      ],
    })[0]

    if (!liveCandidate) {
      throw new Error("Expected a live Bluetooth candidate for setup guidance.")
    }

    expect(
      buildTeacherBluetoothSetupStatusModel({
        candidate: liveCandidate,
        durationMinutes: 60,
        isCreating: true,
      }),
    ).toMatchObject({
      title: "Starting Bluetooth attendance",
      stateTone: "primary",
      startLabel: "Starting Bluetooth Attendance...",
    })
  })

  it("builds Bluetooth recovery guidance for failed, stopped, and disabled advertiser states", () => {
    expect(
      buildTeacherBluetoothRecoveryModel({
        advertiserState: "FAILED",
        errorMessage: "The advertiser could not start.",
        availability: {
          supported: true,
          poweredOn: true,
          canAdvertise: true,
        },
      }),
    ).toMatchObject({
      shouldShow: true,
      shouldRetryBroadcast: true,
      shouldRefreshBluetooth: true,
      stateTone: "danger",
    })

    expect(
      buildTeacherBluetoothRecoveryModel({
        advertiserState: "PERMISSION_REQUIRED",
        availability: {
          supported: true,
          poweredOn: false,
          canAdvertise: true,
        },
      }),
    ).toMatchObject({
      shouldShow: true,
      shouldRetryBroadcast: true,
      shouldRefreshBluetooth: true,
      stateTone: "warning",
    })

    expect(
      buildTeacherBluetoothRecoveryModel({
        advertiserState: "STOPPED",
      }),
    ).toMatchObject({
      shouldShow: true,
      shouldOfferEndSession: true,
      shouldRetryBroadcast: true,
    })
  })

  it("keeps end-session retry copy explicit when the backend close request fails", () => {
    expect(
      buildTeacherBluetoothEndSessionModel({
        requestState: "IDLE",
      }),
    ).toMatchObject({
      buttonLabel: "End Bluetooth Attendance",
      buttonDisabled: false,
    })

    expect(
      buildTeacherBluetoothEndSessionModel({
        requestState: "ENDING",
      }),
    ).toMatchObject({
      buttonLabel: "Ending Bluetooth...",
      buttonDisabled: true,
    })

    expect(
      buildTeacherBluetoothEndSessionModel({
        requestState: "FAILED",
      }),
    ).toMatchObject({
      buttonLabel: "Retry Ending Session",
      buttonDisabled: false,
    })
  })

  it("builds active-session teacher guidance for live, recovery, and ended Bluetooth states", () => {
    expect(
      buildTeacherBluetoothActiveStatusModel({
        advertiserState: "ADVERTISING",
        sessionStatus: "ACTIVE",
        presentCount: 3,
      }),
    ).toMatchObject({
      title: "Bluetooth is live",
      stateTone: "success",
    })

    expect(
      buildTeacherBluetoothActiveStatusModel({
        advertiserState: "FAILED",
        sessionStatus: "ACTIVE",
        presentCount: 0,
      }),
    ).toMatchObject({
      title: "Bluetooth needs attention",
      stateTone: "danger",
    })

    expect(
      buildTeacherBluetoothActiveStatusModel({
        advertiserState: "STOPPED",
        sessionStatus: "ENDED",
        presentCount: 12,
      }),
    ).toMatchObject({
      title: "Bluetooth attendance is closed",
      stateTone: "warning",
    })
  })

  it("groups session students into present and absent lists with quick correction labels", () => {
    const roster = buildTeacherSessionRosterModel({
      students: [
        createAttendanceStudent({
          attendanceRecordId: "attendance_record_alice",
          studentDisplayName: "Alice",
          status: "ABSENT",
        }),
        createAttendanceStudent({
          attendanceRecordId: "attendance_record_bob",
          studentDisplayName: "Bob",
          status: "PRESENT",
          markedAt: "2026-03-15T10:05:00.000Z",
        }),
        createAttendanceStudent({
          attendanceRecordId: "attendance_record_carla",
          studentDisplayName: "Carla",
          status: "ABSENT",
        }),
      ],
      draft: {
        attendance_record_alice: "PRESENT",
        attendance_record_bob: "ABSENT",
      },
      isEditable: true,
    })

    expect(roster.presentRows.map((row) => row.studentDisplayName)).toEqual(["Alice"])
    expect(roster.absentRows.map((row) => row.studentDisplayName)).toEqual(["Bob", "Carla"])
    expect(roster.presentRows[0]).toMatchObject({
      pendingChangeLabel: "Will save as present",
      actionLabel: "Mark absent",
      actionTargetStatus: "ABSENT",
      statusTone: "success",
    })
    expect(roster.absentRows[0]).toMatchObject({
      studentDisplayName: "Bob",
      pendingChangeLabel: "Will save as absent",
      actionLabel: "Mark present",
      actionTargetStatus: "PRESENT",
      statusTone: "warning",
    })
    expect(roster.presentSummary).toBe("1 student currently marked present.")
    expect(roster.absentSummary).toBe("2 students currently marked absent.")
  })

  it("builds session-detail status guidance for live, open, and locked correction states", () => {
    expect(
      buildTeacherSessionDetailStatusModel({
        sessionStatus: "ACTIVE",
        editability: {
          isEditable: false,
          state: "PENDING_SESSION_END",
          endedAt: null,
          editableUntil: null,
        },
        pendingChangeCount: 0,
      }),
    ).toMatchObject({
      title: "Attendance is still live",
      stateTone: "warning",
    })

    expect(
      buildTeacherSessionDetailStatusModel({
        sessionStatus: "ENDED",
        editability: {
          isEditable: true,
          state: "OPEN",
          endedAt: "2026-03-15T10:10:00.000Z",
          editableUntil: "2026-03-16T10:10:00.000Z",
        },
        pendingChangeCount: 2,
      }),
    ).toMatchObject({
      title: "2 corrections ready to save",
      stateTone: "warning",
    })

    expect(
      buildTeacherSessionDetailStatusModel({
        sessionStatus: "ENDED",
        editability: {
          isEditable: false,
          state: "LOCKED",
          endedAt: "2026-03-15T10:10:00.000Z",
          editableUntil: "2026-03-16T10:10:00.000Z",
        },
        pendingChangeCount: 0,
      }),
    ).toMatchObject({
      title: "Session is read-only",
      stateTone: "warning",
    })
  })

  it("builds a teacher session-detail overview for review and correction work", () => {
    const overview = buildTeacherSessionDetailOverviewModel({
      session: createAttendanceSessionDetail(),
      pendingChangeCount: 2,
    })

    expect(overview.summaryCards).toMatchObject([
      {
        label: "Present",
        value: "22",
        tone: "success",
      },
      {
        label: "Absent",
        value: "8",
        tone: "warning",
      },
      {
        label: "Attendance",
        value: "73.33%",
        tone: "warning",
      },
      {
        label: "Corrections",
        value: "2 waiting",
        tone: "warning",
      },
    ])
    expect(overview.rosterSummary).toBe("22 of 30 students are currently marked present.")
    expect(overview.correctionSummary).toContain("2 corrections")
    expect(overview.presentSectionSubtitle).toContain("saved result")
    expect(overview.absentSectionSubtitle).toContain("still counted absent")
  })

  it("builds classroom join-code and export request states for the teacher workflow shell", () => {
    const exportAvailability = buildTeacherExportAvailabilityModel()

    expect(
      buildTeacherExportRequestModel({
        availability: exportAvailability,
        selectedFormat: "Session CSV",
      }),
    ).toMatchObject({
      buttonLabel: "Request Session CSV",
      buttonDisabled: false,
    })

    expect(
      buildTeacherExportRequestModel({
        availability: exportAvailability,
        selectedFormat: "Session PDF",
        requestState: "SUBMITTING",
      }),
    ).toMatchObject({
      buttonLabel: "Requesting Session PDF...",
      buttonDisabled: true,
    })

    expect(
      buildTeacherJoinCodeActionModel({
        joinCode: {
          code: "JOIN42",
          expiresAt: "2026-03-20T09:00:00.000Z",
        },
        isPending: false,
      }),
    ).toMatchObject({
      currentCodeLabel: "JOIN42",
      resetButtonLabel: "Reset Join Code",
    })

    expect(
      buildTeacherJoinCodeActionModel({
        joinCode: null,
        isPending: true,
      }),
    ).toMatchObject({
      currentCodeLabel: "No active code",
      resetButtonLabel: "Resetting...",
    })
  })
})
