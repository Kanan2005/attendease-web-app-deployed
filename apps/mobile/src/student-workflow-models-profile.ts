import type { AuthenticatedUser } from "@attendease/contracts"

import type { StudentProfileDraft } from "./student-workflow-models-types"

export function createStudentProfileDraft(
  user: Pick<AuthenticatedUser, "displayName" | "email"> | null,
): StudentProfileDraft {
  const displayName = user?.displayName ?? ""

  return {
    displayName,
    preferredShortName: displayName.split(" ")[0] ?? "",
  }
}

export function normalizeStudentProfileDraft(draft: StudentProfileDraft): StudentProfileDraft {
  return {
    displayName: draft.displayName.trim(),
    preferredShortName: draft.preferredShortName.trim(),
  }
}

export function hasStudentProfileDraftChanges(
  initialDraft: StudentProfileDraft,
  currentDraft: StudentProfileDraft,
) {
  const normalizedInitial = normalizeStudentProfileDraft(initialDraft)
  const normalizedCurrent = normalizeStudentProfileDraft(currentDraft)

  return (
    normalizedInitial.displayName !== normalizedCurrent.displayName ||
    normalizedInitial.preferredShortName !== normalizedCurrent.preferredShortName
  )
}
