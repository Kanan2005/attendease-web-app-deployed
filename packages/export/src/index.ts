export type ExportFormat = "csv" | "pdf" | "xlsx"

export * from "./csv"
export * from "./pdf"
export * from "./storage"
export * from "./xlsx"

export function buildExportFileName(prefix: string, format: ExportFormat, date: Date): string {
  const stamp = date.toISOString().replaceAll(":", "-")
  return `${prefix}-${stamp}.${format}`
}
