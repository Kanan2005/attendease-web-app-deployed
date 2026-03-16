import type { PrismaClient } from "@prisma/client"

import type { PrismaTransactionClient } from "./client"
import { seedAcademicClassrooms } from "./seed.academic-classrooms"
import { seedAcademicEnrollments } from "./seed.academic-enrollments"
import { seedAcademicFoundation } from "./seed.academic-foundation"
import type { SeedAcademicContext, SeedTimingContext, SeedUsersContext } from "./seed.internal"

export async function seedAcademicData(
  transaction: PrismaClient | PrismaTransactionClient,
  timing: SeedTimingContext,
  users: SeedUsersContext,
): Promise<SeedAcademicContext> {
  const foundation = await seedAcademicFoundation(transaction, users)
  const classrooms = await seedAcademicClassrooms(transaction, timing, users, foundation)

  return seedAcademicEnrollments(transaction, timing, users, classrooms)
}
