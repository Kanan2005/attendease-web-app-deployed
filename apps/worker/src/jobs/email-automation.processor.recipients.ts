import type { LowAttendanceEmailRecipientSummary } from "@attendease/contracts"
import { Prisma, type createPrismaClient } from "@attendease/db"
import { selectLowAttendanceRecipients } from "@attendease/domain"

import {
  appendCondition,
  finalizedSessionStatuses,
  nonDroppedEnrollmentStatuses,
  toDateOnlyString,
} from "./email-automation.processor.common.js"

type WorkerPrismaClient = ReturnType<typeof createPrismaClient>

type EmailRecipientSelectionRow = {
  student_id: string
  student_email: string
  student_name: string
  student_roll_number: string | null
  attendance_percentage: number
}

export async function loadAttendanceRows(input: {
  prisma: WorkerPrismaClient
  courseOfferingId: string
  from?: string
  to?: string
}) {
  const fromDate = toDateOnlyString(input.from)
  const toDate = toDateOnlyString(input.to)
  const joinConditions: Prisma.Sql[] = [
    Prisma.sql`session.id = record."sessionId"`,
    Prisma.sql`session.status IN (${Prisma.join([...finalizedSessionStatuses])})`,
    Prisma.sql`session."courseOfferingId" = enrollment."courseOfferingId"`,
  ]

  if (fromDate) {
    appendCondition(
      joinConditions,
      Prisma.sql`COALESCE(session."startedAt"::date, session."endedAt"::date, session."createdAt"::date) >= ${fromDate}::date`,
    )
  }

  if (toDate) {
    appendCondition(
      joinConditions,
      Prisma.sql`COALESCE(session."startedAt"::date, session."endedAt"::date, session."createdAt"::date) <= ${toDate}::date`,
    )
  }

  const rows = await input.prisma.$queryRaw<EmailRecipientSelectionRow[]>(
    Prisma.sql`
      SELECT
        enrollment."studentId" AS student_id,
        student.email AS student_email,
        student."displayName" AS student_name,
        student_profile."rollNumber" AS student_roll_number,
        CASE
          WHEN COUNT(session.id) = 0 THEN 0
          ELSE ROUND(
            (COUNT(session.id) FILTER (WHERE record.status = 'PRESENT')::DECIMAL
            / COUNT(session.id)::DECIMAL) * 100,
            2
          )
        END AS attendance_percentage
      FROM "enrollments" AS enrollment
      JOIN "users" AS student ON student.id = enrollment."studentId"
      LEFT JOIN "student_profiles" AS student_profile
        ON student_profile."userId" = student.id
      LEFT JOIN "attendance_records" AS record
        ON record."enrollmentId" = enrollment.id
      LEFT JOIN "attendance_sessions" AS session
        ON ${Prisma.join(joinConditions, " AND ")}
      WHERE
        enrollment."courseOfferingId" = ${input.courseOfferingId}
        AND enrollment.status IN (${Prisma.join([...nonDroppedEnrollmentStatuses])})
      GROUP BY
        enrollment."studentId",
        student.email,
        student."displayName",
        student_profile."rollNumber"
      ORDER BY student.email ASC
    `,
  )

  return rows.map((row) => ({
    studentId: row.student_id,
    studentEmail: row.student_email,
    studentDisplayName: row.student_name,
    studentRollNumber: row.student_roll_number,
    attendancePercentage: Number(row.attendance_percentage),
  }))
}

export async function selectRecipientsForRule(input: {
  prisma: WorkerPrismaClient
  courseOfferingId: string
  thresholdPercent: number
  from?: string
  to?: string
}): Promise<LowAttendanceEmailRecipientSummary[]> {
  const rows = await loadAttendanceRows(input)
  return selectLowAttendanceRecipients(rows, input.thresholdPercent)
}
