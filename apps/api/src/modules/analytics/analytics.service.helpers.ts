import type {
  AnalyticsClassComparisonRow,
  AnalyticsFilters,
  AnalyticsSubjectComparisonRow,
} from "@attendease/contracts"
import type { Prisma } from "@attendease/db"
import { calculatePresentAttendancePercentage } from "@attendease/domain"
import { ForbiddenException, NotFoundException } from "@nestjs/common"

import type { DatabaseService } from "../../database/database.service.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import type { ReportsService } from "../reports/reports.service.js"

export type ResolvedAnalyticsFilters = AnalyticsFilters & {
  resolvedClassId?: string | undefined
  resolvedSectionId?: string | undefined
  resolvedSubjectId?: string | undefined
}

export function normalizeDateFilter(input: string | undefined): Date | null {
  return input ? new Date(input) : null
}

export function isWithinRange(value: Date, from: Date | null, to: Date | null) {
  if (from && value < from) {
    return false
  }

  if (to && value > to) {
    return false
  }

  return true
}

export function getSessionActivityAt(session: {
  endedAt: Date | null
  startedAt: Date | null
  createdAt: Date
}): Date {
  return session.endedAt ?? session.startedAt ?? session.createdAt
}

export async function resolveFilters(input: {
  auth: AuthRequestContext
  filters: AnalyticsFilters
  database: DatabaseService
  reportsService: ReportsService
}): Promise<ResolvedAnalyticsFilters> {
  await input.reportsService.assertTeacherReportAccess(input.auth, input.filters)

  if (!input.filters.classroomId) {
    return {
      ...input.filters,
      resolvedClassId: input.filters.classId,
      resolvedSectionId: input.filters.sectionId,
      resolvedSubjectId: input.filters.subjectId,
    }
  }

  const classroom = await input.database.prisma.courseOffering.findUnique({
    where: {
      id: input.filters.classroomId,
    },
    select: {
      classId: true,
      sectionId: true,
      subjectId: true,
    },
  })

  if (!classroom) {
    throw new NotFoundException("Course offering not found.")
  }

  return {
    ...input.filters,
    resolvedClassId: input.filters.classId ?? classroom.classId,
    resolvedSectionId: input.filters.sectionId ?? classroom.sectionId,
    resolvedSubjectId: input.filters.subjectId ?? classroom.subjectId,
  }
}

export function buildCourseOfferingWhere(
  auth: Pick<AuthRequestContext, "activeRole" | "userId">,
  filters: ResolvedAnalyticsFilters,
): Prisma.CourseOfferingWhereInput {
  return {
    ...(auth.activeRole === "TEACHER" ? { primaryTeacherId: auth.userId } : {}),
    ...(filters.classroomId ? { id: filters.classroomId } : {}),
    ...(filters.resolvedClassId ? { classId: filters.resolvedClassId } : {}),
    ...(filters.resolvedSectionId ? { sectionId: filters.resolvedSectionId } : {}),
    ...(filters.resolvedSubjectId ? { subjectId: filters.resolvedSubjectId } : {}),
  }
}

export function buildAttendanceSessionWhere(
  auth: Pick<AuthRequestContext, "activeRole" | "userId">,
  filters: ResolvedAnalyticsFilters,
): Prisma.AttendanceSessionWhereInput {
  return {
    ...(auth.activeRole === "TEACHER" ? { teacherId: auth.userId } : {}),
    ...(filters.classroomId ? { courseOfferingId: filters.classroomId } : {}),
    ...(filters.resolvedClassId ? { classId: filters.resolvedClassId } : {}),
    ...(filters.resolvedSectionId ? { sectionId: filters.resolvedSectionId } : {}),
    ...(filters.resolvedSubjectId ? { subjectId: filters.resolvedSubjectId } : {}),
  }
}

export async function ensureStudentTimelineAccess(input: {
  auth: Pick<AuthRequestContext, "activeRole" | "userId">
  studentId: string
  filters: ResolvedAnalyticsFilters
  database: DatabaseService
}) {
  const accessibleEnrollment = await input.database.prisma.enrollment.findFirst({
    where: {
      studentId: input.studentId,
      ...(input.filters.classroomId ? { courseOfferingId: input.filters.classroomId } : {}),
      ...(input.filters.resolvedClassId ? { classId: input.filters.resolvedClassId } : {}),
      ...(input.filters.resolvedSectionId ? { sectionId: input.filters.resolvedSectionId } : {}),
      ...(input.filters.resolvedSubjectId ? { subjectId: input.filters.resolvedSubjectId } : {}),
      ...(input.auth.activeRole === "TEACHER"
        ? {
            courseOffering: {
              primaryTeacherId: input.auth.userId,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  })

  if (accessibleEnrollment) {
    return
  }

  if (input.auth.activeRole === "TEACHER") {
    throw new ForbiddenException("The teacher cannot access analytics for the requested student.")
  }

  throw new NotFoundException("Student analytics were not found.")
}

export function buildComparisonsFromRows(input: {
  classroomRows: Array<{
    courseOfferingId: string
    presentCount: number
    absentCount: number
    courseOffering: {
      id: string
      code: string
      displayTitle: string
    }
  }>
  subjectRows: Array<{
    subjectId: string
    totalSessions: number
    presentCount: number
    absentCount: number
    subject: {
      id: string
      code: string
      title: string
    }
  }>
}) {
  const classroomsMap = new Map<string, AnalyticsClassComparisonRow>()

  for (const row of input.classroomRows) {
    const current = classroomsMap.get(row.courseOfferingId) ?? {
      classroomId: row.courseOffering.id,
      classroomCode: row.courseOffering.code,
      classroomDisplayTitle: row.courseOffering.displayTitle,
      totalSessions: 0,
      presentCount: 0,
      absentCount: 0,
      attendancePercentage: 0,
    }

    current.totalSessions += 1
    current.presentCount += row.presentCount
    current.absentCount += row.absentCount
    current.attendancePercentage = calculatePresentAttendancePercentage({
      presentCount: current.presentCount,
      absentCount: current.absentCount,
    })
    classroomsMap.set(row.courseOfferingId, current)
  }

  const subjectsMap = new Map<string, AnalyticsSubjectComparisonRow>()

  for (const row of input.subjectRows) {
    const current = subjectsMap.get(row.subjectId) ?? {
      subjectId: row.subject.id,
      subjectCode: row.subject.code,
      subjectTitle: row.subject.title,
      totalSessions: 0,
      presentCount: 0,
      absentCount: 0,
      attendancePercentage: 0,
    }

    current.totalSessions += row.totalSessions
    current.presentCount += row.presentCount
    current.absentCount += row.absentCount
    current.attendancePercentage = calculatePresentAttendancePercentage({
      presentCount: current.presentCount,
      absentCount: current.absentCount,
    })
    subjectsMap.set(row.subjectId, current)
  }

  return {
    classrooms: [...classroomsMap.values()].sort((left, right) =>
      left.classroomCode.localeCompare(right.classroomCode),
    ),
    subjects: [...subjectsMap.values()].sort((left, right) =>
      left.subjectCode.localeCompare(right.subjectCode),
    ),
  }
}
