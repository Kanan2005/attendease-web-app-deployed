export type ExportFormat = "csv" | "pdf"

export * from "./csv"
export * from "./pdf"
export * from "./storage"

export function buildExportFileName(prefix: string, format: ExportFormat, date: Date): string {
  const stamp = date.toISOString().replaceAll(":", "-")
  return `${prefix}-${stamp}.${format}`
}
