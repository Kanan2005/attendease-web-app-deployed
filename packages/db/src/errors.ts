export function isUniqueConstraintError(error: unknown): error is { code: string } {
  if (typeof error !== "object" || error === null) {
    return false
  }

  return (error as { code?: string }).code === "P2002"
}
