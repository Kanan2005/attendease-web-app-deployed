import { randomUUID } from "node:crypto"
import fs from "node:fs"

import {
  AdminActionType,
  AttendanceEventType,
  AttendanceMode,
  AttendanceRecordStatus,
  EmailDispatchRunStatus,
  EmailDispatchTriggerType,
  EmailLogStatus,
  type PrismaClient,
  SecurityEventSeverity,
  SecurityEventType,
} from "@prisma/client"
import { Client } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  academicManagementMigrationPath,
  authRoleContextMigrationPath,
  bluetoothAttendanceCoreMigrationPath,
  buildOutboxEventData,
  createPrismaClient,
  defaultDatabaseUrl,
  destructiveActionAuditSemanticsMigrationPath,
  developmentLifecycleFixtures,
  developmentSeedIds,
  deviceTrustControlsMigrationPath,
  disconnectPrismaClient,
  emailAutomationRuntimeSupportMigrationPath,
  helperReadModelsMigrationPath,
  initialMigrationPath,
  qrGpsAttendanceMigrationPath,
  qrGpsSecurityHardeningMigrationPath,
  queueOutboxEvent,
  recordAdministrativeActionTrail,
  recordAttendanceEditTrail,
  recordAutomationLogTrail,
  recordDeviceActionTrail,
  reportDaywiseAttendanceRollupView,
  reportSessionAttendanceOverviewView,
  reportStudentAttendancePercentageView,
  reportStudentCourseAttendanceOverviewView,
  reportStudentReportOverviewView,
  reportSubjectAttendanceRollupView,
  reportsReadModelsMigrationPath,
  runInTransaction,
  runSerializableTransaction,
  scheduleManagementMigrationPath,
  seedDevelopmentData,
} from "./index"

type PostgresError = Error & {
  code?: string
  constraint?: string
}

type TemporaryDatabase = {
  adminClient: Client
  databaseClient: Client
  databaseUrl: string
  databaseName: string
}

const baseDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? defaultDatabaseUrl
const combinedMigrationSql = [
  fs.readFileSync(initialMigrationPath, "utf8"),
  fs.readFileSync(helperReadModelsMigrationPath, "utf8"),
  fs.readFileSync(authRoleContextMigrationPath, "utf8"),
  fs.readFileSync(deviceTrustControlsMigrationPath, "utf8"),
  fs.readFileSync(academicManagementMigrationPath, "utf8"),
  fs.readFileSync(scheduleManagementMigrationPath, "utf8"),
  fs.readFileSync(qrGpsAttendanceMigrationPath, "utf8"),
  fs.readFileSync(qrGpsSecurityHardeningMigrationPath, "utf8"),
  fs.readFileSync(bluetoothAttendanceCoreMigrationPath, "utf8"),
  fs.readFileSync(reportsReadModelsMigrationPath, "utf8"),
  fs.readFileSync(emailAutomationRuntimeSupportMigrationPath, "utf8"),
  fs.readFileSync(destructiveActionAuditSemanticsMigrationPath, "utf8"),
].join("\n\n")

const fixtureIds = {
  adminUserId: "user_admin",
  teacherUserId: "user_teacher",
  studentOneUserId: "user_student_one",
  studentTwoUserId: "user_student_two",
  teacherAssignmentId: "teacher_assignment_1",
  academicTermId: "academic_term_1",
  semesterId: "semester_1",
  classId: "class_1",
  sectionId: "section_1",
  subjectId: "subject_1",
  courseOfferingId: "course_offering_1",
  enrollmentOneId: "enrollment_1",
  enrollmentTwoId: "enrollment_2",
  attendanceSessionId: "attendance_session_1",
  deviceOneId: "device_1",
  deviceTwoId: "device_2",
  attendanceRecordTwoId: "attendance_record_student_two",
  emailRuleId: "email_rule_helper",
  emailDispatchRunId: "email_dispatch_run_helper",
} as const

function toAdminDatabaseUrl(databaseUrl: string): string {
  const parsed = new URL(databaseUrl)
  parsed.pathname = "/postgres"
  return parsed.toString()
}

function toTempDatabaseUrl(databaseUrl: string, databaseName: string): string {
  const parsed = new URL(databaseUrl)
  parsed.pathname = `/${databaseName}`
  return parsed.toString()
}

async function createTemporaryDatabase(databaseName: string): Promise<TemporaryDatabase> {
  const adminClient = new Client({ connectionString: toAdminDatabaseUrl(baseDatabaseUrl) })
  await adminClient.connect()
  await adminClient.query(`CREATE DATABASE "${databaseName}"`)

  const databaseUrl = toTempDatabaseUrl(baseDatabaseUrl, databaseName)
  const databaseClient = new Client({ connectionString: databaseUrl })
  await databaseClient.connect()
  await databaseClient.query(combinedMigrationSql)

  return {
    adminClient,
    databaseClient,
    databaseUrl,
    databaseName,
  }
}

async function destroyTemporaryDatabase(database: TemporaryDatabase): Promise<void> {
  await database.databaseClient.end()
  await database.adminClient.query(
    `
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid();
    `,
    [database.databaseName],
  )
  await database.adminClient.query(`DROP DATABASE IF EXISTS "${database.databaseName}"`)
  await database.adminClient.end()
}

async function expectDatabaseError(
  action: Promise<unknown>,
  code: string,
  constraint?: string,
): Promise<void> {
  try {
    await action
  } catch (error) {
    const postgresError = error as PostgresError

    expect(postgresError.code).toBe(code)

    if (constraint) {
      expect(postgresError.constraint).toBe(constraint)
    }

    return
  }

  throw new Error("Expected the database operation to fail")
}

async function seedAcademicFixture(client: Client): Promise<void> {
  await client.query(
    `
      INSERT INTO "users" ("id", "email", "displayName", "status", "updatedAt")
      VALUES
        ($1, 'admin@attendease.test', 'Admin User', 'ACTIVE', CURRENT_TIMESTAMP),
        ($2, 'teacher@attendease.test', 'Teacher User', 'ACTIVE', CURRENT_TIMESTAMP),
        ($3, 'student-one@attendease.test', 'Student One', 'ACTIVE', CURRENT_TIMESTAMP),
        ($4, 'student-two@attendease.test', 'Student Two', 'ACTIVE', CURRENT_TIMESTAMP);
    `,
    [
      fixtureIds.adminUserId,
      fixtureIds.teacherUserId,
      fixtureIds.studentOneUserId,
      fixtureIds.studentTwoUserId,
    ],
  )

  await client.query(
    `
      INSERT INTO "academic_terms" ("id", "code", "title", "academicYearLabel", "status", "startDate", "endDate", "updatedAt")
      VALUES ($1, 'AY26', 'Academic Year 2026', '2026-2027', 'ACTIVE', DATE '2026-01-01', DATE '2026-12-31', CURRENT_TIMESTAMP);
    `,
    [fixtureIds.academicTermId],
  )

  await client.query(
    `
      INSERT INTO "semesters" ("id", "academicTermId", "code", "title", "ordinal", "status", "startDate", "endDate", "attendanceCutoffDate", "updatedAt")
      VALUES ($1, $2, 'SEM6', 'Semester 6', 6, 'ACTIVE', DATE '2026-01-01', DATE '2026-06-30', DATE '2026-06-20', CURRENT_TIMESTAMP);
    `,
    [fixtureIds.semesterId, fixtureIds.academicTermId],
  )

  await client.query(
    `
      INSERT INTO "classes" ("id", "code", "title", "programName", "cohortYear", "status", "updatedAt")
      VALUES ($1, 'BTECH-CSE', 'B.Tech CSE', 'Computer Science', 2023, 'ACTIVE', CURRENT_TIMESTAMP);
    `,
    [fixtureIds.classId],
  )

  await client.query(
    `
      INSERT INTO "sections" ("id", "classId", "code", "title", "status", "updatedAt")
      VALUES ($1, $2, 'A', 'Section A', 'ACTIVE', CURRENT_TIMESTAMP);
    `,
    [fixtureIds.sectionId, fixtureIds.classId],
  )

  await client.query(
    `
      INSERT INTO "subjects" ("id", "code", "title", "shortTitle", "status", "updatedAt")
      VALUES ($1, 'MATH101', 'Mathematics', 'Maths', 'ACTIVE', CURRENT_TIMESTAMP);
    `,
    [fixtureIds.subjectId],
  )

  await client.query(
    `
      INSERT INTO "teacher_assignments" (
        "id",
        "teacherId",
        "grantedByUserId",
        "semesterId",
        "classId",
        "sectionId",
        "subjectId",
        "status",
        "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', CURRENT_TIMESTAMP);
    `,
    [
      fixtureIds.teacherAssignmentId,
      fixtureIds.teacherUserId,
      fixtureIds.adminUserId,
      fixtureIds.semesterId,
      fixtureIds.classId,
      fixtureIds.sectionId,
      fixtureIds.subjectId,
    ],
  )

  await client.query(
    `
      INSERT INTO "course_offerings" (
        "id",
        "semesterId",
        "classId",
        "sectionId",
        "subjectId",
        "primaryTeacherId",
        "createdByUserId",
        "code",
        "displayTitle",
        "status",
        "defaultAttendanceMode",
        "defaultGpsRadiusMeters",
        "defaultSessionDurationMinutes",
        "qrRotationWindowSeconds",
        "bluetoothRotationWindowSeconds",
        "timezone",
        "requiresTrustedDevice",
        "updatedAt"
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        'CO-MATH-SEM6-A',
        'Mathematics - Semester 6',
        'ACTIVE',
        'QR_GPS',
        100,
        15,
        15,
        10,
        'Asia/Kolkata',
        true,
        CURRENT_TIMESTAMP
      );
    `,
    [
      fixtureIds.courseOfferingId,
      fixtureIds.semesterId,
      fixtureIds.classId,
      fixtureIds.sectionId,
      fixtureIds.subjectId,
      fixtureIds.teacherUserId,
      fixtureIds.teacherUserId,
    ],
  )

  await client.query(
    `
      INSERT INTO "enrollments" (
        "id",
        "courseOfferingId",
        "studentId",
        "semesterId",
        "classId",
        "sectionId",
        "subjectId",
        "status",
        "source",
        "updatedAt"
      )
      VALUES
        ($1, $3, $5, $7, $9, $11, $13, 'ACTIVE', 'MANUAL', CURRENT_TIMESTAMP),
        ($2, $4, $6, $8, $10, $12, $14, 'ACTIVE', 'MANUAL', CURRENT_TIMESTAMP);
    `,
    [
      fixtureIds.enrollmentOneId,
      fixtureIds.enrollmentTwoId,
      fixtureIds.courseOfferingId,
      fixtureIds.courseOfferingId,
      fixtureIds.studentOneUserId,
      fixtureIds.studentTwoUserId,
      fixtureIds.semesterId,
      fixtureIds.semesterId,
      fixtureIds.classId,
      fixtureIds.classId,
      fixtureIds.sectionId,
      fixtureIds.sectionId,
      fixtureIds.subjectId,
      fixtureIds.subjectId,
    ],
  )

  await client.query(
    `
      INSERT INTO "attendance_sessions" (
        "id",
        "courseOfferingId",
        "teacherAssignmentId",
        "teacherId",
        "semesterId",
        "classId",
        "sectionId",
        "subjectId",
        "mode",
        "status",
        "startedAt",
        "scheduledEndAt",
        "gpsRadiusMeters",
        "qrRotationWindowSeconds",
        "rosterSnapshotCount",
        "presentCount",
        "absentCount",
        "updatedAt"
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        'QR_GPS',
        'ACTIVE',
        TIMESTAMP '2026-03-14 09:00:00',
        TIMESTAMP '2026-03-14 09:15:00',
        100,
        15,
        2,
        0,
        2,
        CURRENT_TIMESTAMP
      );
    `,
    [
      fixtureIds.attendanceSessionId,
      fixtureIds.courseOfferingId,
      fixtureIds.teacherAssignmentId,
      fixtureIds.teacherUserId,
      fixtureIds.semesterId,
      fixtureIds.classId,
      fixtureIds.sectionId,
      fixtureIds.subjectId,
    ],
  )

  await client.query(
    `
      INSERT INTO "devices" (
        "id",
        "installId",
        "platform",
        "publicKey",
        "attestationStatus",
        "updatedAt"
      )
      VALUES
        ($1, 'install-device-1', 'ANDROID', 'public-key-one', 'PASSED', CURRENT_TIMESTAMP),
        ($2, 'install-device-2', 'ANDROID', 'public-key-two', 'PASSED', CURRENT_TIMESTAMP);
    `,
    [fixtureIds.deviceOneId, fixtureIds.deviceTwoId],
  )
}

describe.sequential("db migration integrity and helpers", () => {
  const databaseName = `attendease_schema_${randomUUID().replaceAll("-", "")}`

  let database: TemporaryDatabase
  let prisma: PrismaClient

  beforeAll(async () => {
    database = await createTemporaryDatabase(databaseName)
    await seedAcademicFixture(database.databaseClient)
    prisma = createPrismaClient({
      databaseUrl: database.databaseUrl,
      singleton: false,
    })
  })

  afterAll(async () => {
    if (prisma) {
      await disconnectPrismaClient(prisma)
    }

    if (database) {
      await destroyTemporaryDatabase(database)
    }
  })

  it("prevents duplicate attendance records for the same session-student pair", async () => {
    await database.databaseClient.query(
      `
        INSERT INTO "attendance_records" (
          "id",
          "sessionId",
          "enrollmentId",
          "studentId",
          "status",
          "markSource",
          "markedAt",
          "updatedAt"
        )
        VALUES (
          'attendance_record_1',
          $1,
          $2,
          $3,
          'PRESENT',
          'QR_GPS',
          TIMESTAMP '2026-03-14 09:01:00',
          CURRENT_TIMESTAMP
        );
      `,
      [fixtureIds.attendanceSessionId, fixtureIds.enrollmentOneId, fixtureIds.studentOneUserId],
    )

    await expectDatabaseError(
      database.databaseClient.query(
        `
          INSERT INTO "attendance_records" (
            "id",
            "sessionId",
            "enrollmentId",
            "studentId",
            "status",
            "updatedAt"
          )
          VALUES ('attendance_record_duplicate', $1, $2, $3, 'ABSENT', CURRENT_TIMESTAMP);
        `,
        [fixtureIds.attendanceSessionId, fixtureIds.enrollmentOneId, fixtureIds.studentOneUserId],
      ),
      "23505",
      "attendance_records_sessionId_studentId_key",
    )
  })

  it("allows historical join codes but blocks more than one active code per classroom", async () => {
    await database.databaseClient.query(
      `
        INSERT INTO "classroom_join_codes" (
          "id",
          "courseOfferingId",
          "createdByUserId",
          "code",
          "status",
          "expiresAt"
        )
        VALUES ('join_code_active', $1, $2, 'ACTIVE123', 'ACTIVE', TIMESTAMP '2026-12-31 23:59:59');
      `,
      [fixtureIds.courseOfferingId, fixtureIds.teacherUserId],
    )

    await expectDatabaseError(
      database.databaseClient.query(
        `
          INSERT INTO "classroom_join_codes" (
            "id",
            "courseOfferingId",
            "createdByUserId",
            "code",
            "status",
            "expiresAt"
          )
          VALUES ('join_code_active_two', $1, $2, 'ACTIVE456', 'ACTIVE', TIMESTAMP '2026-12-31 23:59:59');
        `,
        [fixtureIds.courseOfferingId, fixtureIds.teacherUserId],
      ),
      "23505",
      "classroom_join_codes_one_active_code_per_course_offering_idx",
    )

    await database.databaseClient.query(
      `
        INSERT INTO "classroom_join_codes" (
          "id",
          "courseOfferingId",
          "createdByUserId",
          "code",
          "status",
          "expiresAt"
        )
        VALUES ('join_code_expired', $1, $2, 'EXPIRED123', 'EXPIRED', TIMESTAMP '2026-12-31 23:59:59');
      `,
      [fixtureIds.courseOfferingId, fixtureIds.teacherUserId],
    )
  })

  it("enforces strict active student device binding rules while allowing other binding types", async () => {
    await database.databaseClient.query(
      `
        INSERT INTO "user_device_bindings" (
          "id",
          "userId",
          "deviceId",
          "bindingType",
          "status",
          "activatedAt",
          "updatedAt"
        )
        VALUES ('binding_student_one', $1, $2, 'STUDENT_ATTENDANCE', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      `,
      [fixtureIds.studentOneUserId, fixtureIds.deviceOneId],
    )

    await expectDatabaseError(
      database.databaseClient.query(
        `
          INSERT INTO "user_device_bindings" (
            "id",
            "userId",
            "deviceId",
            "bindingType",
            "status",
            "activatedAt",
            "updatedAt"
          )
          VALUES ('binding_student_two_same_device', $1, $2, 'STUDENT_ATTENDANCE', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        `,
        [fixtureIds.studentTwoUserId, fixtureIds.deviceOneId],
      ),
      "23505",
      "user_device_bindings_one_active_student_binding_per_device_idx",
    )

    await expectDatabaseError(
      database.databaseClient.query(
        `
          INSERT INTO "user_device_bindings" (
            "id",
            "userId",
            "deviceId",
            "bindingType",
            "status",
            "activatedAt",
            "updatedAt"
          )
          VALUES ('binding_student_one_second_device', $1, $2, 'STUDENT_ATTENDANCE', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        `,
        [fixtureIds.studentOneUserId, fixtureIds.deviceTwoId],
      ),
      "23505",
      "user_device_bindings_one_active_device_per_student_idx",
    )

    await database.databaseClient.query(
      `
        INSERT INTO "user_device_bindings" (
          "id",
          "userId",
          "deviceId",
          "bindingType",
          "status",
          "activatedAt",
          "updatedAt"
        )
        VALUES ('binding_teacher_access', $1, $2, 'TEACHER_ACCESS', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      `,
      [fixtureIds.teacherUserId, fixtureIds.deviceOneId],
    )
  })

  it("rejects invalid schedule and automation values with check constraints", async () => {
    await expectDatabaseError(
      database.databaseClient.query(
        `
          INSERT INTO "semesters" (
            "id",
            "academicTermId",
            "code",
            "title",
            "status",
            "startDate",
            "endDate",
            "attendanceCutoffDate",
            "updatedAt"
          )
          VALUES (
            'invalid_semester_window',
            $1,
            'SEM-INVALID',
            'Invalid Semester',
            'DRAFT',
            DATE '2026-05-01',
            DATE '2026-04-01',
            DATE '2026-04-15',
            CURRENT_TIMESTAMP
          );
        `,
        [fixtureIds.academicTermId],
      ),
      "23514",
      "semesters_date_window_check",
    )

    await expectDatabaseError(
      database.databaseClient.query(
        `
          INSERT INTO "course_schedule_slots" (
            "id",
            "courseOfferingId",
            "weekday",
            "startMinutes",
            "endMinutes",
            "status",
            "updatedAt"
          )
          VALUES ('invalid_slot', $1, 0, 600, 660, 'ACTIVE', CURRENT_TIMESTAMP);
        `,
        [fixtureIds.courseOfferingId],
      ),
      "23514",
      "course_schedule_slots_time_window_check",
    )

    await expectDatabaseError(
      database.databaseClient.query(
        `
          INSERT INTO "lectures" (
            "id",
            "courseOfferingId",
            "lectureDate",
            "plannedStartAt",
            "plannedEndAt",
            "status",
            "updatedAt"
          )
          VALUES (
            'invalid_lecture_window',
            $1,
            DATE '2026-03-14',
            TIMESTAMP '2026-03-14 11:00:00+00',
            TIMESTAMP '2026-03-14 10:00:00+00',
            'PLANNED',
            CURRENT_TIMESTAMP
          );
        `,
        [fixtureIds.courseOfferingId],
      ),
      "23514",
      "lectures_time_window_check",
    )

    await expectDatabaseError(
      database.databaseClient.query(
        `
          INSERT INTO "course_schedule_exceptions" (
            "id",
            "courseOfferingId",
            "exceptionType",
            "effectiveDate",
            "startMinutes",
            "endMinutes",
            "updatedAt"
          )
          VALUES (
            'invalid_exception_window',
            $1,
            'ONE_OFF',
            DATE '2026-03-28',
            780,
            720,
            CURRENT_TIMESTAMP
          );
        `,
        [fixtureIds.courseOfferingId],
      ),
      "23514",
      "course_schedule_exceptions_time_override_check",
    )

    await expectDatabaseError(
      database.databaseClient.query(
        `
          INSERT INTO "email_automation_rules" (
            "id",
            "courseOfferingId",
            "createdByUserId",
            "status",
            "thresholdPercent",
            "scheduleHourLocal",
            "scheduleMinuteLocal",
            "timezone",
            "templateSubject",
            "templateBody",
            "updatedAt"
          )
          VALUES (
            'invalid_email_rule',
            $1,
            $2,
            'ACTIVE',
            75.00,
            24,
            0,
            'Asia/Kolkata',
            'Low attendance',
            'Please improve attendance.',
            CURRENT_TIMESTAMP
          );
        `,
        [fixtureIds.courseOfferingId, fixtureIds.teacherUserId],
      ),
      "23514",
      "email_automation_rules_schedule_check",
    )
  })

  it("rejects duplicate slot exceptions and duplicate lecture linkage for one occurrence", async () => {
    await prisma.courseScheduleSlot.create({
      data: {
        id: "slot_duplicate_check",
        courseOfferingId: fixtureIds.courseOfferingId,
        weekday: 5,
        startMinutes: 540,
        endMinutes: 600,
        status: "ACTIVE",
      },
    })

    await prisma.courseScheduleException.create({
      data: {
        id: "exception_duplicate_check",
        courseOfferingId: fixtureIds.courseOfferingId,
        scheduleSlotId: "slot_duplicate_check",
        exceptionType: "RESCHEDULED",
        effectiveDate: new Date("2026-08-14T00:00:00.000Z"),
        startMinutes: 660,
        endMinutes: 720,
      },
    })

    await expectDatabaseError(
      database.databaseClient.query(
        `
          INSERT INTO "course_schedule_exceptions" (
            "id",
            "courseOfferingId",
            "scheduleSlotId",
            "exceptionType",
            "effectiveDate",
            "startMinutes",
            "endMinutes",
            "updatedAt"
          )
          VALUES (
            'exception_duplicate_conflict',
            $1,
            'slot_duplicate_check',
            'CANCELLED',
            DATE '2026-08-14',
            NULL,
            NULL,
            CURRENT_TIMESTAMP
          );
        `,
        [fixtureIds.courseOfferingId],
      ),
      "23505",
      "course_schedule_exceptions_one_slot_exception_per_day_idx",
    )

    await prisma.lecture.create({
      data: {
        id: "lecture_duplicate_exception",
        courseOfferingId: fixtureIds.courseOfferingId,
        scheduleSlotId: "slot_duplicate_check",
        scheduleExceptionId: "exception_duplicate_check",
        lectureDate: new Date("2026-08-14T00:00:00.000Z"),
        status: "PLANNED",
      },
    })

    await expectDatabaseError(
      database.databaseClient.query(
        `
          INSERT INTO "lectures" (
            "id",
            "courseOfferingId",
            "scheduleSlotId",
            "scheduleExceptionId",
            "lectureDate",
            "status",
            "updatedAt"
          )
          VALUES (
            'lecture_duplicate_exception_conflict',
            $1,
            'slot_duplicate_check',
            'exception_duplicate_check',
            DATE '2026-08-14',
            'PLANNED',
            CURRENT_TIMESTAMP
          );
        `,
        [fixtureIds.courseOfferingId],
      ),
      "23505",
      "lectures_one_schedule_exception_idx",
    )

    await prisma.lecture.create({
      data: {
        id: "lecture_duplicate_slot_occurrence",
        courseOfferingId: fixtureIds.courseOfferingId,
        scheduleSlotId: "slot_duplicate_check",
        lectureDate: new Date("2026-08-21T00:00:00.000Z"),
        status: "PLANNED",
      },
    })

    await expectDatabaseError(
      database.databaseClient.query(
        `
          INSERT INTO "lectures" (
            "id",
            "courseOfferingId",
            "scheduleSlotId",
            "lectureDate",
            "status",
            "updatedAt"
          )
          VALUES (
            'lecture_duplicate_slot_occurrence_conflict',
            $1,
            'slot_duplicate_check',
            DATE '2026-08-21',
            'PLANNED',
            CURRENT_TIMESTAMP
          );
        `,
        [fixtureIds.courseOfferingId],
      ),
      "23505",
      "lectures_one_slot_occurrence_idx",
    )
  })

  it("protects export file uniqueness, analytics bounds, and outbox attempt integrity", async () => {
    await prisma.exportJob.create({
      data: {
        id: "export_job_session_csv",
        requestedByUserId: fixtureIds.teacherUserId,
        courseOfferingId: fixtureIds.courseOfferingId,
        jobType: "SESSION_CSV",
        status: "QUEUED",
      },
    })

    await prisma.exportJobFile.create({
      data: {
        id: "export_job_file_one",
        exportJobId: "export_job_session_csv",
        objectKey: "exports/session-1.csv",
        fileName: "session-1.csv",
        mimeType: "text/csv",
        status: "READY",
      },
    })

    await expect(
      prisma.exportJobFile.create({
        data: {
          id: "export_job_file_duplicate",
          exportJobId: "export_job_session_csv",
          objectKey: "exports/session-1.csv",
          fileName: "session-1-copy.csv",
          mimeType: "text/csv",
          status: "READY",
        },
      }),
    ).rejects.toMatchObject({
      code: "P2002",
    })

    await expectDatabaseError(
      database.databaseClient.query(
        `
          INSERT INTO "analytics_daily_attendance" (
            "courseOfferingId",
            "attendanceDate",
            "totalStudents",
            "presentCount",
            "absentCount",
            "attendanceRate",
            "updatedAt"
          )
          VALUES ($1, DATE '2026-03-14', 2, 2, 0, 101.00, CURRENT_TIMESTAMP);
        `,
        [fixtureIds.courseOfferingId],
      ),
      "23514",
      "analytics_daily_attendance_rate_check",
    )

    await expectDatabaseError(
      database.databaseClient.query(
        `
          INSERT INTO "outbox_events" (
            "id",
            "topic",
            "aggregateType",
            "aggregateId",
            "payload",
            "attemptCount",
            "updatedAt"
          )
          VALUES (
            'outbox_invalid_attempts',
            'analytics.refresh',
            'attendance_session',
            $1,
            '{"sessionId":"attendance_session_1"}'::jsonb,
            -1,
            CURRENT_TIMESTAMP
          );
        `,
        [fixtureIds.attendanceSessionId],
      ),
      "23514",
      "outbox_events_attempt_count_check",
    )
  })

  it("commits and rolls back shared transaction helpers correctly", async () => {
    await runInTransaction(prisma, async (transaction) => {
      await queueOutboxEvent(transaction, {
        id: "outbox_commit_success",
        topic: "test.commit",
        aggregateType: "attendance_session",
        aggregateId: fixtureIds.attendanceSessionId,
        payload: {
          committed: true,
        },
      })
    })

    const committedOutboxCount = await prisma.outboxEvent.count({
      where: {
        id: "outbox_commit_success",
      },
    })

    expect(committedOutboxCount).toBe(1)

    await expect(
      runSerializableTransaction(prisma, async (transaction) => {
        await transaction.outboxEvent.create({
          data: buildOutboxEventData({
            id: "outbox_rollback_test",
            topic: "test.rollback",
            aggregateType: "attendance_session",
            aggregateId: fixtureIds.attendanceSessionId,
            payload: {
              rolledBack: true,
            },
          }),
        })

        throw new Error("rollback requested")
      }),
    ).rejects.toThrow("rollback requested")

    const rolledBackOutboxCount = await prisma.outboxEvent.count({
      where: {
        id: "outbox_rollback_test",
      },
    })

    expect(rolledBackOutboxCount).toBe(0)
  })

  it("persists attendance, device, and automation audit helpers coherently", async () => {
    await prisma.attendanceRecord.create({
      data: {
        id: fixtureIds.attendanceRecordTwoId,
        sessionId: fixtureIds.attendanceSessionId,
        enrollmentId: fixtureIds.enrollmentTwoId,
        studentId: fixtureIds.studentTwoUserId,
        status: AttendanceRecordStatus.ABSENT,
      },
    })

    await runInTransaction(prisma, async (transaction) => {
      await recordAttendanceEditTrail(transaction, {
        attendanceEvent: {
          id: "attendance_event_manual_edit",
          sessionId: fixtureIds.attendanceSessionId,
          attendanceRecordId: fixtureIds.attendanceRecordTwoId,
          studentId: fixtureIds.studentTwoUserId,
          actorUserId: fixtureIds.teacherUserId,
          eventType: AttendanceEventType.MANUAL_MARK_PRESENT,
          mode: AttendanceMode.MANUAL,
          previousStatus: AttendanceRecordStatus.ABSENT,
          newStatus: AttendanceRecordStatus.PRESENT,
        },
        auditLog: {
          id: "attendance_edit_audit_manual_edit",
          sessionId: fixtureIds.attendanceSessionId,
          attendanceRecordId: fixtureIds.attendanceRecordTwoId,
          studentId: fixtureIds.studentTwoUserId,
          editedByUserId: fixtureIds.teacherUserId,
          previousStatus: AttendanceRecordStatus.ABSENT,
          newStatus: AttendanceRecordStatus.PRESENT,
        },
        outboxEvent: {
          id: "attendance_edit_outbox",
          topic: "attendance.edit.saved",
          aggregateType: "attendance_record",
          aggregateId: fixtureIds.attendanceRecordTwoId,
          payload: {
            sessionId: fixtureIds.attendanceSessionId,
          },
        },
      })
    })

    await runInTransaction(prisma, async (transaction) => {
      await recordDeviceActionTrail(transaction, {
        securityEvent: {
          id: "device_action_security_event",
          userId: fixtureIds.studentOneUserId,
          actorUserId: fixtureIds.adminUserId,
          deviceId: fixtureIds.deviceOneId,
          courseOfferingId: fixtureIds.courseOfferingId,
          sessionId: fixtureIds.attendanceSessionId,
          eventType: SecurityEventType.DEVICE_REVOKED,
          severity: SecurityEventSeverity.MEDIUM,
          description: "Support revoked a device during testing.",
        },
        adminAction: {
          id: "device_action_admin_log",
          adminUserId: fixtureIds.adminUserId,
          targetUserId: fixtureIds.studentOneUserId,
          targetDeviceId: fixtureIds.deviceOneId,
          actionType: AdminActionType.DEVICE_REVOKE,
        },
        outboxEvent: {
          id: "device_action_outbox",
          topic: "device.binding.revoked",
          aggregateType: "device_binding",
          aggregateId: "binding_student_one",
          payload: {
            userId: fixtureIds.studentOneUserId,
          },
        },
      })
    })

    await runInTransaction(prisma, async (transaction) => {
      await recordAdministrativeActionTrail(transaction, {
        adminAction: {
          id: "classroom_member_remove_admin_log",
          adminUserId: fixtureIds.adminUserId,
          targetUserId: fixtureIds.studentTwoUserId,
          targetCourseOfferingId: fixtureIds.courseOfferingId,
          actionType: AdminActionType.CLASSROOM_STUDENT_REMOVE,
          metadata: {
            enrollmentId: fixtureIds.enrollmentTwoId,
            previousStatus: "ACTIVE",
            nextStatus: "DROPPED",
          },
        },
        outboxEvent: {
          id: "classroom_member_remove_outbox",
          topic: "classroom.roster.member_removed",
          aggregateType: "course_offering",
          aggregateId: fixtureIds.courseOfferingId,
          payload: {
            enrollmentId: fixtureIds.enrollmentTwoId,
            studentId: fixtureIds.studentTwoUserId,
          },
        },
      })
    })

    await prisma.emailAutomationRule.create({
      data: {
        id: fixtureIds.emailRuleId,
        courseOfferingId: fixtureIds.courseOfferingId,
        createdByUserId: fixtureIds.teacherUserId,
        status: "ACTIVE",
        thresholdPercent: 75,
        scheduleHourLocal: 18,
        scheduleMinuteLocal: 0,
        timezone: "Asia/Kolkata",
        templateSubject: "Attendance below 75%",
        templateBody: "Please improve your attendance.",
      },
    })

    await prisma.emailDispatchRun.create({
      data: {
        id: fixtureIds.emailDispatchRunId,
        ruleId: fixtureIds.emailRuleId,
        requestedByUserId: fixtureIds.teacherUserId,
        triggerType: EmailDispatchTriggerType.MANUAL,
        dispatchDate: new Date("2026-03-14"),
        status: EmailDispatchRunStatus.COMPLETED,
        targetedStudentCount: 1,
        sentCount: 1,
        failedCount: 0,
      },
    })

    await runInTransaction(prisma, async (transaction) => {
      await recordAutomationLogTrail(transaction, {
        emailLog: {
          id: "automation_email_log",
          dispatchRunId: fixtureIds.emailDispatchRunId,
          ruleId: fixtureIds.emailRuleId,
          studentId: fixtureIds.studentTwoUserId,
          recipientEmail: "student-two@attendease.test",
          subject: "Attendance reminder",
          body: "Your attendance is below threshold.",
          status: EmailLogStatus.SENT,
        },
        outboxEvent: {
          id: "automation_email_outbox",
          topic: "email.low_attendance.sent",
          aggregateType: "email_dispatch_run",
          aggregateId: fixtureIds.emailDispatchRunId,
          payload: {
            recipient: "student-two@attendease.test",
          },
        },
      })
    })

    expect(
      await prisma.attendanceEvent.count({
        where: {
          id: "attendance_event_manual_edit",
        },
      }),
    ).toBe(1)
    expect(
      await prisma.attendanceEditAuditLog.count({
        where: {
          id: "attendance_edit_audit_manual_edit",
        },
      }),
    ).toBe(1)
    expect(
      await prisma.securityEvent.count({
        where: {
          id: "device_action_security_event",
        },
      }),
    ).toBe(1)
    expect(
      await prisma.adminActionLog.count({
        where: {
          id: "device_action_admin_log",
        },
      }),
    ).toBe(1)
    expect(
      await prisma.adminActionLog.count({
        where: {
          id: "classroom_member_remove_admin_log",
        },
      }),
    ).toBe(1)
    expect(
      await prisma.emailLog.count({
        where: {
          id: "automation_email_log",
        },
      }),
    ).toBe(1)
    expect(
      await prisma.outboxEvent.count({
        where: {
          id: "classroom_member_remove_outbox",
        },
      }),
    ).toBe(1)
  })

  it("supports the student self-registration write graph with device binding and session rows", async () => {
    const suffix = randomUUID().replaceAll("-", "")
    const userId = `student_self_register_${suffix}`
    const deviceId = `device_self_register_${suffix}`
    const bindingId = `binding_self_register_${suffix}`
    const sessionId = `session_self_register_${suffix}`
    const refreshTokenId = `refresh_self_register_${suffix}`
    const email = `student.self.${suffix}@attendease.test`
    const refreshTokenExpiresAt = new Date("2026-05-01T09:00:00.000Z")

    await prisma.device.create({
      data: {
        id: deviceId,
        installId: `install-self-register-${suffix}`,
        platform: "ANDROID",
        publicKey: `public-key-${suffix}`,
        appVersion: "1.0.0",
        deviceModel: "Pixel Test",
        osVersion: "Android 15",
      },
    })

    await runInTransaction(prisma, async (transaction) => {
      await transaction.user.create({
        data: {
          id: userId,
          email,
          displayName: "Student Self Register",
          status: "ACTIVE",
          lastLoginAt: new Date("2026-03-15T09:00:00.000Z"),
          credentials: {
            create: {
              passwordHash: "hashed-password-placeholder",
              passwordChangedAt: new Date("2026-03-15T09:00:00.000Z"),
            },
          },
          roles: {
            create: {
              role: "STUDENT",
            },
          },
          studentProfile: {
            create: {},
          },
        },
      })

      await transaction.userDeviceBinding.create({
        data: {
          id: bindingId,
          userId,
          deviceId,
          bindingType: "STUDENT_ATTENDANCE",
          status: "ACTIVE",
          activatedAt: new Date("2026-03-15T09:00:00.000Z"),
        },
      })

      await recordDeviceActionTrail(transaction, {
        securityEvent: {
          id: `device_bound_${suffix}`,
          userId,
          deviceId,
          bindingId,
          eventType: SecurityEventType.DEVICE_BOUND,
          severity: SecurityEventSeverity.LOW,
          description: "Student self-registration bound the first trusted device.",
          metadata: {
            source: "REGISTER",
          },
        },
      })

      await transaction.authSession.create({
        data: {
          id: sessionId,
          userId,
          deviceId,
          platform: "MOBILE",
          activeRole: "STUDENT",
          status: "ACTIVE",
          expiresAt: refreshTokenExpiresAt,
        },
      })

      await transaction.refreshToken.create({
        data: {
          id: refreshTokenId,
          sessionId,
          userId,
          tokenHash: `refresh-hash-${suffix}`,
          expiresAt: refreshTokenExpiresAt,
        },
      })
    })

    const createdUser = await prisma.user.findUniqueOrThrow({
      where: {
        id: userId,
      },
      include: {
        credentials: true,
        roles: true,
        studentProfile: true,
      },
    })
    const createdBinding = await prisma.userDeviceBinding.findUniqueOrThrow({
      where: {
        id: bindingId,
      },
    })
    const createdSession = await prisma.authSession.findUniqueOrThrow({
      where: {
        id: sessionId,
      },
    })
    const createdRefreshToken = await prisma.refreshToken.findUniqueOrThrow({
      where: {
        id: refreshTokenId,
      },
    })
    const deviceBoundEvent = await prisma.securityEvent.findFirst({
      where: {
        userId,
        bindingId,
        eventType: SecurityEventType.DEVICE_BOUND,
      },
    })

    expect(createdUser.email).toBe(email)
    expect(createdUser.credentials?.passwordHash).toBe("hashed-password-placeholder")
    expect(createdUser.roles.map((role) => role.role)).toEqual(["STUDENT"])
    expect(createdUser.studentProfile?.attendanceDisabled).toBe(false)
    expect(createdBinding.status).toBe("ACTIVE")
    expect(createdBinding.deviceId).toBe(deviceId)
    expect(createdSession.deviceId).toBe(deviceId)
    expect(createdRefreshToken.sessionId).toBe(sessionId)
    expect(deviceBoundEvent?.deviceId).toBe(deviceId)
  })

  it("supports the teacher self-registration write graph with profile and session rows", async () => {
    const suffix = randomUUID().replaceAll("-", "")
    const userId = `teacher_self_register_${suffix}`
    const deviceId = `device_teacher_self_register_${suffix}`
    const sessionId = `session_teacher_self_register_${suffix}`
    const refreshTokenId = `refresh_teacher_self_register_${suffix}`
    const email = `teacher.self.${suffix}@attendease.test`
    const refreshTokenExpiresAt = new Date("2026-05-01T09:00:00.000Z")

    await prisma.device.create({
      data: {
        id: deviceId,
        installId: `install-teacher-self-register-${suffix}`,
        platform: "ANDROID",
        publicKey: `teacher-public-key-${suffix}`,
        appVersion: "1.0.0",
        deviceModel: "Pixel Teacher",
        osVersion: "Android 15",
      },
    })

    await runInTransaction(prisma, async (transaction) => {
      await transaction.user.create({
        data: {
          id: userId,
          email,
          displayName: "Teacher Self Register",
          status: "ACTIVE",
          lastLoginAt: new Date("2026-03-15T09:00:00.000Z"),
          credentials: {
            create: {
              passwordHash: "hashed-teacher-password-placeholder",
              passwordChangedAt: new Date("2026-03-15T09:00:00.000Z"),
            },
          },
          roles: {
            create: {
              role: "TEACHER",
            },
          },
          teacherProfile: {
            create: {},
          },
        },
      })

      await transaction.authSession.create({
        data: {
          id: sessionId,
          userId,
          deviceId,
          platform: "MOBILE",
          activeRole: "TEACHER",
          status: "ACTIVE",
          expiresAt: refreshTokenExpiresAt,
        },
      })

      await transaction.refreshToken.create({
        data: {
          id: refreshTokenId,
          sessionId,
          userId,
          tokenHash: `teacher-refresh-hash-${suffix}`,
          expiresAt: refreshTokenExpiresAt,
        },
      })
    })

    const createdUser = await prisma.user.findUniqueOrThrow({
      where: {
        id: userId,
      },
      include: {
        credentials: true,
        roles: true,
        teacherProfile: true,
      },
    })
    const createdSession = await prisma.authSession.findUniqueOrThrow({
      where: {
        id: sessionId,
      },
    })
    const createdRefreshToken = await prisma.refreshToken.findUniqueOrThrow({
      where: {
        id: refreshTokenId,
      },
    })
    const teacherBindings = await prisma.userDeviceBinding.count({
      where: {
        userId,
      },
    })

    expect(createdUser.email).toBe(email)
    expect(createdUser.credentials?.passwordHash).toBe("hashed-teacher-password-placeholder")
    expect(createdUser.roles.map((role) => role.role)).toEqual(["TEACHER"])
    expect(createdUser.teacherProfile).toBeTruthy()
    expect(createdSession.activeRole).toBe("TEACHER")
    expect(createdSession.deviceId).toBe(deviceId)
    expect(createdRefreshToken.sessionId).toBe(sessionId)
    expect(teacherBindings).toBe(0)
  })
})

describe.sequential("development seed and read models", () => {
  const databaseName = `attendease_seed_${randomUUID().replaceAll("-", "")}`

  let database: TemporaryDatabase
  let prisma: PrismaClient

  beforeAll(async () => {
    database = await createTemporaryDatabase(databaseName)
    prisma = createPrismaClient({
      databaseUrl: database.databaseUrl,
      singleton: false,
    })
  })

  afterAll(async () => {
    if (prisma) {
      await disconnectPrismaClient(prisma)
    }

    if (database) {
      await destroyTemporaryDatabase(database)
    }
  })

  it("seeds core development data idempotently", async () => {
    const firstRun = await seedDevelopmentData(prisma)
    const secondRun = await seedDevelopmentData(prisma)

    expect(firstRun).toEqual(secondRun)
    expect(firstRun).toEqual({
      userCount: 6,
      classroomCount: 2,
      activeJoinCodes: ["MATH6A", "PHY6A"],
      seededSessionId: developmentSeedIds.sessions.mathCompleted,
      seededEmailRuleId: developmentSeedIds.emailAutomation.rule,
      pendingOutboxTopics: ["analytics.attendance.refresh"],
    })
  })

  it("populates the session and student report views from seeded data", async () => {
    const sessionRows = await database.databaseClient.query(
      `SELECT * FROM "${reportSessionAttendanceOverviewView}" WHERE session_id = $1`,
      [developmentSeedIds.sessions.mathCompleted],
    )
    const studentRows = await database.databaseClient.query(
      `SELECT * FROM "${reportStudentCourseAttendanceOverviewView}" WHERE course_offering_id = $1 ORDER BY student_email`,
      [developmentSeedIds.courseOfferings.math],
    )

    expect(sessionRows.rows[0]).toMatchObject({
      session_id: developmentSeedIds.sessions.mathCompleted,
      course_offering_id: developmentSeedIds.courseOfferings.math,
      attendance_mode: "QR_GPS",
      present_count: 3,
      absent_count: 1,
      roster_snapshot_count: 4,
    })

    expect(studentRows.rows).toHaveLength(4)
    expect(
      studentRows.rows.find((row) => row.student_id === developmentSeedIds.users.studentOne),
    ).toMatchObject({
      present_sessions: 1,
      absent_sessions: 0,
    })
    expect(
      studentRows.rows.find((row) => row.student_id === developmentSeedIds.users.studentFour),
    ).toMatchObject({
      present_sessions: 0,
      absent_sessions: 1,
      attendance_percentage: "0.00",
    })
  })

  it("populates the teacher and student reporting read models from seeded final attendance truth", async () => {
    const [daywiseRows, subjectRows, studentRows, overviewRows] = await Promise.all([
      database.databaseClient.query(
        `SELECT * FROM "${reportDaywiseAttendanceRollupView}" WHERE course_offering_id = $1 ORDER BY attendance_date`,
        [developmentSeedIds.courseOfferings.math],
      ),
      database.databaseClient.query(
        `SELECT * FROM "${reportSubjectAttendanceRollupView}" WHERE course_offering_id = $1`,
        [developmentSeedIds.courseOfferings.math],
      ),
      database.databaseClient.query(
        `SELECT * FROM "${reportStudentAttendancePercentageView}" WHERE course_offering_id = $1 ORDER BY student_email`,
        [developmentSeedIds.courseOfferings.math],
      ),
      database.databaseClient.query(
        `SELECT * FROM "${reportStudentReportOverviewView}" WHERE student_id = $1`,
        [developmentSeedIds.users.studentOne],
      ),
    ])

    expect(daywiseRows.rows).toHaveLength(1)
    expect(daywiseRows.rows[0]).toMatchObject({
      course_offering_id: developmentSeedIds.courseOfferings.math,
      session_count: 1,
      total_students: 4,
      present_count: 3,
      absent_count: 1,
    })

    expect(subjectRows.rows).toHaveLength(1)
    expect(subjectRows.rows[0]).toMatchObject({
      course_offering_id: developmentSeedIds.courseOfferings.math,
      total_sessions: 1,
      total_students: 4,
      present_count: 3,
      absent_count: 1,
    })

    expect(studentRows.rows).toHaveLength(4)
    expect(
      studentRows.rows.find((row) => row.student_id === developmentSeedIds.users.studentThree),
    ).toMatchObject({
      present_sessions: 1,
      absent_sessions: 0,
      enrollment_status: "ACTIVE",
    })
    expect(
      studentRows.rows.find((row) => row.student_id === developmentSeedIds.users.studentFour),
    ).toMatchObject({
      present_sessions: 0,
      absent_sessions: 1,
      enrollment_status: "ACTIVE",
    })

    expect(overviewRows.rows).toHaveLength(1)
    expect(overviewRows.rows[0]).toMatchObject({
      student_id: developmentSeedIds.users.studentOne,
      tracked_classroom_count: 2,
      total_sessions: 1,
      present_sessions: 1,
      absent_sessions: 0,
    })
  })

  it("preserves roster snapshot truth, manual edit history, and trusted-device links in seeded data", async () => {
    await seedDevelopmentData(prisma)

    const session = await prisma.attendanceSession.findUniqueOrThrow({
      where: {
        id: developmentSeedIds.sessions.mathCompleted,
      },
      include: {
        attendanceRecords: true,
        attendanceEditAuditLogs: true,
      },
    })

    const manualRecord = await prisma.attendanceRecord.findUniqueOrThrow({
      where: {
        sessionId_studentId: {
          sessionId: developmentSeedIds.sessions.mathCompleted,
          studentId: developmentSeedIds.users.studentThree,
        },
      },
    })

    const trustedBinding = await prisma.userDeviceBinding.findUniqueOrThrow({
      where: {
        id: developmentSeedIds.bindings.studentOne,
      },
    })

    const manualEvent = await prisma.attendanceEvent.findUniqueOrThrow({
      where: {
        id: developmentSeedIds.attendanceEvents.studentThreeManual,
      },
    })

    expect(session.rosterSnapshotCount).toBe(session.attendanceRecords.length)
    expect(session.presentCount).toBe(
      session.attendanceRecords.filter((record) => record.status === AttendanceRecordStatus.PRESENT)
        .length,
    )
    expect(session.absentCount).toBe(
      session.attendanceRecords.filter((record) => record.status === AttendanceRecordStatus.ABSENT)
        .length,
    )
    expect(manualRecord.markSource).toBe("MANUAL")
    expect(session.attendanceEditAuditLogs).toHaveLength(1)
    expect(manualEvent.eventType).toBe(AttendanceEventType.MANUAL_MARK_PRESENT)
    expect(trustedBinding.bindingType).toBe("STUDENT_ATTENDANCE")
    expect(trustedBinding.status).toBe("ACTIVE")
  })

  it("seeds reset-ready roster lifecycle and admin recovery history", async () => {
    await seedDevelopmentData(prisma)

    const [
      droppedPhysicsEnrollment,
      blockedPhysicsEnrollment,
      studentTwoBindings,
      studentTwoEvents,
    ] = await Promise.all([
      prisma.enrollment.findUniqueOrThrow({
        where: {
          id: developmentSeedIds.enrollments.physics.studentThreeDropped,
        },
      }),
      prisma.enrollment.findUniqueOrThrow({
        where: {
          id: developmentSeedIds.enrollments.physics.studentFourBlocked,
        },
      }),
      prisma.userDeviceBinding.findMany({
        where: {
          userId: developmentSeedIds.users.studentTwo,
          bindingType: "STUDENT_ATTENDANCE",
        },
        orderBy: {
          activatedAt: "asc",
        },
      }),
      prisma.securityEvent.findMany({
        where: {
          userId: developmentSeedIds.users.studentTwo,
        },
        orderBy: {
          createdAt: "asc",
        },
      }),
    ])

    expect(droppedPhysicsEnrollment.status).toBe("DROPPED")
    expect(droppedPhysicsEnrollment.droppedAt?.toISOString()).toBe("2026-03-12T08:30:00.000Z")

    expect(blockedPhysicsEnrollment.status).toBe("BLOCKED")
    expect(blockedPhysicsEnrollment.source).toBe("ADMIN")

    expect(studentTwoBindings).toHaveLength(2)
    expect(studentTwoBindings[0]).toMatchObject({
      id: developmentSeedIds.bindings.studentTwoRevoked,
      status: "REVOKED",
      revokeReason:
        developmentLifecycleFixtures.deviceTrust.replacementHistory.studentTwo.revokedReason,
    })
    expect(studentTwoBindings[1]).toMatchObject({
      id: developmentSeedIds.bindings.studentTwo,
      status: "ACTIVE",
    })

    expect(
      studentTwoEvents.find(
        (event) =>
          event.id === developmentSeedIds.securityEvents.studentTwoRevoked &&
          event.eventType === SecurityEventType.DEVICE_REVOKED,
      ),
    ).toBeTruthy()

    const studentTwoAdminActions = await prisma.adminActionLog.findMany({
      where: {
        targetUserId: developmentSeedIds.users.studentTwo,
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    expect(studentTwoAdminActions.map((action) => action.actionType)).toEqual([
      AdminActionType.DEVICE_REVOKE,
      AdminActionType.DEVICE_APPROVE_REPLACEMENT,
    ])
  })
})
