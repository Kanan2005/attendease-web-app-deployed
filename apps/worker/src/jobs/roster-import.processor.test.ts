import { createPrismaClient, developmentSeedIds, disconnectPrismaClient } from "@attendease/db"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  type TemporaryDatabase,
  createTemporaryDatabase,
  destroyTemporaryDatabase,
} from "../test-helpers.js"
import { RosterImportProcessor } from "./roster-import.processor.js"

describe("RosterImportProcessor", () => {
  let database: TemporaryDatabase | null = null
  let prisma: ReturnType<typeof createPrismaClient> | null = null

  beforeAll(async () => {
    database = await createTemporaryDatabase("attendease_worker_roster_import")
    prisma = createPrismaClient({
      databaseUrl: database.databaseUrl,
      singleton: false,
    })
  })

  afterAll(async () => {
    if (prisma) {
      await disconnectPrismaClient(prisma)
    }

    if (database) {
      await destroyTemporaryDatabase(database)
    }
  })

  it("validates pending roster import rows and tracks valid, invalid, and skipped results", async () => {
    const processor = new RosterImportProcessor(getPrisma())

    const job = await getPrisma().rosterImportJob.create({
      data: {
        courseOfferingId: developmentSeedIds.courseOfferings.physics,
        requestedByUserId: developmentSeedIds.users.teacher,
        sourceFileKey: "inline://roster-imports/physics.csv",
        sourceFileName: "physics.csv",
        totalRows: 3,
        rows: {
          create: [
            {
              rowNumber: 1,
              studentEmail: "student.three@attendease.dev",
              parsedName: "Student Three",
            },
            {
              rowNumber: 2,
              studentEmail: "missing@attendease.dev",
              parsedName: "Missing Student",
            },
            {
              rowNumber: 3,
              studentEmail: "student.one@attendease.dev",
              parsedName: "Student One",
            },
          ],
        },
      },
      include: {
        rows: {
          orderBy: {
            rowNumber: "asc",
          },
        },
      },
    })

    await processor.processJob(job.id)

    const processedJob = await getPrisma().rosterImportJob.findUniqueOrThrow({
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

    expect(processedJob.status).toBe("REVIEW_REQUIRED")
    expect(processedJob.validRows).toBe(1)
    expect(processedJob.invalidRows).toBe(1)
    expect(processedJob.appliedRows).toBe(0)
    expect(processedJob.rows[0]?.status).toBe("VALID")
    expect(processedJob.rows[0]?.resolvedStudentId).toBe(developmentSeedIds.users.studentThree)
    expect(processedJob.rows[1]?.status).toBe("INVALID")
    expect(processedJob.rows[2]?.status).toBe("SKIPPED")
  })

  it("processes only uploaded jobs and flags duplicate import rows for review", async () => {
    const processor = new RosterImportProcessor(getPrisma())

    const uploadedJob = await getPrisma().rosterImportJob.create({
      data: {
        courseOfferingId: developmentSeedIds.courseOfferings.physics,
        requestedByUserId: developmentSeedIds.users.teacher,
        sourceFileKey: "inline://roster-imports/physics-duplicates.csv",
        sourceFileName: "physics-duplicates.csv",
        totalRows: 3,
        rows: {
          create: [
            {
              rowNumber: 1,
              studentEmail: "student.three@attendease.dev",
              parsedName: "Student Three",
            },
            {
              rowNumber: 2,
              studentRollNumber: "CSE2303",
              parsedName: "Student Three Duplicate",
            },
            {
              rowNumber: 3,
              studentEmail: "student.one@attendease.dev",
              parsedName: "Student One Active",
            },
          ],
        },
      },
    })

    await getPrisma().rosterImportJob.create({
      data: {
        courseOfferingId: developmentSeedIds.courseOfferings.physics,
        requestedByUserId: developmentSeedIds.users.teacher,
        sourceFileKey: "inline://roster-imports/already-reviewed.csv",
        sourceFileName: "already-reviewed.csv",
        totalRows: 1,
        status: "REVIEW_REQUIRED",
      },
    })

    const processedCount = await processor.processPendingJobs(10)
    expect(processedCount).toBe(1)

    const processedJob = await getPrisma().rosterImportJob.findUniqueOrThrow({
      where: {
        id: uploadedJob.id,
      },
      include: {
        rows: {
          orderBy: {
            rowNumber: "asc",
          },
        },
      },
    })

    expect(processedJob.status).toBe("REVIEW_REQUIRED")
    expect(processedJob.validRows).toBe(1)
    expect(processedJob.invalidRows).toBe(1)
    expect(processedJob.rows[0]?.status).toBe("VALID")
    expect(processedJob.rows[0]?.resolvedStudentId).toBe(developmentSeedIds.users.studentThree)
    expect(processedJob.rows[1]?.status).toBe("INVALID")
    expect(processedJob.rows[1]?.errorMessage).toContain("Duplicate student entry")
    expect(processedJob.rows[2]?.status).toBe("SKIPPED")
  })

  it("reclaims stale processing roster-import jobs", async () => {
    const processor = new RosterImportProcessor(getPrisma())

    const job = await getPrisma().rosterImportJob.create({
      data: {
        courseOfferingId: developmentSeedIds.courseOfferings.physics,
        requestedByUserId: developmentSeedIds.users.teacher,
        sourceFileKey: "inline://roster-imports/stale.csv",
        sourceFileName: "stale.csv",
        status: "PROCESSING",
        startedAt: new Date("2026-03-15T08:00:00.000Z"),
        totalRows: 1,
        rows: {
          create: [
            {
              rowNumber: 1,
              studentEmail: "student.three@attendease.dev",
              parsedName: "Student Three",
            },
          ],
        },
      },
    })

    const processedCount = await processor.processPendingJobs(
      10,
      new Date("2026-03-15T12:00:00.000Z"),
    )
    const processedJob = await getPrisma().rosterImportJob.findUniqueOrThrow({
      where: {
        id: job.id,
      },
    })

    expect(processedCount).toBe(1)
    expect(processedJob.status).toBe("REVIEW_REQUIRED")
    expect(processedJob.validRows).toBe(1)
  })

  function getPrisma(): ReturnType<typeof createPrismaClient> {
    if (!prisma) {
      throw new Error("Prisma test client is not initialized.")
    }

    return prisma
  }
})
