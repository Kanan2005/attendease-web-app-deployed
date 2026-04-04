import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { readWebPortalSession } from "./web-portal"

export async function getWebPortalSession() {
  return readWebPortalSession(await cookies())
}

/**
 * Read the portal session and redirect to login if it is missing or expired.
 * Use this in page-level RSC components to catch the case where the layout
 * is cached during soft navigation but the session cookies have expired.
 * Returns a guaranteed non-null session with accessToken.
 */
export async function requireWebPortalSession(currentPath: string) {
  const session = await getWebPortalSession()
  if (!session?.accessToken) {
    redirect(`/?next=${encodeURIComponent(currentPath)}`)
  }
  return session
}
