import { ForbiddenException, NotFoundException } from "@nestjs/common"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AssignmentsService } from "./assignments.service.js"

describe("AssignmentsService", () => {
  const database = {
    prisma: {
      teacherAssignment: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      courseOffering: {
        findUnique: vi.fn(),
      },
    },
  }

  let service: AssignmentsService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new AssignmentsService(database as never)
  })

  it("allows a teacher to manage a course offering inside the assigned scope", async () => {
    database.prisma.courseOffering.findUnique.mockResolvedValue({
      id: "course_1",
      primaryTeacherId: "teacher_1",
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      code: "MATH101-A",
      displayTitle: "Mathematics",
      status: "ACTIVE",
      requiresTrustedDevice: true,
    })
    database.prisma.teacherAssignment.findFirst.mockResolvedValue({
      id: "assignment_1",
      teacherId: "teacher_1",
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      status: "ACTIVE",
      canSelfCreateCourseOffering: true,
    })

    await expect(
      service.ensureTeacherCanManageCourseOffering("teacher_1", "course_1"),
    ).resolves.toMatchObject({
      id: "course_1",
      code: "MATH101-A",
      status: "ACTIVE",
    })
  })

  it("blocks course-offering creation when self-create is disabled", async () => {
    database.prisma.teacherAssignment.findFirst.mockResolvedValue({
      id: "assignment_1",
      teacherId: "teacher_1",
      semesterId: "semester_1",
      classId: "class_1",
      sectionId: "section_1",
      subjectId: "subject_1",
      status: "ACTIVE",
      canSelfCreateCourseOffering: false,
    })

    await expect(
      service.ensureTeacherCanCreateCourseOffering("teacher_1", {
        semesterId: "semester_1",
        classId: "class_1",
        sectionId: "section_1",
        subjectId: "subject_1",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it("filters teacher assignments by academic scope", async () => {
    database.prisma.teacherAssignment.findMany.mockResolvedValue([
      {
        id: "assignment_1",
        teacherId: "teacher_1",
        semesterId: "semester_1",
        semester: {
          code: "SEM6",
          title: "Semester 6",
        },
        classId: "class_1",
        academicClass: {
          code: "CSE6",
          title: "CSE 6",
        },
        sectionId: "section_1",
        section: {
          code: "A",
          title: "Section A",
        },
        subjectId: "subject_1",
        subject: {
          code: "MATH101",
          title: "Mathematics",
        },
        status: "ACTIVE",
        canSelfCreateCourseOffering: true,
      },
    ])

    await expect(
      service.listTeacherAssignments("teacher_1", {
        semesterId: "semester_1",
        classId: "class_1",
      }),
    ).resolves.toMatchObject([
      {
        id: "assignment_1",
        classId: "class_1",
        semesterCode: "SEM6",
        classCode: "CSE6",
        sectionCode: "A",
        subjectCode: "MATH101",
      },
    ])

    expect(database.prisma.teacherAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          teacherId: "teacher_1",
          semesterId: "semester_1",
          classId: "class_1",
        }),
      }),
    )
  })

  it("returns a scoped teacher assignment by id", async () => {
    database.prisma.teacherAssignment.findFirst.mockResolvedValue({
      id: "assignment_1",
      teacherId: "teacher_1",
      semesterId: "semester_1",
      semester: {
        code: "SEM6",
        title: "Semester 6",
      },
      classId: "class_1",
      academicClass: {
        code: "CSE6",
        title: "CSE 6",
      },
      sectionId: "section_1",
      section: {
        code: "A",
        title: "Section A",
      },
      subjectId: "subject_1",
      subject: {
        code: "MATH101",
        title: "Mathematics",
      },
      status: "ACTIVE",
      canSelfCreateCourseOffering: true,
    })

    await expect(service.getTeacherAssignment("teacher_1", "assignment_1")).resolves.toMatchObject({
      id: "assignment_1",
      teacherId: "teacher_1",
      semesterCode: "SEM6",
      classCode: "CSE6",
      sectionCode: "A",
      subjectCode: "MATH101",
    })
  })

  it("rejects unknown teacher assignments outside the teacher scope", async () => {
    database.prisma.teacherAssignment.findFirst.mockResolvedValue(null)

    await expect(
      service.getTeacherAssignment("teacher_1", "assignment_404"),
    ).rejects.toBeInstanceOf(NotFoundException)
  })
})
