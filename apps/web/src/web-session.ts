import { cookies } from "next/headers"

import { readWebPortalSession } from "./web-portal"

export async function getWebPortalSession() {
  return readWebPortalSession(await cookies())
}
