import { createAuthApiClient } from "@attendease/auth"
import { loadWebEnv } from "@attendease/config"
import type { AnnouncementVisibility } from "@attendease/contracts"

import { webEnvSource } from "./web-env"

export function createWebClassroomCommunicationsBootstrap(
  source: Record<string, string | undefined> = webEnvSource,
) {
  const env = loadWebEnv(source)

  return {
    apiBaseUrl: env.NEXT_PUBLIC_API_URL,
    pageTitle: "Teacher Classroom Hub",
    authClient: createAuthApiClient({
      baseUrl: env.NEXT_PUBLIC_API_URL,
    }),
  }
}

export function buildTeacherClassroomHubSummary(input: {
  classroomCount: number
  rosterCount: number
  announcementCount: number
  importJobCount: number
  reviewRequiredCount: number
}) {
  const classroomLabel = input.classroomCount === 1 ? "classroom" : "classrooms"
  const reviewLabel = input.reviewRequiredCount === 1 ? "job needs" : "jobs need"

  return `Loaded ${input.classroomCount} ${classroomLabel}, ${input.rosterCount} roster member${input.rosterCount === 1 ? "" : "s"}, ${input.announcementCount} announcement${input.announcementCount === 1 ? "" : "s"}, and ${input.importJobCount} import job${input.importJobCount === 1 ? "" : "s"}. ${input.reviewRequiredCount} ${reviewLabel} roster review.`
}

export function buildAnnouncementComposerHint(input: {
  shouldNotify: boolean
  visibility: AnnouncementVisibility
}) {
  if (!input.shouldNotify) {
    return "This post will stay in the classroom stream without sending notifications."
  }

  if (input.visibility === "TEACHER_ONLY") {
    return "Teacher-only posts stay in the private stream and skip student fan-out."
  }

  return "Student-visible posts will fan out through the notification abstraction after saving."
}
