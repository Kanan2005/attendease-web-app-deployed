import { AdminDeviceSupportServiceSharedMappings } from "./admin-device-support.service.shared-mappings.js"
import type { AdminDeviceSupportDependencies } from "./admin-device-support.service.types.js"

export class AdminDeviceSupportServiceShared extends AdminDeviceSupportServiceSharedMappings {
  constructor(protected readonly deps: AdminDeviceSupportDependencies) {
    super(deps)
  }
}
