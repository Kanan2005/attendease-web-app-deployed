import { Prisma } from "@attendease/db"

export const nonDroppedEnrollmentStatuses = ["ACTIVE", "PENDING", "BLOCKED"] as const

export function appendCondition(conditions: Prisma.Sql[], condition: Prisma.Sql) {
  conditions.push(condition)
}

export function buildWhereClause(conditions: Prisma.Sql[]): Prisma.Sql {
  if (conditions.length === 0) {
    return Prisma.empty
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
}

export function toDateOnlyString(value: string | undefined): string | null {
  if (!value) {
    return null
  }

  return new Date(value).toISOString().slice(0, 10)
}

export function sortSessionRows<
  TRow extends {
    studentDisplayName: string
    studentEmail: string
    studentRollNumber: string | null
  },
>(rows: readonly TRow[]) {
  return [...rows].sort((left, right) => {
    const leftRoll = left.studentRollNumber ?? ""
    const rightRoll = right.studentRollNumber ?? ""

    if (leftRoll !== rightRoll) {
      return leftRoll.localeCompare(rightRoll)
    }

    const nameComparison = left.studentDisplayName.localeCompare(right.studentDisplayName)

    if (nameComparison !== 0) {
      return nameComparison
    }

    return left.studentEmail.localeCompare(right.studentEmail)
  })
}

export type StudentPercentageWorkerRow = {
  classroom_code: string
  classroom_title: string
  class_code: string
  section_code: string
  subject_code: string
  subject_title: string
  student_email: string
  student_name: string
  student_roll_number: string | null
  total_sessions: number
  present_sessions: number
  absent_sessions: number
}
