export { AuthApiClientError, buildGoogleExchangeRequest, createAuthApiClient } from "./client"
export {
  buildTrustedDeviceHeaders,
  canStudentMarkAttendanceWithDeviceTrust,
  trustedDeviceInstallIdHeaderName,
} from "./device"
export { RoleSelectionError, isStaffRole, resolveActiveRole } from "./policies"
