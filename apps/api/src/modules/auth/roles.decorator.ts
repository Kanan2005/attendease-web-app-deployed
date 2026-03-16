import { SetMetadata } from "@nestjs/common"

import type { AppRole } from "@attendease/contracts"

export const ROLES_METADATA_KEY = "roles"

export function Roles(...roles: AppRole[]) {
  return SetMetadata(ROLES_METADATA_KEY, roles)
}
