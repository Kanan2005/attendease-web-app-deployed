import { randomUUID } from "node:crypto"
import fs from "node:fs"

import { hashPassword } from "@attendease/auth/password"
import {
  academicManagementMigrationPath,
  authRoleContextMigrationPath,
  bluetoothAttendanceCoreMigrationPath,
  buildDevelopmentDeviceFixture,
  buildDevelopmentStudentRegistrationFixture,
  buildDevelopmentTeacherRegistrationFixture,
  createPrismaClient,
  defaultDatabaseUrl,
  destructiveActionAuditSemanticsMigrationPath,
  developmentAuthFixtures,
  developmentLifecycleFixtures,
  developmentSeedIds,
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

export type IntegrationTestEnvironment = Partial<
  Record<"TEST_DATABASE_URL" | "DATABASE_URL" | "TEST_DATABASE_PORT" | "POSTGRES_PORT", string>
>

export const authIntegrationFixtures = {
  admin: {
    userId: developmentSeedIds.users.admin,
    email: developmentAuthFixtures.admin.email,
    password: developmentAuthFixtures.admin.password,
  },
  teacher: {
    userId: developmentSeedIds.users.teacher,
    email: developmentAuthFixtures.teacher.email,
    password: developmentAuthFixtures.teacher.password,
  },
  studentOne: {
    userId: developmentSeedIds.users.studentOne,
    email: developmentAuthFixtures.students.studentOne.email,
    password: developmentAuthFixtures.students.studentOne.password,
    device: developmentAuthFixtures.students.studentOne.device,
  },
  studentTwo: {
    userId: developmentSeedIds.users.studentTwo,
    email: developmentAuthFixtures.students.studentTwo.email,
    password: developmentAuthFixtures.students.studentTwo.password,
    device: developmentAuthFixtures.students.studentTwo.device,
  },
  studentThree: {
    userId: developmentSeedIds.users.studentThree,
    email: developmentAuthFixtures.students.studentThree.email,
    password: developmentAuthFixtures.students.studentThree.password,
  },
  studentFour: {
    userId: developmentSeedIds.users.studentFour,
    email: developmentAuthFixtures.students.studentFour.email,
    password: developmentAuthFixtures.students.studentFour.password,
  },
  googleTeacherIdentity: {
    providerSubject: developmentAuthFixtures.teacher.googleProviderSubject,
    email: developmentAuthFixtures.teacher.email,
    emailVerified: true,
    displayName: "Prof. Anurag Agarwal",
    hostedDomain: developmentAuthFixtures.teacher.hostedDomain,
    avatarUrl: null,
  },
} as const

export const resetFlowIntegrationFixtures = {
  registration: {
    student: buildDevelopmentStudentRegistrationFixture("api-reset-student"),
    teacher: buildDevelopmentTeacherRegistrationFixture("api-reset-teacher"),
  },
  deviceTrust: {
    trustedStudentKeys: developmentLifecycleFixtures.deviceTrust.trustedStudents,
    unregisteredStudentKeys: developmentLifecycleFixtures.deviceTrust.unregisteredStudents,
    studentTwoRevokedDevice:
      developmentLifecycleFixtures.deviceTrust.replacementHistory.studentTwo.revokedDevice,
    studentTwoReplacementCandidate: buildDevelopmentDeviceFixture("api-reset-student-two-new", {
      platform: "ANDROID",
    }),
  },
  roster: developmentLifecycleFixtures.roster,
  attendance: developmentLifecycleFixtures.attendance,
  adminRecovery: {
    studentTwo: {
      activeBindingId: developmentSeedIds.bindings.studentTwo,
      revokedBindingId: developmentSeedIds.bindings.studentTwoRevoked,
      approvalReason:
        developmentLifecycleFixtures.adminRecovery.studentTwoReplacement.approvalReason,
      revokeReason: developmentLifecycleFixtures.adminRecovery.studentTwoReplacement.revokeReason,
    },
  },
} as const

function buildLocalDatabaseUrl(environment: IntegrationTestEnvironment): string {
  const parsed = new URL(fallbackLocalDatabaseUrl)
  const port = environment.TEST_DATABASE_PORT?.trim() || environment.POSTGRES_PORT?.trim()

  if (port) {
    parsed.port = port
  }

  return parsed.toString()
}

export function resolveIntegrationTestDatabaseUrls(
  environment: IntegrationTestEnvironment = process.env,
): string[] {
  return [
    environment.TEST_DATABASE_URL?.trim(),
    environment.DATABASE_URL?.trim(),
    defaultDatabaseUrl,
    buildLocalDatabaseUrl(environment),
    fallbackLocalDatabaseUrl,
  ].filter(
    (value, index, entries): value is string => Boolean(value) && entries.indexOf(value) === index,
  )
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
  prefix = "attendease_api",
): Promise<TemporaryDatabase> {
  const databaseName = `${prefix}_${randomUUID().replace(/-/g, "")}`
  const candidateDatabaseUrls = resolveIntegrationTestDatabaseUrls()
  let lastError: unknown

  for (const baseDatabaseUrl of candidateDatabaseUrls) {
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

  throw new Error(
    `Unable to create a temporary API integration database. Tried base URLs: ${candidateDatabaseUrls.join(
      ", ",
    )}. Set TEST_DATABASE_URL or POSTGRES_PORT to a reachable PostgreSQL instance before running targeted API integration tests.`,
    {
      cause: lastError,
    },
  )
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

export async function seedAuthIntegrationData(databaseUrl: string): Promise<void> {
  const prisma = createPrismaClient({
    databaseUrl,
    singleton: false,
  })

  try {
    await seedDevelopmentData(prisma)

    const [teacherPasswordHash, studentOnePasswordHash, studentTwoPasswordHash] = await Promise.all(
      [
        hashPassword(authIntegrationFixtures.teacher.password),
        hashPassword(authIntegrationFixtures.studentOne.password),
        hashPassword(authIntegrationFixtures.studentTwo.password),
      ],
    )

    await Promise.all([
      prisma.userCredential.upsert({
        where: {
          userId: authIntegrationFixtures.teacher.userId,
        },
        update: {
          passwordHash: teacherPasswordHash,
        },
        create: {
          userId: authIntegrationFixtures.teacher.userId,
          passwordHash: teacherPasswordHash,
        },
      }),
      prisma.userCredential.upsert({
        where: {
          userId: authIntegrationFixtures.studentOne.userId,
        },
        update: {
          passwordHash: studentOnePasswordHash,
        },
        create: {
          userId: authIntegrationFixtures.studentOne.userId,
          passwordHash: studentOnePasswordHash,
        },
      }),
      prisma.userCredential.upsert({
        where: {
          userId: authIntegrationFixtures.studentTwo.userId,
        },
        update: {
          passwordHash: studentTwoPasswordHash,
        },
        create: {
          userId: authIntegrationFixtures.studentTwo.userId,
          passwordHash: studentTwoPasswordHash,
        },
      }),
    ])
  } finally {
    await disconnectPrismaClient(prisma)
  }
}
