import { TeacherAcademicConsole } from "../../../../src/teacher-academic-console"
import { buildTeacherSemesterPageModel } from "../../../../src/web-portal"
import { WebPortalPage, WebSectionCard } from "../../../../src/web-shell"

export default function TeacherAcademicsPage() {
  return (
    <WebPortalPage model={buildTeacherSemesterPageModel()}>
      <WebSectionCard
        title="Academic Scheduling Console"
        description="This compatibility route keeps the earlier academic planning entrypoint alive while the portal route tree expands."
      >
        <TeacherAcademicConsole />
      </WebSectionCard>
    </WebPortalPage>
  )
}
