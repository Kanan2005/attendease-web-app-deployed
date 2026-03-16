import fs from "node:fs"

import { describe, expect, it } from "vitest"

import {
  authRoleContextMigrationPath,
  bluetoothAttendanceCoreMigrationPath,
  buildDevelopmentStudentRegistrationFixture,
  destructiveActionAuditSemanticsMigrationPath,
  developmentAcademicFixtures,
  developmentAuthFixtures,
  developmentLifecycleFixtures,
  deviceTrustControlsMigrationPath,
  emailAutomationRuntimeSupportMigrationPath,
  helperReadModelsMigrationPath,
  initialMigrationPath,
  prismaConfigPath,
  prismaMigrationLockPath,
  prismaMigrationsPath,
  prismaSchemaPath,
  qrGpsSecurityHardeningMigrationPath,
  reportsReadModelsMigrationPath,
} from "./index"

describe("db package paths", () => {
  it("points to the Prisma schema, config, and migration files in the package", () => {
    expect(prismaSchemaPath.endsWith("packages/db/prisma/schema.prisma")).toBe(true)
    expect(prismaConfigPath.endsWith("packages/db/prisma.config.ts")).toBe(true)
    expect(prismaMigrationsPath.endsWith("packages/db/prisma/migrations")).toBe(true)
    expect(
      prismaMigrationLockPath.endsWith("packages/db/prisma/migrations/migration_lock.toml"),
    ).toBe(true)
    expect(
      initialMigrationPath.endsWith(
        "packages/db/prisma/migrations/20260314000100_initial_data_foundation/migration.sql",
      ),
    ).toBe(true)
    expect(
      helperReadModelsMigrationPath.endsWith(
        "packages/db/prisma/migrations/20260314000200_db_runtime_support/migration.sql",
      ),
    ).toBe(true)
    expect(
      authRoleContextMigrationPath.endsWith(
        "packages/db/prisma/migrations/20260314000300_auth_role_context/migration.sql",
      ),
    ).toBe(true)
    expect(
      deviceTrustControlsMigrationPath.endsWith(
        "packages/db/prisma/migrations/20260314000400_device_trust_controls/migration.sql",
      ),
    ).toBe(true)
    expect(
      bluetoothAttendanceCoreMigrationPath.endsWith(
        "packages/db/prisma/migrations/20260314000900_bluetooth_attendance_core/migration.sql",
      ),
    ).toBe(true)
    expect(
      qrGpsSecurityHardeningMigrationPath.endsWith(
        "packages/db/prisma/migrations/20260314000800_qr_gps_security_event_hardening/migration.sql",
      ),
    ).toBe(true)
    expect(
      reportsReadModelsMigrationPath.endsWith(
        "packages/db/prisma/migrations/20260315001000_reports_read_models/migration.sql",
      ),
    ).toBe(true)
    expect(
      emailAutomationRuntimeSupportMigrationPath.endsWith(
        "packages/db/prisma/migrations/20260315001100_email_automation_runtime_support/migration.sql",
      ),
    ).toBe(true)
    expect(
      destructiveActionAuditSemanticsMigrationPath.endsWith(
        "packages/db/prisma/migrations/20260315001200_destructive_action_audit_semantics/migration.sql",
      ),
    ).toBe(true)

    expect(fs.existsSync(prismaSchemaPath)).toBe(true)
    expect(fs.existsSync(prismaConfigPath)).toBe(true)
    expect(fs.existsSync(prismaMigrationsPath)).toBe(true)
    expect(fs.existsSync(prismaMigrationLockPath)).toBe(true)
    expect(fs.existsSync(initialMigrationPath)).toBe(true)
    expect(fs.existsSync(helperReadModelsMigrationPath)).toBe(true)
    expect(fs.existsSync(authRoleContextMigrationPath)).toBe(true)
    expect(fs.existsSync(deviceTrustControlsMigrationPath)).toBe(true)
    expect(fs.existsSync(bluetoothAttendanceCoreMigrationPath)).toBe(true)
    expect(fs.existsSync(qrGpsSecurityHardeningMigrationPath)).toBe(true)
    expect(fs.existsSync(reportsReadModelsMigrationPath)).toBe(true)
    expect(fs.existsSync(emailAutomationRuntimeSupportMigrationPath)).toBe(true)
    expect(fs.existsSync(destructiveActionAuditSemanticsMigrationPath)).toBe(true)
  })

  it("exports deterministic development auth and academic fixtures", () => {
    expect(developmentAuthFixtures.admin.email).toBe("admin@attendease.dev")
    expect(developmentAuthFixtures.teacher.googleProviderSubject).toBe(
      "teacher-google-subject-attendease-dev",
    )
    expect(developmentAcademicFixtures.subjects.math.joinCode).toBe("MATH6A")
    expect(developmentAcademicFixtures.subjects.physics.courseOfferingCode).toBe("CSE6-PHYSICS-A")
    expect(developmentLifecycleFixtures.adminRecovery.studentTwoReplacement.studentKey).toBe(
      "studentTwo",
    )

    const registrationCandidate = buildDevelopmentStudentRegistrationFixture("index-test")
    expect(registrationCandidate.email).toBe("index-test@attendease.dev")
    expect(registrationCandidate.device.installId).toBe("seed-install-index-test-attendance")
  })
})
