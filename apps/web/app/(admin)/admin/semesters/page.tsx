import {
  AdminClassroomGovernanceWorkspace,
  AdminSemesterManagementWorkspace,
} from "../../../../src/admin-workflows-client"
import { buildAdminSemesterPageModel } from "../../../../src/web-portal"
import { getWebPortalSession } from "../../../../src/web-session"
import { WebPortalPage, WebSectionCard } from "../../../../src/web-shell"

export default async function AdminSemestersPage() {
  const session = await getWebPortalSession()

  return (
    <WebPortalPage model={buildAdminSemesterPageModel()}>
      <WebSectionCard
        title="Semester governance"
        description="Create, activate, archive, and review semester timing changes from the protected admin workspace."
      >
        <AdminSemesterManagementWorkspace accessToken={session?.accessToken ?? null} />
      </WebSectionCard>
      <WebSectionCard
        title="Classroom governance"
        description="Review course context, attendance-history impact, and archive classrooms safely without deleting saved attendance truth."
      >
        <AdminClassroomGovernanceWorkspace accessToken={session?.accessToken ?? null} />
      </WebSectionCard>
    </WebPortalPage>
  )
}
