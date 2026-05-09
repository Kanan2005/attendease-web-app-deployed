import type {
  AdminCourseReportRequest,
  AdminReportJobSummary,
  AdminStudentReportRequest,
  AdminTeacherReportRequest,
} from "@attendease/contracts"
import type { Prisma } from "@attendease/db"
import { type XlsxSheet, buildXlsxBuffer } from "@attendease/export"
import { Inject, Injectable, NotFoundException } from "@nestjs/common"

import { DatabaseService } from "../../database/database.service.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import { ExportStorageService } from "../exports/export-storage.service.js"

type ExportJobWithFiles = Prisma.ExportJobGetPayload<{
  include: {
    files: {
      orderBy: { createdAt: "desc" }
      take: 1
    }
  }
}>

type AdminReportJobType =
  | "ADMIN_STUDENT_REPORT_XLSX"
  | "ADMIN_TEACHER_REPORT_XLSX"
  | "ADMIN_COURSE_REPORT_XLSX"

const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

type ReportArtifact = {
  fileName: string
  buffer: Buffer
  rowCount: number
  filtersSummary: string
}

@Injectable()
export class AdminReportsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ExportStorageService) private readonly storage: ExportStorageService,
  ) {}

  // -------------------------------------------------------------------
  // Student report
  // -------------------------------------------------------------------
  async generateStudentReport(
    auth: AuthRequestContext,
    request: AdminStudentReportRequest,
  ): Promise<AdminReportJobSummary> {
    return this.runReport({
      auth,
      jobType: "ADMIN_STUDENT_REPORT_XLSX",
      filterSnapshot: request,
      build: () => this.buildStudentReport(request),
    })
  }

  private async buildStudentReport(request: AdminStudentReportRequest): Promise<ReportArtifact> {
    const enrollments = await this.database.prisma.enrollment.findMany({
      where: {
        status: "ACTIVE",
        ...(request.courseOfferingId ? { courseOfferingId: request.courseOfferingId } : {}),
        ...(request.semesterId ? { semesterId: request.semesterId } : {}),
        ...(request.branch || request.currentSemester !== undefined
          ? {
              student: {
                studentProfile: {
                  ...(request.branch ? { branch: request.branch } : {}),
                  ...(request.currentSemester !== undefined
                    ? { currentSemester: request.currentSemester }
                    : {}),
                },
              },
            }
          : {}),
      },
      include: {
        student: {
          include: { studentProfile: true },
        },
        courseOffering: {
          include: {
            primaryTeacher: { select: { displayName: true } },
            subject: { select: { code: true, title: true } },
          },
        },
      },
    })

    const summaryRows = await this.database.prisma.analyticsStudentCourseSummary.findMany({
      where: {
        studentId: { in: enrollments.map((e) => e.studentId) },
        courseOfferingId: { in: enrollments.map((e) => e.courseOfferingId) },
      },
    })
    const summaryByKey = new Map(
      summaryRows.map((row) => [`${row.studentId}|${row.courseOfferingId}`, row]),
    )

    const rows = enrollments.map((enrollment) => {
      const summary = summaryByKey.get(`${enrollment.studentId}|${enrollment.courseOfferingId}`)
      const total = summary?.totalSessions ?? 0
      const present = summary?.presentSessions ?? 0
      const percent = total === 0 ? null : round1((present / total) * 100)
      return [
        enrollment.student.displayName,
        enrollment.student.email,
        enrollment.student.studentProfile?.rollNumber ?? "",
        enrollment.student.studentProfile?.branch ?? "",
        enrollment.student.studentProfile?.currentSemester ?? null,
        enrollment.courseOffering.subject?.code ?? "",
        enrollment.courseOffering.subject?.title ?? enrollment.courseOffering.displayTitle,
        enrollment.courseOffering.primaryTeacher.displayName,
        enrollment.courseOffering.status,
        present,
        total,
        percent,
        summary?.lastSessionAt?.toISOString() ?? "",
      ] as const
    })

    rows.sort((a, b) => {
      const branchCompare = String(a[3] ?? "").localeCompare(String(b[3] ?? ""))
      if (branchCompare !== 0) return branchCompare
      const nameCompare = String(a[0]).localeCompare(String(b[0]))
      if (nameCompare !== 0) return nameCompare
      return String(a[5] ?? "").localeCompare(String(b[5] ?? ""))
    })

    const filtersSummary = buildStudentFiltersSummary(request)
    const sheet: XlsxSheet = {
      name: "Student attendance",
      banner: [
        "Attendease — Student attendance report",
        `Filters: ${filtersSummary}`,
        `Generated at: ${new Date().toISOString()}`,
      ],
      columns: [
        { header: "Student name", width: 26 },
        { header: "Email", width: 30 },
        { header: "Roll number", width: 16 },
        { header: "Branch", width: 22 },
        { header: "Semester" },
        { header: "Course code", width: 14 },
        { header: "Course title", width: 30 },
        { header: "Teacher", width: 22 },
        { header: "Course status", width: 14 },
        { header: "Present" },
        { header: "Total sessions" },
        { header: "Attendance %" },
        { header: "Last session at", width: 22 },
      ],
      rows,
    }

    const buffer = await buildXlsxBuffer({
      title: "Attendease — Student attendance report",
      sheets: [sheet],
    })

    return {
      fileName: buildFileName("student-report"),
      buffer,
      rowCount: rows.length,
      filtersSummary,
    }
  }

  // -------------------------------------------------------------------
  // Teacher report
  // -------------------------------------------------------------------
  async generateTeacherReport(
    auth: AuthRequestContext,
    request: AdminTeacherReportRequest,
  ): Promise<AdminReportJobSummary> {
    return this.runReport({
      auth,
      jobType: "ADMIN_TEACHER_REPORT_XLSX",
      filterSnapshot: request,
      build: () => this.buildTeacherReport(request),
    })
  }

  private async buildTeacherReport(request: AdminTeacherReportRequest): Promise<ReportArtifact> {
    const offerings = await this.database.prisma.courseOffering.findMany({
      where: {
        ...(request.includeArchived ? {} : { status: { not: "ARCHIVED" } }),
        ...(request.semesterId ? { semesterId: request.semesterId } : {}),
        ...(request.teacherId ? { primaryTeacherId: request.teacherId } : {}),
        ...(request.department
          ? {
              primaryTeacher: {
                teacherProfile: { department: request.department },
              },
            }
          : {}),
      },
      include: {
        primaryTeacher: {
          include: { teacherProfile: true },
        },
        subject: { select: { code: true, title: true } },
        _count: { select: { enrollments: true } },
      },
    })

    // Aggregate per-course totals from per-student summaries.
    const studentSummaries = await this.database.prisma.analyticsStudentCourseSummary.findMany({
      where: { courseOfferingId: { in: offerings.map((o) => o.id) } },
      select: {
        courseOfferingId: true,
        totalSessions: true,
        presentSessions: true,
        lastSessionAt: true,
      },
    })
    type CourseAggregate = {
      maxSessions: number
      sumPresent: number
      sumDenominator: number
      lastSessionAt: Date | null
    }
    const aggByOffering = new Map<string, CourseAggregate>()
    for (const row of studentSummaries) {
      const existing = aggByOffering.get(row.courseOfferingId) ?? {
        maxSessions: 0,
        sumPresent: 0,
        sumDenominator: 0,
        lastSessionAt: null as Date | null,
      }
      existing.maxSessions = Math.max(existing.maxSessions, row.totalSessions)
      existing.sumPresent += row.presentSessions
      existing.sumDenominator += row.totalSessions
      if (
        row.lastSessionAt &&
        (!existing.lastSessionAt || row.lastSessionAt > existing.lastSessionAt)
      ) {
        existing.lastSessionAt = row.lastSessionAt
      }
      aggByOffering.set(row.courseOfferingId, existing)
    }

    const rows = offerings.map((offering) => {
      const agg = aggByOffering.get(offering.id)
      const sessionsConducted = agg?.maxSessions ?? 0
      const denominator = agg?.sumDenominator ?? 0
      const avgPercent =
        denominator === 0 ? null : round1(((agg?.sumPresent ?? 0) / denominator) * 100)
      return [
        offering.primaryTeacher.displayName,
        offering.primaryTeacher.email,
        offering.primaryTeacher.teacherProfile?.employeeCode ?? "",
        offering.primaryTeacher.teacherProfile?.department ?? "",
        offering.primaryTeacher.teacherProfile?.designation ?? "",
        offering.subject?.code ?? "",
        offering.subject?.title ?? offering.displayTitle,
        offering.status,
        offering._count.enrollments,
        sessionsConducted,
        avgPercent,
        agg?.lastSessionAt?.toISOString() ?? "",
      ] as const
    })

    rows.sort((a, b) => {
      const deptCompare = String(a[3] ?? "").localeCompare(String(b[3] ?? ""))
      if (deptCompare !== 0) return deptCompare
      const teacherCompare = String(a[0]).localeCompare(String(b[0]))
      if (teacherCompare !== 0) return teacherCompare
      return String(a[5] ?? "").localeCompare(String(b[5] ?? ""))
    })

    const filtersSummary = buildTeacherFiltersSummary(request)
    const sheet: XlsxSheet = {
      name: "Teacher courses",
      banner: [
        "Attendease — Teacher report",
        `Filters: ${filtersSummary}`,
        `Generated at: ${new Date().toISOString()}`,
      ],
      columns: [
        { header: "Teacher name", width: 26 },
        { header: "Email", width: 30 },
        { header: "Employee code", width: 16 },
        { header: "Department", width: 22 },
        { header: "Designation", width: 18 },
        { header: "Course code", width: 14 },
        { header: "Course title", width: 30 },
        { header: "Course status", width: 14 },
        { header: "Students enrolled" },
        { header: "Sessions conducted" },
        { header: "Average attendance %" },
        { header: "Last session at", width: 22 },
      ],
      rows,
    }

    const buffer = await buildXlsxBuffer({
      title: "Attendease — Teacher report",
      sheets: [sheet],
    })

    return {
      fileName: buildFileName("teacher-report"),
      buffer,
      rowCount: rows.length,
      filtersSummary,
    }
  }

  // -------------------------------------------------------------------
  // Course report
  // -------------------------------------------------------------------
  async generateCourseReport(
    auth: AuthRequestContext,
    request: AdminCourseReportRequest,
  ): Promise<AdminReportJobSummary> {
    return this.runReport({
      auth,
      jobType: "ADMIN_COURSE_REPORT_XLSX",
      filterSnapshot: request,
      build: () => this.buildCourseReport(request),
    })
  }

  private async buildCourseReport(request: AdminCourseReportRequest): Promise<ReportArtifact> {
    const offering = await this.database.prisma.courseOffering.findUnique({
      where: { id: request.courseOfferingId },
      include: {
        primaryTeacher: { select: { displayName: true, email: true } },
        subject: { select: { code: true, title: true } },
      },
    })
    if (!offering) {
      throw new NotFoundException(`Course offering ${request.courseOfferingId} not found.`)
    }

    const enrollments = await this.database.prisma.enrollment.findMany({
      where: {
        courseOfferingId: request.courseOfferingId,
        status: "ACTIVE",
      },
      include: {
        student: { include: { studentProfile: true } },
      },
    })

    const summaryRows = await this.database.prisma.analyticsStudentCourseSummary.findMany({
      where: {
        courseOfferingId: request.courseOfferingId,
        studentId: { in: enrollments.map((e) => e.studentId) },
      },
    })
    const summaryByStudent = new Map(summaryRows.map((row) => [row.studentId, row]))

    const rows = enrollments.map((enrollment) => {
      const summary = summaryByStudent.get(enrollment.studentId)
      const total = summary?.totalSessions ?? 0
      const present = summary?.presentSessions ?? 0
      const percent = total === 0 ? null : round1((present / total) * 100)
      return [
        enrollment.student.displayName,
        enrollment.student.email,
        enrollment.student.studentProfile?.rollNumber ?? "",
        enrollment.student.studentProfile?.branch ?? "",
        enrollment.student.studentProfile?.currentSemester ?? null,
        present,
        total,
        percent,
        summary?.lastSessionAt?.toISOString() ?? "",
      ] as const
    })

    rows.sort((a, b) => {
      const aPercent = (a[7] as number | null) ?? -1
      const bPercent = (b[7] as number | null) ?? -1
      if (aPercent !== bPercent) return aPercent - bPercent
      return String(a[0]).localeCompare(String(b[0]))
    })

    const filtersSummary = `course=${offering.subject?.code ?? offering.displayTitle}`
    const sheet: XlsxSheet = {
      name: "Course attendance",
      banner: [
        "Attendease — Course attendance report",
        `Course: ${offering.subject?.code ?? ""} ${offering.subject?.title ?? offering.displayTitle}`,
        `Teacher: ${offering.primaryTeacher.displayName}`,
        `Generated at: ${new Date().toISOString()}`,
      ],
      columns: [
        { header: "Student name", width: 26 },
        { header: "Email", width: 30 },
        { header: "Roll number", width: 16 },
        { header: "Branch", width: 22 },
        { header: "Semester" },
        { header: "Present" },
        { header: "Total sessions" },
        { header: "Attendance %" },
        { header: "Last session at", width: 22 },
      ],
      rows,
    }

    const buffer = await buildXlsxBuffer({
      title: "Attendease — Course attendance report",
      sheets: [sheet],
    })

    return {
      fileName: buildFileName(`course-${offering.subject?.code ?? "report"}`),
      buffer,
      rowCount: rows.length,
      filtersSummary,
    }
  }

  // -------------------------------------------------------------------
  // Recent reports listing
  // -------------------------------------------------------------------
  async listRecentReports(auth: AuthRequestContext): Promise<AdminReportJobSummary[]> {
    const jobs = await this.database.prisma.exportJob.findMany({
      where: {
        requestedByUserId: auth.userId,
        jobType: {
          in: [
            "ADMIN_STUDENT_REPORT_XLSX",
            "ADMIN_TEACHER_REPORT_XLSX",
            "ADMIN_COURSE_REPORT_XLSX",
          ],
        },
      },
      include: {
        files: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { requestedAt: "desc" },
      take: 25,
    })

    return Promise.all(jobs.map((job) => this.toJobSummary(job)))
  }

  // -------------------------------------------------------------------
  // Internal: shared run pipeline
  // -------------------------------------------------------------------
  private async runReport(input: {
    auth: AuthRequestContext
    jobType: AdminReportJobType
    filterSnapshot: Record<string, unknown>
    build: () => Promise<ReportArtifact>
  }): Promise<AdminReportJobSummary> {
    const job = await this.database.prisma.exportJob.create({
      data: {
        requestedByUserId: input.auth.userId,
        jobType: input.jobType,
        status: "PROCESSING",
        startedAt: new Date(),
        filterSnapshot: input.filterSnapshot as Prisma.InputJsonValue,
      },
    })

    try {
      const artifact = await input.build()
      const objectKey = `admin-reports/${input.auth.userId}/${job.id}/${artifact.fileName}`

      await this.storage.uploadObject({
        objectKey,
        body: new Uint8Array(artifact.buffer),
        contentType: XLSX_CONTENT_TYPE,
      })

      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
      await this.database.prisma.exportJobFile.create({
        data: {
          exportJobId: job.id,
          objectKey,
          fileName: artifact.fileName,
          mimeType: XLSX_CONTENT_TYPE,
          status: "READY",
          sizeBytes: artifact.buffer.byteLength,
          readyAt: new Date(),
          expiresAt,
        },
      })

      const completed = await this.database.prisma.exportJob.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          filterSnapshot: {
            ...(input.filterSnapshot as Record<string, unknown>),
            rowCount: artifact.rowCount,
            filtersSummary: artifact.filtersSummary,
          } as Prisma.InputJsonValue,
        },
        include: {
          files: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      })

      return this.toJobSummary(completed)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate the report."
      const failed = await this.database.prisma.exportJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          errorMessage: message,
        },
        include: {
          files: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      })
      return this.toJobSummary(failed)
    }
  }

  private async toJobSummary(job: ExportJobWithFiles): Promise<AdminReportJobSummary> {
    const file = job.files[0] ?? null
    const downloadUrl =
      job.status === "COMPLETED" && file ? await this.storage.getDownloadUrl(file.objectKey) : null
    const filterSnapshot =
      job.filterSnapshot && typeof job.filterSnapshot === "object"
        ? (job.filterSnapshot as Record<string, unknown>)
        : {}
    const rowCount = typeof filterSnapshot.rowCount === "number" ? filterSnapshot.rowCount : 0
    const filtersSummary =
      typeof filterSnapshot.filtersSummary === "string"
        ? filterSnapshot.filtersSummary
        : "(no filters)"
    return {
      jobId: job.id,
      jobType: job.jobType as AdminReportJobType,
      status: job.status === "COMPLETED" ? "COMPLETED" : "FAILED",
      fileName: file?.fileName ?? "(no file)",
      sizeBytes: file?.sizeBytes ?? 0,
      rowCount,
      generatedAt: job.completedAt?.toISOString() ?? job.requestedAt.toISOString(),
      downloadUrl,
      filtersSummary,
      errorMessage: job.errorMessage,
    }
  }
}

// ----------------------------- helpers -----------------------------

function buildFileName(prefix: string): string {
  const stamp = new Date().toISOString().replaceAll(":", "-").slice(0, 19)
  return `${prefix}-${stamp}.xlsx`
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function buildStudentFiltersSummary(request: AdminStudentReportRequest): string {
  const parts: string[] = []
  if (request.branch) parts.push(`branch=${request.branch}`)
  if (request.currentSemester !== undefined) parts.push(`sem=${request.currentSemester}`)
  if (request.courseOfferingId) parts.push(`courseOfferingId=${request.courseOfferingId}`)
  if (request.semesterId) parts.push(`semesterId=${request.semesterId}`)
  return parts.join(", ") || "(no filters)"
}

function buildTeacherFiltersSummary(request: AdminTeacherReportRequest): string {
  const parts: string[] = []
  if (request.teacherId) parts.push(`teacherId=${request.teacherId}`)
  if (request.department) parts.push(`department=${request.department}`)
  if (request.semesterId) parts.push(`semesterId=${request.semesterId}`)
  if (request.includeArchived) parts.push("includeArchived")
  return parts.join(", ") || "(no filters)"
}
