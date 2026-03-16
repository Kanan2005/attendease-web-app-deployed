import { buildAdminDashboardPageModel } from "../../../../src/web-portal"
import { WebPortalPage } from "../../../../src/web-shell"

export default function AdminDashboardPage() {
  return <WebPortalPage model={buildAdminDashboardPageModel()} />
}
