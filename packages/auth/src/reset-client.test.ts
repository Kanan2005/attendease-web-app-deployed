import { describe, expect, it, vi } from "vitest"

import { createAuthApiClient } from "./client.js"

const authSessionResponse = {
  user: {
    id: "user_1",
    email: "teacher@attendease.dev",
    displayName: "Teacher One",
    status: "ACTIVE",
    availableRoles: ["TEACHER"],
    activeRole: "TEACHER",
    sessionId: "session_1",
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
    accessToken: "a".repeat(32),
    accessTokenExpiresAt: "2026-03-15T09:30:00.000Z",
    refreshToken: "b".repeat(32),
    refreshTokenExpiresAt: "2026-04-14T09:30:00.000Z",
  },
} as const

const liveAttendanceSession = {
  id: "session_1",
  classroomId: "classroom_1",
  classroomCode: "CSE6-MATH-A",
  classroomDisplayTitle: "Mathematics A",
  lectureId: "lecture_1",
  lectureTitle: "Integration Basics",
  lectureDate: "2026-03-15T09:00:00.000Z",
  teacherAssignmentId: "assignment_1",
  mode: "QR_GPS",
  status: "ACTIVE",
  startedAt: "2026-03-15T09:00:00.000Z",
  scheduledEndAt: "2026-03-15T09:15:00.000Z",
  endedAt: null,
  editableUntil: null,
  classId: "class_1",
  classCode: "CSE6",
  classTitle: "Computer Science 6",
  sectionId: "section_1",
  sectionCode: "A",
  sectionTitle: "Section A",
  subjectId: "subject_1",
  subjectCode: "MATH",
  subjectTitle: "Mathematics",
  presentCount: 12,
  absentCount: 3,
  editability: {
    isEditable: false,
    state: "PENDING_SESSION_END",
    endedAt: null,
    editableUntil: null,
  },
} as const

const manualAttendanceResponse = {
  appliedChangeCount: 2,
  session: {
    id: "session_1",
    classroomId: "classroom_1",
    lectureId: "lecture_1",
    teacherAssignmentId: "assignment_1",
    mode: "QR_GPS",
    status: "ENDED",
    startedAt: "2026-03-15T09:00:00.000Z",
    scheduledEndAt: "2026-03-15T09:15:00.000Z",
    endedAt: "2026-03-15T09:15:00.000Z",
    editableUntil: "2026-03-15T18:00:00.000Z",
    durationSeconds: 900,
    anchorType: "TEACHER_SELECTED",
    anchorLatitude: 28.6139,
    anchorLongitude: 77.209,
    anchorLabel: "Room 101",
    gpsRadiusMeters: 120,
    qrRotationWindowSeconds: 15,
    bluetoothRotationWindowSeconds: null,
    blePublicId: null,
    bleProtocolVersion: null,
    rosterSnapshotCount: 15,
    presentCount: 13,
    absentCount: 2,
    currentQrPayload: null,
    currentQrExpiresAt: null,
    classroomCode: "CSE6-MATH-A",
    classroomDisplayTitle: "Mathematics A",
    lectureTitle: "Integration Basics",
    lectureDate: "2026-03-15T09:00:00.000Z",
    teacherId: "teacher_1",
    teacherDisplayName: "Teacher One",
    teacherEmail: "teacher@attendease.dev",
    semesterCode: "SEM-6",
    semesterTitle: "Semester 6",
    classCode: "CSE6",
    classTitle: "Computer Science 6",
    sectionCode: "A",
    sectionTitle: "Section A",
    subjectCode: "MATH",
    subjectTitle: "Mathematics",
    editability: {
      isEditable: true,
      state: "OPEN",
      endedAt: "2026-03-15T09:15:00.000Z",
      editableUntil: "2026-03-15T18:00:00.000Z",
    },
    suspiciousAttemptCount: 0,
    blockedUntrustedDeviceCount: 0,
    locationValidationFailureCount: 0,
    bluetoothValidationFailureCount: 0,
    revokedDeviceAttemptCount: 0,
  },
  students: [
    {
      attendanceRecordId: "record_1",
      enrollmentId: "enrollment_1",
      studentId: "student_1",
      studentDisplayName: "Student One",
      studentEmail: "student.one@attendease.dev",
      studentRollNumber: "23CS001",
      status: "PRESENT",
      markedAt: "2026-03-15T09:16:00.000Z",
    },
    {
      attendanceRecordId: "record_2",
      enrollmentId: "enrollment_2",
      studentId: "student_2",
      studentDisplayName: "Student Two",
      studentEmail: "student.two@attendease.dev",
      studentRollNumber: "23CS002",
      status: "ABSENT",
      markedAt: null,
    },
  ],
} as const

describe("reset auth api client helpers", () => {
  it("locks student and teacher registration endpoints", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          ...authSessionResponse,
          user: {
            ...authSessionResponse.user,
            email: "student.one@attendease.dev",
            availableRoles: ["STUDENT"],
            activeRole: "STUDENT",
            platform: "MOBILE",
            deviceTrust: {
              state: "TRUSTED",
              lifecycleState: "TRUSTED",
              reason: "DEVICE_BOUND",
              deviceId: "device_1",
              bindingId: "binding_1",
            },
          },
          onboarding: {
            recommendedNextStep: "JOIN_CLASSROOM",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          ...authSessionResponse,
          onboarding: {
            recommendedNextStep: "OPEN_HOME",
          },
        }),
      })

    const client = createAuthApiClient({
      baseUrl: "http://localhost:4000",
      fetcher,
    })

    await client.registerStudentAccount({
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
    await client.registerTeacherAccount({
      email: "teacher@attendease.dev",
      password: "TeacherPass123!",
      displayName: "Teacher One",
      platform: "WEB",
    })

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "http://localhost:4000/auth/register/student",
      expect.objectContaining({ method: "POST" }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "http://localhost:4000/auth/register/teacher",
      expect.objectContaining({ method: "POST" }),
    )

    expect(JSON.parse((fetcher.mock.calls[0]?.[1] as { body: string }).body)).toMatchObject({
      platform: "MOBILE",
      device: {
        installId: "install-student-one",
      },
    })
    expect(JSON.parse((fetcher.mock.calls[1]?.[1] as { body: string }).body)).toMatchObject({
      platform: "WEB",
      email: "teacher@attendease.dev",
    })
  })

  it("keeps role-specific login and google exchange helpers explicit", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => authSessionResponse,
    })

    const client = createAuthApiClient({
      baseUrl: "http://localhost:4000",
      fetcher,
    })

    await client.loginStudent({
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
    await client.loginAdmin({
      email: "admin@attendease.dev",
      password: "AdminPass123!",
      platform: "WEB",
      requestedRole: "ADMIN",
    })
    await client.exchangeTeacherGoogleIdentity({
      platform: "WEB",
      requestedRole: "TEACHER",
      authorizationCode: "teacher-auth-code",
      redirectUri: "https://attendease.dev/auth/google/callback",
      codeVerifier: "teacher-code-verifier",
    })

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "http://localhost:4000/auth/login",
      expect.objectContaining({ method: "POST" }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "http://localhost:4000/auth/login",
      expect.objectContaining({ method: "POST" }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      3,
      "http://localhost:4000/auth/google/exchange",
      expect.objectContaining({ method: "POST" }),
    )

    expect(JSON.parse((fetcher.mock.calls[0]?.[1] as { body: string }).body)).toMatchObject({
      platform: "MOBILE",
      requestedRole: "STUDENT",
    })
    expect(JSON.parse((fetcher.mock.calls[1]?.[1] as { body: string }).body)).toMatchObject({
      platform: "WEB",
      requestedRole: "ADMIN",
    })
    expect(JSON.parse((fetcher.mock.calls[2]?.[1] as { body: string }).body)).toMatchObject({
      platform: "WEB",
      requestedRole: "TEACHER",
    })
  })

  it("maps live attendance discovery to the active sessions endpoint", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [liveAttendanceSession],
    })

    const client = createAuthApiClient({
      baseUrl: "http://localhost:4000",
      fetcher,
    })

    await expect(
      client.listLiveAttendanceSessions("teacher_token", {
        classroomId: "classroom_1",
        mode: "QR_GPS",
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: "session_1",
        classroomCode: "CSE6-MATH-A",
        mode: "QR_GPS",
        presentCount: 12,
      }),
    ])

    expect(fetcher).toHaveBeenCalledWith(
      "http://localhost:4000/sessions/live?classroomId=classroom_1&mode=QR_GPS",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          authorization: "Bearer teacher_token",
        }),
      }),
    )
  })

  it("maps manual attendance actions onto the legacy attendance patch payload", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => manualAttendanceResponse,
    })

    const client = createAuthApiClient({
      baseUrl: "http://localhost:4000",
      fetcher,
    })

    await expect(
      client.saveManualAttendanceUpdates("teacher_token", "session_1", {
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
      }),
    ).resolves.toMatchObject({
      appliedChangeCount: 2,
      session: {
        presentCount: 13,
      },
    })

    expect(fetcher).toHaveBeenCalledWith(
      "http://localhost:4000/sessions/session_1/attendance",
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({
          authorization: "Bearer teacher_token",
        }),
      }),
    )
    expect(JSON.parse((fetcher.mock.calls[0]?.[1] as { body: string }).body)).toEqual({
      changes: [
        {
          attendanceRecordId: "record_1",
          status: "PRESENT",
        },
        {
          attendanceRecordId: "record_2",
          status: "ABSENT",
        },
      ],
    })
  })

  it("exposes classroom student and admin recovery aliases on the current endpoints", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          {
            id: "enrollment_1",
            semesterId: "semester_1",
            classId: "class_1",
            sectionId: "section_1",
            subjectId: "subject_1",
            courseOfferingId: "classroom_1",
            classroomId: "classroom_1",
            membershipId: "enrollment_1",
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
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
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
            latestSecurityEvent: null,
            latestAdminAction: {
              id: "admin_action_1",
              adminUserId: "admin_1",
              targetUserId: "student_1",
              targetDeviceId: null,
              targetBindingId: null,
              actionType: "USER_STATUS_CHANGE",
              metadata: null,
              createdAt: "2026-03-15T08:30:00.000Z",
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
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          revokedBindingCount: 1,
        }),
      })

    const client = createAuthApiClient({
      baseUrl: "http://localhost:4000",
      fetcher,
    })

    await client.listClassroomStudents("teacher_token", "classroom_1", {
      status: "ACTIVE",
    })
    await client.listStudentSupportCases("admin_token", {
      query: "student.one",
      accountStatus: "BLOCKED",
      limit: 10,
    })
    await client.clearStudentDeviceRegistrations("admin_token", "student_1", {
      reason: "Phone replaced after damage",
    })

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "http://localhost:4000/classrooms/classroom_1/students?status=ACTIVE",
      expect.objectContaining({ method: "GET" }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "http://localhost:4000/admin/students?query=student.one&accountStatus=BLOCKED&limit=10",
      expect.objectContaining({ method: "GET" }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      3,
      "http://localhost:4000/admin/device-bindings/student_1/delink",
      expect.objectContaining({ method: "POST" }),
    )
    expect(JSON.parse((fetcher.mock.calls[2]?.[1] as { body: string }).body)).toEqual({
      reason: "Phone replaced after damage",
    })
  })
})
