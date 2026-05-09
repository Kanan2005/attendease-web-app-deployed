import { cookies } from "next/headers"

import { AdminTeachersWorkspace } from "../../../../src/admin-workflows-client/admin-teachers"
import { readWebPortalSession } from "../../../../src/web-portal"

export default async function AdminTeachersPage() {
  const cookieStore = await cookies()
  const session = readWebPortalSession(cookieStore)

  return <AdminTeachersWorkspace accessToken={session?.accessToken ?? null} />
}
