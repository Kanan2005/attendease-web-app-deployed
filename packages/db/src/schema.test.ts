import fs from "node:fs"

import { describe, expect, it } from "vitest"

import {
  academicManagementMigrationPath,
  authRoleContextMigrationPath,
  bluetoothAttendanceCoreMigrationPath,
  destructiveActionAuditSemanticsMigrationPath,
  deviceTrustControlsMigrationPath,
  emailAutomationRuntimeSupportMigrationPath,
  helperReadModelsMigrationPath,
  initialMigrationPath,
  prismaSchemaPath,
  qrGpsAttendanceMigrationPath,
  qrGpsSecurityHardeningMigrationPath,
  reportsReadModelsMigrationPath,
  scheduleManagementMigrationPath,
} from "./index"

const requiredModels = [
  "User",
  "UserCredential",
  "UserRole",
  "OAuthAccount",
  "StudentProfile",
  "TeacherProfile",
  "AcademicTerm",
  "Semester",
  "AcademicClass",
  "Section",
  "Subject",
  "TeacherAssignment",
  "CourseOffering",
  "ClassroomJoinCode",
  "Enrollment",
  "CourseScheduleSlot",
  "CourseScheduleException",
  "Lecture",
  "AnnouncementPost",
  "AnnouncementReceipt",
  "RosterImportJob",
  "RosterImportRow",
  "AttendanceSession",
  "AttendanceRecord",
  "AttendanceEvent",
  "AttendanceEditAuditLog",
  "ExportJob",
  "ExportJobFile",
  "AnalyticsDailyAttendance",
  "AnalyticsSubjectAttendance",
  "AnalyticsStudentCourseSummary",
  "AnalyticsModeUsageDaily",
  "EmailAutomationRule",
  "EmailDispatchRun",
  "EmailLog",
  "Device",
  "UserDeviceBinding",
  "SecurityEvent",
  "AdminActionLog",
  "OutboxEvent",
]

describe("db schema coverage", () => {
  const schema = fs.readFileSync(prismaSchemaPath, "utf8")
  const initialMigration = fs.readFileSync(initialMigrationPath, "utf8")
  const helperMigration = fs.readFileSync(helperReadModelsMigrationPath, "utf8")
  const authRoleMigration = fs.readFileSync(authRoleContextMigrationPath, "utf8")
  const deviceTrustMigration = fs.readFileSync(deviceTrustControlsMigrationPath, "utf8")
  const academicManagementMigration = fs.readFileSync(academicManagementMigrationPath, "utf8")
  const scheduleManagementMigration = fs.readFileSync(scheduleManagementMigrationPath, "utf8")
  const qrGpsAttendanceMigration = fs.readFileSync(qrGpsAttendanceMigrationPath, "utf8")
  const qrGpsSecurityHardeningMigration = fs.readFileSync(
    qrGpsSecurityHardeningMigrationPath,
    "utf8",
  )
  const bluetoothAttendanceMigration = fs.readFileSync(bluetoothAttendanceCoreMigrationPath, "utf8")
  const reportsReadModelsMigration = fs.readFileSync(reportsReadModelsMigrationPath, "utf8")
  const emailAutomationRuntimeSupportMigration = fs.readFileSync(
    emailAutomationRuntimeSupportMigrationPath,
    "utf8",
  )
  const destructiveActionAuditSemanticsMigration = fs.readFileSync(
    destructiveActionAuditSemanticsMigrationPath,
    "utf8",
  )

  it("defines the architecture-critical models and core enums", () => {
    for (const modelName of requiredModels) {
      expect(schema).toContain(`model ${modelName} {`)
    }

    expect(schema).toContain("enum AttendanceMode {")
    expect(schema).toContain("enum DeviceBindingStatus {")
    expect(schema).toContain("enum OutboxStatus {")
    expect(schema).toContain("ATTENDANCE_LOCATION_VALIDATION_FAILED")
    expect(schema).toContain("ATTENDANCE_BLUETOOTH_VALIDATION_FAILED")
    expect(schema).toContain("SEMESTER_ARCHIVE")
    expect(schema).toContain("CLASSROOM_ARCHIVE")
    expect(schema).toContain("CLASSROOM_STUDENT_REMOVE")
  })

  it("captures the key uniqueness guarantees in the schema", () => {
    expect(schema).toContain("@@unique([studentId, courseOfferingId])")
    expect(schema).toContain("@@unique([sessionId, studentId])")
    expect(schema).toContain("@@unique([teacherId, semesterId, classId, sectionId, subjectId])")
  })

  it("models roster snapshots, exports, analytics, device trust, and retention-sensitive timestamps explicitly", () => {
    expect(schema).toContain("rosterSnapshotCount")
    expect(schema).toContain("presentCount")
    expect(schema).toContain("absentCount")
    expect(schema).toContain("editableUntil")
    expect(schema).toContain("durationSeconds")
    expect(schema).toContain("qrSeed")
    expect(schema).toContain("bleSeed")
    expect(schema).toContain("blePublicId")
    expect(schema).toContain("bleProtocolVersion")
    expect(schema).toContain("gpsAnchorType")
    expect(schema).toContain("markSource")
    expect(schema).toContain("filterSnapshot")
    expect(schema).toContain("attendancePercentage")
    expect(schema).toContain("requiresTrustedDevice")
    expect(schema).toContain("attestationStatus")
    expect(schema).toContain("bindingId")
    expect(schema).toContain("activeRole")
    expect(schema).toContain("canSelfCreateCourseOffering")
    expect(schema).toContain("expiresAt")
    expect(schema).toContain("archivedAt")
    expect(schema).toContain("revokedAt")
    expect(schema).toContain("failedAt")
  })

  it("keeps naming and enum responsibilities explicit for later service code", () => {
    expect(schema).toContain("enum AttendanceMode {")
    expect(schema).toContain("enum AttendanceMarkSource {")
    expect(schema).toContain("enum ExportJobStatus {")
    expect(schema).toContain("enum ExportFileStatus {")
    expect(schema).toContain("enum AutomationRuleStatus {")
    expect(schema).toContain("enum EmailDispatchRunStatus {")
    expect(schema).toContain('@@map("attendance_sessions")')
    expect(schema).toContain('@@map("attendance_records")')
    expect(schema).toContain('@@map("export_jobs")')
    expect(schema).toContain('@@map("outbox_events")')
  })

  it("includes raw-SQL integrity rules that Prisma cannot express directly", () => {
    expect(initialMigration).toContain(
      "classroom_join_codes_one_active_code_per_course_offering_idx",
    )
    expect(initialMigration).toContain(
      "user_device_bindings_one_active_student_binding_per_device_idx",
    )
    expect(initialMigration).toContain("user_device_bindings_one_active_device_per_student_idx")
    expect(initialMigration).toContain("course_schedule_slots_time_window_check")
    expect(initialMigration).toContain("email_automation_rules_schedule_check")
    expect(initialMigration).toContain("analytics_daily_attendance_rate_check")
    expect(initialMigration).toContain("analytics_subject_attendance_rate_check")
    expect(initialMigration).toContain("analytics_student_course_summary_rate_check")
    expect(initialMigration).toContain("outbox_events_attempt_count_check")
  })

  it("includes the follow-up reporting views and runtime-support indexes", () => {
    expect(helperMigration).toContain("report_session_attendance_overview")
    expect(helperMigration).toContain("report_student_course_attendance_overview")
    expect(helperMigration).toContain(
      "attendance_sessions_teacherAssignmentId_status_startedAt_idx",
    )
    expect(helperMigration).toContain("user_device_bindings_bindingType_status_userId_idx")
    expect(helperMigration).toContain("outbox_events_topic_status_availableAt_idx")
    expect(destructiveActionAuditSemanticsMigration).toContain(
      "ADD VALUE IF NOT EXISTS 'SEMESTER_ARCHIVE'",
    )
    expect(destructiveActionAuditSemanticsMigration).toContain(
      "ADD VALUE IF NOT EXISTS 'CLASSROOM_ARCHIVE'",
    )
    expect(destructiveActionAuditSemanticsMigration).toContain(
      "ADD VALUE IF NOT EXISTS 'CLASSROOM_STUDENT_REMOVE'",
    )
  })

  it("includes auth-session role context support for later role switching", () => {
    expect(authRoleMigration).toContain('ADD COLUMN "activeRole" "AppRole"')
    expect(authRoleMigration).toContain('ADD COLUMN "canSelfCreateCourseOffering" BOOLEAN')
    expect(authRoleMigration).toContain("auth_sessions_activeRole_status_idx")
  })

  it("includes device-trust audit refinements for support tooling", () => {
    expect(deviceTrustMigration).toContain('ADD COLUMN "bindingId" TEXT')
    expect(deviceTrustMigration).toContain("devices_attestationProvider_attestationStatus_idx")
    expect(deviceTrustMigration).toContain("security_events_bindingId_createdAt_idx")
    expect(deviceTrustMigration).toContain("admin_action_logs_targetBindingId_createdAt_idx")
  })

  it("includes semester and lecture integrity refinements for academic management", () => {
    expect(schema).toContain("@@index([status, startDate, endDate])")
    expect(schema).toContain("@@index([courseOfferingId, exceptionType, effectiveDate])")
    expect(academicManagementMigration).toContain("semesters_date_window_check")
    expect(academicManagementMigration).toContain("lectures_time_window_check")
    expect(academicManagementMigration).toContain("semesters_status_startDate_endDate_idx")
    expect(academicManagementMigration).toContain(
      "course_schedule_exceptions_courseOfferingId_exceptionType_effec_idx",
    )
  })

  it("includes scheduling uniqueness and lecture-linkage integrity rules", () => {
    expect(scheduleManagementMigration).toContain("course_schedule_exceptions_time_override_check")
    expect(scheduleManagementMigration).toContain(
      "course_schedule_exceptions_one_slot_exception_per_day_idx",
    )
    expect(scheduleManagementMigration).toContain("lectures_one_schedule_exception_idx")
    expect(scheduleManagementMigration).toContain("lectures_one_slot_occurrence_idx")
  })

  it("includes QR attendance anchor metadata and runtime constraints", () => {
    expect(schema).toContain("enum AttendanceLocationAnchorType {")
    expect(qrGpsAttendanceMigration).toContain('CREATE TYPE "AttendanceLocationAnchorType"')
    expect(qrGpsAttendanceMigration).toContain('ADD COLUMN "qrSeed" TEXT')
    expect(qrGpsAttendanceMigration).toContain('ADD COLUMN "gpsAnchorType"')
    expect(qrGpsAttendanceMigration).toContain("attendance_sessions_status_mode_scheduledEndAt_idx")
    expect(qrGpsAttendanceMigration).toContain('length("qrSeed") >= 16')
    expect(qrGpsSecurityHardeningMigration).toContain("ATTENDANCE_LOCATION_VALIDATION_FAILED")
  })

  it("includes Bluetooth attendance identifiers and validation safeguards", () => {
    expect(bluetoothAttendanceMigration).toContain('ADD COLUMN "bleSeed" TEXT')
    expect(bluetoothAttendanceMigration).toContain('ADD COLUMN "blePublicId" TEXT')
    expect(bluetoothAttendanceMigration).toContain('ADD COLUMN "bleProtocolVersion" INTEGER')
    expect(bluetoothAttendanceMigration).toContain(
      "ADD VALUE IF NOT EXISTS 'ATTENDANCE_BLUETOOTH_VALIDATION_FAILED'",
    )
    expect(bluetoothAttendanceMigration).toContain(
      "attendance_sessions_mode_blePublicId_status_idx",
    )
    expect(bluetoothAttendanceMigration).toContain('length("bleSeed") >= 16')
    expect(bluetoothAttendanceMigration).toContain('length("blePublicId") >= 8')
  })

  it("includes reporting read models for day-wise, subject-wise, student percentage, and student overview data", () => {
    expect(reportsReadModelsMigration).toContain("report_daywise_attendance_rollup")
    expect(reportsReadModelsMigration).toContain("report_subject_attendance_rollup")
    expect(reportsReadModelsMigration).toContain("report_student_attendance_percentage")
    expect(reportsReadModelsMigration).toContain("report_student_report_overview")
  })

  it("includes email automation runtime support for dispatch snapshots and duplicate protection", () => {
    expect(emailAutomationRuntimeSupportMigration).toContain(
      'ADD COLUMN IF NOT EXISTS "filterSnapshot" JSONB',
    )
    expect(emailAutomationRuntimeSupportMigration).toContain(
      "email_dispatch_runs_ruleId_dispatchDate_automated_key",
    )
    expect(emailAutomationRuntimeSupportMigration).toContain(
      "email_logs_dispatchRunId_studentId_key",
    )
  })
})
