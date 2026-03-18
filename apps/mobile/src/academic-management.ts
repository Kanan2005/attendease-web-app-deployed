import { createAuthApiClient } from "@attendease/auth"
import { loadMobileEnv } from "@attendease/config"

import { mobileEnvSource } from "./mobile-env"

export function createMobileAcademicManagementBootstrap(
  source: Record<string, string | undefined> = mobileEnvSource,
) {
  const env = loadMobileEnv(source)

  return {
    apiBaseUrl: env.EXPO_PUBLIC_API_URL,
    screenTitle: "Teacher Scheduling",
    authClient: createAuthApiClient({
      baseUrl: env.EXPO_PUBLIC_API_URL,
    }),
  }
}

export function buildTeacherSchedulingPreview(input: {
  classroomCount: number
  slotCount: number
  exceptionCount: number
  lectureCount: number
}) {
  return {
    title:
      input.classroomCount === 0
        ? "Teacher classroom schedule screen is waiting for live data."
        : `Teacher scheduling is ready for ${input.classroomCount} classroom${input.classroomCount === 1 ? "" : "s"}.`,
    message: `Current preview tracks ${input.slotCount} weekly slot${input.slotCount === 1 ? "" : "s"}, ${input.exceptionCount} exception${input.exceptionCount === 1 ? "" : "s"}, and ${input.lectureCount} lecture${input.lectureCount === 1 ? "" : "s"}.`,
  }
}
