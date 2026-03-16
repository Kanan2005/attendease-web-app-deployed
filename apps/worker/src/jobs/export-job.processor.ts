import { createHash } from "node:crypto"

import type { CreateExportJobRequest } from "@attendease/contracts"
import { createExportJobRequestSchema } from "@attendease/contracts"
import type { createPrismaClient } from "@attendease/db"
import {
  type ExportStorageAdapter,
  buildComprehensiveCsvBuffer,
  buildExportFileName,
  buildSessionCsvBuffer,
  buildSessionPdfBuffer,
  buildStudentPercentageCsvBuffer,
} from "@attendease/export"
import {
  loadComprehensiveCsvData,
  loadSessionExportData,
  loadStudentPercentageRows,
} from "./export-job.processor.loaders.js"

type WorkerPrismaClient = ReturnType<typeof createPrismaClient>

export class ExportJobProcessor {
  constructor(
    private readonly prisma: WorkerPrismaClient,
    private readonly storage: ExportStorageAdapter,
    private readonly fileTtlHours: number,
    private readonly options: {
      stuckProcessingTimeoutMs?: number
    } = {},
  ) {}

  async processQueuedJobs(limit = 10, now = new Date()): Promise<number> {
    const staleProcessingCutoff = new Date(
      now.getTime() - (this.options.stuckProcessingTimeoutMs ?? 15 * 60 * 1000),
    )
    const jobs = await this.prisma.exportJob.findMany({
      where: {
        OR: [
          {
            status: "QUEUED",
          },
          {
            status: "PROCESSING",
            OR: [
              {
                startedAt: null,
              },
              {
                startedAt: {
                  lte: staleProcessingCutoff,
                },
              },
            ],
          },
        ],
      },
      orderBy: {
        requestedAt: "asc",
      },
      take: limit,
    })

    for (const job of jobs) {
      await this.processJob(job.id)
    }

    return jobs.length
  }

  async processJob(jobId: string) {
    const job = await this.prisma.exportJob.findUnique({
      where: {
        id: jobId,
      },
      include: {
        files: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    })

    if (!job || (job.status !== "QUEUED" && job.status !== "PROCESSING")) {
      return null
    }

    await this.prisma.exportJob.update({
      where: {
        id: job.id,
      },
      data: {
        status: "PROCESSING",
        startedAt: new Date(),
        failedAt: null,
        errorMessage: null,
      },
    })

    const request = createExportJobRequestSchema.parse(job.filterSnapshot) as CreateExportJobRequest

    try {
      const generated = await this.generateExport(job.id, request)
      const now = new Date()
      const expiresAt = new Date(now.getTime() + this.fileTtlHours * 60 * 60 * 1000)
      const checksumSha256 = createHash("sha256").update(generated.bytes).digest("hex")
      const existingFile = job.files[0] ?? null

      await this.storage.uploadObject({
        objectKey: generated.objectKey,
        body: generated.bytes,
        contentType: generated.mimeType,
      })

      if (existingFile) {
        await this.prisma.exportJobFile.update({
          where: {
            id: existingFile.id,
          },
          data: {
            objectKey: generated.objectKey,
            fileName: generated.fileName,
            mimeType: generated.mimeType,
            status: "READY",
            sizeBytes: generated.bytes.byteLength,
            checksumSha256,
            readyAt: now,
            expiresAt,
          },
        })
      } else {
        await this.prisma.exportJobFile.create({
          data: {
            exportJobId: job.id,
            objectKey: generated.objectKey,
            fileName: generated.fileName,
            mimeType: generated.mimeType,
            status: "READY",
            sizeBytes: generated.bytes.byteLength,
            checksumSha256,
            readyAt: now,
            expiresAt,
          },
        })
      }

      await this.prisma.exportJob.update({
        where: {
          id: job.id,
        },
        data: {
          status: "COMPLETED",
          completedAt: now,
          failedAt: null,
          errorMessage: null,
        },
      })

      return this.prisma.exportJob.findUnique({
        where: {
          id: job.id,
        },
        include: {
          files: true,
        },
      })
    } catch (error) {
      if (job.files[0]) {
        await this.prisma.exportJobFile.update({
          where: {
            id: job.files[0].id,
          },
          data: {
            status: "FAILED",
          },
        })
      }

      await this.prisma.exportJob.update({
        where: {
          id: job.id,
        },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : "Export generation failed.",
        },
      })

      throw error
    }
  }

  private async generateExport(jobId: string, request: CreateExportJobRequest) {
    switch (request.jobType) {
      case "SESSION_CSV": {
        const data = await loadSessionExportData(this.prisma, request.sessionId ?? "")
        const fileName = buildExportFileName(`session-${data.sessionId}`, "csv", new Date())

        return {
          bytes: buildSessionCsvBuffer(data),
          fileName,
          objectKey: `exports/${jobId}/${fileName}`,
          mimeType: "text/csv",
        }
      }
      case "SESSION_PDF": {
        const data = await loadSessionExportData(this.prisma, request.sessionId ?? "")
        const fileName = buildExportFileName(`session-${data.sessionId}`, "pdf", new Date())

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
          fileName,
          objectKey: `exports/${jobId}/${fileName}`,
          mimeType: "application/pdf",
        }
      }
      case "STUDENT_PERCENT_CSV": {
        const rows = await loadStudentPercentageRows(this.prisma, request.filters)
        const fileName = buildExportFileName("student-percentages", "csv", new Date())

        return {
          bytes: buildStudentPercentageCsvBuffer(rows),
          fileName,
          objectKey: `exports/${jobId}/${fileName}`,
          mimeType: "text/csv",
        }
      }
      case "COMPREHENSIVE_CSV": {
        const data = await loadComprehensiveCsvData(this.prisma, request.filters)
        const fileName = buildExportFileName("comprehensive-attendance", "csv", new Date())

        return {
          bytes: buildComprehensiveCsvBuffer(data),
          fileName,
          objectKey: `exports/${jobId}/${fileName}`,
          mimeType: "text/csv",
        }
      }
    }
  }
}
