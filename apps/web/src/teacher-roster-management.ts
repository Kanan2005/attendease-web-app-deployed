import type {
  ClassroomRosterListQuery,
  ClassroomRosterMemberSummary,
  CreateClassroomRosterMemberRequest,
  EnrollmentStatus,
} from "@attendease/contracts"
import { resolveStudentIdentifierLabel } from "@attendease/domain"

export const teacherWebRosterStatusFilters = [
  "ALL",
  "ACTIVE",
  "PENDING",
  "BLOCKED",
  "DROPPED",
] as const

export type TeacherWebRosterStatusFilter = (typeof teacherWebRosterStatusFilters)[number]

export type TeacherWebRosterActionModel =
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

export function buildTeacherWebRosterFilters(input: {
  searchText: string
  statusFilter: TeacherWebRosterStatusFilter
}): ClassroomRosterListQuery {
  const search = input.searchText.trim()

  return {
    ...(search.length > 0 ? { search } : {}),
    ...(input.statusFilter !== "ALL" ? { membershipStatus: input.statusFilter } : {}),
  }
}

export function buildTeacherWebRosterAddRequest(input: {
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

export function buildTeacherWebRosterMemberActions(
  member: ClassroomRosterMemberSummary,
): TeacherWebRosterActionModel[] {
  const actions: TeacherWebRosterActionModel[] = []

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

export function buildTeacherWebRosterMemberIdentityText(member: ClassroomRosterMemberSummary) {
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

export function buildTeacherWebRosterResultSummary(input: {
  visibleCount: number
  statusFilter: TeacherWebRosterStatusFilter
  searchText: string
}) {
  const hasActiveFilter = input.statusFilter !== "ALL" || input.searchText.trim().length > 0

  if (input.visibleCount === 0) {
    return hasActiveFilter
      ? "No students matched the current roster filters."
      : "No students are in this classroom yet."
  }

  if (!hasActiveFilter) {
    return `${input.visibleCount} student${input.visibleCount === 1 ? "" : "s"} in this classroom`
  }

  return `Showing ${input.visibleCount} matching student${input.visibleCount === 1 ? "" : "s"}`
}
