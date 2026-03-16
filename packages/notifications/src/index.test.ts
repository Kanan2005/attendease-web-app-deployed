import { describe, expect, it } from "vitest"

import {
  type NotificationEnvelope,
  createInAppNotificationAdapter,
  dispatchNotifications,
  notificationChannels,
} from "./index"

describe("notifications package", () => {
  it("keeps the approved notification channels", () => {
    expect(notificationChannels).toEqual(["in-app", "email", "push"])
  })

  it("supports a valid notification envelope shape", () => {
    const envelope: NotificationEnvelope = {
      channel: "email",
      recipientUserId: "student_1",
      recipientEmail: "student.one@attendease.dev",
      title: "Low attendance warning",
      body: "Your attendance has fallen below 75%.",
    }

    expect(envelope.channel).toBe("email")
    expect(envelope.recipientUserId).toBe("student_1")
  })

  it("dispatches through the configured adapters", async () => {
    const adapter = createInAppNotificationAdapter(() => new Date("2026-03-14T10:00:00.000Z"))

    await expect(
      dispatchNotifications(
        [adapter],
        [
          {
            channel: "in-app",
            recipientUserId: "student_1",
            title: "Schedule update",
            body: "Lecture moved to 11 AM.",
          },
        ],
      ),
    ).resolves.toEqual([
      {
        channel: "in-app",
        recipientUserId: "student_1",
        deliveredAt: new Date("2026-03-14T10:00:00.000Z"),
      },
    ])
  })
})
