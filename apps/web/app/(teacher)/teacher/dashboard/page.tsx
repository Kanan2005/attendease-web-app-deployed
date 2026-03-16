import { buildTeacherDashboardPageModel } from "../../../../src/web-portal"
import { WebPortalPage } from "../../../../src/web-shell"

export default function TeacherDashboardPage() {
  return <WebPortalPage model={buildTeacherDashboardPageModel()} />
}
