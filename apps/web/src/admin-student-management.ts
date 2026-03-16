import type { AdminUpdateStudentStatusRequest, UserStatus } from "@attendease/contracts"

export function buildAdminStudentManagementSummaryMessage(count: number, query: string): string {
  if (count === 0) {
    return `No student accounts matched "${query}".`
  }

  if (count === 1) {
    return `Loaded 1 student account for "${query}".`
  }

  return `Loaded ${count} student accounts for "${query}".`
}

export function buildAdminStudentStatusActionReadiness(input: {
  currentStatus: UserStatus
  nextStatus: AdminUpdateStudentStatusRequest["nextStatus"]
  reason: string
  acknowledged: boolean
}) {
  const reason = input.reason.trim()

  if (input.currentStatus === input.nextStatus) {
    return {
      allowed: false,
      message: "Choose a different account state before you save this admin action.",
    }
  }

  if (input.currentStatus === "ARCHIVED") {
    return {
      allowed: false,
      message: "Archived student accounts stay read-only in this reset track.",
    }
  }

  if (reason.length < 3) {
    return {
      allowed: false,
      message: "Add a clear governance reason before you change account access.",
    }
  }

  if (!input.acknowledged) {
    return {
      allowed: false,
      message: "Confirm that the support request was verified before you save a status change.",
    }
  }

  switch (input.nextStatus) {
    case "ACTIVE":
      return {
        allowed: true,
        message:
          "This restores sign-in access without changing classroom memberships or phone history.",
      }
    case "ARCHIVED":
      return {
        allowed: true,
        message:
          "This removes sign-in access and keeps the audit trail plus classroom history intact.",
      }
    default:
      return {
        allowed: true,
        message: "This removes sign-in access and revokes any active student sessions immediately.",
      }
  }
}

export function buildAdminStudentStatusActionLabel(
  nextStatus: AdminUpdateStudentStatusRequest["nextStatus"],
) {
  switch (nextStatus) {
    case "ACTIVE":
      return "Reactivate student"
    case "ARCHIVED":
      return "Archive student"
    default:
      return "Deactivate student"
  }
}
