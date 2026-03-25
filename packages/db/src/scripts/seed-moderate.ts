/**
 * Moderate seed: Adds 1 teacher, 11 students (15 total), 4 new courses,
 * lectures, attendance sessions & records.
 *
 * Run AFTER the dev seed:  pnpm seed:moderate
 */

import { hashPassword } from "@attendease/auth/password"
import { disconnectPrismaClient, getPrismaClient } from "../client"

const prisma = getPrismaClient({ singleton: false })

// ─── helpers ──────────────────────────────────────────────────────────

const RUN_ID = Date.now().toString(36)
let idCounter = 0
function uid(prefix: string): string {
  idCounter++
  return `mod_${prefix}_${RUN_ID}_${String(idCounter).padStart(4, "0")}`
}

function pick<T>(arr: T[]): T {
  if (arr.length === 0) {
    throw new Error("pick: empty array")
  }
  const idx = Math.floor(Math.random() * arr.length)
  const item = arr[idx]
  if (item === undefined) {
    throw new Error("pick: unexpected undefined at index")
  }
  return item
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function dateDaysAgo(days: number): Date {
  const d = new Date("2026-03-17T10:00:00.000Z")
  d.setDate(d.getDate() - days)
  return d
}

function dateOnly(d: Date): Date {
  return new Date(`${d.toISOString().slice(0, 10)}T00:00:00.000Z`)
}

// ─── existing IDs from dev seed ───────────────────────────────────────

const EXISTING = {
  admin: "seed_user_admin",
  teacher1: "seed_user_teacher",
  semester: "seed_semester_6",
  class_cse: "seed_class_btech_cse",
  section_a: "seed_section_a",
  term: "seed_term_ay_2026",
  sub_math: "seed_subject_math",
  sub_physics: "seed_subject_physics",
  co_math: "seed_course_offering_math",
  co_physics: "seed_course_offering_physics",
  ta_math: "seed_teacher_assignment_math",
  ta_physics: "seed_teacher_assignment_physics",
}

// ─── main ─────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Moderate seed: starting...")

  // Clean previous moderate seed data
  console.log("  Cleaning previous moderate data...")
  await prisma.$executeRawUnsafe(
    `DELETE FROM analytics_student_course_summary WHERE "courseOfferingId" LIKE 'mod_%' OR "studentId" LIKE 'mod_%'`,
  )
  await prisma.$executeRawUnsafe(`DELETE FROM attendance_records WHERE id LIKE 'mod_%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM attendance_sessions WHERE id LIKE 'mod_%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM announcement_posts WHERE id LIKE 'mod_%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM lectures WHERE id LIKE 'mod_%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM enrollments WHERE id LIKE 'mod_%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM course_schedule_slots WHERE id LIKE 'mod_%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM classroom_join_codes WHERE id LIKE 'mod_%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM course_offerings WHERE id LIKE 'mod_%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM teacher_assignments WHERE id LIKE 'mod_%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM subjects WHERE id LIKE 'mod_%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM student_profiles WHERE "userId" LIKE 'mod_%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM teacher_profiles WHERE "userId" LIKE 'mod_%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM user_credentials WHERE "userId" LIKE 'mod_%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM user_roles WHERE "userId" LIKE 'mod_%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM users WHERE id LIKE 'mod_%'`)
  console.log("  ✓ Cleaned")

  const sharedHash = await hashPassword("Pass1234!")

  // ── 1. New teacher ──────────────────────────────────────────────────

  const teacher2Id = uid("teacher")
  const t2 = {
    id: teacher2Id,
    email: "sneha.reddy@attendease.dev",
    displayName: "Prof. Sneha Reddy",
    employeeCode: "EMP-AT-002",
    department: "Electronics & Communication",
    designation: "Associate Professor",
  }

  await prisma.user.upsert({
    where: { email: t2.email },
    update: {},
    create: {
      id: t2.id,
      email: t2.email,
      displayName: t2.displayName,
      status: "ACTIVE",
      lastLoginAt: new Date("2026-03-17T08:00:00Z"),
    },
  })
  await prisma.userRole.upsert({
    where: { userId_role: { userId: t2.id, role: "TEACHER" } },
    update: {},
    create: { userId: t2.id, role: "TEACHER" },
  })
  await prisma.userCredential.upsert({
    where: { userId: t2.id },
    update: {},
    create: { userId: t2.id, passwordHash: sharedHash },
  })
  await prisma.teacherProfile.upsert({
    where: { userId: t2.id },
    update: {},
    create: {
      userId: t2.id,
      employeeCode: t2.employeeCode,
      department: t2.department,
      designation: t2.designation,
    },
  })

  console.log("  ✓ Created teacher: Prof. Sneha Reddy")

  // ── 2. 11 new students (15 total with 4 from dev seed) ─────────────

  const STUDENTS = [
    { first: "Rohan", last: "Gupta", roll: "CSE2305", gender: "M" },
    { first: "Priya", last: "Nair", roll: "CSE2306", gender: "F" },
    { first: "Arjun", last: "Tiwari", roll: "CSE2307", gender: "M" },
    { first: "Ananya", last: "Joshi", roll: "CSE2308", gender: "F" },
    { first: "Ishaan", last: "Mehta", roll: "CSE2309", gender: "M" },
    { first: "Kavya", last: "Reddy", roll: "CSE2310", gender: "F" },
    { first: "Dhruv", last: "Saxena", roll: "CSE2311", gender: "M" },
    { first: "Shreya", last: "Das", roll: "CSE2312", gender: "F" },
    { first: "Aditya", last: "Chauhan", roll: "CSE2313", gender: "M" },
    { first: "Tanvi", last: "Kulkarni", roll: "CSE2314", gender: "F" },
    { first: "Siddharth", last: "Rao", roll: "CSE2315", gender: "M" },
  ]

  interface StudentRec {
    id: string
    roll: string
    name: string
  }
  const newStudents: StudentRec[] = []

  for (const s of STUDENTS) {
    const sid = uid("student")
    const displayName = `${s.first} ${s.last}`
    const email = `${s.first.toLowerCase()}.${s.last.toLowerCase()}@attendease.dev`

    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        id: sid,
        email,
        displayName,
        status: "ACTIVE",
        lastLoginAt: dateDaysAgo(randInt(0, 5)),
      },
    })
    await prisma.userRole.upsert({
      where: { userId_role: { userId: sid, role: "STUDENT" } },
      update: {},
      create: { userId: sid, role: "STUDENT" },
    })
    await prisma.userCredential.upsert({
      where: { userId: sid },
      update: {},
      create: { userId: sid, passwordHash: sharedHash },
    })
    await prisma.studentProfile.upsert({
      where: { userId: sid },
      update: {},
      create: {
        userId: sid,
        rollNumber: s.roll,
        universityId: `UNI-${s.roll}`,
        programName: "B.Tech CSE",
        degree: "B.Tech",
        branch: "CSE",
        currentSemester: 6,
      },
    })

    newStudents.push({ id: sid, roll: s.roll, name: displayName })
  }

  console.log(`  ✓ Created ${newStudents.length} new students (15 total)`)

  // All student IDs (existing 4 + new 11)
  const existingStudentIds = [
    "seed_user_student_one",
    "seed_user_student_two",
    "seed_user_student_three",
    "seed_user_student_four",
  ]
  const allStudentIds = [...existingStudentIds, ...newStudents.map((s) => s.id)]

  // ── 3. New subjects ─────────────────────────────────────────────────

  const subjects = [
    { id: uid("subj"), code: "CSE301", title: "Algorithms", shortTitle: "Algo" },
    { id: uid("subj"), code: "CSE302", title: "Database Systems", shortTitle: "DBMS" },
    { id: uid("subj"), code: "ECE301", title: "Digital Electronics", shortTitle: "DE" },
    { id: uid("subj"), code: "ECE302", title: "Signal Processing", shortTitle: "DSP" },
  ]

  for (const s of subjects) {
    await prisma.subject.upsert({
      where: { code: s.code },
      update: {},
      create: {
        id: s.id,
        code: s.code,
        title: s.title,
        shortTitle: s.shortTitle,
        status: "ACTIVE",
      },
    })
  }

  console.log(`  ✓ Created ${subjects.length} subjects`)

  // ── 4. Course offerings ─────────────────────────────────────────────

  const semId = EXISTING.semester
  const joinCodeExpiry = new Date("2026-12-31T23:59:59Z")

  interface CourseDef {
    id: string
    code: string
    displayTitle: string
    subjectId: string
    teacherId: string
    taId: string
    jcId: string
    joinCode: string
    mode: "QR_GPS" | "BLUETOOTH"
    location: string
  }

  const courses: CourseDef[] = [
    // Prof. Anurag's new courses
    {
      id: uid("co"),
      code: "CSE6-ALGO-A",
      displayTitle: "Algorithms - Semester 6 A",
      subjectId: subjects[0]?.id ?? "",
      teacherId: EXISTING.teacher1,
      taId: uid("ta"),
      jcId: uid("jc"),
      joinCode: "ALGO6A",
      mode: "QR_GPS",
      location: "Room 301",
    },
    {
      id: uid("co"),
      code: "CSE6-DBMS-A",
      displayTitle: "Database Systems - Semester 6 A",
      subjectId: subjects[1]?.id ?? "",
      teacherId: EXISTING.teacher1,
      taId: uid("ta"),
      jcId: uid("jc"),
      joinCode: "DBMS6A",
      mode: "BLUETOOTH",
      location: "Lab 3",
    },
    // Prof. Sneha's courses
    {
      id: uid("co"),
      code: "CSE6-DE-A",
      displayTitle: "Digital Electronics - Semester 6 A",
      subjectId: subjects[2]?.id ?? "",
      teacherId: teacher2Id,
      taId: uid("ta"),
      jcId: uid("jc"),
      joinCode: "DE6A",
      mode: "QR_GPS",
      location: "Room 102",
    },
    {
      id: uid("co"),
      code: "CSE6-DSP-A",
      displayTitle: "Signal Processing - Semester 6 A",
      subjectId: subjects[3]?.id ?? "",
      teacherId: teacher2Id,
      taId: uid("ta"),
      jcId: uid("jc"),
      joinCode: "DSP6A",
      mode: "BLUETOOTH",
      location: "Lab 1",
    },
  ]

  for (const c of courses) {
    await prisma.teacherAssignment.upsert({
      where: {
        teacherId_semesterId_classId_sectionId_subjectId: {
          teacherId: c.teacherId,
          semesterId: semId,
          classId: EXISTING.class_cse,
          sectionId: EXISTING.section_a,
          subjectId: c.subjectId,
        },
      },
      update: {},
      create: {
        id: c.taId,
        teacherId: c.teacherId,
        grantedByUserId: EXISTING.admin,
        semesterId: semId,
        classId: EXISTING.class_cse,
        sectionId: EXISTING.section_a,
        subjectId: c.subjectId,
        status: "ACTIVE",
      },
    })

    await prisma.courseOffering.upsert({
      where: { code: c.code },
      update: {},
      create: {
        id: c.id,
        semesterId: semId,
        classId: EXISTING.class_cse,
        sectionId: EXISTING.section_a,
        subjectId: c.subjectId,
        primaryTeacherId: c.teacherId,
        createdByUserId: c.teacherId,
        code: c.code,
        displayTitle: c.displayTitle,
        status: "ACTIVE",
        defaultAttendanceMode: c.mode,
        defaultSessionDurationMinutes: 15,
        qrRotationWindowSeconds: 15,
        bluetoothRotationWindowSeconds: 10,
        timezone: "Asia/Kolkata",
        degree: "B.Tech",
        semesterLabel: "Semester 6",
      },
    })

    await prisma.classroomJoinCode.upsert({
      where: { code: c.joinCode },
      update: {},
      create: {
        id: c.jcId,
        courseOfferingId: c.id,
        createdByUserId: c.teacherId,
        code: c.joinCode,
        status: "ACTIVE",
        expiresAt: joinCodeExpiry,
      },
    })
  }

  console.log(`  ✓ Created ${courses.length} course offerings`)

  // ── 5. Schedule slots ───────────────────────────────────────────────

  const WEEKDAYS = [1, 2, 3, 4, 5]
  let slotCount = 0

  for (const c of courses) {
    const days = [pick(WEEKDAYS), pick(WEEKDAYS)].filter((v, i, a) => a.indexOf(v) === i)
    for (const day of days) {
      const startHour = randInt(9, 14)
      await prisma.courseScheduleSlot.create({
        data: {
          id: uid("slot"),
          courseOfferingId: c.id,
          weekday: day,
          startMinutes: startHour * 60,
          endMinutes: startHour * 60 + 50,
          locationLabel: c.location,
          status: "ACTIVE",
        },
      })
      slotCount++
    }
  }

  console.log(`  ✓ Created ${slotCount} schedule slots`)

  // ── 6. Enrollments ──────────────────────────────────────────────────

  // Enroll all 15 students in all 4 new courses
  let enrollCount = 0
  const enrollmentMap: Map<string, Map<string, string>> = new Map() // courseId -> studentId -> enrollmentId

  for (const c of courses) {
    const map = new Map<string, string>()
    for (const studentId of allStudentIds) {
      const eId = uid("enrl")
      try {
        await prisma.enrollment.upsert({
          where: { studentId_courseOfferingId: { studentId, courseOfferingId: c.id } },
          update: {},
          create: {
            id: eId,
            courseOfferingId: c.id,
            studentId,
            semesterId: semId,
            classId: EXISTING.class_cse,
            sectionId: EXISTING.section_a,
            subjectId: c.subjectId,
            status: "ACTIVE",
            source: "JOIN_CODE",
            joinedAt: dateDaysAgo(randInt(15, 30)),
          },
        })
        map.set(studentId, eId)
        enrollCount++
      } catch {
        /* skip duplicates */
      }
    }
    enrollmentMap.set(c.id, map)
  }

  // Also enroll new students in existing Math & Physics courses
  for (const studentId of newStudents.map((s) => s.id)) {
    for (const coId of [EXISTING.co_math, EXISTING.co_physics]) {
      const subjectId = coId === EXISTING.co_math ? EXISTING.sub_math : EXISTING.sub_physics
      try {
        await prisma.enrollment.upsert({
          where: { studentId_courseOfferingId: { studentId, courseOfferingId: coId } },
          update: {},
          create: {
            id: uid("enrl"),
            courseOfferingId: coId,
            studentId,
            semesterId: semId,
            classId: EXISTING.class_cse,
            sectionId: EXISTING.section_a,
            subjectId,
            status: "ACTIVE",
            source: "JOIN_CODE",
            joinedAt: dateDaysAgo(randInt(15, 30)),
          },
        })
        enrollCount++
      } catch {
        /* skip duplicates */
      }
    }
  }

  console.log(`  ✓ Created ${enrollCount} enrollments`)

  // ── 7. Lectures + Attendance sessions + Records ─────────────────────

  let lectureCount = 0
  let sessionCount = 0
  let recordCount = 0

  for (const c of courses) {
    const numLectures = randInt(8, 12)
    const courseEnrollMap = enrollmentMap.get(c.id) ?? new Map()

    for (let i = 0; i < numLectures; i++) {
      const daysAgo = numLectures - i
      const date = dateDaysAgo(daysAgo)
      const isCompleted = daysAgo >= 1
      const lecId = uid("lec")

      await prisma.lecture.create({
        data: {
          id: lecId,
          courseOfferingId: c.id,
          createdByUserId: c.teacherId,
          title: `Lecture ${i + 1}`,
          lectureDate: dateOnly(date),
          status: isCompleted ? "COMPLETED" : "PLANNED",
        },
      })
      lectureCount++

      if (!isCompleted) continue

      // Create attendance session
      const sessionId = uid("sess")
      const sessionStart = new Date(date.getTime() + 9 * 3600 * 1000)
      const sessionEnd = new Date(sessionStart.getTime() + 15 * 60 * 1000)
      const rosterCount = allStudentIds.length
      const attendanceRate = randInt(65, 95) / 100
      const presentCount = Math.round(rosterCount * attendanceRate)
      const absentCount = rosterCount - presentCount
      const isBle = c.mode === "BLUETOOTH"

      await prisma.attendanceSession.create({
        data: {
          id: sessionId,
          courseOfferingId: c.id,
          lectureId: lecId,
          teacherAssignmentId: c.taId,
          teacherId: c.teacherId,
          endedByUserId: c.teacherId,
          semesterId: semId,
          classId: EXISTING.class_cse,
          sectionId: EXISTING.section_a,
          subjectId: c.subjectId,
          mode: c.mode,
          status: "ENDED",
          startedAt: sessionStart,
          scheduledEndAt: sessionEnd,
          endedAt: sessionEnd,
          durationSeconds: 900,
          rosterSnapshotCount: rosterCount,
          presentCount,
          absentCount,
          qrSeed: !isBle ? `qrseed_${sessionId}_pad` : null,
          qrRotationWindowSeconds: !isBle ? 15 : null,
          bleSeed: isBle ? `bleseed_${sessionId}_pad` : null,
          blePublicId: isBle ? `ble_${sessionId}` : null,
          bleProtocolVersion: isBle ? 1 : null,
          bluetoothRotationWindowSeconds: isBle ? 10 : null,
        },
      })
      sessionCount++

      // Create attendance records
      const shuffled = [...allStudentIds].sort(() => Math.random() - 0.5)
      const presentIds = new Set(shuffled.slice(0, presentCount))

      for (const studentId of allStudentIds) {
        const enrollmentId = courseEnrollMap.get(studentId)
        if (!enrollmentId) continue

        const isPresent = presentIds.has(studentId)
        await prisma.attendanceRecord.create({
          data: {
            id: uid("arec"),
            sessionId,
            enrollmentId,
            studentId,
            status: isPresent ? "PRESENT" : "ABSENT",
            markSource: isPresent ? (isBle ? "BLUETOOTH" : "QR_GPS") : null,
            markedAt: isPresent
              ? new Date(sessionStart.getTime() + randInt(1, 12) * 60 * 1000)
              : null,
          },
        })
        recordCount++
      }
    }
  }

  console.log(
    `  ✓ Created ${lectureCount} lectures, ${sessionCount} sessions, ${recordCount} records`,
  )

  // ── 8. Analytics summaries ──────────────────────────────────────────

  let analyticCount = 0
  const allCourseIds = [EXISTING.co_math, EXISTING.co_physics, ...courses.map((c) => c.id)]

  for (const coId of allCourseIds) {
    const sessions = await prisma.attendanceSession.findMany({
      where: { courseOfferingId: coId, status: "ENDED" },
      select: { id: true },
    })
    if (sessions.length === 0) continue

    const enrollments = await prisma.enrollment.findMany({
      where: { courseOfferingId: coId, status: "ACTIVE" },
      select: { studentId: true },
    })

    for (const enrl of enrollments) {
      const presentSessions = await prisma.attendanceRecord.count({
        where: {
          studentId: enrl.studentId,
          session: { courseOfferingId: coId },
          status: "PRESENT",
        },
      })
      const total = sessions.length
      const pct = total > 0 ? (presentSessions / total) * 100 : 0

      await prisma.analyticsStudentCourseSummary.upsert({
        where: {
          courseOfferingId_studentId: { courseOfferingId: coId, studentId: enrl.studentId },
        },
        update: {
          totalSessions: total,
          presentSessions,
          absentSessions: total - presentSessions,
          attendancePercentage: Math.round(pct * 100) / 100,
          lastSessionAt: dateDaysAgo(1),
        },
        create: {
          courseOfferingId: coId,
          studentId: enrl.studentId,
          totalSessions: total,
          presentSessions,
          absentSessions: total - presentSessions,
          attendancePercentage: Math.round(pct * 100) / 100,
          lastSessionAt: dateDaysAgo(1),
        },
      })
      analyticCount++
    }
  }

  console.log(`  ✓ Created ${analyticCount} analytics summaries`)

  // ── 9. Announcements ────────────────────────────────────────────────

  const templates = [
    {
      title: "Welcome to the course!",
      body: "Welcome everyone. Please review the syllabus and course schedule. Looking forward to a great semester together.",
    },
    {
      title: "Assignment 1 posted",
      body: "The first assignment has been posted. Due date is next Friday. Please submit through the portal.",
    },
    {
      title: "Mid-semester exam schedule",
      body: "Mid-semester exams will be held in Week 8. Detailed schedule will be shared soon. Start preparing!",
    },
    {
      title: "Lab session update",
      body: "This week's lab session has been moved to Thursday due to a scheduling conflict. Please plan accordingly.",
    },
  ]

  let annCount = 0
  for (const c of courses) {
    const num = randInt(2, 3)
    for (let i = 0; i < num; i++) {
      const t = templates[i % templates.length] ?? templates[0]
      if (t === undefined) {
        throw new Error("announcement templates must not be empty")
      }
      await prisma.announcementPost.create({
        data: {
          id: uid("ann"),
          courseOfferingId: c.id,
          authorUserId: c.teacherId,
          postType: "ANNOUNCEMENT",
          visibility: "STUDENT_AND_TEACHER",
          title: t.title,
          body: t.body,
          createdAt: dateDaysAgo(randInt(1, 15)),
        },
      })
      annCount++
    }
  }

  console.log(`  ✓ Created ${annCount} announcements`)

  // ── Done ────────────────────────────────────────────────────────────

  console.log("\n🎉 Moderate seed complete!")
  console.log("   Teachers: 2 (Prof. Anurag Agarwal + Prof. Sneha Reddy)")
  console.log("   Students: 15")
  console.log(`   Courses: 6 (2 existing + ${courses.length} new)`)
  console.log(`   Lectures: ${lectureCount}`)
  console.log(`   Sessions: ${sessionCount}`)
  console.log(`   Records: ${recordCount}`)
  console.log(`   Analytics: ${analyticCount}`)
  console.log("\n   New users password: Pass1234!")
  console.log("   New teacher: sneha.reddy@attendease.dev / Pass1234!")
}

main()
  .catch((err) => {
    console.error("❌ Moderate seed failed:", err)
    process.exitCode = 1
  })
  .finally(() => disconnectPrismaClient(prisma))
