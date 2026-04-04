import type {
  AdminTeacherDetail,
  AdminTeacherSearchQuery,
  AdminTeacherSummary,
} from "@attendease/contracts"
import { Inject, Injectable, NotFoundException } from "@nestjs/common"

import { DatabaseService } from "../../database/database.service.js"

@Injectable()
export class AdminTeachersService {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService,
  ) {}

  async listTeachers(filters: AdminTeacherSearchQuery): Promise<AdminTeacherSummary[]> {
    const query = filters.query?.trim()

    const teachers = await this.database.prisma.user.findMany({
      where: {
        roles: { some: { role: "TEACHER" } },
        ...(filters.status ? { status: filters.status } : {}),
        ...(query
          ? {
              OR: [
                { email: { contains: query, mode: "insensitive" } },
                { displayName: { contains: query, mode: "insensitive" } },
                {
                  teacherProfile: {
                    is: { employeeCode: { contains: query, mode: "insensitive" } },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        teacherProfile: true,
        _count: {
          select: {
            primaryCourseOfferings: { where: { status: { in: ["ACTIVE", "COMPLETED"] } } },
          },
        },
      },
      orderBy: { displayName: "asc" },
      take: filters.limit,
    })

    return teachers.map((teacher) => ({
      id: teacher.id,
      email: teacher.email,
      displayName: teacher.displayName,
      status: teacher.status,
      employeeCode: teacher.teacherProfile?.employeeCode ?? null,
      department: teacher.teacherProfile?.department ?? null,
      designation: teacher.teacherProfile?.designation ?? null,
      classroomCount: teacher._count.primaryCourseOfferings,
      lastLoginAt: teacher.lastLoginAt?.toISOString() ?? null,
      createdAt: teacher.createdAt.toISOString(),
    }))
  }

  async getTeacherDetail(teacherId: string): Promise<AdminTeacherDetail> {
    const teacher = await this.database.prisma.user.findFirst({
      where: {
        id: teacherId,
        roles: { some: { role: "TEACHER" } },
      },
      include: {
        teacherProfile: true,
        _count: {
          select: {
            primaryCourseOfferings: { where: { status: { in: ["ACTIVE", "COMPLETED"] } } },
          },
        },
        primaryCourseOfferings: {
          include: {
            semester: { select: { title: true } },
            subject: { select: { code: true, title: true } },
            _count: {
              select: {
                enrollments: { where: { status: "ACTIVE" } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    })

    if (!teacher) {
      throw new NotFoundException(`Teacher ${teacherId} not found.`)
    }

    return {
      id: teacher.id,
      email: teacher.email,
      displayName: teacher.displayName,
      status: teacher.status,
      employeeCode: teacher.teacherProfile?.employeeCode ?? null,
      department: teacher.teacherProfile?.department ?? null,
      designation: teacher.teacherProfile?.designation ?? null,
      classroomCount: teacher._count.primaryCourseOfferings,
      lastLoginAt: teacher.lastLoginAt?.toISOString() ?? null,
      createdAt: teacher.createdAt.toISOString(),
      classrooms: teacher.primaryCourseOfferings.map((offering) => ({
        classroomId: offering.id,
        classroomTitle: offering.subject?.title
          ? `${offering.subject.code} — ${offering.subject.title}`
          : offering.displayTitle,
        courseCode: offering.subject?.code ?? offering.code,
        semesterTitle: offering.semester?.title ?? "Unknown",
        status: offering.status,
        studentCount: offering._count.enrollments,
      })),
    }
  }
}
