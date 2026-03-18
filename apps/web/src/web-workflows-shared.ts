function formatMinuteOfDay(minutes: number): string {
  const safeMinutes = Math.max(0, Math.min(1440, minutes))
  const hour = Math.floor(safeMinutes / 60)
  const minute = safeMinutes % 60
  const normalizedHour = ((hour + 11) % 12) + 1
  const suffix = hour >= 12 ? "PM" : "AM"

  return `${String(normalizedHour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${suffix}`
}

export function formatPortalDateTime(value: string | null): string {
  if (!value) {
    return "Not available"
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export function formatPortalDate(value: string | null): string {
  if (!value) {
    return "Not available"
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value))
}

export function formatPortalMinutesRange(startMinutes: number, endMinutes: number): string {
  return `${formatMinuteOfDay(startMinutes)} - ${formatMinuteOfDay(endMinutes)}`
}

export function formatCountdown(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1_000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} remaining`
}

export function formatEnum(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
