import { hashPassword } from "@attendease/auth/password"
import {
  AdminActionType,
  AttendanceEventType,
  AttendanceMode,
  AttendanceRecordStatus,
  CourseOfferingStatus,
  DeviceAttestationStatus,
  DeviceBindingStatus,
  DeviceBindingType,
  DevicePlatform,
  EmailDispatchRunStatus,
  EmailDispatchTriggerType,
  EmailLogStatus,
  EnrollmentSource,
  EnrollmentStatus,
  LectureStatus,
  NotificationChannel,
  OutboxStatus,
  type PrismaClient,
  ScheduleSlotStatus,
  SecurityEventSeverity,
  SecurityEventType,
  SessionPlatform,
  SessionStatus,
  UserStatus,
} from "@prisma/client"

import {
  buildAdminActionLogData,
  buildAttendanceEditAuditLogData,
  buildAttendanceEventData,
  buildEmailLogData,
  buildOutboxEventData,
  buildSecurityEventData,
} from "./audit.js"
import type { PrismaTransactionClient } from "./client"
import {
  developmentAcademicFixtures,
  developmentAuthFixtures,
  developmentLifecycleFixtures,
} from "./fixtures"
import { runSerializableTransaction } from "./transactions"

export const developmentSeedIds = {
  users: {
    admin: "seed_user_admin",
    teacher: "seed_user_teacher",
    studentOne: "seed_user_student_one",
    studentTwo: "seed_user_student_two",
    studentThree: "seed_user_student_three",
    studentFour: "seed_user_student_four",
  },
  academic: {
    term: "seed_term_ay_2026",
    semester: "seed_semester_6",
    class: "seed_class_btech_cse",
    section: "seed_section_a",
    mathSubject: "seed_subject_math",
    physicsSubject: "seed_subject_physics",
  },
  teacherAssignments: {
    math: "seed_teacher_assignment_math",
    physics: "seed_teacher_assignment_physics",
  },
  courseOfferings: {
    math: "seed_course_offering_math",
    physics: "seed_course_offering_physics",
  },
  joinCodes: {
    math: "seed_join_code_math",
    physics: "seed_join_code_physics",
  },
  scheduleSlots: {
    mathMonday: "seed_schedule_slot_math_monday",
    physicsWednesday: "seed_schedule_slot_physics_wednesday",
  },
  lectures: {
    mathCompleted: "seed_lecture_math_completed",
    physicsPlanned: "seed_lecture_physics_planned",
  },
  announcements: {
    mathWelcome: "seed_announcement_math_welcome",
  },
  enrollments: {
    math: {
      studentOne: "seed_enrollment_math_student_one",
      studentTwo: "seed_enrollment_math_student_two",
      studentThree: "seed_enrollment_math_student_three",
      studentFour: "seed_enrollment_math_student_four",
    },
    physics: {
      studentOne: "seed_enrollment_physics_student_one",
      studentTwo: "seed_enrollment_physics_student_two",
      studentThreeDropped: "seed_enrollment_physics_student_three_dropped",
      studentFourBlocked: "seed_enrollment_physics_student_four_blocked",
    },
  },
  sessions: {
    mathCompleted: "seed_attendance_session_math_completed",
  },
  attendanceRecords: {
    studentOne: "seed_attendance_record_student_one",
    studentTwo: "seed_attendance_record_student_two",
    studentThree: "seed_attendance_record_student_three",
    studentFour: "seed_attendance_record_student_four",
  },
  attendanceEvents: {
    sessionCreated: "seed_attendance_event_session_created",
    studentOneQr: "seed_attendance_event_student_one_qr",
    studentTwoQr: "seed_attendance_event_student_two_qr",
    studentThreeManual: "seed_attendance_event_student_three_manual",
    sessionEnded: "seed_attendance_event_session_ended",
  },
  attendanceEditLogs: {
    studentThreeManual: "seed_attendance_edit_student_three_manual",
  },
  authSessions: {
    teacherMobile: "seed_auth_session_teacher_mobile",
  },
  refreshTokens: {
    teacherMobile: "seed_refresh_token_teacher_mobile",
  },
  devices: {
    studentOne: "seed_device_student_one",
    studentTwo: "seed_device_student_two",
    studentTwoRevoked: "seed_device_student_two_revoked",
  },
  bindings: {
    studentOne: "seed_binding_student_one",
    studentTwo: "seed_binding_student_two",
    studentTwoRevoked: "seed_binding_student_two_revoked",
  },
  securityEvents: {
    studentOneBound: "seed_security_event_student_one_bound",
    studentTwoBound: "seed_security_event_student_two_bound",
    studentTwoRevoked: "seed_security_event_student_two_revoked",
  },
  adminActions: {
    studentOneApprove: "seed_admin_action_student_one_approve",
    studentTwoRevoke: "seed_admin_action_student_two_revoke",
    studentTwoApproveReplacement: "seed_admin_action_student_two_approve_replacement",
  },
  emailAutomation: {
    rule: "seed_email_rule_math_low_attendance",
    dispatchRun: "seed_email_dispatch_run_math_daily",
    emailLog: "seed_email_log_student_four",
  },
  outboxEvents: {
    analyticsRefresh: "seed_outbox_event_analytics_refresh",
  },
} as const

type SeedSummary = {
  userCount: number
  classroomCount: number
  activeJoinCodes: string[]
  seededSessionId: string
  seededEmailRuleId: string
  pendingOutboxTopics: string[]
}

async function ensureUserRole(
  prisma: Pick<PrismaClient, "userRole"> | Pick<PrismaTransactionClient, "userRole">,
  userId: string,
  role: "STUDENT" | "TEACHER" | "ADMIN",
): Promise<void> {
  await prisma.userRole.upsert({
    where: {
      userId_role: {
        userId,
        role,
      },
    },
    update: {},
    create: {
      userId,
      role,
    },
  })
}

export async function seedDevelopmentData(prisma: PrismaClient): Promise<SeedSummary> {
  const [
    adminPasswordHash,
    teacherPasswordHash,
    studentOnePasswordHash,
    studentTwoPasswordHash,
    studentThreePasswordHash,
    studentFourPasswordHash,
  ] = await Promise.all([
    hashPassword(developmentAuthFixtures.admin.password),
    hashPassword(developmentAuthFixtures.teacher.password),
    hashPassword(developmentAuthFixtures.students.studentOne.password),
    hashPassword(developmentAuthFixtures.students.studentTwo.password),
    hashPassword(developmentAuthFixtures.students.studentThree.password),
    hashPassword(developmentAuthFixtures.students.studentFour.password),
  ])

  return runSerializableTransaction(prisma, async (transaction) => {
    const now = new Date("2026-03-14T09:00:00.000Z")
    const completedSessionStart = new Date("2026-03-10T03:30:00.000Z")
    const completedSessionEnd = new Date("2026-03-10T03:45:00.000Z")
    const joinCodeExpiry = new Date("2026-12-31T18:29:59.000Z")
    const physicsStudentThreeDroppedAt = new Date("2026-03-12T08:30:00.000Z")
    const studentTwoRevokedAt = new Date("2026-03-13T09:30:00.000Z")

    const {
      admin: adminFixture,
      teacher: teacherFixture,
      students: studentFixtures,
    } = developmentAuthFixtures
    const mathClassroomFixture = developmentAcademicFixtures.classrooms.math
    const physicsClassroomFixture = developmentAcademicFixtures.classrooms.physics
    const studentTwoReplacementFixture =
      developmentLifecycleFixtures.deviceTrust.replacementHistory.studentTwo

    const adminUser = await transaction.user.upsert({
      where: { id: developmentSeedIds.users.admin },
      update: {
        email: adminFixture.email,
        displayName: adminFixture.displayName,
        status: UserStatus.ACTIVE,
      },
      create: {
        id: developmentSeedIds.users.admin,
        email: adminFixture.email,
        displayName: adminFixture.displayName,
        status: UserStatus.ACTIVE,
        lastLoginAt: now,
      },
    })

    const teacherUser = await transaction.user.upsert({
      where: { id: developmentSeedIds.users.teacher },
      update: {
        email: teacherFixture.email,
        displayName: teacherFixture.displayName,
        status: UserStatus.ACTIVE,
      },
      create: {
        id: developmentSeedIds.users.teacher,
        email: teacherFixture.email,
        displayName: teacherFixture.displayName,
        status: UserStatus.ACTIVE,
        lastLoginAt: now,
      },
    })

    const studentUsers = await Promise.all([
      transaction.user.upsert({
        where: { id: developmentSeedIds.users.studentOne },
        update: {
          email: studentFixtures.studentOne.email,
          displayName: studentFixtures.studentOne.displayName,
          status: UserStatus.ACTIVE,
        },
        create: {
          id: developmentSeedIds.users.studentOne,
          email: studentFixtures.studentOne.email,
          displayName: studentFixtures.studentOne.displayName,
          status: UserStatus.ACTIVE,
        },
      }),
      transaction.user.upsert({
        where: { id: developmentSeedIds.users.studentTwo },
        update: {
          email: studentFixtures.studentTwo.email,
          displayName: studentFixtures.studentTwo.displayName,
          status: UserStatus.ACTIVE,
        },
        create: {
          id: developmentSeedIds.users.studentTwo,
          email: studentFixtures.studentTwo.email,
          displayName: studentFixtures.studentTwo.displayName,
          status: UserStatus.ACTIVE,
        },
      }),
      transaction.user.upsert({
        where: { id: developmentSeedIds.users.studentThree },
        update: {
          email: studentFixtures.studentThree.email,
          displayName: studentFixtures.studentThree.displayName,
          status: UserStatus.ACTIVE,
        },
        create: {
          id: developmentSeedIds.users.studentThree,
          email: studentFixtures.studentThree.email,
          displayName: studentFixtures.studentThree.displayName,
          status: UserStatus.ACTIVE,
        },
      }),
      transaction.user.upsert({
        where: { id: developmentSeedIds.users.studentFour },
        update: {
          email: studentFixtures.studentFour.email,
          displayName: studentFixtures.studentFour.displayName,
          status: UserStatus.ACTIVE,
        },
        create: {
          id: developmentSeedIds.users.studentFour,
          email: studentFixtures.studentFour.email,
          displayName: studentFixtures.studentFour.displayName,
          status: UserStatus.ACTIVE,
        },
      }),
    ])

    await Promise.all([
      ensureUserRole(transaction, adminUser.id, "ADMIN"),
      ensureUserRole(transaction, teacherUser.id, "TEACHER"),
      ...studentUsers.map((studentUser) => ensureUserRole(transaction, studentUser.id, "STUDENT")),
    ])

    await transaction.userCredential.upsert({
      where: { userId: adminUser.id },
      update: {
        passwordHash: adminPasswordHash,
      },
      create: {
        userId: adminUser.id,
        passwordHash: adminPasswordHash,
      },
    })

    await Promise.all([
      transaction.userCredential.upsert({
        where: { userId: teacherUser.id },
        update: {
          passwordHash: teacherPasswordHash,
        },
        create: {
          userId: teacherUser.id,
          passwordHash: teacherPasswordHash,
        },
      }),
      transaction.userCredential.upsert({
        where: { userId: developmentSeedIds.users.studentOne },
        update: {
          passwordHash: studentOnePasswordHash,
        },
        create: {
          userId: developmentSeedIds.users.studentOne,
          passwordHash: studentOnePasswordHash,
        },
      }),
      transaction.userCredential.upsert({
        where: { userId: developmentSeedIds.users.studentTwo },
        update: {
          passwordHash: studentTwoPasswordHash,
        },
        create: {
          userId: developmentSeedIds.users.studentTwo,
          passwordHash: studentTwoPasswordHash,
        },
      }),
      transaction.userCredential.upsert({
        where: { userId: developmentSeedIds.users.studentThree },
        update: {
          passwordHash: studentThreePasswordHash,
        },
        create: {
          userId: developmentSeedIds.users.studentThree,
          passwordHash: studentThreePasswordHash,
        },
      }),
      transaction.userCredential.upsert({
        where: { userId: developmentSeedIds.users.studentFour },
        update: {
          passwordHash: studentFourPasswordHash,
        },
        create: {
          userId: developmentSeedIds.users.studentFour,
          passwordHash: studentFourPasswordHash,
        },
      }),
    ])

    await transaction.oAuthAccount.upsert({
      where: {
        provider_providerSubject: {
          provider: "GOOGLE",
          providerSubject: teacherFixture.googleProviderSubject,
        },
      },
      update: {
        userId: teacherUser.id,
        providerEmail: teacherUser.email,
        lastUsedAt: now,
      },
      create: {
        userId: teacherUser.id,
        provider: "GOOGLE",
        providerSubject: teacherFixture.googleProviderSubject,
        providerEmail: teacherUser.email,
        lastUsedAt: now,
      },
    })

    await transaction.teacherProfile.upsert({
      where: { userId: teacherUser.id },
      update: {
        employeeCode: teacherFixture.employeeCode,
        department: teacherFixture.department,
        designation: teacherFixture.designation,
      },
      create: {
        userId: teacherUser.id,
        employeeCode: teacherFixture.employeeCode,
        department: teacherFixture.department,
        designation: teacherFixture.designation,
      },
    })

    await Promise.all([
      transaction.studentProfile.upsert({
        where: { userId: developmentSeedIds.users.studentOne },
        update: {
          rollNumber: studentFixtures.studentOne.rollNumber,
          universityId: studentFixtures.studentOne.universityId,
          programName: studentFixtures.studentOne.programName,
          currentSemester: studentFixtures.studentOne.currentSemester,
        },
        create: {
          userId: developmentSeedIds.users.studentOne,
          rollNumber: studentFixtures.studentOne.rollNumber,
          universityId: studentFixtures.studentOne.universityId,
          programName: studentFixtures.studentOne.programName,
          currentSemester: studentFixtures.studentOne.currentSemester,
        },
      }),
      transaction.studentProfile.upsert({
        where: { userId: developmentSeedIds.users.studentTwo },
        update: {
          rollNumber: studentFixtures.studentTwo.rollNumber,
          universityId: studentFixtures.studentTwo.universityId,
          programName: studentFixtures.studentTwo.programName,
          currentSemester: studentFixtures.studentTwo.currentSemester,
        },
        create: {
          userId: developmentSeedIds.users.studentTwo,
          rollNumber: studentFixtures.studentTwo.rollNumber,
          universityId: studentFixtures.studentTwo.universityId,
          programName: studentFixtures.studentTwo.programName,
          currentSemester: studentFixtures.studentTwo.currentSemester,
        },
      }),
      transaction.studentProfile.upsert({
        where: { userId: developmentSeedIds.users.studentThree },
        update: {
          rollNumber: studentFixtures.studentThree.rollNumber,
          universityId: studentFixtures.studentThree.universityId,
          programName: studentFixtures.studentThree.programName,
          currentSemester: studentFixtures.studentThree.currentSemester,
        },
        create: {
          userId: developmentSeedIds.users.studentThree,
          rollNumber: studentFixtures.studentThree.rollNumber,
          universityId: studentFixtures.studentThree.universityId,
          programName: studentFixtures.studentThree.programName,
          currentSemester: studentFixtures.studentThree.currentSemester,
        },
      }),
      transaction.studentProfile.upsert({
        where: { userId: developmentSeedIds.users.studentFour },
        update: {
          rollNumber: studentFixtures.studentFour.rollNumber,
          universityId: studentFixtures.studentFour.universityId,
          programName: studentFixtures.studentFour.programName,
          currentSemester: studentFixtures.studentFour.currentSemester,
        },
        create: {
          userId: developmentSeedIds.users.studentFour,
          rollNumber: studentFixtures.studentFour.rollNumber,
          universityId: studentFixtures.studentFour.universityId,
          programName: studentFixtures.studentFour.programName,
          currentSemester: studentFixtures.studentFour.currentSemester,
        },
      }),
    ])

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
          teacherId: teacherUser.id,
          semesterId: semester.id,
          classId: academicClass.id,
          sectionId: section.id,
          subjectId: mathSubject.id,
        },
      },
      update: {
        grantedByUserId: adminUser.id,
        canSelfCreateCourseOffering: true,
        status: "ACTIVE",
      },
      create: {
        id: developmentSeedIds.teacherAssignments.math,
        teacherId: teacherUser.id,
        grantedByUserId: adminUser.id,
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
          teacherId: teacherUser.id,
          semesterId: semester.id,
          classId: academicClass.id,
          sectionId: section.id,
          subjectId: physicsSubject.id,
        },
      },
      update: {
        grantedByUserId: adminUser.id,
        canSelfCreateCourseOffering: true,
        status: "ACTIVE",
      },
      create: {
        id: developmentSeedIds.teacherAssignments.physics,
        teacherId: teacherUser.id,
        grantedByUserId: adminUser.id,
        semesterId: semester.id,
        classId: academicClass.id,
        sectionId: section.id,
        subjectId: physicsSubject.id,
        canSelfCreateCourseOffering: true,
        status: "ACTIVE",
      },
    })

    const mathCourseOffering = await transaction.courseOffering.upsert({
      where: { code: mathClassroomFixture.classroomCode },
      update: {
        semesterId: semester.id,
        classId: academicClass.id,
        sectionId: section.id,
        subjectId: mathSubject.id,
        primaryTeacherId: teacherUser.id,
        createdByUserId: teacherUser.id,
        displayTitle: mathClassroomFixture.classroomTitle,
        status: CourseOfferingStatus.ACTIVE,
        defaultAttendanceMode: AttendanceMode.QR_GPS,
      },
      create: {
        id: developmentSeedIds.courseOfferings.math,
        semesterId: semester.id,
        classId: academicClass.id,
        sectionId: section.id,
        subjectId: mathSubject.id,
        primaryTeacherId: teacherUser.id,
        createdByUserId: teacherUser.id,
        code: mathClassroomFixture.classroomCode,
        displayTitle: mathClassroomFixture.classroomTitle,
        status: CourseOfferingStatus.ACTIVE,
        defaultAttendanceMode: AttendanceMode[mathClassroomFixture.defaultAttendanceMode],
        defaultGpsRadiusMeters: 100,
        defaultSessionDurationMinutes: 15,
        qrRotationWindowSeconds: 15,
        bluetoothRotationWindowSeconds: 10,
        timezone: "Asia/Kolkata",
        requiresTrustedDevice: true,
      },
    })

    const physicsCourseOffering = await transaction.courseOffering.upsert({
      where: { code: physicsClassroomFixture.classroomCode },
      update: {
        semesterId: semester.id,
        classId: academicClass.id,
        sectionId: section.id,
        subjectId: physicsSubject.id,
        primaryTeacherId: teacherUser.id,
        createdByUserId: teacherUser.id,
        displayTitle: physicsClassroomFixture.classroomTitle,
        status: CourseOfferingStatus.ACTIVE,
        defaultAttendanceMode: AttendanceMode.BLUETOOTH,
      },
      create: {
        id: developmentSeedIds.courseOfferings.physics,
        semesterId: semester.id,
        classId: academicClass.id,
        sectionId: section.id,
        subjectId: physicsSubject.id,
        primaryTeacherId: teacherUser.id,
        createdByUserId: teacherUser.id,
        code: physicsClassroomFixture.classroomCode,
        displayTitle: physicsClassroomFixture.classroomTitle,
        status: CourseOfferingStatus.ACTIVE,
        defaultAttendanceMode: AttendanceMode[physicsClassroomFixture.defaultAttendanceMode],
        defaultGpsRadiusMeters: 100,
        defaultSessionDurationMinutes: 15,
        qrRotationWindowSeconds: 15,
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
        revokedAt: now,
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
        revokedAt: now,
      },
    })

    await Promise.all([
      transaction.classroomJoinCode.upsert({
        where: { code: mathClassroomFixture.joinCode },
        update: {
          courseOfferingId: mathCourseOffering.id,
          createdByUserId: teacherUser.id,
          status: "ACTIVE",
          expiresAt: joinCodeExpiry,
          revokedAt: null,
          lastUsedAt: completedSessionStart,
        },
        create: {
          id: developmentSeedIds.joinCodes.math,
          courseOfferingId: mathCourseOffering.id,
          createdByUserId: teacherUser.id,
          code: mathClassroomFixture.joinCode,
          status: "ACTIVE",
          expiresAt: joinCodeExpiry,
          lastUsedAt: completedSessionStart,
        },
      }),
      transaction.classroomJoinCode.upsert({
        where: { code: physicsClassroomFixture.joinCode },
        update: {
          courseOfferingId: physicsCourseOffering.id,
          createdByUserId: teacherUser.id,
          status: "ACTIVE",
          expiresAt: joinCodeExpiry,
          revokedAt: null,
        },
        create: {
          id: developmentSeedIds.joinCodes.physics,
          courseOfferingId: physicsCourseOffering.id,
          createdByUserId: teacherUser.id,
          code: physicsClassroomFixture.joinCode,
          status: "ACTIVE",
          expiresAt: joinCodeExpiry,
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
          createdByUserId: teacherUser.id,
          title: "Lecture 1",
          lectureDate: new Date("2026-03-10"),
          plannedStartAt: completedSessionStart,
          plannedEndAt: completedSessionEnd,
          actualStartAt: completedSessionStart,
          actualEndAt: completedSessionEnd,
          status: LectureStatus.COMPLETED,
        },
        create: {
          id: developmentSeedIds.lectures.mathCompleted,
          courseOfferingId: mathCourseOffering.id,
          scheduleSlotId: mathScheduleSlot.id,
          createdByUserId: teacherUser.id,
          title: "Lecture 1",
          lectureDate: new Date("2026-03-10"),
          plannedStartAt: completedSessionStart,
          plannedEndAt: completedSessionEnd,
          actualStartAt: completedSessionStart,
          actualEndAt: completedSessionEnd,
          status: LectureStatus.COMPLETED,
        },
      }),
      transaction.lecture.upsert({
        where: { id: developmentSeedIds.lectures.physicsPlanned },
        update: {
          courseOfferingId: physicsCourseOffering.id,
          scheduleSlotId: physicsScheduleSlot.id,
          createdByUserId: teacherUser.id,
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
          createdByUserId: teacherUser.id,
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
        authorUserId: teacherUser.id,
        postType: "ANNOUNCEMENT",
        visibility: "STUDENT_AND_TEACHER",
        title: `Welcome to ${mathClassroomFixture.subjectTitle}`,
        body: "Join the classroom, review the schedule, and keep your trusted device ready for attendance.",
        shouldNotify: true,
      },
      create: {
        id: developmentSeedIds.announcements.mathWelcome,
        courseOfferingId: mathCourseOffering.id,
        authorUserId: teacherUser.id,
        postType: "ANNOUNCEMENT",
        visibility: "STUDENT_AND_TEACHER",
        title: `Welcome to ${mathClassroomFixture.subjectTitle}`,
        body: "Join the classroom, review the schedule, and keep your trusted device ready for attendance.",
        shouldNotify: true,
      },
    })

    await Promise.all(
      studentUsers.map((studentUser) =>
        transaction.announcementReceipt.upsert({
          where: {
            announcementPostId_userId_channel: {
              announcementPostId: developmentSeedIds.announcements.mathWelcome,
              userId: studentUser.id,
              channel: NotificationChannel.IN_APP,
            },
          },
          update: {
            deliveredAt: now,
          },
          create: {
            announcementPostId: developmentSeedIds.announcements.mathWelcome,
            userId: studentUser.id,
            channel: NotificationChannel.IN_APP,
            deliveredAt: now,
          },
        }),
      ),
    )

    const mathEnrollments = await Promise.all([
      transaction.enrollment.upsert({
        where: {
          studentId_courseOfferingId: {
            studentId: developmentSeedIds.users.studentOne,
            courseOfferingId: mathCourseOffering.id,
          },
        },
        update: {
          semesterId: semester.id,
          classId: academicClass.id,
          sectionId: section.id,
          subjectId: mathSubject.id,
          status: EnrollmentStatus.ACTIVE,
          source: EnrollmentSource.MANUAL,
          createdByUserId: teacherUser.id,
        },
        create: {
          id: developmentSeedIds.enrollments.math.studentOne,
          courseOfferingId: mathCourseOffering.id,
          studentId: developmentSeedIds.users.studentOne,
          semesterId: semester.id,
          classId: academicClass.id,
          sectionId: section.id,
          subjectId: mathSubject.id,
          status: EnrollmentStatus.ACTIVE,
          source: EnrollmentSource.MANUAL,
          createdByUserId: teacherUser.id,
        },
      }),
      transaction.enrollment.upsert({
        where: {
          studentId_courseOfferingId: {
            studentId: developmentSeedIds.users.studentTwo,
            courseOfferingId: mathCourseOffering.id,
          },
        },
        update: {
          semesterId: semester.id,
          classId: academicClass.id,
          sectionId: section.id,
          subjectId: mathSubject.id,
          status: EnrollmentStatus.ACTIVE,
          source: EnrollmentSource.JOIN_CODE,
          createdByUserId: teacherUser.id,
        },
        create: {
          id: developmentSeedIds.enrollments.math.studentTwo,
          courseOfferingId: mathCourseOffering.id,
          studentId: developmentSeedIds.users.studentTwo,
          semesterId: semester.id,
          classId: academicClass.id,
          sectionId: section.id,
          subjectId: mathSubject.id,
          status: EnrollmentStatus.ACTIVE,
          source: EnrollmentSource.JOIN_CODE,
          createdByUserId: teacherUser.id,
        },
      }),
      transaction.enrollment.upsert({
        where: {
          studentId_courseOfferingId: {
            studentId: developmentSeedIds.users.studentThree,
            courseOfferingId: mathCourseOffering.id,
          },
        },
        update: {
          semesterId: semester.id,
          classId: academicClass.id,
          sectionId: section.id,
          subjectId: mathSubject.id,
          status: EnrollmentStatus.ACTIVE,
          source: EnrollmentSource.IMPORT,
          createdByUserId: adminUser.id,
        },
        create: {
          id: developmentSeedIds.enrollments.math.studentThree,
          courseOfferingId: mathCourseOffering.id,
          studentId: developmentSeedIds.users.studentThree,
          semesterId: semester.id,
          classId: academicClass.id,
          sectionId: section.id,
          subjectId: mathSubject.id,
          status: EnrollmentStatus.ACTIVE,
          source: EnrollmentSource.IMPORT,
          createdByUserId: adminUser.id,
        },
      }),
      transaction.enrollment.upsert({
        where: {
          studentId_courseOfferingId: {
            studentId: developmentSeedIds.users.studentFour,
            courseOfferingId: mathCourseOffering.id,
          },
        },
        update: {
          semesterId: semester.id,
          classId: academicClass.id,
          sectionId: section.id,
          subjectId: mathSubject.id,
          status: EnrollmentStatus.ACTIVE,
          source: EnrollmentSource.MANUAL,
          createdByUserId: teacherUser.id,
        },
        create: {
          id: developmentSeedIds.enrollments.math.studentFour,
          courseOfferingId: mathCourseOffering.id,
          studentId: developmentSeedIds.users.studentFour,
          semesterId: semester.id,
          classId: academicClass.id,
          sectionId: section.id,
          subjectId: mathSubject.id,
          status: EnrollmentStatus.ACTIVE,
          source: EnrollmentSource.MANUAL,
          createdByUserId: teacherUser.id,
        },
      }),
    ])

    await Promise.all([
      transaction.enrollment.upsert({
        where: {
          studentId_courseOfferingId: {
            studentId: developmentSeedIds.users.studentOne,
            courseOfferingId: physicsCourseOffering.id,
          },
        },
        update: {
          semesterId: semester.id,
          classId: academicClass.id,
          sectionId: section.id,
          subjectId: physicsSubject.id,
          status: EnrollmentStatus.ACTIVE,
          source: EnrollmentSource.MANUAL,
          createdByUserId: teacherUser.id,
        },
        create: {
          id: developmentSeedIds.enrollments.physics.studentOne,
          courseOfferingId: physicsCourseOffering.id,
          studentId: developmentSeedIds.users.studentOne,
          semesterId: semester.id,
          classId: academicClass.id,
          sectionId: section.id,
          subjectId: physicsSubject.id,
          status: EnrollmentStatus.ACTIVE,
          source: EnrollmentSource.MANUAL,
          createdByUserId: teacherUser.id,
        },
      }),
      transaction.enrollment.upsert({
        where: {
          studentId_courseOfferingId: {
            studentId: developmentSeedIds.users.studentTwo,
            courseOfferingId: physicsCourseOffering.id,
          },
        },
        update: {
          semesterId: semester.id,
          classId: academicClass.id,
          sectionId: section.id,
          subjectId: physicsSubject.id,
          status: EnrollmentStatus.ACTIVE,
          source: EnrollmentSource.MANUAL,
          createdByUserId: teacherUser.id,
        },
        create: {
          id: developmentSeedIds.enrollments.physics.studentTwo,
          courseOfferingId: physicsCourseOffering.id,
          studentId: developmentSeedIds.users.studentTwo,
          semesterId: semester.id,
          classId: academicClass.id,
          sectionId: section.id,
          subjectId: physicsSubject.id,
          status: EnrollmentStatus.ACTIVE,
          source: EnrollmentSource.MANUAL,
          createdByUserId: teacherUser.id,
        },
      }),
      transaction.enrollment.upsert({
        where: {
          studentId_courseOfferingId: {
            studentId: developmentSeedIds.users.studentThree,
            courseOfferingId: physicsCourseOffering.id,
          },
        },
        update: {
          semesterId: semester.id,
          classId: academicClass.id,
          sectionId: section.id,
          subjectId: physicsSubject.id,
          status: EnrollmentStatus.DROPPED,
          source: EnrollmentSource.IMPORT,
          droppedAt: physicsStudentThreeDroppedAt,
          createdByUserId: adminUser.id,
        },
        create: {
          id: developmentSeedIds.enrollments.physics.studentThreeDropped,
          courseOfferingId: physicsCourseOffering.id,
          studentId: developmentSeedIds.users.studentThree,
          semesterId: semester.id,
          classId: academicClass.id,
          sectionId: section.id,
          subjectId: physicsSubject.id,
          status: EnrollmentStatus.DROPPED,
          source: EnrollmentSource.IMPORT,
          droppedAt: physicsStudentThreeDroppedAt,
          createdByUserId: adminUser.id,
        },
      }),
      transaction.enrollment.upsert({
        where: {
          studentId_courseOfferingId: {
            studentId: developmentSeedIds.users.studentFour,
            courseOfferingId: physicsCourseOffering.id,
          },
        },
        update: {
          semesterId: semester.id,
          classId: academicClass.id,
          sectionId: section.id,
          subjectId: physicsSubject.id,
          status: EnrollmentStatus.BLOCKED,
          source: EnrollmentSource.ADMIN,
          droppedAt: null,
          createdByUserId: adminUser.id,
        },
        create: {
          id: developmentSeedIds.enrollments.physics.studentFourBlocked,
          courseOfferingId: physicsCourseOffering.id,
          studentId: developmentSeedIds.users.studentFour,
          semesterId: semester.id,
          classId: academicClass.id,
          sectionId: section.id,
          subjectId: physicsSubject.id,
          status: EnrollmentStatus.BLOCKED,
          source: EnrollmentSource.ADMIN,
          createdByUserId: adminUser.id,
        },
      }),
    ])

    await transaction.authSession.upsert({
      where: { id: developmentSeedIds.authSessions.teacherMobile },
      update: {
        userId: teacherUser.id,
        platform: SessionPlatform.MOBILE,
        activeRole: "TEACHER",
        status: SessionStatus.ACTIVE,
        lastActivityAt: now,
        expiresAt: new Date("2026-04-13T09:00:00.000Z"),
      },
      create: {
        id: developmentSeedIds.authSessions.teacherMobile,
        userId: teacherUser.id,
        platform: SessionPlatform.MOBILE,
        activeRole: "TEACHER",
        status: SessionStatus.ACTIVE,
        ipAddress: "127.0.0.1",
        userAgent: "AttendEase Dev Seed",
        lastActivityAt: now,
        expiresAt: new Date("2026-04-13T09:00:00.000Z"),
      },
    })

    await transaction.refreshToken.upsert({
      where: {
        tokenHash: "seed-teacher-refresh-token-hash",
      },
      update: {
        sessionId: developmentSeedIds.authSessions.teacherMobile,
        userId: teacherUser.id,
        expiresAt: new Date("2026-04-13T09:00:00.000Z"),
        lastUsedAt: now,
      },
      create: {
        id: developmentSeedIds.refreshTokens.teacherMobile,
        sessionId: developmentSeedIds.authSessions.teacherMobile,
        userId: teacherUser.id,
        tokenHash: "seed-teacher-refresh-token-hash",
        expiresAt: new Date("2026-04-13T09:00:00.000Z"),
        lastUsedAt: now,
      },
    })

    await Promise.all([
      transaction.device.upsert({
        where: { installId: studentFixtures.studentOne.device.installId },
        update: {
          platform: DevicePlatform[studentFixtures.studentOne.device.platform],
          publicKey: studentFixtures.studentOne.device.publicKey,
          appVersion: studentFixtures.studentOne.device.appVersion,
          deviceModel: studentFixtures.studentOne.device.deviceModel,
          osVersion: studentFixtures.studentOne.device.osVersion,
          attestationStatus: DeviceAttestationStatus.PASSED,
          lastSeenAt: now,
        },
        create: {
          id: developmentSeedIds.devices.studentOne,
          installId: studentFixtures.studentOne.device.installId,
          platform: DevicePlatform[studentFixtures.studentOne.device.platform],
          publicKey: studentFixtures.studentOne.device.publicKey,
          appVersion: studentFixtures.studentOne.device.appVersion,
          deviceModel: studentFixtures.studentOne.device.deviceModel,
          osVersion: studentFixtures.studentOne.device.osVersion,
          attestationStatus: DeviceAttestationStatus.PASSED,
          lastSeenAt: now,
        },
      }),
      transaction.device.upsert({
        where: { installId: studentFixtures.studentTwo.device.installId },
        update: {
          platform: DevicePlatform[studentFixtures.studentTwo.device.platform],
          publicKey: studentFixtures.studentTwo.device.publicKey,
          appVersion: studentFixtures.studentTwo.device.appVersion,
          deviceModel: studentFixtures.studentTwo.device.deviceModel,
          osVersion: studentFixtures.studentTwo.device.osVersion,
          attestationStatus: DeviceAttestationStatus.PASSED,
          lastSeenAt: now,
        },
        create: {
          id: developmentSeedIds.devices.studentTwo,
          installId: studentFixtures.studentTwo.device.installId,
          platform: DevicePlatform[studentFixtures.studentTwo.device.platform],
          publicKey: studentFixtures.studentTwo.device.publicKey,
          appVersion: studentFixtures.studentTwo.device.appVersion,
          deviceModel: studentFixtures.studentTwo.device.deviceModel,
          osVersion: studentFixtures.studentTwo.device.osVersion,
          attestationStatus: DeviceAttestationStatus.PASSED,
          lastSeenAt: now,
        },
      }),
      transaction.device.upsert({
        where: { installId: studentTwoReplacementFixture.revokedDevice.installId },
        update: {
          platform: DevicePlatform[studentTwoReplacementFixture.revokedDevice.platform],
          publicKey: studentTwoReplacementFixture.revokedDevice.publicKey,
          appVersion: studentTwoReplacementFixture.revokedDevice.appVersion,
          deviceModel: studentTwoReplacementFixture.revokedDevice.deviceModel,
          osVersion: studentTwoReplacementFixture.revokedDevice.osVersion,
          attestationStatus: DeviceAttestationStatus.PASSED,
          lastSeenAt: now,
        },
        create: {
          id: developmentSeedIds.devices.studentTwoRevoked,
          installId: studentTwoReplacementFixture.revokedDevice.installId,
          platform: DevicePlatform[studentTwoReplacementFixture.revokedDevice.platform],
          publicKey: studentTwoReplacementFixture.revokedDevice.publicKey,
          appVersion: studentTwoReplacementFixture.revokedDevice.appVersion,
          deviceModel: studentTwoReplacementFixture.revokedDevice.deviceModel,
          osVersion: studentTwoReplacementFixture.revokedDevice.osVersion,
          attestationStatus: DeviceAttestationStatus.PASSED,
          lastSeenAt: studentTwoRevokedAt,
        },
      }),
    ])

    await transaction.userDeviceBinding.updateMany({
      where: {
        bindingType: DeviceBindingType.STUDENT_ATTENDANCE,
        status: DeviceBindingStatus.ACTIVE,
        NOT: {
          id: {
            in: [developmentSeedIds.bindings.studentOne, developmentSeedIds.bindings.studentTwo],
          },
        },
        OR: [
          { userId: developmentSeedIds.users.studentOne },
          { userId: developmentSeedIds.users.studentTwo },
          { deviceId: developmentSeedIds.devices.studentOne },
          { deviceId: developmentSeedIds.devices.studentTwo },
          { deviceId: developmentSeedIds.devices.studentTwoRevoked },
        ],
      },
      data: {
        status: DeviceBindingStatus.REVOKED,
        revokedAt: now,
        revokedByUserId: adminUser.id,
        revokeReason: "Superseded by development seed data",
      },
    })

    await Promise.all([
      transaction.userDeviceBinding.upsert({
        where: { id: developmentSeedIds.bindings.studentOne },
        update: {
          userId: developmentSeedIds.users.studentOne,
          deviceId: developmentSeedIds.devices.studentOne,
          bindingType: DeviceBindingType.STUDENT_ATTENDANCE,
          status: DeviceBindingStatus.ACTIVE,
          activatedAt: now,
          revokedAt: null,
          revokedByUserId: null,
          revokeReason: null,
        },
        create: {
          id: developmentSeedIds.bindings.studentOne,
          userId: developmentSeedIds.users.studentOne,
          deviceId: developmentSeedIds.devices.studentOne,
          bindingType: DeviceBindingType.STUDENT_ATTENDANCE,
          status: DeviceBindingStatus.ACTIVE,
          activatedAt: now,
        },
      }),
      transaction.userDeviceBinding.upsert({
        where: { id: developmentSeedIds.bindings.studentTwo },
        update: {
          userId: developmentSeedIds.users.studentTwo,
          deviceId: developmentSeedIds.devices.studentTwo,
          bindingType: DeviceBindingType.STUDENT_ATTENDANCE,
          status: DeviceBindingStatus.ACTIVE,
          activatedAt: now,
          revokedAt: null,
          revokedByUserId: null,
          revokeReason: null,
        },
        create: {
          id: developmentSeedIds.bindings.studentTwo,
          userId: developmentSeedIds.users.studentTwo,
          deviceId: developmentSeedIds.devices.studentTwo,
          bindingType: DeviceBindingType.STUDENT_ATTENDANCE,
          status: DeviceBindingStatus.ACTIVE,
          activatedAt: now,
        },
      }),
      transaction.userDeviceBinding.upsert({
        where: { id: developmentSeedIds.bindings.studentTwoRevoked },
        update: {
          userId: developmentSeedIds.users.studentTwo,
          deviceId: developmentSeedIds.devices.studentTwoRevoked,
          bindingType: DeviceBindingType.STUDENT_ATTENDANCE,
          status: DeviceBindingStatus.REVOKED,
          activatedAt: new Date("2026-03-01T09:00:00.000Z"),
          revokedAt: studentTwoRevokedAt,
          revokedByUserId: adminUser.id,
          revokeReason: studentTwoReplacementFixture.revokedReason,
        },
        create: {
          id: developmentSeedIds.bindings.studentTwoRevoked,
          userId: developmentSeedIds.users.studentTwo,
          deviceId: developmentSeedIds.devices.studentTwoRevoked,
          bindingType: DeviceBindingType.STUDENT_ATTENDANCE,
          status: DeviceBindingStatus.REVOKED,
          activatedAt: new Date("2026-03-01T09:00:00.000Z"),
          revokedAt: studentTwoRevokedAt,
          revokedByUserId: adminUser.id,
          revokeReason: studentTwoReplacementFixture.revokedReason,
        },
      }),
    ])

    await transaction.attendanceSession.upsert({
      where: { id: developmentSeedIds.sessions.mathCompleted },
      update: {
        courseOfferingId: mathCourseOffering.id,
        lectureId: developmentSeedIds.lectures.mathCompleted,
        teacherAssignmentId: mathTeacherAssignment.id,
        teacherId: teacherUser.id,
        endedByUserId: teacherUser.id,
        semesterId: semester.id,
        classId: academicClass.id,
        sectionId: section.id,
        subjectId: mathSubject.id,
        mode: AttendanceMode.QR_GPS,
        status: "ENDED",
        startedAt: completedSessionStart,
        scheduledEndAt: completedSessionEnd,
        endedAt: completedSessionEnd,
        editableUntil: new Date("2026-03-11T03:30:00.000Z"),
        durationSeconds: 900,
        qrSeed: "seed-math-completed-session-qr-seed-123456",
        gpsAnchorType: "CLASSROOM_FIXED",
        gpsAnchorLabel: "Mathematics Room 101",
        gpsAnchorResolvedAt: completedSessionStart,
        gpsCenterLatitude: 28.6139,
        gpsCenterLongitude: 77.209,
        gpsRadiusMeters: 100,
        qrRotationWindowSeconds: 15,
        bluetoothRotationWindowSeconds: null,
        rosterSnapshotCount: 4,
        presentCount: 3,
        absentCount: 1,
      },
      create: {
        id: developmentSeedIds.sessions.mathCompleted,
        courseOfferingId: mathCourseOffering.id,
        lectureId: developmentSeedIds.lectures.mathCompleted,
        teacherAssignmentId: mathTeacherAssignment.id,
        teacherId: teacherUser.id,
        endedByUserId: teacherUser.id,
        semesterId: semester.id,
        classId: academicClass.id,
        sectionId: section.id,
        subjectId: mathSubject.id,
        mode: AttendanceMode.QR_GPS,
        status: "ENDED",
        startedAt: completedSessionStart,
        scheduledEndAt: completedSessionEnd,
        endedAt: completedSessionEnd,
        editableUntil: new Date("2026-03-11T03:30:00.000Z"),
        durationSeconds: 900,
        qrSeed: "seed-math-completed-session-qr-seed-123456",
        gpsAnchorType: "CLASSROOM_FIXED",
        gpsAnchorLabel: "Mathematics Room 101",
        gpsAnchorResolvedAt: completedSessionStart,
        gpsCenterLatitude: 28.6139,
        gpsCenterLongitude: 77.209,
        gpsRadiusMeters: 100,
        qrRotationWindowSeconds: 15,
        rosterSnapshotCount: 4,
        presentCount: 3,
        absentCount: 1,
      },
    })

    const [
      studentOneMathEnrollment,
      studentTwoMathEnrollment,
      studentThreeMathEnrollment,
      studentFourMathEnrollment,
    ] = mathEnrollments

    await Promise.all([
      transaction.attendanceRecord.upsert({
        where: {
          sessionId_studentId: {
            sessionId: developmentSeedIds.sessions.mathCompleted,
            studentId: developmentSeedIds.users.studentOne,
          },
        },
        update: {
          enrollmentId: studentOneMathEnrollment.id,
          status: AttendanceRecordStatus.PRESENT,
          markSource: "QR_GPS",
          markedAt: new Date("2026-03-10T03:31:00.000Z"),
          markedByUserId: null,
        },
        create: {
          id: developmentSeedIds.attendanceRecords.studentOne,
          sessionId: developmentSeedIds.sessions.mathCompleted,
          enrollmentId: studentOneMathEnrollment.id,
          studentId: developmentSeedIds.users.studentOne,
          status: AttendanceRecordStatus.PRESENT,
          markSource: "QR_GPS",
          markedAt: new Date("2026-03-10T03:31:00.000Z"),
        },
      }),
      transaction.attendanceRecord.upsert({
        where: {
          sessionId_studentId: {
            sessionId: developmentSeedIds.sessions.mathCompleted,
            studentId: developmentSeedIds.users.studentTwo,
          },
        },
        update: {
          enrollmentId: studentTwoMathEnrollment.id,
          status: AttendanceRecordStatus.PRESENT,
          markSource: "QR_GPS",
          markedAt: new Date("2026-03-10T03:32:00.000Z"),
          markedByUserId: null,
        },
        create: {
          id: developmentSeedIds.attendanceRecords.studentTwo,
          sessionId: developmentSeedIds.sessions.mathCompleted,
          enrollmentId: studentTwoMathEnrollment.id,
          studentId: developmentSeedIds.users.studentTwo,
          status: AttendanceRecordStatus.PRESENT,
          markSource: "QR_GPS",
          markedAt: new Date("2026-03-10T03:32:00.000Z"),
        },
      }),
      transaction.attendanceRecord.upsert({
        where: {
          sessionId_studentId: {
            sessionId: developmentSeedIds.sessions.mathCompleted,
            studentId: developmentSeedIds.users.studentThree,
          },
        },
        update: {
          enrollmentId: studentThreeMathEnrollment.id,
          status: AttendanceRecordStatus.PRESENT,
          markSource: "MANUAL",
          markedAt: new Date("2026-03-10T04:00:00.000Z"),
          markedByUserId: teacherUser.id,
        },
        create: {
          id: developmentSeedIds.attendanceRecords.studentThree,
          sessionId: developmentSeedIds.sessions.mathCompleted,
          enrollmentId: studentThreeMathEnrollment.id,
          studentId: developmentSeedIds.users.studentThree,
          status: AttendanceRecordStatus.PRESENT,
          markSource: "MANUAL",
          markedAt: new Date("2026-03-10T04:00:00.000Z"),
          markedByUserId: teacherUser.id,
        },
      }),
      transaction.attendanceRecord.upsert({
        where: {
          sessionId_studentId: {
            sessionId: developmentSeedIds.sessions.mathCompleted,
            studentId: developmentSeedIds.users.studentFour,
          },
        },
        update: {
          enrollmentId: studentFourMathEnrollment.id,
          status: AttendanceRecordStatus.ABSENT,
          markSource: null,
          markedAt: null,
          markedByUserId: null,
        },
        create: {
          id: developmentSeedIds.attendanceRecords.studentFour,
          sessionId: developmentSeedIds.sessions.mathCompleted,
          enrollmentId: studentFourMathEnrollment.id,
          studentId: developmentSeedIds.users.studentFour,
          status: AttendanceRecordStatus.ABSENT,
        },
      }),
    ])

    await transaction.attendanceEvent.deleteMany({
      where: {
        id: {
          in: Object.values(developmentSeedIds.attendanceEvents),
        },
      },
    })

    await transaction.attendanceEditAuditLog.deleteMany({
      where: {
        id: {
          in: Object.values(developmentSeedIds.attendanceEditLogs),
        },
      },
    })

    await transaction.securityEvent.deleteMany({
      where: {
        id: {
          in: Object.values(developmentSeedIds.securityEvents),
        },
      },
    })

    await transaction.adminActionLog.deleteMany({
      where: {
        id: {
          in: Object.values(developmentSeedIds.adminActions),
        },
      },
    })

    await transaction.emailLog.deleteMany({
      where: {
        id: {
          in: Object.values(developmentSeedIds.emailAutomation).filter(
            (value) => value === developmentSeedIds.emailAutomation.emailLog,
          ),
        },
      },
    })

    await transaction.outboxEvent.deleteMany({
      where: {
        id: {
          in: Object.values(developmentSeedIds.outboxEvents),
        },
      },
    })

    await transaction.attendanceEvent.createMany({
      data: [
        buildAttendanceEventData({
          id: developmentSeedIds.attendanceEvents.sessionCreated,
          sessionId: developmentSeedIds.sessions.mathCompleted,
          actorUserId: teacherUser.id,
          eventType: AttendanceEventType.SESSION_CREATED,
          mode: AttendanceMode.QR_GPS,
          metadata: {
            rosterSnapshotCount: 4,
          },
          occurredAt: completedSessionStart,
        }),
        buildAttendanceEventData({
          id: developmentSeedIds.attendanceEvents.studentOneQr,
          sessionId: developmentSeedIds.sessions.mathCompleted,
          attendanceRecordId: developmentSeedIds.attendanceRecords.studentOne,
          studentId: developmentSeedIds.users.studentOne,
          deviceId: developmentSeedIds.devices.studentOne,
          eventType: AttendanceEventType.AUTO_MARK_QR,
          mode: AttendanceMode.QR_GPS,
          previousStatus: AttendanceRecordStatus.ABSENT,
          newStatus: AttendanceRecordStatus.PRESENT,
          metadata: {
            gpsValidated: true,
          },
          occurredAt: new Date("2026-03-10T03:31:00.000Z"),
        }),
        buildAttendanceEventData({
          id: developmentSeedIds.attendanceEvents.studentTwoQr,
          sessionId: developmentSeedIds.sessions.mathCompleted,
          attendanceRecordId: developmentSeedIds.attendanceRecords.studentTwo,
          studentId: developmentSeedIds.users.studentTwo,
          deviceId: developmentSeedIds.devices.studentTwo,
          eventType: AttendanceEventType.AUTO_MARK_QR,
          mode: AttendanceMode.QR_GPS,
          previousStatus: AttendanceRecordStatus.ABSENT,
          newStatus: AttendanceRecordStatus.PRESENT,
          metadata: {
            gpsValidated: true,
          },
          occurredAt: new Date("2026-03-10T03:32:00.000Z"),
        }),
        buildAttendanceEventData({
          id: developmentSeedIds.attendanceEvents.studentThreeManual,
          sessionId: developmentSeedIds.sessions.mathCompleted,
          attendanceRecordId: developmentSeedIds.attendanceRecords.studentThree,
          studentId: developmentSeedIds.users.studentThree,
          actorUserId: teacherUser.id,
          eventType: AttendanceEventType.MANUAL_MARK_PRESENT,
          mode: AttendanceMode.MANUAL,
          previousStatus: AttendanceRecordStatus.ABSENT,
          newStatus: AttendanceRecordStatus.PRESENT,
          metadata: {
            reason: "Student was present but missed the scan window",
          },
          occurredAt: new Date("2026-03-10T04:00:00.000Z"),
        }),
        buildAttendanceEventData({
          id: developmentSeedIds.attendanceEvents.sessionEnded,
          sessionId: developmentSeedIds.sessions.mathCompleted,
          actorUserId: teacherUser.id,
          eventType: AttendanceEventType.SESSION_ENDED,
          mode: AttendanceMode.QR_GPS,
          metadata: {
            presentCount: 3,
            absentCount: 1,
          },
          occurredAt: completedSessionEnd,
        }),
      ],
    })

    await transaction.attendanceEditAuditLog.create({
      data: buildAttendanceEditAuditLogData({
        id: developmentSeedIds.attendanceEditLogs.studentThreeManual,
        sessionId: developmentSeedIds.sessions.mathCompleted,
        attendanceRecordId: developmentSeedIds.attendanceRecords.studentThree,
        studentId: developmentSeedIds.users.studentThree,
        editedByUserId: teacherUser.id,
        previousStatus: AttendanceRecordStatus.ABSENT,
        newStatus: AttendanceRecordStatus.PRESENT,
        editedAt: new Date("2026-03-10T04:00:00.000Z"),
      }),
    })

    await transaction.securityEvent.createMany({
      data: [
        buildSecurityEventData({
          id: developmentSeedIds.securityEvents.studentOneBound,
          userId: developmentSeedIds.users.studentOne,
          actorUserId: adminUser.id,
          deviceId: developmentSeedIds.devices.studentOne,
          bindingId: developmentSeedIds.bindings.studentOne,
          courseOfferingId: mathCourseOffering.id,
          eventType: SecurityEventType.DEVICE_BOUND,
          severity: SecurityEventSeverity.LOW,
          description: "Seeded trusted device binding for student one",
          metadata: {
            bindingId: developmentSeedIds.bindings.studentOne,
          },
          createdAt: now,
        }),
        buildSecurityEventData({
          id: developmentSeedIds.securityEvents.studentTwoBound,
          userId: developmentSeedIds.users.studentTwo,
          actorUserId: adminUser.id,
          deviceId: developmentSeedIds.devices.studentTwo,
          bindingId: developmentSeedIds.bindings.studentTwo,
          courseOfferingId: mathCourseOffering.id,
          eventType: SecurityEventType.DEVICE_BOUND,
          severity: SecurityEventSeverity.LOW,
          description: "Seeded trusted device binding for student two",
          metadata: {
            bindingId: developmentSeedIds.bindings.studentTwo,
          },
          createdAt: now,
        }),
        buildSecurityEventData({
          id: developmentSeedIds.securityEvents.studentTwoRevoked,
          userId: developmentSeedIds.users.studentTwo,
          actorUserId: adminUser.id,
          deviceId: developmentSeedIds.devices.studentTwoRevoked,
          bindingId: developmentSeedIds.bindings.studentTwoRevoked,
          courseOfferingId: physicsCourseOffering.id,
          eventType: SecurityEventType.DEVICE_REVOKED,
          severity: SecurityEventSeverity.MEDIUM,
          description: studentTwoReplacementFixture.revokedReason,
          metadata: {
            replacementBindingId: developmentSeedIds.bindings.studentTwo,
          },
          createdAt: studentTwoRevokedAt,
        }),
      ],
    })

    await transaction.adminActionLog.createMany({
      data: [
        buildAdminActionLogData({
          id: developmentSeedIds.adminActions.studentOneApprove,
          adminUserId: adminUser.id,
          targetUserId: developmentSeedIds.users.studentOne,
          targetDeviceId: developmentSeedIds.devices.studentOne,
          targetBindingId: developmentSeedIds.bindings.studentOne,
          targetCourseOfferingId: mathCourseOffering.id,
          actionType: AdminActionType.DEVICE_APPROVE_REPLACEMENT,
          metadata: {
            reason: "Initial development seed approval",
          },
          createdAt: now,
        }),
        buildAdminActionLogData({
          id: developmentSeedIds.adminActions.studentTwoRevoke,
          adminUserId: adminUser.id,
          targetUserId: developmentSeedIds.users.studentTwo,
          targetDeviceId: developmentSeedIds.devices.studentTwoRevoked,
          targetBindingId: developmentSeedIds.bindings.studentTwoRevoked,
          targetCourseOfferingId: physicsCourseOffering.id,
          actionType: AdminActionType.DEVICE_REVOKE,
          metadata: {
            reason: studentTwoReplacementFixture.revokedReason,
          },
          createdAt: studentTwoRevokedAt,
        }),
        buildAdminActionLogData({
          id: developmentSeedIds.adminActions.studentTwoApproveReplacement,
          adminUserId: adminUser.id,
          targetUserId: developmentSeedIds.users.studentTwo,
          targetDeviceId: developmentSeedIds.devices.studentTwo,
          targetBindingId: developmentSeedIds.bindings.studentTwo,
          targetCourseOfferingId: physicsCourseOffering.id,
          actionType: AdminActionType.DEVICE_APPROVE_REPLACEMENT,
          metadata: {
            reason: studentTwoReplacementFixture.approvalReason,
          },
          createdAt: now,
        }),
      ],
    })

    const emailAutomationRule = await transaction.emailAutomationRule.upsert({
      where: { id: developmentSeedIds.emailAutomation.rule },
      update: {
        courseOfferingId: mathCourseOffering.id,
        createdByUserId: teacherUser.id,
        status: "ACTIVE",
        thresholdPercent: 75,
        scheduleHourLocal: 18,
        scheduleMinuteLocal: 0,
        timezone: "Asia/Kolkata",
        templateSubject: "Attendance below 75%",
        templateBody: "Please review your attendance and contact your teacher if you need help.",
        lastEvaluatedAt: now,
        lastSuccessfulRunAt: now,
      },
      create: {
        id: developmentSeedIds.emailAutomation.rule,
        courseOfferingId: mathCourseOffering.id,
        createdByUserId: teacherUser.id,
        status: "ACTIVE",
        thresholdPercent: 75,
        scheduleHourLocal: 18,
        scheduleMinuteLocal: 0,
        timezone: "Asia/Kolkata",
        templateSubject: "Attendance below 75%",
        templateBody: "Please review your attendance and contact your teacher if you need help.",
        lastEvaluatedAt: now,
        lastSuccessfulRunAt: now,
      },
    })

    const emailDispatchRun = await transaction.emailDispatchRun.upsert({
      where: { id: developmentSeedIds.emailAutomation.dispatchRun },
      update: {
        ruleId: emailAutomationRule.id,
        requestedByUserId: teacherUser.id,
        triggerType: EmailDispatchTriggerType.AUTOMATED,
        dispatchDate: new Date("2026-03-11"),
        status: EmailDispatchRunStatus.COMPLETED,
        targetedStudentCount: 1,
        sentCount: 1,
        failedCount: 0,
        startedAt: new Date("2026-03-11T12:30:00.000Z"),
        completedAt: new Date("2026-03-11T12:31:00.000Z"),
        errorMessage: null,
      },
      create: {
        id: developmentSeedIds.emailAutomation.dispatchRun,
        ruleId: emailAutomationRule.id,
        requestedByUserId: teacherUser.id,
        triggerType: EmailDispatchTriggerType.AUTOMATED,
        dispatchDate: new Date("2026-03-11"),
        status: EmailDispatchRunStatus.COMPLETED,
        targetedStudentCount: 1,
        sentCount: 1,
        failedCount: 0,
        startedAt: new Date("2026-03-11T12:30:00.000Z"),
        completedAt: new Date("2026-03-11T12:31:00.000Z"),
      },
    })

    await transaction.emailLog.create({
      data: buildEmailLogData({
        id: developmentSeedIds.emailAutomation.emailLog,
        dispatchRunId: emailDispatchRun.id,
        ruleId: emailAutomationRule.id,
        studentId: developmentSeedIds.users.studentFour,
        recipientEmail: studentFixtures.studentFour.email,
        subject: "Attendance below 75%",
        body: "Your current attendance is below 75%. Please attend the next classes regularly.",
        status: EmailLogStatus.SENT,
        providerMessageId: "dev-seed-email-message-id",
        createdAt: new Date("2026-03-11T12:30:10.000Z"),
        sentAt: new Date("2026-03-11T12:30:15.000Z"),
      }),
    })

    await transaction.outboxEvent.create({
      data: buildOutboxEventData({
        id: developmentSeedIds.outboxEvents.analyticsRefresh,
        topic: "analytics.attendance.refresh",
        aggregateType: "attendance_session",
        aggregateId: developmentSeedIds.sessions.mathCompleted,
        status: OutboxStatus.PENDING,
        payload: {
          sessionId: developmentSeedIds.sessions.mathCompleted,
          courseOfferingId: mathCourseOffering.id,
          reason: "development_seed",
        },
        availableAt: now,
      }),
    })

    return {
      userCount: 2 + studentUsers.length,
      classroomCount: 2,
      activeJoinCodes: [mathClassroomFixture.joinCode, physicsClassroomFixture.joinCode],
      seededSessionId: developmentSeedIds.sessions.mathCompleted,
      seededEmailRuleId: emailAutomationRule.id,
      pendingOutboxTopics: ["analytics.attendance.refresh"],
    }
  })
}
