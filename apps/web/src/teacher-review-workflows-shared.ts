import type { TeacherWebFilterOption, TeacherWebReviewTone } from "./teacher-review-workflows-types"

export function buildUniqueSortedOptions(
  options: TeacherWebFilterOption[],
): TeacherWebFilterOption[] {
  const optionMap = new Map<string, TeacherWebFilterOption>()

  for (const option of options) {
    if (!option.value || optionMap.has(option.value)) {
      continue
    }

    optionMap.set(option.value, option)
  }

  return [...optionMap.values()].sort((left, right) => left.label.localeCompare(right.label))
}

export function buildScopeLabel(
  code: string | null | undefined,
  title: string | null | undefined,
  fallback: string,
) {
  if (code && title && code !== title) {
    return `${title} (${code})`
  }

  return title ?? code ?? fallback
}

export function extractApiErrorMessage(details: unknown): string | null {
  if (!details || typeof details !== "object") {
    return null
  }

  const maybeMessage = "message" in details ? (details as { message?: unknown }).message : null

  if (typeof maybeMessage === "string" && maybeMessage.length > 0) {
    return maybeMessage
  }

  if (
    Array.isArray(maybeMessage) &&
    maybeMessage.length > 0 &&
    typeof maybeMessage[0] === "string"
  ) {
    return maybeMessage[0]
  }

  return null
}

export function toneForAttendancePercentage(attendancePercentage: number): TeacherWebReviewTone {
  if (attendancePercentage >= 75) {
    return "success"
  }

  if (attendancePercentage > 0) {
    return "warning"
  }

  return "danger"
}

export function toIsoStartOfDay(value: string) {
  return `${value}T00:00:00.000Z`
}

export function toIsoEndOfDay(value: string) {
  return `${value}T23:59:59.999Z`
}

export function formatReviewDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((segment) => `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`)
    .join(" ")
}
