import { cookies } from "next/headers"

import { readWebPortalSession } from "../../../../src/web-portal"
import { AdminDashboardWorkspace } from "../../../../src/admin-workflows-client/admin-dashboard"

export default async function AdminDashboardPage() {
  const cookieStore = await cookies()
  const session = readWebPortalSession(cookieStore)

  return <AdminDashboardWorkspace accessToken={session?.accessToken ?? null} />
}
