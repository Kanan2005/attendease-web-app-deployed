import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

import type { SessionExportStudentRow } from "./csv"

export async function buildSessionPdfBuffer(input: {
  title: string
  classroomTitle: string
  subjectTitle: string
  mode: string
  startedAt: string | null
  endedAt: string | null
  presentCount: number
  absentCount: number
  rows: readonly SessionExportStudentRow[]
}) {
  const document = await PDFDocument.create()
  const page = document.addPage([595, 842])
  const font = await document.embedFont(StandardFonts.Helvetica)
  const boldFont = await document.embedFont(StandardFonts.HelveticaBold)

  let y = 790
  const lineHeight = 18

  const drawLine = (label: string, value: string, bold = false) => {
    page.drawText(`${label}: ${value}`, {
      x: 48,
      y,
      size: 11,
      font: bold ? boldFont : font,
      color: rgb(0.07, 0.09, 0.15),
    })
    y -= lineHeight
  }

  page.drawText(input.title, {
    x: 48,
    y,
    size: 20,
    font: boldFont,
    color: rgb(0.12, 0.32, 0.86),
  })
  y -= 32

  drawLine("Classroom", input.classroomTitle, true)
  drawLine("Subject", input.subjectTitle)
  drawLine("Mode", input.mode)
  drawLine("Started At", input.startedAt ?? "Not recorded")
  drawLine("Ended At", input.endedAt ?? "Not recorded")
  drawLine("Present Count", String(input.presentCount))
  drawLine("Absent Count", String(input.absentCount))

  y -= 10
  page.drawText("Student Attendance", {
    x: 48,
    y,
    size: 14,
    font: boldFont,
    color: rgb(0.07, 0.09, 0.15),
  })
  y -= 24

  for (const row of input.rows) {
    if (y < 72) {
      break
    }

    page.drawText(`${row.studentDisplayName} (${row.studentEmail})`, {
      x: 48,
      y,
      size: 10,
      font: boldFont,
    })
    y -= 14
    page.drawText(
      `Roll: ${row.studentRollNumber ?? "N/A"}  Status: ${row.attendanceStatus}  Marked At: ${row.markedAt ?? "N/A"}`,
      {
        x: 60,
        y,
        size: 9,
        font,
      },
    )
    y -= 18
  }

  const bytes = await document.save()
  return Buffer.from(bytes)
}
