import { cookies } from "next/headers"

import { AdminDashboardWorkspace } from "../../../../src/admin-workflows-client/admin-dashboard"
import { readWebPortalSession } from "../../../../src/web-portal"

export default async function AdminDashboardPage() {
  const cookieStore = await cookies()
  const session = readWebPortalSession(cookieStore)

  return <AdminDashboardWorkspace accessToken={session?.accessToken ?? null} />
}
