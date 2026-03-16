import type { ClassroomListQuery } from "@attendease/contracts"
import type { Prisma } from "@attendease/db"
import { ForbiddenException, NotFoundException } from "@nestjs/common"

import type { DatabaseService } from "../../database/database.service.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import type { AssignmentsService } from "./assignments.service.js"
import type { ClassroomAccessContext, ClassroomScope } from "./classrooms.service.types.js"

type AssignmentAccessService = Pick<
  AssignmentsService,
  | "ensureTeacherCanCreateCourseOffering"
  | "ensureTeacherCanManageCourseOffering"
  | "ensureTeacherHasScope"
  | "listTeacherAssignments"
>

export function buildAdminClassroomWhere(
  filters: ClassroomListQuery,
): Prisma.CourseOfferingWhereInput {
  return {
    ...(filters.semesterId ? { semesterId: filters.semesterId } : {}),
    ...(filters.classId ? { classId: filters.classId } : {}),
    ...(filters.sectionId ? { sectionId: filters.sectionId } : {}),
    ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.primaryTeacherId ? { primaryTeacherId: filters.primaryTeacherId } : {}),
  }
}

export async function buildTeacherClassroomWhere(input: {
  assignmentsService: AssignmentAccessService
  teacherId: string
  filters: ClassroomListQuery
}): Promise<Prisma.CourseOfferingWhereInput | null> {
  const assignments = await input.assignmentsService.listTeacherAssignments(input.teacherId, {
    ...(input.filters.semesterId ? { semesterId: input.filters.semesterId } : {}),
    ...(input.filters.classId ? { classId: input.filters.classId } : {}),
    ...(input.filters.sectionId ? { sectionId: input.filters.sectionId } : {}),
    ...(input.filters.subjectId ? { subjectId: input.filters.subjectId } : {}),
  })

  if (assignments.length === 0) {
    return null
  }

  return {
    primaryTeacherId: input.teacherId,
    ...(input.filters.status ? { status: input.filters.status } : {}),
    OR: assignments.map((assignment) => ({
      semesterId: assignment.semesterId,
      classId: assignment.classId,
      sectionId: assignment.sectionId,
      subjectId: assignment.subjectId,
    })),
  }
}

export async function assertClassroomCreationAccess(input: {
  assignmentsService: AssignmentAccessService
  auth: AuthRequestContext
  primaryTeacherId: string
  scope: ClassroomScope
}) {
  if (input.auth.activeRole === "TEACHER") {
    await input.assignmentsService.ensureTeacherCanCreateCourseOffering(
      input.auth.userId,
      input.scope,
    )
    return
  }

  if (input.auth.activeRole === "ADMIN") {
    await input.assignmentsService.ensureTeacherHasScope(input.primaryTeacherId, input.scope)
    return
  }

  throw new ForbiddenException("Only teachers and admins can create classrooms.")
}

export async function assertClassroomUpdateAccess(input: {
  assignmentsService: AssignmentAccessService
  auth: AuthRequestContext
  existing: ClassroomAccessContext
  primaryTeacherId: string
  scope: ClassroomScope
}) {
  if (input.auth.activeRole === "TEACHER") {
    if (input.primaryTeacherId !== input.auth.userId) {
      throw new ForbiddenException("Teachers cannot reassign classroom ownership.")
    }

    await input.assignmentsService.ensureTeacherCanManageCourseOffering(
      input.auth.userId,
      input.existing.id,
    )
    return
  }

  if (input.auth.activeRole === "ADMIN") {
    await input.assignmentsService.ensureTeacherHasScope(input.primaryTeacherId, input.scope)
    return
  }

  throw new ForbiddenException("Only teachers and admins can update classrooms.")
}

export async function requireAccessibleClassroom(input: {
  database: DatabaseService["prisma"]
  assignmentsService: AssignmentAccessService
  auth: AuthRequestContext
  classroomId: string
}): Promise<ClassroomAccessContext> {
  if (input.auth.activeRole === "TEACHER") {
    await input.assignmentsService.ensureTeacherCanManageCourseOffering(
      input.auth.userId,
      input.classroomId,
    )
  } else if (input.auth.activeRole === "STUDENT") {
    const enrollment = await input.database.enrollment.findFirst({
      where: {
        courseOfferingId: input.classroomId,
        studentId: input.auth.userId,
        status: {
          in: ["ACTIVE", "PENDING"],
        },
      },
      select: {
        id: true,
      },
    })

    if (!enrollment) {
      throw new ForbiddenException("Students can only access classrooms they belong to.")
    }
  } else if (input.auth.activeRole !== "ADMIN") {
    throw new ForbiddenException("Only teachers and admins can access classrooms.")
  }

  const classroom = await input.database.courseOffering.findUnique({
    where: {
      id: input.classroomId,
    },
    include: {
      semester: {
        select: {
          id: true,
          status: true,
          startDate: true,
          endDate: true,
        },
      },
    },
  })

  if (!classroom) {
    throw new NotFoundException("Classroom not found.")
  }

  return {
    id: classroom.id,
    semesterId: classroom.semesterId,
    classId: classroom.classId,
    sectionId: classroom.sectionId,
    subjectId: classroom.subjectId,
    primaryTeacherId: classroom.primaryTeacherId,
    status: classroom.status,
    semester: classroom.semester,
  }
}
