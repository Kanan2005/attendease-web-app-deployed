export type SessionWindowState = "DRAFT" | "ACTIVE" | "ENDED" | "LOCKED"

export interface SessionWindowInput {
  now: Date
  startedAt?: Date | null
  endedAt?: Date | null
  editableUntil?: Date | null
}

export function deriveSessionWindowState(input: SessionWindowInput): SessionWindowState {
  if (!input.startedAt) {
    return "DRAFT"
  }

  if (!input.endedAt) {
    return "ACTIVE"
  }

  if (input.editableUntil && input.now <= input.editableUntil) {
    return "ENDED"
  }

  return "LOCKED"
}

export * from "./academic-scope"
export * from "./academic-language"
export * from "./analytics"
export * from "./attendance-edit"
export * from "./attendance-percentage"
export * from "./email-automation"
