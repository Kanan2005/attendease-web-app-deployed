import { type PrismaClient, SessionPlatform, SessionStatus, UserStatus } from "@prisma/client"

import type { PrismaTransactionClient } from "./client"
import { developmentAuthFixtures } from "./fixtures"
import { developmentSeedIds } from "./seed.ids"
import {
  type SeedPasswordHashes,
  type SeedTimingContext,
  type SeedUsersContext,
  ensureUserRole,
} from "./seed.internal"

type SeedAuthTransaction = Pick<
  PrismaClient,
  | "user"
  | "userRole"
  | "userCredential"
  | "oAuthAccount"
  | "teacherProfile"
  | "studentProfile"
  | "authSession"
  | "refreshToken"
> &
  Pick<
    PrismaTransactionClient,
    | "user"
    | "userRole"
    | "userCredential"
    | "oAuthAccount"
    | "teacherProfile"
    | "studentProfile"
    | "authSession"
    | "refreshToken"
  >

export async function seedAuthData(
  transaction: SeedAuthTransaction,
  timing: SeedTimingContext,
  passwordHashes: SeedPasswordHashes,
): Promise<SeedUsersContext> {
  const {
    admin: adminFixture,
    teacher: teacherFixture,
    students: studentFixtures,
  } = developmentAuthFixtures

  const adminUser = await transaction.user.upsert({
    where: { id: developmentSeedIds.users.admin },
    update: {
      email: adminFixture.email,
      displayName: adminFixture.displayName,
      status: UserStatus.ACTIVE,
    },
    create: {
      id: developmentSeedIds.users.admin,
      email: adminFixture.email,
      displayName: adminFixture.displayName,
      status: UserStatus.ACTIVE,
      lastLoginAt: timing.now,
    },
  })

  const teacherUser = await transaction.user.upsert({
    where: { id: developmentSeedIds.users.teacher },
    update: {
      email: teacherFixture.email,
      displayName: teacherFixture.displayName,
      status: UserStatus.ACTIVE,
    },
    create: {
      id: developmentSeedIds.users.teacher,
      email: teacherFixture.email,
      displayName: teacherFixture.displayName,
      status: UserStatus.ACTIVE,
      lastLoginAt: timing.now,
    },
  })

  const studentUsers = await Promise.all([
    transaction.user.upsert({
      where: { id: developmentSeedIds.users.studentOne },
      update: {
        email: studentFixtures.studentOne.email,
        displayName: studentFixtures.studentOne.displayName,
        status: UserStatus.ACTIVE,
      },
      create: {
        id: developmentSeedIds.users.studentOne,
        email: studentFixtures.studentOne.email,
        displayName: studentFixtures.studentOne.displayName,
        status: UserStatus.ACTIVE,
      },
    }),
    transaction.user.upsert({
      where: { id: developmentSeedIds.users.studentTwo },
      update: {
        email: studentFixtures.studentTwo.email,
        displayName: studentFixtures.studentTwo.displayName,
        status: UserStatus.ACTIVE,
      },
      create: {
        id: developmentSeedIds.users.studentTwo,
        email: studentFixtures.studentTwo.email,
        displayName: studentFixtures.studentTwo.displayName,
        status: UserStatus.ACTIVE,
      },
    }),
    transaction.user.upsert({
      where: { id: developmentSeedIds.users.studentThree },
      update: {
        email: studentFixtures.studentThree.email,
        displayName: studentFixtures.studentThree.displayName,
        status: UserStatus.ACTIVE,
      },
      create: {
        id: developmentSeedIds.users.studentThree,
        email: studentFixtures.studentThree.email,
        displayName: studentFixtures.studentThree.displayName,
        status: UserStatus.ACTIVE,
      },
    }),
    transaction.user.upsert({
      where: { id: developmentSeedIds.users.studentFour },
      update: {
        email: studentFixtures.studentFour.email,
        displayName: studentFixtures.studentFour.displayName,
        status: UserStatus.ACTIVE,
      },
      create: {
        id: developmentSeedIds.users.studentFour,
        email: studentFixtures.studentFour.email,
        displayName: studentFixtures.studentFour.displayName,
        status: UserStatus.ACTIVE,
      },
    }),
  ])

  await Promise.all([
    ensureUserRole(transaction, adminUser.id, "ADMIN"),
    ensureUserRole(transaction, teacherUser.id, "TEACHER"),
    ...studentUsers.map((studentUser) => ensureUserRole(transaction, studentUser.id, "STUDENT")),
  ])

  await transaction.userCredential.upsert({
    where: { userId: adminUser.id },
    update: {
      passwordHash: passwordHashes.admin,
    },
    create: {
      userId: adminUser.id,
      passwordHash: passwordHashes.admin,
    },
  })

  await Promise.all([
    transaction.userCredential.upsert({
      where: { userId: teacherUser.id },
      update: {
        passwordHash: passwordHashes.teacher,
      },
      create: {
        userId: teacherUser.id,
        passwordHash: passwordHashes.teacher,
      },
    }),
    transaction.userCredential.upsert({
      where: { userId: developmentSeedIds.users.studentOne },
      update: {
        passwordHash: passwordHashes.studentOne,
      },
      create: {
        userId: developmentSeedIds.users.studentOne,
        passwordHash: passwordHashes.studentOne,
      },
    }),
    transaction.userCredential.upsert({
      where: { userId: developmentSeedIds.users.studentTwo },
      update: {
        passwordHash: passwordHashes.studentTwo,
      },
      create: {
        userId: developmentSeedIds.users.studentTwo,
        passwordHash: passwordHashes.studentTwo,
      },
    }),
    transaction.userCredential.upsert({
      where: { userId: developmentSeedIds.users.studentThree },
      update: {
        passwordHash: passwordHashes.studentThree,
      },
      create: {
        userId: developmentSeedIds.users.studentThree,
        passwordHash: passwordHashes.studentThree,
      },
    }),
    transaction.userCredential.upsert({
      where: { userId: developmentSeedIds.users.studentFour },
      update: {
        passwordHash: passwordHashes.studentFour,
      },
      create: {
        userId: developmentSeedIds.users.studentFour,
        passwordHash: passwordHashes.studentFour,
      },
    }),
  ])

  await transaction.oAuthAccount.upsert({
    where: {
      provider_providerSubject: {
        provider: "GOOGLE",
        providerSubject: teacherFixture.googleProviderSubject,
      },
    },
    update: {
      userId: teacherUser.id,
      providerEmail: teacherUser.email,
      lastUsedAt: timing.now,
    },
    create: {
      userId: teacherUser.id,
      provider: "GOOGLE",
      providerSubject: teacherFixture.googleProviderSubject,
      providerEmail: teacherUser.email,
      lastUsedAt: timing.now,
    },
  })

  await transaction.teacherProfile.upsert({
    where: { userId: teacherUser.id },
    update: {
      employeeCode: teacherFixture.employeeCode,
      department: teacherFixture.department,
      designation: teacherFixture.designation,
    },
    create: {
      userId: teacherUser.id,
      employeeCode: teacherFixture.employeeCode,
      department: teacherFixture.department,
      designation: teacherFixture.designation,
    },
  })

  await Promise.all([
    transaction.studentProfile.upsert({
      where: { userId: developmentSeedIds.users.studentOne },
      update: {
        rollNumber: studentFixtures.studentOne.rollNumber,
        universityId: studentFixtures.studentOne.universityId,
        programName: studentFixtures.studentOne.programName,
        currentSemester: studentFixtures.studentOne.currentSemester,
      },
      create: {
        userId: developmentSeedIds.users.studentOne,
        rollNumber: studentFixtures.studentOne.rollNumber,
        universityId: studentFixtures.studentOne.universityId,
        programName: studentFixtures.studentOne.programName,
        currentSemester: studentFixtures.studentOne.currentSemester,
      },
    }),
    transaction.studentProfile.upsert({
      where: { userId: developmentSeedIds.users.studentTwo },
      update: {
        rollNumber: studentFixtures.studentTwo.rollNumber,
        universityId: studentFixtures.studentTwo.universityId,
        programName: studentFixtures.studentTwo.programName,
        currentSemester: studentFixtures.studentTwo.currentSemester,
      },
      create: {
        userId: developmentSeedIds.users.studentTwo,
        rollNumber: studentFixtures.studentTwo.rollNumber,
        universityId: studentFixtures.studentTwo.universityId,
        programName: studentFixtures.studentTwo.programName,
        currentSemester: studentFixtures.studentTwo.currentSemester,
      },
    }),
    transaction.studentProfile.upsert({
      where: { userId: developmentSeedIds.users.studentThree },
      update: {
        rollNumber: studentFixtures.studentThree.rollNumber,
        universityId: studentFixtures.studentThree.universityId,
        programName: studentFixtures.studentThree.programName,
        currentSemester: studentFixtures.studentThree.currentSemester,
      },
      create: {
        userId: developmentSeedIds.users.studentThree,
        rollNumber: studentFixtures.studentThree.rollNumber,
        universityId: studentFixtures.studentThree.universityId,
        programName: studentFixtures.studentThree.programName,
        currentSemester: studentFixtures.studentThree.currentSemester,
      },
    }),
    transaction.studentProfile.upsert({
      where: { userId: developmentSeedIds.users.studentFour },
      update: {
        rollNumber: studentFixtures.studentFour.rollNumber,
        universityId: studentFixtures.studentFour.universityId,
        programName: studentFixtures.studentFour.programName,
        currentSemester: studentFixtures.studentFour.currentSemester,
      },
      create: {
        userId: developmentSeedIds.users.studentFour,
        rollNumber: studentFixtures.studentFour.rollNumber,
        universityId: studentFixtures.studentFour.universityId,
        programName: studentFixtures.studentFour.programName,
        currentSemester: studentFixtures.studentFour.currentSemester,
      },
    }),
  ])

  await transaction.authSession.upsert({
    where: { id: developmentSeedIds.authSessions.teacherMobile },
    update: {
      userId: teacherUser.id,
      platform: SessionPlatform.MOBILE,
      activeRole: "TEACHER",
      status: SessionStatus.ACTIVE,
      lastActivityAt: timing.now,
      expiresAt: new Date("2026-04-13T09:00:00.000Z"),
    },
    create: {
      id: developmentSeedIds.authSessions.teacherMobile,
      userId: teacherUser.id,
      platform: SessionPlatform.MOBILE,
      activeRole: "TEACHER",
      status: SessionStatus.ACTIVE,
      ipAddress: "127.0.0.1",
      userAgent: "AttendEase Dev Seed",
      lastActivityAt: timing.now,
      expiresAt: new Date("2026-04-13T09:00:00.000Z"),
    },
  })

  await transaction.refreshToken.upsert({
    where: {
      tokenHash: "seed-teacher-refresh-token-hash",
    },
    update: {
      sessionId: developmentSeedIds.authSessions.teacherMobile,
      userId: teacherUser.id,
      expiresAt: new Date("2026-04-13T09:00:00.000Z"),
      lastUsedAt: timing.now,
    },
    create: {
      id: developmentSeedIds.refreshTokens.teacherMobile,
      sessionId: developmentSeedIds.authSessions.teacherMobile,
      userId: teacherUser.id,
      tokenHash: "seed-teacher-refresh-token-hash",
      expiresAt: new Date("2026-04-13T09:00:00.000Z"),
      lastUsedAt: timing.now,
    },
  })

  return {
    adminUser: { id: adminUser.id, email: adminUser.email },
    teacherUser: { id: teacherUser.id, email: teacherUser.email },
    studentUsers: studentUsers.map((studentUser) => ({
      id: studentUser.id,
      email: studentUser.email,
    })),
  }
}
