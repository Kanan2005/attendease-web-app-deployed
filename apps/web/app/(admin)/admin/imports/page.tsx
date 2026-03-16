import { AdminImportMonitoringWorkspace } from "../../../../src/admin-workflows-client"
import { buildAdminImportsPageModel } from "../../../../src/web-portal"
import { getWebPortalSession } from "../../../../src/web-session"
import { WebPortalPage, WebSectionCard } from "../../../../src/web-shell"

export default async function AdminImportsPage() {
  const session = await getWebPortalSession()

  return (
    <WebPortalPage model={buildAdminImportsPageModel()}>
      <WebSectionCard
        title="Import oversight"
        description="Keep uploaded files, review-required queues, and failures in one admin view before you escalate."
      >
        <AdminImportMonitoringWorkspace accessToken={session?.accessToken ?? null} />
      </WebSectionCard>
    </WebPortalPage>
  )
}
