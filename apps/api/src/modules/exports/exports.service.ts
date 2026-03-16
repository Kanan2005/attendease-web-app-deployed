import type {
  CreateExportJobRequest,
  ExportJobDetail,
  ExportJobFile,
  ExportJobListQuery,
  ExportJobParams,
  ExportJobsResponse,
} from "@attendease/contracts"
import type { Prisma } from "@attendease/db"
import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common"

import { DatabaseService } from "../../database/database.service.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import { ReportsService } from "../reports/reports.service.js"
import { ExportStorageService } from "./export-storage.service.js"

type ExportJobWithRelations = Prisma.ExportJobGetPayload<{
  include: {
    courseOffering: {
      select: {
        code: true
        displayTitle: true
      }
    }
    files: {
      orderBy: {
        createdAt: "desc"
      }
    }
  }
}>

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

@Injectable()
export class ExportsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ReportsService) private readonly reportsService: ReportsService,
    @Inject(ExportStorageService) private readonly exportStorageService: ExportStorageService,
  ) {}

  async createExportJob(
    auth: AuthRequestContext,
    request: CreateExportJobRequest,
  ): Promise<ExportJobDetail> {
    const context = await this.resolveExportScope(auth, request)

    const job = await this.database.prisma.exportJob.create({
      data: {
        requestedByUserId: auth.userId,
        courseOfferingId: context.courseOfferingId,
        jobType: request.jobType,
        filterSnapshot: {
          jobType: request.jobType,
          ...(request.sessionId ? { sessionId: request.sessionId } : {}),
          ...(request.filters ? { filters: request.filters } : {}),
        },
      },
      include: {
        courseOffering: {
          select: {
            code: true,
            displayTitle: true,
          },
        },
        files: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    })

    return this.toExportJobDetail(job)
  }

  async listExportJobs(
    auth: AuthRequestContext,
    query: ExportJobListQuery,
  ): Promise<ExportJobsResponse> {
    const jobs = await this.database.prisma.exportJob.findMany({
      where: {
        requestedByUserId: auth.userId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.jobType ? { jobType: query.jobType } : {}),
      },
      include: {
        courseOffering: {
          select: {
            code: true,
            displayTitle: true,
          },
        },
        files: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        requestedAt: "desc",
      },
    })

    return Promise.all(jobs.map((job) => this.toExportJobSummary(job)))
  }

  async getExportJob(auth: AuthRequestContext, params: ExportJobParams): Promise<ExportJobDetail> {
    const job = await this.database.prisma.exportJob.findUnique({
      where: {
        id: params.exportJobId,
      },
      include: {
        courseOffering: {
          select: {
            code: true,
            displayTitle: true,
          },
        },
        files: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    })

    if (!job) {
      throw new NotFoundException("Export job not found.")
    }

    if (job.requestedByUserId !== auth.userId && auth.activeRole !== "ADMIN") {
      throw new ForbiddenException("You cannot access this export job.")
    }

    return this.toExportJobDetail(job)
  }

  private resolveEffectiveFileStatus(file: ExportJobWithRelations["files"][number], now: Date) {
    if (file.status === "READY" && file.expiresAt && file.expiresAt <= now) {
      return "EXPIRED" as const
    }

    return file.status
  }

  private async toExportJobFile(
    file: ExportJobWithRelations["files"][number],
    now: Date,
  ): Promise<ExportJobFile> {
    const effectiveStatus = this.resolveEffectiveFileStatus(file, now)

    return {
      id: file.id,
      objectKey: file.objectKey,
      fileName: file.fileName,
      mimeType: file.mimeType,
      status: effectiveStatus,
      sizeBytes: file.sizeBytes,
      checksumSha256: file.checksumSha256,
      createdAt: file.createdAt.toISOString(),
      readyAt: file.readyAt?.toISOString() ?? null,
      expiresAt: file.expiresAt?.toISOString() ?? null,
      downloadUrl:
        effectiveStatus === "READY"
          ? await this.exportStorageService.getDownloadUrl(file.objectKey)
          : null,
    }
  }

  private async resolveExportScope(auth: AuthRequestContext, request: CreateExportJobRequest) {
    if (request.jobType === "SESSION_CSV" || request.jobType === "SESSION_PDF") {
      const session = await this.database.prisma.attendanceSession.findUnique({
        where: {
          id: request.sessionId ?? "",
        },
        select: {
          id: true,
          courseOfferingId: true,
          teacherId: true,
        },
      })

      if (!session) {
        throw new NotFoundException("Attendance session not found for export.")
      }

      if (auth.activeRole === "TEACHER" && session.teacherId !== auth.userId) {
        throw new ForbiddenException("The teacher cannot export that attendance session.")
      }

      return {
        courseOfferingId: session.courseOfferingId,
      }
    }

    await this.reportsService.assertTeacherReportAccess(auth, request.filters ?? {})

    return {
      courseOfferingId: request.filters?.classroomId ?? null,
    }
  }

  private async toExportJobDetail(job: ExportJobWithRelations): Promise<ExportJobDetail> {
    const now = new Date()
    const summary = await this.toExportJobSummary(job, now)

    return {
      ...summary,
      files: await Promise.all(job.files.map((file) => this.toExportJobFile(file, now))),
    }
  }

  private async toExportJobSummary(job: ExportJobWithRelations, now = new Date()) {
    const filterSnapshot = toRecord(job.filterSnapshot)
    const sessionId =
      typeof filterSnapshot?.sessionId === "string" ? filterSnapshot.sessionId : null
    const readyFiles = job.files.filter(
      (file) => this.resolveEffectiveFileStatus(file, now) === "READY",
    )
    const readyFileCount = readyFiles.length
    const latestReadyFile = readyFiles[0] ?? null

    return {
      id: job.id,
      jobType: job.jobType,
      status: job.status,
      requestedAt: job.requestedAt.toISOString(),
      startedAt: job.startedAt?.toISOString() ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
      failedAt: job.failedAt?.toISOString() ?? null,
      errorMessage: job.errorMessage,
      courseOfferingId: job.courseOfferingId,
      courseOfferingCode: job.courseOffering?.code ?? null,
      courseOfferingDisplayTitle: job.courseOffering?.displayTitle ?? null,
      sessionId,
      filterSnapshot,
      readyFileCount,
      totalFileCount: job.files.length,
      latestReadyDownloadUrl: latestReadyFile
        ? await this.exportStorageService.getDownloadUrl(latestReadyFile.objectKey)
        : null,
    }
  }
}
