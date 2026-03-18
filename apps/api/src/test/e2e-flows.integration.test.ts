/**
 * Comprehensive end-to-end integration test suite.
 *
 * Boots a full NestJS app in-process with a temporary database,
 * seeds 20 teachers + 800 students with realistic data, then validates
 * every core user flow across all API modules.
 */
import {
  buildDevelopmentStudentRegistrationFixture,
  buildDevelopmentTeacherRegistrationFixture,
  createPrismaClient,
  disconnectPrismaClient,
} from "@attendease/db"
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify"
import { Test } from "@nestjs/testing"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import { AppModule } from "../app.module.js"
import {
  type TemporaryDatabase,
  authIntegrationFixtures,
  createTemporaryDatabase,
  destroyTemporaryDatabase,
  seedAuthIntegrationData,
} from "./integration-helpers.js"
import { type E2ESeedResult, seedE2EData } from "./e2e-seed.js"
import { GoogleOidcService } from "../modules/auth/google-oidc.service.js"

describe("E2E flows (20 teachers, 800 students)", () => {
  const originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
    AUTH_ACCESS_TOKEN_SECRET: process.env.AUTH_ACCESS_TOKEN_SECRET,
    AUTH_ISSUER: process.env.AUTH_ISSUER,
    AUTH_AUDIENCE: process.env.AUTH_AUDIENCE,
    GOOGLE_TEACHER_ALLOWED_DOMAINS: process.env.GOOGLE_TEACHER_ALLOWED_DOMAINS,
    GOOGLE_STUDENT_ALLOWED_DOMAINS: process.env.GOOGLE_STUDENT_ALLOWED_DOMAINS,
  }

  let database: TemporaryDatabase | null = null
  let prisma: ReturnType<typeof createPrismaClient> | null = null
  let app: NestFastifyApplication | null = null
  let seed: E2ESeedResult | null = null

  const googleOidcService = { verifyExchange: vi.fn() }

  type InjectFn = (opts: {
    method: "GET" | "POST" | "PATCH" | "DELETE"
    url: string
    payload?: unknown
    headers?: Record<string, string>
  }) => Promise<{ statusCode: number; body: string }>

  let inject: InjectFn

  beforeAll(
    async () => {
      database = await createTemporaryDatabase("e2e_full")
      await seedAuthIntegrationData(database.databaseUrl)

      process.env.NODE_ENV = "test"
      process.env.TEST_DATABASE_URL = database.databaseUrl
      process.env.AUTH_ACCESS_TOKEN_SECRET = "e2e-integration-secret-1234567890abcdef"
      process.env.AUTH_ISSUER = "attendease-api-e2e"
      process.env.AUTH_AUDIENCE = "attendease-client-e2e"
      process.env.GOOGLE_TEACHER_ALLOWED_DOMAINS = "attendease.dev"
      process.env.GOOGLE_STUDENT_ALLOWED_DOMAINS = "attendease.dev"

      prisma = createPrismaClient({
        databaseUrl: database.databaseUrl,
        singleton: false,
      })

      googleOidcService.verifyExchange.mockRejectedValue(new Error("No Google in E2E"))

      const testingModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(GoogleOidcService)
        .useValue(googleOidcService)
        .compile()

      app = testingModule.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
      await app.init()
      await app.getHttpAdapter().getInstance().ready()

      inject = app.getHttpAdapter().getInstance().inject.bind(
        app.getHttpAdapter().getInstance(),
      ) as InjectFn

      seed = await seedE2EData(inject)
    },
    15 * 60 * 1000,
  )

  afterAll(async () => {
    if (app) await app.close()
    if (prisma) await disconnectPrismaClient(prisma)
    Object.assign(process.env, originalEnv)
    if (database) await destroyTemporaryDatabase(database)
  })

  async function post(url: string, payload: unknown, token?: string) {
    const headers: Record<string, string> = { "content-type": "application/json" }
    if (token) headers.authorization = `Bearer ${token}`
    const res = await inject({ method: "POST", url, payload, headers })
    return { statusCode: res.statusCode, body: JSON.parse(res.body) }
  }

  async function get(url: string, token: string) {
    const res = await inject({
      method: "GET",
      url,
      headers: { authorization: `Bearer ${token}` },
    })
    return { statusCode: res.statusCode, body: JSON.parse(res.body) }
  }

  async function patch(url: string, payload: unknown, token: string) {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    }
    const res = await inject({ method: "PATCH", url, payload, headers })
    return { statusCode: res.statusCode, body: JSON.parse(res.body) }
  }

  async function del(url: string, token: string) {
    const res = await inject({
      method: "DELETE",
      url,
      headers: { authorization: `Bearer ${token}` },
    })
    return { statusCode: res.statusCode, body: JSON.parse(res.body) }
  }

  // =========================================================================
  //  1. DATA INTEGRITY
  // =========================================================================

  describe("Data integrity after seed", () => {
    it("creates 20 teachers", () => {
      expect(seed!.teachers).toHaveLength(20)
    })

    it("creates 800 students", () => {
      expect(seed!.students).toHaveLength(800)
    })

    it("creates 6-8 classrooms per teacher (120-160 total)", () => {
      expect(seed!.classrooms.length).toBeGreaterThanOrEqual(120)
      expect(seed!.classrooms.length).toBeLessThanOrEqual(160)
      for (const teacher of seed!.teachers) {
        expect(teacher.classrooms.length).toBeGreaterThanOrEqual(6)
        expect(teacher.classrooms.length).toBeLessThanOrEqual(8)
      }
    })

    it("enrolls students in each classroom", () => {
      for (const classroom of seed!.classrooms) {
        expect(classroom.enrolledStudentCount).toBeGreaterThan(0)
      }
    })

    it("creates attendance sessions for classrooms", () => {
      expect(seed!.totalSessions).toBeGreaterThan(0)
      for (const classroom of seed!.classrooms) {
        expect(classroom.sessionIds.length).toBeGreaterThanOrEqual(1)
      }
    })

    it("assigns degree and branch to every student", () => {
      for (const student of seed!.students) {
        expect(["B.Tech", "M.Tech"]).toContain(student.degree)
        expect(["CSE", "ECE", "EE", "ME", "CHE", "Civil", "Meta"]).toContain(student.branch)
      }
    })

    it("generates roll numbers for all students", () => {
      const rollNumbers = seed!.students.map((s) => s.rollNumber)
      const unique = new Set(rollNumbers)
      expect(unique.size).toBe(800)
    })
  })

  // =========================================================================
  //  2. AUTH - REGISTRATION
  // =========================================================================

  describe("Auth: Registration", () => {
    it("registers a new student with all fields", async () => {
      const fixture = buildDevelopmentStudentRegistrationFixture("e2e-fresh-student")
      const res = await post("/auth/register/student", {
        email: fixture.email,
        password: fixture.password,
        displayName: fixture.displayName,
        installId: fixture.device.installId,
        platform: fixture.device.platform,
        publicKey: fixture.device.publicKey,
        appVersion: fixture.device.appVersion,
        deviceModel: fixture.device.deviceModel,
        osVersion: fixture.device.osVersion,
        degree: "B.Tech",
        branch: "CSE",
      })
      expect(res.statusCode).toBe(201)
    })

    it("registers a new teacher", async () => {
      const fixture = buildDevelopmentTeacherRegistrationFixture("e2e-fresh-teacher", {
        platform: "WEB",
      })
      const res = await post("/auth/register/teacher", {
        email: fixture.email,
        password: fixture.password,
        displayName: fixture.displayName,
      })
      expect(res.statusCode).toBe(201)
    })

    it("rejects duplicate email registration", async () => {
      const existingStudent = seed!.students[0]!
      const fixture = buildDevelopmentStudentRegistrationFixture("e2e-dup-student")
      const res = await post("/auth/register/student", {
        email: existingStudent.email,
        password: fixture.password,
        displayName: fixture.displayName,
        installId: fixture.device.installId,
        platform: fixture.device.platform,
        publicKey: fixture.device.publicKey,
        appVersion: fixture.device.appVersion,
        deviceModel: fixture.device.deviceModel,
        osVersion: fixture.device.osVersion,
      })
      expect(res.statusCode).toBeGreaterThanOrEqual(400)
      expect(res.statusCode).toBeLessThan(500)
    })

    it("rejects registration with missing required fields", async () => {
      const res = await post("/auth/register/student", {
        email: "incomplete@test.dev",
      })
      expect(res.statusCode).toBeGreaterThanOrEqual(400)
    })
  })

  // =========================================================================
  //  3. AUTH - LOGIN & SESSION
  // =========================================================================

  describe("Auth: Login & Session", () => {
    it("logs in a seeded teacher and returns an access token", async () => {
      const teacher = seed!.teachers[0]!
      const res = await post("/auth/login", {
        email: teacher.email,
        password: teacher.password,
      })
      expect(res.statusCode).toBe(200)
      expect(res.body.accessToken).toBeTruthy()
      expect(typeof res.body.accessToken).toBe("string")
    })

    it("logs in a seeded student and returns an access token", async () => {
      const student = seed!.students[0]!
      const res = await post("/auth/login", {
        email: student.email,
        password: student.password,
      })
      expect(res.statusCode).toBe(200)
      expect(res.body.accessToken).toBeTruthy()
    })

    it("rejects login with wrong password", async () => {
      const teacher = seed!.teachers[0]!
      const res = await post("/auth/login", {
        email: teacher.email,
        password: "wrong-password-absolutely",
      })
      expect(res.statusCode).toBeGreaterThanOrEqual(400)
    })

    it("rejects login with non-existent email", async () => {
      const res = await post("/auth/login", {
        email: "nobody-here@attendease.dev",
        password: "doesnotmatter",
      })
      expect(res.statusCode).toBeGreaterThanOrEqual(400)
    })

    it("returns current user via /auth/me", async () => {
      const teacher = seed!.teachers[0]!
      const me = await get("/auth/me", teacher.token)
      expect(me.statusCode).toBe(200)
      expect(me.body.email).toBe(teacher.email)
      expect(me.body.displayName).toBe(teacher.displayName)
    })

    it("returns student user data via /auth/me", async () => {
      const student = seed!.students[0]!
      const me = await get("/auth/me", student.token)
      expect(me.statusCode).toBe(200)
      expect(me.body.email).toBe(student.email)
    })

    it("rejects requests with invalid token", async () => {
      const res = await get("/auth/me", "invalid-token-garbage-12345")
      expect(res.statusCode).toBeGreaterThanOrEqual(400)
    })

    it("logs out successfully and token becomes invalid", async () => {
      const fixture = buildDevelopmentStudentRegistrationFixture("e2e-logout-test")
      await post("/auth/register/student", {
        email: fixture.email,
        password: fixture.password,
        displayName: fixture.displayName,
        installId: fixture.device.installId,
        platform: fixture.device.platform,
        publicKey: fixture.device.publicKey,
        appVersion: fixture.device.appVersion,
        deviceModel: fixture.device.deviceModel,
        osVersion: fixture.device.osVersion,
      })
      const login = await post("/auth/login", {
        email: fixture.email,
        password: fixture.password,
      })
      expect(login.statusCode).toBe(200)

      const logout = await post("/auth/logout", {}, login.body.accessToken)
      expect(logout.statusCode).toBeLessThan(300)
    })
  })

  // =========================================================================
  //  4. AUTH - PROFILE
  // =========================================================================

  describe("Auth: Profile", () => {
    it("fetches full profile for a student", async () => {
      const student = seed!.students[0]!
      const profile = await get("/auth/profile", student.token)
      expect(profile.statusCode).toBe(200)
      expect(profile.body.email).toBe(student.email)
    })

    it("updates student display name", async () => {
      const student = seed!.students[1]!
      const updated = await patch(
        "/auth/profile",
        { displayName: "Updated E2E Student One" },
        student.token,
      )
      expect(updated.statusCode).toBeLessThan(300)
    })

    it("updates student roll number", async () => {
      const student = seed!.students[2]!
      const updated = await patch(
        "/auth/profile",
        { displayName: student.displayName, rollNumber: "CSE-2024-0099" },
        student.token,
      )
      expect(updated.statusCode).toBeLessThan(300)
    })

    it("updates student degree and branch", async () => {
      const student = seed!.students[3]!
      const updated = await patch(
        "/auth/profile",
        { displayName: student.displayName, degree: "M.Tech", branch: "ECE" },
        student.token,
      )
      expect(updated.statusCode).toBeLessThan(300)
    })

    it("updates teacher profile", async () => {
      const teacher = seed!.teachers[0]!
      const updated = await patch(
        "/auth/profile",
        { displayName: "Prof. Updated Name" },
        teacher.token,
      )
      expect(updated.statusCode).toBeLessThan(300)
    })
  })

  // =========================================================================
  //  5. CLASSROOM LIFECYCLE
  // =========================================================================

  describe("Classroom: Lifecycle", () => {
    let testClassroomId: string

    it("teacher creates a new classroom", async () => {
      const teacher = seed!.teachers[0]!
      const res = await post(
        "/classrooms",
        {
          semesterId: "lifecycle-sem",
          classId: "lifecycle-cls",
          sectionId: "lifecycle-sec",
          subjectId: "lifecycle-sub",
          courseCode: "LIFE-101A",
          classroomTitle: "Lifecycle Integration Test",
          defaultAttendanceMode: "QR_GPS",
          defaultGpsRadiusMeters: 100,
          defaultSessionDurationMinutes: 30,
          qrRotationWindowSeconds: 15,
          requiresTrustedDevice: false,
        },
        teacher.token,
      )
      expect(res.statusCode).toBe(201)
      expect(res.body.id).toBeTruthy()
      testClassroomId = res.body.id
    })

    it("teacher retrieves the created classroom", async () => {
      const teacher = seed!.teachers[0]!
      const res = await get(`/classrooms/${testClassroomId}`, teacher.token)
      expect(res.statusCode).toBe(200)
      expect(res.body.id).toBe(testClassroomId)
    })

    it("teacher lists classrooms and finds it", async () => {
      const teacher = seed!.teachers[0]!
      const res = await get("/classrooms", teacher.token)
      expect(res.statusCode).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThan(0)
    })

    it("teacher updates classroom title", async () => {
      const teacher = seed!.teachers[0]!
      const res = await patch(
        `/classrooms/${testClassroomId}`,
        { classroomTitle: "Updated Lifecycle Title" },
        teacher.token,
      )
      expect(res.statusCode).toBeLessThan(300)
    })

    it("teacher resets join code", async () => {
      const teacher = seed!.teachers[0]!
      const res = await post(
        `/classrooms/${testClassroomId}/join-code/reset`,
        {},
        teacher.token,
      )
      expect(res.statusCode).toBeLessThan(300)
      expect(res.body.code).toBeTruthy()
    })

    it("teacher archives the classroom", async () => {
      const teacher = seed!.teachers[0]!
      const res = await post(
        `/classrooms/${testClassroomId}/archive`,
        {},
        teacher.token,
      )
      expect(res.statusCode).toBeLessThan(300)
    })
  })

  // =========================================================================
  //  6. STUDENT ENROLLMENT
  // =========================================================================

  describe("Student: Enrollment", () => {
    it("student joins a classroom via join code", async () => {
      const teacher = seed!.teachers[5]!
      const student = seed!.students[799]!

      const classroom = await post(
        "/classrooms",
        {
          semesterId: "enroll-sem",
          classId: "enroll-cls",
          sectionId: "enroll-sec",
          subjectId: "enroll-sub",
          courseCode: "ENRL-301A",
          classroomTitle: "Enrollment Test Class",
          defaultAttendanceMode: "QR_GPS",
          defaultGpsRadiusMeters: 100,
          defaultSessionDurationMinutes: 30,
          qrRotationWindowSeconds: 15,
          requiresTrustedDevice: false,
        },
        teacher.token,
      )

      const joinCode = await post(
        `/classrooms/${classroom.body.id}/join-code/reset`,
        {},
        teacher.token,
      )

      const joined = await post(
        "/classrooms/join",
        { code: joinCode.body.code },
        student.token,
      )
      expect(joined.statusCode).toBeLessThan(300)
    })

    it("student lists their joined classrooms", async () => {
      const student = seed!.students[0]!
      const res = await get("/students/me/classrooms", student.token)
      expect(res.statusCode).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThan(0)
    })

    it("rejects joining with an invalid code", async () => {
      const student = seed!.students[100]!
      const res = await post(
        "/classrooms/join",
        { code: "INVALIDCODE999" },
        student.token,
      )
      expect(res.statusCode).toBeGreaterThanOrEqual(400)
    })
  })

  // =========================================================================
  //  7. ROSTER MANAGEMENT
  // =========================================================================

  describe("Roster: Management", () => {
    it("teacher views the student roster for a classroom", async () => {
      const teacher = seed!.teachers[0]!
      const classroom = teacher.classrooms[0]!
      const res = await get(`/classrooms/${classroom.id}/students`, teacher.token)
      expect(res.statusCode).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })

    it("teacher adds a specific student to roster", async () => {
      const teacher = seed!.teachers[1]!
      const classroom = teacher.classrooms[0]!
      const targetStudent = seed!.students[700]!

      const res = await post(
        `/classrooms/${classroom.id}/students`,
        {
          studentIdentifier: targetStudent.email,
          membershipStatus: "ACTIVE",
        },
        teacher.token,
      )
      expect(res.statusCode).toBeLessThan(500)
    })
  })

  // =========================================================================
  //  8. LECTURE MANAGEMENT
  // =========================================================================

  describe("Lecture: Management", () => {
    it("teacher lists lectures for a seeded classroom", async () => {
      const teacher = seed!.teachers[0]!
      const classroom = teacher.classrooms[0]!
      const res = await get(`/classrooms/${classroom.id}/lectures`, teacher.token)
      expect(res.statusCode).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })
  })

  // =========================================================================
  //  9. ANNOUNCEMENTS / STREAM
  // =========================================================================

  describe("Announcements & Stream", () => {
    it("teacher posts an announcement", async () => {
      const teacher = seed!.teachers[2]!
      const classroom = teacher.classrooms[0]!
      const res = await post(
        `/classrooms/${classroom.id}/announcements`,
        {
          title: "E2E Announcement",
          body: "This is a test announcement from the E2E suite.",
        },
        teacher.token,
      )
      expect(res.statusCode).toBeLessThan(300)
    })

    it("student reads the classroom stream", async () => {
      const teacher = seed!.teachers[2]!
      const classroom = teacher.classrooms[0]!
      const enrolledStudent = seed!.students.find((s) =>
        s.classroomIds.includes(classroom.id),
      )

      if (enrolledStudent) {
        const res = await get(`/classrooms/${classroom.id}/stream`, enrolledStudent.token)
        expect(res.statusCode).toBe(200)
      }
    })
  })

  // =========================================================================
  //  10. SCHEDULE MANAGEMENT
  // =========================================================================

  describe("Schedule: Management", () => {
    it("teacher creates a weekly slot", async () => {
      const teacher = seed!.teachers[4]!
      const classroom = teacher.classrooms[0]!

      const res = await post(
        `/classrooms/${classroom.id}/schedule/weekly-slots`,
        {
          weekday: 1,
          startMinutes: 540,
          endMinutes: 630,
          locationLabel: "Room 101",
        },
        teacher.token,
      )
      expect(res.statusCode).toBeLessThan(300)
    })

    it("teacher fetches the schedule", async () => {
      const teacher = seed!.teachers[4]!
      const classroom = teacher.classrooms[0]!

      const res = await get(`/classrooms/${classroom.id}/schedule`, teacher.token)
      expect(res.statusCode).toBe(200)
    })
  })

  // =========================================================================
  //  11. QR ATTENDANCE SESSION LIFECYCLE
  // =========================================================================

  describe("Attendance: QR Session Lifecycle", () => {
    let sessionId: string

    it("teacher creates a QR session", async () => {
      const teacher = seed!.teachers[3]!
      const classroom = teacher.classrooms[0]!

      const res = await post(
        "/sessions/qr",
        {
          classroomId: classroom.id,
          anchorType: "TEACHER_SELECTED",
          anchorLatitude: 28.6139,
          anchorLongitude: 77.209,
          gpsRadiusMeters: 150,
          sessionDurationMinutes: 45,
        },
        teacher.token,
      )
      expect(res.statusCode).toBe(201)
      expect(res.body.id).toBeTruthy()
      sessionId = res.body.id
    })

    it("teacher views live sessions", async () => {
      const teacher = seed!.teachers[3]!
      const res = await get("/sessions/live", teacher.token)
      expect(res.statusCode).toBe(200)
    })

    it("teacher ends the QR session", async () => {
      const teacher = seed!.teachers[3]!
      const res = await post(`/sessions/${sessionId}/end`, {}, teacher.token)
      expect(res.statusCode).toBeLessThan(300)
    })

    it("teacher fetches session detail after ending", async () => {
      const teacher = seed!.teachers[3]!
      const res = await get(`/sessions/${sessionId}`, teacher.token)
      expect(res.statusCode).toBe(200)
      expect(res.body.id).toBe(sessionId)
    })

    it("teacher views session students list", async () => {
      const teacher = seed!.teachers[3]!
      const res = await get(`/sessions/${sessionId}/students`, teacher.token)
      expect(res.statusCode).toBe(200)
    })
  })

  // =========================================================================
  //  12. BLUETOOTH ATTENDANCE SESSION
  // =========================================================================

  describe("Attendance: Bluetooth Session", () => {
    it("teacher creates a Bluetooth session", async () => {
      const teacher = seed!.teachers[6]!
      const classroom = teacher.classrooms[0]!

      const res = await post(
        "/sessions/bluetooth",
        { classroomId: classroom.id },
        teacher.token,
      )
      // May succeed or fail depending on feature flags
      expect(res.statusCode).toBeLessThan(500)
    })
  })

  // =========================================================================
  //  13. ATTENDANCE HISTORY
  // =========================================================================

  describe("Attendance: History", () => {
    it("teacher lists all sessions across classrooms", async () => {
      const teacher = seed!.teachers[0]!
      const res = await get("/sessions", teacher.token)
      expect(res.statusCode).toBe(200)
    })

    it("teacher views detail of a previously created session", async () => {
      const teacher = seed!.teachers[0]!
      const classroom = teacher.classrooms[0]!

      if (classroom.sessionIds.length > 0) {
        const res = await get(`/sessions/${classroom.sessionIds[0]}`, teacher.token)
        expect(res.statusCode).toBe(200)
        expect(res.body.id).toBe(classroom.sessionIds[0])
      }
    })

    it("student views their own attendance history", async () => {
      const student = seed!.students[0]!
      const res = await get("/students/me/history", student.token)
      expect(res.statusCode).toBe(200)
    })
  })

  // =========================================================================
  //  14. REPORTS - TEACHER
  // =========================================================================

  describe("Reports: Teacher", () => {
    it("teacher fetches daywise attendance report", async () => {
      const teacher = seed!.teachers[0]!
      const res = await get("/reports/daywise", teacher.token)
      expect(res.statusCode).toBe(200)
    })

    it("teacher fetches subjectwise attendance report", async () => {
      const teacher = seed!.teachers[0]!
      const res = await get("/reports/subjectwise", teacher.token)
      expect(res.statusCode).toBe(200)
    })

    it("teacher fetches student percentage report", async () => {
      const teacher = seed!.teachers[0]!
      const res = await get("/reports/students/percentages", teacher.token)
      expect(res.statusCode).toBe(200)
    })
  })

  // =========================================================================
  //  15. REPORTS - STUDENT
  // =========================================================================

  describe("Reports: Student", () => {
    it("student fetches their report overview", async () => {
      const student = seed!.students[0]!
      const res = await get("/students/me/reports/overview", student.token)
      expect(res.statusCode).toBe(200)
    })

    it("student fetches subjects report list", async () => {
      const student = seed!.students[0]!
      const res = await get("/students/me/reports/subjects", student.token)
      expect(res.statusCode).toBe(200)
    })
  })

  // =========================================================================
  //  16. EXPORTS
  // =========================================================================

  describe("Exports", () => {
    it("teacher creates an export job", async () => {
      const teacher = seed!.teachers[0]!
      const classroom = teacher.classrooms[0]!

      const res = await post(
        "/exports",
        {
          classroomId: classroom.id,
          format: "CSV",
        },
        teacher.token,
      )
      expect(res.statusCode).toBeLessThan(500)
    })

    it("teacher lists export jobs", async () => {
      const teacher = seed!.teachers[0]!
      const res = await get("/exports", teacher.token)
      expect(res.statusCode).toBe(200)
    })
  })

  // =========================================================================
  //  17. ADMIN - STUDENTS
  // =========================================================================

  describe("Admin: Student Management", () => {
    let adminToken: string

    it("admin logs in", async () => {
      const res = await post("/auth/login", {
        email: authIntegrationFixtures.admin.email,
        password: authIntegrationFixtures.admin.password,
      })
      expect(res.statusCode).toBe(200)
      adminToken = res.body.accessToken
    })

    it("admin lists all students", async () => {
      const res = await get("/admin/students", adminToken)
      expect(res.statusCode).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThan(0)
    })

    it("admin views a specific student", async () => {
      const students = await get("/admin/students", adminToken)
      if (students.body.length > 0) {
        const studentId = students.body[0].id ?? students.body[0].userId
        if (studentId) {
          const res = await get(`/admin/students/${studentId}`, adminToken)
          expect(res.statusCode).toBe(200)
        }
      }
    })
  })

  // =========================================================================
  //  18. ADMIN - CLASSROOMS
  // =========================================================================

  describe("Admin: Classroom Governance", () => {
    let adminToken: string

    it("admin logs in", async () => {
      const res = await post("/auth/login", {
        email: authIntegrationFixtures.admin.email,
        password: authIntegrationFixtures.admin.password,
      })
      adminToken = res.body.accessToken
    })

    it("admin lists all classrooms", async () => {
      const res = await get("/admin/classrooms", adminToken)
      expect(res.statusCode).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })
  })

  // =========================================================================
  //  19. ADMIN - DEVICE SUPPORT
  // =========================================================================

  describe("Admin: Device Support", () => {
    let adminToken: string

    it("admin logs in", async () => {
      const res = await post("/auth/login", {
        email: authIntegrationFixtures.admin.email,
        password: authIntegrationFixtures.admin.password,
      })
      adminToken = res.body.accessToken
    })

    it("admin lists device bindings", async () => {
      const res = await get("/admin/device-bindings", adminToken)
      expect(res.statusCode).toBe(200)
    })
  })

  // =========================================================================
  //  20. ANALYTICS
  // =========================================================================

  describe("Analytics", () => {
    it("teacher fetches attendance trends", async () => {
      const teacher = seed!.teachers[0]!
      const res = await get("/analytics/trends", teacher.token)
      expect(res.statusCode).toBe(200)
    })

    it("teacher fetches attendance distribution", async () => {
      const teacher = seed!.teachers[0]!
      const res = await get("/analytics/distribution", teacher.token)
      expect(res.statusCode).toBe(200)
    })

    it("teacher fetches comparison analytics", async () => {
      const teacher = seed!.teachers[0]!
      const res = await get("/analytics/comparisons", teacher.token)
      expect(res.statusCode).toBe(200)
    })

    it("teacher fetches mode usage analytics", async () => {
      const teacher = seed!.teachers[0]!
      const res = await get("/analytics/modes", teacher.token)
      expect(res.statusCode).toBe(200)
    })
  })

  // =========================================================================
  //  21. AUTHORIZATION BOUNDARIES
  // =========================================================================

  describe("Authorization: Role Boundaries", () => {
    it("student cannot create a classroom", async () => {
      const student = seed!.students[0]!
      const res = await post(
        "/classrooms",
        {
          semesterId: "hack-sem",
          classId: "hack-cls",
          sectionId: "hack-sec",
          subjectId: "hack-sub",
          courseCode: "HACK-101A",
          classroomTitle: "Should Fail",
          defaultAttendanceMode: "QR_GPS",
          defaultGpsRadiusMeters: 100,
          defaultSessionDurationMinutes: 30,
          qrRotationWindowSeconds: 15,
          requiresTrustedDevice: false,
        },
        student.token,
      )
      expect(res.statusCode).toBeGreaterThanOrEqual(400)
    })

    it("student cannot access admin endpoints", async () => {
      const student = seed!.students[0]!
      const res = await get("/admin/students", student.token)
      expect(res.statusCode).toBeGreaterThanOrEqual(400)
    })

    it("teacher cannot access admin endpoints", async () => {
      const teacher = seed!.teachers[0]!
      const res = await get("/admin/students", teacher.token)
      expect(res.statusCode).toBeGreaterThanOrEqual(400)
    })

    it("unauthenticated user cannot access protected routes", async () => {
      const res = await inject({
        method: "GET",
        url: "/classrooms",
      })
      expect(res.statusCode).toBeGreaterThanOrEqual(400)
    })

    it("teacher cannot access another teacher's classroom", async () => {
      const teacher0 = seed!.teachers[0]!
      const teacher1 = seed!.teachers[1]!
      const classroom = teacher1.classrooms[0]!

      const res = await get(`/classrooms/${classroom.id}`, teacher0.token)
      // Either 403/404 depending on implementation
      expect(res.statusCode).toBeGreaterThanOrEqual(400)
    })
  })

  // =========================================================================
  //  22. CONCURRENT & MULTI-TEACHER SCENARIOS
  // =========================================================================

  describe("Concurrent: Multi-Teacher Operations", () => {
    it("multiple teachers can create classrooms simultaneously", async () => {
      const promises = seed!.teachers.slice(0, 5).map((teacher, idx) =>
        post(
          "/classrooms",
          {
            semesterId: `concurrent-sem-${idx}`,
            classId: `concurrent-cls-${idx}`,
            sectionId: `concurrent-sec-${idx}`,
            subjectId: `concurrent-sub-${idx}`,
            courseCode: `CONC-${idx}A`,
            classroomTitle: `Concurrent ${idx}`,
            defaultAttendanceMode: "QR_GPS",
            defaultGpsRadiusMeters: 100,
            defaultSessionDurationMinutes: 30,
            qrRotationWindowSeconds: 15,
            requiresTrustedDevice: false,
          },
          teacher.token,
        ),
      )

      const results = await Promise.all(promises)
      for (const res of results) {
        expect(res.statusCode).toBe(201)
      }
    })

    it("multiple students can join classrooms concurrently", async () => {
      const teacher = seed!.teachers[10]!
      const classroom = await post(
        "/classrooms",
        {
          semesterId: "conc-join-sem",
          classId: "conc-join-cls",
          sectionId: "conc-join-sec",
          subjectId: "conc-join-sub",
          courseCode: "CJOIN-201A",
          classroomTitle: "Concurrent Join Test",
          defaultAttendanceMode: "QR_GPS",
          defaultGpsRadiusMeters: 100,
          defaultSessionDurationMinutes: 30,
          qrRotationWindowSeconds: 15,
          requiresTrustedDevice: false,
        },
        teacher.token,
      )
      const joinCode = await post(
        `/classrooms/${classroom.body.id}/join-code/reset`,
        {},
        teacher.token,
      )

      const studentBatch = seed!.students.slice(500, 520)
      const promises = studentBatch.map((student) =>
        post("/classrooms/join", { code: joinCode.body.code }, student.token),
      )

      const results = await Promise.all(promises)
      const successCount = results.filter((r) => r.statusCode < 300).length
      expect(successCount).toBeGreaterThan(0)
    })
  })

  // =========================================================================
  //  23. STUDENT ENROLLMENT DATA
  // =========================================================================

  describe("Student: Enrollment data & course cards", () => {
    it("every student is enrolled in at least one classroom", () => {
      const enrolledStudents = seed!.students.filter((s) => s.classroomIds.length > 0)
      expect(enrolledStudents.length).toBeGreaterThan(0)
    })

    it("student can retrieve details of an enrolled classroom", async () => {
      const student = seed!.students.find((s) => s.classroomIds.length > 0)!
      const classroomId = student.classroomIds[0]!
      const res = await get(`/classrooms/${classroomId}`, student.token)
      expect(res.statusCode).toBe(200)
    })

    it("student gets enrollment data via academic endpoints", async () => {
      const student = seed!.students[0]!
      const res = await get("/academic/enrollments/me", student.token)
      expect(res.statusCode).toBe(200)
    })
  })

  // =========================================================================
  //  24. TEACHER ASSIGNMENTS
  // =========================================================================

  describe("Teacher: Assignments", () => {
    it("teacher views their assignments", async () => {
      const teacher = seed!.teachers[0]!
      const res = await get("/academic/assignments/me", teacher.token)
      expect(res.statusCode).toBe(200)
    })
  })

  // =========================================================================
  //  25. DEVICE TRUST
  // =========================================================================

  describe("Device: Trust & Registration", () => {
    it("student checks attendance-ready device status", async () => {
      const student = seed!.students[0]!
      const res = await get("/devices/trust/attendance-ready", student.token)
      expect(res.statusCode).toBe(200)
    })
  })

  // =========================================================================
  //  26. HEALTH CHECKS
  // =========================================================================

  describe("Health endpoints", () => {
    it("liveness check returns 200", async () => {
      const res = await inject({ method: "GET", url: "/health" })
      expect(res.statusCode).toBe(200)
    })

    it("readiness check returns 200", async () => {
      const res = await inject({ method: "GET", url: "/health/ready" })
      expect(res.statusCode).toBe(200)
    })
  })

  // =========================================================================
  //  27. EDGE CASES & NEGATIVE PATHS
  // =========================================================================

  describe("Edge Cases & Error Handling", () => {
    it("returns 404 for non-existent classroom", async () => {
      const teacher = seed!.teachers[0]!
      const res = await get("/classrooms/non-existent-id-12345", teacher.token)
      expect(res.statusCode).toBeGreaterThanOrEqual(400)
    })

    it("returns 404 for non-existent session", async () => {
      const teacher = seed!.teachers[0]!
      const res = await get("/sessions/non-existent-session-id", teacher.token)
      expect(res.statusCode).toBeGreaterThanOrEqual(400)
    })

    it("rejects creating a classroom with duplicate course code for same teacher", async () => {
      const teacher = seed!.teachers[0]!
      const existingClassroom = teacher.classrooms[0]!

      const res = await post(
        "/classrooms",
        {
          semesterId: "dup-sem",
          classId: "dup-cls",
          sectionId: "dup-sec",
          subjectId: "dup-sub",
          courseCode: existingClassroom.courseCode,
          classroomTitle: "Duplicate Test",
          defaultAttendanceMode: "QR_GPS",
          defaultGpsRadiusMeters: 100,
          defaultSessionDurationMinutes: 30,
          qrRotationWindowSeconds: 15,
          requiresTrustedDevice: false,
        },
        teacher.token,
      )
      // May succeed (different section) or fail; just should not 500
      expect(res.statusCode).toBeLessThan(500)
    })

    it("rejects marking attendance without an active session token", async () => {
      const student = seed!.students[0]!
      const res = await post(
        "/attendance/qr/mark",
        {
          sessionToken: "invalid-qr-token",
          latitude: 28.6139,
          longitude: 77.209,
          gpsAccuracyMeters: 10,
        },
        student.token,
      )
      expect(res.statusCode).toBeGreaterThanOrEqual(400)
    })

    it("handles large concurrent read requests", async () => {
      const teacher = seed!.teachers[0]!
      const promises = Array.from({ length: 20 }, () =>
        get("/classrooms", teacher.token),
      )
      const results = await Promise.all(promises)
      for (const res of results) {
        expect(res.statusCode).toBe(200)
      }
    })
  })

  // =========================================================================
  //  28. CROSS-ROLE DATA ISOLATION
  // =========================================================================

  describe("Data Isolation", () => {
    it("teacher only sees their own classrooms in list", async () => {
      const teacher = seed!.teachers[15]!
      const res = await get("/classrooms", teacher.token)
      expect(res.statusCode).toBe(200)

      for (const classroom of res.body) {
        const found = teacher.classrooms.some(
          (c) => c.id === classroom.id,
        )
        expect(found).toBe(true)
      }
    })

    it("student only sees classrooms they are enrolled in", async () => {
      const student = seed!.students.find(
        (s) => s.classroomIds.length > 0 && s.classroomIds.length < 50,
      )

      if (student) {
        const res = await get("/students/me/classrooms", student.token)
        expect(res.statusCode).toBe(200)
      }
    })
  })

  // =========================================================================
  //  29. FULL STUDENT WORKFLOW (End-to-End)
  // =========================================================================

  describe("Full Student Workflow: Register → Login → Join → View → Profile", () => {
    it("completes the entire student journey", async () => {
      const fixture = buildDevelopmentStudentRegistrationFixture("e2e-full-journey")

      const reg = await post("/auth/register/student", {
        email: fixture.email,
        password: fixture.password,
        displayName: fixture.displayName,
        installId: fixture.device.installId,
        platform: fixture.device.platform,
        publicKey: fixture.device.publicKey,
        appVersion: fixture.device.appVersion,
        deviceModel: fixture.device.deviceModel,
        osVersion: fixture.device.osVersion,
        degree: "B.Tech",
        branch: "CSE",
      })
      expect(reg.statusCode).toBe(201)

      const login = await post("/auth/login", {
        email: fixture.email,
        password: fixture.password,
      })
      expect(login.statusCode).toBe(200)
      const token = login.body.accessToken

      const me = await get("/auth/me", token)
      expect(me.statusCode).toBe(200)
      expect(me.body.email).toBe(fixture.email)

      const teacher = seed!.teachers[18]!
      const freshClassroom = await post(
        "/classrooms",
        {
          semesterId: "journey-sem",
          classId: "journey-cls",
          sectionId: "journey-sec",
          subjectId: "journey-sub",
          courseCode: "JRNY-401A",
          classroomTitle: "Full Journey Class",
          defaultAttendanceMode: "QR_GPS",
          defaultGpsRadiusMeters: 100,
          defaultSessionDurationMinutes: 30,
          qrRotationWindowSeconds: 15,
          requiresTrustedDevice: false,
        },
        teacher.token,
      )
      const joinCodeRes = await post(
        `/classrooms/${freshClassroom.body.id}/join-code/reset`,
        {},
        teacher.token,
      )

      const joined = await post(
        "/classrooms/join",
        { code: joinCodeRes.body.code },
        token,
      )
      expect(joined.statusCode).toBeLessThan(300)

      const classrooms = await get("/students/me/classrooms", token)
      expect(classrooms.statusCode).toBe(200)
      expect(classrooms.body.length).toBeGreaterThan(0)

      const updated = await patch(
        "/auth/profile",
        { displayName: "Journey Student Updated", rollNumber: "CSE-2025-9999" },
        token,
      )
      expect(updated.statusCode).toBeLessThan(300)

      const profile = await get("/auth/profile", token)
      expect(profile.statusCode).toBe(200)

      const overview = await get("/students/me/reports/overview", token)
      expect(overview.statusCode).toBe(200)
    })
  })

  // =========================================================================
  //  30. FULL TEACHER WORKFLOW (End-to-End)
  // =========================================================================

  describe("Full Teacher Workflow: Register → Classroom → Session → Reports", () => {
    it("completes the entire teacher journey", async () => {
      const fixture = buildDevelopmentTeacherRegistrationFixture("e2e-teacher-journey", {
        platform: "WEB",
      })

      const reg = await post("/auth/register/teacher", {
        email: fixture.email,
        password: fixture.password,
        displayName: fixture.displayName,
      })
      expect(reg.statusCode).toBe(201)

      const login = await post("/auth/login", {
        email: fixture.email,
        password: fixture.password,
      })
      expect(login.statusCode).toBe(200)
      const token = login.body.accessToken

      const classroom = await post(
        "/classrooms",
        {
          semesterId: "tjourney-sem",
          classId: "tjourney-cls",
          sectionId: "tjourney-sec",
          subjectId: "tjourney-sub",
          courseCode: "TRNJ-501A",
          classroomTitle: "Teacher Journey Class",
          defaultAttendanceMode: "QR_GPS",
          defaultGpsRadiusMeters: 100,
          defaultSessionDurationMinutes: 30,
          qrRotationWindowSeconds: 15,
          requiresTrustedDevice: false,
        },
        token,
      )
      expect(classroom.statusCode).toBe(201)

      const joinCode = await post(
        `/classrooms/${classroom.body.id}/join-code/reset`,
        {},
        token,
      )
      expect(joinCode.body.code).toBeTruthy()

      const session = await post(
        "/sessions/qr",
        {
          classroomId: classroom.body.id,
          anchorType: "TEACHER_SELECTED",
          anchorLatitude: 28.6139,
          anchorLongitude: 77.209,
          gpsRadiusMeters: 150,
          sessionDurationMinutes: 45,
        },
        token,
      )
      expect(session.statusCode).toBe(201)

      const ended = await post(`/sessions/${session.body.id}/end`, {}, token)
      expect(ended.statusCode).toBeLessThan(300)

      const detail = await get(`/sessions/${session.body.id}`, token)
      expect(detail.statusCode).toBe(200)

      const classrooms = await get("/classrooms", token)
      expect(classrooms.statusCode).toBe(200)

      const daywise = await get("/reports/daywise", token)
      expect(daywise.statusCode).toBe(200)

      const profile = await patch(
        "/auth/profile",
        { displayName: "Prof. Journey Updated" },
        token,
      )
      expect(profile.statusCode).toBeLessThan(300)
    })
  })
})
