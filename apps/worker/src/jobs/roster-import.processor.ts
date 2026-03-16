import type { createPrismaClient } from "@attendease/db"

type WorkerPrismaClient = ReturnType<typeof createPrismaClient>

export class RosterImportProcessor {
  constructor(
    private readonly prisma: WorkerPrismaClient,
    private readonly options: {
      stuckProcessingTimeoutMs?: number
    } = {},
  ) {}

  async processPendingJobs(limit = 10, now = new Date()): Promise<number> {
    const staleProcessingCutoff = new Date(
      now.getTime() - (this.options.stuckProcessingTimeoutMs ?? 15 * 60 * 1000),
    )
    const jobs = await this.prisma.rosterImportJob.findMany({
      where: {
        OR: [
          {
            status: "UPLOADED",
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
        createdAt: "asc",
      },
      take: limit,
    })

    for (const job of jobs) {
      await this.processJob(job.id)
    }

    return jobs.length
  }

  async processJob(jobId: string) {
    const job = await this.prisma.rosterImportJob.findUnique({
      where: {
        id: jobId,
      },
      include: {
        rows: {
          orderBy: {
            rowNumber: "asc",
          },
        },
      },
    })

    if (!job || (job.status !== "UPLOADED" && job.status !== "PROCESSING")) {
      return null
    }

    await this.prisma.rosterImportJob.update({
      where: {
        id: job.id,
      },
      data: {
        status: "PROCESSING",
        startedAt: new Date(),
      },
    })

    try {
      const seenStudentIds = new Set<string>()
      let validRows = 0
      let invalidRows = 0
      let skippedRows = 0

      for (const row of job.rows) {
        const normalizedEmail = row.studentEmail?.trim().toLowerCase() ?? null
        const normalizedRollNumber = row.studentRollNumber?.trim() ?? null

        if (!normalizedEmail && !normalizedRollNumber) {
          invalidRows += 1
          await this.markRow(row.id, "INVALID", "Student email or roll number is required.")
          continue
        }

        const student = await this.prisma.user.findFirst({
          where: {
            ...(normalizedEmail ? { email: normalizedEmail } : {}),
            ...(normalizedRollNumber
              ? {
                  studentProfile: {
                    is: {
                      rollNumber: normalizedRollNumber,
                    },
                  },
                }
              : {}),
            roles: {
              some: {
                role: "STUDENT",
              },
            },
          },
          select: {
            id: true,
            status: true,
          },
        })

        if (!student) {
          invalidRows += 1
          await this.markRow(
            row.id,
            "INVALID",
            "Student could not be resolved from the provided identifiers.",
          )
          continue
        }

        if (student.status === "BLOCKED" || student.status === "ARCHIVED") {
          invalidRows += 1
          await this.markRow(
            row.id,
            "INVALID",
            "Blocked or archived student accounts cannot be imported.",
          )
          continue
        }

        if (seenStudentIds.has(student.id)) {
          invalidRows += 1
          await this.markRow(row.id, "INVALID", "Duplicate student entry detected in this import.")
          continue
        }

        const existingEnrollment = await this.prisma.enrollment.findUnique({
          where: {
            studentId_courseOfferingId: {
              studentId: student.id,
              courseOfferingId: job.courseOfferingId,
            },
          },
          select: {
            status: true,
          },
        })

        if (existingEnrollment?.status === "ACTIVE") {
          skippedRows += 1
          await this.markRow(
            row.id,
            "SKIPPED",
            "Student is already an active classroom member.",
            student.id,
          )
          seenStudentIds.add(student.id)
          continue
        }

        if (existingEnrollment?.status === "BLOCKED") {
          invalidRows += 1
          await this.markRow(
            row.id,
            "INVALID",
            "Blocked memberships require a manual roster update.",
            student.id,
          )
          seenStudentIds.add(student.id)
          continue
        }

        validRows += 1
        seenStudentIds.add(student.id)
        await this.markRow(row.id, "VALID", null, student.id)
      }

      await this.prisma.rosterImportJob.update({
        where: {
          id: job.id,
        },
        data: {
          status: validRows === 0 && invalidRows === 0 ? "APPLIED" : "REVIEW_REQUIRED",
          totalRows: job.rows.length,
          validRows,
          invalidRows,
          appliedRows: 0,
          completedAt: new Date(),
          ...(skippedRows > 0 ? { reviewedAt: new Date() } : {}),
        },
      })

      return this.prisma.rosterImportJob.findUnique({
        where: {
          id: job.id,
        },
        include: {
          rows: {
            orderBy: {
              rowNumber: "asc",
            },
          },
        },
      })
    } catch (error) {
      await this.prisma.rosterImportJob.update({
        where: {
          id: job.id,
        },
        data: {
          status: "FAILED",
          completedAt: new Date(),
        },
      })

      throw error
    }
  }

  private async markRow(
    rowId: string,
    status: "VALID" | "INVALID" | "SKIPPED",
    errorMessage: string | null,
    resolvedStudentId?: string,
  ) {
    await this.prisma.rosterImportRow.update({
      where: {
        id: rowId,
      },
      data: {
        status,
        errorMessage,
        ...(resolvedStudentId ? { resolvedStudentId } : {}),
      },
    })
  }
}
