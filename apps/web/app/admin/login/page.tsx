import { redirect } from "next/navigation"

export default async function AdminLoginPage(props: {
  searchParams?: Promise<{
    error?: string
    next?: string
  }>
}) {
  const searchParams = (await props.searchParams) ?? {}
  const params = new URLSearchParams({ mode: "admin" })
  if (searchParams.error) params.set("error", searchParams.error)
  if (searchParams.next) params.set("next", searchParams.next)
  redirect(`/?${params.toString()}`)
}
