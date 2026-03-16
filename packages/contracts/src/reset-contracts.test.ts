import { describe, expect, it } from "vitest"

import {
  adminPasswordLoginRequestSchema,
  classroomStudentsResponseSchema,
  liveAttendanceSessionDiscoveryQuerySchema,
  manualAttendanceActionToStatusMap,
  manualAttendanceUpdateRequestSchema,
  studentPasswordLoginRequestSchema,
  studentRegistrationRequestSchema,
  studentRegistrationResponseSchema,
  studentSupportCasesResponseSchema,
  teacherRegistrationRequestSchema,
  teacherRegistrationResponseSchema,
} from "./index"

describe("reset contract foundation", () => {
  it("locks student registration to mobile plus device registration", () => {
    const parsed = studentRegistrationRequestSchema.parse({
      email: "student.one@attendease.dev",
      password: "StudentOnePass123!",
      displayName: "Student One",
      platform: "MOBILE",
      device: {
        installId: "install-student-one",
        platform: "ANDROID",
        publicKey: "student-public-key-123456",
      },
    })

    expect(parsed.platform).toBe("MOBILE")
    expect(parsed.device.installId).toBe("install-student-one")

    expect(() =>
      studentRegistrationRequestSchema.parse({
        email: "student.one@attendease.dev",
        password: "StudentOnePass123!",
        displayName: "Student One",
        platform: "MOBILE",
      }),
    ).toThrow()
  })

  it("returns a session plus onboarding hint after student registration", () => {
    const parsed = studentRegistrationResponseSchema.parse({
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
      tokens: {
        accessToken: "a".repeat(32),
        accessTokenExpiresAt: "2026-03-15T09:30:00.000Z",
        refreshToken: "b".repeat(32),
        refreshTokenExpiresAt: "2026-04-14T09:30:00.000Z",
      },
      onboarding: {
        recommendedNextStep: "JOIN_CLASSROOM",
      },
    })

    expect(parsed.user.deviceTrust.state).toBe("TRUSTED")
    expect(parsed.onboarding.recommendedNextStep).toBe("JOIN_CLASSROOM")
  })

  it("keeps teacher and admin auth boundaries explicit", () => {
    const teacherRegistration = teacherRegistrationRequestSchema.parse({
      email: "teacher@attendease.dev",
      password: "TeacherPass123!",
      displayName: "Teacher One",
      platform: "WEB",
    })
    const studentLogin = studentPasswordLoginRequestSchema.parse({
      email: "student.one@attendease.dev",
      password: "StudentOnePass123!",
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: {
        installId: "install-student-one",
        platform: "ANDROID",
        publicKey: "student-public-key-123456",
      },
    })
    const adminLogin = adminPasswordLoginRequestSchema.parse({
      email: "admin@attendease.dev",
      password: "AdminPass123!",
      platform: "WEB",
      requestedRole: "ADMIN",
    })

    expect(teacherRegistration.platform).toBe("WEB")
    expect(studentLogin.requestedRole).toBe("STUDENT")
    expect(adminLogin.requestedRole).toBe("ADMIN")
  })

  it("returns a session plus onboarding hint after teacher registration", () => {
    const parsed = teacherRegistrationResponseSchema.parse({
      user: {
        id: "teacher_1",
        email: "teacher@attendease.dev",
        displayName: "Teacher One",
        status: "ACTIVE",
        availableRoles: ["TEACHER"],
        activeRole: "TEACHER",
        sessionId: "session_teacher_1",
        platform: "WEB",
        deviceTrust: {
          state: "NOT_REQUIRED",
          lifecycleState: "NOT_APPLICABLE",
          reason: "NOT_STUDENT_ROLE",
          deviceId: null,
          bindingId: null,
        },
      },
      tokens: {
        accessToken: "c".repeat(32),
        accessTokenExpiresAt: "2026-03-15T09:30:00.000Z",
        refreshToken: "d".repeat(32),
        refreshTokenExpiresAt: "2026-04-14T09:30:00.000Z",
      },
      onboarding: {
        recommendedNextStep: "OPEN_HOME",
      },
    })

    expect(parsed.user.activeRole).toBe("TEACHER")
    expect(parsed.onboarding.recommendedNextStep).toBe("OPEN_HOME")
  })

  it("accepts classroom student aliases and live attendance discovery filters", () => {
    const students = classroomStudentsResponseSchema.parse([
      {
        id: "enrollment_1",
        semesterId: "semester_1",
        classId: "class_1",
        sectionId: "section_1",
        subjectId: "subject_1",
        courseOfferingId: "classroom_1",
        studentId: "student_1",
        status: "ACTIVE",
        membershipStatus: "ACTIVE",
        source: "JOIN_CODE",
        membershipSource: "JOIN_CODE",
        studentEmail: "student.one@attendease.dev",
        studentDisplayName: "Student One",
        studentName: "Student One",
        studentIdentifier: "23CS001",
        studentStatus: "ACTIVE",
        rollNumber: "23CS001",
        universityId: "U001",
        attendanceDisabled: false,
        joinedAt: "2026-03-15T08:00:00.000Z",
        memberSince: "2026-03-15T08:00:00.000Z",
        droppedAt: null,
        membershipState: "ACTIVE",
        actions: {
          canBlock: true,
          canRemove: true,
          canReactivate: false,
        },
      },
    ])
    const liveDiscovery = liveAttendanceSessionDiscoveryQuerySchema.parse({
      classroomId: "classroom_1",
      mode: "QR_GPS",
    })

    expect(students[0]?.studentDisplayName).toBe("Student One")
    expect(liveDiscovery.mode).toBe("QR_GPS")
  })

  it("rejects duplicate manual attendance updates while keeping action-based semantics", () => {
    const parsed = manualAttendanceUpdateRequestSchema.parse({
      updates: [
        {
          attendanceRecordId: "record_1",
          enrollmentId: "enrollment_1",
          studentId: "student_1",
          action: "MARK_PRESENT",
        },
        {
          attendanceRecordId: "record_2",
          enrollmentId: "enrollment_2",
          studentId: "student_2",
          action: "MARK_ABSENT",
        },
      ],
    })

    expect(parsed.updates).toHaveLength(2)
    expect(manualAttendanceActionToStatusMap.MARK_PRESENT).toBe("PRESENT")
    expect(manualAttendanceActionToStatusMap.MARK_ABSENT).toBe("ABSENT")

    expect(() =>
      manualAttendanceUpdateRequestSchema.parse({
        updates: [
          {
            attendanceRecordId: "record_1",
            enrollmentId: "enrollment_1",
            studentId: "student_1",
            action: "MARK_PRESENT",
          },
          {
            attendanceRecordId: "record_1",
            enrollmentId: "enrollment_1",
            studentId: "student_1",
            action: "MARK_ABSENT",
          },
        ],
      }),
    ).toThrow()
  })

  it("accepts student support recovery aliases for admin governance flows", () => {
    const supportCases = studentSupportCasesResponseSchema.parse([
      {
        student: {
          id: "student_1",
          email: "student.one@attendease.dev",
          displayName: "Student One",
          rollNumber: "23CS001",
          status: "BLOCKED",
          attendanceDisabled: false,
          lastLoginAt: "2026-03-15T08:00:00.000Z",
        },
        attendanceDeviceState: "PENDING_REPLACEMENT",
        activeBinding: null,
        pendingBinding: {
          binding: {
            id: "binding_pending",
            userId: "student_1",
            deviceId: "device_2",
            bindingType: "STUDENT_ATTENDANCE",
            status: "PENDING",
            boundAt: "2026-03-15T08:25:00.000Z",
            activatedAt: null,
            revokedAt: null,
            revokeReason: null,
          },
          device: {
            id: "device_2",
            installId: "student-two-phone",
            platform: "ANDROID",
            deviceModel: "Pixel 8",
            osVersion: "Android 15",
            appVersion: "1.0.0",
            publicKey: "student-two-public-key",
            attestationStatus: "UNKNOWN",
            attestationProvider: null,
            attestedAt: null,
            lastSeenAt: "2026-03-15T08:25:00.000Z",
          },
        },
        latestSecurityEvent: {
          id: "security_1",
          userId: "student_1",
          actorUserId: null,
          deviceId: "device_1",
          bindingId: "binding_1",
          eventType: "SECOND_DEVICE_FOR_STUDENT_ATTEMPT",
          severity: "HIGH",
          description: "Second device attempt detected.",
          metadata: null,
          createdAt: "2026-03-15T08:30:00.000Z",
        },
        latestAdminAction: {
          id: "admin_action_1",
          adminUserId: "admin_1",
          targetUserId: "student_1",
          targetDeviceId: null,
          targetBindingId: null,
          actionType: "USER_STATUS_CHANGE",
          metadata: {
            previousStatus: "ACTIVE",
            nextStatus: "BLOCKED",
          },
          createdAt: "2026-03-15T08:40:00.000Z",
        },
        enrollmentCounts: {
          totalCount: 2,
          activeCount: 1,
          pendingCount: 0,
          blockedCount: 1,
          droppedCount: 0,
        },
        actions: {
          canReactivate: true,
          canDeactivate: false,
          canArchive: true,
        },
      },
    ])

    expect(supportCases[0]?.latestSecurityEvent?.eventType).toBe(
      "SECOND_DEVICE_FOR_STUDENT_ATTEMPT",
    )
    expect(supportCases[0]?.attendanceDeviceState).toBe("PENDING_REPLACEMENT")
  })
})
