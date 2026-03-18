import { createAuthApiClient } from "@attendease/auth"
import { loadMobileEnv } from "@attendease/config"
import { useQuery } from "@tanstack/react-query"

import { getAdminAccessToken, useAdminSession } from "../admin-session"

const env = loadMobileEnv(process.env as Record<string, string | undefined>)
const authClient = createAuthApiClient({ baseUrl: env.EXPO_PUBLIC_API_URL })

export function useAdminStudentsQuery() {
  const { session } = useAdminSession()
  return useQuery({
    queryKey: ["admin", "students"],
    queryFn: () => authClient.listAdminStudents(getAdminAccessToken(session)),
    enabled: !!session,
  })
}

export function useAdminDeviceSupportQuery() {
  const { session } = useAdminSession()
  return useQuery({
    queryKey: ["admin", "devices"],
    queryFn: () => authClient.listAdminDeviceSupport(getAdminAccessToken(session)),
    enabled: !!session,
  })
}

export function useAdminClassroomsQuery() {
  const { session } = useAdminSession()
  return useQuery({
    queryKey: ["admin", "classrooms"],
    queryFn: () => authClient.listAdminClassrooms(getAdminAccessToken(session)),
    enabled: !!session,
  })
}
