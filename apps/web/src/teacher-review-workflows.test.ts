import { AuthApiClientError } from "@attendease/auth"
import type {
  AttendanceSessionDetail,
  AttendanceSessionHistoryItem,
  AttendanceSessionStudentSummary,
  ClassroomSummary,
  TeacherDaywiseAttendanceReportRow,
  TeacherStudentAttendancePercentageReportRow,
  TeacherSubjectwiseAttendanceReportRow,
} from "@attendease/contracts"
import { describe, expect, it } from "vitest"

import {
  buildTeacherWebAcademicFilterOptions,
  buildTeacherWebFilterSummary,
  buildTeacherWebHistoryQueryFilters,
  buildTeacherWebReportOverviewModel,
  buildTeacherWebReportQueryFilters,
  buildTeacherWebSessionDetailOverviewModel,
  buildTeacherWebSessionDetailStatusModel,
  buildTeacherWebSessionHistorySummaryModel,
  buildTeacherWebSessionRosterModel,
  createTeacherWebHistoryFilterDraft,
  createTeacherWebReportFilterDraft,
  mapTeacherWebReviewErrorToMessage,
} from "./teacher-review-workflows.js"

describe("teacher review workflow helpers", () => {
  it("builds academic filter options and ISO-backed history/report query filters", () => {
    const classrooms: ClassroomSummary[] = [
      createClassroom(),
      createClassroom({
        id: "classroom_2",
        code: "PHY-101",
        displayTitle: "Physics",
        subjectId: "subject_phy",
        subjectCode: "PHY101",
        subjectTitle: "Physics",
      }),
    ]

    const options = buildTeacherWebAcademicFilterOptions(classrooms)
    const historyFilters = buildTeacherWebHistoryQueryFilters({
      ...createTeacherWebHistoryFilterDraft(),
      classroomId: "classroom_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_math",
      mode: "QR_GPS",
      status: "ENDED",
      fromDate: "2026-03-01",
      toDate: "2026-03-15",
    })
    const reportFilters = buildTeacherWebReportQueryFilters({
      ...createTeacherWebReportFilterDraft(),
      classroomId: "classroom_2",
      subjectId: "subject_phy",
      fromDate: "2026-03-10",
    })

    expect(options.classroomOptions.map((option) => option.label)).toEqual([
      "Mathematics (MATH-101)",
      "Physics (PHY-101)",
    ])
    expect(options.classOptions[0]).toMatchObject({
      value: "class_1",
      label: "CSE 6 (CSE6)",
    })
    expect(options.sectionOptions[0]).toMatchObject({
      value: "section_1",
      label: "Section A (A)",
    })
    expect(options.subjectOptions.map((option) => option.label)).toEqual([
      "Mathematics (MATH101)",
      "Physics (PHY101)",
    ])
    expect(historyFilters).toEqual({
      classroomId: "classroom_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_math",
      mode: "QR_GPS",
      status: "ENDED",
      from: "2026-03-01T00:00:00.000Z",
      to: "2026-03-15T23:59:59.999Z",
    })
    expect(reportFilters).toEqual({
      classroomId: "classroom_2",
      subjectId: "subject_phy",
      from: "2026-03-10T00:00:00.000Z",
    })
    expect(
      buildTeacherWebFilterSummary({
        classroom: "Mathematics",
        subject: "Physics",
        fromDate: "2026-03-01",
        toDate: "2026-03-15",
      }),
    ).toBe(
      "Classroom: Mathematics · All classes · All sections · Subject: Physics · Date range: 2026-03-01 to 2026-03-15",
    )
  })

  it("builds session history summaries and grouped present/absent manual-edit models", () => {
    const sessions: AttendanceSessionHistoryItem[] = [
      {
        id: "session_1",
        classroomId: "classroom_1",
        classroomCode: "MATH-101",
        classroomDisplayTitle: "Mathematics",
        lectureId: "lecture_1",
        lectureTitle: "Attendance Session 1",
        lectureDate: "2026-03-14T09:00:00.000Z",
        teacherAssignmentId: "assignment_1",
        mode: "QR_GPS",
        status: "ENDED",
        startedAt: "2026-03-14T09:00:00.000Z",
        scheduledEndAt: "2026-03-14T09:45:00.000Z",
        endedAt: "2026-03-14T09:40:00.000Z",
        editableUntil: "2026-03-15T09:40:00.000Z",
        classId: "class_1",
        classCode: "CSE6",
        classTitle: "CSE 6",
        sectionId: "section_1",
        sectionCode: "A",
        sectionTitle: "Section A",
        subjectId: "subject_math",
        subjectCode: "MATH101",
        subjectTitle: "Mathematics",
        presentCount: 2,
        absentCount: 1,
        editability: {
          isEditable: true,
          state: "OPEN",
          endedAt: "2026-03-14T09:40:00.000Z",
          editableUntil: "2026-03-15T09:40:00.000Z",
        },
      },
      {
        id: "session_2",
        classroomId: "classroom_2",
        classroomCode: "PHY-101",
        classroomDisplayTitle: "Physics",
        lectureId: null,
        lectureTitle: null,
        lectureDate: null,
        teacherAssignmentId: "assignment_2",
        mode: "BLUETOOTH",
        status: "ACTIVE",
        startedAt: "2026-03-15T10:00:00.000Z",
        scheduledEndAt: "2026-03-15T10:30:00.000Z",
        endedAt: null,
        editableUntil: null,
        classId: "class_1",
        classCode: "CSE6",
        classTitle: "CSE 6",
        sectionId: "section_1",
        sectionCode: "A",
        sectionTitle: "Section A",
        subjectId: "subject_phy",
        subjectCode: "PHY101",
        subjectTitle: "Physics",
        presentCount: 1,
        absentCount: 2,
        editability: {
          isEditable: false,
          state: "PENDING_SESSION_END",
          endedAt: null,
          editableUntil: null,
        },
      },
    ]
    const students: AttendanceSessionStudentSummary[] = [
      createStudentRow({
        attendanceRecordId: "record_1",
        studentDisplayName: "Student One",
        status: "PRESENT",
        markedAt: "2026-03-14T09:10:00.000Z",
      }),
      createStudentRow({
        attendanceRecordId: "record_2",
        studentDisplayName: "Student Two",
        status: "ABSENT",
        markedAt: null,
      }),
      createStudentRow({
        attendanceRecordId: "record_3",
        studentDisplayName: "Student Three",
        status: "PRESENT",
        markedAt: "2026-03-14T09:05:00.000Z",
      }),
    ]
    const roster = buildTeacherWebSessionRosterModel({
      students,
      draft: {
        record_2: "PRESENT",
        record_3: "ABSENT",
      },
      isEditable: true,
    })
    const detail = createSessionDetail()
    const detailOverview = buildTeacherWebSessionDetailOverviewModel({
      session: detail,
      roster,
      pendingChangeCount: 2,
    })
    const detailStatus = buildTeacherWebSessionDetailStatusModel({
      session: detail,
      pendingChangeCount: 2,
    })
    const historySummary = buildTeacherWebSessionHistorySummaryModel({
      sessions,
      filterSummary:
        "All classrooms · All classes · All sections · All subjects · Any teaching date",
    })

    expect(historySummary.summaryCards).toMatchObject([
      { label: "Sessions in view", value: "2", tone: "primary" },
      { label: "Corrections open", value: "1", tone: "success" },
      { label: "Need review", value: "2", tone: "warning" },
      { label: "Attendance", value: "50%", tone: "warning" },
    ])
    expect(historySummary.availabilityMessage).toContain("live session")
    expect(roster.presentRows.map((row) => row.studentDisplayName)).toEqual([
      "Student One",
      "Student Two",
    ])
    expect(roster.absentRows.map((row) => row.studentDisplayName)).toEqual(["Student Three"])
    expect(roster.presentRows[1]).toMatchObject({
      pendingChangeLabel: "Will save as present",
      actionLabel: "Mark absent",
    })
    expect(roster.absentRows[0]).toMatchObject({
      pendingChangeLabel: "Will save as absent",
      actionLabel: "Mark present",
    })
    expect(detailOverview.summaryCards).toMatchObject([
      { label: "Present", value: "2" },
      { label: "Absent", value: "1" },
      { label: "Attendance", value: "66.67%" },
      { label: "Corrections", value: "2 waiting", tone: "warning" },
    ])
    expect(detailOverview.correctionSummary).toContain("refresh saved totals")
    expect(detailOverview.securitySummary).toContain("4 suspicious attempts")
    expect(detailStatus).toMatchObject({
      title: "2 corrections ready to save",
      tone: "warning",
    })
  })

  it("builds teacher web report review models from final report rows", () => {
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

    const report = buildTeacherWebReportOverviewModel({
      daywiseRows,
      subjectRows,
      studentRows,
      filterSummary:
        "All classrooms · All classes · All sections · All subjects · Date range: 2026-03-01 to 2026-03-15",
    })

    expect(report.summaryCards).toMatchObject([
      { label: "Classrooms", value: "2" },
      { label: "Subjects", value: "2" },
      { label: "Students", value: "2" },
      { label: "Attendance", value: "64.29%", tone: "warning" },
    ])
    expect(report.subjectRows[0]).toMatchObject({
      title: "Mathematics",
      courseContextLabel: "CSE 6 · Section A · Mathematics",
      attendanceLabel: "73.33% attendance",
      tone: "warning",
    })
    expect(report.studentRows[0]).toMatchObject({
      title: "Student Two",
      followUpLabel: "Needs follow-up",
      sessionSummary: "3/6 present · Active",
    })
    expect(report.daywiseRows[0]).toMatchObject({
      title: "Mathematics · Mathematics",
      attendanceLabel: "73.33% attendance",
    })
    expect(report.subjectSummary).toContain("2 course rollup")
    expect(report.studentSummary).toContain("1 student")
    expect(report.daywiseSummary).toContain("Most recent teaching day")
    expect(report.availabilityMessage).toContain("final attendance truth")
    expect(report.hasAnyData).toBe(true)
  })

  it("maps teacher web review errors into concise teacher-facing copy", () => {
    expect(
      mapTeacherWebReviewErrorToMessage(
        new AuthApiClientError("Auth API request failed.", 401, {
          message: "Token expired",
        }),
      ),
    ).toBe("Your teacher session expired. Sign in again to continue reviewing attendance.")

    expect(
      mapTeacherWebReviewErrorToMessage(
        new AuthApiClientError("Auth API request failed.", 409, {
          message: "This attendance session is locked for manual edits.",
        }),
      ),
    ).toBe("This attendance session is locked for manual edits.")
  })
})

function createClassroom(overrides: Partial<ClassroomSummary> = {}): ClassroomSummary {
  return {
    id: "classroom_1",
    code: "MATH-101",
    courseCode: "MATH-101",
    displayTitle: "Mathematics",
    classroomTitle: "Mathematics",
    status: "ACTIVE",
    semesterId: "semester_1",
    classId: "class_1",
    sectionId: "section_1",
    subjectId: "subject_math",
    primaryTeacherId: "teacher_1",
    createdByUserId: "teacher_1",
    requiresTrustedDevice: true,
    defaultAttendanceMode: "QR_GPS",
    defaultGpsRadiusMeters: 40,
    defaultSessionDurationMinutes: 45,
    bluetoothRotationWindowSeconds: 15,
    qrRotationWindowSeconds: 2,
    timezone: "Asia/Kolkata",
    archivedAt: null,
    activeJoinCode: {
      id: "join_code_1",
      courseOfferingId: "classroom_1",
      classroomId: "classroom_1",
      code: "JOIN123",
      status: "ACTIVE",
      expiresAt: "2026-04-01T00:00:00.000Z",
    },
    semesterCode: "SPR-2026",
    semesterTitle: "Spring 2026",
    classCode: "CSE6",
    classTitle: "CSE 6",
    sectionCode: "A",
    sectionTitle: "Section A",
    subjectCode: "MATH101",
    subjectTitle: "Mathematics",
    primaryTeacherDisplayName: "Teacher One",
    permissions: {
      canEdit: true,
      canArchive: true,
      canEditCourseInfo: true,
      canEditAcademicScope: false,
      canReassignTeacher: false,
    },
    ...overrides,
  }
}

function createStudentRow(
  overrides: Partial<AttendanceSessionStudentSummary> = {},
): AttendanceSessionStudentSummary {
  return {
    attendanceRecordId: "record_1",
    enrollmentId: "enrollment_1",
    studentId: "student_1",
    studentDisplayName: "Student One",
    studentEmail: "student.one@attendease.dev",
    studentRollNumber: "R1",
    status: "PRESENT",
    markedAt: "2026-03-14T09:10:00.000Z",
    ...overrides,
  }
}

function createSessionDetail(
  overrides: Partial<AttendanceSessionDetail> = {},
): AttendanceSessionDetail {
  return {
    id: "session_1",
    classroomId: "classroom_1",
    lectureId: "lecture_1",
    teacherAssignmentId: "assignment_1",
    mode: "QR_GPS",
    status: "ENDED",
    startedAt: "2026-03-14T09:00:00.000Z",
    scheduledEndAt: "2026-03-14T09:45:00.000Z",
    endedAt: "2026-03-14T09:40:00.000Z",
    editableUntil: "2026-03-15T09:40:00.000Z",
    durationSeconds: 2400,
    anchorType: "TEACHER_SELECTED",
    anchorLatitude: 28.6139,
    anchorLongitude: 77.209,
    anchorLabel: "Room 101",
    gpsRadiusMeters: 40,
    qrRotationWindowSeconds: 2,
    bluetoothRotationWindowSeconds: null,
    blePublicId: null,
    bleProtocolVersion: null,
    rosterSnapshotCount: 3,
    presentCount: 2,
    absentCount: 1,
    currentQrPayload: null,
    currentQrExpiresAt: null,
    classroomCode: "MATH-101",
    classroomDisplayTitle: "Mathematics",
    lectureTitle: "Attendance Session 1",
    lectureDate: "2026-03-14T09:00:00.000Z",
    teacherId: "teacher_1",
    teacherDisplayName: "Teacher One",
    teacherEmail: "teacher.one@attendease.dev",
    semesterCode: "SPR-2026",
    semesterTitle: "Spring 2026",
    classCode: "CSE6",
    classTitle: "CSE 6",
    sectionCode: "A",
    sectionTitle: "Section A",
    subjectCode: "MATH101",
    subjectTitle: "Mathematics",
    editability: {
      isEditable: true,
      state: "OPEN",
      endedAt: "2026-03-14T09:40:00.000Z",
      editableUntil: "2026-03-15T09:40:00.000Z",
    },
    suspiciousAttemptCount: 4,
    blockedUntrustedDeviceCount: 1,
    locationValidationFailureCount: 2,
    bluetoothValidationFailureCount: 0,
    revokedDeviceAttemptCount: 1,
    ...overrides,
  }
}
