import { cookies } from "next/headers"

import { readWebPortalSession } from "../../../../src/web-portal"
import { AdminClassroomGovernanceWorkspace } from "../../../../src/admin-workflows-client/classroom-governance"

export default async function AdminClassroomsPage() {
  const cookieStore = await cookies()
  const session = readWebPortalSession(cookieStore)

  return <AdminClassroomGovernanceWorkspace accessToken={session?.accessToken ?? null} />
}
