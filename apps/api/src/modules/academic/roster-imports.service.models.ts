import {
  type RosterImportJobDetail,
  type RosterImportJobSummary,
  rosterImportJobDetailSchema,
  rosterImportJobSummarySchema,
  rosterImportRowSummarySchema,
} from "@attendease/contracts"
import { BadRequestException } from "@nestjs/common"

import type { ClassroomAccessContext } from "./classrooms.service.js"

export function assertMutableRosterImportClassroom(
  classroom: Pick<ClassroomAccessContext, "status" | "semester">,
) {
  if (classroom.status === "COMPLETED" || classroom.status === "ARCHIVED") {
    throw new BadRequestException(
      "Roster imports are not allowed for completed or archived classrooms.",
    )
  }

  if (classroom.semester.status === "CLOSED" || classroom.semester.status === "ARCHIVED") {
    throw new BadRequestException(
      "Roster imports are not allowed inside a closed or archived semester.",
    )
  }
}

export function buildInlineSourceFileKey(sourceFileName: string) {
  const sanitized = sourceFileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
  return `inline://roster-imports/${Date.now()}-${sanitized}`
}

export function toRosterImportJobSummary(input: {
  id: string
  courseOfferingId: string
  requestedByUserId: string
  sourceFileKey: string
  sourceFileName: string
  status: "UPLOADED" | "PROCESSING" | "REVIEW_REQUIRED" | "APPLIED" | "FAILED"
  totalRows: number
  validRows: number
  invalidRows: number
  appliedRows: number
  startedAt: Date | null
  completedAt: Date | null
  reviewedAt: Date | null
  createdAt: Date
}): RosterImportJobSummary {
  return rosterImportJobSummarySchema.parse({
    id: input.id,
    courseOfferingId: input.courseOfferingId,
    classroomId: input.courseOfferingId,
    requestedByUserId: input.requestedByUserId,
    sourceFileKey: input.sourceFileKey,
    sourceFileName: input.sourceFileName,
    status: input.status,
    totalRows: input.totalRows,
    validRows: input.validRows,
    invalidRows: input.invalidRows,
    appliedRows: input.appliedRows,
    startedAt: input.startedAt?.toISOString() ?? null,
    completedAt: input.completedAt?.toISOString() ?? null,
    reviewedAt: input.reviewedAt?.toISOString() ?? null,
    createdAt: input.createdAt.toISOString(),
  })
}

export function toRosterImportJobDetail(input: {
  id: string
  courseOfferingId: string
  requestedByUserId: string
  sourceFileKey: string
  sourceFileName: string
  status: "UPLOADED" | "PROCESSING" | "REVIEW_REQUIRED" | "APPLIED" | "FAILED"
  totalRows: number
  validRows: number
  invalidRows: number
  appliedRows: number
  startedAt: Date | null
  completedAt: Date | null
  reviewedAt: Date | null
  createdAt: Date
  rows: {
    id: string
    jobId: string
    rowNumber: number
    studentEmail: string | null
    studentRollNumber: string | null
    parsedName: string | null
    status: "PENDING" | "VALID" | "INVALID" | "APPLIED" | "SKIPPED" | "FAILED"
    errorMessage: string | null
    resolvedStudentId: string | null
  }[]
}): RosterImportJobDetail {
  return rosterImportJobDetailSchema.parse({
    ...toRosterImportJobSummary(input),
    rows: input.rows.map((row) =>
      rosterImportRowSummarySchema.parse({
        id: row.id,
        jobId: row.jobId,
        rowNumber: row.rowNumber,
        studentEmail: row.studentEmail,
        studentRollNumber: row.studentRollNumber,
        parsedName: row.parsedName,
        status: row.status,
        errorMessage: row.errorMessage,
        resolvedStudentId: row.resolvedStudentId,
      }),
    ),
  })
}
