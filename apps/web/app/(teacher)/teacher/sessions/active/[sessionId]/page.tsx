import { QrActiveSessionShell } from "../../../../../../src/qr-session-shell"
import { getWebPortalSession } from "../../../../../../src/web-session"

export default async function TeacherActiveSessionPage(props: {
  params: Promise<{ sessionId: string }>
}) {
  const params = await props.params
  const session = await getWebPortalSession()

  return (
    <QrActiveSessionShell
      accessToken={session?.accessToken ?? null}
      sessionId={params.sessionId}
      projector={false}
    />
  )
}
