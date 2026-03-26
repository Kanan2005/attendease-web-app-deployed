import path from "node:path"
import { fileURLToPath } from "node:url"

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))

export const defaultDatabaseUrl = "postgresql://attendease:attendease@localhost:5432/attendease"
export const prismaSchemaPath = path.resolve(currentDirectory, "../prisma/schema.prisma")
export const prismaConfigPath = path.resolve(currentDirectory, "../prisma.config.ts")
export const prismaMigrationsPath = path.resolve(currentDirectory, "../prisma/migrations")
export const prismaMigrationLockPath = path.resolve(
  currentDirectory,
  "../prisma/migrations/migration_lock.toml",
)
export const initialMigrationPath = path.resolve(
  currentDirectory,
  "../prisma/migrations/20260314000100_initial_data_foundation/migration.sql",
)
export const helperReadModelsMigrationPath = path.resolve(
  currentDirectory,
  "../prisma/migrations/20260314000200_db_runtime_support/migration.sql",
)
export const authRoleContextMigrationPath = path.resolve(
  currentDirectory,
  "../prisma/migrations/20260314000300_auth_role_context/migration.sql",
)
export const deviceTrustControlsMigrationPath = path.resolve(
  currentDirectory,
  "../prisma/migrations/20260314000400_device_trust_controls/migration.sql",
)
export const academicManagementMigrationPath = path.resolve(
  currentDirectory,
  "../prisma/migrations/20260314000500_academic_management_foundation/migration.sql",
)
export const scheduleManagementMigrationPath = path.resolve(
  currentDirectory,
  "../prisma/migrations/20260314000600_schedule_management_support/migration.sql",
)
export const qrGpsAttendanceMigrationPath = path.resolve(
  currentDirectory,
  "../prisma/migrations/20260314000700_qr_gps_attendance_core/migration.sql",
)
export const qrGpsSecurityHardeningMigrationPath = path.resolve(
  currentDirectory,
  "../prisma/migrations/20260314000800_qr_gps_security_event_hardening/migration.sql",
)
export const bluetoothAttendanceCoreMigrationPath = path.resolve(
  currentDirectory,
  "../prisma/migrations/20260314000900_bluetooth_attendance_core/migration.sql",
)
export const reportsReadModelsMigrationPath = path.resolve(
  currentDirectory,
  "../prisma/migrations/20260315001000_reports_read_models/migration.sql",
)
export const emailAutomationRuntimeSupportMigrationPath = path.resolve(
  currentDirectory,
  "../prisma/migrations/20260315001100_email_automation_runtime_support/migration.sql",
)
export const destructiveActionAuditSemanticsMigrationPath = path.resolve(
  currentDirectory,
  "../prisma/migrations/20260315001200_destructive_action_audit_semantics/migration.sql",
)
export const studentProfileDegreeBranchMigrationPath = path.resolve(
  currentDirectory,
  "../prisma/migrations/20260315001300_add_student_profile_degree_branch/migration.sql",
)
export const courseOfferingLabelColumnsMigrationPath = path.resolve(
  currentDirectory,
  "../prisma/migrations/20260315001400_add_course_offering_label_columns/migration.sql",
)
