import { describe, expect, it, vi } from "vitest"

import { type AuthApiClientError, createAuthApiClient } from "./client.js"

describe("auth api client", () => {
  it("calls login and parses the auth session response", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        user: {
          id: "user_1",
          email: "teacher@attendease.dev",
          displayName: "Teacher",
          status: "ACTIVE",
          availableRoles: ["TEACHER"],
          activeRole: "TEACHER",
          sessionId: "session_1",
          platform: "WEB",
          deviceTrust: {
            state: "NOT_REQUIRED",
            lifecycleState: "NOT_APPLICABLE",
            deviceId: null,
            bindingId: null,
          },
        },
        tokens: {
          accessToken: "a".repeat(32),
          accessTokenExpiresAt: "2026-03-14T09:30:00.000Z",
          refreshToken: "b".repeat(32),
          refreshTokenExpiresAt: "2026-04-13T09:00:00.000Z",
        },
      }),
    })

    const client = createAuthApiClient({
      baseUrl: "http://localhost:4000",
      fetcher,
    })

    await expect(
      client.login({
        email: "teacher@attendease.dev",
        password: "TeacherPass123!",
        platform: "WEB",
        requestedRole: "TEACHER",
      }),
    ).resolves.toMatchObject({
      user: {
        email: "teacher@attendease.dev",
        activeRole: "TEACHER",
      },
    })

    expect(fetcher).toHaveBeenCalledWith(
      "http://localhost:4000/auth/login",
      expect.objectContaining({
        method: "POST",
      }),
    )
  })

  it("serializes assignment and enrollment filters into query strings", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          {
            id: "assignment_1",
            teacherId: "teacher_1",
            semesterId: "semester_1",
            semesterCode: "SEM6",
            semesterTitle: "Semester 6",
            classId: "class_1",
            classCode: "CSE6",
            classTitle: "CSE 6",
            sectionId: "section_1",
            sectionCode: "A",
            sectionTitle: "Section A",
            subjectId: "subject_1",
            subjectCode: "MATH101",
            subjectTitle: "Mathematics",
            status: "ACTIVE",
            canSelfCreateCourseOffering: true,
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          {
            id: "enrollment_1",
            courseOfferingId: "course_1",
            studentId: "student_1",
            semesterId: "semester_1",
            classId: "class_1",
            sectionId: "section_1",
            subjectId: "subject_1",
            status: "ACTIVE",
            source: "JOIN_CODE",
          },
        ],
      })

    const client = createAuthApiClient({
      baseUrl: "http://localhost:4000",
      fetcher,
    })

    await client.listMyAssignments("token_1", {
      semesterId: "semester_1",
      subjectId: "subject_1",
    })
    await client.listMyEnrollments("token_2", {
      courseOfferingId: "course_1",
      status: "ACTIVE",
    })

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "http://localhost:4000/academic/assignments/me?semesterId=semester_1&subjectId=subject_1",
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer token_1",
        }),
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "http://localhost:4000/academic/enrollments/me?courseOfferingId=course_1&status=ACTIVE",
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer token_2",
        }),
      }),
    )
  })

  it("calls the device and admin support endpoints with the expected contracts", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          device: {
            id: "device_1",
            installId: "install-device-one",
            platform: "ANDROID",
            deviceModel: "Pixel 8",
            osVersion: "Android 15",
            appVersion: "0.1.0",
            publicKey: "public-key-device-one",
            attestationStatus: "UNKNOWN",
            attestationProvider: "play-integrity-placeholder",
            attestedAt: null,
            lastSeenAt: "2026-03-14T10:00:00.000Z",
          },
          binding: null,
          deviceTrust: {
            state: "NOT_REQUIRED",
            lifecycleState: "NOT_APPLICABLE",
            reason: "NOT_STUDENT_ROLE",
            deviceId: "device_1",
            bindingId: null,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ready: true,
          device: {
            id: "device_1",
            installId: "install-device-one",
            platform: "ANDROID",
            deviceModel: "Pixel 8",
            osVersion: "Android 15",
            appVersion: "0.1.0",
            publicKey: "public-key-device-one",
            attestationStatus: "UNKNOWN",
            attestationProvider: "play-integrity-placeholder",
            attestedAt: null,
            lastSeenAt: "2026-03-14T10:00:00.000Z",
          },
          binding: {
            id: "binding_1",
            userId: "student_1",
            deviceId: "device_1",
            bindingType: "STUDENT_ATTENDANCE",
            status: "ACTIVE",
            boundAt: "2026-03-14T09:55:00.000Z",
            activatedAt: "2026-03-14T09:55:00.000Z",
            revokedAt: null,
            revokeReason: null,
          },
          deviceTrust: {
            state: "TRUSTED",
            lifecycleState: "TRUSTED",
            reason: "DEVICE_BOUND",
            deviceId: "device_1",
            bindingId: "binding_1",
          },
        }),
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
              status: "ACTIVE",
              attendanceDisabled: false,
            },
            attendanceDeviceState: "UNREGISTERED",
            activeBinding: null,
            pendingBinding: null,
            latestSecurityEvent: null,
            activeBindingCount: 0,
            revokedBindingCount: 0,
            recovery: {
              activeBindingCount: 0,
              pendingBindingCount: 0,
              revokedBindingCount: 0,
              blockedBindingCount: 0,
              currentDeviceLabel: null,
              pendingReplacementLabel: null,
              latestRiskEvent: null,
              latestRecoveryAction: null,
              recommendedAction: "WAIT_FOR_REPLACEMENT_REGISTRATION",
              recommendedActionLabel: "Wait for a replacement phone",
              recommendedActionMessage:
                "No phone is trusted right now. Ask the student to sign in on the replacement phone or provide verified device details before approval.",
              strictPolicyNote:
                "A new phone can only become trusted when no other active phone exists, or when support explicitly approves a verified replacement.",
              actions: {
                canDeregisterCurrentDevice: false,
                canApproveReplacementDevice: true,
                canRevokeActiveBinding: false,
              },
            },
          },
        ],
      })

    const client = createAuthApiClient({
      baseUrl: "http://localhost:4000",
      fetcher,
    })

    await client.registerDevice("token_register", {
      installId: "install-device-one",
      platform: "ANDROID",
      publicKey: "public-key-device-one",
    })
    await client.getTrustedAttendanceReady("token_attendance", "install-device-one")
    await client.listAdminDeviceSupport("token_admin", {
      query: "student.one",
      includeHistory: false,
      limit: 5,
    })

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "http://localhost:4000/devices/register",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer token_register",
        }),
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "http://localhost:4000/devices/trust/attendance-ready",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          authorization: "Bearer token_attendance",
          "x-attendease-install-id": "install-device-one",
        }),
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      3,
      "http://localhost:4000/admin/device-bindings?query=student.one&includeHistory=false&limit=5",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          authorization: "Bearer token_admin",
        }),
      }),
    )
  })

  it("calls the admin student support endpoints with the expected contracts", async () => {
    const fetcher = vi
      .fn()
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
              status: "ACTIVE",
              attendanceDisabled: false,
              lastLoginAt: "2026-03-15T09:00:00.000Z",
            },
            attendanceDeviceState: "TRUSTED",
            activeBinding: null,
            pendingBinding: null,
            latestSecurityEvent: null,
            latestAdminAction: null,
            enrollmentCounts: {
              totalCount: 2,
              activeCount: 2,
              pendingCount: 0,
              blockedCount: 0,
              droppedCount: 0,
            },
            actions: {
              canReactivate: false,
              canDeactivate: true,
              canArchive: true,
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          student: {
            id: "student_1",
            email: "student.one@attendease.dev",
            displayName: "Student One",
            rollNumber: "23CS001",
            status: "ACTIVE",
            attendanceDisabled: false,
            lastLoginAt: "2026-03-15T09:00:00.000Z",
            createdAt: "2026-03-01T09:00:00.000Z",
            programName: "Computer Science and Engineering",
            currentSemester: 6,
            parentEmail: null,
          },
          attendanceDeviceState: "TRUSTED",
          activeBinding: null,
          pendingBinding: null,
          enrollmentCounts: {
            totalCount: 2,
            activeCount: 2,
            pendingCount: 0,
            blockedCount: 0,
            droppedCount: 0,
          },
          recentClassrooms: [],
          securityEvents: [],
          adminActions: [],
          actions: {
            canReactivate: false,
            canDeactivate: true,
            canArchive: true,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          student: {
            student: {
              id: "student_1",
              email: "student.one@attendease.dev",
              displayName: "Student One",
              rollNumber: "23CS001",
              status: "BLOCKED",
              attendanceDisabled: false,
              lastLoginAt: "2026-03-15T09:00:00.000Z",
              createdAt: "2026-03-01T09:00:00.000Z",
              programName: "Computer Science and Engineering",
              currentSemester: 6,
              parentEmail: null,
            },
            attendanceDeviceState: "TRUSTED",
            activeBinding: null,
            pendingBinding: null,
            enrollmentCounts: {
              totalCount: 2,
              activeCount: 2,
              pendingCount: 0,
              blockedCount: 0,
              droppedCount: 0,
            },
            recentClassrooms: [],
            securityEvents: [],
            adminActions: [],
            actions: {
              canReactivate: true,
              canDeactivate: false,
              canArchive: true,
            },
          },
          revokedSessionCount: 1,
        }),
      })

    const client = createAuthApiClient({
      baseUrl: "http://localhost:4000",
      fetcher,
    })

    await client.listStudentSupportCases("token_admin", {
      query: "student.one",
      accountStatus: "ACTIVE",
      limit: 6,
    })
    await client.getStudentSupportCase("token_admin", "student_1")
    await client.updateAdminStudentStatus("token_admin", "student_1", {
      nextStatus: "BLOCKED",
      reason: "Support verified the request.",
    })

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "http://localhost:4000/admin/students?query=student.one&accountStatus=ACTIVE&limit=6",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          authorization: "Bearer token_admin",
        }),
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "http://localhost:4000/admin/students/student_1",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          authorization: "Bearer token_admin",
        }),
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      3,
      "http://localhost:4000/admin/students/student_1/status",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer token_admin",
        }),
      }),
    )
  })

  it("calls the QR session and QR mark endpoints with the expected polling and trusted-device headers", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
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
          durationSeconds: 1200,
          anchorType: "TEACHER_SELECTED",
          anchorLatitude: 28.6139,
          anchorLongitude: 77.209,
          anchorLabel: "Room 101",
          gpsRadiusMeters: 120,
          qrRotationWindowSeconds: 15,
          rosterSnapshotCount: 30,
          presentCount: 0,
          absentCount: 30,
          currentQrPayload: '{"sid":"session_1"}',
          currentQrExpiresAt: "2026-03-14T10:00:15.000Z",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
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
          durationSeconds: 1200,
          anchorType: "TEACHER_SELECTED",
          anchorLatitude: 28.6139,
          anchorLongitude: 77.209,
          anchorLabel: "Room 101",
          gpsRadiusMeters: 120,
          qrRotationWindowSeconds: 15,
          rosterSnapshotCount: 30,
          presentCount: 1,
          absentCount: 29,
          currentQrPayload: '{"sid":"session_1"}',
          currentQrExpiresAt: "2026-03-14T10:00:30.000Z",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          success: true,
          sessionId: "session_1",
          attendanceRecordId: "record_1",
          attendanceStatus: "PRESENT",
          markSource: "QR_GPS",
          markedAt: "2026-03-14T10:00:12.000Z",
          presentCount: 1,
          absentCount: 29,
          distanceMeters: 6.5,
          accuracyMeters: 12,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "session_1",
          classroomId: "classroom_1",
          lectureId: "lecture_1",
          teacherAssignmentId: "assignment_1",
          mode: "QR_GPS",
          status: "ENDED",
          startedAt: "2026-03-14T10:00:00.000Z",
          scheduledEndAt: "2026-03-14T10:20:00.000Z",
          endedAt: "2026-03-14T10:10:00.000Z",
          editableUntil: "2026-03-15T10:10:00.000Z",
          durationSeconds: 1200,
          anchorType: "TEACHER_SELECTED",
          anchorLatitude: 28.6139,
          anchorLongitude: 77.209,
          anchorLabel: "Room 101",
          gpsRadiusMeters: 120,
          qrRotationWindowSeconds: 15,
          rosterSnapshotCount: 30,
          presentCount: 1,
          absentCount: 29,
          currentQrPayload: null,
          currentQrExpiresAt: null,
        }),
      })

    const client = createAuthApiClient({
      baseUrl: "http://localhost:4000",
      fetcher,
    })

    await client.createQrAttendanceSession("teacher_token", {
      classroomId: "classroom_1",
      lectureId: "lecture_1",
      anchorType: "TEACHER_SELECTED",
      anchorLatitude: 28.6139,
      anchorLongitude: 77.209,
      gpsRadiusMeters: 120,
      sessionDurationMinutes: 20,
    })
    await client.getQrAttendanceSession("teacher_token", "session_1")
    await client.markQrAttendance("student_token", "install_1", {
      qrPayload: '{"sid":"session_1"}',
      latitude: 28.61395,
      longitude: 77.20902,
      accuracyMeters: 12,
      deviceTimestamp: "2026-03-14T10:00:12.000Z",
    })
    await client.endQrAttendanceSession("teacher_token", "session_1")

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "http://localhost:4000/sessions/qr",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer teacher_token",
        }),
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "http://localhost:4000/sessions/session_1",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          authorization: "Bearer teacher_token",
        }),
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      3,
      "http://localhost:4000/attendance/qr/mark",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer student_token",
          "x-attendease-install-id": "install_1",
        }),
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      4,
      "http://localhost:4000/sessions/session_1/end",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer teacher_token",
        }),
      }),
    )
  })

  it("calls the Bluetooth attendance session and mark routes with the expected payloads", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          session: {
            id: "session_bluetooth_1",
            classroomId: "classroom_1",
            lectureId: "lecture_1",
            teacherAssignmentId: "assignment_1",
            mode: "BLUETOOTH",
            status: "ACTIVE",
            startedAt: "2026-03-14T10:00:00.000Z",
            scheduledEndAt: "2026-03-14T10:20:00.000Z",
            endedAt: null,
            editableUntil: null,
            durationSeconds: 1200,
            anchorType: null,
            anchorLatitude: null,
            anchorLongitude: null,
            anchorLabel: null,
            gpsRadiusMeters: null,
            qrRotationWindowSeconds: null,
            bluetoothRotationWindowSeconds: 10,
            blePublicId: "ble-public-id-123456",
            bleProtocolVersion: 1,
            rosterSnapshotCount: 30,
            presentCount: 0,
            absentCount: 30,
            currentQrPayload: null,
            currentQrExpiresAt: null,
          },
          advertiser: {
            sessionId: "session_bluetooth_1",
            serviceUuid: "12345678-1234-5678-1234-56789abc0001",
            publicId: "ble-public-id-123456",
            protocolVersion: 1,
            rotationWindowSeconds: 10,
            seed: "ble-seed-for-tests-1234567890",
            currentPayload:
              '{"v":1,"pid":"ble-public-id-123456","ts":123456,"eid":"abcdef1234567890"}',
            currentPayloadExpiresAt: "2026-03-14T10:00:10.000Z",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          success: true,
          sessionId: "session_bluetooth_1",
          attendanceRecordId: "record_2",
          attendanceStatus: "PRESENT",
          markSource: "BLUETOOTH",
          markedAt: "2026-03-14T10:00:12.000Z",
          presentCount: 1,
          absentCount: 29,
          detectionRssi: -55,
          detectionSlice: 123456,
        }),
      })

    const client = createAuthApiClient({
      baseUrl: "http://localhost:4000",
      fetcher,
    })

    await client.createBluetoothAttendanceSession("teacher_token", {
      classroomId: "classroom_1",
      lectureId: "lecture_1",
      sessionDurationMinutes: 20,
    })
    await client.markBluetoothAttendance("student_token", "install_1", {
      detectedPayload: '{"v":1,"pid":"ble-public-id-123456","ts":123456,"eid":"abcdef1234567890"}',
      rssi: -55,
      deviceTimestamp: "2026-03-14T10:00:12.000Z",
    })

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "http://localhost:4000/sessions/bluetooth",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer teacher_token",
        }),
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "http://localhost:4000/attendance/bluetooth/mark",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer student_token",
          "x-attendease-install-id": "install_1",
        }),
      }),
    )
  })

  it("calls the classroom schedule and lecture endpoints with the expected routes", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          {
            id: "classroom_1",
            semesterId: "semester_1",
            classId: "class_1",
            sectionId: "section_1",
            subjectId: "subject_1",
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
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          classroomId: "classroom_1",
          scheduleSlots: [],
          scheduleExceptions: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: "slot_1",
          courseOfferingId: "classroom_1",
          weekday: 5,
          startMinutes: 540,
          endMinutes: 600,
          locationLabel: "Room 101",
          status: "ACTIVE",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          classroomId: "classroom_1",
          scheduleSlots: [
            {
              id: "slot_1",
              courseOfferingId: "classroom_1",
              weekday: 5,
              startMinutes: 540,
              endMinutes: 600,
              locationLabel: "Room 101",
              status: "ACTIVE",
            },
          ],
          scheduleExceptions: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          {
            id: "lecture_1",
            courseOfferingId: "classroom_1",
            scheduleSlotId: "slot_1",
            scheduleExceptionId: null,
            createdByUserId: "teacher_1",
            title: "Lecture 1",
            lectureDate: "2026-08-14T00:00:00.000Z",
            plannedStartAt: "2026-08-14T09:00:00.000Z",
            plannedEndAt: "2026-08-14T10:00:00.000Z",
            actualStartAt: null,
            actualEndAt: null,
            status: "PLANNED",
          },
        ],
      })

    const client = createAuthApiClient({
      baseUrl: "http://localhost:4000",
      fetcher,
    })

    await client.listClassrooms("token_teacher", {
      semesterId: "semester_1",
      status: "ACTIVE",
    })
    await client.getClassroomSchedule("token_teacher", "classroom_1")
    await client.createClassroomWeeklySlot("token_teacher", "classroom_1", {
      weekday: 5,
      startMinutes: 540,
      endMinutes: 600,
      locationLabel: "Room 101",
    })
    await client.saveAndNotifyClassroomSchedule("token_teacher", "classroom_1", {
      weeklySlotUpdates: [
        {
          slotId: "slot_1",
          locationLabel: "Room 101",
        },
      ],
      note: "Notify students",
    })
    await client.listClassroomLectures("token_teacher", "classroom_1", {
      status: "PLANNED",
    })

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "http://localhost:4000/classrooms?semesterId=semester_1&status=ACTIVE",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          authorization: "Bearer token_teacher",
        }),
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "http://localhost:4000/classrooms/classroom_1/schedule",
      expect.objectContaining({
        method: "GET",
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      3,
      "http://localhost:4000/classrooms/classroom_1/schedule/weekly-slots",
      expect.objectContaining({
        method: "POST",
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      4,
      "http://localhost:4000/classrooms/classroom_1/schedule/save-and-notify",
      expect.objectContaining({
        method: "POST",
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      5,
      "http://localhost:4000/classrooms/classroom_1/lectures?status=PLANNED",
      expect.objectContaining({
        method: "GET",
      }),
    )
  })

  it("calls semester lifecycle and classroom archive endpoints with the expected routes", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          {
            id: "semester_1",
            academicTermId: "term_2026",
            code: "SEM-6",
            title: "Semester 6",
            ordinal: 6,
            status: "DRAFT",
            startDate: "2026-01-01T00:00:00.000Z",
            endDate: "2026-06-30T23:59:59.999Z",
            attendanceCutoffDate: "2026-06-20T23:59:59.999Z",
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: "semester_2",
          academicTermId: "term_2026",
          code: "SEM-7",
          title: "Semester 7",
          ordinal: 7,
          status: "DRAFT",
          startDate: "2026-07-01T00:00:00.000Z",
          endDate: "2026-12-31T23:59:59.999Z",
          attendanceCutoffDate: null,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "semester_2",
          academicTermId: "term_2026",
          code: "SEM-7",
          title: "Semester 7 Updated",
          ordinal: 7,
          status: "DRAFT",
          startDate: "2026-07-01T00:00:00.000Z",
          endDate: "2026-12-31T23:59:59.999Z",
          attendanceCutoffDate: "2026-12-20T23:59:59.999Z",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "semester_2",
          academicTermId: "term_2026",
          code: "SEM-7",
          title: "Semester 7 Updated",
          ordinal: 7,
          status: "ACTIVE",
          startDate: "2026-07-01T00:00:00.000Z",
          endDate: "2026-12-31T23:59:59.999Z",
          attendanceCutoffDate: "2026-12-20T23:59:59.999Z",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "semester_2",
          academicTermId: "term_2026",
          code: "SEM-7",
          title: "Semester 7 Updated",
          ordinal: 7,
          status: "ARCHIVED",
          startDate: "2026-07-01T00:00:00.000Z",
          endDate: "2026-12-31T23:59:59.999Z",
          attendanceCutoffDate: "2026-12-20T23:59:59.999Z",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          {
            id: "classroom_1",
            semesterId: "semester_1",
            classId: "class_1",
            sectionId: "section_1",
            subjectId: "subject_1",
            primaryTeacherId: "teacher_1",
            createdByUserId: "teacher_1",
            code: "CSE6-MATH-A",
            courseCode: "CSE6-MATH-A",
            displayTitle: "Maths",
            classroomTitle: "Maths",
            semesterCode: "SEM6",
            semesterTitle: "Semester 6",
            classCode: "CSE6",
            classTitle: "Computer Science 6",
            sectionCode: "A",
            sectionTitle: "Section A",
            subjectCode: "MATH101",
            subjectTitle: "Mathematics",
            primaryTeacherDisplayName: "Teacher One",
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
            permissions: {
              canEdit: true,
              canArchive: true,
              canEditCourseInfo: true,
              canEditAcademicScope: true,
              canReassignTeacher: true,
            },
            governance: {
              activeStudentCount: 4,
              pendingStudentCount: 0,
              blockedStudentCount: 0,
              droppedStudentCount: 0,
              attendanceSessionCount: 2,
              liveAttendanceSessionCount: 0,
              presentRecordCount: 6,
              absentRecordCount: 2,
              latestAttendanceAt: "2026-03-15T10:00:00.000Z",
              canArchiveNow: true,
              archiveEffectLabel: "Archive the classroom",
              archiveEffectMessage:
                "Archiving revokes the join code, stops new classroom changes, and keeps attendance history available for review and audits.",
              historyPreservedNote:
                "Archive keeps saved attendance sessions, present and absent counts, roster history, and admin audit records.",
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "classroom_1",
          semesterId: "semester_1",
          classId: "class_1",
          sectionId: "section_1",
          subjectId: "subject_1",
          primaryTeacherId: "teacher_1",
          createdByUserId: "teacher_1",
          code: "CSE6-MATH-A",
          courseCode: "CSE6-MATH-A",
          displayTitle: "Maths",
          classroomTitle: "Maths",
          semesterCode: "SEM6",
          semesterTitle: "Semester 6",
          classCode: "CSE6",
          classTitle: "Computer Science 6",
          sectionCode: "A",
          sectionTitle: "Section A",
          subjectCode: "MATH101",
          subjectTitle: "Mathematics",
          primaryTeacherDisplayName: "Teacher One",
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
          permissions: {
            canEdit: true,
            canArchive: true,
            canEditCourseInfo: true,
            canEditAcademicScope: true,
            canReassignTeacher: true,
          },
          scheduleSlots: [],
          scheduleExceptions: [],
          governance: {
            activeStudentCount: 4,
            pendingStudentCount: 0,
            blockedStudentCount: 0,
            droppedStudentCount: 0,
            attendanceSessionCount: 2,
            liveAttendanceSessionCount: 0,
            presentRecordCount: 6,
            absentRecordCount: 2,
            latestAttendanceAt: "2026-03-15T10:00:00.000Z",
            canArchiveNow: true,
            archiveEffectLabel: "Archive the classroom",
            archiveEffectMessage:
              "Archiving revokes the join code, stops new classroom changes, and keeps attendance history available for review and audits.",
            historyPreservedNote:
              "Archive keeps saved attendance sessions, present and absent counts, roster history, and admin audit records.",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "classroom_1",
          semesterId: "semester_1",
          classId: "class_1",
          sectionId: "section_1",
          subjectId: "subject_1",
          primaryTeacherId: "teacher_1",
          createdByUserId: "teacher_1",
          code: "CSE6-MATH-A",
          courseCode: "CSE6-MATH-A",
          displayTitle: "Maths",
          classroomTitle: "Maths",
          semesterCode: "SEM6",
          semesterTitle: "Semester 6",
          classCode: "CSE6",
          classTitle: "Computer Science 6",
          sectionCode: "A",
          sectionTitle: "Section A",
          subjectCode: "MATH101",
          subjectTitle: "Mathematics",
          primaryTeacherDisplayName: "Teacher One",
          status: "ARCHIVED",
          defaultAttendanceMode: "QR_GPS",
          defaultGpsRadiusMeters: 100,
          defaultSessionDurationMinutes: 15,
          qrRotationWindowSeconds: 15,
          bluetoothRotationWindowSeconds: 10,
          timezone: "Asia/Kolkata",
          requiresTrustedDevice: true,
          archivedAt: "2026-03-14T12:00:00.000Z",
          activeJoinCode: null,
          permissions: {
            canEdit: false,
            canArchive: false,
            canEditCourseInfo: false,
            canEditAcademicScope: false,
            canReassignTeacher: false,
          },
          scheduleSlots: [],
          scheduleExceptions: [],
          governance: {
            activeStudentCount: 4,
            pendingStudentCount: 0,
            blockedStudentCount: 0,
            droppedStudentCount: 0,
            attendanceSessionCount: 2,
            liveAttendanceSessionCount: 0,
            presentRecordCount: 6,
            absentRecordCount: 2,
            latestAttendanceAt: "2026-03-15T10:00:00.000Z",
            canArchiveNow: false,
            archiveEffectLabel: "Already archived",
            archiveEffectMessage:
              "This classroom is already archived. Attendance history, roster history, and the audit trail remain available.",
            historyPreservedNote:
              "Archive keeps saved attendance sessions, present and absent counts, roster history, and admin audit records.",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "classroom_1",
          semesterId: "semester_1",
          classId: "class_1",
          sectionId: "section_1",
          subjectId: "subject_1",
          primaryTeacherId: "teacher_1",
          createdByUserId: "teacher_1",
          code: "CSE6-MATH-A",
          displayTitle: "Maths",
          status: "ARCHIVED",
          defaultAttendanceMode: "QR_GPS",
          defaultGpsRadiusMeters: 100,
          defaultSessionDurationMinutes: 15,
          qrRotationWindowSeconds: 15,
          bluetoothRotationWindowSeconds: 10,
          timezone: "Asia/Kolkata",
          requiresTrustedDevice: true,
          archivedAt: "2026-03-14T12:00:00.000Z",
          activeJoinCode: null,
          scheduleSlots: [],
          scheduleExceptions: [],
        }),
      })

    const client = createAuthApiClient({
      baseUrl: "http://localhost:4000",
      fetcher,
    })

    await client.listSemesters("token_admin", { status: "DRAFT" })
    await client.createSemester("token_admin", {
      academicTermId: "term_2026",
      code: "SEM-7",
      title: "Semester 7",
      ordinal: 7,
      startDate: "2026-07-01T00:00:00.000Z",
      endDate: "2026-12-31T23:59:59.999Z",
    })
    await client.updateSemester("token_admin", "semester_2", {
      title: "Semester 7 Updated",
      attendanceCutoffDate: "2026-12-20T23:59:59.999Z",
    })
    await client.activateSemester("token_admin", "semester_2")
    await client.archiveSemester("token_admin", "semester_2")
    await client.listAdminClassrooms("token_admin", {
      query: "math",
      semesterId: "semester_1",
      status: "ACTIVE",
      limit: 5,
    })
    await client.getAdminClassroom("token_admin", "classroom_1")
    await client.archiveAdminClassroom("token_admin", "classroom_1", {
      reason: "Registrar review complete.",
    })
    await client.archiveClassroom("token_teacher", "classroom_1")

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "http://localhost:4000/admin/semesters?status=DRAFT",
      expect.objectContaining({
        method: "GET",
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "http://localhost:4000/admin/semesters",
      expect.objectContaining({
        method: "POST",
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      3,
      "http://localhost:4000/admin/semesters/semester_2",
      expect.objectContaining({
        method: "PATCH",
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      4,
      "http://localhost:4000/admin/semesters/semester_2/activate",
      expect.objectContaining({
        method: "POST",
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      5,
      "http://localhost:4000/admin/semesters/semester_2/archive",
      expect.objectContaining({
        method: "POST",
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      6,
      "http://localhost:4000/admin/classrooms?query=math&semesterId=semester_1&status=ACTIVE&limit=5",
      expect.objectContaining({
        method: "GET",
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      7,
      "http://localhost:4000/admin/classrooms/classroom_1",
      expect.objectContaining({
        method: "GET",
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      8,
      "http://localhost:4000/admin/classrooms/classroom_1/archive",
      expect.objectContaining({
        method: "POST",
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      9,
      "http://localhost:4000/classrooms/classroom_1/archive",
      expect.objectContaining({
        method: "POST",
      }),
    )

    const activateRequest = fetcher.mock.calls[3]?.[1]
    const archiveSemesterRequest = fetcher.mock.calls[4]?.[1]
    const adminArchiveClassroomRequest = fetcher.mock.calls[7]?.[1]
    const archiveClassroomRequest = fetcher.mock.calls[8]?.[1]

    expect(activateRequest?.headers).not.toHaveProperty("content-type")
    expect(archiveSemesterRequest?.headers).not.toHaveProperty("content-type")
    expect(adminArchiveClassroomRequest?.headers).toHaveProperty("content-type", "application/json")
    expect(archiveClassroomRequest?.headers).not.toHaveProperty("content-type")
    expect(activateRequest).not.toHaveProperty("body")
    expect(archiveSemesterRequest).not.toHaveProperty("body")
    expect(adminArchiveClassroomRequest?.body).toBe(
      JSON.stringify({
        reason: "Registrar review complete.",
      }),
    )
    expect(archiveClassroomRequest).not.toHaveProperty("body")
  })

  it("calls the classroom join and roster endpoints with the expected routes", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          {
            id: "classroom_1",
            semesterId: "semester_1",
            classId: "class_1",
            sectionId: "section_1",
            subjectId: "subject_1",
            primaryTeacherId: "teacher_1",
            code: "CSE6-MATH-A",
            displayTitle: "Maths",
            classroomStatus: "ACTIVE",
            defaultAttendanceMode: "QR_GPS",
            timezone: "Asia/Kolkata",
            requiresTrustedDevice: true,
            enrollmentId: "enrollment_1",
            enrollmentStatus: "ACTIVE",
            enrollmentSource: "JOIN_CODE",
            joinedAt: "2026-03-14T09:00:00.000Z",
            droppedAt: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: "classroom_1",
          semesterId: "semester_1",
          classId: "class_1",
          sectionId: "section_1",
          subjectId: "subject_1",
          primaryTeacherId: "teacher_1",
          code: "CSE6-MATH-A",
          displayTitle: "Maths",
          classroomStatus: "ACTIVE",
          defaultAttendanceMode: "QR_GPS",
          timezone: "Asia/Kolkata",
          requiresTrustedDevice: true,
          enrollmentId: "enrollment_1",
          enrollmentStatus: "ACTIVE",
          enrollmentSource: "JOIN_CODE",
          joinedAt: "2026-03-14T09:00:00.000Z",
          droppedAt: null,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "join_code_1",
          courseOfferingId: "classroom_1",
          code: "JOIN1234",
          status: "ACTIVE",
          expiresAt: "2026-05-31T23:59:59.999Z",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: "join_code_2",
          courseOfferingId: "classroom_1",
          code: "RESET567",
          status: "ACTIVE",
          expiresAt: "2026-06-30T23:59:59.999Z",
        }),
      })
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
            joinedAt: "2026-03-14T09:00:00.000Z",
            memberSince: "2026-03-14T09:00:00.000Z",
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
        status: 201,
        json: async () => ({
          id: "enrollment_2",
          semesterId: "semester_1",
          classId: "class_1",
          sectionId: "section_1",
          subjectId: "subject_1",
          courseOfferingId: "classroom_1",
          classroomId: "classroom_1",
          membershipId: "enrollment_2",
          studentId: "student_2",
          status: "PENDING",
          membershipStatus: "PENDING",
          source: "MANUAL",
          membershipSource: "MANUAL",
          studentEmail: "student.two@attendease.dev",
          studentDisplayName: "Student Two",
          studentName: "Student Two",
          studentIdentifier: "23CS002",
          studentStatus: "ACTIVE",
          rollNumber: "23CS002",
          universityId: "U002",
          attendanceDisabled: false,
          joinedAt: "2026-03-14T09:05:00.000Z",
          memberSince: "2026-03-14T09:05:00.000Z",
          droppedAt: null,
          membershipState: "PENDING",
          actions: {
            canBlock: true,
            canRemove: true,
            canReactivate: true,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "enrollment_2",
          semesterId: "semester_1",
          classId: "class_1",
          sectionId: "section_1",
          subjectId: "subject_1",
          courseOfferingId: "classroom_1",
          classroomId: "classroom_1",
          membershipId: "enrollment_2",
          studentId: "student_2",
          status: "BLOCKED",
          membershipStatus: "BLOCKED",
          source: "MANUAL",
          membershipSource: "MANUAL",
          studentEmail: "student.two@attendease.dev",
          studentDisplayName: "Student Two",
          studentName: "Student Two",
          studentIdentifier: "23CS002",
          studentStatus: "ACTIVE",
          rollNumber: "23CS002",
          universityId: "U002",
          attendanceDisabled: false,
          joinedAt: "2026-03-14T09:05:00.000Z",
          memberSince: "2026-03-14T09:05:00.000Z",
          droppedAt: null,
          membershipState: "BLOCKED",
          actions: {
            canBlock: false,
            canRemove: true,
            canReactivate: true,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "enrollment_2",
          semesterId: "semester_1",
          classId: "class_1",
          sectionId: "section_1",
          subjectId: "subject_1",
          courseOfferingId: "classroom_1",
          classroomId: "classroom_1",
          membershipId: "enrollment_2",
          studentId: "student_2",
          status: "DROPPED",
          membershipStatus: "DROPPED",
          source: "MANUAL",
          membershipSource: "MANUAL",
          studentEmail: "student.two@attendease.dev",
          studentDisplayName: "Student Two",
          studentName: "Student Two",
          studentIdentifier: "23CS002",
          studentStatus: "ACTIVE",
          rollNumber: "23CS002",
          universityId: "U002",
          attendanceDisabled: false,
          joinedAt: "2026-03-14T09:05:00.000Z",
          memberSince: "2026-03-14T09:05:00.000Z",
          droppedAt: "2026-03-14T09:10:00.000Z",
          membershipState: "DROPPED",
          actions: {
            canBlock: false,
            canRemove: false,
            canReactivate: true,
          },
        }),
      })

    const client = createAuthApiClient({
      baseUrl: "http://localhost:4000",
      fetcher,
    })

    await client.listMyClassrooms("token_student", {
      enrollmentStatus: "ACTIVE",
    })
    await client.joinClassroom("token_student", {
      code: "join1234",
    })
    await client.getClassroomJoinCode("token_teacher", "classroom_1")
    await client.resetClassroomJoinCode("token_teacher", "classroom_1", {
      expiresAt: "2026-06-30T23:59:59.999Z",
    })
    await client.listClassroomRoster("token_teacher", "classroom_1", {
      membershipStatus: "ACTIVE",
      search: "23CS001",
    })
    await client.addClassroomRosterMember("token_teacher", "classroom_1", {
      studentIdentifier: "23CS002",
      membershipStatus: "PENDING",
    })
    await client.updateClassroomRosterMember("token_teacher", "classroom_1", "enrollment_2", {
      membershipStatus: "BLOCKED",
    })
    await client.removeClassroomStudent("token_teacher", "classroom_1", "enrollment_2")

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "http://localhost:4000/students/me/classrooms?enrollmentStatus=ACTIVE",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          authorization: "Bearer token_student",
        }),
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "http://localhost:4000/classrooms/join",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          code: "JOIN1234",
        }),
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      3,
      "http://localhost:4000/classrooms/classroom_1/join-code",
      expect.objectContaining({
        method: "GET",
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      4,
      "http://localhost:4000/classrooms/classroom_1/join-code/reset",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          expiresAt: "2026-06-30T23:59:59.999Z",
        }),
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      5,
      "http://localhost:4000/classrooms/classroom_1/students?membershipStatus=ACTIVE&search=23CS001",
      expect.objectContaining({
        method: "GET",
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      6,
      "http://localhost:4000/classrooms/classroom_1/students",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          studentIdentifier: "23CS002",
          membershipStatus: "PENDING",
        }),
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      7,
      "http://localhost:4000/classrooms/classroom_1/students/enrollment_2",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          membershipStatus: "BLOCKED",
        }),
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      8,
      "http://localhost:4000/classrooms/classroom_1/students/enrollment_2",
      expect.objectContaining({
        method: "DELETE",
      }),
    )
  })

  it("validates classroom CRUD payload aliases before sending them", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: "classroom_1",
          semesterId: "semester_1",
          classId: "class_1",
          sectionId: "section_1",
          subjectId: "subject_1",
          primaryTeacherId: "teacher_1",
          primaryTeacherDisplayName: "Prof. Teacher",
          createdByUserId: "teacher_1",
          code: "CSE6-MATH-A",
          courseCode: "CSE6-MATH-A",
          displayTitle: "Mathematics",
          classroomTitle: "Mathematics",
          semesterCode: "SEM6-2026",
          semesterTitle: "Semester 6",
          classCode: "CSE6",
          classTitle: "Computer Science 6",
          sectionCode: "A",
          sectionTitle: "Section A",
          subjectCode: "MATH101",
          subjectTitle: "Mathematics",
          status: "DRAFT",
          defaultAttendanceMode: "QR_GPS",
          defaultGpsRadiusMeters: 100,
          defaultSessionDurationMinutes: 15,
          qrRotationWindowSeconds: 15,
          bluetoothRotationWindowSeconds: 10,
          timezone: "Asia/Kolkata",
          requiresTrustedDevice: true,
          archivedAt: null,
          activeJoinCode: null,
          permissions: {
            canEdit: true,
            canArchive: true,
            canEditCourseInfo: true,
            canEditAcademicScope: false,
            canReassignTeacher: false,
          },
          scheduleSlots: [],
          scheduleExceptions: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "classroom_1",
          semesterId: "semester_1",
          classId: "class_1",
          sectionId: "section_1",
          subjectId: "subject_1",
          primaryTeacherId: "teacher_1",
          primaryTeacherDisplayName: "Prof. Teacher",
          createdByUserId: "teacher_1",
          code: "CSE6-MATH-B",
          courseCode: "CSE6-MATH-B",
          displayTitle: "Mathematics Advanced",
          classroomTitle: "Mathematics Advanced",
          semesterCode: "SEM6-2026",
          semesterTitle: "Semester 6",
          classCode: "CSE6",
          classTitle: "Computer Science 6",
          sectionCode: "A",
          sectionTitle: "Section A",
          subjectCode: "MATH101",
          subjectTitle: "Mathematics",
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
          permissions: {
            canEdit: true,
            canArchive: true,
            canEditCourseInfo: true,
            canEditAcademicScope: false,
            canReassignTeacher: false,
          },
          scheduleSlots: [],
          scheduleExceptions: [],
        }),
      })

    const client = createAuthApiClient({
      baseUrl: "http://localhost:4000",
      fetcher,
    })

    await client.createClassroom("token_teacher", {
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      courseCode: "CSE6-MATH-A",
      classroomTitle: "Mathematics",
    })
    await client.updateClassroom("token_teacher", "classroom_1", {
      courseCode: "CSE6-MATH-B",
      classroomTitle: "Mathematics Advanced",
      status: "ACTIVE",
    })

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "http://localhost:4000/classrooms",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          semesterId: "semester_1",
          classId: "class_1",
          sectionId: "section_1",
          subjectId: "subject_1",
          courseCode: "CSE6-MATH-A",
          classroomTitle: "Mathematics",
        }),
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "http://localhost:4000/classrooms/classroom_1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          courseCode: "CSE6-MATH-B",
          classroomTitle: "Mathematics Advanced",
          status: "ACTIVE",
        }),
      }),
    )

    expect(() =>
      client.updateClassroom("token_teacher", "classroom_1", {
        code: "CSE6-MATH-C",
        courseCode: "CSE6-MATH-D",
      } as never),
    ).toThrow(/Course code must match/)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it("calls classroom stream and roster import endpoints with the expected routes", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          {
            id: "announcement_1",
            courseOfferingId: "classroom_1",
            authorUserId: "teacher_1",
            authorDisplayName: "Prof. Anurag Agarwal",
            postType: "ANNOUNCEMENT",
            visibility: "STUDENT_AND_TEACHER",
            title: "Welcome",
            body: "Check the stream before class.",
            shouldNotify: true,
            createdAt: "2026-03-14T09:00:00.000Z",
            editedAt: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: "announcement_2",
          courseOfferingId: "classroom_1",
          authorUserId: "teacher_1",
          authorDisplayName: "Prof. Anurag Agarwal",
          postType: "ANNOUNCEMENT",
          visibility: "STUDENT_AND_TEACHER",
          title: "Reminder",
          body: "Bring your trusted device.",
          shouldNotify: true,
          createdAt: "2026-03-14T09:10:00.000Z",
          editedAt: null,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          {
            id: "job_1",
            courseOfferingId: "classroom_1",
            requestedByUserId: "teacher_1",
            sourceFileKey: "inline://roster-imports/job_1.csv",
            sourceFileName: "roster.csv",
            status: "REVIEW_REQUIRED",
            totalRows: 2,
            validRows: 1,
            invalidRows: 1,
            appliedRows: 0,
            startedAt: "2026-03-14T09:15:00.000Z",
            completedAt: "2026-03-14T09:16:00.000Z",
            reviewedAt: null,
            createdAt: "2026-03-14T09:14:00.000Z",
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: "job_1",
          courseOfferingId: "classroom_1",
          requestedByUserId: "teacher_1",
          sourceFileKey: "inline://roster-imports/job_1.csv",
          sourceFileName: "roster.csv",
          status: "UPLOADED",
          totalRows: 2,
          validRows: 0,
          invalidRows: 0,
          appliedRows: 0,
          startedAt: null,
          completedAt: null,
          reviewedAt: null,
          createdAt: "2026-03-14T09:14:00.000Z",
          rows: [
            {
              id: "row_1",
              jobId: "job_1",
              rowNumber: 1,
              studentEmail: "student.one@attendease.dev",
              studentRollNumber: null,
              parsedName: "Student One",
              status: "PENDING",
              errorMessage: null,
              resolvedStudentId: null,
            },
            {
              id: "row_2",
              jobId: "job_1",
              rowNumber: 2,
              studentEmail: "missing@attendease.dev",
              studentRollNumber: null,
              parsedName: "Missing Student",
              status: "PENDING",
              errorMessage: null,
              resolvedStudentId: null,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "job_1",
          courseOfferingId: "classroom_1",
          requestedByUserId: "teacher_1",
          sourceFileKey: "inline://roster-imports/job_1.csv",
          sourceFileName: "roster.csv",
          status: "APPLIED",
          totalRows: 2,
          validRows: 1,
          invalidRows: 1,
          appliedRows: 1,
          startedAt: "2026-03-14T09:15:00.000Z",
          completedAt: "2026-03-14T09:18:00.000Z",
          reviewedAt: "2026-03-14T09:18:00.000Z",
          createdAt: "2026-03-14T09:14:00.000Z",
          rows: [
            {
              id: "row_1",
              jobId: "job_1",
              rowNumber: 1,
              studentEmail: "student.one@attendease.dev",
              studentRollNumber: null,
              parsedName: "Student One",
              status: "APPLIED",
              errorMessage: null,
              resolvedStudentId: "student_1",
            },
            {
              id: "row_2",
              jobId: "job_1",
              rowNumber: 2,
              studentEmail: "missing@attendease.dev",
              studentRollNumber: null,
              parsedName: "Missing Student",
              status: "INVALID",
              errorMessage: "Student could not be resolved from the provided identifiers.",
              resolvedStudentId: null,
            },
          ],
        }),
      })

    const client = createAuthApiClient({
      baseUrl: "http://localhost:4000",
      fetcher,
    })

    await client.listClassroomAnnouncements("token_student", "classroom_1", {
      limit: 10,
    })
    await client.createClassroomAnnouncement("token_teacher", "classroom_1", {
      title: "Reminder",
      body: "Bring your trusted device.",
      shouldNotify: true,
    })
    await client.listRosterImportJobs("token_teacher", "classroom_1", {
      status: "REVIEW_REQUIRED",
    })
    await client.createRosterImportJob("token_teacher", "classroom_1", {
      sourceFileName: "roster.csv",
      rows: [
        {
          studentEmail: "student.one@attendease.dev",
          parsedName: "Student One",
        },
        {
          studentEmail: "missing@attendease.dev",
          parsedName: "Missing Student",
        },
      ],
    })
    await client.applyRosterImportJob("token_teacher", "classroom_1", "job_1")

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "http://localhost:4000/classrooms/classroom_1/stream?limit=10",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          authorization: "Bearer token_student",
        }),
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "http://localhost:4000/classrooms/classroom_1/announcements",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          title: "Reminder",
          body: "Bring your trusted device.",
          shouldNotify: true,
        }),
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      3,
      "http://localhost:4000/classrooms/classroom_1/roster-imports?status=REVIEW_REQUIRED",
      expect.objectContaining({
        method: "GET",
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      4,
      "http://localhost:4000/classrooms/classroom_1/roster-imports",
      expect.objectContaining({
        method: "POST",
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      5,
      "http://localhost:4000/classrooms/classroom_1/roster-imports/job_1/apply",
      expect.objectContaining({
        method: "POST",
      }),
    )
  })

  it("raises a structured client error for non-OK responses", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        message: "Forbidden",
      }),
    })

    const client = createAuthApiClient({
      baseUrl: "http://localhost:4000",
      fetcher,
    })

    await expect(
      client.exchangeGoogleIdentity({
        idToken: "teacher-google-token",
        platform: "WEB",
        requestedRole: "TEACHER",
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: "AuthApiClientError",
        message: "Auth API request failed.",
        status: 403,
        details: {
          message: "Forbidden",
        },
      }),
    )
  })

  it("calls the shared session history, detail, and student-list routes", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          {
            id: "session_1",
            classroomId: "classroom_1",
            classroomCode: "CSE6-MATH-A",
            classroomDisplayTitle: "Maths",
            lectureId: "lecture_1",
            lectureTitle: "Lecture 1",
            lectureDate: "2026-03-14T10:00:00.000Z",
            teacherAssignmentId: "assignment_1",
            mode: "QR_GPS",
            status: "ENDED",
            startedAt: "2026-03-14T10:00:00.000Z",
            scheduledEndAt: "2026-03-14T10:20:00.000Z",
            endedAt: "2026-03-14T10:20:00.000Z",
            editableUntil: "2026-03-15T10:20:00.000Z",
            classId: "class_1",
            classCode: "CSE6",
            classTitle: "B.Tech CSE 6th Sem",
            sectionId: "section_1",
            sectionCode: "A",
            sectionTitle: "Section A",
            subjectId: "subject_1",
            subjectCode: "MATH101",
            subjectTitle: "Mathematics",
            presentCount: 3,
            absentCount: 1,
            editability: {
              isEditable: true,
              state: "OPEN",
              endedAt: "2026-03-14T10:20:00.000Z",
              editableUntil: "2026-03-15T10:20:00.000Z",
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "session_1",
          classroomId: "classroom_1",
          lectureId: "lecture_1",
          teacherAssignmentId: "assignment_1",
          mode: "QR_GPS",
          status: "ENDED",
          startedAt: "2026-03-14T10:00:00.000Z",
          scheduledEndAt: "2026-03-14T10:20:00.000Z",
          endedAt: "2026-03-14T10:20:00.000Z",
          editableUntil: "2026-03-15T10:20:00.000Z",
          durationSeconds: 1200,
          anchorType: "TEACHER_SELECTED",
          anchorLatitude: 28.6139,
          anchorLongitude: 77.209,
          anchorLabel: "Room 101",
          gpsRadiusMeters: 120,
          qrRotationWindowSeconds: 15,
          bluetoothRotationWindowSeconds: null,
          blePublicId: null,
          bleProtocolVersion: null,
          rosterSnapshotCount: 4,
          presentCount: 3,
          absentCount: 1,
          currentQrPayload: null,
          currentQrExpiresAt: null,
          classroomCode: "CSE6-MATH-A",
          classroomDisplayTitle: "Maths",
          lectureTitle: "Lecture 1",
          lectureDate: "2026-03-14T10:00:00.000Z",
          teacherId: "teacher_1",
          teacherDisplayName: "Prof. Anurag Agarwal",
          teacherEmail: "teacher@attendease.dev",
          semesterCode: "SEM6",
          semesterTitle: "Semester 6",
          classCode: "CSE6",
          classTitle: "B.Tech CSE 6th Sem",
          sectionCode: "A",
          sectionTitle: "Section A",
          subjectCode: "MATH101",
          subjectTitle: "Mathematics",
          editability: {
            isEditable: true,
            state: "OPEN",
            endedAt: "2026-03-14T10:20:00.000Z",
            editableUntil: "2026-03-15T10:20:00.000Z",
          },
          suspiciousAttemptCount: 0,
          blockedUntrustedDeviceCount: 0,
          locationValidationFailureCount: 0,
          bluetoothValidationFailureCount: 0,
          revokedDeviceAttemptCount: 0,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          {
            attendanceRecordId: "record_1",
            enrollmentId: "enrollment_1",
            studentId: "student_1",
            studentDisplayName: "Student One",
            studentEmail: "student1@attendease.dev",
            studentRollNumber: "BT23CSE001",
            status: "PRESENT",
            markedAt: "2026-03-14T10:01:00.000Z",
          },
        ],
      })

    const client = createAuthApiClient({
      baseUrl: "http://localhost:4000",
      fetcher,
    })

    await expect(
      client.listAttendanceSessions("teacher_token", {
        classId: "class_1",
        from: "2026-03-01T00:00:00.000Z",
        to: "2026-03-31T23:59:59.999Z",
      }),
    ).resolves.toHaveLength(1)

    await expect(
      client.getAttendanceSessionDetail("teacher_token", "session_1"),
    ).resolves.toMatchObject({
      id: "session_1",
      classroomDisplayTitle: "Maths",
      editability: {
        state: "OPEN",
      },
    })

    await expect(
      client.listAttendanceSessionStudents("teacher_token", "session_1"),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          studentId: "student_1",
          status: "PRESENT",
        }),
      ]),
    )

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "http://localhost:4000/sessions?classId=class_1&from=2026-03-01T00%3A00%3A00.000Z&to=2026-03-31T23%3A59%3A59.999Z",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          authorization: "Bearer teacher_token",
        }),
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "http://localhost:4000/sessions/session_1",
      expect.objectContaining({
        method: "GET",
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      3,
      "http://localhost:4000/sessions/session_1/students",
      expect.objectContaining({
        method: "GET",
      }),
    )
  })

  it("calls the manual attendance edit route and returns the refreshed session payload", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        appliedChangeCount: 2,
        session: {
          id: "session_1",
          classroomId: "classroom_1",
          lectureId: "lecture_1",
          teacherAssignmentId: "assignment_1",
          mode: "QR_GPS",
          status: "ENDED",
          startedAt: "2026-03-14T10:00:00.000Z",
          scheduledEndAt: "2026-03-14T10:20:00.000Z",
          endedAt: "2026-03-14T10:20:00.000Z",
          editableUntil: "2026-03-15T10:20:00.000Z",
          durationSeconds: 1200,
          anchorType: "TEACHER_SELECTED",
          anchorLatitude: 28.6139,
          anchorLongitude: 77.209,
          anchorLabel: "Room 101",
          gpsRadiusMeters: 120,
          qrRotationWindowSeconds: 15,
          bluetoothRotationWindowSeconds: null,
          blePublicId: null,
          bleProtocolVersion: null,
          rosterSnapshotCount: 4,
          presentCount: 2,
          absentCount: 2,
          currentQrPayload: null,
          currentQrExpiresAt: null,
          classroomCode: "CSE6-MATH-A",
          classroomDisplayTitle: "Maths",
          lectureTitle: "Lecture 1",
          lectureDate: "2026-03-14T10:00:00.000Z",
          teacherId: "teacher_1",
          teacherDisplayName: "Prof. Anurag Agarwal",
          teacherEmail: "teacher@attendease.dev",
          semesterCode: "SEM6",
          semesterTitle: "Semester 6",
          classCode: "CSE6",
          classTitle: "B.Tech CSE 6th Sem",
          sectionCode: "A",
          sectionTitle: "Section A",
          subjectCode: "MATH101",
          subjectTitle: "Mathematics",
          editability: {
            isEditable: true,
            state: "OPEN",
            endedAt: "2026-03-14T10:20:00.000Z",
            editableUntil: "2026-03-15T10:20:00.000Z",
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
            studentEmail: "student1@attendease.dev",
            studentRollNumber: "BT23CSE001",
            status: "PRESENT",
            markedAt: "2026-03-14T10:01:00.000Z",
          },
          {
            attendanceRecordId: "record_2",
            enrollmentId: "enrollment_2",
            studentId: "student_2",
            studentDisplayName: "Student Two",
            studentEmail: "student2@attendease.dev",
            studentRollNumber: "BT23CSE002",
            status: "ABSENT",
            markedAt: null,
          },
        ],
      }),
    })

    const client = createAuthApiClient({
      baseUrl: "http://localhost:4000",
      fetcher,
    })

    await expect(
      client.updateAttendanceSessionAttendance("teacher_token", "session_1", {
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
      }),
    ).resolves.toMatchObject({
      appliedChangeCount: 2,
      session: {
        id: "session_1",
        presentCount: 2,
        absentCount: 2,
      },
      students: expect.arrayContaining([
        expect.objectContaining({
          attendanceRecordId: "record_1",
          status: "PRESENT",
        }),
      ]),
    })

    expect(fetcher).toHaveBeenCalledWith(
      "http://localhost:4000/sessions/session_1/attendance",
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({
          authorization: "Bearer teacher_token",
        }),
        body: JSON.stringify({
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
        }),
      }),
    )
  })

  it("calls the student history and report endpoints with the expected query strings", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          {
            attendanceDate: "2026-03-10T00:00:00.000Z",
            classroomId: "classroom_1",
            classroomCode: "CSE6-MATH-A",
            classroomDisplayTitle: "Maths",
            classId: "class_1",
            classCode: "BTECH-CSE",
            classTitle: "B.Tech CSE",
            sectionId: "section_1",
            sectionCode: "A",
            sectionTitle: "Section A",
            subjectId: "subject_1",
            subjectCode: "MATH101",
            subjectTitle: "Mathematics",
            sessionCount: 1,
            totalStudents: 4,
            presentCount: 3,
            absentCount: 1,
            attendancePercentage: 75,
            lastSessionAt: "2026-03-10T03:45:00.000Z",
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          {
            attendanceRecordId: "record_1",
            sessionId: "session_1",
            classroomId: "classroom_1",
            classroomCode: "CSE6-MATH-A",
            classroomDisplayTitle: "Maths",
            lectureId: "lecture_1",
            lectureTitle: "Linear Algebra",
            lectureDate: "2026-03-10T03:30:00.000Z",
            mode: "QR_GPS",
            sessionStatus: "ENDED",
            attendanceStatus: "PRESENT",
            markSource: "QR_GPS",
            markedAt: "2026-03-10T03:45:00.000Z",
            startedAt: "2026-03-10T03:30:00.000Z",
            endedAt: "2026-03-10T04:00:00.000Z",
            subjectId: "subject_1",
            subjectCode: "MATH101",
            subjectTitle: "Mathematics",
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          studentId: "student_1",
          trackedClassroomCount: 2,
          totalSessions: 1,
          presentSessions: 1,
          absentSessions: 0,
          attendancePercentage: 100,
          lastSessionAt: "2026-03-10T03:45:00.000Z",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          {
            subjectId: "subject_1",
            subjectCode: "MATH101",
            subjectTitle: "Mathematics",
            classroomCount: 1,
            totalSessions: 1,
            presentSessions: 1,
            absentSessions: 0,
            attendancePercentage: 100,
            lastSessionAt: "2026-03-10T03:45:00.000Z",
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          subjectId: "subject_1",
          subjectCode: "MATH101",
          subjectTitle: "Mathematics",
          classroomCount: 1,
          totalSessions: 1,
          presentSessions: 1,
          absentSessions: 0,
          attendancePercentage: 100,
          lastSessionAt: "2026-03-10T03:45:00.000Z",
          classrooms: [
            {
              classroomId: "classroom_1",
              classroomCode: "CSE6-MATH-A",
              classroomDisplayTitle: "Maths",
              totalSessions: 1,
              presentSessions: 1,
              absentSessions: 0,
              attendancePercentage: 100,
              lastSessionAt: "2026-03-10T03:45:00.000Z",
            },
          ],
        }),
      })

    const client = createAuthApiClient({
      baseUrl: "http://localhost:4000",
      fetcher,
    })

    await client.listTeacherDaywiseReports("teacher_token", {
      classroomId: "classroom_1",
      from: "2026-03-01T00:00:00.000Z",
      to: "2026-03-31T23:59:59.999Z",
    })
    await client.listStudentAttendanceHistory("student_token", {
      subjectId: "subject_1",
    })
    await client.getStudentReportOverview("student_token")
    await client.listStudentSubjectReports("student_token")
    await client.getStudentSubjectReport("student_token", "subject_1")

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "http://localhost:4000/reports/daywise?classroomId=classroom_1&from=2026-03-01T00%3A00%3A00.000Z&to=2026-03-31T23%3A59%3A59.999Z",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          authorization: "Bearer teacher_token",
        }),
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "http://localhost:4000/students/me/history?subjectId=subject_1",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          authorization: "Bearer student_token",
        }),
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      3,
      "http://localhost:4000/students/me/reports/overview",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          authorization: "Bearer student_token",
        }),
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      4,
      "http://localhost:4000/students/me/reports/subjects",
      expect.objectContaining({
        method: "GET",
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      5,
      "http://localhost:4000/students/me/reports/subjects/subject_1",
      expect.objectContaining({
        method: "GET",
      }),
    )
  })

  it("calls export job routes with the expected payloads and filters", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: "export_job_1",
          jobType: "SESSION_CSV",
          status: "QUEUED",
          requestedAt: "2026-03-15T10:00:00.000Z",
          startedAt: null,
          completedAt: null,
          failedAt: null,
          errorMessage: null,
          courseOfferingId: "classroom_1",
          courseOfferingCode: "CSE6-MATH-A",
          courseOfferingDisplayTitle: "Maths",
          sessionId: "session_1",
          filterSnapshot: {
            jobType: "SESSION_CSV",
            sessionId: "session_1",
          },
          readyFileCount: 0,
          totalFileCount: 0,
          latestReadyDownloadUrl: null,
          files: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          {
            id: "export_job_1",
            jobType: "SESSION_CSV",
            status: "COMPLETED",
            requestedAt: "2026-03-15T10:00:00.000Z",
            startedAt: "2026-03-15T10:00:03.000Z",
            completedAt: "2026-03-15T10:00:08.000Z",
            failedAt: null,
            errorMessage: null,
            courseOfferingId: "classroom_1",
            courseOfferingCode: "CSE6-MATH-A",
            courseOfferingDisplayTitle: "Maths",
            sessionId: "session_1",
            filterSnapshot: {
              jobType: "SESSION_CSV",
              sessionId: "session_1",
            },
            readyFileCount: 1,
            totalFileCount: 1,
            latestReadyDownloadUrl:
              "https://downloads.attendease.dev/exports/export_job_1/session_1.csv",
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "export_job_1",
          jobType: "SESSION_CSV",
          status: "COMPLETED",
          requestedAt: "2026-03-15T10:00:00.000Z",
          startedAt: "2026-03-15T10:00:03.000Z",
          completedAt: "2026-03-15T10:00:08.000Z",
          failedAt: null,
          errorMessage: null,
          courseOfferingId: "classroom_1",
          courseOfferingCode: "CSE6-MATH-A",
          courseOfferingDisplayTitle: "Maths",
          sessionId: "session_1",
          filterSnapshot: {
            jobType: "SESSION_CSV",
            sessionId: "session_1",
          },
          readyFileCount: 1,
          totalFileCount: 1,
          latestReadyDownloadUrl:
            "https://downloads.attendease.dev/exports/export_job_1/session_1.csv",
          files: [
            {
              id: "export_file_1",
              objectKey: "exports/export_job_1/session_1.csv",
              fileName: "session_1.csv",
              mimeType: "text/csv",
              status: "READY",
              sizeBytes: 2048,
              checksumSha256: "checksum-value",
              createdAt: "2026-03-15T10:00:03.000Z",
              readyAt: "2026-03-15T10:00:08.000Z",
              expiresAt: "2026-03-18T10:00:08.000Z",
              downloadUrl: "https://downloads.attendease.dev/exports/export_job_1/session_1.csv",
            },
          ],
        }),
      })

    const client = createAuthApiClient({
      baseUrl: "http://localhost:4000",
      fetcher,
    })

    await client.createExportJob("teacher_token", {
      jobType: "SESSION_CSV",
      sessionId: "session_1",
    })
    await client.listExportJobs("teacher_token", {
      status: "COMPLETED",
    })
    await client.getExportJob("teacher_token", "export_job_1")

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "http://localhost:4000/exports",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer teacher_token",
        }),
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "http://localhost:4000/exports?status=COMPLETED",
      expect.objectContaining({
        method: "GET",
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      3,
      "http://localhost:4000/exports/export_job_1",
      expect.objectContaining({
        method: "GET",
      }),
    )
  })

  it("calls analytics and email automation endpoints with validated payloads", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          weekly: [],
          monthly: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          totalStudents: 1,
          buckets: [
            {
              bucket: "BELOW_75",
              label: "Below 75%",
              studentCount: 1,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          rule: {
            id: "rule_1",
            classroomId: "classroom_1",
            classroomCode: "CSE6-MATH-A",
            classroomDisplayTitle: "Maths",
            subjectId: "subject_1",
            subjectCode: "MATH101",
            subjectTitle: "Mathematics",
            status: "ACTIVE",
            thresholdPercent: 75,
            scheduleHourLocal: 18,
            scheduleMinuteLocal: 0,
            timezone: "Asia/Kolkata",
            templateSubject: "Attendance below {{thresholdPercent}}",
            templateBody: "Hello {{studentName}}",
            lastEvaluatedAt: null,
            lastSuccessfulRunAt: null,
            createdAt: "2026-03-15T10:00:00.000Z",
            updatedAt: "2026-03-15T10:00:00.000Z",
          },
          thresholdPercent: 75,
          recipientCount: 1,
          sampleRecipients: [],
          previewSubject: "Attendance below 75%",
          previewText: "Hello Student",
          previewHtml: "<p>Hello Student</p>",
          dateRange: null,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          dispatchRun: {
            id: "run_1",
            ruleId: "rule_1",
            classroomId: "classroom_1",
            classroomCode: "CSE6-MATH-A",
            classroomDisplayTitle: "Maths",
            triggerType: "MANUAL",
            dispatchDate: "2026-03-15T00:00:00.000Z",
            status: "QUEUED",
            targetedStudentCount: 1,
            sentCount: 0,
            failedCount: 0,
            startedAt: null,
            completedAt: null,
            failedAt: null,
            errorMessage: null,
            createdAt: "2026-03-15T10:05:00.000Z",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
      })

    const client = createAuthApiClient({
      baseUrl: "http://localhost:4000",
      fetcher,
    })

    await client.getAnalyticsTrends("teacher_token", {
      classroomId: "classroom_1",
      from: "2026-03-01T00:00:00.000Z",
      to: "2026-03-31T23:59:59.999Z",
    })
    await client.getAnalyticsDistribution("teacher_token", {
      classroomId: "classroom_1",
    })
    await client.listEmailAutomationRules("teacher_token", {
      classroomId: "classroom_1",
    })
    await client.previewLowAttendanceEmail("teacher_token", {
      ruleId: "rule_1",
    })
    await client.sendManualLowAttendanceEmail("teacher_token", {
      ruleId: "rule_1",
    })
    await client.listEmailDispatchRuns("teacher_token", {
      status: "QUEUED",
    })
    await client.listEmailLogs("teacher_token", {
      dispatchRunId: "run_1",
    })

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "http://localhost:4000/analytics/trends?classroomId=classroom_1&from=2026-03-01T00%3A00%3A00.000Z&to=2026-03-31T23%3A59%3A59.999Z",
      expect.objectContaining({
        method: "GET",
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      3,
      "http://localhost:4000/automation/email/rules?classroomId=classroom_1",
      expect.objectContaining({
        method: "GET",
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      4,
      "http://localhost:4000/automation/email/preview",
      expect.objectContaining({
        method: "POST",
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      5,
      "http://localhost:4000/automation/email/send-manual",
      expect.objectContaining({
        method: "POST",
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      6,
      "http://localhost:4000/automation/email/runs?status=QUEUED",
      expect.objectContaining({
        method: "GET",
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      7,
      "http://localhost:4000/automation/email/logs?dispatchRunId=run_1",
      expect.objectContaining({
        method: "GET",
      }),
    )
  })
})
