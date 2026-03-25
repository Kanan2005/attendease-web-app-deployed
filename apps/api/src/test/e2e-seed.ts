/**
 * Large-scale E2E data seed.
 *
 * Configurable volumes (defaults):
 *   - 20 teachers
 *   - 800 students
 *   - 6-8 classrooms per teacher (120-160 total)
 *   - Each classroom: 30-60 students enrolled
 *   - Each classroom: 5-10 completed attendance sessions
 */

import {
  buildDevelopmentStudentRegistrationFixture,
  buildDevelopmentTeacherRegistrationFixture,
} from "@attendease/db"

export type SeedTeacher = {
  email: string
  password: string
  displayName: string
  token: string
  classrooms: SeedClassroom[]
}

export type SeedStudent = {
  email: string
  password: string
  displayName: string
  token: string
  installId: string
  classroomIds: string[]
  degree: string
  branch: string
  rollNumber: string
}

export type SeedClassroom = {
  id: string
  code: string
  courseCode: string
  classroomTitle: string
  joinCode: string
  teacherIndex: number
  sessionIds: string[]
  enrolledStudentCount: number
}

export type E2ESeedResult = {
  teachers: SeedTeacher[]
  students: SeedStudent[]
  classrooms: SeedClassroom[]
  totalSessions: number
}

export type E2ESeedConfig = {
  teacherCount: number
  studentCount: number
  classroomsPerTeacher: [min: number, max: number]
  studentsPerClassroom: [min: number, max: number]
  sessionsPerClassroom: [min: number, max: number]
  studentBatchSize: number
}

export const DEFAULT_E2E_SEED_CONFIG: E2ESeedConfig = {
  teacherCount: 20,
  studentCount: 800,
  classroomsPerTeacher: [6, 8],
  studentsPerClassroom: [30, 60],
  sessionsPerClassroom: [5, 10],
  studentBatchSize: 50,
}

type InjectFn = (options: {
  method: "GET" | "POST"
  url: string
  payload?: unknown
  headers?: Record<string, string>
}) => Promise<{ statusCode: number; body: string }>

function pick<T>(array: T[], count: number): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const vi = shuffled[i]
    const vj = shuffled[j]
    if (vi !== undefined && vj !== undefined) {
      shuffled[i] = vj
      shuffled[j] = vi
    }
  }
  return shuffled.slice(0, count)
}

function randBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

async function apiPost(inject: InjectFn, url: string, payload: unknown, token?: string) {
  const headers: Record<string, string> = { "content-type": "application/json" }
  if (token) headers.authorization = `Bearer ${token}`
  const res = await inject({ method: "POST", url, payload, headers })
  if (res.statusCode >= 300) {
    throw new Error(`POST ${url} failed (${res.statusCode}): ${res.body}`)
  }
  return JSON.parse(res.body)
}

async function apiGet(inject: InjectFn, url: string, token: string) {
  const res = await inject({
    method: "GET",
    url,
    headers: { authorization: `Bearer ${token}` },
  })
  if (res.statusCode >= 300) {
    throw new Error(`GET ${url} failed (${res.statusCode}): ${res.body}`)
  }
  return JSON.parse(res.body)
}

const SUBJECT_POOL = [
  "Mathematics",
  "Physics",
  "Computer Science",
  "Electronics",
  "Data Structures",
  "Operating Systems",
  "Machine Learning",
  "Algorithms",
  "Database Systems",
  "Networks",
  "Digital Logic",
  "Discrete Mathematics",
  "Software Engineering",
  "Compiler Design",
  "Artificial Intelligence",
  "Computer Architecture",
] as const

const DEGREE_POOL = ["B.Tech", "M.Tech"] as const
const BRANCH_POOL = ["CSE", "ECE", "EE", "ME", "CHE", "Civil", "Meta"] as const

export async function seedE2EData(
  inject: InjectFn,
  config: E2ESeedConfig = DEFAULT_E2E_SEED_CONFIG,
): Promise<E2ESeedResult> {
  const teachers: SeedTeacher[] = []
  const students: SeedStudent[] = []
  const allClassrooms: SeedClassroom[] = []
  let totalSessions = 0

  for (let t = 1; t <= config.teacherCount; t++) {
    const label = `e2e-teacher-${String(t).padStart(3, "0")}`
    const fixture = buildDevelopmentTeacherRegistrationFixture(label, {
      platform: "WEB",
    })

    await apiPost(inject, "/auth/register/teacher", {
      email: fixture.email,
      password: fixture.password,
      displayName: fixture.displayName,
    })

    const session = await apiPost(inject, "/auth/login", {
      email: fixture.email,
      password: fixture.password,
    })

    teachers.push({
      email: fixture.email,
      password: fixture.password,
      displayName: fixture.displayName,
      token: session.accessToken,
      classrooms: [],
    })
  }

  const batchCount = Math.ceil(config.studentCount / config.studentBatchSize)
  for (let batch = 0; batch < batchCount; batch++) {
    const batchEnd = Math.min(
      config.studentBatchSize,
      config.studentCount - batch * config.studentBatchSize,
    )
    const promises = []
    for (let s = 1; s <= batchEnd; s++) {
      const idx = batch * config.studentBatchSize + s
      const label = `e2e-student-${String(idx).padStart(4, "0")}`
      const fixture = buildDevelopmentStudentRegistrationFixture(label)
      const degree = DEGREE_POOL[idx % DEGREE_POOL.length] ?? "B.Tech"
      const branch = BRANCH_POOL[idx % BRANCH_POOL.length] ?? "CSE"
      const rollNumber = `${branch}-${degree === "B.Tech" ? "UG" : "PG"}-${String(idx).padStart(4, "0")}`

      promises.push(
        (async () => {
          await apiPost(inject, "/auth/register/student", {
            email: fixture.email,
            password: fixture.password,
            displayName: fixture.displayName,
            installId: fixture.device.installId,
            platform: fixture.device.platform,
            publicKey: fixture.device.publicKey,
            appVersion: fixture.device.appVersion,
            deviceModel: fixture.device.deviceModel,
            osVersion: fixture.device.osVersion,
            degree,
            branch,
          })

          const session = await apiPost(inject, "/auth/login", {
            email: fixture.email,
            password: fixture.password,
          })

          return {
            email: fixture.email,
            password: fixture.password,
            displayName: fixture.displayName,
            token: session.accessToken,
            installId: fixture.device.installId,
            classroomIds: [] as string[],
            degree,
            branch,
            rollNumber,
          }
        })(),
      )
    }
    const batchStudents = await Promise.all(promises)
    students.push(...batchStudents)
  }

  for (let t = 0; t < teachers.length; t++) {
    const teacher = teachers[t]
    if (teacher === undefined) {
      throw new Error("E2E seed: teacher index out of range")
    }
    const classroomCount = randBetween(...config.classroomsPerTeacher)

    for (let c = 0; c < classroomCount; c++) {
      const subjectIdx = (t * 8 + c) % SUBJECT_POOL.length
      const subject = SUBJECT_POOL.at(subjectIdx) ?? "Mathematics"
      const courseCode = `${subject.replace(/\s+/g, "").slice(0, 4).toUpperCase()}-${t + 1}${String.fromCharCode(65 + c)}`
      const title = `${subject} (Section ${String.fromCharCode(65 + c)})`

      const created = await apiPost(
        inject,
        "/classrooms",
        {
          semesterId: `e2e-sem-${t + 1}`,
          classId: `e2e-class-${t + 1}`,
          sectionId: `e2e-section-${t + 1}-${c + 1}`,
          subjectId: `e2e-subject-${subjectIdx + 1}`,
          courseCode,
          classroomTitle: title,
          defaultAttendanceMode: "QR_GPS",
          defaultGpsRadiusMeters: 150,
          defaultSessionDurationMinutes: 45,
          qrRotationWindowSeconds: 30,
          requiresTrustedDevice: false,
        },
        teacher.token,
      )

      const joinCodeRes = await apiPost(
        inject,
        `/classrooms/${created.id}/join-code/reset`,
        {},
        teacher.token,
      )

      const classroom: SeedClassroom = {
        id: created.id,
        code: created.code ?? created.courseCode ?? courseCode,
        courseCode,
        classroomTitle: title,
        joinCode: joinCodeRes.code,
        teacherIndex: t,
        sessionIds: [],
        enrolledStudentCount: 0,
      }

      teacher.classrooms.push(classroom)
      allClassrooms.push(classroom)
    }
  }

  for (const classroom of allClassrooms) {
    const enrollCount = randBetween(
      config.studentsPerClassroom[0],
      Math.min(config.studentsPerClassroom[1], students.length),
    )
    const selected = pick(students, enrollCount)
    let enrolled = 0

    for (const student of selected) {
      try {
        await apiPost(inject, "/classrooms/join", { code: classroom.joinCode }, student.token)
        student.classroomIds.push(classroom.id)
        enrolled++
      } catch {
        // student may already be enrolled
      }
    }
    classroom.enrolledStudentCount = enrolled
  }

  for (const classroom of allClassrooms) {
    const teacher = teachers[classroom.teacherIndex]
    if (teacher === undefined) {
      throw new Error("E2E seed: classroom teacher index out of range")
    }
    const sessionCount = randBetween(...config.sessionsPerClassroom)

    for (let s = 0; s < sessionCount; s++) {
      try {
        const sessionRes = await apiPost(
          inject,
          "/sessions/qr",
          {
            classroomId: classroom.id,
            anchorType: "TEACHER_SELECTED",
            anchorLatitude: 28.6139 + (Math.random() - 0.5) * 0.01,
            anchorLongitude: 77.209 + (Math.random() - 0.5) * 0.01,
            gpsRadiusMeters: 150,
            sessionDurationMinutes: 45,
          },
          teacher.token,
        )

        classroom.sessionIds.push(sessionRes.id)
        totalSessions++

        await apiPost(inject, `/sessions/${sessionRes.id}/end`, {}, teacher.token)
      } catch {
        // rate-limit or concurrency; continue
      }
    }
  }

  return { teachers, students, classrooms: allClassrooms, totalSessions }
}
