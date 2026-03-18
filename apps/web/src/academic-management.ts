import { createAuthApiClient } from "@attendease/auth"
import { loadWebEnv } from "@attendease/config"

import { webEnvSource } from "./web-env"

export function createWebAcademicManagementBootstrap(
  source: Record<string, string | undefined> = webEnvSource,
) {
  const env = loadWebEnv(source)

  return {
    apiBaseUrl: env.NEXT_PUBLIC_API_URL,
    pageTitle: "Teacher Academic Scheduling",
    authClient: createAuthApiClient({
      baseUrl: env.NEXT_PUBLIC_API_URL,
    }),
  }
}

export function buildTeacherAcademicSummary(input: {
  classroomCount: number
  slotCount: number
  exceptionCount: number
  lectureCount: number
}) {
  return `Loaded ${input.classroomCount} classroom${input.classroomCount === 1 ? "" : "s"}, ${input.slotCount} weekly slot${input.slotCount === 1 ? "" : "s"}, ${input.exceptionCount} exception${input.exceptionCount === 1 ? "" : "s"}, and ${input.lectureCount} lecture${input.lectureCount === 1 ? "" : "s"}.`
}
