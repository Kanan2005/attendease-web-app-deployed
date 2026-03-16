import { describe, expect, it } from "vitest"

import {
  buildAttendanceSecurityBreakdown,
  deriveAttendanceSessionEditability,
  toStudentAttendanceHistoryItem,
} from "./attendance-history.models.js"

describe("attendance history read models", () => {
  it("derives pending, open, and locked editability states from session timestamps", () => {
    expect(
      deriveAttendanceSessionEditability({
        endedAt: null,
        editableUntil: null,
        now: new Date("2026-03-15T10:00:00.000Z"),
      }),
    ).toEqual({
      isEditable: false,
      state: "PENDING_SESSION_END",
      endedAt: null,
      editableUntil: null,
    })

    expect(
      deriveAttendanceSessionEditability({
        endedAt: "2026-03-15T09:00:00.000Z",
        editableUntil: "2026-03-16T09:00:00.000Z",
        now: new Date("2026-03-15T10:00:00.000Z"),
      }),
    ).toEqual({
      isEditable: true,
      state: "OPEN",
      endedAt: "2026-03-15T09:00:00.000Z",
      editableUntil: "2026-03-16T09:00:00.000Z",
    })

    expect(
      deriveAttendanceSessionEditability({
        endedAt: "2026-03-13T09:00:00.000Z",
        editableUntil: "2026-03-14T09:00:00.000Z",
        now: new Date("2026-03-15T10:00:00.000Z"),
      }),
    ).toEqual({
      isEditable: false,
      state: "LOCKED",
      endedAt: "2026-03-13T09:00:00.000Z",
      editableUntil: "2026-03-14T09:00:00.000Z",
    })

    expect(
      deriveAttendanceSessionEditability({
        endedAt: "2026-03-15T09:00:00.000Z",
        editableUntil: "2026-03-15T10:00:00.000Z",
        now: new Date("2026-03-15T10:00:00.000Z"),
      }),
    ).toEqual({
      isEditable: false,
      state: "LOCKED",
      endedAt: "2026-03-15T09:00:00.000Z",
      editableUntil: "2026-03-15T10:00:00.000Z",
    })
  })

  it("builds a suspicious-attendance breakdown and ignores unrelated security events", () => {
    expect(
      buildAttendanceSecurityBreakdown([
        { eventType: "ATTENDANCE_BLOCKED_UNTRUSTED_DEVICE", count: 2 },
        { eventType: "ATTENDANCE_LOCATION_VALIDATION_FAILED", count: 3 },
        { eventType: "ATTENDANCE_BLUETOOTH_VALIDATION_FAILED", count: 1 },
        { eventType: "REVOKED_DEVICE_USED", count: 1 },
        { eventType: "LOGIN_RISK_DETECTED", count: 5 },
      ]),
    ).toEqual({
      suspiciousAttemptCount: 7,
      blockedUntrustedDeviceCount: 2,
      locationValidationFailureCount: 3,
      bluetoothValidationFailureCount: 1,
      revokedDeviceAttemptCount: 1,
    })
  })

  it("maps a student attendance record into the student history contract", () => {
    const historyItem = toStudentAttendanceHistoryItem({
      id: "record_1",
      enrollmentId: "enrollment_1",
      studentId: "student_1",
      status: "PRESENT",
      markSource: "QR_GPS",
      markedAt: new Date("2026-03-15T09:35:00.000Z"),
      session: {
        id: "session_1",
        courseOfferingId: "classroom_1",
        teacherId: "teacher_1",
        teacherAssignmentId: "assignment_1",
        semesterId: "semester_1",
        classId: "class_1",
        sectionId: "section_1",
        subjectId: "subject_1",
        lectureId: "lecture_1",
        courseOffering: {
          code: "CSE6-MATH-A",
          displayTitle: "Mathematics",
        },
        teacher: {
          displayName: "Teacher One",
          email: "teacher@attendease.dev",
        },
        semester: {
          code: "SEM-1",
          title: "Semester 1",
        },
        academicClass: {
          code: "CSE",
          title: "Computer Science",
        },
        section: {
          code: "A",
          title: "Section A",
        },
        subject: {
          code: "MATH101",
          title: "Mathematics",
        },
        lecture: {
          title: "Linear Algebra",
          lectureDate: new Date("2026-03-15T09:30:00.000Z"),
        },
        mode: "QR_GPS",
        status: "ENDED",
        startedAt: new Date("2026-03-15T09:30:00.000Z"),
        endedAt: new Date("2026-03-15T10:00:00.000Z"),
      },
    })

    expect(historyItem).toMatchObject({
      attendanceRecordId: "record_1",
      sessionId: "session_1",
      classroomCode: "CSE6-MATH-A",
      attendanceStatus: "PRESENT",
      markSource: "QR_GPS",
      subjectCode: "MATH101",
    })
  })
})
