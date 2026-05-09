import { cookies } from "next/headers"

import { AdminClassroomGovernanceWorkspace } from "../../../../src/admin-workflows-client/classroom-governance"
import { readWebPortalSession } from "../../../../src/web-portal"

export default async function AdminClassroomsPage() {
  const cookieStore = await cookies()
  const session = readWebPortalSession(cookieStore)

  return <AdminClassroomGovernanceWorkspace accessToken={session?.accessToken ?? null} />
}
