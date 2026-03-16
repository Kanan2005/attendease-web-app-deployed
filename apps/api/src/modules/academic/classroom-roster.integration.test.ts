import {
  announcementSummarySchema,
  announcementsResponseSchema,
  authSessionResponseSchema,
  classroomDetailSchema,
  classroomJoinCodeSummarySchema,
  classroomRosterMemberSummarySchema,
  classroomRosterResponseSchema,
  classroomScheduleSchema,
  lectureSummarySchema,
  lecturesResponseSchema,
  rosterImportJobDetailSchema,
  rosterImportJobsResponseSchema,
  scheduleSlotSummarySchema,
  studentClassroomMembershipSummarySchema,
  studentClassroomsResponseSchema,
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

describe("Classroom roster integration", () => {
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
    database = await createTemporaryDatabase("attendease_classroom_roster")
    await seedAuthIntegrationData(database.databaseUrl)

    process.env.NODE_ENV = "test"
    process.env.TEST_DATABASE_URL = database.databaseUrl
    process.env.AUTH_ACCESS_TOKEN_SECRET = "attendease-classroom-roster-secret-1234567890"
    process.env.AUTH_ISSUER = "attendease-api-test"
    process.env.AUTH_AUDIENCE = "attendease-client-test"
    process.env.GOOGLE_OIDC_CLIENT_ID = "classroom-roster-google-client"
    process.env.GOOGLE_OIDC_CLIENT_SECRET = "classroom-roster-google-secret"
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

  it("lets a teacher rotate a join code and a student join the classroom once", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })
    const studentSession = await login({
      email: authIntegrationFixtures.studentOne.email,
      password: authIntegrationFixtures.studentOne.password,
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: authIntegrationFixtures.studentOne.device,
    })

    const classroom = await createTeacherClassroom({
      teacherToken: teacherSession.tokens.accessToken,
      subjectCode: "ROSTER101",
      subjectTitle: "Roster Foundations",
      classroomCode: "CSE6-ROSTER-A",
      displayTitle: "Roster Foundations Classroom",
    })

    const currentJoinCodeResponse = await request("GET", `/classrooms/${classroom.id}/join-code`, {
      token: teacherSession.tokens.accessToken,
    })
    expect(currentJoinCodeResponse.statusCode).toBe(200)
    const currentJoinCode = classroomJoinCodeSummarySchema.parse(currentJoinCodeResponse.body)
    expect(currentJoinCode.classroomId).toBe(classroom.id)

    const resetJoinCodeResponse = await request(
      "POST",
      `/classrooms/${classroom.id}/join-code/reset`,
      {
        token: teacherSession.tokens.accessToken,
        payload: {
          expiresAt: "2026-05-31T23:59:59.999Z",
        },
      },
    )
    expect(resetJoinCodeResponse.statusCode).toBe(201)
    const resetJoinCode = classroomJoinCodeSummarySchema.parse(resetJoinCodeResponse.body)
    expect(resetJoinCode.id).not.toBe(currentJoinCode.id)
    expect(resetJoinCode.classroomId).toBe(classroom.id)

    const joinedResponse = await request("POST", "/classrooms/join", {
      token: studentSession.tokens.accessToken,
      payload: {
        code: resetJoinCode.code,
      },
    })
    expect(joinedResponse.statusCode).toBe(201)
    const membership = studentClassroomMembershipSummarySchema.parse(joinedResponse.body)
    expect(membership.id).toBe(classroom.id)
    expect(membership.classroomId).toBe(classroom.id)
    expect(membership.membershipId).toBe(membership.enrollmentId)
    expect(membership.enrollmentStatus).toBe("ACTIVE")
    expect(membership.membershipStatus).toBe("ACTIVE")

    const classroomsResponse = await request("GET", "/students/me/classrooms", {
      token: studentSession.tokens.accessToken,
    })
    expect(classroomsResponse.statusCode).toBe(200)
    expect(
      studentClassroomsResponseSchema
        .parse(classroomsResponse.body)
        .some((row) => row.id === classroom.id && row.enrollmentStatus === "ACTIVE"),
    ).toBe(true)

    const duplicateJoinResponse = await request("POST", "/classrooms/join", {
      token: studentSession.tokens.accessToken,
      payload: {
        code: resetJoinCode.code,
      },
    })
    expect(duplicateJoinResponse.statusCode).toBe(409)

    const revokedJoinCode = await getPrisma().classroomJoinCode.findUnique({
      where: {
        id: currentJoinCode.id,
      },
    })
    expect(revokedJoinCode?.status).toBe("REVOKED")
  })

  it("lets students read their own classroom detail, schedule, and lectures without exposing join codes", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })
    const studentSession = await login({
      email: authIntegrationFixtures.studentOne.email,
      password: authIntegrationFixtures.studentOne.password,
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: authIntegrationFixtures.studentOne.device,
    })

    const classroom = await createTeacherClassroom({
      teacherToken: teacherSession.tokens.accessToken,
      subjectCode: "ROSTER110",
      subjectTitle: "Student Mobile Reads",
      classroomCode: "CSE6-ROSTER-J",
      displayTitle: "Student Mobile Read Classroom",
    })

    const foreignClassroom = await createTeacherClassroom({
      teacherToken: teacherSession.tokens.accessToken,
      subjectCode: "ROSTER111",
      subjectTitle: "Student Mobile Foreign Classroom",
      classroomCode: "CSE6-ROSTER-K",
      displayTitle: "Student Mobile Foreign Classroom",
    })

    const joinResponse = await request("POST", "/classrooms/join", {
      token: studentSession.tokens.accessToken,
      payload: {
        code: classroom.activeJoinCode?.code,
      },
    })
    expect(joinResponse.statusCode).toBe(201)

    const slotResponse = await request(
      "POST",
      `/classrooms/${classroom.id}/schedule/weekly-slots`,
      {
        token: teacherSession.tokens.accessToken,
        payload: {
          weekday: 1,
          startMinutes: 540,
          endMinutes: 600,
          locationLabel: "Room A-101",
        },
      },
    )
    expect(slotResponse.statusCode).toBe(201)
    const slot = scheduleSlotSummarySchema.parse(slotResponse.body)
    expect(slot.classroomId).toBe(classroom.id)

    const lectureResponse = await request("POST", `/classrooms/${classroom.id}/lectures`, {
      token: teacherSession.tokens.accessToken,
      payload: {
        lectureDate: "2026-03-15T00:00:00.000Z",
        title: "Student Mobile Accessible Lecture",
        scheduleSlotId: slot.id,
        status: "PLANNED",
      },
    })
    expect(lectureResponse.statusCode).toBe(201)
    const lecture = lectureSummarySchema.parse(lectureResponse.body)
    expect(lecture.classroomId).toBe(classroom.id)

    const classroomDetailResponse = await request("GET", `/classrooms/${classroom.id}`, {
      token: studentSession.tokens.accessToken,
    })
    expect(classroomDetailResponse.statusCode).toBe(200)
    const classroomDetail = classroomDetailSchema.parse(classroomDetailResponse.body)
    expect(classroomDetail.id).toBe(classroom.id)
    expect(classroomDetail.activeJoinCode).toBeNull()

    const scheduleResponse = await request("GET", `/classrooms/${classroom.id}/schedule`, {
      token: studentSession.tokens.accessToken,
    })
    expect(scheduleResponse.statusCode).toBe(200)
    const schedule = classroomScheduleSchema.parse(scheduleResponse.body)
    expect(schedule.scheduleSlots).toEqual([
      expect.objectContaining({
        id: slot.id,
        locationLabel: "Room A-101",
      }),
    ])

    const lecturesResponse = await request("GET", `/classrooms/${classroom.id}/lectures`, {
      token: studentSession.tokens.accessToken,
    })
    expect(lecturesResponse.statusCode).toBe(200)
    const lectures = lecturesResponseSchema.parse(lecturesResponse.body)
    expect(lectures).toEqual([
      expect.objectContaining({
        id: lecture.id,
        title: "Student Mobile Accessible Lecture",
      }),
    ])

    const foreignClassroomResponse = await request("GET", `/classrooms/${foreignClassroom.id}`, {
      token: studentSession.tokens.accessToken,
    })
    expect(foreignClassroomResponse.statusCode).toBe(403)
  })

  it("expires stale join codes and blocks join attempts for closed semesters", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })
    const studentSession = await login({
      email: authIntegrationFixtures.studentTwo.email,
      password: authIntegrationFixtures.studentTwo.password,
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: authIntegrationFixtures.studentTwo.device,
    })

    const expiredClassroom = await createTeacherClassroom({
      teacherToken: teacherSession.tokens.accessToken,
      subjectCode: "ROSTER102",
      subjectTitle: "Expired Joins",
      classroomCode: "CSE6-ROSTER-B",
      displayTitle: "Expired Join Classroom",
    })

    await getPrisma().classroomJoinCode.updateMany({
      where: {
        courseOfferingId: expiredClassroom.id,
        status: "ACTIVE",
      },
      data: {
        expiresAt: new Date("2026-03-01T00:00:00.000Z"),
      },
    })

    const expiredJoinResponse = await request("POST", "/classrooms/join", {
      token: studentSession.tokens.accessToken,
      payload: {
        code: expiredClassroom.activeJoinCode?.code,
      },
    })
    expect(expiredJoinResponse.statusCode).toBe(400)

    const expiredJoinCode = await getPrisma().classroomJoinCode.findUnique({
      where: {
        id: expiredClassroom.activeJoinCode?.id ?? "",
      },
    })
    expect(expiredJoinCode?.status).toBe("EXPIRED")

    const closedSemesterClassroom = await createTeacherClassroom({
      teacherToken: teacherSession.tokens.accessToken,
      subjectCode: "ROSTER103",
      subjectTitle: "Closed Semester Joins",
      classroomCode: "CSE6-ROSTER-C",
      displayTitle: "Closed Semester Classroom",
    })

    await getPrisma().semester.update({
      where: {
        id: developmentSeedIds.academic.semester,
      },
      data: {
        status: "CLOSED",
      },
    })

    const closedJoinResponse = await request("POST", "/classrooms/join", {
      token: studentSession.tokens.accessToken,
      payload: {
        code: closedSemesterClassroom.activeJoinCode?.code,
      },
    })
    expect(closedJoinResponse.statusCode).toBe(400)

    await getPrisma().semester.update({
      where: {
        id: developmentSeedIds.academic.semester,
      },
      data: {
        status: "ACTIVE",
      },
    })
  })

  it("lets teachers manage roster membership states while the classroom is open", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })

    const classroom = await createTeacherClassroom({
      teacherToken: teacherSession.tokens.accessToken,
      subjectCode: "ROSTER104",
      subjectTitle: "Roster Management",
      classroomCode: "CSE6-ROSTER-D",
      displayTitle: "Roster Management Classroom",
    })

    const studentThreeProfile = await getPrisma().studentProfile.findUnique({
      where: {
        userId: authIntegrationFixtures.studentThree.userId,
      },
      select: {
        rollNumber: true,
      },
    })

    const addRosterResponse = await request("POST", `/classrooms/${classroom.id}/students`, {
      token: teacherSession.tokens.accessToken,
      payload: {
        studentIdentifier:
          studentThreeProfile?.rollNumber ?? authIntegrationFixtures.studentThree.email,
        membershipStatus: "PENDING",
      },
    })
    expect(addRosterResponse.statusCode).toBe(201)
    const rosterMember = classroomRosterMemberSummarySchema.parse(addRosterResponse.body)
    expect(rosterMember.studentEmail).toBe(authIntegrationFixtures.studentThree.email)
    expect(rosterMember.studentIdentifier).toBe(studentThreeProfile?.rollNumber)
    expect(rosterMember.studentName).toBe(rosterMember.studentDisplayName)
    expect(rosterMember.status).toBe("PENDING")
    expect(rosterMember.membershipState).toBe("PENDING")

    const rosterListResponse = await request(
      "GET",
      `/classrooms/${classroom.id}/students?membershipStatus=PENDING&search=${encodeURIComponent(
        studentThreeProfile?.rollNumber ?? authIntegrationFixtures.studentThree.email,
      )}`,
      {
        token: teacherSession.tokens.accessToken,
      },
    )
    expect(rosterListResponse.statusCode).toBe(200)
    const filteredRoster = classroomRosterResponseSchema.parse(rosterListResponse.body)
    expect(filteredRoster).toEqual([
      expect.objectContaining({
        id: rosterMember.id,
        studentIdentifier: studentThreeProfile?.rollNumber,
        membershipState: "PENDING",
        actions: {
          canBlock: true,
          canRemove: true,
          canReactivate: true,
        },
      }),
    ])

    const blockResponse = await request(
      "PATCH",
      `/classrooms/${classroom.id}/students/${rosterMember.id}`,
      {
        token: teacherSession.tokens.accessToken,
        payload: {
          membershipStatus: "BLOCKED",
        },
      },
    )
    expect(blockResponse.statusCode).toBe(200)
    expect(classroomRosterMemberSummarySchema.parse(blockResponse.body)).toEqual(
      expect.objectContaining({
        status: "BLOCKED",
        membershipState: "BLOCKED",
        actions: {
          canBlock: false,
          canRemove: true,
          canReactivate: true,
        },
      }),
    )

    const dropResponse = await request(
      "DELETE",
      `/classrooms/${classroom.id}/students/${rosterMember.id}`,
      {
        token: teacherSession.tokens.accessToken,
      },
    )
    expect(dropResponse.statusCode).toBe(200)
    const droppedMember = classroomRosterMemberSummarySchema.parse(dropResponse.body)
    expect(droppedMember.droppedAt).not.toBeNull()
    expect(droppedMember.membershipState).toBe("DROPPED")
    expect(droppedMember.actions).toEqual({
      canBlock: false,
      canRemove: false,
      canReactivate: true,
    })

    const removalEvent = await getPrisma().outboxEvent.findFirst({
      where: {
        topic: "classroom.roster.member_removed",
        aggregateId: classroom.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    })
    expect(removalEvent).not.toBeNull()

    const reactivateResponse = await request(
      "PATCH",
      `/classrooms/${classroom.id}/students/${rosterMember.id}`,
      {
        token: teacherSession.tokens.accessToken,
        payload: {
          membershipStatus: "ACTIVE",
        },
      },
    )
    expect(reactivateResponse.statusCode).toBe(200)
    expect(classroomRosterMemberSummarySchema.parse(reactivateResponse.body)).toEqual(
      expect.objectContaining({
        membershipState: "ACTIVE",
        droppedAt: null,
      }),
    )
  })

  it("records an admin audit row when an admin removes a classroom student", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })
    const adminSession = await login({
      email: authIntegrationFixtures.admin.email,
      password: authIntegrationFixtures.admin.password,
      platform: "WEB",
      requestedRole: "ADMIN",
    })

    const classroom = await createTeacherClassroom({
      teacherToken: teacherSession.tokens.accessToken,
      subjectCode: "ROSTER112",
      subjectTitle: "Roster Removal Audit",
      classroomCode: "CSE6-ROSTER-M",
      displayTitle: "Roster Removal Audit Classroom",
    })

    const addRosterResponse = await request("POST", `/classrooms/${classroom.id}/students`, {
      token: teacherSession.tokens.accessToken,
      payload: {
        studentEmail: authIntegrationFixtures.studentFour.email,
        membershipStatus: "ACTIVE",
      },
    })
    expect(addRosterResponse.statusCode).toBe(201)
    const rosterMember = classroomRosterMemberSummarySchema.parse(addRosterResponse.body)

    const dropResponse = await request(
      "DELETE",
      `/classrooms/${classroom.id}/students/${rosterMember.id}`,
      {
        token: adminSession.tokens.accessToken,
      },
    )
    expect(dropResponse.statusCode).toBe(200)
    expect(classroomRosterMemberSummarySchema.parse(dropResponse.body).membershipState).toBe(
      "DROPPED",
    )

    const adminAction = await getPrisma().adminActionLog.findFirst({
      where: {
        adminUserId: authIntegrationFixtures.admin.userId,
        targetUserId: authIntegrationFixtures.studentFour.userId,
        targetCourseOfferingId: classroom.id,
        actionType: "CLASSROOM_STUDENT_REMOVE",
      },
      orderBy: {
        createdAt: "desc",
      },
    })
    expect(adminAction?.metadata).toMatchObject({
      classroomId: classroom.id,
      enrollmentId: rosterMember.id,
      previousStatus: "ACTIVE",
      nextStatus: "DROPPED",
      source: "REMOVE",
    })
  })

  it("blocks roster mutations for completed classrooms", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })

    const classroom = await createTeacherClassroom({
      teacherToken: teacherSession.tokens.accessToken,
      subjectCode: "ROSTER105",
      subjectTitle: "Completed Classroom",
      classroomCode: "CSE6-ROSTER-E",
      displayTitle: "Completed Classroom",
    })

    await getPrisma().courseOffering.update({
      where: {
        id: classroom.id,
      },
      data: {
        status: "COMPLETED",
      },
    })

    const rosterMutationResponse = await request("POST", `/classrooms/${classroom.id}/students`, {
      token: teacherSession.tokens.accessToken,
      payload: {
        studentEmail: authIntegrationFixtures.studentFour.email,
      },
    })
    expect(rosterMutationResponse.statusCode).toBe(400)
  })

  it("shows classroom stream visibility correctly for teachers and students", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })
    const studentSession = await login({
      email: authIntegrationFixtures.studentOne.email,
      password: authIntegrationFixtures.studentOne.password,
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: authIntegrationFixtures.studentOne.device,
    })

    const classroom = await createTeacherClassroom({
      teacherToken: teacherSession.tokens.accessToken,
      subjectCode: "ROSTER106",
      subjectTitle: "Classroom Stream",
      classroomCode: "CSE6-ROSTER-F",
      displayTitle: "Classroom Stream Classroom",
    })

    await request("POST", `/classrooms/${classroom.id}/students`, {
      token: teacherSession.tokens.accessToken,
      payload: {
        studentEmail: authIntegrationFixtures.studentOne.email,
      },
    })

    const visibleAnnouncementResponse = await request(
      "POST",
      `/classrooms/${classroom.id}/announcements`,
      {
        token: teacherSession.tokens.accessToken,
        payload: {
          title: "Welcome",
          body: "Check the class stream for updates.",
          shouldNotify: true,
        },
      },
    )
    expect(visibleAnnouncementResponse.statusCode).toBe(201)
    const visibleAnnouncement = announcementSummarySchema.parse(visibleAnnouncementResponse.body)
    expect(visibleAnnouncement.classroomId).toBe(classroom.id)

    const teacherOnlyAnnouncementResponse = await request(
      "POST",
      `/classrooms/${classroom.id}/announcements`,
      {
        token: teacherSession.tokens.accessToken,
        payload: {
          postType: "IMPORT_RESULT",
          visibility: "TEACHER_ONLY",
          title: "Internal note",
          body: "Teacher-only roster summary.",
          shouldNotify: false,
        },
      },
    )
    expect(teacherOnlyAnnouncementResponse.statusCode).toBe(201)
    const teacherOnlyAnnouncement = announcementSummarySchema.parse(
      teacherOnlyAnnouncementResponse.body,
    )
    expect(teacherOnlyAnnouncement.classroomId).toBe(classroom.id)

    const teacherStreamResponse = await request("GET", `/classrooms/${classroom.id}/stream`, {
      token: teacherSession.tokens.accessToken,
    })
    expect(teacherStreamResponse.statusCode).toBe(200)
    const teacherStream = announcementsResponseSchema.parse(teacherStreamResponse.body)
    expect(teacherStream.some((post) => post.id === visibleAnnouncement.id)).toBe(true)
    expect(teacherStream.some((post) => post.id === teacherOnlyAnnouncement.id)).toBe(true)

    const studentStreamResponse = await request("GET", `/classrooms/${classroom.id}/stream`, {
      token: studentSession.tokens.accessToken,
    })
    expect(studentStreamResponse.statusCode).toBe(200)
    const studentStream = announcementsResponseSchema.parse(studentStreamResponse.body)
    expect(studentStream.some((post) => post.id === visibleAnnouncement.id)).toBe(true)
    expect(studentStream.some((post) => post.id === teacherOnlyAnnouncement.id)).toBe(false)
  })

  it("queues notify events for student-visible posts and denies non-members from the stream", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })
    const studentSession = await login({
      email: authIntegrationFixtures.studentOne.email,
      password: authIntegrationFixtures.studentOne.password,
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: authIntegrationFixtures.studentOne.device,
    })

    const classroom = await createTeacherClassroom({
      teacherToken: teacherSession.tokens.accessToken,
      subjectCode: "ROSTER108",
      subjectTitle: "Stream Guardrails",
      classroomCode: "CSE6-ROSTER-H",
      displayTitle: "Stream Guardrails Classroom",
    })

    const announcementResponse = await request(
      "POST",
      `/classrooms/${classroom.id}/announcements`,
      {
        token: teacherSession.tokens.accessToken,
        payload: {
          title: "Visible reminder",
          body: "Bring your lab notebook tomorrow.",
          visibility: "STUDENT_AND_TEACHER",
          shouldNotify: true,
        },
      },
    )
    expect(announcementResponse.statusCode).toBe(201)
    const announcement = announcementSummarySchema.parse(announcementResponse.body)

    const notificationEvent = await getPrisma().outboxEvent.findFirst({
      where: {
        topic: "classroom.announcement.posted",
        aggregateId: announcement.id,
      },
    })
    expect(notificationEvent).not.toBeNull()

    const blockedStudentStreamResponse = await request(
      "GET",
      `/classrooms/${classroom.id}/stream`,
      {
        token: studentSession.tokens.accessToken,
      },
    )
    expect(blockedStudentStreamResponse.statusCode).toBe(403)
  })

  it("creates roster import jobs, lists them, and applies reviewed valid rows", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })

    const classroom = await createTeacherClassroom({
      teacherToken: teacherSession.tokens.accessToken,
      subjectCode: "ROSTER107",
      subjectTitle: "Roster Imports",
      classroomCode: "CSE6-ROSTER-G",
      displayTitle: "Roster Import Classroom",
    })

    const createImportResponse = await request(
      "POST",
      `/classrooms/${classroom.id}/roster-imports`,
      {
        token: teacherSession.tokens.accessToken,
        payload: {
          sourceFileName: "roster.csv",
          rows: [
            {
              studentEmail: authIntegrationFixtures.studentTwo.email,
              parsedName: "Student Two",
            },
            {
              studentEmail: "missing@attendease.dev",
              parsedName: "Missing Student",
            },
          ],
        },
      },
    )
    expect(createImportResponse.statusCode).toBe(201)
    const createdImport = rosterImportJobDetailSchema.parse(createImportResponse.body)
    expect(createdImport.rows).toHaveLength(2)
    expect(createdImport.status).toBe("UPLOADED")
    expect(createdImport.classroomId).toBe(classroom.id)

    const listImportsResponse = await request("GET", `/classrooms/${classroom.id}/roster-imports`, {
      token: teacherSession.tokens.accessToken,
    })
    expect(listImportsResponse.statusCode).toBe(200)
    expect(
      rosterImportJobsResponseSchema
        .parse(listImportsResponse.body)
        .some((job) => job.id === createdImport.id),
    ).toBe(true)

    await getPrisma().rosterImportJob.update({
      where: {
        id: createdImport.id,
      },
      data: {
        status: "REVIEW_REQUIRED",
        validRows: 1,
        invalidRows: 1,
        startedAt: new Date("2026-03-14T09:15:00.000Z"),
        completedAt: new Date("2026-03-14T09:16:00.000Z"),
      },
    })

    await getPrisma().rosterImportRow.updateMany({
      where: {
        jobId: createdImport.id,
      },
      data: {
        status: "INVALID",
        errorMessage: "Student could not be resolved from the provided identifiers.",
      },
    })

    await getPrisma().rosterImportRow.update({
      where: {
        id: createdImport.rows[0]?.id ?? "",
      },
      data: {
        status: "VALID",
        errorMessage: null,
        resolvedStudentId: authIntegrationFixtures.studentTwo.userId,
      },
    })

    const applyImportResponse = await request(
      "POST",
      `/classrooms/${classroom.id}/roster-imports/${createdImport.id}/apply`,
      {
        token: teacherSession.tokens.accessToken,
      },
    )
    expect(applyImportResponse.statusCode).toBe(201)
    const appliedImport = rosterImportJobDetailSchema.parse(applyImportResponse.body)
    expect(appliedImport.status).toBe("APPLIED")
    expect(appliedImport.classroomId).toBe(classroom.id)
    expect(appliedImport.appliedRows).toBe(1)
    expect(appliedImport.rows.some((row) => row.status === "APPLIED")).toBe(true)

    const rosterAfterApplyResponse = await request("GET", `/classrooms/${classroom.id}/students`, {
      token: teacherSession.tokens.accessToken,
    })
    expect(rosterAfterApplyResponse.statusCode).toBe(200)
    expect(
      classroomRosterResponseSchema
        .parse(rosterAfterApplyResponse.body)
        .some((row) => row.studentEmail === authIntegrationFixtures.studentTwo.email),
    ).toBe(true)
  })

  it("rejects roster import apply requests before worker review is complete", async () => {
    const teacherSession = await login({
      email: authIntegrationFixtures.teacher.email,
      password: authIntegrationFixtures.teacher.password,
      platform: "WEB",
      requestedRole: "TEACHER",
    })

    const classroom = await createTeacherClassroom({
      teacherToken: teacherSession.tokens.accessToken,
      subjectCode: "ROSTER109",
      subjectTitle: "Import Guardrails",
      classroomCode: "CSE6-ROSTER-I",
      displayTitle: "Import Guardrails Classroom",
    })

    const createImportResponse = await request(
      "POST",
      `/classrooms/${classroom.id}/roster-imports`,
      {
        token: teacherSession.tokens.accessToken,
        payload: {
          sourceFileName: "guardrails.csv",
          rows: [
            {
              studentEmail: authIntegrationFixtures.studentFour.email,
              parsedName: "Student Four",
            },
          ],
        },
      },
    )
    expect(createImportResponse.statusCode).toBe(201)
    const createdImport = rosterImportJobDetailSchema.parse(createImportResponse.body)

    const applyImportResponse = await request(
      "POST",
      `/classrooms/${classroom.id}/roster-imports/${createdImport.id}/apply`,
      {
        token: teacherSession.tokens.accessToken,
      },
    )
    expect(applyImportResponse.statusCode).toBe(400)

    const storedJob = await getPrisma().rosterImportJob.findUniqueOrThrow({
      where: {
        id: createdImport.id,
      },
    })
    expect(storedJob.status).toBe("UPLOADED")
  })

  async function createTeacherClassroom(input: {
    teacherToken: string
    subjectCode: string
    subjectTitle: string
    classroomCode: string
    displayTitle: string
  }) {
    const subject = await getPrisma().subject.create({
      data: {
        code: input.subjectCode,
        title: input.subjectTitle,
        status: "ACTIVE",
      },
    })

    await getPrisma().teacherAssignment.create({
      data: {
        teacherId: authIntegrationFixtures.teacher.userId,
        semesterId: developmentSeedIds.academic.semester,
        classId: developmentSeedIds.academic.class,
        sectionId: developmentSeedIds.academic.section,
        subjectId: subject.id,
        status: "ACTIVE",
        canSelfCreateCourseOffering: true,
      },
    })

    const response = await request("POST", "/classrooms", {
      token: input.teacherToken,
      payload: {
        semesterId: developmentSeedIds.academic.semester,
        classId: developmentSeedIds.academic.class,
        sectionId: developmentSeedIds.academic.section,
        subjectId: subject.id,
        code: input.classroomCode,
        displayTitle: input.displayTitle,
      },
    })

    expect(response.statusCode).toBe(201)
    return classroomDetailSchema.parse(response.body)
  }

  async function login(payload: Record<string, unknown>) {
    const response = await request("POST", "/auth/login", {
      payload,
    })

    expect(response.statusCode).toBe(201)
    return authSessionResponseSchema.parse(response.body)
  }

  async function request(
    method: "GET" | "POST" | "PATCH" | "DELETE",
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
        method: "GET" | "POST" | "PATCH" | "DELETE"
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
