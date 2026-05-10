import { createHash } from "node:crypto"

import type { CreateExportJobRequest } from "@attendease/contracts"
import { createExportJobRequestSchema } from "@attendease/contracts"
import { Prisma } from "@attendease/db"
import { calculateAttendancePercentage } from "@attendease/domain"
import {
  buildComprehensiveCsvBuffer,
  buildExportFileName,
  buildSessionCsvBuffer,
  buildSessionPdfBuffer,
  buildStudentPercentageCsvBuffer,
} from "@attendease/export"

import type { DatabaseService } from "../../database/database.service.js"
import type { ExportStorageService } from "./export-storage.service.js"

// ---------------------------------------------------------------------------
// Shared helpers (mirrors apps/worker/src/jobs/export-job.processor.common.ts)
// ---------------------------------------------------------------------------

const nonDroppedEnrollmentStatuses = ["ACTIVE", "PENDING", "BLOCKED"] as const

function sortSessionRows<
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

function toDateOnlyString(value: string | undefined): string | null {
  if (!value) {
    return null
  }

  return new Date(value).toISOString().slice(0, 10)
}

function appendCondition(conditions: Prisma.Sql[], condition: Prisma.Sql) {
  conditions.push(condition)
}

function buildWhereClause(conditions: Prisma.Sql[]): Prisma.Sql {
  if (conditions.length === 0) {
    return Prisma.empty
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
}

// ---------------------------------------------------------------------------
// Data loaders (mirrors apps/worker/src/jobs/export-job.processor.loaders.ts)
// ---------------------------------------------------------------------------

type StudentPercentageWorkerRow = {
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

async function loadSessionExportData(database: DatabaseService, sessionId: string) {
  const session = await database.prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: {
      courseOffering: { select: { code: true, displayTitle: true } },
      subject: { select: { code: true, title: true } },
      attendanceRecords: {
        include: {
          student: {
            select: {
              email: true,
              displayName: true,
              studentProfile: { select: { rollNumber: true } },
            },
          },
        },
      },
    },
  })

  if (!session) {
    throw new Error("Export session could not be found.")
  }

  return {
    sessionId: session.id,
    classroomCode: session.courseOffering.code,
    classroomTitle: session.courseOffering.displayTitle,
    subjectCode: session.subject.code,
    subjectTitle: session.subject.title,
    mode: session.mode,
    startedAt: session.startedAt?.toISOString() ?? null,
    endedAt: session.endedAt?.toISOString() ?? null,
    presentCount: session.presentCount,
    absentCount: session.absentCount,
    rows: sortSessionRows(
      session.attendanceRecords.map((record) => ({
        studentEmail: record.student.email,
        studentDisplayName: record.student.displayName,
        studentRollNumber: record.student.studentProfile?.rollNumber ?? null,
        attendanceStatus: record.status,
        markedAt: record.markedAt?.toISOString() ?? null,
      })),
    ),
  }
}

async function loadStudentPercentageRows(
  database: DatabaseService,
  filters?: CreateExportJobRequest["filters"],
) {
  const fromDate = toDateOnlyString(filters?.from)
  const toDate = toDateOnlyString(filters?.to)
  const joinConditions: Prisma.Sql[] = [
    Prisma.sql`session.id = record."sessionId"`,
    Prisma.sql`session.status IN ('ENDED', 'EXPIRED')`,
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

  const whereConditions: Prisma.Sql[] = [
    Prisma.sql`enrollment.status IN (${Prisma.join(nonDroppedEnrollmentStatuses)})`,
  ]

  if (filters?.classroomId) {
    appendCondition(whereConditions, Prisma.sql`course.id = ${filters.classroomId}`)
  }

  if (filters?.classId) {
    appendCondition(whereConditions, Prisma.sql`enrollment."classId" = ${filters.classId}`)
  }

  if (filters?.sectionId) {
    appendCondition(whereConditions, Prisma.sql`enrollment."sectionId" = ${filters.sectionId}`)
  }

  if (filters?.subjectId) {
    appendCondition(whereConditions, Prisma.sql`enrollment."subjectId" = ${filters.subjectId}`)
  }

  const rows = await database.prisma.$queryRaw<StudentPercentageWorkerRow[]>(
    Prisma.sql`
      SELECT
        course.code AS classroom_code,
        course."displayTitle" AS classroom_title,
        class.code AS class_code,
        section.code AS section_code,
        subject.code AS subject_code,
        subject.title AS subject_title,
        student.email AS student_email,
        student."displayName" AS student_name,
        student_profile."rollNumber" AS student_roll_number,
        COUNT(session.id)::INTEGER AS total_sessions,
        COUNT(session.id) FILTER (WHERE record.status = 'PRESENT')::INTEGER AS present_sessions,
        COUNT(session.id) FILTER (WHERE record.status = 'ABSENT')::INTEGER AS absent_sessions
      FROM "enrollments" AS enrollment
      JOIN "course_offerings" AS course ON course.id = enrollment."courseOfferingId"
      JOIN "classes" AS class ON class.id = enrollment."classId"
      JOIN "sections" AS section ON section.id = enrollment."sectionId"
      JOIN "subjects" AS subject ON subject.id = enrollment."subjectId"
      JOIN "users" AS student ON student.id = enrollment."studentId"
      LEFT JOIN "student_profiles" AS student_profile
        ON student_profile."userId" = student.id
      LEFT JOIN "attendance_records" AS record
        ON record."enrollmentId" = enrollment.id
      LEFT JOIN "attendance_sessions" AS session
        ON ${Prisma.join(joinConditions, " AND ")}
      ${buildWhereClause(whereConditions)}
      GROUP BY
        course.code,
        course."displayTitle",
        class.code,
        section.code,
        subject.code,
        subject.title,
        student.email,
        student."displayName",
        student_profile."rollNumber"
      ORDER BY subject.code ASC, course.code ASC, student.email ASC
    `,
  )

  return rows.map((row) => ({
    classroomCode: row.classroom_code,
    classroomTitle: row.classroom_title,
    classCode: row.class_code,
    sectionCode: row.section_code,
    subjectCode: row.subject_code,
    subjectTitle: row.subject_title,
    studentEmail: row.student_email,
    studentDisplayName: row.student_name,
    studentRollNumber: row.student_roll_number,
    totalSessions: row.total_sessions,
    presentSessions: row.present_sessions,
    absentSessions: row.absent_sessions,
    attendancePercentage: calculateAttendancePercentage({
      totalCount: row.total_sessions,
      presentCount: row.present_sessions,
    }),
  }))
}

async function loadComprehensiveCsvData(
  database: DatabaseService,
  filters?: CreateExportJobRequest["filters"],
) {
  const sessions = await database.prisma.attendanceSession.findMany({
    where: {
      status: { in: ["ENDED", "EXPIRED"] },
      ...(filters?.classroomId ? { courseOfferingId: filters.classroomId } : {}),
      ...(filters?.classId ? { classId: filters.classId } : {}),
      ...(filters?.sectionId ? { sectionId: filters.sectionId } : {}),
      ...(filters?.subjectId ? { subjectId: filters.subjectId } : {}),
      ...(filters?.from || filters?.to
        ? {
            OR: [
              {
                startedAt: {
                  ...(filters.from ? { gte: new Date(filters.from) } : {}),
                  ...(filters.to ? { lte: new Date(filters.to) } : {}),
                },
              },
              {
                endedAt: {
                  ...(filters.from ? { gte: new Date(filters.from) } : {}),
                  ...(filters.to ? { lte: new Date(filters.to) } : {}),
                },
              },
            ],
          }
        : {}),
    },
    include: { subject: { select: { code: true, title: true } } },
    orderBy: [{ startedAt: "asc" }, { createdAt: "asc" }],
  })

  const enrollments = await database.prisma.enrollment.findMany({
    where: {
      status: { in: [...nonDroppedEnrollmentStatuses] },
      ...(filters?.classroomId ? { courseOfferingId: filters.classroomId } : {}),
      ...(filters?.classId ? { classId: filters.classId } : {}),
      ...(filters?.sectionId ? { sectionId: filters.sectionId } : {}),
      ...(filters?.subjectId ? { subjectId: filters.subjectId } : {}),
    },
    include: {
      student: {
        select: {
          email: true,
          displayName: true,
          studentProfile: { select: { rollNumber: true } },
        },
      },
      subject: { select: { code: true, title: true } },
    },
    orderBy: [{ student: { email: "asc" } }],
  })

  const sessionIds = sessions.map((session) => session.id)
  const enrollmentIds = enrollments.map((enrollment) => enrollment.id)
  const records =
    sessionIds.length > 0 && enrollmentIds.length > 0
      ? await database.prisma.attendanceRecord.findMany({
          where: {
            sessionId: { in: sessionIds },
            enrollmentId: { in: enrollmentIds },
          },
        })
      : []

  const sessionColumns = sessions.map((session) => ({
    sessionId: session.id,
    sessionLabel: `${session.subject.code} ${session.startedAt?.toISOString().slice(0, 10) ?? session.createdAt.toISOString().slice(0, 10)}`,
  }))

  const recordsByEnrollment = new Map<string, typeof records>()

  for (const record of records) {
    const existing = recordsByEnrollment.get(record.enrollmentId) ?? []
    existing.push(record)
    recordsByEnrollment.set(record.enrollmentId, existing)
  }

  const aggregateByStudent = new Map<
    string,
    {
      studentEmail: string
      studentDisplayName: string
      studentRollNumber: string | null
      totalSessions: number
      presentSessions: number
      absentSessions: number
      sessionStatuses: Record<string, string>
      subjects: Map<string, { label: string; total: number; present: number }>
    }
  >()

  for (const enrollment of enrollments) {
    const current = aggregateByStudent.get(enrollment.studentId) ?? {
      studentEmail: enrollment.student.email,
      studentDisplayName: enrollment.student.displayName,
      studentRollNumber: enrollment.student.studentProfile?.rollNumber ?? null,
      totalSessions: 0,
      presentSessions: 0,
      absentSessions: 0,
      sessionStatuses: {},
      subjects: new Map<string, { label: string; total: number; present: number }>(),
    }

    const subjectKey = enrollment.subjectId
    const subjectAggregate = current.subjects.get(subjectKey) ?? {
      label: `${enrollment.subject.code} ${enrollment.subject.title}`,
      total: 0,
      present: 0,
    }

    for (const record of recordsByEnrollment.get(enrollment.id) ?? []) {
      current.totalSessions += 1
      if (record.status === "PRESENT") {
        current.presentSessions += 1
        subjectAggregate.present += 1
      } else {
        current.absentSessions += 1
      }
      subjectAggregate.total += 1
      current.sessionStatuses[record.sessionId] = record.status
    }

    current.subjects.set(subjectKey, subjectAggregate)
    aggregateByStudent.set(enrollment.studentId, current)
  }

  return {
    sessionColumns,
    rows: sortSessionRows(
      [...aggregateByStudent.values()].map((row) => ({
        studentEmail: row.studentEmail,
        studentDisplayName: row.studentDisplayName,
        studentRollNumber: row.studentRollNumber,
        totalSessions: row.totalSessions,
        presentSessions: row.presentSessions,
        absentSessions: row.absentSessions,
        attendancePercentage: calculateAttendancePercentage({
          totalCount: row.totalSessions,
          presentCount: row.presentSessions,
        }),
        subjectBreakdown:
          [...row.subjects.values()]
            .map((subject) => {
              const percentage = calculateAttendancePercentage({
                totalCount: subject.total,
                presentCount: subject.present,
              })
              return `${subject.label}: ${subject.present}/${subject.total} (${percentage}%)`
            })
            .join(" | ") || "No sessions in scope",
        sessionStatuses: row.sessionStatuses,
      })),
    ),
  }
}

// ---------------------------------------------------------------------------
// Inline file generation (runs in API request instead of worker)
// ---------------------------------------------------------------------------

type GeneratedExport = {
  bytes: Buffer | Uint8Array
  fileName: string
  mimeType: string
}

async function generateExport(
  database: DatabaseService,
  request: CreateExportJobRequest,
): Promise<GeneratedExport> {
  switch (request.jobType) {
    case "SESSION_CSV": {
      const data = await loadSessionExportData(database, request.sessionId ?? "")
      return {
        bytes: buildSessionCsvBuffer(data),
        fileName: buildExportFileName(`session-${data.sessionId}`, "csv", new Date()),
        mimeType: "text/csv",
      }
    }
    case "SESSION_PDF": {
      const data = await loadSessionExportData(database, request.sessionId ?? "")
      return {
        bytes: await buildSessionPdfBuffer({
          title: `Attendance Session ${data.sessionId}`,
          classroomTitle: data.classroomTitle,
          subjectTitle: data.subjectTitle,
          mode: data.mode,
          startedAt: data.startedAt,
          endedAt: data.endedAt,
          presentCount: data.presentCount,
          absentCount: data.absentCount,
          rows: data.rows,
        }),
        fileName: buildExportFileName(`session-${data.sessionId}`, "pdf", new Date()),
        mimeType: "application/pdf",
      }
    }
    case "STUDENT_PERCENT_CSV": {
      const rows = await loadStudentPercentageRows(database, request.filters)
      return {
        bytes: buildStudentPercentageCsvBuffer(rows),
        fileName: buildExportFileName("student-percentages", "csv", new Date()),
        mimeType: "text/csv",
      }
    }
    case "COMPREHENSIVE_CSV": {
      const data = await loadComprehensiveCsvData(database, request.filters)
      return {
        bytes: buildComprehensiveCsvBuffer(data),
        fileName: buildExportFileName("comprehensive-attendance", "csv", new Date()),
        mimeType: "text/csv",
      }
    }
    case "ADMIN_STUDENT_REPORT_XLSX":
    case "ADMIN_TEACHER_REPORT_XLSX":
    case "ADMIN_COURSE_REPORT_XLSX":
      throw new Error(
        `Job type ${request.jobType} is generated synchronously by admin-reports and should not reach the inline processor.`,
      )
  }
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function processExportJobInline(
  database: DatabaseService,
  storage: ExportStorageService,
  jobId: string,
  fileTtlHours = 72,
): Promise<void> {
  const job = await database.prisma.exportJob.findUnique({
    where: { id: jobId },
    include: { files: { orderBy: { createdAt: "desc" } } },
  })

  if (!job || (job.status !== "QUEUED" && job.status !== "PROCESSING")) {
    return
  }

  await database.prisma.exportJob.update({
    where: { id: job.id },
    data: { status: "PROCESSING", startedAt: new Date(), failedAt: null, errorMessage: null },
  })

  const request = createExportJobRequestSchema.parse(job.filterSnapshot) as CreateExportJobRequest

  try {
    const generated = await generateExport(database, request)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + fileTtlHours * 60 * 60 * 1000)
    const checksumSha256 = createHash("sha256")
      .update(generated.bytes instanceof Buffer ? generated.bytes : Buffer.from(generated.bytes))
      .digest("hex")
    const objectKey = `inline:${job.id}/${generated.fileName}`
    const inlineDataUrl = storage.buildInlineDataUrl({
      body: new Uint8Array(
        generated.bytes instanceof Buffer ? generated.bytes : Buffer.from(generated.bytes),
      ),
      contentType: generated.mimeType,
    })

    const existingFile = job.files[0] ?? null

    if (existingFile) {
      await database.prisma.exportJobFile.update({
        where: { id: existingFile.id },
        data: {
          objectKey,
          fileName: generated.fileName,
          mimeType: generated.mimeType,
          status: "READY",
          sizeBytes:
            generated.bytes instanceof Buffer
              ? generated.bytes.byteLength
              : generated.bytes.byteLength,
          checksumSha256,
          readyAt: now,
          expiresAt,
        },
      })
    } else {
      await database.prisma.exportJobFile.create({
        data: {
          exportJobId: job.id,
          objectKey,
          fileName: generated.fileName,
          mimeType: generated.mimeType,
          status: "READY",
          sizeBytes:
            generated.bytes instanceof Buffer
              ? generated.bytes.byteLength
              : generated.bytes.byteLength,
          checksumSha256,
          readyAt: now,
          expiresAt,
        },
      })
    }

    await database.prisma.exportJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        completedAt: now,
        failedAt: null,
        errorMessage: null,
        filterSnapshot: {
          ...(job.filterSnapshot && typeof job.filterSnapshot === "object"
            ? (job.filterSnapshot as Record<string, unknown>)
            : {}),
          inlineDataUrl,
        },
      },
    })
  } catch (error) {
    if (job.files[0]) {
      await database.prisma.exportJobFile.update({
        where: { id: job.files[0].id },
        data: { status: "FAILED" },
      })
    }

    await database.prisma.exportJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Export generation failed.",
      },
    })
  }
}
