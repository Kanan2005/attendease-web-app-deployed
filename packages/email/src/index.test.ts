import { describe, expect, it, vi } from "vitest"

import {
  ConsoleEmailProviderAdapter,
  SesEmailProviderAdapter,
  buildEmailSubjectPrefix,
  lowAttendanceTemplateId,
  renderLowAttendanceEmail,
} from "./index"

describe("email helpers", () => {
  it("keeps the low-attendance template stable", () => {
    expect(lowAttendanceTemplateId).toBe("low-attendance-reminder")
  })

  it("formats production and non-production prefixes", () => {
    expect(buildEmailSubjectPrefix("production")).toBe("[AttendEase]")
    expect(buildEmailSubjectPrefix("development")).toBe("[AttendEase development]")
  })

  it("renders low-attendance templates with escaped html output", () => {
    const rendered = renderLowAttendanceEmail({
      environment: "development",
      templateSubject: "Attendance below {{thresholdPercent}} for {{classroomTitle}}",
      templateBody: [
        "Hello {{studentName}},",
        "",
        "Your attendance in {{classroomTitle}} is {{attendancePercentage}}.",
      ].join("\n"),
      studentName: "Student <One>",
      classroomTitle: "Maths & Stats",
      subjectTitle: "Mathematics",
      attendancePercentage: 62.5,
      thresholdPercent: 75,
    })

    expect(rendered.subject).toContain("[AttendEase development]")
    expect(rendered.subject).toContain("75.00%")
    expect(rendered.textBody).toContain("Student <One>")
    expect(rendered.htmlBody).toContain("Student &lt;One&gt;")
    expect(rendered.htmlBody).toContain("Maths &amp; Stats")
  })

  it("logs console email sends in local mode", async () => {
    const adapter = new ConsoleEmailProviderAdapter()
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined)

    const result = await adapter.sendEmail({
      fromEmail: "noreply@attendease.dev",
      toEmail: "student@attendease.dev",
      subject: "Attendance reminder",
      textBody: "Hello student",
      htmlBody: "<p>Hello student</p>",
      replyToEmail: "teacher@attendease.dev",
    })

    expect(result.providerMessageId).toContain("console-")
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"message":"email.console-send"'))

    logSpy.mockRestore()
  })

  it("sends through the SES adapter with the provided client", async () => {
    const send = vi.fn().mockResolvedValue({
      MessageId: "ses-message-1",
    })
    const adapter = new SesEmailProviderAdapter(
      {
        region: "ap-south-1",
        accessKeyId: "test-key",
        secretAccessKey: "test-secret",
        configurationSetName: "attendease",
      },
      {
        send,
      },
    )

    const result = await adapter.sendEmail({
      fromEmail: "noreply@attendease.dev",
      toEmail: "student@attendease.dev",
      subject: "Attendance reminder",
      textBody: "Hello student",
      htmlBody: "<p>Hello student</p>",
    })

    expect(result).toEqual({
      providerMessageId: "ses-message-1",
    })
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0]?.[0]).toMatchObject({
      input: expect.objectContaining({
        FromEmailAddress: "noreply@attendease.dev",
        Destination: {
          ToAddresses: ["student@attendease.dev"],
        },
      }),
    })
  })
})
