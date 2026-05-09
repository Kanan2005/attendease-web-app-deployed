import { AuthApiClientError } from "@attendease/auth"

const FIELD_LABELS: Record<string, string> = {
  email: "Email",
  password: "Password",
  displayName: "Full name",
  installId: "Device identity",
  publicKey: "Device key",
}

export function isZodError(
  err: unknown,
): err is Error & { issues: { path: (string | number)[]; message: string }[] } {
  return (
    err instanceof Error &&
    err.name === "ZodError" &&
    Array.isArray((err as unknown as Record<string, unknown>).issues)
  )
}

export function humanizeZodMessage(raw: string): string {
  let msg = raw
    .replace(/^String /i, "")
    .replace(/character\(s\)/g, "characters")
  msg = msg.charAt(0).toUpperCase() + msg.slice(1)
  return msg
}

export function friendlyErrorMessage(
  error: unknown,
  fallback: string,
  fieldLabels: Record<string, string> = FIELD_LABELS,
): string {
  if (isZodError(error)) {
    const first = error.issues[0]
    if (!first) return fallback
    const field =
      first.path.length > 0 ? (fieldLabels[String(first.path[0])] ?? String(first.path[0])) : null
    const msg = humanizeZodMessage(first.message)
    return field ? `${field}: ${msg.charAt(0).toLowerCase()}${msg.slice(1)}` : msg
  }
  if (error instanceof AuthApiClientError) {
    const body = error.details as Record<string, unknown> | null
    if (body && typeof body.message === "string") return body.message
    return fallback
  }
  if (error instanceof Error) {
    return error.message
  }
  return fallback
}
