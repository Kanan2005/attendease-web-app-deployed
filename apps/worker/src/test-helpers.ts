import { randomUUID } from "node:crypto"
import fs from "node:fs"

import {
  academicManagementMigrationPath,
  authRoleContextMigrationPath,
  bluetoothAttendanceCoreMigrationPath,
  createPrismaClient,
  defaultDatabaseUrl,
  destructiveActionAuditSemanticsMigrationPath,
  deviceTrustControlsMigrationPath,
  disconnectPrismaClient,
  emailAutomationRuntimeSupportMigrationPath,
  helperReadModelsMigrationPath,
  initialMigrationPath,
  qrGpsAttendanceMigrationPath,
  qrGpsSecurityHardeningMigrationPath,
  reportsReadModelsMigrationPath,
  scheduleManagementMigrationPath,
  seedDevelopmentData,
} from "@attendease/db"
import { Client } from "pg"

export type TemporaryDatabase = {
  adminClient: Client
  databaseClient: Client
  databaseName: string
  databaseUrl: string
}

const fallbackLocalDatabaseUrl =
  "postgresql://attendance_user:attendance_password@localhost:5432/attendance_db"

function getBaseDatabaseUrl(): string {
  return process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? defaultDatabaseUrl
}

function getCandidateDatabaseUrls(): string[] {
  return [...new Set([getBaseDatabaseUrl(), defaultDatabaseUrl, fallbackLocalDatabaseUrl])]
}

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

function getCombinedMigrationSql(): string {
  return [
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
}

export async function createTemporaryDatabase(
  prefix = "attendease_worker",
): Promise<TemporaryDatabase> {
  const databaseName = `${prefix}_${randomUUID().replace(/-/g, "")}`
  let lastError: unknown

  for (const baseDatabaseUrl of getCandidateDatabaseUrls()) {
    const adminClient = new Client({
      connectionString: toAdminDatabaseUrl(baseDatabaseUrl),
    })
    let databaseClient: Client | undefined

    try {
      await adminClient.connect()
      await adminClient.query(`CREATE DATABASE "${databaseName}"`)

      const databaseUrl = toTempDatabaseUrl(baseDatabaseUrl, databaseName)
      databaseClient = new Client({
        connectionString: databaseUrl,
      })

      await databaseClient.connect()
      await databaseClient.query(getCombinedMigrationSql())

      const prisma = createPrismaClient({
        databaseUrl,
        singleton: false,
      })

      try {
        await seedDevelopmentData(prisma)
      } finally {
        await disconnectPrismaClient(prisma)
      }

      return {
        adminClient,
        databaseClient,
        databaseName,
        databaseUrl,
      }
    } catch (error) {
      lastError = error
      await databaseClient?.end().catch(() => undefined)
      await adminClient.end().catch(() => undefined)
    }
  }

  throw lastError
}

export async function destroyTemporaryDatabase(database: TemporaryDatabase): Promise<void> {
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
