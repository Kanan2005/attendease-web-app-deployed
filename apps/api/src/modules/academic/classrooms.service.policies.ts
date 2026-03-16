import type { UpdateClassroomRequest } from "@attendease/contracts"
import { resolveClassroomTitle, resolveCourseCode } from "@attendease/domain"
import { BadRequestException, ForbiddenException } from "@nestjs/common"

import type { AuthRequestContext } from "../auth/auth.types.js"
import type { ClassroomAccessContext } from "./classrooms.service.types.js"

export function resolvePrimaryTeacherId(
  auth: AuthRequestContext,
  requestedTeacherId?: string,
): string {
  if (auth.activeRole === "TEACHER") {
    if (requestedTeacherId && requestedTeacherId !== auth.userId) {
      throw new ForbiddenException("Teachers can create classrooms only for themselves.")
    }

    return auth.userId
  }

  if (auth.activeRole === "ADMIN") {
    if (!requestedTeacherId) {
      throw new BadRequestException("Primary teacher id is required for admin classroom creation.")
    }

    return requestedTeacherId
  }

  throw new ForbiddenException("Only teachers and admins can create classrooms.")
}

export function assertTeacherUpdateDoesNotChangeScope(request: UpdateClassroomRequest) {
  if (
    request.semesterId !== undefined ||
    request.classId !== undefined ||
    request.sectionId !== undefined ||
    request.subjectId !== undefined ||
    request.primaryTeacherId !== undefined
  ) {
    throw new ForbiddenException(
      "Teachers cannot change classroom scope or primary ownership after creation.",
    )
  }
}

export function assertSemesterAllowsAcademicChanges(
  status: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED",
) {
  if (status === "CLOSED" || status === "ARCHIVED") {
    throw new BadRequestException(
      "Classroom and lecture changes are not allowed in closed or archived semesters.",
    )
  }
}

export function assertClassroomCanBeModified(status: ClassroomAccessContext["status"]) {
  if (status === "ARCHIVED") {
    throw new BadRequestException("Archived classrooms cannot be modified.")
  }
}

export function requireCourseCode(input: {
  code?: string | undefined
  courseCode?: string | undefined
}) {
  const courseCode = resolveCourseCode({
    code: input.code ?? null,
    courseCode: input.courseCode ?? null,
  })

  if (!courseCode) {
    throw new BadRequestException("Course code is required.")
  }

  return courseCode
}

export function requireClassroomTitle(input: {
  displayTitle?: string | undefined
  classroomTitle?: string | undefined
}) {
  const classroomTitle = resolveClassroomTitle({
    displayTitle: input.displayTitle ?? null,
    classroomTitle: input.classroomTitle ?? null,
  })

  if (!classroomTitle) {
    throw new BadRequestException("Classroom title is required.")
  }

  return classroomTitle
}
