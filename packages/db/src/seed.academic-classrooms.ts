import {
  AttendanceMode,
  CourseOfferingStatus,
  LectureStatus,
  NotificationChannel,
  type PrismaClient,
  ScheduleSlotStatus,
} from "@prisma/client"

import type { PrismaTransactionClient } from "./client"
import { developmentAcademicFixtures } from "./fixtures"
import type { SeedAcademicFoundationContext } from "./seed.academic-foundation"
import { developmentSeedIds } from "./seed.ids"
import type { SeedTimingContext, SeedUsersContext } from "./seed.internal"

type SeedAcademicClassroomTransaction = Pick<
  PrismaClient,
  | "courseOffering"
  | "classroomJoinCode"
  | "courseScheduleSlot"
  | "lecture"
  | "announcementPost"
  | "announcementReceipt"
> &
  Pick<
    PrismaTransactionClient,
    | "courseOffering"
    | "classroomJoinCode"
    | "courseScheduleSlot"
    | "lecture"
    | "announcementPost"
    | "announcementReceipt"
  >

export type SeedAcademicClassroomContext = SeedAcademicFoundationContext & {
  mathCourseOfferingId: string
  physicsCourseOfferingId: string
  mathScheduleSlotId: string
  physicsScheduleSlotId: string
}

export async function seedAcademicClassrooms(
  transaction: SeedAcademicClassroomTransaction,
  timing: SeedTimingContext,
  users: SeedUsersContext,
  foundation: SeedAcademicFoundationContext,
): Promise<SeedAcademicClassroomContext> {
  const mathClassroomFixture = developmentAcademicFixtures.classrooms.math
  const physicsClassroomFixture = developmentAcademicFixtures.classrooms.physics

  const mathCourseOffering = await transaction.courseOffering.upsert({
    where: { id: developmentSeedIds.courseOfferings.math },
    update: {
      code: mathClassroomFixture.classroomCode,
      semesterId: foundation.semesterId,
      classId: foundation.academicClassId,
      sectionId: foundation.sectionId,
      subjectId: foundation.mathSubjectId,
      primaryTeacherId: users.teacherUser.id,
      createdByUserId: users.teacherUser.id,
      displayTitle: mathClassroomFixture.classroomTitle,
      status: CourseOfferingStatus.ACTIVE,
      defaultAttendanceMode: AttendanceMode.QR_GPS,
    },
    create: {
      id: developmentSeedIds.courseOfferings.math,
      semesterId: foundation.semesterId,
      classId: foundation.academicClassId,
      sectionId: foundation.sectionId,
      subjectId: foundation.mathSubjectId,
      primaryTeacherId: users.teacherUser.id,
      createdByUserId: users.teacherUser.id,
      code: mathClassroomFixture.classroomCode,
      displayTitle: mathClassroomFixture.classroomTitle,
      status: CourseOfferingStatus.ACTIVE,
      defaultAttendanceMode: AttendanceMode[mathClassroomFixture.defaultAttendanceMode],
      defaultGpsRadiusMeters: 100,
      defaultSessionDurationMinutes: 15,
      qrRotationWindowSeconds: 2,
      bluetoothRotationWindowSeconds: 10,
      timezone: "Asia/Kolkata",
      requiresTrustedDevice: true,
    },
  })

  const physicsCourseOffering = await transaction.courseOffering.upsert({
    where: { id: developmentSeedIds.courseOfferings.physics },
    update: {
      code: physicsClassroomFixture.classroomCode,
      semesterId: foundation.semesterId,
      classId: foundation.academicClassId,
      sectionId: foundation.sectionId,
      subjectId: foundation.physicsSubjectId,
      primaryTeacherId: users.teacherUser.id,
      createdByUserId: users.teacherUser.id,
      displayTitle: physicsClassroomFixture.classroomTitle,
      status: CourseOfferingStatus.ACTIVE,
      defaultAttendanceMode: AttendanceMode.BLUETOOTH,
    },
    create: {
      id: developmentSeedIds.courseOfferings.physics,
      semesterId: foundation.semesterId,
      classId: foundation.academicClassId,
      sectionId: foundation.sectionId,
      subjectId: foundation.physicsSubjectId,
      primaryTeacherId: users.teacherUser.id,
      createdByUserId: users.teacherUser.id,
      code: physicsClassroomFixture.classroomCode,
      displayTitle: physicsClassroomFixture.classroomTitle,
      status: CourseOfferingStatus.ACTIVE,
      defaultAttendanceMode: AttendanceMode[physicsClassroomFixture.defaultAttendanceMode],
      defaultGpsRadiusMeters: 100,
      defaultSessionDurationMinutes: 15,
      qrRotationWindowSeconds: 2,
      bluetoothRotationWindowSeconds: 10,
      timezone: "Asia/Kolkata",
      requiresTrustedDevice: true,
    },
  })

  await transaction.classroomJoinCode.updateMany({
    where: {
      courseOfferingId: mathCourseOffering.id,
      status: "ACTIVE",
      NOT: {
        code: mathClassroomFixture.joinCode,
      },
    },
    data: {
      status: "EXPIRED",
      revokedAt: timing.now,
    },
  })

  await transaction.classroomJoinCode.updateMany({
    where: {
      courseOfferingId: physicsCourseOffering.id,
      status: "ACTIVE",
      NOT: {
        code: physicsClassroomFixture.joinCode,
      },
    },
    data: {
      status: "EXPIRED",
      revokedAt: timing.now,
    },
  })

  await Promise.all([
    transaction.classroomJoinCode.upsert({
      where: { code: mathClassroomFixture.joinCode },
      update: {
        courseOfferingId: mathCourseOffering.id,
        createdByUserId: users.teacherUser.id,
        status: "ACTIVE",
        expiresAt: timing.joinCodeExpiry,
        revokedAt: null,
        lastUsedAt: timing.completedSessionStart,
      },
      create: {
        id: developmentSeedIds.joinCodes.math,
        courseOfferingId: mathCourseOffering.id,
        createdByUserId: users.teacherUser.id,
        code: mathClassroomFixture.joinCode,
        status: "ACTIVE",
        expiresAt: timing.joinCodeExpiry,
        lastUsedAt: timing.completedSessionStart,
      },
    }),
    transaction.classroomJoinCode.upsert({
      where: { code: physicsClassroomFixture.joinCode },
      update: {
        courseOfferingId: physicsCourseOffering.id,
        createdByUserId: users.teacherUser.id,
        status: "ACTIVE",
        expiresAt: timing.joinCodeExpiry,
        revokedAt: null,
      },
      create: {
        id: developmentSeedIds.joinCodes.physics,
        courseOfferingId: physicsCourseOffering.id,
        createdByUserId: users.teacherUser.id,
        code: physicsClassroomFixture.joinCode,
        status: "ACTIVE",
        expiresAt: timing.joinCodeExpiry,
      },
    }),
  ])

  const mathScheduleSlot = await transaction.courseScheduleSlot.upsert({
    where: {
      courseOfferingId_weekday_startMinutes_endMinutes: {
        courseOfferingId: mathCourseOffering.id,
        weekday: 1,
        startMinutes: 540,
        endMinutes: 600,
      },
    },
    update: {
      locationLabel: mathClassroomFixture.locationLabel,
      status: ScheduleSlotStatus.ACTIVE,
    },
    create: {
      id: developmentSeedIds.scheduleSlots.mathMonday,
      courseOfferingId: mathCourseOffering.id,
      weekday: 1,
      startMinutes: 540,
      endMinutes: 600,
      locationLabel: mathClassroomFixture.locationLabel,
      status: ScheduleSlotStatus.ACTIVE,
    },
  })

  const physicsScheduleSlot = await transaction.courseScheduleSlot.upsert({
    where: {
      courseOfferingId_weekday_startMinutes_endMinutes: {
        courseOfferingId: physicsCourseOffering.id,
        weekday: 3,
        startMinutes: 660,
        endMinutes: 720,
      },
    },
    update: {
      locationLabel: physicsClassroomFixture.locationLabel,
      status: ScheduleSlotStatus.ACTIVE,
    },
    create: {
      id: developmentSeedIds.scheduleSlots.physicsWednesday,
      courseOfferingId: physicsCourseOffering.id,
      weekday: 3,
      startMinutes: 660,
      endMinutes: 720,
      locationLabel: physicsClassroomFixture.locationLabel,
      status: ScheduleSlotStatus.ACTIVE,
    },
  })

  await Promise.all([
    transaction.lecture.upsert({
      where: { id: developmentSeedIds.lectures.mathCompleted },
      update: {
        courseOfferingId: mathCourseOffering.id,
        scheduleSlotId: mathScheduleSlot.id,
        createdByUserId: users.teacherUser.id,
        title: "Lecture 1",
        lectureDate: new Date("2026-03-10"),
        plannedStartAt: timing.completedSessionStart,
        plannedEndAt: timing.completedSessionEnd,
        actualStartAt: timing.completedSessionStart,
        actualEndAt: timing.completedSessionEnd,
        status: LectureStatus.COMPLETED,
      },
      create: {
        id: developmentSeedIds.lectures.mathCompleted,
        courseOfferingId: mathCourseOffering.id,
        scheduleSlotId: mathScheduleSlot.id,
        createdByUserId: users.teacherUser.id,
        title: "Lecture 1",
        lectureDate: new Date("2026-03-10"),
        plannedStartAt: timing.completedSessionStart,
        plannedEndAt: timing.completedSessionEnd,
        actualStartAt: timing.completedSessionStart,
        actualEndAt: timing.completedSessionEnd,
        status: LectureStatus.COMPLETED,
      },
    }),
    transaction.lecture.upsert({
      where: { id: developmentSeedIds.lectures.physicsPlanned },
      update: {
        courseOfferingId: physicsCourseOffering.id,
        scheduleSlotId: physicsScheduleSlot.id,
        createdByUserId: users.teacherUser.id,
        title: "Lecture 2",
        lectureDate: new Date("2026-03-18"),
        plannedStartAt: new Date("2026-03-18T05:30:00.000Z"),
        plannedEndAt: new Date("2026-03-18T06:30:00.000Z"),
        status: LectureStatus.PLANNED,
      },
      create: {
        id: developmentSeedIds.lectures.physicsPlanned,
        courseOfferingId: physicsCourseOffering.id,
        scheduleSlotId: physicsScheduleSlot.id,
        createdByUserId: users.teacherUser.id,
        title: "Lecture 2",
        lectureDate: new Date("2026-03-18"),
        plannedStartAt: new Date("2026-03-18T05:30:00.000Z"),
        plannedEndAt: new Date("2026-03-18T06:30:00.000Z"),
        status: LectureStatus.PLANNED,
      },
    }),
  ])

  await transaction.announcementPost.upsert({
    where: { id: developmentSeedIds.announcements.mathWelcome },
    update: {
      courseOfferingId: mathCourseOffering.id,
      authorUserId: users.teacherUser.id,
      postType: "ANNOUNCEMENT",
      visibility: "STUDENT_AND_TEACHER",
      title: `Welcome to ${mathClassroomFixture.subjectTitle}`,
      body: "Join the classroom, review the schedule, and keep your trusted device ready for attendance.",
      shouldNotify: true,
    },
    create: {
      id: developmentSeedIds.announcements.mathWelcome,
      courseOfferingId: mathCourseOffering.id,
      authorUserId: users.teacherUser.id,
      postType: "ANNOUNCEMENT",
      visibility: "STUDENT_AND_TEACHER",
      title: `Welcome to ${mathClassroomFixture.subjectTitle}`,
      body: "Join the classroom, review the schedule, and keep your trusted device ready for attendance.",
      shouldNotify: true,
    },
  })

  await Promise.all(
    users.studentUsers.map((studentUser) =>
      transaction.announcementReceipt.upsert({
        where: {
          announcementPostId_userId_channel: {
            announcementPostId: developmentSeedIds.announcements.mathWelcome,
            userId: studentUser.id,
            channel: NotificationChannel.IN_APP,
          },
        },
        update: {
          deliveredAt: timing.now,
        },
        create: {
          announcementPostId: developmentSeedIds.announcements.mathWelcome,
          userId: studentUser.id,
          channel: NotificationChannel.IN_APP,
          deliveredAt: timing.now,
        },
      }),
    ),
  )

  return {
    ...foundation,
    mathCourseOfferingId: mathCourseOffering.id,
    physicsCourseOfferingId: physicsCourseOffering.id,
    mathScheduleSlotId: mathScheduleSlot.id,
    physicsScheduleSlotId: physicsScheduleSlot.id,
  }
}
