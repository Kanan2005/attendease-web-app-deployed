import type { AuthenticatedUser } from "@attendease/contracts"

import type { StudentProfileDraft } from "./student-workflow-models-types"

export function createStudentProfileDraft(
  user:
    | (Pick<AuthenticatedUser, "displayName" | "email"> & {
        rollNumber?: string | null | undefined
        degree?: string | null | undefined
        branch?: string | null | undefined
      })
    | null,
): StudentProfileDraft {
  const displayName = user?.displayName ?? ""

  return {
    displayName,
    preferredShortName: displayName.split(" ")[0] ?? "",
    rollNumber: user?.rollNumber ?? "",
    degree: user?.degree ?? "",
    branch: user?.branch ?? "",
  }
}

export function normalizeStudentProfileDraft(draft: StudentProfileDraft): StudentProfileDraft {
  return {
    displayName: draft.displayName.trim(),
    preferredShortName: draft.preferredShortName.trim(),
    rollNumber: draft.rollNumber.trim(),
    degree: draft.degree.trim(),
    branch: draft.branch.trim(),
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
    normalizedInitial.preferredShortName !== normalizedCurrent.preferredShortName ||
    normalizedInitial.rollNumber !== normalizedCurrent.rollNumber ||
    normalizedInitial.degree !== normalizedCurrent.degree ||
    normalizedInitial.branch !== normalizedCurrent.branch
  )
}
