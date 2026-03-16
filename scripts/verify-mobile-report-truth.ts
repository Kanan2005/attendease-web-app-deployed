import assert from "node:assert/strict"

import { createAuthApiClient } from "@attendease/auth"
import { developmentAuthFixtures, developmentSeedIds } from "@attendease/db"

import {
  buildStudentReportOverviewModel,
  buildStudentSubjectReportModel,
  buildStudentSubjectReportSummaryModel,
} from "../apps/mobile/src/student-workflow-models.ts"
import {
  buildTeacherReportFilterOptions,
  buildTeacherReportOverviewModel,
} from "../apps/mobile/src/teacher-operational.ts"

async function main() {
  const baseUrl = process.env.ATTENDEASE_API_URL ?? "http://127.0.0.1:4000"
  const authClient = createAuthApiClient({
    baseUrl,
    fetcher: (input, init) =>
      globalThis.fetch(input, {
        ...init,
        headers: {
          ...(init?.headers ?? {}),
          "x-forwarded-for": "198.51.100.25",
        },
      }),
  })

  const studentFixture = developmentAuthFixtures.students.studentOne

  const [studentSession, teacherSession] = await Promise.all([
    authClient.login({
      email: studentFixture.email,
      password: studentFixture.password,
      platform: "MOBILE",
      requestedRole: "STUDENT",
      device: studentFixture.device,
    }),
    authClient.login({
      email: developmentAuthFixtures.teacher.email,
      password: developmentAuthFixtures.teacher.password,
      platform: "MOBILE",
      requestedRole: "TEACHER",
    }),
  ])

  const studentToken = studentSession.tokens.accessToken
  const teacherToken = teacherSession.tokens.accessToken

  const [studentOverview, studentSubjects, mathSubjectDetail] = await Promise.all([
    authClient.getStudentReportOverview(studentToken),
    authClient.listStudentSubjectReports(studentToken),
    authClient.getStudentSubjectReport(studentToken, developmentSeedIds.academic.mathSubject),
  ])

  const studentOverviewModel = buildStudentReportOverviewModel(studentOverview)
  const studentSubjectModels = studentSubjects.map((subject) =>
    buildStudentSubjectReportSummaryModel(subject),
  )
  const studentMathModel = buildStudentSubjectReportModel(mathSubjectDetail)

  assert.deepStrictEqual(studentOverviewModel, {
    trackedClassroomCount: studentOverview.trackedClassroomCount,
    totalSessions: studentOverview.totalSessions,
    presentSessions: studentOverview.presentSessions,
    absentSessions: studentOverview.absentSessions,
    attendancePercentage: studentOverview.attendancePercentage,
    lastSessionAt: studentOverview.lastSessionAt,
  })

  for (const [index, subject] of studentSubjects.entries()) {
    const model = studentSubjectModels[index]

    assert(model, `Expected a student subject model at index ${index}.`)
    assert.deepStrictEqual(model, {
      subjectId: subject.subjectId,
      subjectCode: subject.subjectCode,
      subjectTitle: subject.subjectTitle,
      classroomCount: subject.classroomCount,
      totalSessions: subject.totalSessions,
      presentSessions: subject.presentSessions,
      absentSessions: subject.absentSessions,
      attendancePercentage: subject.attendancePercentage,
      lastSessionAt: subject.lastSessionAt,
    })
  }

  assert.equal(studentMathModel.subjectId, mathSubjectDetail.subjectId)
  assert.equal(studentMathModel.attendancePercentage, mathSubjectDetail.attendancePercentage)
  assert.equal(studentMathModel.totalSessions, mathSubjectDetail.totalSessions)
  assert.equal(studentMathModel.classrooms.length, mathSubjectDetail.classrooms.length)

  const [
    teacherClassrooms,
    teacherDaywiseAll,
    teacherSubjectwiseAll,
    teacherStudentPercentagesAll,
    teacherDaywiseMath,
    teacherSubjectwiseMath,
    teacherStudentPercentagesMath,
  ] = await Promise.all([
    authClient.listClassrooms(teacherToken),
    authClient.listTeacherDaywiseReports(teacherToken),
    authClient.listTeacherSubjectwiseReports(teacherToken),
    authClient.listTeacherStudentPercentageReports(teacherToken),
    authClient.listTeacherDaywiseReports(teacherToken, {
      classroomId: developmentSeedIds.courseOfferings.math,
      subjectId: developmentSeedIds.academic.mathSubject,
    }),
    authClient.listTeacherSubjectwiseReports(teacherToken, {
      classroomId: developmentSeedIds.courseOfferings.math,
      subjectId: developmentSeedIds.academic.mathSubject,
    }),
    authClient.listTeacherStudentPercentageReports(teacherToken, {
      classroomId: developmentSeedIds.courseOfferings.math,
      subjectId: developmentSeedIds.academic.mathSubject,
    }),
  ])

  const teacherFilterOptions = buildTeacherReportFilterOptions({
    classrooms: teacherClassrooms,
    subjectRows: teacherSubjectwiseAll,
  })
  const teacherMathClassroom = teacherClassrooms.find(
    (classroom) => classroom.id === developmentSeedIds.courseOfferings.math,
  )
  const teacherMathSubject = teacherSubjectwiseAll.find(
    (row) => row.subjectId === developmentSeedIds.academic.mathSubject,
  )
  const teacherReportModel = buildTeacherReportOverviewModel({
    daywiseRows: teacherDaywiseMath,
    subjectRows: teacherSubjectwiseMath,
    studentRows: teacherStudentPercentagesMath,
    filterLabels: {
      classroom: teacherMathClassroom?.displayTitle ?? null,
      subject: teacherMathSubject?.subjectTitle ?? null,
    },
  })

  assert(
    teacherFilterOptions.classroomOptions.some(
      (option) => option.value === developmentSeedIds.courseOfferings.math,
    ),
    "Expected math classroom filter option to be available in teacher mobile reports.",
  )
  assert(
    teacherFilterOptions.subjectOptions.some(
      (option) => option.value === developmentSeedIds.academic.mathSubject,
    ),
    "Expected math subject filter option to be available in teacher mobile reports.",
  )
  assert(
    teacherReportModel.subjectRows.every(
      (row) =>
        row.classroomId === developmentSeedIds.courseOfferings.math &&
        row.subjectId === developmentSeedIds.academic.mathSubject,
    ),
    "Expected teacher subject-wise mobile rows to stay scoped to the selected classroom and subject.",
  )
  assert(
    teacherReportModel.studentRows.every(
      (row) =>
        row.classroomId === developmentSeedIds.courseOfferings.math &&
        row.subjectId === developmentSeedIds.academic.mathSubject,
    ),
    "Expected teacher student-percentage mobile rows to stay scoped to the selected classroom and subject.",
  )
  assert(
    teacherReportModel.daywiseRows.every(
      (row) =>
        row.classroomId === developmentSeedIds.courseOfferings.math &&
        row.subjectId === developmentSeedIds.academic.mathSubject,
    ),
    "Expected teacher day-wise mobile rows to stay scoped to the selected classroom and subject.",
  )

  const teacherStudentOneMathRow = teacherStudentPercentagesMath.find(
    (row) => row.studentId === studentFixture.userId,
  )
  const studentMathClassroomRow = mathSubjectDetail.classrooms.find(
    (row) => row.classroomId === developmentSeedIds.courseOfferings.math,
  )

  assert(teacherStudentOneMathRow, "Expected a teacher report row for student one in math.")
  assert(studentMathClassroomRow, "Expected a student math classroom detail row.")

  assert.deepStrictEqual(
    {
      totalSessions: teacherStudentOneMathRow.totalSessions,
      presentSessions: teacherStudentOneMathRow.presentSessions,
      absentSessions: teacherStudentOneMathRow.absentSessions,
      attendancePercentage: teacherStudentOneMathRow.attendancePercentage,
    },
    {
      totalSessions: studentMathClassroomRow.totalSessions,
      presentSessions: studentMathClassroomRow.presentSessions,
      absentSessions: studentMathClassroomRow.absentSessions,
      attendancePercentage: studentMathClassroomRow.attendancePercentage,
    },
  )

  const evidence = {
    baseUrl,
    student: {
      overview: {
        trackedClassroomCount: studentOverview.trackedClassroomCount,
        totalSessions: studentOverview.totalSessions,
        presentSessions: studentOverview.presentSessions,
        absentSessions: studentOverview.absentSessions,
        attendancePercentage: studentOverview.attendancePercentage,
      },
      subjects: studentSubjects.map((subject) => ({
        subjectId: subject.subjectId,
        subjectTitle: subject.subjectTitle,
        totalSessions: subject.totalSessions,
        attendancePercentage: subject.attendancePercentage,
      })),
      mathDetail: {
        classroomCount: mathSubjectDetail.classroomCount,
        totalSessions: mathSubjectDetail.totalSessions,
        attendancePercentage: mathSubjectDetail.attendancePercentage,
      },
    },
    teacher: {
      unfiltered: {
        classroomFilterCount: teacherFilterOptions.classroomOptions.length,
        subjectFilterCount: teacherFilterOptions.subjectOptions.length,
        daywiseRowCount: teacherDaywiseAll.length,
        subjectwiseRowCount: teacherSubjectwiseAll.length,
        studentPercentageRowCount: teacherStudentPercentagesAll.length,
      },
      filteredMath: {
        daywiseRowCount: teacherDaywiseMath.length,
        subjectwiseRowCount: teacherSubjectwiseMath.length,
        studentPercentageRowCount: teacherStudentPercentagesMath.length,
        filterSummary: teacherReportModel.filterSummary,
      },
      alignedStudentRow: {
        studentId: teacherStudentOneMathRow.studentId,
        totalSessions: teacherStudentOneMathRow.totalSessions,
        presentSessions: teacherStudentOneMathRow.presentSessions,
        absentSessions: teacherStudentOneMathRow.absentSessions,
        attendancePercentage: teacherStudentOneMathRow.attendancePercentage,
      },
    },
  }

  console.log("Mobile report truth verification passed.")
  console.log(JSON.stringify(evidence, null, 2))
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error
      ? [
          error.stack ?? error.message,
          "status" in error ? `status=${String((error as { status?: unknown }).status)}` : null,
          "details" in error
            ? `details=${JSON.stringify((error as { details?: unknown }).details)}`
            : null,
        ]
          .filter(Boolean)
          .join("\n")
      : String(error)
  console.error("Mobile report truth verification failed.")
  console.error(message)
  process.exitCode = 1
})
