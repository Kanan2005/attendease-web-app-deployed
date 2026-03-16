import { describe, expect, it } from "vitest"

import {
  addClassroomStudentRequestSchema,
  adminArchiveClassroomRequestSchema,
  adminClassroomGovernanceDetailSchema,
  adminDeviceSupportDetailSchema,
  analyticsComparisonsResponseSchema,
  analyticsDistributionResponseSchema,
  analyticsModeUsageResponseSchema,
  analyticsSessionDrilldownResponseSchema,
  analyticsStudentTimelineResponseSchema,
  analyticsTrendResponseSchema,
  announcementSummarySchema,
  attendanceSessionDetailSchema,
  attendanceSessionHistoryResponseSchema,
  attendanceSessionStudentsResponseSchema,
  attendanceSessionSummarySchema,
  authGoogleExchangeRequestSchema,
  authMeResponseSchema,
  authSessionResponseSchema,
  classSessionListQuerySchema,
  classSessionSummarySchema,
  classroomDetailSchema,
  classroomRosterListQuerySchema,
  classroomRosterMemberSummarySchema,
  classroomScheduleSchema,
  classroomStudentsResponseSchema,
  createAnnouncementRequestSchema,
  createBluetoothSessionRequestSchema,
  createClassSessionRequestSchema,
  createClassroomRequestSchema,
  createExportJobRequestSchema,
  createRosterImportJobRequestSchema,
  createScheduleExceptionRequestSchema,
  createScheduleSlotRequestSchema,
  deviceRegistrationResponseSchema,
  emailAutomationRuleResponseSchema,
  emailDispatchRunSummarySchema,
  emailLogSummarySchema,
  exportJobDetailSchema,
  healthCheckResponseSchema,
  joinClassroomRequestSchema,
  lectureSummarySchema,
  lowAttendanceEmailPreviewResponseSchema,
  manualLowAttendanceEmailSendResponseSchema,
  markBluetoothAttendanceRequestSchema,
  markBluetoothAttendanceResponseSchema,
  markQrAttendanceRequestSchema,
  markQrAttendanceResponseSchema,
  queueHealthResponseSchema,
  readinessCheckResponseSchema,
  resetClassroomJoinCodeRequestSchema,
  rollingBluetoothTokenPayloadSchema,
  rollingQrTokenPayloadSchema,
  rosterImportJobDetailSchema,
  saveAndNotifyScheduleRequestSchema,
  semesterSummarySchema,
  studentAttendanceHistoryResponseSchema,
  studentClassroomMembershipSummarySchema,
  studentMembershipSummarySchema,
  studentReportOverviewSchema,
  studentSubjectReportDetailSchema,
  studentSubjectReportSummarySchema,
  teacherDaywiseAttendanceReportRowSchema,
  teacherStudentAttendancePercentageReportRowSchema,
  teacherSubjectwiseAttendanceReportRowSchema,
  updateClassroomRequestSchema,
  updateClassroomStudentRequestSchema,
} from "./index"

describe("health contracts", () => {
  it("accepts valid health payloads", () => {
    const parsed = healthCheckResponseSchema.parse({
      service: "api",
      status: "ok",
      version: "0.1.0",
      timestamp: "2026-03-14T00:00:00.000Z",
    })

    expect(parsed.service).toBe("api")
  })

  it("accepts readiness and queue health payloads", () => {
    const readiness = readinessCheckResponseSchema.parse({
      service: "api",
      status: "ready",
      version: "0.1.0",
      timestamp: "2026-03-15T00:00:00.000Z",
      checks: [
        {
          name: "database",
          status: "up",
          latencyMs: 12,
          details: null,
        },
        {
          name: "feature-flags",
          status: "up",
          latencyMs: null,
          details: "bluetooth=on,automation=on,strictDeviceBinding=enforce",
        },
      ],
    })
    const queueHealth = queueHealthResponseSchema.parse({
      service: "api",
      status: "degraded",
      version: "0.1.0",
      timestamp: "2026-03-15T00:00:00.000Z",
      queues: [
        {
          name: "exports",
          status: "backlogged",
          queuedCount: 12,
          processingCount: 1,
          failedCount: 0,
          staleCount: 0,
          oldestQueuedAt: "2026-03-15T00:00:00.000Z",
        },
      ],
    })

    expect(readiness.status).toBe("ready")
    expect(queueHealth.queues[0]?.name).toBe("exports")
  })

  it("accepts auth session and me payloads with academic scope data", () => {
    const authSession = authSessionResponseSchema.parse({
      user: {
        id: "user_1",
        email: "teacher@attendease.dev",
        displayName: "Prof. AttendEase",
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
        accessToken: "access-token-value-12345",
        accessTokenExpiresAt: "2026-03-14T10:00:00.000Z",
        refreshToken: "refresh-token-value-12345",
        refreshTokenExpiresAt: "2026-04-13T10:00:00.000Z",
      },
    })

    const me = authMeResponseSchema.parse({
      user: authSession.user,
      assignments: [
        {
          id: "assignment_1",
          teacherId: "user_1",
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
      enrollments: [],
    })

    expect(authSession.user.activeRole).toBe("TEACHER")
    expect(me.assignments).toHaveLength(1)
  })

  it("requires a Google identity exchange input", () => {
    const parsed = authGoogleExchangeRequestSchema.parse({
      platform: "MOBILE",
      requestedRole: "STUDENT",
      idToken: "x".repeat(32),
    })

    expect(parsed.platform).toBe("MOBILE")
  })

  it("accepts device registration responses with trusted-device context", () => {
    const parsed = deviceRegistrationResponseSchema.parse({
      device: {
        id: "device_1",
        installId: "install-device-one",
        platform: "ANDROID",
        deviceModel: "Pixel 8",
        osVersion: "Android 15",
        appVersion: "0.1.0",
        publicKey: "public-key-device-one",
        attestationStatus: "UNKNOWN",
        attestationProvider: "PLAY_INTEGRITY",
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
    })

    expect(parsed.device.platform).toBe("ANDROID")
    expect(parsed.binding?.status).toBe("ACTIVE")
  })

  it("accepts analytics payloads for trends, distributions, comparisons, modes, and drill-downs", () => {
    const trends = analyticsTrendResponseSchema.parse({
      weekly: [
        {
          periodKey: "2026-W10",
          label: "Week of Mar 09, 2026",
          startDate: "2026-03-09T00:00:00.000Z",
          endDate: "2026-03-15T00:00:00.000Z",
          sessionCount: 2,
          totalStudents: 8,
          presentCount: 6,
          absentCount: 2,
          attendancePercentage: 75,
        },
      ],
      monthly: [
        {
          periodKey: "2026-03",
          label: "Mar 2026",
          startDate: "2026-03-01T00:00:00.000Z",
          endDate: "2026-03-31T00:00:00.000Z",
          sessionCount: 2,
          totalStudents: 8,
          presentCount: 6,
          absentCount: 2,
          attendancePercentage: 75,
        },
      ],
    })
    const distribution = analyticsDistributionResponseSchema.parse({
      totalStudents: 4,
      buckets: [
        {
          bucket: "ABOVE_90",
          label: "Above 90%",
          studentCount: 1,
        },
        {
          bucket: "BETWEEN_75_AND_90",
          label: "75% to 90%",
          studentCount: 2,
        },
        {
          bucket: "BELOW_75",
          label: "Below 75%",
          studentCount: 1,
        },
      ],
    })
    const comparisons = analyticsComparisonsResponseSchema.parse({
      classrooms: [
        {
          classroomId: "classroom_1",
          classroomCode: "MATH6A",
          classroomDisplayTitle: "Maths",
          totalSessions: 2,
          presentCount: 6,
          absentCount: 2,
          attendancePercentage: 75,
        },
      ],
      subjects: [
        {
          subjectId: "subject_1",
          subjectCode: "MATH101",
          subjectTitle: "Mathematics",
          totalSessions: 2,
          presentCount: 6,
          absentCount: 2,
          attendancePercentage: 75,
        },
      ],
    })
    const modes = analyticsModeUsageResponseSchema.parse({
      totals: [
        {
          mode: "QR_GPS",
          sessionCount: 1,
          markedCount: 3,
        },
      ],
      trend: [
        {
          usageDate: "2026-03-10T00:00:00.000Z",
          mode: "QR_GPS",
          sessionCount: 1,
          markedCount: 3,
        },
      ],
    })
    const timeline = analyticsStudentTimelineResponseSchema.parse([
      {
        sessionId: "session_1",
        classroomId: "classroom_1",
        classroomCode: "MATH6A",
        classroomDisplayTitle: "Maths",
        subjectId: "subject_1",
        subjectCode: "MATH101",
        subjectTitle: "Mathematics",
        lectureId: "lecture_1",
        lectureTitle: "Lecture 1",
        lectureDate: "2026-03-10T00:00:00.000Z",
        mode: "QR_GPS",
        sessionStatus: "ENDED",
        attendanceStatus: "PRESENT",
        markedAt: "2026-03-10T03:35:00.000Z",
        startedAt: "2026-03-10T03:30:00.000Z",
        endedAt: "2026-03-10T03:45:00.000Z",
      },
    ])
    const drilldown = analyticsSessionDrilldownResponseSchema.parse({
      session: {
        id: "session_1",
        classroomId: "classroom_1",
        lectureId: "lecture_1",
        teacherAssignmentId: "assignment_1",
        mode: "QR_GPS",
        status: "ENDED",
        startedAt: "2026-03-10T03:30:00.000Z",
        scheduledEndAt: "2026-03-10T03:45:00.000Z",
        endedAt: "2026-03-10T03:45:00.000Z",
        editableUntil: "2026-03-11T03:45:00.000Z",
        durationSeconds: 900,
        anchorType: "CLASSROOM_FIXED",
        anchorLatitude: 28.61,
        anchorLongitude: 77.2,
        anchorLabel: "Room 101",
        gpsRadiusMeters: 100,
        qrRotationWindowSeconds: 15,
        bluetoothRotationWindowSeconds: null,
        blePublicId: null,
        bleProtocolVersion: null,
        rosterSnapshotCount: 4,
        presentCount: 3,
        absentCount: 1,
        currentQrPayload: null,
        currentQrExpiresAt: null,
        classroomCode: "MATH6A",
        classroomDisplayTitle: "Maths",
        lectureTitle: "Lecture 1",
        lectureDate: "2026-03-10T00:00:00.000Z",
        teacherId: "teacher_1",
        teacherDisplayName: "Teacher",
        teacherEmail: "teacher@attendease.dev",
        semesterCode: "SEM6",
        semesterTitle: "Semester 6",
        classCode: "CSE",
        classTitle: "B.Tech CSE",
        sectionCode: "A",
        sectionTitle: "Section A",
        subjectCode: "MATH101",
        subjectTitle: "Mathematics",
        editability: {
          isEditable: true,
          state: "OPEN",
          endedAt: "2026-03-10T03:45:00.000Z",
          editableUntil: "2026-03-11T03:45:00.000Z",
        },
        suspiciousAttemptCount: 1,
        blockedUntrustedDeviceCount: 0,
        locationValidationFailureCount: 1,
        bluetoothValidationFailureCount: 0,
        revokedDeviceAttemptCount: 0,
      },
      students: [
        {
          attendanceRecordId: "record_1",
          enrollmentId: "enrollment_1",
          studentId: "student_1",
          studentDisplayName: "Student One",
          studentEmail: "student@attendease.dev",
          studentRollNumber: "23CS001",
          status: "PRESENT",
          markedAt: "2026-03-10T03:35:00.000Z",
        },
      ],
    })

    expect(trends.weekly).toHaveLength(1)
    expect(distribution.totalStudents).toBe(4)
    expect(comparisons.classrooms[0]?.classroomCode).toBe("MATH6A")
    expect(modes.trend[0]?.mode).toBe("QR_GPS")
    expect(timeline[0]?.attendanceStatus).toBe("PRESENT")
    expect(drilldown.students[0]?.studentId).toBe("student_1")
  })

  it("accepts email automation payloads for rules, previews, runs, and logs", () => {
    const rule = emailAutomationRuleResponseSchema.parse({
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
    })
    const preview = lowAttendanceEmailPreviewResponseSchema.parse({
      rule,
      thresholdPercent: 75,
      recipientCount: 1,
      sampleRecipients: [
        {
          studentId: "student_1",
          studentEmail: "student.one@attendease.dev",
          studentDisplayName: "Student One",
          studentRollNumber: "23CS001",
          attendancePercentage: 60,
        },
      ],
      previewSubject: "[AttendEase development] Attendance below 75.00%",
      previewText: "Hello Student One",
      previewHtml: "<p>Hello Student One</p>",
      dateRange: {
        from: "2026-03-01T00:00:00.000Z",
        to: "2026-03-31T23:59:59.999Z",
      },
    })
    const run = emailDispatchRunSummarySchema.parse({
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
    })
    const send = manualLowAttendanceEmailSendResponseSchema.parse({
      dispatchRun: run,
    })
    const log = emailLogSummarySchema.parse({
      id: "log_1",
      dispatchRunId: "run_1",
      ruleId: "rule_1",
      classroomId: "classroom_1",
      classroomCode: "CSE6-MATH-A",
      classroomDisplayTitle: "Maths",
      recipientEmail: "student.one@attendease.dev",
      studentId: "student_1",
      studentDisplayName: "Student One",
      status: "SENT",
      subject: "Attendance below threshold",
      failureReason: null,
      providerMessageId: "provider_1",
      triggerType: "MANUAL",
      sentAt: "2026-03-15T10:06:00.000Z",
      createdAt: "2026-03-15T10:05:00.000Z",
    })

    expect(preview.rule.id).toBe("rule_1")
    expect(send.dispatchRun.status).toBe("QUEUED")
    expect(log.status).toBe("SENT")
  })

  it("accepts admin device-support detail payloads", () => {
    const parsed = adminDeviceSupportDetailSchema.parse({
      student: {
        id: "student_1",
        email: "student.one@attendease.dev",
        displayName: "Student One",
        rollNumber: "23CS001",
        status: "ACTIVE",
        attendanceDisabled: false,
      },
      attendanceDeviceState: "TRUSTED",
      bindings: [
        {
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
        },
      ],
      securityEvents: [],
      adminActions: [
        {
          id: "admin_action_1",
          adminUserId: "admin_1",
          targetUserId: null,
          targetDeviceId: null,
          targetBindingId: null,
          actionType: "CLASSROOM_ARCHIVE",
          metadata: {
            classroomId: "classroom_1",
            previousStatus: "ACTIVE",
            nextStatus: "ARCHIVED",
          },
          createdAt: "2026-03-15T10:10:00.000Z",
        },
      ],
      recovery: {
        activeBindingCount: 1,
        pendingBindingCount: 0,
        revokedBindingCount: 0,
        blockedBindingCount: 0,
        currentDeviceLabel: "install-device-one",
        pendingReplacementLabel: null,
        latestRiskEvent: null,
        latestRecoveryAction: {
          id: "admin_action_2",
          adminUserId: "admin_1",
          targetUserId: "student_1",
          targetDeviceId: "device_1",
          targetBindingId: "binding_1",
          actionType: "DEVICE_REVOKE",
          metadata: {
            reason: "Device lost",
          },
          createdAt: "2026-03-15T10:20:00.000Z",
        },
        recommendedAction: "NO_ACTION_REQUIRED",
        recommendedActionLabel: "Current phone remains trusted",
        recommendedActionMessage:
          "Only the active attendance phone can mark attendance right now. Deregister it only after the student request is verified.",
        strictPolicyNote:
          "One-device enforcement stays strict: any second phone stays blocked until support approves a replacement or the current phone is deregistered.",
        actions: {
          canDeregisterCurrentDevice: true,
          canApproveReplacementDevice: true,
          canRevokeActiveBinding: true,
        },
      },
    })

    expect(parsed.student.rollNumber).toBe("23CS001")
    expect(parsed.bindings[0]?.device.installId).toBe("install-device-one")
    expect(parsed.adminActions[0]?.actionType).toBe("CLASSROOM_ARCHIVE")
    expect(parsed.recovery.currentDeviceLabel).toBe("install-device-one")
  })

  it("accepts semester, classroom, and lecture academic payloads", () => {
    const semester = semesterSummarySchema.parse({
      id: "semester_1",
      academicTermId: "term_1",
      code: "SEM6-2026",
      title: "Semester 6",
      ordinal: 6,
      status: "ACTIVE",
      startDate: "2026-01-01T00:00:00.000Z",
      endDate: "2026-06-30T00:00:00.000Z",
      attendanceCutoffDate: "2026-06-20T00:00:00.000Z",
    })
    const classroom = classroomDetailSchema.parse({
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
      semesterCode: "SEM6-2026",
      semesterTitle: "Semester 6",
      classCode: "CSE6",
      classTitle: "Computer Science 6",
      sectionCode: "A",
      sectionTitle: "Section A",
      subjectCode: "MATH101",
      subjectTitle: "Mathematics",
      primaryTeacherDisplayName: "Prof. Teacher",
      status: "ACTIVE",
      defaultAttendanceMode: "QR_GPS",
      defaultGpsRadiusMeters: 100,
      defaultSessionDurationMinutes: 15,
      qrRotationWindowSeconds: 15,
      bluetoothRotationWindowSeconds: 10,
      timezone: "Asia/Kolkata",
      requiresTrustedDevice: true,
      archivedAt: null,
      activeJoinCode: {
        id: "join_1",
        courseOfferingId: "classroom_1",
        code: "MATH6A",
        status: "ACTIVE",
        expiresAt: "2026-06-30T23:59:59.999Z",
      },
      permissions: {
        canEdit: true,
        canArchive: true,
        canEditCourseInfo: true,
        canEditAcademicScope: false,
        canReassignTeacher: false,
      },
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
      scheduleExceptions: [],
    })
    const lecture = lectureSummarySchema.parse({
      id: "lecture_1",
      courseOfferingId: "classroom_1",
      scheduleSlotId: "slot_1",
      scheduleExceptionId: null,
      createdByUserId: "teacher_1",
      title: "Lecture 1",
      lectureDate: "2026-03-20T00:00:00.000Z",
      plannedStartAt: "2026-03-20T09:00:00.000Z",
      plannedEndAt: "2026-03-20T10:00:00.000Z",
      actualStartAt: null,
      actualEndAt: null,
      status: "PLANNED",
    })

    expect(semester.status).toBe("ACTIVE")
    expect(classroom.courseCode).toBe("CSE6-MATH-A")
    expect(classroom.permissions?.canEditCourseInfo).toBe(true)
    expect(classroom.activeJoinCode?.code).toBe("MATH6A")
    expect(lecture.title).toBe("Lecture 1")
  })

  it("accepts admin classroom governance detail and archive payloads", () => {
    const detail = adminClassroomGovernanceDetailSchema.parse({
      id: "classroom_1",
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      primaryTeacherId: "teacher_1",
      createdByUserId: "admin_1",
      code: "CSE6-MATH-A",
      courseCode: "CSE6-MATH-A",
      displayTitle: "Mathematics Classroom",
      classroomTitle: "Mathematics Classroom",
      semesterCode: "SEM6-2026",
      semesterTitle: "Semester 6",
      classCode: "CSE6",
      classTitle: "Computer Science 6",
      sectionCode: "A",
      sectionTitle: "Section A",
      subjectCode: "MATH101",
      subjectTitle: "Mathematics",
      primaryTeacherDisplayName: "Prof. Teacher",
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
        attendanceSessionCount: 1,
        liveAttendanceSessionCount: 0,
        presentRecordCount: 2,
        absentRecordCount: 2,
        latestAttendanceAt: "2026-03-15T10:00:00.000Z",
        canArchiveNow: true,
        archiveEffectLabel: "Archive the classroom",
        archiveEffectMessage:
          "Archiving revokes the join code, stops new classroom changes, and keeps attendance history available for review and audits.",
        historyPreservedNote:
          "Archive keeps saved attendance sessions, present and absent counts, roster history, and admin audit records.",
      },
    })

    const archiveRequest = adminArchiveClassroomRequestSchema.parse({
      reason: "Registrar review complete.",
    })

    expect(detail.governance.canArchiveNow).toBe(true)
    expect(archiveRequest.reason).toBe("Registrar review complete.")
  })

  it("accepts classroom CRUD payload aliases and rejects mismatched duplicates", () => {
    const created = createClassroomRequestSchema.parse({
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      courseCode: "CSE6-MATH-A",
      classroomTitle: "Maths",
    })
    const updated = updateClassroomRequestSchema.parse({
      courseCode: "CSE6-MATH-B",
      classroomTitle: "Maths Advanced",
    })

    expect(created.courseCode).toBe("CSE6-MATH-A")
    expect(updated.classroomTitle).toBe("Maths Advanced")

    expect(() =>
      createClassroomRequestSchema.parse({
        semesterId: "semester_1",
        classId: "class_1",
        sectionId: "section_1",
        subjectId: "subject_1",
        code: "CSE6-MATH-A",
        courseCode: "CSE6-MATH-B",
        displayTitle: "Maths",
      }),
    ).toThrow(/Course code must match/)
  })

  it("accepts schedule CRUD payloads for weekly slots, exceptions, and save-and-notify", () => {
    const weeklySlot = createScheduleSlotRequestSchema.parse({
      weekday: 5,
      startMinutes: 540,
      endMinutes: 600,
      locationLabel: "Room 101",
    })
    const exception = createScheduleExceptionRequestSchema.parse({
      scheduleSlotId: "slot_1",
      exceptionType: "RESCHEDULED",
      effectiveDate: "2026-08-14T00:00:00.000Z",
      startMinutes: 660,
      endMinutes: 720,
      locationLabel: "Lab 4",
      reason: "Room swap",
    })
    const schedule = classroomScheduleSchema.parse({
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
      scheduleExceptions: [
        {
          id: "exception_1",
          courseOfferingId: "classroom_1",
          scheduleSlotId: "slot_1",
          exceptionType: "RESCHEDULED",
          effectiveDate: "2026-08-14T00:00:00.000Z",
          startMinutes: 660,
          endMinutes: 720,
          locationLabel: "Lab 4",
          reason: "Room swap",
        },
      ],
    })
    const saveAndNotify = saveAndNotifyScheduleRequestSchema.parse({
      weeklySlotCreates: [weeklySlot],
      exceptionCreates: [exception],
      note: "Notify enrolled students after saving.",
    })

    expect(weeklySlot.weekday).toBe(5)
    expect(exception.exceptionType).toBe("RESCHEDULED")
    expect(schedule.scheduleExceptions).toHaveLength(1)
    expect(saveAndNotify.note).toBe("Notify enrolled students after saving.")
  })

  it("accepts classroom join-code and roster payloads", () => {
    const joinRequest = joinClassroomRequestSchema.parse({
      code: " abcd12 ",
    })
    const resetJoinCode = resetClassroomJoinCodeRequestSchema.parse({
      expiresAt: "2026-05-31T23:59:59.999Z",
    })
    const studentClassroom = studentClassroomMembershipSummarySchema.parse({
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
    })
    const rosterMember = classroomRosterMemberSummarySchema.parse({
      id: "enrollment_1",
      courseOfferingId: "classroom_1",
      studentId: "student_1",
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      status: "ACTIVE",
      source: "MANUAL",
      studentEmail: "student.one@attendease.dev",
      studentDisplayName: "Student One",
      studentName: "Student One",
      studentIdentifier: "23CS001",
      studentStatus: "ACTIVE",
      rollNumber: "23CS001",
      universityId: "UNI001",
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
    })

    expect(joinRequest.code).toBe("ABCD12")
    expect(resetJoinCode.expiresAt).toBe("2026-05-31T23:59:59.999Z")
    expect(studentClassroom.enrollmentSource).toBe("JOIN_CODE")
    expect(rosterMember.studentDisplayName).toBe("Student One")
  })

  it("accepts reset-ready classroom student aliases for roster search and roster actions", () => {
    const rosterFilters = classroomRosterListQuerySchema.parse({
      membershipStatus: "ACTIVE",
      search: "23CS001",
    })
    const addStudent = addClassroomStudentRequestSchema.parse({
      studentIdentifier: "23CS001",
      membershipStatus: "PENDING",
    })
    const updateStudent = updateClassroomStudentRequestSchema.parse({
      membershipStatus: "BLOCKED",
    })
    const students = classroomStudentsResponseSchema.parse([
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
        source: "MANUAL",
        membershipSource: "MANUAL",
        studentEmail: "student.one@attendease.dev",
        studentDisplayName: "Student One",
        studentName: "Student One",
        studentIdentifier: "23CS001",
        studentStatus: "ACTIVE",
        rollNumber: "23CS001",
        universityId: "UNI001",
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
    ])

    expect(rosterFilters.membershipStatus).toBe("ACTIVE")
    expect(addStudent.studentIdentifier).toBe("23CS001")
    expect(updateStudent.membershipStatus).toBe("BLOCKED")
    expect(students[0]?.studentIdentifier).toBe("23CS001")
    expect(students[0]?.actions.canRemove).toBe(true)
  })

  it("accepts classroom stream and roster import payloads", () => {
    const announcement = createAnnouncementRequestSchema.parse({
      title: "Welcome",
      body: "Check the classroom stream before the next lecture.",
      shouldNotify: true,
    })
    const importRequest = createRosterImportJobRequestSchema.parse({
      sourceFileName: "roster.csv",
      rows: [
        {
          studentEmail: "student.one@attendease.dev",
          parsedName: "Student One",
        },
      ],
    })
    const importDetail = rosterImportJobDetailSchema.parse({
      id: "job_1",
      courseOfferingId: "classroom_1",
      requestedByUserId: "teacher_1",
      sourceFileKey: "inline://roster-imports/job_1.csv",
      sourceFileName: "roster.csv",
      status: "REVIEW_REQUIRED",
      totalRows: 1,
      validRows: 1,
      invalidRows: 0,
      appliedRows: 0,
      startedAt: "2026-03-14T09:15:00.000Z",
      completedAt: "2026-03-14T09:16:00.000Z",
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
          status: "VALID",
          errorMessage: null,
          resolvedStudentId: "student_1",
        },
      ],
    })
    const streamItem = announcementSummarySchema.parse({
      id: "announcement_1",
      courseOfferingId: "classroom_1",
      authorUserId: "teacher_1",
      authorDisplayName: "Prof. Anurag Agarwal",
      postType: "ANNOUNCEMENT",
      visibility: "STUDENT_AND_TEACHER",
      title: "Welcome",
      body: "Check the classroom stream before the next lecture.",
      shouldNotify: true,
      createdAt: "2026-03-14T09:00:00.000Z",
      editedAt: null,
    })

    expect(announcement.shouldNotify).toBe(true)
    expect(importRequest.rows).toHaveLength(1)
    expect(importDetail.rows[0]?.status).toBe("VALID")
    expect(streamItem.authorDisplayName).toBe("Prof. Anurag Agarwal")
  })

  it("accepts QR attendance session and mark payloads", () => {
    const session = attendanceSessionSummarySchema.parse({
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
      rosterSnapshotCount: 4,
      presentCount: 1,
      absentCount: 3,
      currentQrPayload: '{"v":1,"sid":"session_1","ts":1,"sig":"abcdef1234567890"}',
      currentQrExpiresAt: "2026-03-14T10:00:15.000Z",
    })
    const qrToken = rollingQrTokenPayloadSchema.parse({
      v: 1,
      sid: "session_1",
      ts: 123456,
      sig: "abcdef1234567890",
    })
    const markRequest = markQrAttendanceRequestSchema.parse({
      qrPayload: JSON.stringify(qrToken),
      latitude: 28.61395,
      longitude: 77.20903,
      accuracyMeters: 20,
      deviceTimestamp: "2026-03-14T10:00:05.000Z",
    })
    const markResponse = markQrAttendanceResponseSchema.parse({
      success: true,
      sessionId: "session_1",
      attendanceRecordId: "record_1",
      attendanceStatus: "PRESENT",
      markSource: "QR_GPS",
      markedAt: "2026-03-14T10:00:06.000Z",
      presentCount: 1,
      absentCount: 3,
      distanceMeters: 4.8,
      accuracyMeters: 20,
    })

    expect(session.currentQrPayload).toContain('"sid":"session_1"')
    expect(markRequest.accuracyMeters).toBe(20)
    expect(markResponse.markSource).toBe("QR_GPS")
  })

  it("accepts attendance history read-model payloads", () => {
    const history = attendanceSessionHistoryResponseSchema.parse([
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
    ])

    const detail = attendanceSessionDetailSchema.parse({
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
      suspiciousAttemptCount: 1,
      blockedUntrustedDeviceCount: 0,
      locationValidationFailureCount: 1,
      bluetoothValidationFailureCount: 0,
      revokedDeviceAttemptCount: 0,
    })

    const students = attendanceSessionStudentsResponseSchema.parse([
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
    ])

    expect(history[0]?.editability.state).toBe("OPEN")
    expect(detail.suspiciousAttemptCount).toBe(1)
    expect(students[0]?.studentRollNumber).toBe("BT23CSE001")
  })

  it("accepts student attendance history payloads", () => {
    const history = studentAttendanceHistoryResponseSchema.parse([
      {
        attendanceRecordId: "record_1",
        sessionId: "session_1",
        classroomId: "classroom_1",
        classroomCode: "CSE6-MATH-A",
        classroomDisplayTitle: "Mathematics",
        lectureId: "lecture_1",
        lectureTitle: "Linear Algebra",
        lectureDate: "2026-03-14T10:00:00.000Z",
        mode: "QR_GPS",
        sessionStatus: "ENDED",
        attendanceStatus: "PRESENT",
        markSource: "QR_GPS",
        markedAt: "2026-03-14T10:00:05.000Z",
        startedAt: "2026-03-14T10:00:00.000Z",
        endedAt: "2026-03-14T10:20:00.000Z",
        subjectId: "subject_1",
        subjectCode: "MATH101",
        subjectTitle: "Mathematics",
      },
    ])

    expect(history[0]?.attendanceStatus).toBe("PRESENT")
    expect(history[0]?.subjectCode).toBe("MATH101")
  })

  it("accepts Bluetooth attendance session and mark payloads", () => {
    const createRequest = createBluetoothSessionRequestSchema.parse({
      classroomId: "classroom_1",
      lectureId: "lecture_1",
      sessionDurationMinutes: 20,
    })
    const bluetoothToken = rollingBluetoothTokenPayloadSchema.parse({
      v: 1,
      pid: "ble-public-id-123456",
      ts: 123456,
      eid: "abcdef1234567890",
    })
    const markRequest = markBluetoothAttendanceRequestSchema.parse({
      detectedPayload: JSON.stringify(bluetoothToken),
      rssi: -55,
      deviceTimestamp: "2026-03-14T10:00:05.000Z",
    })
    const markResponse = markBluetoothAttendanceResponseSchema.parse({
      success: true,
      sessionId: "session_2",
      attendanceRecordId: "record_2",
      attendanceStatus: "PRESENT",
      markSource: "BLUETOOTH",
      markedAt: "2026-03-14T10:00:06.000Z",
      presentCount: 1,
      absentCount: 3,
      detectionRssi: -55,
      detectionSlice: 123456,
    })

    expect(createRequest.sessionDurationMinutes).toBe(20)
    expect(markRequest.rssi).toBe(-55)
    expect(markResponse.markSource).toBe("BLUETOOTH")
  })

  it("accepts teacher and student reporting payloads", () => {
    const daywise = teacherDaywiseAttendanceReportRowSchema.parse({
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
    })
    const subjectwise = teacherSubjectwiseAttendanceReportRowSchema.parse({
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
      totalSessions: 1,
      totalStudents: 4,
      presentCount: 3,
      absentCount: 1,
      attendancePercentage: 75,
      lastSessionAt: "2026-03-10T03:45:00.000Z",
    })
    const studentPercentage = teacherStudentAttendancePercentageReportRowSchema.parse({
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
      studentId: "student_1",
      studentEmail: "student.one@attendease.dev",
      studentDisplayName: "Student One",
      studentRollNumber: "23CS001",
      enrollmentStatus: "ACTIVE",
      totalSessions: 3,
      presentSessions: 2,
      absentSessions: 1,
      attendancePercentage: 66.67,
      lastSessionAt: "2026-03-10T03:45:00.000Z",
    })
    const overview = studentReportOverviewSchema.parse({
      studentId: "student_1",
      trackedClassroomCount: 2,
      totalSessions: 1,
      presentSessions: 1,
      absentSessions: 0,
      attendancePercentage: 100,
      lastSessionAt: "2026-03-10T03:45:00.000Z",
    })
    const subjectSummary = studentSubjectReportSummarySchema.parse({
      subjectId: "subject_1",
      subjectCode: "MATH101",
      subjectTitle: "Mathematics",
      classroomCount: 1,
      totalSessions: 1,
      presentSessions: 1,
      absentSessions: 0,
      attendancePercentage: 100,
      lastSessionAt: "2026-03-10T03:45:00.000Z",
    })
    const subjectDetail = studentSubjectReportDetailSchema.parse({
      ...subjectSummary,
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
    })

    expect(daywise.attendancePercentage).toBe(75)
    expect(subjectwise.totalSessions).toBe(1)
    expect(studentPercentage.attendancePercentage).toBe(66.67)
    expect(overview.trackedClassroomCount).toBe(2)
    expect(subjectDetail.classrooms).toHaveLength(1)
  })

  it("accepts export request and delivery payloads", () => {
    const request = createExportJobRequestSchema.parse({
      jobType: "SESSION_CSV",
      sessionId: "session_1",
    })

    const detail = exportJobDetailSchema.parse({
      id: "export_job_1",
      jobType: "SESSION_CSV",
      status: "COMPLETED",
      requestedAt: "2026-03-15T09:00:00.000Z",
      startedAt: "2026-03-15T09:00:03.000Z",
      completedAt: "2026-03-15T09:00:10.000Z",
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
      latestReadyDownloadUrl: "https://downloads.attendease.dev/exports/session_1.csv",
      files: [
        {
          id: "export_file_1",
          objectKey: "exports/export_job_1/session_1.csv",
          fileName: "session_1.csv",
          mimeType: "text/csv",
          status: "READY",
          sizeBytes: 1024,
          checksumSha256: "checksum-value",
          createdAt: "2026-03-15T09:00:03.000Z",
          readyAt: "2026-03-15T09:00:10.000Z",
          expiresAt: "2026-03-18T09:00:10.000Z",
          downloadUrl: "https://downloads.attendease.dev/exports/export_job_1/session_1.csv",
        },
      ],
    })

    expect(request.sessionId).toBe("session_1")
    expect(detail.files[0]?.status).toBe("READY")
    expect(detail.latestReadyDownloadUrl).toContain("downloads.attendease.dev")
  })
})

describe("academic naming aliases", () => {
  it("accepts classroom and membership aliases alongside legacy academic ids", () => {
    const membership = studentClassroomMembershipSummarySchema.parse({
      id: "classroom_1",
      classroomId: "classroom_1",
      primaryTeacherId: "teacher_1",
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      code: "CSE6-MATH-A",
      displayTitle: "Math Classroom",
      classroomStatus: "ACTIVE",
      defaultAttendanceMode: "QR_GPS",
      timezone: "Asia/Kolkata",
      requiresTrustedDevice: true,
      enrollmentId: "enrollment_1",
      membershipId: "enrollment_1",
      enrollmentStatus: "ACTIVE",
      membershipStatus: "ACTIVE",
      enrollmentSource: "JOIN_CODE",
      membershipSource: "JOIN_CODE",
      joinedAt: "2026-03-15T00:00:00.000Z",
      droppedAt: null,
    })

    const studentMembership = studentMembershipSummarySchema.parse({
      id: "enrollment_1",
      courseOfferingId: "classroom_1",
      classroomId: "classroom_1",
      membershipId: "enrollment_1",
      studentId: "student_1",
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      status: "ACTIVE",
      membershipStatus: "ACTIVE",
      source: "MANUAL",
      membershipSource: "MANUAL",
    })

    expect(membership.classroomId).toBe("classroom_1")
    expect(studentMembership.membershipId).toBe("enrollment_1")
  })

  it("keeps class-session aliases aligned with lecture contracts", () => {
    const classSession = classSessionSummarySchema.parse({
      id: "lecture_1",
      courseOfferingId: "classroom_1",
      classroomId: "classroom_1",
      scheduleSlotId: "slot_1",
      scheduleExceptionId: null,
      createdByUserId: "teacher_1",
      title: "Algebra Revision",
      lectureDate: "2026-03-15T00:00:00.000Z",
      plannedStartAt: "2026-03-15T09:00:00.000Z",
      plannedEndAt: "2026-03-15T10:00:00.000Z",
      actualStartAt: null,
      actualEndAt: null,
      status: "PLANNED",
    })

    const createClassSession = createClassSessionRequestSchema.parse({
      lectureDate: "2026-03-15T00:00:00.000Z",
      title: "Algebra Revision",
      plannedStartAt: "2026-03-15T09:00:00.000Z",
      plannedEndAt: "2026-03-15T10:00:00.000Z",
    })

    const query = classSessionListQuerySchema.parse({
      status: "PLANNED",
    })

    expect(classSession.classroomId).toBe("classroom_1")
    expect(createClassSession.title).toBe("Algebra Revision")
    expect(query.status).toBe("PLANNED")
  })
})
