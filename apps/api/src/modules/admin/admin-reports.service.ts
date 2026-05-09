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

type DateRange = { from: Date | undefined; to: Date | undefined }

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
  // Shared: date-range-aware attendance computation
  // -------------------------------------------------------------------

  /**
   * Computes per-student-per-course attendance from raw records filtered by
   * session date range. Falls back to the pre-computed summary table when no
   * date range is given.
   */
  private async computeAttendance(
    enrollments: { studentId: string; courseOfferingId: string }[],
    dateRange?: DateRange,
  ): Promise<
    Map<string, { totalSessions: number; presentSessions: number; lastSessionAt: Date | null }>
  > {
    // Fast path: use pre-computed analytics when no date range
    if (!dateRange?.from && !dateRange?.to) {
      const summaryRows = await this.database.prisma.analyticsStudentCourseSummary.findMany({
        where: {
          OR: enrollments.map((e) => ({
            studentId: e.studentId,
            courseOfferingId: e.courseOfferingId,
          })),
        },
      })
      return new Map(
        summaryRows.map((row) => [
          `${row.studentId}|${row.courseOfferingId}`,
          {
            totalSessions: row.totalSessions,
            presentSessions: row.presentSessions,
            lastSessionAt: row.lastSessionAt,
          },
        ]),
      )
    }

    // Slow path: query raw sessions within the date range
    const courseOfferingIds = [...new Set(enrollments.map((e) => e.courseOfferingId))]
    const sessionDateFilter: Prisma.AttendanceSessionWhereInput = {
      courseOfferingId: { in: courseOfferingIds },
      status: { in: ["ENDED", "EXPIRED"] },
      ...(dateRange.from || dateRange.to
        ? {
            startedAt: {
              ...(dateRange.from ? { gte: dateRange.from } : {}),
              ...(dateRange.to ? { lte: dateRange.to } : {}),
            },
          }
        : {}),
    }
    const sessions = await this.database.prisma.attendanceSession.findMany({
      where: sessionDateFilter,
      select: { id: true, courseOfferingId: true, startedAt: true },
    })
    if (sessions.length === 0) return new Map()

    const sessionIds = sessions.map((s) => s.id)
    const sessionCourseMap = new Map(sessions.map((s) => [s.id, s.courseOfferingId]))

    const records = await this.database.prisma.attendanceRecord.findMany({
      where: { sessionId: { in: sessionIds } },
      select: { sessionId: true, studentId: true, status: true },
    })

    // Count sessions per course offering
    const sessionsPerCourse = new Map<string, number>()
    const lastSessionPerCourse = new Map<string, Date | null>()
    for (const session of sessions) {
      const coId = session.courseOfferingId
      sessionsPerCourse.set(coId, (sessionsPerCourse.get(coId) ?? 0) + 1)
      const prev = lastSessionPerCourse.get(coId)
      if (session.startedAt && (!prev || session.startedAt > prev)) {
        lastSessionPerCourse.set(coId, session.startedAt)
      }
    }

    // Count present per student per course
    const presentCount = new Map<string, number>()
    for (const record of records) {
      if (record.status !== "PRESENT") continue
      const coId = sessionCourseMap.get(record.sessionId)
      if (!coId) continue
      const key = `${record.studentId}|${coId}`
      presentCount.set(key, (presentCount.get(key) ?? 0) + 1)
    }

    const result = new Map<
      string,
      { totalSessions: number; presentSessions: number; lastSessionAt: Date | null }
    >()
    for (const enrollment of enrollments) {
      const key = `${enrollment.studentId}|${enrollment.courseOfferingId}`
      const total = sessionsPerCourse.get(enrollment.courseOfferingId) ?? 0
      result.set(key, {
        totalSessions: total,
        presentSessions: presentCount.get(key) ?? 0,
        lastSessionAt: lastSessionPerCourse.get(enrollment.courseOfferingId) ?? null,
      })
    }
    return result
  }

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
    const dateRange = parseDateRange(request.fromDate, request.toDate)

    const enrollments = await this.database.prisma.enrollment.findMany({
      where: {
        status: "ACTIVE",
        ...(request.studentId ? { studentId: request.studentId } : {}),
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

    const summaryByKey = await this.computeAttendance(
      enrollments.map((e) => ({ studentId: e.studentId, courseOfferingId: e.courseOfferingId })),
      dateRange,
    )

    // Build enriched rows
    type EnrichedRow = {
      courseKey: string
      courseCode: string
      courseTitle: string
      teacher: string
      courseStatus: string
      cells: readonly (string | number | null)[]
    }
    const enrichedRows: EnrichedRow[] = enrollments.map((enrollment) => {
      const summary = summaryByKey.get(`${enrollment.studentId}|${enrollment.courseOfferingId}`)
      const total = summary?.totalSessions ?? 0
      const present = summary?.presentSessions ?? 0
      const percent = total === 0 ? null : round1((present / total) * 100)
      const courseCode = enrollment.courseOffering.subject?.code ?? ""
      const courseTitle =
        enrollment.courseOffering.subject?.title ?? enrollment.courseOffering.displayTitle
      return {
        courseKey: `${courseCode}||${courseTitle}`,
        courseCode,
        courseTitle,
        teacher: enrollment.courseOffering.primaryTeacher.displayName,
        courseStatus: enrollment.courseOffering.status,
        cells: [
          enrollment.student.displayName,
          enrollment.student.email,
          enrollment.student.studentProfile?.rollNumber ?? "",
          enrollment.student.studentProfile?.branch ?? "",
          enrollment.student.studentProfile?.currentSemester ?? null,
          present,
          total,
          percent,
          summary?.lastSessionAt?.toISOString() ?? "",
        ] as const,
      }
    })

    enrichedRows.sort((a, b) => {
      const codeCompare = a.courseCode.localeCompare(b.courseCode)
      if (codeCompare !== 0) return codeCompare
      return String(a.cells[0] ?? "").localeCompare(String(b.cells[0] ?? ""))
    })

    const filtersSummary = buildStudentFiltersSummary(request)
    const perSheetColumns: XlsxSheet["columns"] = [
      { header: "Student name", width: 26 },
      { header: "Email", width: 30 },
      { header: "Roll number", width: 16 },
      { header: "Branch", width: 22 },
      { header: "Semester" },
      { header: "Present" },
      { header: "Total sessions" },
      { header: "Attendance %" },
      { header: "Last session at", width: 22 },
    ]

    // Group by course → one sheet per course
    const courseGroups = new Map<string, { meta: EnrichedRow; rows: EnrichedRow[] }>()
    for (const row of enrichedRows) {
      const existing = courseGroups.get(row.courseKey)
      if (existing) {
        existing.rows.push(row)
      } else {
        courseGroups.set(row.courseKey, { meta: row, rows: [row] })
      }
    }

    const sheets: XlsxSheet[] = []

    // If multiple courses → separate sheet per course
    if (courseGroups.size > 1) {
      for (const [, group] of courseGroups) {
        sheets.push({
          name: group.meta.courseCode || group.meta.courseTitle.slice(0, 28),
          banner: [
            `${group.meta.courseCode} — ${group.meta.courseTitle}`,
            `Teacher: ${group.meta.teacher}`,
            `Status: ${group.meta.courseStatus}`,
            `Filters: ${filtersSummary}`,
            `Generated at: ${new Date().toISOString()}`,
          ],
          columns: perSheetColumns,
          rows: group.rows.map((r) => r.cells),
        })
      }
    } else {
      // Single course or mixed → one sheet with course columns included
      sheets.push({
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
        rows: enrichedRows.map((r) => [
          ...r.cells.slice(0, 5),
          r.courseCode,
          r.courseTitle,
          r.teacher,
          r.courseStatus,
          ...r.cells.slice(5),
        ]),
      })
    }

    const totalRowCount = enrichedRows.length
    const buffer = await buildXlsxBuffer({
      title: "Attendease — Student attendance report",
      sheets,
    })

    return {
      fileName: buildFileName("student-report"),
      buffer,
      rowCount: totalRowCount,
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
    const dateRange = parseDateRange(request.fromDate, request.toDate)

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

    // Aggregate per-course totals. When date range is set, count raw sessions.
    type CourseAggregate = {
      maxSessions: number
      sumPresent: number
      sumDenominator: number
      lastSessionAt: Date | null
    }
    const aggByOffering = new Map<string, CourseAggregate>()

    if (!dateRange?.from && !dateRange?.to) {
      // Fast path: pre-computed summaries
      const studentSummaries = await this.database.prisma.analyticsStudentCourseSummary.findMany({
        where: { courseOfferingId: { in: offerings.map((o) => o.id) } },
        select: {
          courseOfferingId: true,
          totalSessions: true,
          presentSessions: true,
          lastSessionAt: true,
        },
      })
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
    } else {
      // Slow path: count sessions from raw tables within date range
      const offeringIds = offerings.map((o) => o.id)
      const sessions = await this.database.prisma.attendanceSession.findMany({
        where: {
          courseOfferingId: { in: offeringIds },
          status: { in: ["ENDED", "EXPIRED"] },
          startedAt: {
            ...(dateRange.from ? { gte: dateRange.from } : {}),
            ...(dateRange.to ? { lte: dateRange.to } : {}),
          },
        },
        select: { id: true, courseOfferingId: true, startedAt: true },
      })
      const sessionIds = sessions.map((s) => s.id)
      const records =
        sessionIds.length > 0
          ? await this.database.prisma.attendanceRecord.findMany({
              where: { sessionId: { in: sessionIds }, status: "PRESENT" },
              select: { sessionId: true },
            })
          : []
      const presentCountBySession = new Map<string, number>()
      for (const r of records) {
        presentCountBySession.set(r.sessionId, (presentCountBySession.get(r.sessionId) ?? 0) + 1)
      }

      for (const session of sessions) {
        const coId = session.courseOfferingId
        const existing = aggByOffering.get(coId) ?? {
          maxSessions: 0,
          sumPresent: 0,
          sumDenominator: 0,
          lastSessionAt: null as Date | null,
        }
        existing.maxSessions += 1
        const enrolled = offerings.find((o) => o.id === coId)?._count.enrollments ?? 0
        existing.sumPresent += presentCountBySession.get(session.id) ?? 0
        existing.sumDenominator += enrolled
        if (
          session.startedAt &&
          (!existing.lastSessionAt || session.startedAt > existing.lastSessionAt)
        ) {
          existing.lastSessionAt = session.startedAt
        }
        aggByOffering.set(coId, existing)
      }
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
    const dateRange = parseDateRange(request.fromDate, request.toDate)

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

    const summaryByKey = await this.computeAttendance(
      enrollments.map((e) => ({
        studentId: e.studentId,
        courseOfferingId: request.courseOfferingId,
      })),
      dateRange,
    )

    const rows = enrollments.map((enrollment) => {
      const summary = summaryByKey.get(`${enrollment.studentId}|${request.courseOfferingId}`)
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

    const dateSuffix = formatDateRangeSuffix(dateRange)
    const filtersSummary = `course=${offering.subject?.code ?? offering.displayTitle}${dateSuffix}`
    const sheet: XlsxSheet = {
      name: "Course attendance",
      banner: [
        "Attendease — Course attendance report",
        `Course: ${offering.subject?.code ?? ""} ${offering.subject?.title ?? offering.displayTitle}`,
        `Teacher: ${offering.primaryTeacher.displayName}`,
        ...(dateSuffix ? [`Date range: ${dateSuffix.replace(", ", "")}`] : []),
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
      const forceInline = this.storage.inlineFallbackEnabled
      let inlineDataUrl: string | undefined
      let objectKey = `admin-reports/${input.auth.userId}/${job.id}/${artifact.fileName}`

      if (forceInline) {
        // Operator opted into inline mode via STORAGE_INLINE_FALLBACK=true.
        objectKey = `inline:${job.id}/${artifact.fileName}`
        inlineDataUrl = this.storage.buildInlineDataUrl({
          body: new Uint8Array(artifact.buffer),
          contentType: XLSX_CONTENT_TYPE,
        })
      } else {
        try {
          await this.storage.uploadObject({
            objectKey,
            body: new Uint8Array(artifact.buffer),
            contentType: XLSX_CONTENT_TYPE,
          })
        } catch (uploadError) {
          // Resilience: if the S3-compatible storage rejects the upload
          // (typically because of misconfigured/expired credentials or an
          // unreachable endpoint), automatically fall back to embedding the
          // file as a data: URL inside the job record. Keeps the admin
          // report flow working even when the storage backend is broken.
          const message = uploadError instanceof Error ? uploadError.message : String(uploadError)
          // eslint-disable-next-line no-console
          console.warn("[admin-reports] storage upload failed; falling back to inline data URL", {
            jobId: job.id,
            error: message,
          })
          objectKey = `inline:${job.id}/${artifact.fileName}`
          inlineDataUrl = this.storage.buildInlineDataUrl({
            body: new Uint8Array(artifact.buffer),
            contentType: XLSX_CONTENT_TYPE,
          })
        }
      }

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
            ...(inlineDataUrl ? { inlineDataUrl } : {}),
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
    const filterSnapshot =
      job.filterSnapshot && typeof job.filterSnapshot === "object"
        ? (job.filterSnapshot as Record<string, unknown>)
        : {}
    const inlineDataUrl =
      typeof filterSnapshot.inlineDataUrl === "string" ? filterSnapshot.inlineDataUrl : null
    const downloadUrl =
      job.status === "COMPLETED" && file
        ? (inlineDataUrl ?? (await this.storage.getDownloadUrl(file.objectKey)))
        : null
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

function parseDateRange(
  fromDate: string | undefined,
  toDate: string | undefined,
): DateRange | undefined {
  const from = fromDate ? new Date(fromDate) : undefined
  const to = toDate ? new Date(toDate) : undefined
  if (!from && !to) return undefined
  return { from, to }
}

function formatDateRangeSuffix(dateRange: DateRange | undefined): string {
  if (!dateRange) return ""
  const parts: string[] = []
  if (dateRange.from) parts.push(`from=${dateRange.from.toISOString().slice(0, 10)}`)
  if (dateRange.to) parts.push(`to=${dateRange.to.toISOString().slice(0, 10)}`)
  return parts.length > 0 ? `, ${parts.join(", ")}` : ""
}

function buildStudentFiltersSummary(request: AdminStudentReportRequest): string {
  const parts: string[] = []
  if (request.branch) parts.push(`branch=${request.branch}`)
  if (request.currentSemester !== undefined) parts.push(`sem=${request.currentSemester}`)
  if (request.courseOfferingId) parts.push(`courseOfferingId=${request.courseOfferingId}`)
  if (request.semesterId) parts.push(`semesterId=${request.semesterId}`)
  if (request.fromDate) parts.push(`from=${request.fromDate.slice(0, 10)}`)
  if (request.toDate) parts.push(`to=${request.toDate.slice(0, 10)}`)
  return parts.join(", ") || "(no filters)"
}

function buildTeacherFiltersSummary(request: AdminTeacherReportRequest): string {
  const parts: string[] = []
  if (request.teacherId) parts.push(`teacherId=${request.teacherId}`)
  if (request.department) parts.push(`department=${request.department}`)
  if (request.semesterId) parts.push(`semesterId=${request.semesterId}`)
  if (request.includeArchived) parts.push("includeArchived")
  if (request.fromDate) parts.push(`from=${request.fromDate.slice(0, 10)}`)
  if (request.toDate) parts.push(`to=${request.toDate.slice(0, 10)}`)
  return parts.join(", ") || "(no filters)"
}
