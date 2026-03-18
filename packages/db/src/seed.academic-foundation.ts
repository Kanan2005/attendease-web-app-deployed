import type { PrismaClient } from "@prisma/client"

import type { PrismaTransactionClient } from "./client"
import { developmentAcademicFixtures } from "./fixtures"
import { developmentSeedIds } from "./seed.ids"
import type { SeedTimingContext, SeedUsersContext } from "./seed.internal"

type SeedAcademicFoundationTransaction = Pick<
  PrismaClient,
  "academicTerm" | "semester" | "academicClass" | "section" | "subject" | "teacherAssignment"
> &
  Pick<
    PrismaTransactionClient,
    "academicTerm" | "semester" | "academicClass" | "section" | "subject" | "teacherAssignment"
  >

export type SeedAcademicFoundationContext = {
  semesterId: string
  academicClassId: string
  sectionId: string
  mathSubjectId: string
  physicsSubjectId: string
  chemistrySubjectId: string
  dsSubjectId: string
  osSubjectId: string
  mathTeacherAssignmentId: string
  physicsTeacherAssignmentId: string
}

export async function seedAcademicFoundation(
  transaction: SeedAcademicFoundationTransaction,
  users: SeedUsersContext,
): Promise<SeedAcademicFoundationContext> {
  const mathClassroomFixture = developmentAcademicFixtures.classrooms.math
  const physicsClassroomFixture = developmentAcademicFixtures.classrooms.physics

  const academicTerm = await transaction.academicTerm.upsert({
    where: { code: developmentAcademicFixtures.academicTermCode },
    update: {
      title: developmentAcademicFixtures.academicTermTitle,
      academicYearLabel: "2026-2027",
      status: "ACTIVE",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
    },
    create: {
      id: developmentSeedIds.academic.term,
      code: developmentAcademicFixtures.academicTermCode,
      title: developmentAcademicFixtures.academicTermTitle,
      academicYearLabel: "2026-2027",
      status: "ACTIVE",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
    },
  })

  const semester = await transaction.semester.upsert({
    where: { code: developmentAcademicFixtures.semesterCode },
    update: {
      academicTermId: academicTerm.id,
      title: developmentAcademicFixtures.semesterTitle,
      ordinal: 6,
      status: "ACTIVE",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-06-30"),
      attendanceCutoffDate: new Date("2026-06-20"),
    },
    create: {
      id: developmentSeedIds.academic.semester,
      academicTermId: academicTerm.id,
      code: developmentAcademicFixtures.semesterCode,
      title: developmentAcademicFixtures.semesterTitle,
      ordinal: 6,
      status: "ACTIVE",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-06-30"),
      attendanceCutoffDate: new Date("2026-06-20"),
    },
  })

  const academicClass = await transaction.academicClass.upsert({
    where: { code: developmentAcademicFixtures.classCode },
    update: {
      title: developmentAcademicFixtures.classTitle,
      programName: "Computer Science and Engineering",
      cohortYear: 2023,
      status: "ACTIVE",
    },
    create: {
      id: developmentSeedIds.academic.class,
      code: developmentAcademicFixtures.classCode,
      title: developmentAcademicFixtures.classTitle,
      programName: "Computer Science and Engineering",
      cohortYear: 2023,
      status: "ACTIVE",
    },
  })

  const section = await transaction.section.upsert({
    where: {
      classId_code: {
        classId: academicClass.id,
        code: developmentAcademicFixtures.sectionCode,
      },
    },
    update: {
      title: developmentAcademicFixtures.sectionTitle,
      status: "ACTIVE",
    },
    create: {
      id: developmentSeedIds.academic.section,
      classId: academicClass.id,
      code: developmentAcademicFixtures.sectionCode,
      title: developmentAcademicFixtures.sectionTitle,
      status: "ACTIVE",
    },
  })

  const mathSubject = await transaction.subject.upsert({
    where: { code: mathClassroomFixture.subjectCode },
    update: {
      title: mathClassroomFixture.subjectTitle,
      shortTitle: mathClassroomFixture.shortTitle,
      status: "ACTIVE",
    },
    create: {
      id: developmentSeedIds.academic.mathSubject,
      code: mathClassroomFixture.subjectCode,
      title: mathClassroomFixture.subjectTitle,
      shortTitle: mathClassroomFixture.shortTitle,
      status: "ACTIVE",
    },
  })

  const physicsSubject = await transaction.subject.upsert({
    where: { code: physicsClassroomFixture.subjectCode },
    update: {
      title: physicsClassroomFixture.subjectTitle,
      shortTitle: physicsClassroomFixture.shortTitle,
      status: "ACTIVE",
    },
    create: {
      id: developmentSeedIds.academic.physicsSubject,
      code: physicsClassroomFixture.subjectCode,
      title: physicsClassroomFixture.subjectTitle,
      shortTitle: physicsClassroomFixture.shortTitle,
      status: "ACTIVE",
    },
  })

  const mathTeacherAssignment = await transaction.teacherAssignment.upsert({
    where: {
      teacherId_semesterId_classId_sectionId_subjectId: {
        teacherId: users.teacherUser.id,
        semesterId: semester.id,
        classId: academicClass.id,
        sectionId: section.id,
        subjectId: mathSubject.id,
      },
    },
    update: {
      grantedByUserId: users.adminUser.id,
      canSelfCreateCourseOffering: true,
      status: "ACTIVE",
    },
    create: {
      id: developmentSeedIds.teacherAssignments.math,
      teacherId: users.teacherUser.id,
      grantedByUserId: users.adminUser.id,
      semesterId: semester.id,
      classId: academicClass.id,
      sectionId: section.id,
      subjectId: mathSubject.id,
      canSelfCreateCourseOffering: true,
      status: "ACTIVE",
    },
  })

  const physicsTeacherAssignment = await transaction.teacherAssignment.upsert({
    where: {
      teacherId_semesterId_classId_sectionId_subjectId: {
        teacherId: users.teacherUser.id,
        semesterId: semester.id,
        classId: academicClass.id,
        sectionId: section.id,
        subjectId: physicsSubject.id,
      },
    },
    update: {
      grantedByUserId: users.adminUser.id,
      canSelfCreateCourseOffering: true,
      status: "ACTIVE",
    },
    create: {
      id: developmentSeedIds.teacherAssignments.physics,
      teacherId: users.teacherUser.id,
      grantedByUserId: users.adminUser.id,
      semesterId: semester.id,
      classId: academicClass.id,
      sectionId: section.id,
      subjectId: physicsSubject.id,
      canSelfCreateCourseOffering: true,
      status: "ACTIVE",
    },
  })

  const chemistrySubject = await transaction.subject.upsert({
    where: { code: "CHEM101" },
    update: { title: "Chemistry", shortTitle: "Chem", status: "ACTIVE" },
    create: {
      id: developmentSeedIds.academic.chemistrySubject,
      code: "CHEM101",
      title: "Chemistry",
      shortTitle: "Chem",
      status: "ACTIVE",
    },
  })

  const dsSubject = await transaction.subject.upsert({
    where: { code: "CS201" },
    update: { title: "Data Structures", shortTitle: "DS", status: "ACTIVE" },
    create: {
      id: developmentSeedIds.academic.dsSubject,
      code: "CS201",
      title: "Data Structures",
      shortTitle: "DS",
      status: "ACTIVE",
    },
  })

  const osSubject = await transaction.subject.upsert({
    where: { code: "CS301" },
    update: { title: "Operating Systems", shortTitle: "OS", status: "ACTIVE" },
    create: {
      id: developmentSeedIds.academic.osSubject,
      code: "CS301",
      title: "Operating Systems",
      shortTitle: "OS",
      status: "ACTIVE",
    },
  })

  for (const { subjectId, assignmentId } of [
    { subjectId: chemistrySubject.id, assignmentId: developmentSeedIds.teacherAssignments.chemistry },
    { subjectId: dsSubject.id, assignmentId: developmentSeedIds.teacherAssignments.ds },
    { subjectId: osSubject.id, assignmentId: developmentSeedIds.teacherAssignments.os },
  ]) {
    await transaction.teacherAssignment.upsert({
      where: {
        teacherId_semesterId_classId_sectionId_subjectId: {
          teacherId: users.teacherUser.id,
          semesterId: semester.id,
          classId: academicClass.id,
          sectionId: section.id,
          subjectId,
        },
      },
      update: {
        grantedByUserId: users.adminUser.id,
        canSelfCreateCourseOffering: true,
        status: "ACTIVE",
      },
      create: {
        id: assignmentId,
        teacherId: users.teacherUser.id,
        grantedByUserId: users.adminUser.id,
        semesterId: semester.id,
        classId: academicClass.id,
        sectionId: section.id,
        subjectId,
        canSelfCreateCourseOffering: true,
        status: "ACTIVE",
      },
    })
  }

  return {
    semesterId: semester.id,
    academicClassId: academicClass.id,
    sectionId: section.id,
    mathSubjectId: mathSubject.id,
    physicsSubjectId: physicsSubject.id,
    chemistrySubjectId: chemistrySubject.id,
    dsSubjectId: dsSubject.id,
    osSubjectId: osSubject.id,
    mathTeacherAssignmentId: mathTeacherAssignment.id,
    physicsTeacherAssignmentId: physicsTeacherAssignment.id,
  }
}
