import { describe, expect, it } from "vitest"

import {
  toStudentReportOverview,
  toStudentSubjectReportDetail,
  toStudentSubjectReportSummaries,
  toTeacherDaywiseAttendanceReportRow,
  toTeacherStudentAttendancePercentageReportRow,
} from "./reports.models.js"

describe("report model mapping", () => {
  it("maps teacher rollups using shared attendance percentage rules", () => {
    const daywise = toTeacherDaywiseAttendanceReportRow({
      attendance_date: "2026-03-10T00:00:00.000Z",
      course_offering_id: "course_1",
      course_offering_code: "CSE6-MATH-A",
      course_offering_title: "Maths",
      class_id: "class_1",
      class_code: "BTECH-CSE",
      class_title: "B.Tech CSE",
      section_id: "section_1",
      section_code: "A",
      section_title: "Section A",
      subject_id: "subject_1",
      subject_code: "MATH101",
      subject_title: "Mathematics",
      session_count: 1,
      total_students: 4,
      present_count: 3,
      absent_count: 1,
      last_session_at: "2026-03-10T03:45:00.000Z",
    })
    const student = toTeacherStudentAttendancePercentageReportRow({
      course_offering_id: "course_1",
      course_offering_code: "CSE6-MATH-A",
      course_offering_title: "Maths",
      class_id: "class_1",
      class_code: "BTECH-CSE",
      class_title: "B.Tech CSE",
      section_id: "section_1",
      section_code: "A",
      section_title: "Section A",
      subject_id: "subject_1",
      subject_code: "MATH101",
      subject_title: "Mathematics",
      student_id: "student_1",
      student_email: "student.one@attendease.dev",
      student_name: "Student One",
      student_roll_number: "23CS001",
      enrollment_status: "ACTIVE",
      total_sessions: 3,
      present_sessions: 2,
      absent_sessions: 1,
      last_session_at: "2026-03-10T03:45:00.000Z",
    })

    expect(daywise.attendancePercentage).toBe(75)
    expect(student.attendancePercentage).toBe(66.67)
  })

  it("builds student summaries and details without dropping zero-session classrooms", () => {
    const rows = [
      {
        subject_id: "subject_math",
        subject_code: "MATH101",
        subject_title: "Mathematics",
        course_offering_id: "course_math",
        course_offering_code: "CSE6-MATH-A",
        course_offering_title: "Maths",
        total_sessions: 1,
        present_sessions: 1,
        absent_sessions: 0,
        last_session_at: "2026-03-10T03:45:00.000Z",
      },
      {
        subject_id: "subject_physics",
        subject_code: "PHYS101",
        subject_title: "Physics",
        course_offering_id: "course_physics",
        course_offering_code: "CSE6-PHYS-A",
        course_offering_title: "Physics",
        total_sessions: 0,
        present_sessions: 0,
        absent_sessions: 0,
        last_session_at: null,
      },
    ]

    const summaries = toStudentSubjectReportSummaries(rows)
    const physicsSummary = summaries.find((row) => row.subjectId === "subject_physics")
    const mathDetail = toStudentSubjectReportDetail("subject_math", rows)

    expect(summaries).toHaveLength(2)
    expect(physicsSummary).toMatchObject({
      subjectCode: "PHYS101",
      totalSessions: 0,
      attendancePercentage: 0,
    })
    expect(mathDetail).toMatchObject({
      subjectId: "subject_math",
      classroomCount: 1,
      totalSessions: 1,
      classrooms: [
        expect.objectContaining({
          classroomCode: "CSE6-MATH-A",
          attendancePercentage: 100,
        }),
      ],
    })
  })

  it("returns zeroed student overview rows when a student has no report data yet", () => {
    expect(toStudentReportOverview("student_1", null)).toMatchObject({
      studentId: "student_1",
      trackedClassroomCount: 0,
      totalSessions: 0,
      presentSessions: 0,
      absentSessions: 0,
      attendancePercentage: 0,
    })
  })
})
