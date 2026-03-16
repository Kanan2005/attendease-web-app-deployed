import {
  type EnrollmentListQuery,
  type EnrollmentSummary,
  enrollmentSummarySchema,
} from "@attendease/contracts"
import { isStudentEligibleForCourseOffering } from "@attendease/domain"
import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common"

import { DatabaseService } from "../../database/database.service.js"

@Injectable()
export class EnrollmentsService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async listStudentEnrollments(
    studentId: string,
    filters: EnrollmentListQuery = {},
  ): Promise<EnrollmentSummary[]> {
    const enrollments = await this.database.prisma.enrollment.findMany({
      where: {
        studentId,
        status: filters.status ?? {
          in: ["ACTIVE", "PENDING"],
        },
        ...(filters.courseOfferingId ? { courseOfferingId: filters.courseOfferingId } : {}),
        ...(filters.semesterId ? { semesterId: filters.semesterId } : {}),
        ...(filters.classId ? { classId: filters.classId } : {}),
        ...(filters.sectionId ? { sectionId: filters.sectionId } : {}),
        ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
      },
      orderBy: [
        {
          courseOfferingId: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
    })

    return enrollmentSummarySchema.array().parse(
      enrollments.map((enrollment) => ({
        id: enrollment.id,
        courseOfferingId: enrollment.courseOfferingId,
        classroomId: enrollment.courseOfferingId,
        membershipId: enrollment.id,
        studentId: enrollment.studentId,
        semesterId: enrollment.semesterId,
        classId: enrollment.classId,
        sectionId: enrollment.sectionId,
        subjectId: enrollment.subjectId,
        status: enrollment.status,
        membershipStatus: enrollment.status,
        source: enrollment.source,
        membershipSource: enrollment.source,
      })),
    )
  }

  async getStudentEnrollment(studentId: string, enrollmentId: string): Promise<EnrollmentSummary> {
    const enrollment = await this.database.prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        studentId,
        status: {
          not: "DROPPED",
        },
      },
    })

    if (!enrollment) {
      throw new NotFoundException("Enrollment not found.")
    }

    return enrollmentSummarySchema.parse({
      id: enrollment.id,
      courseOfferingId: enrollment.courseOfferingId,
      classroomId: enrollment.courseOfferingId,
      membershipId: enrollment.id,
      studentId: enrollment.studentId,
      semesterId: enrollment.semesterId,
      classId: enrollment.classId,
      sectionId: enrollment.sectionId,
      subjectId: enrollment.subjectId,
      status: enrollment.status,
      membershipStatus: enrollment.status,
      source: enrollment.source,
      membershipSource: enrollment.source,
    })
  }

  async ensureStudentEnrollmentAccess(
    studentId: string,
    enrollmentId: string,
  ): Promise<EnrollmentSummary> {
    const enrollment = await this.database.prisma.enrollment.findUnique({
      where: {
        id: enrollmentId,
      },
    })

    if (!enrollment) {
      throw new NotFoundException("Enrollment not found.")
    }

    if (enrollment.studentId !== studentId || enrollment.status === "DROPPED") {
      throw new ForbiddenException("The student cannot access the requested enrollment.")
    }

    return enrollmentSummarySchema.parse({
      id: enrollment.id,
      courseOfferingId: enrollment.courseOfferingId,
      classroomId: enrollment.courseOfferingId,
      membershipId: enrollment.id,
      studentId: enrollment.studentId,
      semesterId: enrollment.semesterId,
      classId: enrollment.classId,
      sectionId: enrollment.sectionId,
      subjectId: enrollment.subjectId,
      status: enrollment.status,
      membershipStatus: enrollment.status,
      source: enrollment.source,
      membershipSource: enrollment.source,
    })
  }

  async ensureStudentEligibleForCourseOffering(
    studentId: string,
    courseOfferingId: string,
  ): Promise<EnrollmentSummary> {
    const [courseOffering, enrollment] = await Promise.all([
      this.database.prisma.courseOffering.findUnique({
        where: {
          id: courseOfferingId,
        },
      }),
      this.database.prisma.enrollment.findFirst({
        where: {
          studentId,
          courseOfferingId,
          status: "ACTIVE",
        },
      }),
    ])

    if (!courseOffering) {
      throw new NotFoundException("Course offering not found.")
    }

    if (
      !enrollment ||
      !isStudentEligibleForCourseOffering(studentId, enrollment, {
        id: courseOffering.id,
        primaryTeacherId: courseOffering.primaryTeacherId,
        semesterId: courseOffering.semesterId,
        classId: courseOffering.classId,
        sectionId: courseOffering.sectionId,
        subjectId: courseOffering.subjectId,
        status: courseOffering.status,
      })
    ) {
      throw new ForbiddenException("The student is not eligible for this course offering.")
    }

    return enrollmentSummarySchema.parse({
      id: enrollment.id,
      courseOfferingId: enrollment.courseOfferingId,
      classroomId: enrollment.courseOfferingId,
      membershipId: enrollment.id,
      studentId: enrollment.studentId,
      semesterId: enrollment.semesterId,
      classId: enrollment.classId,
      sectionId: enrollment.sectionId,
      subjectId: enrollment.subjectId,
      status: enrollment.status,
      membershipStatus: enrollment.status,
      source: enrollment.source,
      membershipSource: enrollment.source,
    })
  }
}
