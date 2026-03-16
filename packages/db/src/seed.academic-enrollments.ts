import { EnrollmentSource, EnrollmentStatus, type PrismaClient } from "@prisma/client"

import type { PrismaTransactionClient } from "./client"
import type { SeedAcademicClassroomContext } from "./seed.academic-classrooms"
import { developmentSeedIds } from "./seed.ids"
import type { SeedAcademicContext, SeedTimingContext, SeedUsersContext } from "./seed.internal"

type SeedAcademicEnrollmentTransaction = Pick<PrismaClient, "enrollment"> &
  Pick<PrismaTransactionClient, "enrollment">

export async function seedAcademicEnrollments(
  transaction: SeedAcademicEnrollmentTransaction,
  timing: SeedTimingContext,
  users: SeedUsersContext,
  academic: SeedAcademicClassroomContext,
): Promise<SeedAcademicContext> {
  const mathEnrollments = await Promise.all([
    transaction.enrollment.upsert({
      where: {
        studentId_courseOfferingId: {
          studentId: developmentSeedIds.users.studentOne,
          courseOfferingId: academic.mathCourseOfferingId,
        },
      },
      update: {
        semesterId: academic.semesterId,
        classId: academic.academicClassId,
        sectionId: academic.sectionId,
        subjectId: academic.mathSubjectId,
        status: EnrollmentStatus.ACTIVE,
        source: EnrollmentSource.MANUAL,
        createdByUserId: users.teacherUser.id,
      },
      create: {
        id: developmentSeedIds.enrollments.math.studentOne,
        courseOfferingId: academic.mathCourseOfferingId,
        studentId: developmentSeedIds.users.studentOne,
        semesterId: academic.semesterId,
        classId: academic.academicClassId,
        sectionId: academic.sectionId,
        subjectId: academic.mathSubjectId,
        status: EnrollmentStatus.ACTIVE,
        source: EnrollmentSource.MANUAL,
        createdByUserId: users.teacherUser.id,
      },
    }),
    transaction.enrollment.upsert({
      where: {
        studentId_courseOfferingId: {
          studentId: developmentSeedIds.users.studentTwo,
          courseOfferingId: academic.mathCourseOfferingId,
        },
      },
      update: {
        semesterId: academic.semesterId,
        classId: academic.academicClassId,
        sectionId: academic.sectionId,
        subjectId: academic.mathSubjectId,
        status: EnrollmentStatus.ACTIVE,
        source: EnrollmentSource.JOIN_CODE,
        createdByUserId: users.teacherUser.id,
      },
      create: {
        id: developmentSeedIds.enrollments.math.studentTwo,
        courseOfferingId: academic.mathCourseOfferingId,
        studentId: developmentSeedIds.users.studentTwo,
        semesterId: academic.semesterId,
        classId: academic.academicClassId,
        sectionId: academic.sectionId,
        subjectId: academic.mathSubjectId,
        status: EnrollmentStatus.ACTIVE,
        source: EnrollmentSource.JOIN_CODE,
        createdByUserId: users.teacherUser.id,
      },
    }),
    transaction.enrollment.upsert({
      where: {
        studentId_courseOfferingId: {
          studentId: developmentSeedIds.users.studentThree,
          courseOfferingId: academic.mathCourseOfferingId,
        },
      },
      update: {
        semesterId: academic.semesterId,
        classId: academic.academicClassId,
        sectionId: academic.sectionId,
        subjectId: academic.mathSubjectId,
        status: EnrollmentStatus.ACTIVE,
        source: EnrollmentSource.IMPORT,
        createdByUserId: users.adminUser.id,
      },
      create: {
        id: developmentSeedIds.enrollments.math.studentThree,
        courseOfferingId: academic.mathCourseOfferingId,
        studentId: developmentSeedIds.users.studentThree,
        semesterId: academic.semesterId,
        classId: academic.academicClassId,
        sectionId: academic.sectionId,
        subjectId: academic.mathSubjectId,
        status: EnrollmentStatus.ACTIVE,
        source: EnrollmentSource.IMPORT,
        createdByUserId: users.adminUser.id,
      },
    }),
    transaction.enrollment.upsert({
      where: {
        studentId_courseOfferingId: {
          studentId: developmentSeedIds.users.studentFour,
          courseOfferingId: academic.mathCourseOfferingId,
        },
      },
      update: {
        semesterId: academic.semesterId,
        classId: academic.academicClassId,
        sectionId: academic.sectionId,
        subjectId: academic.mathSubjectId,
        status: EnrollmentStatus.ACTIVE,
        source: EnrollmentSource.MANUAL,
        createdByUserId: users.teacherUser.id,
      },
      create: {
        id: developmentSeedIds.enrollments.math.studentFour,
        courseOfferingId: academic.mathCourseOfferingId,
        studentId: developmentSeedIds.users.studentFour,
        semesterId: academic.semesterId,
        classId: academic.academicClassId,
        sectionId: academic.sectionId,
        subjectId: academic.mathSubjectId,
        status: EnrollmentStatus.ACTIVE,
        source: EnrollmentSource.MANUAL,
        createdByUserId: users.teacherUser.id,
      },
    }),
  ])

  await Promise.all([
    transaction.enrollment.upsert({
      where: {
        studentId_courseOfferingId: {
          studentId: developmentSeedIds.users.studentOne,
          courseOfferingId: academic.physicsCourseOfferingId,
        },
      },
      update: {
        semesterId: academic.semesterId,
        classId: academic.academicClassId,
        sectionId: academic.sectionId,
        subjectId: academic.physicsSubjectId,
        status: EnrollmentStatus.ACTIVE,
        source: EnrollmentSource.MANUAL,
        createdByUserId: users.teacherUser.id,
      },
      create: {
        id: developmentSeedIds.enrollments.physics.studentOne,
        courseOfferingId: academic.physicsCourseOfferingId,
        studentId: developmentSeedIds.users.studentOne,
        semesterId: academic.semesterId,
        classId: academic.academicClassId,
        sectionId: academic.sectionId,
        subjectId: academic.physicsSubjectId,
        status: EnrollmentStatus.ACTIVE,
        source: EnrollmentSource.MANUAL,
        createdByUserId: users.teacherUser.id,
      },
    }),
    transaction.enrollment.upsert({
      where: {
        studentId_courseOfferingId: {
          studentId: developmentSeedIds.users.studentTwo,
          courseOfferingId: academic.physicsCourseOfferingId,
        },
      },
      update: {
        semesterId: academic.semesterId,
        classId: academic.academicClassId,
        sectionId: academic.sectionId,
        subjectId: academic.physicsSubjectId,
        status: EnrollmentStatus.ACTIVE,
        source: EnrollmentSource.MANUAL,
        createdByUserId: users.teacherUser.id,
      },
      create: {
        id: developmentSeedIds.enrollments.physics.studentTwo,
        courseOfferingId: academic.physicsCourseOfferingId,
        studentId: developmentSeedIds.users.studentTwo,
        semesterId: academic.semesterId,
        classId: academic.academicClassId,
        sectionId: academic.sectionId,
        subjectId: academic.physicsSubjectId,
        status: EnrollmentStatus.ACTIVE,
        source: EnrollmentSource.MANUAL,
        createdByUserId: users.teacherUser.id,
      },
    }),
    transaction.enrollment.upsert({
      where: {
        studentId_courseOfferingId: {
          studentId: developmentSeedIds.users.studentThree,
          courseOfferingId: academic.physicsCourseOfferingId,
        },
      },
      update: {
        semesterId: academic.semesterId,
        classId: academic.academicClassId,
        sectionId: academic.sectionId,
        subjectId: academic.physicsSubjectId,
        status: EnrollmentStatus.DROPPED,
        source: EnrollmentSource.IMPORT,
        droppedAt: timing.physicsStudentThreeDroppedAt,
        createdByUserId: users.adminUser.id,
      },
      create: {
        id: developmentSeedIds.enrollments.physics.studentThreeDropped,
        courseOfferingId: academic.physicsCourseOfferingId,
        studentId: developmentSeedIds.users.studentThree,
        semesterId: academic.semesterId,
        classId: academic.academicClassId,
        sectionId: academic.sectionId,
        subjectId: academic.physicsSubjectId,
        status: EnrollmentStatus.DROPPED,
        source: EnrollmentSource.IMPORT,
        droppedAt: timing.physicsStudentThreeDroppedAt,
        createdByUserId: users.adminUser.id,
      },
    }),
    transaction.enrollment.upsert({
      where: {
        studentId_courseOfferingId: {
          studentId: developmentSeedIds.users.studentFour,
          courseOfferingId: academic.physicsCourseOfferingId,
        },
      },
      update: {
        semesterId: academic.semesterId,
        classId: academic.academicClassId,
        sectionId: academic.sectionId,
        subjectId: academic.physicsSubjectId,
        status: EnrollmentStatus.BLOCKED,
        source: EnrollmentSource.ADMIN,
        droppedAt: null,
        createdByUserId: users.adminUser.id,
      },
      create: {
        id: developmentSeedIds.enrollments.physics.studentFourBlocked,
        courseOfferingId: academic.physicsCourseOfferingId,
        studentId: developmentSeedIds.users.studentFour,
        semesterId: academic.semesterId,
        classId: academic.academicClassId,
        sectionId: academic.sectionId,
        subjectId: academic.physicsSubjectId,
        status: EnrollmentStatus.BLOCKED,
        source: EnrollmentSource.ADMIN,
        createdByUserId: users.adminUser.id,
      },
    }),
  ])

  return {
    ...academic,
    mathEnrollments: {
      studentOneId: mathEnrollments[0].id,
      studentTwoId: mathEnrollments[1].id,
      studentThreeId: mathEnrollments[2].id,
      studentFourId: mathEnrollments[3].id,
    },
  }
}
