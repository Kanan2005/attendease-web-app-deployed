import {
  type AcademicScope,
  type CourseOfferingSummary,
  type TeacherAssignmentListQuery,
  type TeacherAssignmentSummary,
  courseOfferingSummarySchema,
  teacherAssignmentSummarySchema,
} from "@attendease/contracts"
import { canTeacherCreateCourseOffering, canTeacherManageCourseOffering } from "@attendease/domain"
import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common"

import { DatabaseService } from "../../database/database.service.js"

@Injectable()
export class AssignmentsService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async listTeacherAssignments(
    teacherId: string,
    filters: TeacherAssignmentListQuery = {},
  ): Promise<TeacherAssignmentSummary[]> {
    const assignments = await this.database.prisma.teacherAssignment.findMany({
      where: {
        teacherId,
        status: "ACTIVE",
        ...(filters.semesterId ? { semesterId: filters.semesterId } : {}),
        ...(filters.classId ? { classId: filters.classId } : {}),
        ...(filters.sectionId ? { sectionId: filters.sectionId } : {}),
        ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
      },
      orderBy: [
        {
          semesterId: "asc",
        },
        {
          classId: "asc",
        },
        {
          sectionId: "asc",
        },
        {
          subjectId: "asc",
        },
      ],
      include: {
        semester: true,
        academicClass: true,
        section: true,
        subject: true,
      },
    })

    return teacherAssignmentSummarySchema.array().parse(
      assignments.map((assignment) => ({
        id: assignment.id,
        teacherId: assignment.teacherId,
        semesterId: assignment.semesterId,
        semesterCode: assignment.semester.code,
        semesterTitle: assignment.semester.title,
        classId: assignment.classId,
        classCode: assignment.academicClass.code,
        classTitle: assignment.academicClass.title,
        sectionId: assignment.sectionId,
        sectionCode: assignment.section.code,
        sectionTitle: assignment.section.title,
        subjectId: assignment.subjectId,
        subjectCode: assignment.subject.code,
        subjectTitle: assignment.subject.title,
        status: assignment.status,
        canSelfCreateCourseOffering: assignment.canSelfCreateCourseOffering,
      })),
    )
  }

  async getTeacherAssignment(
    teacherId: string,
    assignmentId: string,
  ): Promise<TeacherAssignmentSummary> {
    const assignment = await this.database.prisma.teacherAssignment.findFirst({
      where: {
        id: assignmentId,
        teacherId,
        status: "ACTIVE",
      },
      include: {
        semester: true,
        academicClass: true,
        section: true,
        subject: true,
      },
    })

    if (!assignment) {
      throw new NotFoundException("Teacher assignment not found.")
    }

    return teacherAssignmentSummarySchema.parse({
      id: assignment.id,
      teacherId: assignment.teacherId,
      semesterId: assignment.semesterId,
      semesterCode: assignment.semester.code,
      semesterTitle: assignment.semester.title,
      classId: assignment.classId,
      classCode: assignment.academicClass.code,
      classTitle: assignment.academicClass.title,
      sectionId: assignment.sectionId,
      sectionCode: assignment.section.code,
      sectionTitle: assignment.section.title,
      subjectId: assignment.subjectId,
      subjectCode: assignment.subject.code,
      subjectTitle: assignment.subject.title,
      status: assignment.status,
      canSelfCreateCourseOffering: assignment.canSelfCreateCourseOffering,
    })
  }

  async ensureTeacherHasScope(
    teacherId: string,
    scope: AcademicScope,
  ): Promise<TeacherAssignmentSummary> {
    const assignment = await this.database.prisma.teacherAssignment.findFirst({
      where: {
        teacherId,
        status: "ACTIVE",
        semesterId: scope.semesterId,
        classId: scope.classId,
        sectionId: scope.sectionId,
        subjectId: scope.subjectId,
      },
      include: {
        semester: true,
        academicClass: true,
        section: true,
        subject: true,
      },
    })

    if (!assignment) {
      throw new ForbiddenException("The teacher is not assigned to the requested academic scope.")
    }

    return teacherAssignmentSummarySchema.parse({
      id: assignment.id,
      teacherId: assignment.teacherId,
      semesterId: assignment.semesterId,
      semesterCode: assignment.semester.code,
      semesterTitle: assignment.semester.title,
      classId: assignment.classId,
      classCode: assignment.academicClass.code,
      classTitle: assignment.academicClass.title,
      sectionId: assignment.sectionId,
      sectionCode: assignment.section.code,
      sectionTitle: assignment.section.title,
      subjectId: assignment.subjectId,
      subjectCode: assignment.subject.code,
      subjectTitle: assignment.subject.title,
      status: assignment.status,
      canSelfCreateCourseOffering: assignment.canSelfCreateCourseOffering,
    })
  }

  async ensureTeacherCanManageCourseOffering(
    teacherId: string,
    courseOfferingId: string,
  ): Promise<CourseOfferingSummary> {
    const courseOffering = await this.database.prisma.courseOffering.findUnique({
      where: {
        id: courseOfferingId,
      },
    })

    if (!courseOffering) {
      throw new NotFoundException("Course offering not found.")
    }

    const assignment = await this.database.prisma.teacherAssignment.findFirst({
      where: {
        teacherId,
        status: "ACTIVE",
        semesterId: courseOffering.semesterId,
        classId: courseOffering.classId,
        sectionId: courseOffering.sectionId,
        subjectId: courseOffering.subjectId,
      },
    })

    if (
      !assignment ||
      !canTeacherManageCourseOffering(teacherId, assignment, {
        id: courseOffering.id,
        primaryTeacherId: courseOffering.primaryTeacherId,
        semesterId: courseOffering.semesterId,
        classId: courseOffering.classId,
        sectionId: courseOffering.sectionId,
        subjectId: courseOffering.subjectId,
        status: courseOffering.status,
      })
    ) {
      throw new ForbiddenException("The teacher cannot manage the requested course offering.")
    }

    return courseOfferingSummarySchema.parse({
      id: courseOffering.id,
      primaryTeacherId: courseOffering.primaryTeacherId,
      semesterId: courseOffering.semesterId,
      classId: courseOffering.classId,
      sectionId: courseOffering.sectionId,
      subjectId: courseOffering.subjectId,
      code: courseOffering.code,
      displayTitle: courseOffering.displayTitle,
      status: courseOffering.status,
      requiresTrustedDevice: courseOffering.requiresTrustedDevice,
    })
  }

  async ensureTeacherCanCreateCourseOffering(
    teacherId: string,
    scope: AcademicScope,
  ): Promise<TeacherAssignmentSummary> {
    const assignment = await this.database.prisma.teacherAssignment.findFirst({
      where: {
        teacherId,
        status: "ACTIVE",
        semesterId: scope.semesterId,
        classId: scope.classId,
        sectionId: scope.sectionId,
        subjectId: scope.subjectId,
      },
      include: {
        semester: true,
        academicClass: true,
        section: true,
        subject: true,
      },
    })

    if (
      !assignment ||
      !canTeacherCreateCourseOffering(teacherId, assignment, {
        semesterId: scope.semesterId,
        classId: scope.classId,
        sectionId: scope.sectionId,
        subjectId: scope.subjectId,
      })
    ) {
      throw new ForbiddenException("The teacher cannot create a course offering for this scope.")
    }

    return teacherAssignmentSummarySchema.parse({
      id: assignment.id,
      teacherId: assignment.teacherId,
      semesterId: assignment.semesterId,
      semesterCode: assignment.semester.code,
      semesterTitle: assignment.semester.title,
      classId: assignment.classId,
      classCode: assignment.academicClass.code,
      classTitle: assignment.academicClass.title,
      sectionId: assignment.sectionId,
      sectionCode: assignment.section.code,
      sectionTitle: assignment.section.title,
      subjectId: assignment.subjectId,
      subjectCode: assignment.subject.code,
      subjectTitle: assignment.subject.title,
      status: assignment.status,
      canSelfCreateCourseOffering: assignment.canSelfCreateCourseOffering,
    })
  }
}
