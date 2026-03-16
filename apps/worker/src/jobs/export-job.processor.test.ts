import { createPrismaClient, developmentSeedIds, disconnectPrismaClient } from "@attendease/db"
import type { ExportStorageAdapter } from "@attendease/export"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  type TemporaryDatabase,
  createTemporaryDatabase,
  destroyTemporaryDatabase,
} from "../test-helpers.js"
import { ExportJobProcessor } from "./export-job.processor.js"

type ExportJobType = "SESSION_PDF" | "SESSION_CSV" | "STUDENT_PERCENT_CSV" | "COMPREHENSIVE_CSV"

class MemoryExportStorageAdapter implements ExportStorageAdapter {
  readonly objects = new Map<string, { body: Uint8Array; contentType: string }>()

  async uploadObject(input: {
    objectKey: string
    body: Uint8Array
    contentType: string
  }): Promise<void> {
    this.objects.set(input.objectKey, {
      body: input.body,
      contentType: input.contentType,
    })
  }

  async getDownloadUrl(input: { objectKey: string; expiresInSeconds: number }): Promise<string> {
    return `memory://${input.objectKey}?ttl=${input.expiresInSeconds}`
  }
}

describe("ExportJobProcessor", () => {
  let database: TemporaryDatabase | null = null
  let prisma: ReturnType<typeof createPrismaClient> | null = null
  let storage: MemoryExportStorageAdapter | null = null
  let processor: ExportJobProcessor | null = null

  beforeAll(async () => {
    database = await createTemporaryDatabase("attendease_worker_export_jobs")
    prisma = createPrismaClient({
      databaseUrl: database.databaseUrl,
      singleton: false,
    })
    storage = new MemoryExportStorageAdapter()
    processor = new ExportJobProcessor(getPrisma(), storage, 72)
  })

  afterAll(async () => {
    if (prisma) {
      await disconnectPrismaClient(prisma)
    }

    if (database) {
      await destroyTemporaryDatabase(database)
    }
  })

  it("completes session CSV exports using final attendance truth", async () => {
    const jobId = await createJob("SESSION_CSV", {
      sessionId: developmentSeedIds.sessions.mathCompleted,
    })

    await getProcessor().processJob(jobId)

    const job = await getPrisma().exportJob.findUniqueOrThrow({
      where: {
        id: jobId,
      },
      include: {
        files: true,
      },
    })

    expect(job.status).toBe("COMPLETED")
    expect(job.files[0]?.status).toBe("READY")
    expect(job.files[0]?.fileName).toMatch(
      /^session-seed_attendance_session_math_completed-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z\.csv$/,
    )
    expect(job.files[0]?.objectKey).toMatch(
      new RegExp(`^exports/${jobId}/session-seed_attendance_session_math_completed-.*\\.csv$`),
    )
    expect(job.files[0]?.sizeBytes).toBeGreaterThan(0)
    expect(job.files[0]?.checksumSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(job.files[0]?.readyAt).not.toBeNull()
    expect(job.files[0]?.expiresAt).not.toBeNull()
    expect(job.files[0]?.expiresAt?.getTime()).toBeGreaterThan(
      job.files[0]?.readyAt?.getTime() ?? 0,
    )

    const object = getStoredObject(job.files[0]?.objectKey)
    const csv = Buffer.from(object.body).toString("utf8")

    expect(object.contentType).toBe("text/csv")
    expect(csv).toContain("session_id,classroom_code,classroom_title")
    expect(csv).toContain("student.three@attendease.dev,Kabir Singh,CSE2303,PRESENT")
  })

  it("completes session PDF exports", async () => {
    const jobId = await createJob("SESSION_PDF", {
      sessionId: developmentSeedIds.sessions.mathCompleted,
    })

    await getProcessor().processJob(jobId)

    const job = await getPrisma().exportJob.findUniqueOrThrow({
      where: {
        id: jobId,
      },
      include: {
        files: true,
      },
    })

    const object = getStoredObject(job.files[0]?.objectKey)

    expect(job.status).toBe("COMPLETED")
    expect(object.contentType).toBe("application/pdf")
    expect(Buffer.from(object.body).subarray(0, 4).toString("utf8")).toBe("%PDF")
  })

  it("completes student percentage CSV exports", async () => {
    const jobId = await createJob("STUDENT_PERCENT_CSV", {
      filters: {
        classroomId: developmentSeedIds.courseOfferings.math,
      },
    })

    await getProcessor().processJob(jobId)

    const job = await getPrisma().exportJob.findUniqueOrThrow({
      where: {
        id: jobId,
      },
      include: {
        files: true,
      },
    })

    const csv = Buffer.from(getStoredObject(job.files[0]?.objectKey).body).toString("utf8")

    expect(job.status).toBe("COMPLETED")
    expect(csv).toContain("attendance_percentage")
    expect(csv).toContain("student.three@attendease.dev,Kabir Singh,CSE2303,1,1,0,100")
    expect(csv).toContain("student.four@attendease.dev,Meera Patel,CSE2304,1,0,1,0")
  })

  it("completes comprehensive CSV exports with session matrix columns", async () => {
    const jobId = await createJob("COMPREHENSIVE_CSV", {
      filters: {
        classroomId: developmentSeedIds.courseOfferings.math,
      },
    })

    await getProcessor().processJob(jobId)

    const job = await getPrisma().exportJob.findUniqueOrThrow({
      where: {
        id: jobId,
      },
      include: {
        files: true,
      },
    })

    const csv = Buffer.from(getStoredObject(job.files[0]?.objectKey).body).toString("utf8")

    expect(job.status).toBe("COMPLETED")
    expect(csv.split("\n")[0]).toContain(
      "student_email,student_display_name,student_roll_number,total_sessions,present_sessions,absent_sessions,attendance_percentage,subject_breakdown",
    )
    expect(csv).toContain("subject_breakdown")
    expect(csv).toContain("MATH101 2026-03-10")
    expect(csv).toContain("student.one@attendease.dev")
    expect(csv).toContain("MATH101 Mathematics: 1/1 (100%)")
  })

  it("marks export jobs failed when the requested session does not exist", async () => {
    const jobId = await createJob("SESSION_CSV", {
      sessionId: "missing-session-id",
    })

    await expect(getProcessor().processJob(jobId)).rejects.toThrow(
      "Export session could not be found.",
    )

    const job = await getPrisma().exportJob.findUniqueOrThrow({
      where: {
        id: jobId,
      },
      include: {
        files: true,
      },
    })

    expect(job.status).toBe("FAILED")
    expect(job.errorMessage).toContain("Export session could not be found.")
    expect(job.files).toHaveLength(0)
  })

  it("reclaims stale processing export jobs during queued scans", async () => {
    const jobId = await createJob(
      "SESSION_CSV",
      {
        sessionId: developmentSeedIds.sessions.mathCompleted,
      },
      {
        status: "PROCESSING",
        startedAt: new Date("2026-03-15T08:00:00.000Z"),
      },
    )

    const processedCount = await getProcessor().processQueuedJobs(
      10,
      new Date("2026-03-15T12:00:00.000Z"),
    )
    const job = await getPrisma().exportJob.findUniqueOrThrow({
      where: {
        id: jobId,
      },
      include: {
        files: true,
      },
    })

    expect(processedCount).toBe(1)
    expect(job.status).toBe("COMPLETED")
    expect(job.files[0]?.status).toBe("READY")
  })

  function getPrisma(): ReturnType<typeof createPrismaClient> {
    if (!prisma) {
      throw new Error("Prisma client is not initialized.")
    }

    return prisma
  }

  function getProcessor(): ExportJobProcessor {
    if (!processor) {
      throw new Error("Export processor is not initialized.")
    }

    return processor
  }

  function getStoredObject(objectKey: string | undefined) {
    if (!objectKey || !storage) {
      throw new Error("Expected an uploaded export object.")
    }

    const object = storage.objects.get(objectKey)

    if (!object) {
      throw new Error(`Missing uploaded object for ${objectKey}.`)
    }

    return object
  }

  async function createJob(
    jobType: ExportJobType,
    input: {
      sessionId?: string
      filters?: {
        classroomId?: string
        classId?: string
        sectionId?: string
        subjectId?: string
        from?: string
        to?: string
      }
    },
    options?: {
      status?: "QUEUED" | "PROCESSING"
      startedAt?: Date
    },
  ) {
    const created = await getPrisma().exportJob.create({
      data: {
        requestedByUserId: developmentSeedIds.users.teacher,
        courseOfferingId: input.filters?.classroomId ?? developmentSeedIds.courseOfferings.math,
        jobType,
        ...(options?.status ? { status: options.status } : {}),
        ...(options?.startedAt ? { startedAt: options.startedAt } : {}),
        filterSnapshot: {
          jobType,
          ...(input.sessionId ? { sessionId: input.sessionId } : {}),
          ...(input.filters ? { filters: input.filters } : {}),
        },
      },
    })

    return created.id
  }
})
