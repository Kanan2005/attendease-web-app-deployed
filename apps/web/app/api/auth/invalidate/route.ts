import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { webSessionCookieNames } from "../../../../src/web-portal-types"

/**
 * POST /api/auth/invalidate
 *
 * Clears all session cookies server-side and returns JSON.
 * Used by client-side code when it detects a 401 (session revoked),
 * so cookies (httpOnly) are properly removed before redirecting to login.
 */
export async function POST() {
  const cookieStore = await cookies()

  for (const name of Object.values(webSessionCookieNames)) {
    cookieStore.delete({ name, path: "/" })
  }

  return NextResponse.json({ invalidated: true })
}
