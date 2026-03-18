import { hashPassword } from "@attendease/auth/password"
import type { PrismaClient } from "@prisma/client"

import { developmentAcademicFixtures } from "./fixtures"
import { seedAcademicData } from "./seed.academic"
import { seedAttendanceData } from "./seed.attendance"
import { seedAuthData } from "./seed.auth"
import { seedAutomationData } from "./seed.automation"
import { seedDeviceTrustData } from "./seed.devices"
import { type SeedSummary, developmentSeedIds } from "./seed.ids"
import type { SeedPasswordHashes, SeedTimingContext } from "./seed.internal"
import { runSerializableTransaction } from "./transactions"

export { developmentSeedIds }
export type { SeedSummary } from "./seed.ids"

async function buildPasswordHashes(): Promise<SeedPasswordHashes> {
  const { developmentAuthFixtures } = await import("./fixtures")

  const [admin, teacher, studentOne, studentTwo, studentThree, studentFour] = await Promise.all([
    hashPassword(developmentAuthFixtures.admin.password),
    hashPassword(developmentAuthFixtures.teacher.password),
    hashPassword(developmentAuthFixtures.students.studentOne.password),
    hashPassword(developmentAuthFixtures.students.studentTwo.password),
    hashPassword(developmentAuthFixtures.students.studentThree.password),
    hashPassword(developmentAuthFixtures.students.studentFour.password),
  ])

  return { admin, teacher, studentOne, studentTwo, studentThree, studentFour }
}

function buildTimingContext(): SeedTimingContext {
  return {
    now: new Date("2026-03-14T09:00:00.000Z"),
    completedSessionStart: new Date("2026-03-10T03:30:00.000Z"),
    completedSessionEnd: new Date("2026-03-10T03:45:00.000Z"),
    joinCodeExpiry: new Date("2026-12-31T18:29:59.000Z"),
    physicsStudentThreeDroppedAt: new Date("2026-03-12T08:30:00.000Z"),
    studentTwoRevokedAt: new Date("2026-03-13T09:30:00.000Z"),
  }
}

export async function seedDevelopmentData(prisma: PrismaClient): Promise<SeedSummary> {
  const passwordHashes = await buildPasswordHashes()
  const timing = buildTimingContext()

  return runSerializableTransaction(prisma, async (transaction) => {
    // eslint-disable-next-line no-console -- seed script
    console.log("Seeding (timeout: 120s for remote DBs)…")
    const users = await seedAuthData(transaction, timing, passwordHashes)
    const academic = await seedAcademicData(transaction, timing, users)
    const devices = await seedDeviceTrustData(transaction, timing, users, academic)

    await seedAttendanceData(transaction, timing, users, academic, devices)
    const automation = await seedAutomationData(transaction, timing, users, academic)

    return {
      userCount: 2 + users.studentUsers.length,
      classroomCount: 2,
      activeJoinCodes: [
        developmentAcademicFixtures.classrooms.math.joinCode,
        developmentAcademicFixtures.classrooms.physics.joinCode,
      ],
      seededSessionId: developmentSeedIds.sessions.mathCompleted,
      seededEmailRuleId: automation.seededEmailRuleId,
      pendingOutboxTopics: ["analytics.attendance.refresh"],
    }
  }, { maxWait: 30_000, timeout: 120_000 })
}
