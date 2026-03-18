import {
  type ClassroomRosterMemberSummary,
  type CreateClassroomRosterMemberRequest,
  type StudentClassroomMembershipSummary,
  classroomRosterMemberSummarySchema,
  studentClassroomMembershipSummarySchema,
} from "@attendease/contracts"
import type { PrismaTransactionClient } from "@attendease/db"
import { deriveClassroomStudentActions, resolveStudentIdentifierLabel } from "@attendease/domain"
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common"

import type { DatabaseService } from "../../database/database.service.js"
import type { ClassroomAccessContext } from "./classrooms.service.js"

type RosterDbClient = DatabaseService["prisma"]

export const rosterStudentInclude = {
  student: {
    select: {
      email: true,
      displayName: true,
      status: true,
      studentProfile: {
        select: {
          rollNumber: true,
          universityId: true,
          attendanceDisabled: true,
        },
      },
    },
  },
} as const

export function rosterSearchMatches(
  enrollment: {
    student: {
      email: string
      displayName: string
      studentProfile: {
        rollNumber: string | null
        universityId: string | null
      } | null
    }
  },
  search: string | undefined,
) {
  const normalizedSearch = search?.trim().toLowerCase()
  if (!normalizedSearch) {
    return true
  }

  const rollNumber = enrollment.student.studentProfile?.rollNumber?.toLowerCase() ?? ""
  const universityId = enrollment.student.studentProfile?.universityId?.toLowerCase() ?? ""

  return (
    enrollment.student.displayName.toLowerCase().includes(normalizedSearch) ||
    enrollment.student.email.toLowerCase().includes(normalizedSearch) ||
    rollNumber.includes(normalizedSearch) ||
    universityId.includes(normalizedSearch)
  )
}

export function assertMutableRosterClassroom(
  classroom: Pick<ClassroomAccessContext, "status" | "semester">,
) {
  if (classroom.status === "COMPLETED" || classroom.status === "ARCHIVED") {
    throw new BadRequestException(
      "Roster changes are not allowed for completed or archived classrooms.",
    )
  }

  if (classroom.semester.status === "CLOSED" || classroom.semester.status === "ARCHIVED") {
    throw new BadRequestException(
      "Roster changes are not allowed inside a closed or archived semester.",
    )
  }
}

export async function findStudentByIdentifier(
  database: RosterDbClient,
  request: CreateClassroomRosterMemberRequest,
) {
  const email = request.studentEmail?.trim().toLowerCase()
  const studentIdentifier = request.studentIdentifier?.trim()
  const studentRollNumber = request.studentRollNumber?.trim()
  const studentUniversityId = request.studentUniversityId?.trim()
  const studentIdentifierFilters =
    studentIdentifier === undefined
      ? []
      : [
          {
            email: studentIdentifier.toLowerCase(),
          },
          {
            studentProfile: {
              is: {
                rollNumber: studentIdentifier,
              },
            },
          },
          {
            studentProfile: {
              is: {
                universityId: studentIdentifier,
              },
            },
          },
        ]

  const filters = [
    request.studentId ? { id: request.studentId } : null,
    email ? { email } : null,
    studentRollNumber
      ? {
          studentProfile: {
            is: {
              rollNumber: studentRollNumber,
            },
          },
        }
      : null,
    studentUniversityId
      ? {
          studentProfile: {
            is: {
              universityId: studentUniversityId,
            },
          },
        }
      : null,
    studentIdentifierFilters.length > 0
      ? {
          OR: studentIdentifierFilters,
        }
      : null,
  ].filter((value): value is NonNullable<typeof value> => value !== null)

  const student = await database.user.findFirst({
    where: {
      ...(filters.length > 0 ? { AND: filters } : {}),
      roles: {
        some: {
          role: "STUDENT",
        },
      },
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      status: true,
      studentProfile: {
        select: {
          rollNumber: true,
          universityId: true,
          attendanceDisabled: true,
        },
      },
    },
  })

  if (!student) {
    throw new NotFoundException("Student not found for the requested identifier.")
  }

  return student
}

export function assertStudentAllowedForRoster(
  student: {
    status: "PENDING" | "ACTIVE" | "SUSPENDED" | "BLOCKED" | "ARCHIVED"
  },
  targetStatus: "ACTIVE" | "PENDING" | "DROPPED" | "BLOCKED",
) {
  if (student.status === "BLOCKED" || student.status === "ARCHIVED") {
    throw new BadRequestException("Blocked or archived student accounts cannot join rosters.")
  }

  if (targetStatus === "ACTIVE" && student.status !== "ACTIVE") {
    throw new BadRequestException(
      "Only active student accounts can hold an active classroom membership.",
    )
  }
}

export async function resolveRosterEnrollmentUpsert(
  transaction: PrismaTransactionClient,
  enrollmentId: string,
  input: {
    existingStatus: "ACTIVE" | "PENDING" | "DROPPED" | "BLOCKED"
    nextStatus: "ACTIVE" | "PENDING"
    source: "MANUAL" | "ADMIN"
  },
) {
  if (input.existingStatus === "ACTIVE") {
    throw new ConflictException("Student is already present on the classroom roster.")
  }

  if (input.existingStatus === "BLOCKED") {
    throw new ConflictException(
      "Blocked classroom memberships must be changed through a roster status update.",
    )
  }

  return transaction.enrollment.update({
    where: {
      id: enrollmentId,
    },
    data: {
      status: input.nextStatus,
      source: input.source,
      droppedAt: null,
    },
    include: rosterStudentInclude,
  })
}

export function toRosterMemberSummary(
  input: {
    id: string
    courseOfferingId: string
    studentId: string
    semesterId: string
    classId: string
    sectionId: string
    subjectId: string
    status: "ACTIVE" | "PENDING" | "DROPPED" | "BLOCKED"
    source: "JOIN_CODE" | "IMPORT" | "MANUAL" | "ADMIN"
    joinedAt: Date
    droppedAt: Date | null
    student: {
      email: string
      displayName: string
      status: "PENDING" | "ACTIVE" | "SUSPENDED" | "BLOCKED" | "ARCHIVED"
      studentProfile: {
        rollNumber: string | null
        universityId: string | null
        attendanceDisabled: boolean
      } | null
    }
  },
  classroom: Pick<ClassroomAccessContext, "status" | "semester">,
): ClassroomRosterMemberSummary {
  const studentIdentifier =
    resolveStudentIdentifierLabel({
      rollNumber: input.student.studentProfile?.rollNumber ?? null,
      universityId: input.student.studentProfile?.universityId ?? null,
      studentEmail: input.student.email,
    }) ?? input.student.email

  return classroomRosterMemberSummarySchema.parse({
    id: input.id,
    courseOfferingId: input.courseOfferingId,
    classroomId: input.courseOfferingId,
    membershipId: input.id,
    studentId: input.studentId,
    semesterId: input.semesterId,
    classId: input.classId,
    sectionId: input.sectionId,
    subjectId: input.subjectId,
    status: input.status,
    membershipStatus: input.status,
    source: input.source,
    membershipSource: input.source,
    studentEmail: input.student.email,
    studentDisplayName: input.student.displayName,
    studentName: input.student.displayName,
    studentIdentifier,
    studentStatus: input.student.status,
    rollNumber: input.student.studentProfile?.rollNumber ?? null,
    universityId: input.student.studentProfile?.universityId ?? null,
    attendanceDisabled: input.student.studentProfile?.attendanceDisabled ?? false,
    joinedAt: input.joinedAt.toISOString(),
    memberSince: input.joinedAt.toISOString(),
    droppedAt: input.droppedAt?.toISOString() ?? null,
    membershipState: input.status,
    actions: deriveClassroomStudentActions({
      classroomStatus: classroom.status,
      semesterStatus: classroom.semester.status,
      membershipStatus: input.status,
      studentStatus: input.student.status,
    }),
  })
}

export function toStudentClassroomMembershipSummary(input: {
  id: string
  courseOfferingId: string
  studentId: string
  semesterId: string
  classId: string
  sectionId: string
  subjectId: string
  status: "ACTIVE" | "PENDING" | "DROPPED" | "BLOCKED"
  source: "JOIN_CODE" | "IMPORT" | "MANUAL" | "ADMIN"
  joinedAt: Date
  droppedAt: Date | null
  courseOffering: {
    id: string
    primaryTeacherId: string
    code: string
    displayTitle: string
    status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED"
    defaultAttendanceMode: "QR_GPS" | "BLUETOOTH" | "MANUAL"
    timezone: string
    requiresTrustedDevice: boolean
    primaryTeacher?: { displayName: string | null } | null
  }
}): StudentClassroomMembershipSummary {
  return studentClassroomMembershipSummarySchema.parse({
    id: input.courseOffering.id,
    classroomId: input.courseOffering.id,
    semesterId: input.semesterId,
    classId: input.classId,
    sectionId: input.sectionId,
    subjectId: input.subjectId,
    primaryTeacherId: input.courseOffering.primaryTeacherId,
    primaryTeacherDisplayName: input.courseOffering.primaryTeacher?.displayName ?? null,
    code: input.courseOffering.code,
    displayTitle: input.courseOffering.displayTitle,
    classroomStatus: input.courseOffering.status,
    defaultAttendanceMode: input.courseOffering.defaultAttendanceMode,
    timezone: input.courseOffering.timezone,
    requiresTrustedDevice: input.courseOffering.requiresTrustedDevice,
    enrollmentId: input.id,
    membershipId: input.id,
    enrollmentStatus: input.status,
    membershipStatus: input.status,
    enrollmentSource: input.source,
    membershipSource: input.source,
    joinedAt: input.joinedAt.toISOString(),
    droppedAt: input.droppedAt?.toISOString() ?? null,
  })
}
