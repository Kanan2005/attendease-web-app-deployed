export type TeacherAssignmentScope = {
  teacherId: string
  semesterId: string
  classId: string
  sectionId: string
  subjectId: string
  status: "ACTIVE" | "REVOKED" | "ARCHIVED"
  canSelfCreateCourseOffering?: boolean
}

export type CourseOfferingScope = {
  id: string
  primaryTeacherId: string
  semesterId: string
  classId: string
  sectionId: string
  subjectId: string
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED"
}

export type EnrollmentScope = {
  id: string
  studentId: string
  courseOfferingId: string
  semesterId: string
  classId: string
  sectionId: string
  subjectId: string
  status: "ACTIVE" | "PENDING" | "DROPPED" | "BLOCKED"
}

type AcademicScope = {
  semesterId: string
  classId: string
  sectionId: string
  subjectId: string
}

export function matchesAcademicScope(left: AcademicScope, right: AcademicScope): boolean {
  return (
    left.semesterId === right.semesterId &&
    left.classId === right.classId &&
    left.sectionId === right.sectionId &&
    left.subjectId === right.subjectId
  )
}

export function canTeacherManageCourseOffering(
  teacherId: string,
  assignment: TeacherAssignmentScope,
  courseOffering: CourseOfferingScope,
): boolean {
  return (
    assignment.status === "ACTIVE" &&
    assignment.teacherId === teacherId &&
    courseOffering.primaryTeacherId === teacherId &&
    courseOffering.status !== "ARCHIVED" &&
    matchesAcademicScope(assignment, courseOffering)
  )
}

export function canTeacherCreateCourseOffering(
  teacherId: string,
  assignment: TeacherAssignmentScope,
  requestedScope: AcademicScope,
): boolean {
  return (
    assignment.status === "ACTIVE" &&
    assignment.teacherId === teacherId &&
    (assignment.canSelfCreateCourseOffering ?? true) &&
    matchesAcademicScope(assignment, requestedScope)
  )
}

export function isStudentEligibleForCourseOffering(
  studentId: string,
  enrollment: EnrollmentScope,
  courseOffering?: CourseOfferingScope,
): boolean {
  if (enrollment.studentId !== studentId || enrollment.status !== "ACTIVE") {
    return false
  }

  if (!courseOffering) {
    return true
  }

  return (
    enrollment.courseOfferingId === courseOffering.id &&
    courseOffering.status !== "ARCHIVED" &&
    matchesAcademicScope(enrollment, courseOffering)
  )
}
