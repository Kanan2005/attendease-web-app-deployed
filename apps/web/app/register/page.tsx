import { WebAuthEntryPage } from "../../src/web-auth-entry"

export default async function TeacherRegisterPage(props: {
  searchParams?: Promise<{
    error?: string
    next?: string
  }>
}) {
  const searchParams = (await props.searchParams) ?? {}
  const nextPath = searchParams.next?.startsWith("/") ? searchParams.next : ""

  return (
    <WebAuthEntryPage
      variant="teacher-register"
      error={searchParams.error ?? null}
      nextPath={nextPath}
    />
  )
}
