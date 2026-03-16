import { describe, expect, it } from "vitest"

import {
  buildComprehensiveCsvBuffer,
  buildExportFileName,
  buildSessionCsvBuffer,
  buildSessionPdfBuffer,
  buildStudentPercentageCsvBuffer,
  resolveSignedUrlEndpoint,
} from "./index"

describe("export helpers", () => {
  it("builds export file names with a filesystem-safe timestamp", () => {
    const fileName = buildExportFileName(
      "attendance-report",
      "csv",
      new Date("2026-03-14T10:15:30.000Z"),
    )

    expect(fileName).toBe("attendance-report-2026-03-14T10-15-30.000Z.csv")
  })

  it("builds session CSV files with session metadata and final attendance truth", () => {
    const buffer = buildSessionCsvBuffer({
      sessionId: "session_1",
      classroomCode: "CSE6-MATH-A",
      classroomTitle: "Maths",
      subjectCode: "MATH101",
      subjectTitle: "Mathematics",
      mode: "QR_GPS",
      startedAt: "2026-03-10T03:30:00.000Z",
      endedAt: "2026-03-10T03:45:00.000Z",
      presentCount: 3,
      absentCount: 1,
      rows: [
        {
          studentEmail: "student.three@attendease.dev",
          studentDisplayName: "Student Three",
          studentRollNumber: "23CS003",
          attendanceStatus: "PRESENT",
          markedAt: "2026-03-10T03:40:00.000Z",
        },
      ],
    })

    const csv = buffer.toString("utf8")

    expect(csv).toContain("session_id,classroom_code,classroom_title")
    expect(csv).toContain("session_1,CSE6-MATH-A,Maths")
    expect(csv).toContain("student.three@attendease.dev,Student Three,23CS003,PRESENT")
  })

  it("builds student percentage CSV files with attendance percentages", () => {
    const buffer = buildStudentPercentageCsvBuffer([
      {
        classroomCode: "CSE6-MATH-A",
        classroomTitle: "Maths",
        classCode: "BTECH-CSE",
        sectionCode: "A",
        subjectCode: "MATH101",
        subjectTitle: "Mathematics",
        studentEmail: "student.one@attendease.dev",
        studentDisplayName: "Student One",
        studentRollNumber: "23CS001",
        totalSessions: 4,
        presentSessions: 3,
        absentSessions: 1,
        attendancePercentage: 75,
      },
    ])

    const csv = buffer.toString("utf8")

    expect(csv).toContain("attendance_percentage")
    expect(csv).toContain("student.one@attendease.dev,Student One,23CS001,4,3,1,75")
  })

  it("builds comprehensive CSV files with session matrix columns", () => {
    const buffer = buildComprehensiveCsvBuffer({
      sessionColumns: [
        {
          sessionId: "session_1",
          sessionLabel: "MATH101 2026-03-10",
        },
        {
          sessionId: "session_2",
          sessionLabel: "PHY101 2026-03-12",
        },
      ],
      rows: [
        {
          studentEmail: "student.one@attendease.dev",
          studentDisplayName: "Student One",
          studentRollNumber: "23CS001",
          totalSessions: 2,
          presentSessions: 1,
          absentSessions: 1,
          attendancePercentage: 50,
          subjectBreakdown: "MATH101 Mathematics: 1/1 (100%) | PHY101 Physics: 0/1 (0%)",
          sessionStatuses: {
            session_1: "PRESENT",
            session_2: "ABSENT",
          },
        },
      ],
    })

    const csv = buffer.toString("utf8")

    expect(csv).toContain("subject_breakdown,MATH101 2026-03-10,PHY101 2026-03-12")
    expect(csv).toContain("student.one@attendease.dev,Student One,23CS001,2,1,1,50")
    expect(csv).toContain("PRESENT,ABSENT")
  })

  it("builds session PDF files that start with a PDF signature", async () => {
    const buffer = await buildSessionPdfBuffer({
      title: "Attendance Session session_1",
      classroomTitle: "Maths",
      subjectTitle: "Mathematics",
      mode: "QR_GPS",
      startedAt: "2026-03-10T03:30:00.000Z",
      endedAt: "2026-03-10T03:45:00.000Z",
      presentCount: 3,
      absentCount: 1,
      rows: [
        {
          studentEmail: "student.one@attendease.dev",
          studentDisplayName: "Student One",
          studentRollNumber: "23CS001",
          attendanceStatus: "PRESENT",
          markedAt: "2026-03-10T03:31:00.000Z",
        },
      ],
    })

    expect(buffer.subarray(0, 4).toString("utf8")).toBe("%PDF")
  })

  it("resolves a public endpoint for signed download URLs when needed", () => {
    expect(resolveSignedUrlEndpoint("http://minio:9000", "http://localhost:9000")).toBe(
      "http://localhost:9000",
    )
    expect(resolveSignedUrlEndpoint("http://minio:9000")).toBe("http://minio:9000")
  })
})
