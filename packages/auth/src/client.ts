import { buildAuthClientAcademicMethods } from "./client.academic"
import { buildAuthClientAdminMethods } from "./client.admin"
import { buildAuthClientAttendanceMethods } from "./client.attendance"
import { buildAuthClientAuthMethods } from "./client.auth"
import {
  AuthApiClientError,
  type AuthApiClientFetch,
  type AuthApiClientOptions,
  buildGoogleExchangeRequest,
  createAuthApiRequest,
} from "./client.core"
import { buildAuthClientDeviceMethods } from "./client.devices"
import { buildAuthClientReportMethods } from "./client.reports"
import { buildAuthClientStudentMethods } from "./client.student"

export { AuthApiClientError, buildGoogleExchangeRequest }
export type { AuthApiClientFetch }

export function createAuthApiClient(options: AuthApiClientOptions) {
  const request = createAuthApiRequest(options)

  return {
    ...buildAuthClientAuthMethods(request),
    ...buildAuthClientAcademicMethods(request),
    ...buildAuthClientAttendanceMethods(request),
    ...buildAuthClientReportMethods(request),
    ...buildAuthClientStudentMethods(request),
    ...buildAuthClientDeviceMethods(request),
    ...buildAuthClientAdminMethods(request),
  }
}
