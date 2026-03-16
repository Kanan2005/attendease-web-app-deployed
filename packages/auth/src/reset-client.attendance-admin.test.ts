import { describe, expect, it, vi } from "vitest"

import { createAuthApiClient } from "./client.js"
import { manualAttendanceResponse } from "./reset-client.fixtures.js"

describe("reset auth api client attendance and admin aliases", () => {
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
