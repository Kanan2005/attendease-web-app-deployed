import { createAuthApiClient } from "@attendease/auth"
import { loadMobileEnv } from "@attendease/config"

export function createMobileClassroomCommunicationsBootstrap(
  source: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
) {
  const env = loadMobileEnv(source)

  return {
    apiBaseUrl: env.EXPO_PUBLIC_API_URL,
    teacherScreenTitle: "Teacher Classroom Stream",
    studentScreenTitle: "Student Classroom Stream",
    authClient: createAuthApiClient({
      baseUrl: env.EXPO_PUBLIC_API_URL,
    }),
  }
}

export function buildStudentClassroomStreamPreview(input: {
  classroomCount: number
  announcementCount: number
  hiddenTeacherOnlyCount: number
}) {
  return {
    title:
      input.classroomCount === 0
        ? "Student classroom stream is waiting for joined classrooms."
        : `Student stream is ready for ${input.classroomCount} classroom${input.classroomCount === 1 ? "" : "s"}.`,
    message: `Preview includes ${input.announcementCount} student-visible announcement${input.announcementCount === 1 ? "" : "s"} and hides ${input.hiddenTeacherOnlyCount} teacher-only update${input.hiddenTeacherOnlyCount === 1 ? "" : "s"}.`,
  }
}

export function buildTeacherRosterImportPreview(input: {
  rosterMemberCount: number
  importJobCount: number
  reviewRequiredCount: number
}) {
  return {
    title:
      input.importJobCount === 0
        ? "Teacher roster import queue is waiting for the first upload."
        : `Teacher roster tools are tracking ${input.importJobCount} import job${input.importJobCount === 1 ? "" : "s"}.`,
    message: `Current preview covers ${input.rosterMemberCount} roster member${input.rosterMemberCount === 1 ? "" : "s"} and ${input.reviewRequiredCount} import review queue item${input.reviewRequiredCount === 1 ? "" : "s"}.`,
  }
}
