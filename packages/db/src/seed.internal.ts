import type { PrismaClient } from "@prisma/client"

import type { PrismaTransactionClient } from "./client"

export type SeedPasswordHashes = {
  admin: string
  teacher: string
  studentOne: string
  studentTwo: string
  studentThree: string
  studentFour: string
}

export type SeedTimingContext = {
  now: Date
  completedSessionStart: Date
  completedSessionEnd: Date
  joinCodeExpiry: Date
  physicsStudentThreeDroppedAt: Date
  studentTwoRevokedAt: Date
}

export type SeedUsersContext = {
  adminUser: { id: string; email: string }
  teacherUser: { id: string; email: string }
  studentUsers: Array<{ id: string; email: string }>
}

export type SeedAcademicContext = {
  semesterId: string
  academicClassId: string
  sectionId: string
  mathSubjectId: string
  physicsSubjectId: string
  mathTeacherAssignmentId: string
  physicsTeacherAssignmentId: string
  mathCourseOfferingId: string
  physicsCourseOfferingId: string
  mathScheduleSlotId: string
  physicsScheduleSlotId: string
  mathEnrollments: {
    studentOneId: string
    studentTwoId: string
    studentThreeId: string
    studentFourId: string
  }
}

export type SeedDeviceContext = {
  studentOneDeviceId: string
  studentTwoDeviceId: string
  studentTwoRevokedDeviceId: string
  studentOneBindingId: string
  studentTwoBindingId: string
  studentTwoRevokedBindingId: string
}

export async function ensureUserRole(
  prisma: Pick<PrismaClient, "userRole"> | Pick<PrismaTransactionClient, "userRole">,
  userId: string,
  role: "STUDENT" | "TEACHER" | "ADMIN",
): Promise<void> {
  await prisma.userRole.upsert({
    where: {
      userId_role: {
        userId,
        role,
      },
    },
    update: {},
    create: {
      userId,
      role,
    },
  })
}
