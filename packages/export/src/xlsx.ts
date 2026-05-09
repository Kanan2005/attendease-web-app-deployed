import ExcelJS from "exceljs"

export type XlsxCellValue = string | number | boolean | Date | null | undefined

export type XlsxColumn = {
  header: string
  width?: number
}

export type XlsxSheet = {
  name: string
  columns: readonly XlsxColumn[]
  rows: readonly (readonly XlsxCellValue[])[]
  /**
   * Optional banner rows printed above the data table. Useful for printing
   * filter context (e.g. "Branch: Computer Science  |  Semester: 4").
   */
  banner?: readonly string[]
}

export type BuildXlsxInput = {
  sheets: readonly XlsxSheet[]
  /**
   * Workbook-level metadata. Shows up in Excel's "File > Properties" panel
   * and helps auditors trace which admin generated a file.
   */
  creator?: string
  title?: string
}

const SHEET_NAME_INVALID_CHARS = /[\\/?*:[\]]/g

function safeSheetName(name: string, fallback: string): string {
  const cleaned = name.replace(SHEET_NAME_INVALID_CHARS, " ").trim().slice(0, 31)
  return cleaned.length > 0 ? cleaned : fallback
}

export async function buildXlsxBuffer(input: BuildXlsxInput): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = input.creator ?? "Attendease"
  workbook.created = new Date()
  if (input.title) workbook.title = input.title

  if (input.sheets.length === 0) {
    workbook.addWorksheet("Empty")
  }

  const usedNames = new Set<string>()
  for (let sheetIndex = 0; sheetIndex < input.sheets.length; sheetIndex += 1) {
    const sheetSpec = input.sheets[sheetIndex]
    if (!sheetSpec) continue
    let sheetName = safeSheetName(sheetSpec.name, `Sheet ${sheetIndex + 1}`)
    let dedupeSuffix = 2
    while (usedNames.has(sheetName.toLowerCase())) {
      const suffix = ` (${dedupeSuffix})`
      sheetName = `${safeSheetName(sheetSpec.name, `Sheet ${sheetIndex + 1}`).slice(0, 31 - suffix.length)}${suffix}`
      dedupeSuffix += 1
    }
    usedNames.add(sheetName.toLowerCase())

    const sheet = workbook.addWorksheet(sheetName, {
      properties: { defaultRowHeight: 18 },
    })

    let dataStartRow = 1
    if (sheetSpec.banner && sheetSpec.banner.length > 0) {
      for (const line of sheetSpec.banner) {
        const row = sheet.addRow([line])
        row.font = { italic: true, color: { argb: "FF555555" } }
      }
      sheet.addRow([])
      dataStartRow = sheet.rowCount + 1
    }

    const headerRow = sheet.addRow(sheetSpec.columns.map((column) => column.header))
    headerRow.font = { bold: true }
    headerRow.alignment = { vertical: "middle" }
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEEF2F7" },
      }
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFB0B7C1" } },
      }
    })

    sheet.columns = sheetSpec.columns.map((column, index) => ({
      key: `col_${index}`,
      width: column.width ?? Math.max(12, Math.min(40, column.header.length + 4)),
    }))

    for (const row of sheetSpec.rows) {
      sheet.addRow(row.map((value) => normalizeCell(value)))
    }

    const bannerRowCount = sheetSpec.banner?.length ?? 0
    sheet.views = [
      {
        state: "frozen",
        ySplit: dataStartRow + bannerRowCount,
      },
    ]
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer as ArrayBuffer)
}

function normalizeCell(value: XlsxCellValue): string | number | boolean | Date | null {
  if (value === undefined) return null
  return value
}
