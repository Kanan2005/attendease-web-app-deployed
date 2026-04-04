function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function renderTemplateString(template: string, variables: Record<string, string>) {
  return template.replaceAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    return variables[key] ?? ""
  })
}

export type LowAttendanceTemplateInput = {
  environment: string
  templateSubject: string
  templateBody: string
  studentName: string
  classroomTitle: string
  subjectTitle: string
  attendancePercentage: number
  thresholdPercent: number
}

export function renderLowAttendanceEmail(input: LowAttendanceTemplateInput) {
  const variables = {
    studentName: input.studentName,
    classroomTitle: input.classroomTitle,
    subjectTitle: input.subjectTitle,
    attendancePercentage: `${input.attendancePercentage.toFixed(2)}%`,
    thresholdPercent: `${input.thresholdPercent.toFixed(2)}%`,
  }
  const subject = `${buildEmailSubjectPrefix(input.environment)} ${renderTemplateString(
    input.templateSubject,
    variables,
  )}`.trim()
  const textBody = renderTemplateString(input.templateBody, variables)
  const htmlBody = textBody
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("")

  return {
    subject,
    textBody,
    htmlBody: htmlBody.length > 0 ? htmlBody : `<p>${escapeHtml(textBody)}</p>`,
  }
}

export const defaultLowAttendanceTemplateSubject =
  "Attendance below {{thresholdPercent}} for {{classroomTitle}}"
export const defaultLowAttendanceTemplateBody = [
  "Hello {{studentName}},",
  "",
  "Your attendance for {{subjectTitle}} in {{classroomTitle}} is currently {{attendancePercentage}}.",
  "Please improve it above {{thresholdPercent}} and contact your teacher if you need support.",
].join("\n")

export const defaultParentEmailTemplateSubject =
  "Attendance alert for {{studentName}} — {{classroomTitle}}"
export const defaultParentEmailTemplateBody = [
  "Dear Parent/Guardian of {{studentName}},",
  "",
  "We are writing to inform you that {{studentName}}'s attendance for {{subjectTitle}} in {{classroomTitle}} is currently {{attendancePercentage}}, which is below the required threshold of {{thresholdPercent}}.",
  "",
  "Please encourage your ward to attend classes regularly. If you have any concerns, feel free to contact the faculty.",
].join("\n")

export const lowAttendanceTemplateId = "low-attendance-reminder"

export function buildEmailSubjectPrefix(environment: string): string {
  return environment === "production" ? "[AttendEase]" : `[AttendEase ${environment}]`
}
