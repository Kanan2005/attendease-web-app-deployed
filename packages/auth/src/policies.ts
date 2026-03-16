import type { AppRole } from "@attendease/contracts"

export class RoleSelectionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "RoleSelectionError"
  }
}

const rolePriority: Record<AppRole, number> = {
  ADMIN: 0,
  TEACHER: 1,
  STUDENT: 2,
}

export function hasRole(roles: readonly AppRole[], role: AppRole): boolean {
  return roles.includes(role)
}

export function resolveActiveRole(roles: readonly AppRole[], requestedRole?: AppRole): AppRole {
  if (roles.length === 0) {
    throw new RoleSelectionError("The user has no assigned roles.")
  }

  if (requestedRole) {
    if (!hasRole(roles, requestedRole)) {
      throw new RoleSelectionError("The requested role is not available for this user.")
    }

    return requestedRole
  }

  const [resolvedRole] = [...roles].sort((left, right) => rolePriority[left] - rolePriority[right])

  if (!resolvedRole) {
    throw new RoleSelectionError("The user has no assigned roles.")
  }

  return resolvedRole
}

export function isStaffRole(role: AppRole): boolean {
  return role === "ADMIN" || role === "TEACHER"
}
