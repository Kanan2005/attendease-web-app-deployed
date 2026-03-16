import {
  buildOutboxEventData,
  createPrismaClient,
  developmentSeedIds,
  disconnectPrismaClient,
} from "@attendease/db"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  type TemporaryDatabase,
  createTemporaryDatabase,
  destroyTemporaryDatabase,
} from "../test-helpers.js"
import { AnalyticsRefreshProcessor } from "./analytics-refresh.processor.js"

describe("AnalyticsRefreshProcessor", () => {
  let database: TemporaryDatabase | null = null
  let prisma: ReturnType<typeof createPrismaClient> | null = null
  let processor: AnalyticsRefreshProcessor | null = null

  beforeAll(async () => {
    database = await createTemporaryDatabase("attendease_worker_analytics")
    prisma = createPrismaClient({
      databaseUrl: database.databaseUrl,
      singleton: false,
    })
    processor = new AnalyticsRefreshProcessor(getPrisma())
  })

  afterAll(async () => {
    if (prisma) {
      await disconnectPrismaClient(prisma)
    }

    if (database) {
      await destroyTemporaryDatabase(database)
    }
  })

  it("processes seeded refresh events and materializes analytics aggregates", async () => {
    await getProcessor().processPendingEvents(10)

    const [dailyRows, subjectRows, studentSummaries, modeRows, outboxEvent] = await Promise.all([
      getPrisma().analyticsDailyAttendance.findMany({
        where: {
          courseOfferingId: developmentSeedIds.courseOfferings.math,
        },
      }),
      getPrisma().analyticsSubjectAttendance.findMany({
        where: {
          semesterId: developmentSeedIds.academic.semester,
          classId: developmentSeedIds.academic.class,
          sectionId: developmentSeedIds.academic.section,
          subjectId: developmentSeedIds.academic.mathSubject,
        },
      }),
      getPrisma().analyticsStudentCourseSummary.findMany({
        where: {
          courseOfferingId: developmentSeedIds.courseOfferings.math,
        },
        orderBy: {
          studentId: "asc",
        },
      }),
      getPrisma().analyticsModeUsageDaily.findMany({
        where: {
          courseOfferingId: developmentSeedIds.courseOfferings.math,
        },
      }),
      getPrisma().outboxEvent.findUnique({
        where: {
          id: developmentSeedIds.outboxEvents.analyticsRefresh,
        },
      }),
    ])

    expect(dailyRows).toEqual([
      expect.objectContaining({
        attendanceDate: new Date("2026-03-10T00:00:00.000Z"),
        totalStudents: 4,
        presentCount: 3,
        absentCount: 1,
      }),
    ])
    expect(subjectRows).toEqual([
      expect.objectContaining({
        snapshotDate: new Date("2026-03-10T00:00:00.000Z"),
        totalSessions: 1,
        presentCount: 3,
        absentCount: 1,
      }),
    ])
    expect(studentSummaries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          studentId: developmentSeedIds.users.studentOne,
          totalSessions: 1,
          presentSessions: 1,
          absentSessions: 0,
        }),
        expect.objectContaining({
          studentId: developmentSeedIds.users.studentFour,
          totalSessions: 1,
          presentSessions: 0,
          absentSessions: 1,
        }),
      ]),
    )
    expect(modeRows).toEqual([
      expect.objectContaining({
        usageDate: new Date("2026-03-10T00:00:00.000Z"),
        mode: "QR_GPS",
        sessionCount: 1,
        markedCount: 3,
      }),
    ])
    expect(outboxEvent?.status).toBe("PROCESSED")
  })

  it("refreshes course summaries after a manual attendance edit event", async () => {
    await getPrisma().attendanceRecord.update({
      where: {
        id: developmentSeedIds.attendanceRecords.studentFour,
      },
      data: {
        status: "PRESENT",
        markSource: "MANUAL",
        markedAt: new Date("2026-03-10T04:00:00.000Z"),
      },
    })
    await getPrisma().attendanceSession.update({
      where: {
        id: developmentSeedIds.sessions.mathCompleted,
      },
      data: {
        presentCount: 4,
        absentCount: 0,
      },
    })
    await getPrisma().outboxEvent.create({
      data: buildOutboxEventData({
        topic: "attendance.session.edited",
        aggregateType: "attendance_session",
        aggregateId: developmentSeedIds.sessions.mathCompleted,
        payload: {
          sessionId: developmentSeedIds.sessions.mathCompleted,
        },
      }),
    })

    await getProcessor().processPendingEvents(10)

    const [dailyRow, studentSummary, outboxEvent] = await Promise.all([
      getPrisma().analyticsDailyAttendance.findUnique({
        where: {
          courseOfferingId_attendanceDate: {
            courseOfferingId: developmentSeedIds.courseOfferings.math,
            attendanceDate: new Date("2026-03-10T00:00:00.000Z"),
          },
        },
      }),
      getPrisma().analyticsStudentCourseSummary.findUnique({
        where: {
          courseOfferingId_studentId: {
            courseOfferingId: developmentSeedIds.courseOfferings.math,
            studentId: developmentSeedIds.users.studentFour,
          },
        },
      }),
      getPrisma().outboxEvent.findFirst({
        where: {
          topic: "attendance.session.edited",
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ])

    expect(dailyRow).toMatchObject({
      presentCount: 4,
      absentCount: 0,
    })
    expect(studentSummary).toMatchObject({
      totalSessions: 1,
      presentSessions: 1,
      absentSessions: 0,
    })
    expect(outboxEvent?.status).toBe("PROCESSED")
  })

  it("processes ended-session events without requiring courseOfferingId in the payload", async () => {
    const bluetoothSessionId = "seed_attendance_session_math_bluetooth_worker"

    await getPrisma().attendanceSession.create({
      data: {
        id: bluetoothSessionId,
        courseOfferingId: developmentSeedIds.courseOfferings.math,
        lectureId: developmentSeedIds.lectures.mathCompleted,
        teacherAssignmentId: developmentSeedIds.teacherAssignments.math,
        teacherId: developmentSeedIds.users.teacher,
        semesterId: developmentSeedIds.academic.semester,
        classId: developmentSeedIds.academic.class,
        sectionId: developmentSeedIds.academic.section,
        subjectId: developmentSeedIds.academic.mathSubject,
        mode: "BLUETOOTH",
        status: "ENDED",
        startedAt: new Date("2026-03-12T03:30:00.000Z"),
        scheduledEndAt: new Date("2026-03-12T03:45:00.000Z"),
        endedAt: new Date("2026-03-12T03:45:00.000Z"),
        editableUntil: new Date("2026-03-13T03:45:00.000Z"),
        rosterSnapshotCount: 4,
        presentCount: 2,
        absentCount: 2,
        bleSeed: "worker-test-ble-seed",
        blePublicId: "workerble01",
        bleProtocolVersion: 1,
        bluetoothRotationWindowSeconds: 10,
      },
    })

    await getPrisma().attendanceRecord.createMany({
      data: [
        {
          id: "seed_attendance_record_math_worker_student_one",
          sessionId: bluetoothSessionId,
          enrollmentId: developmentSeedIds.enrollments.math.studentOne,
          studentId: developmentSeedIds.users.studentOne,
          status: "PRESENT",
          markSource: "BLUETOOTH",
          markedAt: new Date("2026-03-12T03:35:00.000Z"),
        },
        {
          id: "seed_attendance_record_math_worker_student_two",
          sessionId: bluetoothSessionId,
          enrollmentId: developmentSeedIds.enrollments.math.studentTwo,
          studentId: developmentSeedIds.users.studentTwo,
          status: "PRESENT",
          markSource: "BLUETOOTH",
          markedAt: new Date("2026-03-12T03:36:00.000Z"),
        },
        {
          id: "seed_attendance_record_math_worker_student_three",
          sessionId: bluetoothSessionId,
          enrollmentId: developmentSeedIds.enrollments.math.studentThree,
          studentId: developmentSeedIds.users.studentThree,
          status: "ABSENT",
        },
        {
          id: "seed_attendance_record_math_worker_student_four",
          sessionId: bluetoothSessionId,
          enrollmentId: developmentSeedIds.enrollments.math.studentFour,
          studentId: developmentSeedIds.users.studentFour,
          status: "ABSENT",
        },
      ],
    })

    await getPrisma().outboxEvent.create({
      data: buildOutboxEventData({
        topic: "attendance.session.ended",
        aggregateType: "attendance_session",
        aggregateId: bluetoothSessionId,
        payload: {
          sessionId: bluetoothSessionId,
        },
      }),
    })

    await getProcessor().processPendingEvents(10)

    const [dailyRows, modeRows] = await Promise.all([
      getPrisma().analyticsDailyAttendance.findMany({
        where: {
          courseOfferingId: developmentSeedIds.courseOfferings.math,
        },
        orderBy: {
          attendanceDate: "asc",
        },
      }),
      getPrisma().analyticsModeUsageDaily.findMany({
        where: {
          courseOfferingId: developmentSeedIds.courseOfferings.math,
        },
        orderBy: [{ usageDate: "asc" }, { mode: "asc" }],
      }),
    ])

    expect(dailyRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          attendanceDate: new Date("2026-03-12T00:00:00.000Z"),
          presentCount: 2,
          absentCount: 2,
        }),
      ]),
    )
    expect(modeRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          usageDate: new Date("2026-03-12T00:00:00.000Z"),
          mode: "BLUETOOTH",
          sessionCount: 1,
          markedCount: 2,
        }),
      ]),
    )
  })

  it("reclaims stale processing analytics refresh events", async () => {
    const outboxEvent = await getPrisma().outboxEvent.create({
      data: buildOutboxEventData({
        topic: "analytics.attendance.refresh",
        aggregateType: "course_offering",
        aggregateId: developmentSeedIds.courseOfferings.math,
        payload: {
          courseOfferingId: developmentSeedIds.courseOfferings.math,
        },
        status: "PROCESSING",
        lockedAt: new Date("2026-03-15T08:00:00.000Z"),
      }),
    })

    const processedCount = await getProcessor().processPendingEvents(
      10,
      new Date("2026-03-15T12:00:00.000Z"),
    )
    const processedEvent = await getPrisma().outboxEvent.findUniqueOrThrow({
      where: {
        id: outboxEvent.id,
      },
    })

    expect(processedCount).toBe(1)
    expect(processedEvent.status).toBe("PROCESSED")
  })

  function getPrisma() {
    if (!prisma) {
      throw new Error("Prisma client is not initialized.")
    }

    return prisma
  }

  function getProcessor() {
    if (!processor) {
      throw new Error("Analytics processor is not initialized.")
    }

    return processor
  }
})
