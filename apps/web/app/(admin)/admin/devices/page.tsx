import { resolveAdminDeviceWorkspaceView } from "../../../../src/admin-device-support"
import { AdminDeviceSupportConsole } from "../../../../src/admin-device-support-console"
import { AdminStudentManagementWorkspace } from "../../../../src/admin-workflows-client"
import { buildAdminDevicesPageModel } from "../../../../src/web-portal"
import { getWebPortalSession } from "../../../../src/web-session"
import { WebPortalPage, WebSectionCard } from "../../../../src/web-shell"

export default async function AdminDevicesPage(props: {
  searchParams?: Promise<{
    view?: string
  }>
}) {
  const session = await getWebPortalSession()
  const searchParams = (await props.searchParams) ?? {}
  const view = resolveAdminDeviceWorkspaceView(searchParams.view)
  const cardTitle = view === "support" ? "Student support desk" : "Device recovery desk"
  const cardDescription =
    view === "support"
      ? "Start with account state, classroom context, attendance-phone state, and recent risk before you escalate."
      : "Run revoke, clear, and replacement-phone actions only after the support case is verified."

  return (
    <WebPortalPage model={buildAdminDevicesPageModel(view)}>
      <WebSectionCard title={cardTitle} description={cardDescription}>
        {view === "support" ? (
          <AdminStudentManagementWorkspace accessToken={session?.accessToken ?? null} />
        ) : (
          <AdminDeviceSupportConsole initialToken={session?.accessToken ?? null} view={view} />
        )}
      </WebSectionCard>
    </WebPortalPage>
  )
}
