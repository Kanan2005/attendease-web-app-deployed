export const academicProductLanguage = {
  classroom: {
    singular: "Classroom",
    plural: "Classrooms",
    description: "The teacher-owned teaching space students join and teachers manage.",
  },
  courseCode: {
    singular: "Course code",
    plural: "Course codes",
    description: "The short code shown with a classroom.",
  },
  subject: {
    singular: "Subject",
    plural: "Subjects",
    description: "The catalog discipline linked to a classroom.",
  },
  roster: {
    singular: "Roster",
    plural: "Rosters",
    description: "The classroom student-management view.",
  },
  student: {
    singular: "Student",
    plural: "Students",
    description: "A person enrolled in a classroom.",
  },
  classSession: {
    singular: "Class session",
    plural: "Class sessions",
    description: "A scheduled or manually created teaching occurrence for a classroom.",
  },
  attendanceSession: {
    singular: "Attendance session",
    plural: "Attendance sessions",
    description:
      "The present-or-absent attendance-taking event linked to a classroom or class session.",
  },
} as const

export type AcademicProductLanguageKey = keyof typeof academicProductLanguage

export function getAcademicProductTerm(key: AcademicProductLanguageKey, count = 1): string {
  return count === 1 ? academicProductLanguage[key].singular : academicProductLanguage[key].plural
}

export function resolveClassroomId(input: {
  classroomId?: string | null
  courseOfferingId?: string | null
  id?: string | null
}): string | null {
  return input.classroomId ?? input.courseOfferingId ?? input.id ?? null
}

function normalizeProductField(value?: string | null): string | null {
  if (value === null || value === undefined) {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function resolveCourseCode(input: {
  courseCode?: string | null
  code?: string | null
}): string | null {
  return normalizeProductField(input.courseCode) ?? normalizeProductField(input.code)
}

export function resolveClassroomTitle(input: {
  classroomTitle?: string | null
  displayTitle?: string | null
}): string | null {
  return normalizeProductField(input.classroomTitle) ?? normalizeProductField(input.displayTitle)
}

export type StudentMembershipStatusValue = "ACTIVE" | "PENDING" | "DROPPED" | "BLOCKED"
export type StudentMembershipSourceValue = "JOIN_CODE" | "IMPORT" | "MANUAL" | "ADMIN"

export function resolveStudentMembershipId(input: {
  membershipId?: string | null
  enrollmentId?: string | null
  id?: string | null
}): string | null {
  return input.membershipId ?? input.enrollmentId ?? input.id ?? null
}

export function resolveStudentMembershipStatus(input: {
  membershipStatus?: StudentMembershipStatusValue | null
  enrollmentStatus?: StudentMembershipStatusValue | null
  status?: StudentMembershipStatusValue | null
}): StudentMembershipStatusValue | null {
  return input.membershipStatus ?? input.enrollmentStatus ?? input.status ?? null
}

export function resolveStudentMembershipSource(input: {
  membershipSource?: StudentMembershipSourceValue | null
  enrollmentSource?: StudentMembershipSourceValue | null
  source?: StudentMembershipSourceValue | null
}): StudentMembershipSourceValue | null {
  return input.membershipSource ?? input.enrollmentSource ?? input.source ?? null
}

export function resolveStudentIdentifierLabel(input: {
  studentIdentifier?: string | null
  rollNumber?: string | null
  universityId?: string | null
  studentEmail?: string | null
  email?: string | null
}): string | null {
  return (
    normalizeProductField(input.studentIdentifier) ??
    normalizeProductField(input.rollNumber) ??
    normalizeProductField(input.universityId) ??
    normalizeProductField(input.studentEmail) ??
    normalizeProductField(input.email)
  )
}

export function resolveClassSessionId(input: {
  classSessionId?: string | null
  lectureId?: string | null
  id?: string | null
}): string | null {
  return input.classSessionId ?? input.lectureId ?? input.id ?? null
}

export type ClassroomCrudRole = "ADMIN" | "TEACHER" | "STUDENT"
export type ClassroomLifecycleStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED"

export type ClassroomCrudPermissions = {
  canEdit: boolean
  canArchive: boolean
  canEditCourseInfo: boolean
  canEditAcademicScope: boolean
  canReassignTeacher: boolean
}

export type ClassroomRosterSemesterStatus = "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED"
export type ClassroomStudentMembershipStatus = "ACTIVE" | "PENDING" | "DROPPED" | "BLOCKED"
export type ClassroomStudentAccountStatus =
  | "PENDING"
  | "ACTIVE"
  | "SUSPENDED"
  | "BLOCKED"
  | "ARCHIVED"

export type ClassroomStudentActions = {
  canBlock: boolean
  canRemove: boolean
  canReactivate: boolean
}

export function deriveClassroomCrudPermissions(input: {
  role: ClassroomCrudRole
  status: ClassroomLifecycleStatus
}): ClassroomCrudPermissions {
  if (input.status === "ARCHIVED" || input.role === "STUDENT") {
    return {
      canEdit: false,
      canArchive: false,
      canEditCourseInfo: false,
      canEditAcademicScope: false,
      canReassignTeacher: false,
    }
  }

  if (input.role === "ADMIN") {
    return {
      canEdit: true,
      canArchive: true,
      canEditCourseInfo: true,
      canEditAcademicScope: true,
      canReassignTeacher: true,
    }
  }

  return {
    canEdit: true,
    canArchive: true,
    canEditCourseInfo: true,
    canEditAcademicScope: false,
    canReassignTeacher: false,
  }
}

export function deriveClassroomStudentActions(input: {
  classroomStatus: ClassroomLifecycleStatus
  semesterStatus: ClassroomRosterSemesterStatus
  membershipStatus: ClassroomStudentMembershipStatus
  studentStatus: ClassroomStudentAccountStatus
}): ClassroomStudentActions {
  const classroomLocked =
    input.classroomStatus === "COMPLETED" ||
    input.classroomStatus === "ARCHIVED" ||
    input.semesterStatus === "CLOSED" ||
    input.semesterStatus === "ARCHIVED"

  if (classroomLocked) {
    return {
      canBlock: false,
      canRemove: false,
      canReactivate: false,
    }
  }

  const canReactivateToActive = input.studentStatus === "ACTIVE"

  if (input.membershipStatus === "ACTIVE") {
    return {
      canBlock: true,
      canRemove: true,
      canReactivate: false,
    }
  }

  if (input.membershipStatus === "PENDING") {
    return {
      canBlock: true,
      canRemove: true,
      canReactivate: canReactivateToActive,
    }
  }

  if (input.membershipStatus === "DROPPED") {
    return {
      canBlock: false,
      canRemove: false,
      canReactivate: canReactivateToActive,
    }
  }

  return {
    canBlock: false,
    canRemove: true,
    canReactivate: canReactivateToActive,
  }
}
