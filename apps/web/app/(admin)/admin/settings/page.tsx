import { cookies } from "next/headers"

import { AdminSettingsWorkspace } from "../../../../src/admin-workflows-client/admin-settings"
import { readWebPortalSession } from "../../../../src/web-portal"

export default async function AdminSettingsPage() {
  const cookieStore = await cookies()
  const session = readWebPortalSession(cookieStore)

  return <AdminSettingsWorkspace accessToken={session?.accessToken ?? null} />
}
