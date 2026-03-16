import {
  authSessionResponseSchema,
  classroomDetailSchema,
  classroomScheduleSchema,
  classroomsResponseSchema,
  lectureSummarySchema,
  lecturesResponseSchema,
  scheduleExceptionSummarySchema,
  scheduleSlotSummarySchema,
  semesterSummarySchema,
  semestersResponseSchema,
} from "@attendease/contracts"
import { createPrismaClient, developmentSeedIds, disconnectPrismaClient } from "@attendease/db"
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify"
import { Test } from "@nestjs/testing"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import { AppModule } from "../../app.module.js"
import {
  type TemporaryDatabase,
  authIntegrationFixtures,
  createTemporaryDatabase,
  destroyTemporaryDatabase,
  seedAuthIntegrationData,
} from "../../test/integration-helpers.js"
import { GoogleOidcService } from "../auth/google-oidc.service.js"

describe("Academic management integration", () => {
  const originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
    AUTH_ACCESS_TOKEN_SECRET: process.env.AUTH_ACCESS_TOKEN_SECRET,
    AUTH_ISSUER: process.env.AUTH_ISSUER,
    AUTH_AUDIENCE: process.env.AUTH_AUDIENCE,
    GOOGLE_OIDC_CLIENT_ID: process.env.GOOGLE_OIDC_CLIENT_ID,
    GOOGLE_OIDC_CLIENT_SECRET: process.env.GOOGLE_OIDC_CLIENT_SECRET,
    GOOGLE_OIDC_REDIRECT_URI: process.env.GOOGLE_OIDC_REDIRECT_URI,
    GOOGLE_TEACHER_ALLOWED_DOMAINS: process.env.GOOGLE_TEACHER_ALLOWED_DOMAINS,
    GOOGLE_STUDENT_ALLOWED_DOMAINS: process.env.GOOGLE_STUDENT_ALLOWED_DOMAINS,
  }

  let database: TemporaryDatabase | null = null
  let prisma: ReturnType<typeof createPrismaClient> | null = null
  let app: NestFastifyApplication | null = null

  const googleOidcService = {
    verifyExchange: vi.fn(),
  }

  beforeAll(async () => {
    database = await createTemporaryDatabase("attendease_academic_management")
    await seedAuthIntegrationData(database.databaseUrl)

    process.env.NODE_ENV = "test"
    process.env.TEST_DATABASE_URL = database.databaseUrl
    process.env.AUTH_ACCESS_TOKEN_SECRET = "attendease-academic-management-secret-1234567890"
    process.env.AUTH_ISSUER = "attendease-api-test"
    process.env.AUTH_AUDIENCE = "attendease-client-test"
    process.env.GOOGLE_OIDC_CLIENT_ID = "academic-management-google-client"
    process.env.GOOGLE_OIDC_CLIENT_SECRET = "academic-management-google-secret"
    process.env.GOOGLE_OIDC_REDIRECT_URI = "http://localhost:3000/auth/google/callback"
    process.env.GOOGLE_TEACHER_ALLOWED_DOMAINS = "attendease.dev"
    process.env.GOOGLE_STUDENT_ALLOWED_DOMAINS = "attendease.dev"

    prisma = createPrismaClient({
      databaseUrl: database.databaseUrl,
      singleton: false,
    })

    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GoogleOidcService)
      .useValue(googleOidcService)
      .compile()

    app = testingModule.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    await app.init()
    await app.getHttpAdapter().getInstance().ready()
  })

  afterAll(async () => {
    if (app) {
      await app.close()
    }

    if (prisma) {
      await disconnectPrismaClient(prisma)
    }

    process.env.NODE_ENV = originalEnv.NODE_ENV
    process.env.TEST_DATABASE_URL = originalEnv.TEST_DATABASE_URL
    process.env.AUTH_ACCESS_TOKEN_SECRET = originalEnv.AUTH_ACCESS_TOKEN_SECRET
    process.env.AUTH_ISSUER = originalEnv.AUTH_ISSUER
    process.env.AUTH_AUDIENCE = originalEnv.AUTH_AUDIENCE
    process.env.GOOGLE_OIDC_CLIENT_ID = originalEnv.GOOGLE_OIDC_CLIENT_ID
    process.env.GOOGLE_OIDC_CLIENT_SECRET = originalEnv.GOOGLE_OIDC_CLIENT_SECRET
    process.env.GOOGLE_OIDC_REDIRECT_URI = originalEnv.GOOGLE_OIDC_REDIRECT_URI
    process.env.GOOGLE_TEACHER_ALLOWED_DOMAINS = originalEnv.GOOGLE_TEACHER_ALLOWED_DOMAINS
    process.env.GOOGLE_STUDENT_ALLOWED_DOMAINS = originalEnv.GOOGLE_STUDENT_ALLOWED_DOMAINS

    if (database) {
      await destroyTemporaryDatabase(database)
    }
  })

  it("lets admins create, update, activate, and archive semesters", async () => {
    const adminSession = await login({
      email: authIntegrationFixtures.admin.email,
      password: authIntegrationFixtures.admin.password,
      platform: "WEB",
      requestedRole: "ADMIN",
    })

    const academicTerm = await getPrisma().academicTerm.create({
      data: {
        code: "AY2027-2028",
        title: "Academic Year 2027-2028",
        academicYearLabel: "2027-2028",
        status: "ACTIVE",
        startDate: new Date("2027-01-01"),
        endDate: new Date("2027-12-31"),
      },
    })

    const createResponse = await request("POST", "/admin/semesters", {
      token: adminSession.tokens.accessToken,
      payload: {
        academicTermId: academicTerm.id,
        code: "SEM7-2027",
        title: "Semester 7",
        ordinal: 7,
        startDate: "2027-07-01T00:00:00.000Z",
        endDate: "2027-12-20T00:00:00.000Z",
        attendanceCutoffDate: "2027-12-10T00:00:00.000Z",
      },
    })

    expect(createResponse.statusCode).toBe(201)
    const created = semesterSummarySchema.parse(createResponse.body)
    expect(created.status).toBe("DRAFT")

    const updateResponse = await request("PATCH", `/admin/semesters/${created.id}`, {
      token: adminSession.tokens.accessToken,
      payload: {
        title: "Semester 7 Updated",
      },
    })

    expect(updateResponse.statusCode).toBe(200)
    expect(semesterSummarySchema.parse(updateResponse.body).title).toBe("Semester 7 Updated")

    const activateResponse = await request("POST", `/admin/semesters/${created.id}/activate`, {
      token: adminSession.tokens.accessToken,
    })

    expect(activateResponse.statusCode).toBe(201)
    expect(semesterSummarySchema.parse(activateResponse.body).status).toBe("ACTIVE")

    const listResponse = await request(
      "GET",
      `/admin/semesters?academicTermId=${academicTerm.id}`,
      {
        token: adminSession.tokens.accessToken,
      },
    )

    expect(listResponse.statusCode).toBe(200)
    expect(
      semestersResponseSchema
        .parse(listResponse.body)
        .some((semester) => semester.id === created.id),
    ).toBe(true)

    const archiveResponse = await request("POST", `/admin/semesters/${created.id}/archive`, {
      token: adminSession.tokens.accessToken,
    })

    expect(archiveResponse.statusCode).toBe(201)
    expect(semesterSummarySchema.parse(archiveResponse.body).status).toBe("ARCHIVED")

    const semesterAudit = await getPrisma().adminActionLog.findFirst({
      where: {
        adminUserId: authIntegrationFixtures.admin.userId,
        actionType: "SEMESTER_ARCHIVE",
      },
      orderBy: {
        createdAt: "desc",
      },
    })
    expect(semesterAudit?.metadata).toMatchObject({
      semesterId: created.id,
      previousStatus: "ACTIVE",
      nextStatus: "ARCHIVED",
    })
  })

  it("lets teachers create, update, and read classrooms plus lecture history inside assignment scope", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })

    const chemistrySubject = await getPrisma().subject.create({
      data: {
        code: "CHEM101",
        title: "Chemistry",
        status: "ACTIVE",
      },
    })
    await getPrisma().teacherAssignment.create({
      data: {
        teacherId: authIntegrationFixtures.teacher.userId,
        semesterId: developmentSeedIds.academic.semester,
        classId: developmentSeedIds.academic.class,
        sectionId: developmentSeedIds.academic.section,
        subjectId: chemistrySubject.id,
        status: "ACTIVE",
        canSelfCreateCourseOffering: true,
      },
    })

    const beforeOutboxCount = await getPrisma().outboxEvent.count({
      where: {
        topic: "classroom.created",
      },
    })

    const createResponse = await request("POST", "/classrooms", {
      token: teacherSession.tokens.accessToken,
      payload: {
        semesterId: developmentSeedIds.academic.semester,
        classId: developmentSeedIds.academic.class,
        sectionId: developmentSeedIds.academic.section,
        subjectId: chemistrySubject.id,
        courseCode: "CSE6-CHEM-A",
        classroomTitle: "Chemistry Classroom",
      },
    })

    expect(createResponse.statusCode).toBe(201)
    const created = classroomDetailSchema.parse(createResponse.body)
    expect(created.status).toBe("DRAFT")
    expect(created.courseCode).toBe("CSE6-CHEM-A")
    expect(created.classroomTitle).toBe("Chemistry Classroom")
    expect(created.subjectCode).toBe("CHEM101")
    expect(created.subjectTitle).toBe("Chemistry")
    expect(created.primaryTeacherDisplayName).toBe("Prof. Anurag Agarwal")
    expect(created.permissions).toEqual({
      canEdit: true,
      canArchive: true,
      canEditCourseInfo: true,
      canEditAcademicScope: false,
      canReassignTeacher: false,
    })
    expect(created.activeJoinCode?.status).toBe("ACTIVE")
    expect(created.activeJoinCode?.classroomId).toBe(created.id)
    expect(created.scheduleSlots).toHaveLength(0)

    const afterOutboxCount = await getPrisma().outboxEvent.count({
      where: {
        topic: "classroom.created",
      },
    })
    expect(afterOutboxCount).toBe(beforeOutboxCount + 1)

    const updateResponse = await request("PATCH", `/classrooms/${created.id}`, {
      token: teacherSession.tokens.accessToken,
      payload: {
        courseCode: "CSE6-CHEM-B",
        classroomTitle: "Chemistry Classroom Updated",
        status: "ACTIVE",
      },
    })

    expect(updateResponse.statusCode).toBe(200)
    const updated = classroomDetailSchema.parse(updateResponse.body)
    expect(updated.displayTitle).toBe("Chemistry Classroom Updated")
    expect(updated.courseCode).toBe("CSE6-CHEM-B")
    expect(updated.permissions?.canEditAcademicScope).toBe(false)

    const listResponse = await request("GET", "/classrooms", {
      token: teacherSession.tokens.accessToken,
    })

    expect(listResponse.statusCode).toBe(200)
    const classroomSummaries = classroomsResponseSchema.parse(listResponse.body)
    const listedClassroom = classroomSummaries.find((classroom) => classroom.id === created.id)
    expect(listedClassroom).toMatchObject({
      id: created.id,
      courseCode: "CSE6-CHEM-B",
      classroomTitle: "Chemistry Classroom Updated",
      subjectCode: "CHEM101",
    })
    expect(listedClassroom?.permissions?.canEditCourseInfo).toBe(true)

    const lectureCreateResponse = await request("POST", `/classrooms/${created.id}/lectures`, {
      token: teacherSession.tokens.accessToken,
      payload: {
        title: "Lecture 1",
        lectureDate: "2026-03-20T00:00:00.000Z",
        plannedStartAt: "2026-03-20T09:00:00.000Z",
        plannedEndAt: "2026-03-20T10:00:00.000Z",
      },
    })

    expect(lectureCreateResponse.statusCode).toBe(201)
    const lecture = lectureSummarySchema.parse(lectureCreateResponse.body)
    expect(lecture.title).toBe("Lecture 1")
    expect(lecture.classroomId).toBe(created.id)

    const lecturesResponse = await request("GET", `/classrooms/${created.id}/lectures`, {
      token: teacherSession.tokens.accessToken,
    })

    expect(lecturesResponse.statusCode).toBe(200)
    expect(
      lecturesResponseSchema.parse(lecturesResponse.body).some((row) => row.id === lecture.id),
    ).toBe(true)

    const archiveResponse = await request("POST", `/classrooms/${created.id}/archive`, {
      token: teacherSession.tokens.accessToken,
    })

    expect(archiveResponse.statusCode).toBe(201)
    const archived = classroomDetailSchema.parse(archiveResponse.body)
    expect(archived.status).toBe("ARCHIVED")
    expect(archived.activeJoinCode).toBeNull()
    expect(archived.permissions).toEqual({
      canEdit: false,
      canArchive: false,
      canEditCourseInfo: false,
      canEditAcademicScope: false,
      canReassignTeacher: false,
    })
  })

  it("supports recurring slots, date exceptions, save-and-notify, and lecture linkage", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })

    const schedulingSubject = await getPrisma().subject.create({
      data: {
        code: "STAT101",
        title: "Statistics",
        status: "ACTIVE",
      },
    })
    await getPrisma().teacherAssignment.create({
      data: {
        teacherId: authIntegrationFixtures.teacher.userId,
        semesterId: developmentSeedIds.academic.semester,
        classId: developmentSeedIds.academic.class,
        sectionId: developmentSeedIds.academic.section,
        subjectId: schedulingSubject.id,
        status: "ACTIVE",
        canSelfCreateCourseOffering: true,
      },
    })

    const classroomResponse = await request("POST", "/classrooms", {
      token: teacherSession.tokens.accessToken,
      payload: {
        semesterId: developmentSeedIds.academic.semester,
        classId: developmentSeedIds.academic.class,
        sectionId: developmentSeedIds.academic.section,
        subjectId: schedulingSubject.id,
        code: "CSE6-MATH-SCHED",
        displayTitle: "Maths Schedule Classroom",
      },
    })

    expect(classroomResponse.statusCode).toBe(201)
    const classroom = classroomDetailSchema.parse(classroomResponse.body)

    const weeklySlotResponse = await request(
      "POST",
      `/classrooms/${classroom.id}/schedule/weekly-slots`,
      {
        token: teacherSession.tokens.accessToken,
        payload: {
          weekday: 5,
          startMinutes: 540,
          endMinutes: 600,
          locationLabel: "Room 101",
        },
      },
    )

    expect(weeklySlotResponse.statusCode).toBe(201)
    const weeklySlot = scheduleSlotSummarySchema.parse(weeklySlotResponse.body)
    expect(weeklySlot.classroomId).toBe(classroom.id)

    const overlapResponse = await request(
      "POST",
      `/classrooms/${classroom.id}/schedule/weekly-slots`,
      {
        token: teacherSession.tokens.accessToken,
        payload: {
          weekday: 5,
          startMinutes: 570,
          endMinutes: 630,
          locationLabel: "Room 102",
        },
      },
    )

    expect(overlapResponse.statusCode).toBe(409)

    const rescheduleResponse = await request(
      "POST",
      `/classrooms/${classroom.id}/schedule/exceptions`,
      {
        token: teacherSession.tokens.accessToken,
        payload: {
          scheduleSlotId: weeklySlot.id,
          exceptionType: "RESCHEDULED",
          effectiveDate: "2026-05-14T00:00:00.000Z",
          startMinutes: 660,
          endMinutes: 720,
          locationLabel: "Lab 4",
          reason: "Room swap",
        },
      },
    )

    expect(rescheduleResponse.statusCode).toBe(201)
    const rescheduled = scheduleExceptionSummarySchema.parse(rescheduleResponse.body)
    expect(rescheduled.exceptionType).toBe("RESCHEDULED")
    expect(rescheduled.classroomId).toBe(classroom.id)

    const oneOffResponse = await request(
      "POST",
      `/classrooms/${classroom.id}/schedule/save-and-notify`,
      {
        token: teacherSession.tokens.accessToken,
        payload: {
          exceptionCreates: [
            {
              exceptionType: "ONE_OFF",
              effectiveDate: "2026-05-21T00:00:00.000Z",
              startMinutes: 840,
              endMinutes: 900,
              locationLabel: "Seminar Hall",
              reason: "Extra revision class",
            },
          ],
          note: "Schedule updated and ready for student notifications.",
        },
      },
    )

    expect(oneOffResponse.statusCode).toBe(201)
    const schedule = classroomScheduleSchema.parse(oneOffResponse.body)
    expect(schedule.scheduleSlots.some((slot) => slot.id === weeklySlot.id)).toBe(true)
    expect(schedule.scheduleExceptions.some((exception) => exception.id === rescheduled.id)).toBe(
      true,
    )
    expect(
      schedule.scheduleExceptions.some(
        (exception) =>
          exception.exceptionType === "ONE_OFF" && exception.reason === "Extra revision class",
      ),
    ).toBe(true)

    const linkedRescheduleLecture = await getPrisma().lecture.findFirst({
      where: {
        courseOfferingId: classroom.id,
        scheduleExceptionId: rescheduled.id,
      },
    })

    expect(linkedRescheduleLecture?.status).toBe("PLANNED")

    const changedOutboxEvent = await getPrisma().outboxEvent.findFirst({
      where: {
        aggregateId: classroom.id,
        topic: "schedule.changed",
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    expect(changedOutboxEvent).not.toBeNull()
    expect(changedOutboxEvent?.payload).toMatchObject({
      classroomId: classroom.id,
      note: "Schedule updated and ready for student notifications.",
    })
  })

  it("blocks teachers from self-creating classrooms when the assignment disallows it", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })

    const biologySubject = await getPrisma().subject.create({
      data: {
        code: "BIO101",
        title: "Biology",
        status: "ACTIVE",
      },
    })
    await getPrisma().teacherAssignment.create({
      data: {
        teacherId: authIntegrationFixtures.teacher.userId,
        semesterId: developmentSeedIds.academic.semester,
        classId: developmentSeedIds.academic.class,
        sectionId: developmentSeedIds.academic.section,
        subjectId: biologySubject.id,
        status: "ACTIVE",
        canSelfCreateCourseOffering: false,
      },
    })

    const createResponse = await request("POST", "/classrooms", {
      token: teacherSession.tokens.accessToken,
      payload: {
        semesterId: developmentSeedIds.academic.semester,
        classId: developmentSeedIds.academic.class,
        sectionId: developmentSeedIds.academic.section,
        subjectId: biologySubject.id,
        code: "CSE6-BIO-A",
        displayTitle: "Biology Classroom",
      },
    })

    expect(createResponse.statusCode).toBe(403)
  })

  it("lets admins create classrooms for teachers even when self-create is disabled", async () => {
    const adminSession = await login({
      email: authIntegrationFixtures.admin.email,
      password: authIntegrationFixtures.admin.password,
      platform: "WEB",
      requestedRole: "ADMIN",
    })

    const economicsSubject = await getPrisma().subject.create({
      data: {
        code: "ECO101",
        title: "Economics",
        status: "ACTIVE",
      },
    })
    await getPrisma().teacherAssignment.create({
      data: {
        teacherId: authIntegrationFixtures.teacher.userId,
        semesterId: developmentSeedIds.academic.semester,
        classId: developmentSeedIds.academic.class,
        sectionId: developmentSeedIds.academic.section,
        subjectId: economicsSubject.id,
        status: "ACTIVE",
        canSelfCreateCourseOffering: false,
      },
    })

    const createResponse = await request("POST", "/classrooms", {
      token: adminSession.tokens.accessToken,
      payload: {
        semesterId: developmentSeedIds.academic.semester,
        classId: developmentSeedIds.academic.class,
        sectionId: developmentSeedIds.academic.section,
        subjectId: economicsSubject.id,
        primaryTeacherId: authIntegrationFixtures.teacher.userId,
        courseCode: "CSE6-ECO-A",
        classroomTitle: "Economics Classroom",
      },
    })

    expect(createResponse.statusCode).toBe(201)
    const created = classroomDetailSchema.parse(createResponse.body)
    expect(created.primaryTeacherId).toBe(authIntegrationFixtures.teacher.userId)
    expect(created.permissions).toEqual({
      canEdit: true,
      canArchive: true,
      canEditCourseInfo: true,
      canEditAcademicScope: true,
      canReassignTeacher: true,
    })

    const updateResponse = await request("PATCH", `/classrooms/${created.id}`, {
      token: adminSession.tokens.accessToken,
      payload: {
        courseCode: "CSE6-ECO-B",
        classroomTitle: "Economics Classroom Updated",
      },
    })

    expect(updateResponse.statusCode).toBe(200)
    const updated = classroomDetailSchema.parse(updateResponse.body)
    expect(updated.courseCode).toBe("CSE6-ECO-B")
    expect(updated.classroomTitle).toBe("Economics Classroom Updated")
    expect(updated.permissions?.canEditAcademicScope).toBe(true)

    const archiveResponse = await request("POST", `/classrooms/${created.id}/archive`, {
      token: adminSession.tokens.accessToken,
    })
    expect(archiveResponse.statusCode).toBe(201)
    expect(classroomDetailSchema.parse(archiveResponse.body).status).toBe("ARCHIVED")

    const classroomAudit = await getPrisma().adminActionLog.findFirst({
      where: {
        adminUserId: authIntegrationFixtures.admin.userId,
        targetCourseOfferingId: created.id,
        actionType: "CLASSROOM_ARCHIVE",
      },
      orderBy: {
        createdAt: "desc",
      },
    })
    expect(classroomAudit?.metadata).toMatchObject({
      classroomId: created.id,
      previousStatus: "DRAFT",
      nextStatus: "ARCHIVED",
    })
  })

  it("blocks teachers from reading or editing classrooms outside their assignment scope", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })

    const foreignTeacher = await getPrisma().user.create({
      data: {
        email: "foreign.teacher@attendease.dev",
        displayName: "Prof. Foreign Teacher",
        status: "ACTIVE",
      },
    })
    await getPrisma().userRole.create({
      data: {
        userId: foreignTeacher.id,
        role: "TEACHER",
      },
    })

    const foreignSubject = await getPrisma().subject.create({
      data: {
        code: "FOREIGN101",
        title: "Foreign Scope Subject",
        status: "ACTIVE",
      },
    })

    const foreignClassroom = await getPrisma().courseOffering.create({
      data: {
        semesterId: developmentSeedIds.academic.semester,
        classId: developmentSeedIds.academic.class,
        sectionId: developmentSeedIds.academic.section,
        subjectId: foreignSubject.id,
        primaryTeacherId: foreignTeacher.id,
        createdByUserId: authIntegrationFixtures.admin.userId,
        code: "CSE6-FOREIGN-A",
        displayTitle: "Foreign Scope Classroom",
        status: "ACTIVE",
        defaultAttendanceMode: "QR_GPS",
        defaultGpsRadiusMeters: 100,
        defaultSessionDurationMinutes: 15,
        qrRotationWindowSeconds: 15,
        bluetoothRotationWindowSeconds: 10,
        timezone: "Asia/Kolkata",
        requiresTrustedDevice: true,
      },
    })

    const detailResponse = await request("GET", `/classrooms/${foreignClassroom.id}`, {
      token: teacherSession.tokens.accessToken,
    })
    expect(detailResponse.statusCode).toBe(403)

    const scheduleMutationResponse = await request(
      "POST",
      `/classrooms/${foreignClassroom.id}/schedule/weekly-slots`,
      {
        token: teacherSession.tokens.accessToken,
        payload: {
          weekday: 2,
          startMinutes: 600,
          endMinutes: 660,
          locationLabel: "Room 402",
        },
      },
    )

    expect(scheduleMutationResponse.statusCode).toBe(403)
  })

  async function login(payload: Record<string, unknown>) {
    const response = await request("POST", "/auth/login", {
      payload,
    })

    expect(response.statusCode).toBe(201)
    return authSessionResponseSchema.parse(response.body)
  }

  async function request(
    method: "GET" | "POST" | "PATCH",
    url: string,
    options: {
      payload?: unknown
      token?: string
    } = {},
  ): Promise<{ statusCode: number; body: unknown }> {
    if (!app) {
      throw new Error("Test application is not initialized.")
    }

    const fastify = app.getHttpAdapter().getInstance() as {
      inject: (options: {
        method: "GET" | "POST" | "PATCH"
        url: string
        payload?: unknown
        headers?: Record<string, string>
      }) => Promise<{ statusCode: number; body: string }>
    }

    const response = await fastify.inject({
      method,
      url,
      payload: options.payload,
      headers: {
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      },
    })

    return {
      statusCode: response.statusCode,
      body: response.body ? JSON.parse(response.body) : null,
    }
  }

  function getPrisma(): ReturnType<typeof createPrismaClient> {
    if (!prisma) {
      throw new Error("Prisma test client is not initialized.")
    }

    return prisma
  }
})
