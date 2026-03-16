-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'BLOCKED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AppRole" AS ENUM ('STUDENT', 'TEACHER', 'ADMIN');

-- CreateEnum
CREATE TYPE "OAuthProvider" AS ENUM ('GOOGLE');

-- CreateEnum
CREATE TYPE "SessionPlatform" AS ENUM ('WEB', 'MOBILE');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "LoginEventStatus" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateEnum
CREATE TYPE "AcademicTermStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SemesterStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AcademicClassStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SectionStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SubjectStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TeacherAssignmentStatus" AS ENUM ('ACTIVE', 'REVOKED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CourseOfferingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "JoinCodeStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'PENDING', 'DROPPED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "EnrollmentSource" AS ENUM ('JOIN_CODE', 'IMPORT', 'MANUAL', 'ADMIN');

-- CreateEnum
CREATE TYPE "ScheduleSlotStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ScheduleExceptionType" AS ENUM ('CANCELLED', 'RESCHEDULED', 'ONE_OFF');

-- CreateEnum
CREATE TYPE "LectureStatus" AS ENUM ('PLANNED', 'OPEN_FOR_ATTENDANCE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceMode" AS ENUM ('QR_GPS', 'BLUETOOTH', 'MANUAL');

-- CreateEnum
CREATE TYPE "AttendanceSessionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ENDED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AttendanceRecordStatus" AS ENUM ('PRESENT', 'ABSENT');

-- CreateEnum
CREATE TYPE "AttendanceMarkSource" AS ENUM ('QR_GPS', 'BLUETOOTH', 'MANUAL');

-- CreateEnum
CREATE TYPE "AttendanceEventType" AS ENUM ('SESSION_CREATED', 'SESSION_STARTED', 'SESSION_ENDED', 'SESSION_EXPIRED', 'AUTO_MARK_QR', 'AUTO_MARK_BLUETOOTH', 'MANUAL_MARK_PRESENT', 'MANUAL_MARK_ABSENT');

-- CreateEnum
CREATE TYPE "AnnouncementPostType" AS ENUM ('ANNOUNCEMENT', 'SCHEDULE_UPDATE', 'ATTENDANCE_REMINDER', 'IMPORT_RESULT');

-- CreateEnum
CREATE TYPE "AnnouncementVisibility" AS ENUM ('TEACHER_ONLY', 'STUDENT_AND_TEACHER');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'PUSH', 'EMAIL');

-- CreateEnum
CREATE TYPE "RosterImportStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'REVIEW_REQUIRED', 'APPLIED', 'FAILED');

-- CreateEnum
CREATE TYPE "RosterImportRowStatus" AS ENUM ('PENDING', 'VALID', 'INVALID', 'APPLIED', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('ANDROID', 'IOS', 'WEB');

-- CreateEnum
CREATE TYPE "DeviceAttestationStatus" AS ENUM ('UNKNOWN', 'PASSED', 'FAILED', 'NOT_SUPPORTED');

-- CreateEnum
CREATE TYPE "DeviceBindingType" AS ENUM ('STUDENT_ATTENDANCE', 'TEACHER_ACCESS', 'ADMIN_ACCESS');

-- CreateEnum
CREATE TYPE "DeviceBindingStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "SecurityEventType" AS ENUM ('DEVICE_BOUND', 'DEVICE_REVOKED', 'ATTENDANCE_BLOCKED_UNTRUSTED_DEVICE', 'MULTI_ACCOUNT_SAME_DEVICE_ATTEMPT', 'SECOND_DEVICE_FOR_STUDENT_ATTEMPT', 'REVOKED_DEVICE_USED', 'LOGIN_RISK_DETECTED');

-- CreateEnum
CREATE TYPE "SecurityEventSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AdminActionType" AS ENUM ('DEVICE_REVOKE', 'DEVICE_APPROVE_REPLACEMENT', 'USER_STATUS_CHANGE', 'ENROLLMENT_OVERRIDE', 'JOIN_CODE_RESET', 'ROSTER_IMPORT_APPLY', 'SESSION_OVERRIDE');

-- CreateEnum
CREATE TYPE "ExportJobType" AS ENUM ('SESSION_PDF', 'SESSION_CSV', 'STUDENT_PERCENT_CSV', 'COMPREHENSIVE_CSV');

-- CreateEnum
CREATE TYPE "ExportJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExportFileStatus" AS ENUM ('GENERATING', 'READY', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "AutomationRuleStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EmailDispatchTriggerType" AS ENUM ('MANUAL', 'AUTOMATED');

-- CreateEnum
CREATE TYPE "EmailDispatchRunStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EmailLogStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'BOUNCED', 'DROPPED');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'DEAD_LETTER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_credentials" (
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "passwordChangedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_credentials_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "userId" TEXT NOT NULL,
    "role" "AppRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userId","role")
);

-- CreateTable
CREATE TABLE "oauth_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "providerSubject" TEXT NOT NULL,
    "providerEmail" TEXT NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_profiles" (
    "userId" TEXT NOT NULL,
    "rollNumber" TEXT,
    "universityId" TEXT,
    "programName" TEXT,
    "currentSemester" INTEGER,
    "attendanceDisabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "teacher_profiles" (
    "userId" TEXT NOT NULL,
    "employeeCode" TEXT,
    "department" TEXT,
    "designation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_profiles_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT,
    "platform" "SessionPlatform" NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "rotatedFromId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "deviceId" TEXT,
    "provider" "OAuthProvider",
    "email" TEXT,
    "status" "LoginEventStatus" NOT NULL,
    "failureCode" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_terms" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "academicYearLabel" TEXT NOT NULL,
    "status" "AcademicTermStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "semesters" (
    "id" TEXT NOT NULL,
    "academicTermId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "ordinal" INTEGER,
    "status" "SemesterStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "attendanceCutoffDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "semesters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "programName" TEXT,
    "cohortYear" INTEGER,
    "status" "AcademicClassStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sections" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "SectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortTitle" TEXT,
    "status" "SubjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_assignments" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "grantedByUserId" TEXT,
    "semesterId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "status" "TeacherAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_offerings" (
    "id" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "primaryTeacherId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "displayTitle" TEXT NOT NULL,
    "status" "CourseOfferingStatus" NOT NULL DEFAULT 'DRAFT',
    "defaultAttendanceMode" "AttendanceMode" NOT NULL DEFAULT 'QR_GPS',
    "defaultGpsRadiusMeters" INTEGER NOT NULL DEFAULT 100,
    "defaultSessionDurationMinutes" INTEGER NOT NULL DEFAULT 15,
    "qrRotationWindowSeconds" INTEGER NOT NULL DEFAULT 15,
    "bluetoothRotationWindowSeconds" INTEGER NOT NULL DEFAULT 10,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "requiresTrustedDevice" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "course_offerings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classroom_join_codes" (
    "id" TEXT NOT NULL,
    "courseOfferingId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "JoinCodeStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "rotatedFromId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "classroom_join_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL,
    "courseOfferingId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'PENDING',
    "source" "EnrollmentSource" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "droppedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_schedule_slots" (
    "id" TEXT NOT NULL,
    "courseOfferingId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMinutes" INTEGER NOT NULL,
    "endMinutes" INTEGER NOT NULL,
    "locationLabel" TEXT,
    "status" "ScheduleSlotStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_schedule_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_schedule_exceptions" (
    "id" TEXT NOT NULL,
    "courseOfferingId" TEXT NOT NULL,
    "scheduleSlotId" TEXT,
    "exceptionType" "ScheduleExceptionType" NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "startMinutes" INTEGER,
    "endMinutes" INTEGER,
    "locationLabel" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_schedule_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lectures" (
    "id" TEXT NOT NULL,
    "courseOfferingId" TEXT NOT NULL,
    "scheduleSlotId" TEXT,
    "scheduleExceptionId" TEXT,
    "createdByUserId" TEXT,
    "title" TEXT,
    "lectureDate" DATE NOT NULL,
    "plannedStartAt" TIMESTAMP(3),
    "plannedEndAt" TIMESTAMP(3),
    "actualStartAt" TIMESTAMP(3),
    "actualEndAt" TIMESTAMP(3),
    "status" "LectureStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lectures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_posts" (
    "id" TEXT NOT NULL,
    "courseOfferingId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "postType" "AnnouncementPostType" NOT NULL DEFAULT 'ANNOUNCEMENT',
    "visibility" "AnnouncementVisibility" NOT NULL DEFAULT 'STUDENT_AND_TEACHER',
    "title" TEXT,
    "body" TEXT NOT NULL,
    "shouldNotify" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "editedAt" TIMESTAMP(3),

    CONSTRAINT "announcement_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_receipts" (
    "announcementPostId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_receipts_pkey" PRIMARY KEY ("announcementPostId","userId","channel")
);

-- CreateTable
CREATE TABLE "roster_import_jobs" (
    "id" TEXT NOT NULL,
    "courseOfferingId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "sourceFileKey" TEXT NOT NULL,
    "sourceFileName" TEXT NOT NULL,
    "status" "RosterImportStatus" NOT NULL DEFAULT 'UPLOADED',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "invalidRows" INTEGER NOT NULL DEFAULT 0,
    "appliedRows" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roster_import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roster_import_rows" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "studentEmail" TEXT,
    "studentRollNumber" TEXT,
    "parsedName" TEXT,
    "status" "RosterImportRowStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "resolvedStudentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roster_import_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_sessions" (
    "id" TEXT NOT NULL,
    "courseOfferingId" TEXT NOT NULL,
    "lectureId" TEXT,
    "teacherAssignmentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "endedByUserId" TEXT,
    "semesterId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "mode" "AttendanceMode" NOT NULL,
    "status" "AttendanceSessionStatus" NOT NULL DEFAULT 'DRAFT',
    "startedAt" TIMESTAMP(3),
    "scheduledEndAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "gpsCenterLatitude" DECIMAL(10,7),
    "gpsCenterLongitude" DECIMAL(10,7),
    "gpsRadiusMeters" INTEGER,
    "qrRotationWindowSeconds" INTEGER,
    "bluetoothRotationWindowSeconds" INTEGER,
    "rosterSnapshotCount" INTEGER NOT NULL DEFAULT 0,
    "presentCount" INTEGER NOT NULL DEFAULT 0,
    "absentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "AttendanceRecordStatus" NOT NULL DEFAULT 'ABSENT',
    "markSource" "AttendanceMarkSource",
    "markedAt" TIMESTAMP(3),
    "markedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_events" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "attendanceRecordId" TEXT,
    "studentId" TEXT,
    "actorUserId" TEXT,
    "deviceId" TEXT,
    "eventType" "AttendanceEventType" NOT NULL,
    "mode" "AttendanceMode",
    "previousStatus" "AttendanceRecordStatus",
    "newStatus" "AttendanceRecordStatus",
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_edit_audit_logs" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "attendanceRecordId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "editedByUserId" TEXT NOT NULL,
    "previousStatus" "AttendanceRecordStatus" NOT NULL,
    "newStatus" "AttendanceRecordStatus" NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_edit_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_jobs" (
    "id" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "courseOfferingId" TEXT,
    "jobType" "ExportJobType" NOT NULL,
    "status" "ExportJobStatus" NOT NULL DEFAULT 'QUEUED',
    "filterSnapshot" JSONB,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_job_files" (
    "id" TEXT NOT NULL,
    "exportJobId" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "status" "ExportFileStatus" NOT NULL DEFAULT 'GENERATING',
    "sizeBytes" INTEGER,
    "checksumSha256" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readyAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "export_job_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_daily_attendance" (
    "courseOfferingId" TEXT NOT NULL,
    "attendanceDate" DATE NOT NULL,
    "totalStudents" INTEGER NOT NULL,
    "presentCount" INTEGER NOT NULL,
    "absentCount" INTEGER NOT NULL,
    "attendanceRate" DECIMAL(5,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_daily_attendance_pkey" PRIMARY KEY ("courseOfferingId","attendanceDate")
);

-- CreateTable
CREATE TABLE "analytics_subject_attendance" (
    "semesterId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "snapshotDate" DATE NOT NULL,
    "totalStudents" INTEGER NOT NULL,
    "totalSessions" INTEGER NOT NULL,
    "presentCount" INTEGER NOT NULL,
    "absentCount" INTEGER NOT NULL,
    "averageAttendanceRate" DECIMAL(5,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_subject_attendance_pkey" PRIMARY KEY ("semesterId","classId","sectionId","subjectId","snapshotDate")
);

-- CreateTable
CREATE TABLE "analytics_student_course_summary" (
    "courseOfferingId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "presentSessions" INTEGER NOT NULL DEFAULT 0,
    "absentSessions" INTEGER NOT NULL DEFAULT 0,
    "attendancePercentage" DECIMAL(5,2) NOT NULL,
    "lastSessionAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_student_course_summary_pkey" PRIMARY KEY ("courseOfferingId","studentId")
);

-- CreateTable
CREATE TABLE "analytics_mode_usage_daily" (
    "courseOfferingId" TEXT NOT NULL,
    "usageDate" DATE NOT NULL,
    "mode" "AttendanceMode" NOT NULL,
    "sessionCount" INTEGER NOT NULL DEFAULT 0,
    "markedCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_mode_usage_daily_pkey" PRIMARY KEY ("courseOfferingId","usageDate","mode")
);

-- CreateTable
CREATE TABLE "email_automation_rules" (
    "id" TEXT NOT NULL,
    "courseOfferingId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "status" "AutomationRuleStatus" NOT NULL DEFAULT 'ACTIVE',
    "thresholdPercent" DECIMAL(5,2) NOT NULL DEFAULT 75,
    "scheduleHourLocal" INTEGER NOT NULL,
    "scheduleMinuteLocal" INTEGER NOT NULL DEFAULT 0,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "templateSubject" TEXT NOT NULL,
    "templateBody" TEXT NOT NULL,
    "lastEvaluatedAt" TIMESTAMP(3),
    "lastSuccessfulRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_dispatch_runs" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "requestedByUserId" TEXT,
    "triggerType" "EmailDispatchTriggerType" NOT NULL,
    "dispatchDate" DATE NOT NULL,
    "status" "EmailDispatchRunStatus" NOT NULL DEFAULT 'QUEUED',
    "targetedStudentCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_dispatch_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "dispatchRunId" TEXT,
    "ruleId" TEXT,
    "studentId" TEXT,
    "recipientEmail" TEXT NOT NULL,
    "status" "EmailLogStatus" NOT NULL DEFAULT 'PENDING',
    "providerMessageId" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "installId" TEXT NOT NULL,
    "platform" "DevicePlatform" NOT NULL,
    "deviceModel" TEXT,
    "osVersion" TEXT,
    "appVersion" TEXT,
    "publicKey" TEXT NOT NULL,
    "attestationStatus" "DeviceAttestationStatus" NOT NULL DEFAULT 'UNKNOWN',
    "attestationProvider" TEXT,
    "attestedAt" TIMESTAMP(3),
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_device_bindings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "bindingType" "DeviceBindingType" NOT NULL,
    "status" "DeviceBindingStatus" NOT NULL DEFAULT 'PENDING',
    "boundAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedByUserId" TEXT,
    "revokeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_device_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "actorUserId" TEXT,
    "deviceId" TEXT,
    "courseOfferingId" TEXT,
    "sessionId" TEXT,
    "eventType" "SecurityEventType" NOT NULL,
    "severity" "SecurityEventSeverity" NOT NULL DEFAULT 'MEDIUM',
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_action_logs" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "targetDeviceId" TEXT,
    "targetBindingId" TEXT,
    "targetCourseOfferingId" TEXT,
    "targetSessionId" TEXT,
    "actionType" "AdminActionType" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "user_roles_role_idx" ON "user_roles"("role");

-- CreateIndex
CREATE INDEX "oauth_accounts_userId_idx" ON "oauth_accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_accounts_provider_providerSubject_key" ON "oauth_accounts"("provider", "providerSubject");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_rollNumber_key" ON "student_profiles"("rollNumber");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_universityId_key" ON "student_profiles"("universityId");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_profiles_employeeCode_key" ON "teacher_profiles"("employeeCode");

-- CreateIndex
CREATE INDEX "auth_sessions_userId_status_idx" ON "auth_sessions"("userId", "status");

-- CreateIndex
CREATE INDEX "auth_sessions_deviceId_status_idx" ON "auth_sessions"("deviceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_revokedAt_idx" ON "refresh_tokens"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "refresh_tokens_sessionId_revokedAt_idx" ON "refresh_tokens"("sessionId", "revokedAt");

-- CreateIndex
CREATE INDEX "login_events_userId_createdAt_idx" ON "login_events"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "login_events_deviceId_createdAt_idx" ON "login_events"("deviceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "academic_terms_code_key" ON "academic_terms"("code");

-- CreateIndex
CREATE INDEX "academic_terms_status_startDate_idx" ON "academic_terms"("status", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "semesters_code_key" ON "semesters"("code");

-- CreateIndex
CREATE INDEX "semesters_academicTermId_status_idx" ON "semesters"("academicTermId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "classes_code_key" ON "classes"("code");

-- CreateIndex
CREATE INDEX "classes_status_idx" ON "classes"("status");

-- CreateIndex
CREATE INDEX "sections_classId_status_idx" ON "sections"("classId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "sections_classId_code_key" ON "sections"("classId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_code_key" ON "subjects"("code");

-- CreateIndex
CREATE INDEX "subjects_status_idx" ON "subjects"("status");

-- CreateIndex
CREATE INDEX "teacher_assignments_teacherId_status_idx" ON "teacher_assignments"("teacherId", "status");

-- CreateIndex
CREATE INDEX "teacher_assignments_semesterId_classId_sectionId_subjectId_idx" ON "teacher_assignments"("semesterId", "classId", "sectionId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_assignments_teacherId_semesterId_classId_sectionId__key" ON "teacher_assignments"("teacherId", "semesterId", "classId", "sectionId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "course_offerings_code_key" ON "course_offerings"("code");

-- CreateIndex
CREATE INDEX "course_offerings_semesterId_subjectId_classId_sectionId_idx" ON "course_offerings"("semesterId", "subjectId", "classId", "sectionId");

-- CreateIndex
CREATE INDEX "course_offerings_primaryTeacherId_status_idx" ON "course_offerings"("primaryTeacherId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "course_offerings_semesterId_classId_sectionId_subjectId_pri_key" ON "course_offerings"("semesterId", "classId", "sectionId", "subjectId", "primaryTeacherId");

-- CreateIndex
CREATE UNIQUE INDEX "classroom_join_codes_code_key" ON "classroom_join_codes"("code");

-- CreateIndex
CREATE INDEX "classroom_join_codes_courseOfferingId_status_idx" ON "classroom_join_codes"("courseOfferingId", "status");

-- CreateIndex
CREATE INDEX "enrollments_studentId_status_idx" ON "enrollments"("studentId", "status");

-- CreateIndex
CREATE INDEX "enrollments_courseOfferingId_status_idx" ON "enrollments"("courseOfferingId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_studentId_courseOfferingId_key" ON "enrollments"("studentId", "courseOfferingId");

-- CreateIndex
CREATE INDEX "course_schedule_slots_courseOfferingId_weekday_status_idx" ON "course_schedule_slots"("courseOfferingId", "weekday", "status");

-- CreateIndex
CREATE UNIQUE INDEX "course_schedule_slots_courseOfferingId_weekday_startMinutes_key" ON "course_schedule_slots"("courseOfferingId", "weekday", "startMinutes", "endMinutes");

-- CreateIndex
CREATE INDEX "course_schedule_exceptions_courseOfferingId_effectiveDate_idx" ON "course_schedule_exceptions"("courseOfferingId", "effectiveDate");

-- CreateIndex
CREATE INDEX "lectures_courseOfferingId_lectureDate_status_idx" ON "lectures"("courseOfferingId", "lectureDate", "status");

-- CreateIndex
CREATE INDEX "announcement_posts_courseOfferingId_createdAt_idx" ON "announcement_posts"("courseOfferingId", "createdAt");

-- CreateIndex
CREATE INDEX "announcement_receipts_userId_readAt_idx" ON "announcement_receipts"("userId", "readAt");

-- CreateIndex
CREATE INDEX "roster_import_jobs_courseOfferingId_status_idx" ON "roster_import_jobs"("courseOfferingId", "status");

-- CreateIndex
CREATE INDEX "roster_import_rows_jobId_status_idx" ON "roster_import_rows"("jobId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "roster_import_rows_jobId_rowNumber_key" ON "roster_import_rows"("jobId", "rowNumber");

-- CreateIndex
CREATE INDEX "attendance_sessions_teacherId_startedAt_idx" ON "attendance_sessions"("teacherId", "startedAt");

-- CreateIndex
CREATE INDEX "attendance_sessions_classId_sectionId_subjectId_startedAt_idx" ON "attendance_sessions"("classId", "sectionId", "subjectId", "startedAt");

-- CreateIndex
CREATE INDEX "attendance_sessions_courseOfferingId_status_startedAt_idx" ON "attendance_sessions"("courseOfferingId", "status", "startedAt");

-- CreateIndex
CREATE INDEX "attendance_records_sessionId_status_idx" ON "attendance_records"("sessionId", "status");

-- CreateIndex
CREATE INDEX "attendance_records_studentId_status_idx" ON "attendance_records"("studentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_sessionId_studentId_key" ON "attendance_records"("sessionId", "studentId");

-- CreateIndex
CREATE INDEX "attendance_events_sessionId_occurredAt_idx" ON "attendance_events"("sessionId", "occurredAt");

-- CreateIndex
CREATE INDEX "attendance_events_studentId_occurredAt_idx" ON "attendance_events"("studentId", "occurredAt");

-- CreateIndex
CREATE INDEX "attendance_edit_audit_logs_sessionId_editedAt_idx" ON "attendance_edit_audit_logs"("sessionId", "editedAt");

-- CreateIndex
CREATE INDEX "attendance_edit_audit_logs_studentId_editedAt_idx" ON "attendance_edit_audit_logs"("studentId", "editedAt");

-- CreateIndex
CREATE INDEX "export_jobs_requestedByUserId_requestedAt_idx" ON "export_jobs"("requestedByUserId", "requestedAt");

-- CreateIndex
CREATE INDEX "export_jobs_courseOfferingId_status_idx" ON "export_jobs"("courseOfferingId", "status");

-- CreateIndex
CREATE INDEX "export_job_files_status_expiresAt_idx" ON "export_job_files"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "export_job_files_exportJobId_objectKey_key" ON "export_job_files"("exportJobId", "objectKey");

-- CreateIndex
CREATE INDEX "analytics_daily_attendance_attendanceDate_idx" ON "analytics_daily_attendance"("attendanceDate");

-- CreateIndex
CREATE INDEX "analytics_subject_attendance_subjectId_snapshotDate_idx" ON "analytics_subject_attendance"("subjectId", "snapshotDate");

-- CreateIndex
CREATE INDEX "analytics_student_course_summary_studentId_updatedAt_idx" ON "analytics_student_course_summary"("studentId", "updatedAt");

-- CreateIndex
CREATE INDEX "analytics_mode_usage_daily_usageDate_mode_idx" ON "analytics_mode_usage_daily"("usageDate", "mode");

-- CreateIndex
CREATE INDEX "email_automation_rules_courseOfferingId_status_scheduleHour_idx" ON "email_automation_rules"("courseOfferingId", "status", "scheduleHourLocal", "scheduleMinuteLocal");

-- CreateIndex
CREATE INDEX "email_dispatch_runs_ruleId_dispatchDate_triggerType_idx" ON "email_dispatch_runs"("ruleId", "dispatchDate", "triggerType");

-- CreateIndex
CREATE INDEX "email_logs_recipientEmail_createdAt_idx" ON "email_logs"("recipientEmail", "createdAt");

-- CreateIndex
CREATE INDEX "email_logs_status_createdAt_idx" ON "email_logs"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "devices_installId_key" ON "devices"("installId");

-- CreateIndex
CREATE INDEX "devices_platform_attestationStatus_idx" ON "devices"("platform", "attestationStatus");

-- CreateIndex
CREATE INDEX "devices_lastSeenAt_idx" ON "devices"("lastSeenAt");

-- CreateIndex
CREATE INDEX "user_device_bindings_userId_status_idx" ON "user_device_bindings"("userId", "status");

-- CreateIndex
CREATE INDEX "user_device_bindings_deviceId_status_idx" ON "user_device_bindings"("deviceId", "status");

-- CreateIndex
CREATE INDEX "security_events_userId_createdAt_idx" ON "security_events"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "security_events_deviceId_createdAt_idx" ON "security_events"("deviceId", "createdAt");

-- CreateIndex
CREATE INDEX "security_events_eventType_severity_createdAt_idx" ON "security_events"("eventType", "severity", "createdAt");

-- CreateIndex
CREATE INDEX "admin_action_logs_adminUserId_createdAt_idx" ON "admin_action_logs"("adminUserId", "createdAt");

-- CreateIndex
CREATE INDEX "admin_action_logs_actionType_createdAt_idx" ON "admin_action_logs"("actionType", "createdAt");

-- CreateIndex
CREATE INDEX "outbox_events_status_availableAt_idx" ON "outbox_events"("status", "availableAt");

-- CreateIndex
CREATE INDEX "outbox_events_aggregateType_aggregateId_createdAt_idx" ON "outbox_events"("aggregateType", "aggregateId", "createdAt");

-- AddConstraint
ALTER TABLE "course_offerings"
ADD CONSTRAINT "course_offerings_default_settings_check"
CHECK (
  "defaultGpsRadiusMeters" > 0
  AND "defaultSessionDurationMinutes" > 0
  AND "qrRotationWindowSeconds" > 0
  AND "bluetoothRotationWindowSeconds" > 0
);

-- AddConstraint
ALTER TABLE "course_schedule_slots"
ADD CONSTRAINT "course_schedule_slots_time_window_check"
CHECK (
  "weekday" BETWEEN 1 AND 7
  AND "startMinutes" >= 0
  AND "startMinutes" < 1440
  AND "endMinutes" > "startMinutes"
  AND "endMinutes" <= 1440
);

-- AddConstraint
ALTER TABLE "course_schedule_exceptions"
ADD CONSTRAINT "course_schedule_exceptions_time_window_check"
CHECK (
  (
    "startMinutes" IS NULL
    AND "endMinutes" IS NULL
  )
  OR (
    "startMinutes" IS NOT NULL
    AND "endMinutes" IS NOT NULL
    AND "startMinutes" >= 0
    AND "startMinutes" < 1440
    AND "endMinutes" > "startMinutes"
    AND "endMinutes" <= 1440
  )
);

-- AddConstraint
ALTER TABLE "attendance_sessions"
ADD CONSTRAINT "attendance_sessions_runtime_values_check"
CHECK (
  "rosterSnapshotCount" >= 0
  AND "presentCount" >= 0
  AND "absentCount" >= 0
  AND ("gpsRadiusMeters" IS NULL OR "gpsRadiusMeters" > 0)
  AND ("qrRotationWindowSeconds" IS NULL OR "qrRotationWindowSeconds" > 0)
  AND ("bluetoothRotationWindowSeconds" IS NULL OR "bluetoothRotationWindowSeconds" > 0)
);

-- AddConstraint
ALTER TABLE "analytics_daily_attendance"
ADD CONSTRAINT "analytics_daily_attendance_rate_check"
CHECK ("attendanceRate" >= 0 AND "attendanceRate" <= 100);

-- AddConstraint
ALTER TABLE "analytics_subject_attendance"
ADD CONSTRAINT "analytics_subject_attendance_rate_check"
CHECK ("averageAttendanceRate" >= 0 AND "averageAttendanceRate" <= 100);

-- AddConstraint
ALTER TABLE "analytics_student_course_summary"
ADD CONSTRAINT "analytics_student_course_summary_rate_check"
CHECK (
  "attendancePercentage" >= 0
  AND "attendancePercentage" <= 100
  AND "totalSessions" >= 0
  AND "presentSessions" >= 0
  AND "absentSessions" >= 0
);

-- AddConstraint
ALTER TABLE "email_automation_rules"
ADD CONSTRAINT "email_automation_rules_schedule_check"
CHECK (
  "thresholdPercent" >= 0
  AND "thresholdPercent" <= 100
  AND "scheduleHourLocal" BETWEEN 0 AND 23
  AND "scheduleMinuteLocal" BETWEEN 0 AND 59
);

-- AddConstraint
ALTER TABLE "email_dispatch_runs"
ADD CONSTRAINT "email_dispatch_runs_counts_check"
CHECK (
  "targetedStudentCount" >= 0
  AND "sentCount" >= 0
  AND "failedCount" >= 0
);

-- AddConstraint
ALTER TABLE "outbox_events"
ADD CONSTRAINT "outbox_events_attempt_count_check"
CHECK ("attemptCount" >= 0);

-- CreateIndex
CREATE UNIQUE INDEX "classroom_join_codes_one_active_code_per_course_offering_idx"
ON "classroom_join_codes"("courseOfferingId")
WHERE "status" = 'ACTIVE';

-- CreateIndex
CREATE UNIQUE INDEX "user_device_bindings_one_active_student_binding_per_device_idx"
ON "user_device_bindings"("deviceId")
WHERE "bindingType" = 'STUDENT_ATTENDANCE' AND "status" = 'ACTIVE';

-- CreateIndex
CREATE UNIQUE INDEX "user_device_bindings_one_active_device_per_student_idx"
ON "user_device_bindings"("userId")
WHERE "bindingType" = 'STUDENT_ATTENDANCE' AND "status" = 'ACTIVE';

-- AddForeignKey
ALTER TABLE "user_credentials" ADD CONSTRAINT "user_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_profiles" ADD CONSTRAINT "teacher_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "auth_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_rotatedFromId_fkey" FOREIGN KEY ("rotatedFromId") REFERENCES "refresh_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_events" ADD CONSTRAINT "login_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_events" ADD CONSTRAINT "login_events_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semesters" ADD CONSTRAINT "semesters_academicTermId_fkey" FOREIGN KEY ("academicTermId") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "semesters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "semesters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_primaryTeacherId_fkey" FOREIGN KEY ("primaryTeacherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classroom_join_codes" ADD CONSTRAINT "classroom_join_codes_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "course_offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classroom_join_codes" ADD CONSTRAINT "classroom_join_codes_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classroom_join_codes" ADD CONSTRAINT "classroom_join_codes_rotatedFromId_fkey" FOREIGN KEY ("rotatedFromId") REFERENCES "classroom_join_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "course_offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "semesters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_schedule_slots" ADD CONSTRAINT "course_schedule_slots_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "course_offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_schedule_exceptions" ADD CONSTRAINT "course_schedule_exceptions_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "course_offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_schedule_exceptions" ADD CONSTRAINT "course_schedule_exceptions_scheduleSlotId_fkey" FOREIGN KEY ("scheduleSlotId") REFERENCES "course_schedule_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lectures" ADD CONSTRAINT "lectures_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "course_offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lectures" ADD CONSTRAINT "lectures_scheduleSlotId_fkey" FOREIGN KEY ("scheduleSlotId") REFERENCES "course_schedule_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lectures" ADD CONSTRAINT "lectures_scheduleExceptionId_fkey" FOREIGN KEY ("scheduleExceptionId") REFERENCES "course_schedule_exceptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lectures" ADD CONSTRAINT "lectures_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_posts" ADD CONSTRAINT "announcement_posts_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "course_offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_posts" ADD CONSTRAINT "announcement_posts_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_receipts" ADD CONSTRAINT "announcement_receipts_announcementPostId_fkey" FOREIGN KEY ("announcementPostId") REFERENCES "announcement_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_receipts" ADD CONSTRAINT "announcement_receipts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_import_jobs" ADD CONSTRAINT "roster_import_jobs_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "course_offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_import_jobs" ADD CONSTRAINT "roster_import_jobs_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_import_rows" ADD CONSTRAINT "roster_import_rows_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "roster_import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_import_rows" ADD CONSTRAINT "roster_import_rows_resolvedStudentId_fkey" FOREIGN KEY ("resolvedStudentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "course_offerings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_lectureId_fkey" FOREIGN KEY ("lectureId") REFERENCES "lectures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_teacherAssignmentId_fkey" FOREIGN KEY ("teacherAssignmentId") REFERENCES "teacher_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_endedByUserId_fkey" FOREIGN KEY ("endedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "semesters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "attendance_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_markedByUserId_fkey" FOREIGN KEY ("markedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "attendance_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_attendanceRecordId_fkey" FOREIGN KEY ("attendanceRecordId") REFERENCES "attendance_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_edit_audit_logs" ADD CONSTRAINT "attendance_edit_audit_logs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "attendance_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_edit_audit_logs" ADD CONSTRAINT "attendance_edit_audit_logs_attendanceRecordId_fkey" FOREIGN KEY ("attendanceRecordId") REFERENCES "attendance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_edit_audit_logs" ADD CONSTRAINT "attendance_edit_audit_logs_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_edit_audit_logs" ADD CONSTRAINT "attendance_edit_audit_logs_editedByUserId_fkey" FOREIGN KEY ("editedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "course_offerings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_job_files" ADD CONSTRAINT "export_job_files_exportJobId_fkey" FOREIGN KEY ("exportJobId") REFERENCES "export_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_daily_attendance" ADD CONSTRAINT "analytics_daily_attendance_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "course_offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_subject_attendance" ADD CONSTRAINT "analytics_subject_attendance_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_subject_attendance" ADD CONSTRAINT "analytics_subject_attendance_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_subject_attendance" ADD CONSTRAINT "analytics_subject_attendance_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_subject_attendance" ADD CONSTRAINT "analytics_subject_attendance_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_student_course_summary" ADD CONSTRAINT "analytics_student_course_summary_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "course_offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_student_course_summary" ADD CONSTRAINT "analytics_student_course_summary_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_mode_usage_daily" ADD CONSTRAINT "analytics_mode_usage_daily_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "course_offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_automation_rules" ADD CONSTRAINT "email_automation_rules_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "course_offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_automation_rules" ADD CONSTRAINT "email_automation_rules_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_dispatch_runs" ADD CONSTRAINT "email_dispatch_runs_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "email_automation_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_dispatch_runs" ADD CONSTRAINT "email_dispatch_runs_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_dispatchRunId_fkey" FOREIGN KEY ("dispatchRunId") REFERENCES "email_dispatch_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "email_automation_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_device_bindings" ADD CONSTRAINT "user_device_bindings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_device_bindings" ADD CONSTRAINT "user_device_bindings_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_device_bindings" ADD CONSTRAINT "user_device_bindings_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "course_offerings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "attendance_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_action_logs" ADD CONSTRAINT "admin_action_logs_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_action_logs" ADD CONSTRAINT "admin_action_logs_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_action_logs" ADD CONSTRAINT "admin_action_logs_targetDeviceId_fkey" FOREIGN KEY ("targetDeviceId") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_action_logs" ADD CONSTRAINT "admin_action_logs_targetBindingId_fkey" FOREIGN KEY ("targetBindingId") REFERENCES "user_device_bindings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_action_logs" ADD CONSTRAINT "admin_action_logs_targetCourseOfferingId_fkey" FOREIGN KEY ("targetCourseOfferingId") REFERENCES "course_offerings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_action_logs" ADD CONSTRAINT "admin_action_logs_targetSessionId_fkey" FOREIGN KEY ("targetSessionId") REFERENCES "attendance_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
