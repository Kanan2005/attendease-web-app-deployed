import { QrActiveSessionShell } from "../../../../../../src/qr-session-shell"
import { requireWebPortalSession } from "../../../../../../src/web-session"

export default async function TeacherActiveSessionPage(props: {
  params: Promise<{ sessionId: string }>
}) {
  const params = await props.params
  const session = await requireWebPortalSession("/teacher/sessions")

  return (
    <QrActiveSessionShell
      accessToken={session.accessToken}
      sessionId={params.sessionId}
      projector={false}
    />
  )
}
