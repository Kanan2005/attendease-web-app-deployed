/**
 * Bulk seed script: Adds 2 more teachers, 196 more students (~200 total),
 * 18 course offerings, enrollments, lectures, attendance sessions & records.
 *
 * Run AFTER the normal dev seed:
 *   pnpm tsx src/scripts/seed-bulk.ts
 */

import { hashPassword } from "@attendease/auth/password"

import { disconnectPrismaClient, getPrismaClient } from "../client"

const prisma = getPrismaClient({ singleton: false })

// ─── helpers ──────────────────────────────────────────────────────────

const RUN_ID = Date.now().toString(36)
let idCounter = 0
function uid(prefix: string): string {
  idCounter++
  return `bulk_${prefix}_${RUN_ID}_${String(idCounter).padStart(4, "0")}`
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
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
  return new Date(d.toISOString().slice(0, 10) + "T00:00:00.000Z")
}

// ─── name pools ───────────────────────────────────────────────────────

const FIRST_NAMES_MALE = [
  "Aarav","Vivaan","Aditya","Vihaan","Arjun","Sai","Reyansh","Ayaan","Krishna",
  "Ishaan","Shaurya","Atharv","Advik","Kabir","Arnav","Dhruv","Harsh","Kian",
  "Ritvik","Pranav","Rohan","Ansh","Darsh","Lakshya","Rudra","Dev","Krish",
  "Parth","Yash","Tanmay","Neel","Siddharth","Viraj","Om","Raghav","Aakash",
  "Aryan","Kartik","Mihir","Manav","Gaurav","Sahil","Kunal","Akshay","Nikhil",
  "Rahul","Varun","Jayesh","Mayank","Chirag","Tarun","Amar","Sagar","Devesh",
  "Mohit","Sumit","Ankit","Ajay","Naveen","Piyush","Deepak","Rishi","Shreyas",
  "Tejas","Suraj","Prateek","Tushar","Vishal","Rajat","Vinay","Hemant",
]

const FIRST_NAMES_FEMALE = [
  "Saanvi","Aanya","Aadhya","Aaradhya","Ananya","Pari","Myra","Sara","Ira",
  "Diya","Prisha","Anvi","Riya","Kiara","Navya","Anika","Avni","Nisha",
  "Kavya","Tara","Meera","Pooja","Shreya","Neha","Sanya","Ishita","Mahi",
  "Lavanya","Tanvi","Avani","Rhea","Kriti","Aishwarya","Divya","Sneha",
  "Simran","Sakshi","Bhavna","Ruhi","Jiya","Zara","Pihu","Trisha","Mansi",
  "Aditi","Khushi","Palak","Suhana","Madhuri","Swati","Rashmi","Komal",
  "Vaishnavi","Chahat","Prachi","Ankita","Ritu","Payal","Megha","Nandini",
]

const LAST_NAMES = [
  "Sharma","Verma","Patel","Singh","Kumar","Gupta","Reddy","Joshi","Mehta",
  "Shah","Nair","Rao","Iyer","Pillai","Mishra","Tiwari","Pandey","Saxena",
  "Agarwal","Jain","Chopra","Malhotra","Kapoor","Sinha","Banerjee","Mukherjee",
  "Chatterjee","Das","Ghosh","Sen","Bose","Roy","Dutta","Thakur","Chauhan",
  "Rathore","Deshmukh","Patil","Kulkarni","Bhatt","Trivedi","Yadav","Rajput",
  "Negi","Bhat","Hegde","Shetty","Menon","Kaur","Gill",
]

function generateStudentName(index: number): { first: string; last: string } {
  const pool = index % 2 === 0 ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE
  return {
    first: pool[index % pool.length]!,
    last: LAST_NAMES[index % LAST_NAMES.length]!,
  }
}

// ─── data definitions ────────────────────────────────────────────────

const EXISTING_IDS = {
  admin: "seed_user_admin",
  teacher1: "seed_user_teacher",
  semester: "seed_semester_6",
  class_cse: "seed_class_btech_cse",
  section_a: "seed_section_a",
  term: "seed_term_ay_2026",
  sub_math: "seed_subject_math",
  sub_physics: "seed_subject_physics",
  sub_chemistry: "seed_subject_chemistry",
  sub_ds: "seed_subject_data_structures",
  sub_os: "seed_subject_operating_systems",
  co_math: "seed_course_offering_math",
  co_physics: "seed_course_offering_physics",
  ta_math: "seed_teacher_assignment_math",
  ta_physics: "seed_teacher_assignment_physics",
}

interface TeacherDef {
  id: string
  email: string
  displayName: string
  employeeCode: string
  department: string
  designation: string
}

interface SubjectDef {
  id: string
  code: string
  title: string
  shortTitle: string
}

interface CourseDef {
  id: string
  code: string
  displayTitle: string
  subjectId: string
  teacherId: string
  classId: string
  sectionId: string
  taId: string
  joinCodeId: string
  joinCode: string
  mode: "QR_GPS" | "BLUETOOTH"
  location: string
}

// ─── main ────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Bulk seed: starting...")

  // Clean up any previous bulk seed data (order matters for FK constraints)
  console.log("  Cleaning previous bulk data...")
  await prisma.$executeRawUnsafe(`DELETE FROM analytics_student_course_summary WHERE "courseOfferingId" LIKE 'bulk_%' OR "studentId" LIKE 'bulk_%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM attendance_records WHERE id LIKE 'bulk_%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM attendance_sessions WHERE id LIKE 'bulk_%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM announcement_posts WHERE id LIKE 'bulk_%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM lectures WHERE id LIKE 'bulk_%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM enrollments WHERE id LIKE 'bulk_%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM course_schedule_slots WHERE id LIKE 'bulk_%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM classroom_join_codes WHERE id LIKE 'bulk_%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM course_offerings WHERE id LIKE 'bulk_%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM teacher_assignments WHERE id LIKE 'bulk_%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM sections WHERE id LIKE 'bulk_%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM classes WHERE id LIKE 'bulk_%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM subjects WHERE id LIKE 'bulk_%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM student_profiles WHERE "userId" LIKE 'bulk_%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM teacher_profiles WHERE "userId" LIKE 'bulk_%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM user_credentials WHERE "userId" LIKE 'bulk_%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM user_roles WHERE "userId" LIKE 'bulk_%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM users WHERE id LIKE 'bulk_%'`)
  console.log("  ✓ Cleaned previous bulk data")

  const sharedHash = await hashPassword("Pass1234!")

  // ── 1. New teachers ──────────────────────────────────────────────

  const teachers: TeacherDef[] = [
    {
      id: uid("teacher"),
      email: "sneha.reddy@attendease.dev",
      displayName: "Prof. Sneha Reddy",
      employeeCode: "EMP-AT-002",
      department: "Electronics & Communication",
      designation: "Associate Professor",
    },
    {
      id: uid("teacher"),
      email: "vikram.mehta@attendease.dev",
      displayName: "Prof. Vikram Mehta",
      employeeCode: "EMP-AT-003",
      department: "Mechanical Engineering",
      designation: "Professor",
    },
  ]

  for (const t of teachers) {
    await prisma.user.upsert({
      where: { email: t.email },
      update: {},
      create: {
        id: t.id,
        email: t.email,
        displayName: t.displayName,
        status: "ACTIVE",
        lastLoginAt: new Date("2026-03-17T08:00:00Z"),
      },
    })
    await prisma.userRole.upsert({
      where: { userId_role: { userId: t.id, role: "TEACHER" } },
      update: {},
      create: { userId: t.id, role: "TEACHER" },
    })
    await prisma.userCredential.upsert({
      where: { userId: t.id },
      update: {},
      create: { userId: t.id, passwordHash: sharedHash },
    })
    await prisma.teacherProfile.upsert({
      where: { userId: t.id },
      update: {},
      create: {
        userId: t.id,
        employeeCode: t.employeeCode,
        department: t.department,
        designation: t.designation,
      },
    })
  }

  console.log(`  ✓ Created ${teachers.length} new teachers`)

  // ── 2. New classes & sections ─────────────────────────────────────

  const classECE = uid("class")
  const classME = uid("class")
  const sectionECE = uid("section")
  const sectionME = uid("section")

  await prisma.academicClass.upsert({
    where: { code: "BTECH-ECE-2023" },
    update: {},
    create: {
      id: classECE,
      code: "BTECH-ECE-2023",
      title: "B.Tech Electronics & Communication",
      programName: "B.Tech ECE",
      cohortYear: 2023,
      status: "ACTIVE",
    },
  })
  await prisma.academicClass.upsert({
    where: { code: "BTECH-ME-2023" },
    update: {},
    create: {
      id: classME,
      code: "BTECH-ME-2023",
      title: "B.Tech Mechanical Engineering",
      programName: "B.Tech ME",
      cohortYear: 2023,
      status: "ACTIVE",
    },
  })
  await prisma.section.upsert({
    where: { classId_code: { classId: classECE, code: "A" } },
    update: {},
    create: { id: sectionECE, classId: classECE, code: "A", title: "Section A", status: "ACTIVE" },
  })
  await prisma.section.upsert({
    where: { classId_code: { classId: classME, code: "A" } },
    update: {},
    create: { id: sectionME, classId: classME, code: "A", title: "Section A", status: "ACTIVE" },
  })

  console.log("  ✓ Created ECE & ME classes + sections")

  // ── 3. New subjects ───────────────────────────────────────────────

  const newSubjects: SubjectDef[] = [
    // CSE (for teacher1)
    { id: uid("subj"), code: "CSE301", title: "Algorithms", shortTitle: "Algo" },
    { id: uid("subj"), code: "CSE302", title: "Database Systems", shortTitle: "DBMS" },
    { id: uid("subj"), code: "CSE303", title: "Computer Networks", shortTitle: "CN" },
    { id: uid("subj"), code: "CSE304", title: "Software Engineering", shortTitle: "SE" },
    // ECE (for teacher2 – Sneha)
    { id: uid("subj"), code: "ECE301", title: "Digital Electronics", shortTitle: "DE" },
    { id: uid("subj"), code: "ECE302", title: "Signal Processing", shortTitle: "DSP" },
    { id: uid("subj"), code: "ECE303", title: "VLSI Design", shortTitle: "VLSI" },
    { id: uid("subj"), code: "ECE304", title: "Embedded Systems", shortTitle: "ES" },
    { id: uid("subj"), code: "ECE305", title: "Communication Systems", shortTitle: "CommSys" },
    { id: uid("subj"), code: "ECE306", title: "Control Systems", shortTitle: "CS" },
    // ME (for teacher3 – Vikram)
    { id: uid("subj"), code: "ME301", title: "Thermodynamics", shortTitle: "Thermo" },
    { id: uid("subj"), code: "ME302", title: "Fluid Mechanics", shortTitle: "FM" },
    { id: uid("subj"), code: "ME303", title: "Machine Design", shortTitle: "MD" },
    { id: uid("subj"), code: "ME304", title: "Manufacturing Technology", shortTitle: "MT" },
    { id: uid("subj"), code: "ME305", title: "Heat Transfer", shortTitle: "HT" },
    { id: uid("subj"), code: "ME306", title: "Mechanics of Materials", shortTitle: "MoM" },
  ]

  for (const s of newSubjects) {
    await prisma.subject.upsert({
      where: { code: s.code },
      update: {},
      create: { id: s.id, code: s.code, title: s.title, shortTitle: s.shortTitle, status: "ACTIVE" },
    })
  }

  console.log(`  ✓ Created ${newSubjects.length} new subjects`)

  // ── 4. Students (196 new + 4 existing = 200) ─────────────────────

  interface StudentRecord {
    id: string
    email: string
    displayName: string
    rollNumber: string
    branch: "CSE" | "ECE" | "ME"
    classId: string
    sectionId: string
  }

  const allStudents: StudentRecord[] = []

  // Keep reference to existing 4 CSE students
  const existingStudents: StudentRecord[] = [
    { id: "seed_user_student_one", email: "student.one@attendease.dev", displayName: "Aarav Sharma", rollNumber: "CSE2301", branch: "CSE", classId: EXISTING_IDS.class_cse, sectionId: EXISTING_IDS.section_a },
    { id: "seed_user_student_two", email: "student.two@attendease.dev", displayName: "Diya Verma", rollNumber: "CSE2302", branch: "CSE", classId: EXISTING_IDS.class_cse, sectionId: EXISTING_IDS.section_a },
    { id: "seed_user_student_three", email: "student.three@attendease.dev", displayName: "Kabir Singh", rollNumber: "CSE2303", branch: "CSE", classId: EXISTING_IDS.class_cse, sectionId: EXISTING_IDS.section_a },
    { id: "seed_user_student_four", email: "student.four@attendease.dev", displayName: "Meera Patel", rollNumber: "CSE2304", branch: "CSE", classId: EXISTING_IDS.class_cse, sectionId: EXISTING_IDS.section_a },
  ]
  allStudents.push(...existingStudents)

  const branchConfig: Array<{ branch: "CSE" | "ECE" | "ME"; prefix: string; count: number; startRoll: number; classId: string; sectionId: string; program: string }> = [
    { branch: "CSE", prefix: "CSE", count: 66, startRoll: 2305, classId: EXISTING_IDS.class_cse, sectionId: EXISTING_IDS.section_a, program: "B.Tech CSE" },
    { branch: "ECE", prefix: "ECE", count: 65, startRoll: 2301, classId: classECE, sectionId: sectionECE, program: "B.Tech ECE" },
    { branch: "ME", prefix: "ME", count: 65, startRoll: 2301, classId: classME, sectionId: sectionME, program: "B.Tech ME" },
  ]

  let nameIdx = 10 // offset to avoid duplicating existing names
  for (const bc of branchConfig) {
    for (let i = 0; i < bc.count; i++) {
      const roll = `${bc.prefix}${bc.startRoll + i}`
      const name = generateStudentName(nameIdx++)
      const displayName = `${name.first} ${name.last}`
      const email = `${name.first.toLowerCase()}.${name.last.toLowerCase()}.${roll.toLowerCase()}@attendease.dev`
      const sid = uid("student")

      await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          id: sid,
          email,
          displayName,
          status: "ACTIVE",
          lastLoginAt: dateDaysAgo(randInt(0, 7)),
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
          rollNumber: roll,
          universityId: `UNI-${roll}`,
          programName: bc.program,
          degree: "B.Tech",
          branch: bc.branch,
          currentSemester: 6,
        },
      })

      allStudents.push({
        id: sid,
        email,
        displayName,
        rollNumber: roll,
        branch: bc.branch,
        classId: bc.classId,
        sectionId: bc.sectionId,
      })

      if ((allStudents.length - 4) % 50 === 0) {
        console.log(`    ... created ${allStudents.length - 4}/196 new students`)
      }
    }
  }

  console.log(`  ✓ Total students: ${allStudents.length}`)

  // ── 5. Course offerings ───────────────────────────────────────────

  const semId = EXISTING_IDS.semester
  const joinCodeExpiry = new Date("2026-12-31T23:59:59Z")

  const WEEKDAYS = [1, 2, 3, 4, 5] // Mon-Fri
  const LOCATIONS = ["Room 101", "Room 102", "Room 201", "Room 202", "Room 301", "Room 302", "Lab 1", "Lab 2", "Lab 3", "Lecture Hall A", "Lecture Hall B", "Seminar Hall"]

  // CSE courses for teacher1 (Anurag) – 4 new courses (already has Math + Physics = 6 total)
  const cseNewSubjects = newSubjects.filter((s) => s.code.startsWith("CSE"))
  // ECE courses for teacher2 (Sneha) – 6 courses
  const eceSubjects = newSubjects.filter((s) => s.code.startsWith("ECE"))
  // ME courses for teacher3 (Vikram) – 6 courses
  const meSubjects = newSubjects.filter((s) => s.code.startsWith("ME"))

  const allCourses: CourseDef[] = []

  // include existing course offerings for enrollment purposes
  const existingCourses: CourseDef[] = [
    { id: EXISTING_IDS.co_math, code: "CSE6-MATHS-A", displayTitle: "Mathematics - Semester 6 A", subjectId: EXISTING_IDS.sub_math, teacherId: EXISTING_IDS.teacher1, classId: EXISTING_IDS.class_cse, sectionId: EXISTING_IDS.section_a, taId: EXISTING_IDS.ta_math, joinCodeId: "", joinCode: "MATH6A", mode: "QR_GPS", location: "Room 204" },
    { id: EXISTING_IDS.co_physics, code: "CSE6-PHYSICS-A", displayTitle: "Physics - Semester 6 A", subjectId: EXISTING_IDS.sub_physics, teacherId: EXISTING_IDS.teacher1, classId: EXISTING_IDS.class_cse, sectionId: EXISTING_IDS.section_a, taId: EXISTING_IDS.ta_physics, joinCodeId: "", joinCode: "PHY6A", mode: "BLUETOOTH", location: "Lab 2" },
  ]

  function buildCourses(
    subjects: SubjectDef[],
    teacherId: string,
    classId: string,
    sectionId: string,
    codePrefix: string,
  ): CourseDef[] {
    return subjects.map((subj, idx) => {
      const coId = uid("co")
      const taId = uid("ta")
      const jcId = uid("jc")
      const code = `${codePrefix}-${subj.shortTitle.toUpperCase().replace(/\s/g, "")}-A`
      const joinCode = `${subj.code}6A`
      return {
        id: coId,
        code,
        displayTitle: `${subj.title} - Semester 6 A`,
        subjectId: subj.id,
        teacherId,
        classId,
        sectionId,
        taId,
        joinCodeId: jcId,
        joinCode,
        mode: idx % 2 === 0 ? "QR_GPS" as const : "BLUETOOTH" as const,
        location: LOCATIONS[idx % LOCATIONS.length]!,
      }
    })
  }

  const cseNewCourses = buildCourses(cseNewSubjects, EXISTING_IDS.teacher1, EXISTING_IDS.class_cse, EXISTING_IDS.section_a, "CSE6")
  const eceCourses = buildCourses(eceSubjects, teachers[0]!.id, classECE, sectionECE, "ECE6")
  const meCourses = buildCourses(meSubjects, teachers[1]!.id, classME, sectionME, "ME6")

  const newCoursesList = [...cseNewCourses, ...eceCourses, ...meCourses]
  allCourses.push(...existingCourses, ...newCoursesList)

  for (const c of newCoursesList) {
    // Teacher assignment
    await prisma.teacherAssignment.upsert({
      where: { teacherId_semesterId_classId_sectionId_subjectId: { teacherId: c.teacherId, semesterId: semId, classId: c.classId, sectionId: c.sectionId, subjectId: c.subjectId } },
      update: {},
      create: {
        id: c.taId,
        teacherId: c.teacherId,
        grantedByUserId: EXISTING_IDS.admin,
        semesterId: semId,
        classId: c.classId,
        sectionId: c.sectionId,
        subjectId: c.subjectId,
        status: "ACTIVE",
      },
    })

    // Course offering
    await prisma.courseOffering.upsert({
      where: { code: c.code },
      update: {},
      create: {
        id: c.id,
        semesterId: semId,
        classId: c.classId,
        sectionId: c.sectionId,
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

    // Join code
    await prisma.classroomJoinCode.upsert({
      where: { code: c.joinCode },
      update: {},
      create: {
        id: c.joinCodeId,
        courseOfferingId: c.id,
        createdByUserId: c.teacherId,
        code: c.joinCode,
        status: "ACTIVE",
        expiresAt: joinCodeExpiry,
      },
    })
  }

  console.log(`  ✓ Created ${newCoursesList.length} new course offerings (${allCourses.length} total)`)

  // ── 6. Schedule slots ─────────────────────────────────────────────

  const scheduleSlots: Array<{ id: string; courseOfferingId: string; weekday: number; startMin: number; endMin: number; location: string }> = []

  for (const c of newCoursesList) {
    const numSlots = randInt(2, 3)
    const usedDays = new Set<number>()
    for (let s = 0; s < numSlots; s++) {
      let day = pick(WEEKDAYS)
      while (usedDays.has(day)) day = pick(WEEKDAYS)
      usedDays.add(day)
      const startHour = randInt(8, 15)
      const startMin = startHour * 60
      const endMin = startMin + 50
      const slotId = uid("slot")
      scheduleSlots.push({ id: slotId, courseOfferingId: c.id, weekday: day, startMin, endMin, location: c.location })
    }
  }

  for (const slot of scheduleSlots) {
    await prisma.courseScheduleSlot.upsert({
      where: { courseOfferingId_weekday_startMinutes_endMinutes: { courseOfferingId: slot.courseOfferingId, weekday: slot.weekday, startMinutes: slot.startMin, endMinutes: slot.endMin } },
      update: {},
      create: {
        id: slot.id,
        courseOfferingId: slot.courseOfferingId,
        weekday: slot.weekday,
        startMinutes: slot.startMin,
        endMinutes: slot.endMin,
        locationLabel: slot.location,
        status: "ACTIVE",
      },
    })
  }

  console.log(`  ✓ Created ${scheduleSlots.length} schedule slots`)

  // ── 7. Enrollments ────────────────────────────────────────────────

  const enrollmentRecords: Array<{ id: string; courseOfferingId: string; studentId: string; classId: string; sectionId: string; subjectId: string }> = []

  // Group students by branch
  const cseStudents = allStudents.filter((s) => s.branch === "CSE")
  const eceStudents = allStudents.filter((s) => s.branch === "ECE")
  const meStudents = allStudents.filter((s) => s.branch === "ME")

  function enrollStudentsInCourses(students: StudentRecord[], courses: CourseDef[]) {
    for (const student of students) {
      for (const course of courses) {
        const eId = uid("enrl")
        enrollmentRecords.push({
          id: eId,
          courseOfferingId: course.id,
          studentId: student.id,
          classId: course.classId,
          sectionId: course.sectionId,
          subjectId: course.subjectId,
        })
      }
    }
  }

  // CSE students get enrolled in CSE new courses (not existing Math/Physics to avoid duplicate enrollments)
  enrollStudentsInCourses(cseStudents.filter((s) => !existingStudents.some((e) => e.id === s.id)), cseNewCourses)
  // Also enroll existing students in the new CSE courses
  enrollStudentsInCourses(existingStudents, cseNewCourses)
  // ECE students in ECE courses
  enrollStudentsInCourses(eceStudents, eceCourses)
  // ME students in ME courses
  enrollStudentsInCourses(meStudents, meCourses)

  // Also enroll new CSE students in existing Math + Physics
  const newCseStudents = cseStudents.filter((s) => !existingStudents.some((e) => e.id === s.id))
  for (const student of newCseStudents) {
    for (const course of existingCourses) {
      enrollmentRecords.push({
        id: uid("enrl"),
        courseOfferingId: course.id,
        studentId: student.id,
        classId: course.classId,
        sectionId: course.sectionId,
        subjectId: course.subjectId,
      })
    }
  }

  // Batch create enrollments (skip duplicates)
  let enrollCreated = 0
  for (const e of enrollmentRecords) {
    try {
      await prisma.enrollment.upsert({
        where: { studentId_courseOfferingId: { studentId: e.studentId, courseOfferingId: e.courseOfferingId } },
        update: {},
        create: {
          id: e.id,
          courseOfferingId: e.courseOfferingId,
          studentId: e.studentId,
          semesterId: semId,
          classId: e.classId,
          sectionId: e.sectionId,
          subjectId: e.subjectId,
          status: "ACTIVE",
          source: "JOIN_CODE",
          joinedAt: dateDaysAgo(randInt(10, 30)),
        },
      })
      enrollCreated++
    } catch {
      // skip duplicates
    }
  }

  console.log(`  ✓ Created ${enrollCreated} enrollments`)

  // ── 8. Lectures ───────────────────────────────────────────────────

  interface LectureDef {
    id: string
    courseOfferingId: string
    scheduleSlotId: string | null
    title: string
    lectureDate: Date
    status: "COMPLETED" | "PLANNED"
    teacherId: string
    course: CourseDef
  }

  const lectures: LectureDef[] = []

  for (const c of newCoursesList) {
    const courseSlots = scheduleSlots.filter((s) => s.courseOfferingId === c.id)
    const numLectures = randInt(8, 14)
    for (let i = 0; i < numLectures; i++) {
      const slot = courseSlots.length > 0 ? courseSlots[i % courseSlots.length]! : null
      const daysAgo = numLectures - i
      const date = dateDaysAgo(daysAgo)
      const status = daysAgo >= 1 ? "COMPLETED" as const : "PLANNED" as const
      lectures.push({
        id: uid("lec"),
        courseOfferingId: c.id,
        scheduleSlotId: slot?.id ?? null,
        title: `Lecture ${i + 1}`,
        lectureDate: dateOnly(date),
        status,
        teacherId: c.teacherId,
        course: c,
      })
    }
  }

  for (const lec of lectures) {
    await prisma.lecture.create({
      data: {
        id: lec.id,
        courseOfferingId: lec.courseOfferingId,
        scheduleSlotId: lec.scheduleSlotId,
        createdByUserId: lec.teacherId,
        title: lec.title,
        lectureDate: lec.lectureDate,
        status: lec.status,
      },
    })
  }

  console.log(`  ✓ Created ${lectures.length} lectures`)

  // ── 9. Attendance sessions + records ──────────────────────────────

  const completedLectures = lectures.filter((l) => l.status === "COMPLETED")
  let sessionCount = 0
  let recordCount = 0

  for (const lec of completedLectures) {
    const c = lec.course
    const sessionId = uid("sess")
    const sessionStart = new Date(lec.lectureDate.getTime() + 9 * 3600 * 1000) // 9am IST
    const sessionEnd = new Date(sessionStart.getTime() + 15 * 60 * 1000) // 15 min

    // Get enrolled students for this course
    const courseEnrollments = enrollmentRecords.filter((e) => e.courseOfferingId === c.id)
    // Also include existing enrollments for existing courses (they won't be in enrollmentRecords)
    let enrolledStudentIds: string[]
    if (existingCourses.some((ec) => ec.id === c.id)) {
      // For existing courses, get enrollments from DB
      const dbEnrollments = await prisma.enrollment.findMany({
        where: { courseOfferingId: c.id, status: "ACTIVE" },
        select: { id: true, studentId: true },
      })
      enrolledStudentIds = dbEnrollments.map((e) => e.studentId)
    } else {
      enrolledStudentIds = courseEnrollments.map((e) => e.studentId)
    }

    if (enrolledStudentIds.length === 0) continue

    const rosterCount = enrolledStudentIds.length
    // Realistic attendance: 60-95% present
    const attendanceRate = randInt(60, 95) / 100
    const presentCount = Math.round(rosterCount * attendanceRate)
    const absentCount = rosterCount - presentCount

    const isBle = c.mode === "BLUETOOTH"
    await prisma.attendanceSession.create({
      data: {
        id: sessionId,
        courseOfferingId: c.id,
        lectureId: lec.id,
        teacherAssignmentId: c.taId,
        teacherId: c.teacherId,
        endedByUserId: c.teacherId,
        semesterId: semId,
        classId: c.classId,
        sectionId: c.sectionId,
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
    // Shuffle student IDs to randomize who's present
    const shuffled = [...enrolledStudentIds].sort(() => Math.random() - 0.5)
    const presentIds = new Set(shuffled.slice(0, presentCount))

    for (const studentId of enrolledStudentIds) {
      // Find enrollment ID
      let enrollmentId: string | undefined
      const localEnrl = enrollmentRecords.find((e) => e.courseOfferingId === c.id && e.studentId === studentId)
      if (localEnrl) {
        enrollmentId = localEnrl.id
      } else {
        const dbEnrl = await prisma.enrollment.findUnique({
          where: { studentId_courseOfferingId: { studentId, courseOfferingId: c.id } },
          select: { id: true },
        })
        enrollmentId = dbEnrl?.id
      }
      if (!enrollmentId) continue

      const isPresent = presentIds.has(studentId)
      await prisma.attendanceRecord.create({
        data: {
          id: uid("arec"),
          sessionId,
          enrollmentId,
          studentId,
          status: isPresent ? "PRESENT" : "ABSENT",
          markSource: isPresent ? (c.mode === "QR_GPS" ? "QR_GPS" : "BLUETOOTH") : null,
          markedAt: isPresent ? new Date(sessionStart.getTime() + randInt(1, 12) * 60 * 1000) : null,
        },
      })
      recordCount++
    }

    if (sessionCount % 20 === 0) {
      console.log(`    ... ${sessionCount} sessions, ${recordCount} records`)
    }
  }

  console.log(`  ✓ Created ${sessionCount} attendance sessions, ${recordCount} records`)

  // ── 10. Analytics summaries ───────────────────────────────────────

  // Student-course summaries
  let analyticsSummaries = 0
  for (const c of allCourses) {
    const sessions = await prisma.attendanceSession.findMany({
      where: { courseOfferingId: c.id, status: "ENDED" },
      select: { id: true },
    })
    if (sessions.length === 0) continue

    const enrollments = await prisma.enrollment.findMany({
      where: { courseOfferingId: c.id, status: "ACTIVE" },
      select: { studentId: true },
    })

    for (const enrl of enrollments) {
      const presentSessions = await prisma.attendanceRecord.count({
        where: { studentId: enrl.studentId, session: { courseOfferingId: c.id }, status: "PRESENT" },
      })
      const totalSessions = sessions.length
      const absentSessions = totalSessions - presentSessions
      const pct = totalSessions > 0 ? (presentSessions / totalSessions) * 100 : 0

      await prisma.analyticsStudentCourseSummary.upsert({
        where: { courseOfferingId_studentId: { courseOfferingId: c.id, studentId: enrl.studentId } },
        update: {
          totalSessions,
          presentSessions,
          absentSessions,
          attendancePercentage: Math.round(pct * 100) / 100,
          lastSessionAt: dateDaysAgo(1),
        },
        create: {
          courseOfferingId: c.id,
          studentId: enrl.studentId,
          totalSessions,
          presentSessions,
          absentSessions,
          attendancePercentage: Math.round(pct * 100) / 100,
          lastSessionAt: dateDaysAgo(1),
        },
      })
      analyticsSummaries++
    }

    if (analyticsSummaries % 200 === 0) {
      console.log(`    ... ${analyticsSummaries} analytics summaries`)
    }
  }

  console.log(`  ✓ Created ${analyticsSummaries} analytics student-course summaries`)

  // ── 11. Announcements ─────────────────────────────────────────────

  const announcementTemplates = [
    { title: "Welcome to the course!", body: "Welcome everyone. Please review the syllabus and schedule. Looking forward to a great semester." },
    { title: "Assignment 1 posted", body: "The first assignment has been posted. Due date is next Friday. Please submit through the portal." },
    { title: "Mid-semester exam schedule", body: "Mid-semester exams will be held in Week 8. Detailed schedule will be shared soon." },
    { title: "Lab session rescheduled", body: "This week's lab session has been moved to Thursday due to a scheduling conflict." },
    { title: "Extra class this Saturday", body: "We will hold an extra class this Saturday from 10am to 12pm to cover pending topics." },
  ]

  let announcementCount = 0
  for (const c of newCoursesList) {
    const numAnnouncements = randInt(2, 4)
    for (let i = 0; i < numAnnouncements; i++) {
      const template = announcementTemplates[i % announcementTemplates.length]!
      await prisma.announcementPost.create({
        data: {
          id: uid("ann"),
          courseOfferingId: c.id,
          authorUserId: c.teacherId,
          postType: "ANNOUNCEMENT",
          visibility: "STUDENT_AND_TEACHER",
          title: template.title,
          body: template.body,
          createdAt: dateDaysAgo(randInt(1, 20)),
        },
      })
      announcementCount++
    }
  }

  console.log(`  ✓ Created ${announcementCount} announcements`)

  // ── Done ──────────────────────────────────────────────────────────

  console.log("\n🎉 Bulk seed complete!")
  console.log(`   Teachers: 3 total (1 existing + 2 new)`)
  console.log(`   Students: ${allStudents.length} total (4 existing + ${allStudents.length - 4} new)`)
  console.log(`   Courses: ${allCourses.length} total`)
  console.log(`   Lectures: ${lectures.length}`)
  console.log(`   Sessions: ${sessionCount}`)
  console.log(`   Attendance records: ${recordCount}`)
  console.log(`   Analytics summaries: ${analyticsSummaries}`)
  console.log(`\n   All new users share password: Pass1234!`)
  console.log(`   Teacher logins: sneha.reddy@attendease.dev / vikram.mehta@attendease.dev`)
}

main()
  .catch((err) => {
    console.error("❌ Bulk seed failed:", err)
    process.exitCode = 1
  })
  .finally(() => disconnectPrismaClient(prisma))
