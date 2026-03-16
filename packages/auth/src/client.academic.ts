import { buildAuthClientAcademicAdminMethods } from "./client.academic-admin"
import { buildAuthClientClassroomPeopleMethods } from "./client.classroom-people"
import { buildAuthClientClassroomMethods } from "./client.classrooms"
import type { AuthApiRequest } from "./client.core"

export function buildAuthClientAcademicMethods(request: AuthApiRequest) {
  return {
    ...buildAuthClientAcademicAdminMethods(request),
    ...buildAuthClientClassroomMethods(request),
    ...buildAuthClientClassroomPeopleMethods(request),
  }
}
