import { ForbiddenException, NotFoundException } from "@nestjs/common"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { EnrollmentsService } from "./enrollments.service.js"

describe("EnrollmentsService", () => {
  const database = {
    prisma: {
      enrollment: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      courseOffering: {
        findUnique: vi.fn(),
      },
    },
  }

  let service: EnrollmentsService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new EnrollmentsService(database as never)
  })

  it("allows a student to use an active enrollment for the requested course offering", async () => {
    database.prisma.courseOffering.findUnique.mockResolvedValue({
      id: "course_1",
      primaryTeacherId: "teacher_1",
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      status: "ACTIVE",
    })
    database.prisma.enrollment.findFirst.mockResolvedValue({
      id: "enrollment_1",
      courseOfferingId: "course_1",
      studentId: "student_1",
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      status: "ACTIVE",
      source: "JOIN_CODE",
    })

    await expect(
      service.ensureStudentEligibleForCourseOffering("student_1", "course_1"),
    ).resolves.toMatchObject({
      id: "enrollment_1",
      courseOfferingId: "course_1",
      status: "ACTIVE",
    })
  })

  it("blocks a student from accessing another student's enrollment", async () => {
    database.prisma.enrollment.findUnique.mockResolvedValue({
      id: "enrollment_2",
      courseOfferingId: "course_1",
      studentId: "student_2",
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      status: "ACTIVE",
      source: "JOIN_CODE",
    })

    await expect(
      service.ensureStudentEnrollmentAccess("student_1", "enrollment_2"),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it("filters student enrollments by course offering and status", async () => {
    database.prisma.enrollment.findMany.mockResolvedValue([
      {
        id: "enrollment_1",
        courseOfferingId: "course_1",
        studentId: "student_1",
        semesterId: "semester_1",
        classId: "class_1",
        sectionId: "section_1",
        subjectId: "subject_1",
        status: "ACTIVE",
        source: "JOIN_CODE",
      },
    ])

    await expect(
      service.listStudentEnrollments("student_1", {
        courseOfferingId: "course_1",
        status: "ACTIVE",
      }),
    ).resolves.toMatchObject([{ id: "enrollment_1", courseOfferingId: "course_1" }])

    expect(database.prisma.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          studentId: "student_1",
          courseOfferingId: "course_1",
          status: "ACTIVE",
        }),
      }),
    )
  })

  it("returns a scoped student enrollment by id", async () => {
    database.prisma.enrollment.findFirst.mockResolvedValue({
      id: "enrollment_1",
      courseOfferingId: "course_1",
      studentId: "student_1",
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      status: "ACTIVE",
      source: "JOIN_CODE",
    })

    await expect(service.getStudentEnrollment("student_1", "enrollment_1")).resolves.toMatchObject({
      id: "enrollment_1",
      studentId: "student_1",
    })
  })

  it("rejects missing student enrollments", async () => {
    database.prisma.enrollment.findFirst.mockResolvedValue(null)

    await expect(
      service.getStudentEnrollment("student_1", "enrollment_404"),
    ).rejects.toBeInstanceOf(NotFoundException)
  })
})
