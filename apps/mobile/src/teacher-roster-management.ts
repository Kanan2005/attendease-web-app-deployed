import type {
  ClassroomRosterListQuery,
  ClassroomRosterMemberSummary,
  CreateClassroomRosterMemberRequest,
  EnrollmentStatus,
} from "@attendease/contracts"
import { resolveStudentIdentifierLabel } from "@attendease/domain"

export const teacherRosterStatusFilters = [
  "ALL",
  "ACTIVE",
  "PENDING",
  "BLOCKED",
  "DROPPED",
] as const

export type TeacherRosterStatusFilter = (typeof teacherRosterStatusFilters)[number]

export type TeacherRosterActionModel =
  | {
      kind: "UPDATE"
      label: string
      membershipStatus: EnrollmentStatus
      tone: "secondary" | "danger"
    }
  | {
      kind: "REMOVE"
      label: string
      tone: "danger"
    }

function normalizeLookup(value: string) {
  return value.trim()
}

export function buildTeacherRosterFilters(input: {
  searchText: string
  statusFilter: TeacherRosterStatusFilter
}): ClassroomRosterListQuery {
  const search = input.searchText.trim()

  return {
    ...(search.length > 0 ? { search } : {}),
    ...(input.statusFilter !== "ALL" ? { membershipStatus: input.statusFilter } : {}),
  }
}

export function buildTeacherRosterAddRequest(input: {
  lookup: string
  membershipStatus: "ACTIVE" | "PENDING"
}): CreateClassroomRosterMemberRequest {
  const normalizedLookup = normalizeLookup(input.lookup)
  const normalizedEmail = normalizedLookup.toLowerCase()

  return {
    ...(normalizedLookup.includes("@")
      ? { studentEmail: normalizedEmail }
      : { studentIdentifier: normalizedLookup }),
    membershipStatus: input.membershipStatus,
    status: input.membershipStatus,
  }
}

export function buildTeacherRosterMemberActions(
  member: ClassroomRosterMemberSummary,
): TeacherRosterActionModel[] {
  const actions: TeacherRosterActionModel[] = []

  if (member.status === "ACTIVE") {
    actions.push({
      kind: "UPDATE",
      label: "Mark Pending",
      membershipStatus: "PENDING",
      tone: "secondary",
    })
  }

  if (member.actions.canReactivate && member.status !== "ACTIVE") {
    actions.push({
      kind: "UPDATE",
      label: "Activate",
      membershipStatus: "ACTIVE",
      tone: "secondary",
    })
  }

  if (member.actions.canBlock && member.status !== "BLOCKED") {
    actions.push({
      kind: "UPDATE",
      label: "Block",
      membershipStatus: "BLOCKED",
      tone: "danger",
    })
  }

  if (member.actions.canRemove) {
    actions.push({
      kind: "REMOVE",
      label: "Remove",
      tone: "danger",
    })
  }

  return actions
}

export function buildTeacherRosterMemberIdentityText(member: ClassroomRosterMemberSummary) {
  const identifier = resolveStudentIdentifierLabel({
    studentIdentifier: member.studentIdentifier,
    rollNumber: member.rollNumber,
    universityId: member.universityId,
    studentEmail: member.studentEmail,
  })

  if (identifier && identifier !== member.studentEmail) {
    return `${identifier} · ${member.studentEmail}`
  }

  return member.studentEmail
}

export function buildTeacherRosterResultSummary(input: {
  totalCount: number
  visibleCount: number
  statusFilter: TeacherRosterStatusFilter
  searchText: string
}) {
  if (input.totalCount === 0) {
    return "No students are in this classroom yet."
  }

  const hasActiveFilter = input.statusFilter !== "ALL" || input.searchText.trim().length > 0

  if (!hasActiveFilter) {
    return `${input.totalCount} student${input.totalCount === 1 ? "" : "s"} in this classroom`
  }

  return `Showing ${input.visibleCount} of ${input.totalCount} student${input.totalCount === 1 ? "" : "s"}`
}
