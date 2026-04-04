import { cookies } from "next/headers"

import { AdminDeviceSupportConsole } from "../../../../src/admin-device-support-console"
import { readWebPortalSession } from "../../../../src/web-portal"

export default async function AdminDevicesPage() {
  const cookieStore = await cookies()
  const session = readWebPortalSession(cookieStore)

  return <AdminDeviceSupportConsole initialToken={session?.accessToken ?? ""} view="recovery" />
}
