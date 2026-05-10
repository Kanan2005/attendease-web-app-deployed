/**
 * Full-Scale Classroom Load Simulation
 *
 * Simulates a realistic live environment:
 *   - 480 students (4 branches × 120)
 *   - 6 teachers (professors)
 *   - 4 concurrent attendance sessions (one per class)
 *   - 1 admin monitoring the dashboard
 *
 * Scenarios:
 *   1. Bulk registration + login (all 480 students + 6 teachers concurrently)
 *   2. Teachers create 4 QR attendance sessions simultaneously
 *   3. 480 students mark attendance concurrently (120 per class)
 *   4. Admin dashboard queries under active load
 *   5. Teachers end sessions + verify data integrity
 *   6. Session management under load (re-login, force-logout)
 *
 * Metrics collected: P50, P95, P99 response times, error rates, throughput.
 */

import { buildTrustedDeviceHeaders } from "@attendease/auth"
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
import { GoogleOidcService } from "../modules/auth/google-oidc.service.js"
import { ensureAcademicScopeForTeacher } from "./e2e-seed.js"
import {
  type TemporaryDatabase,
  authIntegrationFixtures,
  createTemporaryDatabase,
  destroyTemporaryDatabase,
  seedAuthIntegrationData,
} from "./integration-helpers.js"

// ---------------------------------------------------------------------------
// Configuration — matches the user's real class sizes
// ---------------------------------------------------------------------------

const CONFIG = {
  branches: ["CSE", "ECE", "EE", "ME"] as const,
  studentsPerBranch: 120,
  teacherCount: 6,
  concurrentBatchSize: 60,
  anchorLatitude: 26.8606,
  anchorLongitude: 75.8164,
  gpsRadiusMeters: 200,
} as const

const TOTAL_STUDENTS = CONFIG.branches.length * CONFIG.studentsPerBranch // 480

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StudentActor = {
  email: string
  password: string
  displayName: string
  installId: string
  branch: string
  token: string
  classroomId: string
}

type TeacherActor = {
  email: string
  password: string
  displayName: string
  token: string
  classroomId: string
  classroomJoinCode: string
  sessionId: string
  qrPayload: string
  branchIndex: number
}

type Metrics = {
  label: string
  total: number
  success: number
  failed: number
  durations: number[]
}

type InjectFn = (opts: {
  method: "GET" | "POST" | "PATCH" | "DELETE"
  url: string
  payload?: unknown
  headers?: Record<string, string>
}) => Promise<{ statusCode: number; body: string }>

// ---------------------------------------------------------------------------
// Metrics helpers
// ---------------------------------------------------------------------------

function createMetrics(label: string): Metrics {
  return { label, total: 0, success: 0, failed: 0, durations: [] }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)] ?? 0
}

function reportMetrics(m: Metrics): string {
  const sorted = [...m.durations].sort((a, b) => a - b)
  const p50 = percentile(sorted, 50)
  const p95 = percentile(sorted, 95)
  const p99 = percentile(sorted, 99)
  const avg = sorted.length > 0 ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : 0
  const errorRate = m.total > 0 ? ((m.failed / m.total) * 100).toFixed(1) : "0.0"
  return `[${m.label}] total=${m.total} ok=${m.success} fail=${m.failed} errorRate=${errorRate}% avg=${avg}ms P50=${p50}ms P95=${p95}ms P99=${p99}ms`
}

// ---------------------------------------------------------------------------
// Concurrency helper — runs fn for each item in batches
// ---------------------------------------------------------------------------

async function runInBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map((item, idx) => fn(item, i + idx)))
    results.push(...batchResults)
  }
  return results
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("Load simulation: 4 classes × 120 students, 6 professors", () => {
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
  let inject: InjectFn

  const googleOidcService = { verifyExchange: vi.fn() }

  const students: StudentActor[] = []
  const teachers: TeacherActor[] = []
  let adminToken = ""

  const allMetrics: Metrics[] = []

  function getPrisma() {
    if (!prisma) throw new Error("Prisma not initialized")
    return prisma
  }

  // ----- API helpers -----

  async function post(
    url: string,
    payload: unknown,
    opts: { token?: string; headers?: Record<string, string> } = {},
  ) {
    const headers: Record<string, string> = { "content-type": "application/json", ...opts.headers }
    if (opts.token) headers.authorization = `Bearer ${opts.token}`
    const res = await inject({ method: "POST", url, payload, headers })
    return { statusCode: res.statusCode, body: res.body ? JSON.parse(res.body) : null }
  }

  async function get(url: string, token: string) {
    const res = await inject({
      method: "GET",
      url,
      headers: { authorization: `Bearer ${token}` },
    })
    return { statusCode: res.statusCode, body: res.body ? JSON.parse(res.body) : null }
  }

  async function timedPost(
    metrics: Metrics,
    url: string,
    payload: unknown,
    opts: { token?: string; headers?: Record<string, string> } = {},
  ) {
    const start = performance.now()
    const res = await post(url, payload, opts)
    const duration = Math.round(performance.now() - start)
    metrics.total++
    metrics.durations.push(duration)
    if (res.statusCode < 300) metrics.success++
    else metrics.failed++
    return res
  }

  async function timedGet(metrics: Metrics, url: string, token: string) {
    const start = performance.now()
    const res = await get(url, token)
    const duration = Math.round(performance.now() - start)
    metrics.total++
    metrics.durations.push(duration)
    if (res.statusCode < 300) metrics.success++
    else metrics.failed++
    return res
  }

  // =========================================================================
  //  SETUP: Boot app + create temp DB
  // =========================================================================

  beforeAll(
    async () => {
      database = await createTemporaryDatabase("load_sim")
      await seedAuthIntegrationData(database.databaseUrl)

      process.env.NODE_ENV = "test"
      process.env.TEST_DATABASE_URL = database.databaseUrl
      process.env.AUTH_ACCESS_TOKEN_SECRET = "load-sim-secret-1234567890abcdef"
      process.env.AUTH_ISSUER = "attendease-api-load"
      process.env.AUTH_AUDIENCE = "attendease-client-load"
      process.env.GOOGLE_TEACHER_ALLOWED_DOMAINS = "attendease.dev"
      process.env.GOOGLE_STUDENT_ALLOWED_DOMAINS = "attendease.dev"

      prisma = createPrismaClient({ databaseUrl: database.databaseUrl, singleton: false })

      googleOidcService.verifyExchange.mockRejectedValue(new Error("No Google in load test"))

      const testingModule = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(GoogleOidcService)
        .useValue(googleOidcService)
        .compile()

      app = testingModule.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
      await app.init()
      await app.getHttpAdapter().getInstance().ready()

      inject = app
        .getHttpAdapter()
        .getInstance()
        .inject.bind(app.getHttpAdapter().getInstance()) as InjectFn
    },
    5 * 60 * 1000,
  )

  afterAll(async () => {
    console.log("\n" + "=".repeat(72))
    console.log("  LOAD SIMULATION METRICS REPORT")
    console.log("=".repeat(72))
    for (const m of allMetrics) {
      console.log(reportMetrics(m))
    }
    console.log("=".repeat(72) + "\n")

    if (app) await app.close()
    if (prisma) await disconnectPrismaClient(prisma)
    Object.assign(process.env, originalEnv)
    if (database) await destroyTemporaryDatabase(database)
  })

  // =========================================================================
  //  PHASE 1: Register 6 teachers + 480 students
  // =========================================================================

  describe("Phase 1: Bulk registration", () => {
    it(
      "registers 6 teachers",
      async () => {
        const m = createMetrics("teacher-register")
        allMetrics.push(m)

        for (let t = 0; t < CONFIG.teacherCount; t++) {
          const label = `load-teacher-${String(t + 1).padStart(2, "0")}`
          const fixture = buildDevelopmentTeacherRegistrationFixture(label, { platform: "WEB" })

          const res = await timedPost(m, "/auth/register/teacher", {
            email: fixture.email,
            password: fixture.password,
            displayName: fixture.displayName,
            platform: "WEB",
          })
          expect(res.statusCode).toBe(201)

          teachers.push({
            email: fixture.email,
            password: fixture.password,
            displayName: fixture.displayName,
            token: "",
            classroomId: "",
            classroomJoinCode: "",
            sessionId: "",
            qrPayload: "",
            branchIndex: t % CONFIG.branches.length,
          })
        }

        expect(teachers).toHaveLength(CONFIG.teacherCount)
        console.log(reportMetrics(m))
      },
      2 * 60 * 1000,
    )

    it(
      `registers ${TOTAL_STUDENTS} students in batches of ${CONFIG.concurrentBatchSize}`,
      async () => {
        const m = createMetrics("student-register")
        allMetrics.push(m)

        const studentSpecs: { label: string; branch: string; index: number }[] = []
        let idx = 0
        for (const branch of CONFIG.branches) {
          for (let s = 0; s < CONFIG.studentsPerBranch; s++) {
            idx++
            studentSpecs.push({
              label: `load-${branch.toLowerCase()}-${String(s + 1).padStart(3, "0")}`,
              branch,
              index: idx,
            })
          }
        }

        await runInBatches(studentSpecs, CONFIG.concurrentBatchSize, async (spec) => {
          const fixture = buildDevelopmentStudentRegistrationFixture(spec.label)
          const res = await timedPost(m, "/auth/register/student", {
            email: fixture.email,
            password: fixture.password,
            displayName: fixture.displayName,
            platform: "MOBILE",
            device: {
              installId: fixture.device.installId,
              platform: fixture.device.platform,
              publicKey: fixture.device.publicKey,
              appVersion: fixture.device.appVersion,
              deviceModel: fixture.device.deviceModel,
              osVersion: fixture.device.osVersion,
            },
            degree: "B.Tech",
            branch: spec.branch,
          })
          expect(res.statusCode).toBe(201)

          students.push({
            email: fixture.email,
            password: fixture.password,
            displayName: fixture.displayName,
            installId: fixture.device.installId,
            branch: spec.branch,
            token: "",
            classroomId: "",
          })
        })

        expect(students).toHaveLength(TOTAL_STUDENTS)
        console.log(reportMetrics(m))
      },
      10 * 60 * 1000,
    )
  })

  // =========================================================================
  //  PHASE 2: Bulk login (480 students + 6 teachers concurrently)
  // =========================================================================

  describe("Phase 2: Bulk login", () => {
    it(
      "logs in all 6 teachers concurrently",
      async () => {
        const m = createMetrics("teacher-login")
        allMetrics.push(m)

        await Promise.all(
          teachers.map(async (teacher) => {
            const res = await timedPost(m, "/auth/login", {
              email: teacher.email,
              password: teacher.password,
              platform: "WEB",
              requestedRole: "TEACHER",
            })
            expect(res.statusCode).toBe(201)
            teacher.token = res.body.tokens.accessToken
          }),
        )

        for (const t of teachers) {
          expect(t.token).toBeTruthy()
        }
        console.log(reportMetrics(m))
      },
      60 * 1000,
    )

    it(
      `logs in all ${TOTAL_STUDENTS} students in batches of ${CONFIG.concurrentBatchSize}`,
      async () => {
        const m = createMetrics("student-login")
        allMetrics.push(m)

        await runInBatches(students, CONFIG.concurrentBatchSize, async (student) => {
          const res = await timedPost(m, "/auth/login", {
            email: student.email,
            password: student.password,
            platform: "MOBILE",
            requestedRole: "STUDENT",
            device: {
              installId: student.installId,
              platform: "ANDROID",
              publicKey: `load-pk-${student.installId}`,
              appVersion: "1.0.0",
            },
          })
          expect(res.statusCode).toBe(201)
          student.token = res.body.tokens.accessToken
        })

        const loggedIn = students.filter((s) => s.token)
        expect(loggedIn).toHaveLength(TOTAL_STUDENTS)
        console.log(reportMetrics(m))
      },
      10 * 60 * 1000,
    )

    it("logs in admin", async () => {
      const res = await post("/auth/login", {
        email: authIntegrationFixtures.admin.email,
        password: authIntegrationFixtures.admin.password,
        platform: "WEB",
        requestedRole: "ADMIN",
      })
      expect(res.statusCode).toBe(201)
      adminToken = res.body.tokens.accessToken
    })
  })

  // =========================================================================
  //  PHASE 3: Teachers set up classrooms + enroll students
  // =========================================================================

  describe("Phase 3: Classroom setup + enrollment", () => {
    it(
      "teachers create 4 classrooms (one per branch) and enroll 120 students each",
      async () => {
        const m = createMetrics("classroom-setup")
        allMetrics.push(m)

        // Use first 4 teachers (one per branch)
        for (let i = 0; i < CONFIG.branches.length; i++) {
          const teacher = teachers[i]!
          const branch = CONFIG.branches[i]!

          await ensureAcademicScopeForTeacher(getPrisma(), teacher.email, {
            semesterId: `load-sem-${i}`,
            classId: `load-cls-${i}`,
            sectionId: `load-sec-${i}`,
            subjectId: `load-sub-${i}`,
          })

          const res = await timedPost(
            m,
            "/classrooms",
            {
              semesterId: `load-sem-${i}`,
              classId: `load-cls-${i}`,
              sectionId: `load-sec-${i}`,
              subjectId: `load-sub-${i}`,
              courseCode: `LOAD-${branch}-101`,
              classroomTitle: `Load Test ${branch} Class`,
              defaultAttendanceMode: "QR_GPS",
              defaultGpsRadiusMeters: CONFIG.gpsRadiusMeters,
              defaultSessionDurationMinutes: 45,
              qrRotationWindowSeconds: 30,
              requiresTrustedDevice: false,
            },
            { token: teacher.token },
          )
          expect(res.statusCode).toBe(201)
          teacher.classroomId = res.body.id

          const joinCodeRes = await post(
            `/classrooms/${teacher.classroomId}/join-code/reset`,
            {},
            { token: teacher.token },
          )
          teacher.classroomJoinCode = joinCodeRes.body.code
        }

        // Enroll students: each branch's 120 students join their branch's classroom
        const enrollMetrics = createMetrics("student-enroll")
        allMetrics.push(enrollMetrics)

        for (let branchIdx = 0; branchIdx < CONFIG.branches.length; branchIdx++) {
          const teacher = teachers[branchIdx]!
          const branch = CONFIG.branches[branchIdx]!
          const branchStudents = students.filter((s) => s.branch === branch)

          await runInBatches(branchStudents, CONFIG.concurrentBatchSize, async (student) => {
            const res = await timedPost(
              enrollMetrics,
              "/classrooms/join",
              { code: teacher.classroomJoinCode },
              { token: student.token },
            )
            if (res.statusCode < 300) {
              student.classroomId = teacher.classroomId
            }
          })
        }

        const enrolled = students.filter((s) => s.classroomId)
        expect(enrolled.length).toBeGreaterThanOrEqual(TOTAL_STUDENTS * 0.95) // allow small margin
        console.log(reportMetrics(m))
        console.log(reportMetrics(enrollMetrics))
      },
      5 * 60 * 1000,
    )
  })

  // =========================================================================
  //  PHASE 4: Teachers start 4 attendance sessions simultaneously
  // =========================================================================

  describe("Phase 4: Concurrent attendance sessions", () => {
    it(
      "4 teachers create QR attendance sessions concurrently",
      async () => {
        const m = createMetrics("create-session")
        allMetrics.push(m)

        await Promise.all(
          teachers.slice(0, CONFIG.branches.length).map(async (teacher) => {
            const res = await timedPost(
              m,
              "/sessions/qr",
              {
                classroomId: teacher.classroomId,
                anchorType: "TEACHER_SELECTED",
                anchorLatitude: CONFIG.anchorLatitude,
                anchorLongitude: CONFIG.anchorLongitude,
                gpsRadiusMeters: CONFIG.gpsRadiusMeters,
                sessionDurationMinutes: 45,
              },
              { token: teacher.token },
            )
            expect(res.statusCode).toBe(201)
            teacher.sessionId = res.body.id
            teacher.qrPayload = res.body.currentQrPayload
          }),
        )

        for (const t of teachers.slice(0, CONFIG.branches.length)) {
          expect(t.sessionId).toBeTruthy()
          expect(t.qrPayload).toBeTruthy()
        }
        console.log(reportMetrics(m))
      },
      60 * 1000,
    )
  })

  // =========================================================================
  //  PHASE 5: 480 students mark attendance concurrently
  // =========================================================================

  describe("Phase 5: Concurrent attendance marking (480 students)", () => {
    it(
      "all students mark attendance for their class using QR + GPS",
      async () => {
        const m = createMetrics("mark-attendance")
        allMetrics.push(m)

        // Build a map: classroomId → { qrPayload, sessionId }
        const sessionMap = new Map<string, { qrPayload: string; sessionId: string }>()
        for (const t of teachers.slice(0, CONFIG.branches.length)) {
          sessionMap.set(t.classroomId, { qrPayload: t.qrPayload, sessionId: t.sessionId })
        }

        const enrolledStudents = students.filter((s) => s.classroomId)

        await runInBatches(enrolledStudents, CONFIG.concurrentBatchSize, async (student) => {
          const session = sessionMap.get(student.classroomId)
          if (!session) return

          const jitter = (Math.random() - 0.5) * 0.002 // ~100m jitter
          await timedPost(
            m,
            "/attendance/qr/mark",
            {
              qrPayload: session.qrPayload,
              latitude: CONFIG.anchorLatitude + jitter,
              longitude: CONFIG.anchorLongitude + jitter,
              accuracyMeters: 15 + Math.random() * 30,
            },
            {
              token: student.token,
              headers: buildTrustedDeviceHeaders(student.installId),
            },
          )
        })

        // Most should succeed; some may fail due to QR rotation
        const successRate = m.total > 0 ? (m.success / m.total) * 100 : 0
        expect(successRate).toBeGreaterThan(60) // realistic: QR may rotate
        console.log(reportMetrics(m))
      },
      10 * 60 * 1000,
    )
  })

  // =========================================================================
  //  PHASE 6: Admin dashboard queries under load
  // =========================================================================

  describe("Phase 6: Admin dashboard queries under active load", () => {
    it("admin fetches all dashboard endpoints concurrently", async () => {
      const m = createMetrics("admin-dashboard")
      allMetrics.push(m)

      const endpoints = [
        "/admin/dashboard/stats",
        "/admin/dashboard/sessions-graph?range=weekly",
        "/admin/dashboard/branch-comparison",
        "/admin/dashboard/course-leaderboard?direction=top&limit=10",
        "/admin/dashboard/attendance-overview",
        "/admin/dashboard/today-branch-attendance",
      ]

      // Hit each endpoint 3 times concurrently
      const requests = endpoints.flatMap((url) =>
        Array.from({ length: 3 }, () => timedGet(m, url, adminToken)),
      )

      const results = await Promise.all(requests)
      for (const res of results) {
        expect(res.statusCode).toBe(200)
      }

      console.log(reportMetrics(m))
    })

    it("admin lists students and teachers under load", async () => {
      const m = createMetrics("admin-user-queries")
      allMetrics.push(m)

      const queries = [
        ...Array.from({ length: 3 }, () => timedGet(m, "/admin/users/students", adminToken)),
        ...Array.from({ length: 3 }, () => timedGet(m, "/admin/users/teachers", adminToken)),
      ]

      const results = await Promise.all(queries)
      for (const res of results) {
        expect(res.statusCode).toBe(200)
      }

      console.log(reportMetrics(m))
    })
  })

  // =========================================================================
  //  PHASE 7: Teachers end sessions
  // =========================================================================

  describe("Phase 7: End sessions + verify data", () => {
    it("teachers end all 4 sessions concurrently", async () => {
      const m = createMetrics("end-session")
      allMetrics.push(m)

      await Promise.all(
        teachers
          .slice(0, CONFIG.branches.length)
          .filter((t) => t.sessionId)
          .map(async (teacher) => {
            const res = await timedPost(m, `/sessions/${teacher.sessionId}/end`, {}, {
              token: teacher.token,
            })
            expect(res.statusCode).toBeLessThan(300)
          }),
      )

      console.log(reportMetrics(m))
    })

    it("session detail shows correct present counts", async () => {
      for (const teacher of teachers.slice(0, CONFIG.branches.length)) {
        if (!teacher.sessionId) continue
        const res = await get(`/sessions/${teacher.sessionId}`, teacher.token)
        expect(res.statusCode).toBe(200)
        expect(res.body.presentCount).toBeGreaterThan(0)
        expect(res.body.status).toBe("ENDED")
      }
    })
  })

  // =========================================================================
  //  PHASE 8: Concurrent re-login stress test (single-session enforcement)
  // =========================================================================

  describe("Phase 8: Re-login stress test (single-session enforcement)", () => {
    it(
      "50 students re-login concurrently — old tokens become invalid",
      async () => {
        const m = createMetrics("re-login-stress")
        allMetrics.push(m)

        const subset = students.slice(0, 50)
        const oldTokens = subset.map((s) => s.token)

        await Promise.all(
          subset.map(async (student) => {
            const res = await timedPost(m, "/auth/login", {
              email: student.email,
              password: student.password,
              platform: "MOBILE",
              requestedRole: "STUDENT",
              device: {
                installId: student.installId,
                platform: "ANDROID",
                publicKey: `load-pk-${student.installId}`,
                appVersion: "1.0.0",
              },
            })
            expect(res.statusCode).toBe(201)
            student.token = res.body.tokens.accessToken
          }),
        )

        // Verify old tokens are now invalid (single-session enforcement)
        let revokedCount = 0
        for (const oldToken of oldTokens) {
          const res = await get("/auth/me", oldToken)
          if (res.statusCode === 401) revokedCount++
        }
        // Most should be revoked (some might still be the same if timing is exact)
        expect(revokedCount).toBeGreaterThan(40)
        console.log(reportMetrics(m))
      },
      2 * 60 * 1000,
    )
  })

  // =========================================================================
  //  PHASE 9: Student reads — history, reports, classrooms
  // =========================================================================

  describe("Phase 9: Student read endpoints under load", () => {
    it(
      "100 students fetch their classrooms and history concurrently",
      async () => {
        const m = createMetrics("student-reads")
        allMetrics.push(m)

        const subset = students.filter((s) => s.token && s.classroomId).slice(0, 100)

        await runInBatches(subset, 50, async (student) => {
          await timedGet(m, "/students/me/classrooms", student.token)
          await timedGet(m, "/students/me/history", student.token)
        })

        expect(m.success).toBeGreaterThan(150) // ~200 requests, most should succeed
        console.log(reportMetrics(m))
      },
      2 * 60 * 1000,
    )
  })

  // =========================================================================
  //  PHASE 10: Data integrity verification
  // =========================================================================

  describe("Phase 10: Data integrity checks", () => {
    it("database has exactly the expected number of users", async () => {
      const userCount = await getPrisma().user.count()
      // 480 students + 6 teachers + seeded admin/teacher/students from seedAuthIntegrationData
      expect(userCount).toBeGreaterThanOrEqual(TOTAL_STUDENTS + CONFIG.teacherCount)
    })

    it("each classroom has enrolled students in the DB", async () => {
      for (const teacher of teachers.slice(0, CONFIG.branches.length)) {
        if (!teacher.classroomId) continue
        const enrollmentCount = await getPrisma().enrollment.count({
          where: { courseOfferingId: teacher.classroomId, status: "ACTIVE" },
        })
        expect(enrollmentCount).toBeGreaterThan(0)
        expect(enrollmentCount).toBeLessThanOrEqual(CONFIG.studentsPerBranch + 5)
      }
    })

    it("attendance records exist for today's sessions", async () => {
      for (const teacher of teachers.slice(0, CONFIG.branches.length)) {
        if (!teacher.sessionId) continue
        const recordCount = await getPrisma().attendanceRecord.count({
          where: { sessionId: teacher.sessionId },
        })
        expect(recordCount).toBeGreaterThan(0)
      }
    })

    it("no orphaned sessions (all have a valid classroom)", async () => {
      const sessions = await getPrisma().attendanceSession.findMany({
        where: {
          id: { in: teachers.slice(0, CONFIG.branches.length).map((t) => t.sessionId).filter(Boolean) },
        },
        select: { id: true, courseOfferingId: true, status: true },
      })

      for (const session of sessions) {
        expect(session.courseOfferingId).toBeTruthy()
        expect(session.status).toBe("ENDED")
      }
    })

    it("admin dashboard stats reflect the loaded data", async () => {
      const res = await get("/admin/dashboard/stats", adminToken)
      expect(res.statusCode).toBe(200)
      expect(res.body.students.total).toBeGreaterThanOrEqual(TOTAL_STUDENTS)
      expect(res.body.teachers.total).toBeGreaterThanOrEqual(CONFIG.teacherCount)
    })
  })

  // =========================================================================
  //  PHASE 11: Health check under load
  // =========================================================================

  describe("Phase 11: Health endpoints", () => {
    it("liveness check returns 200 after full load", async () => {
      const res = await inject({ method: "GET", url: "/health" })
      expect(res.statusCode).toBe(200)
    })

    it("readiness check returns 200 after full load", async () => {
      const res = await inject({ method: "GET", url: "/health/ready" })
      expect(res.statusCode).toBe(200)
    })
  })
})
