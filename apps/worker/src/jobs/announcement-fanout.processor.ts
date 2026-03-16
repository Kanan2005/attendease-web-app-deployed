import type { createPrismaClient } from "@attendease/db"
import {
  type NotificationAdapter,
  createInAppNotificationAdapter,
  dispatchNotifications,
} from "@attendease/notifications"

type WorkerPrismaClient = ReturnType<typeof createPrismaClient>

function toDbNotificationChannel(channel: "in-app" | "email" | "push") {
  switch (channel) {
    case "in-app":
      return "IN_APP" as const
    case "email":
      return "EMAIL" as const
    case "push":
      return "PUSH" as const
  }
}

export class AnnouncementFanoutProcessor {
  private readonly adapters: readonly NotificationAdapter[]

  constructor(
    private readonly prisma: WorkerPrismaClient,
    adapters: readonly NotificationAdapter[] = [createInAppNotificationAdapter()],
    private readonly options: {
      stuckProcessingTimeoutMs?: number
    } = {},
  ) {
    this.adapters = adapters
  }

  async processPendingEvents(limit = 20, now = new Date()): Promise<number> {
    const staleProcessingCutoff = new Date(
      now.getTime() - (this.options.stuckProcessingTimeoutMs ?? 15 * 60 * 1000),
    )
    const events = await this.prisma.outboxEvent.findMany({
      where: {
        topic: "classroom.announcement.posted",
        OR: [
          {
            status: "PENDING",
          },
          {
            status: "PROCESSING",
            OR: [
              {
                lockedAt: null,
              },
              {
                lockedAt: {
                  lte: staleProcessingCutoff,
                },
              },
            ],
          },
        ],
      },
      orderBy: {
        createdAt: "asc",
      },
      take: limit,
    })

    for (const event of events) {
      await this.processEvent(event.id)
    }

    return events.length
  }

  async processEvent(outboxEventId: string) {
    const event = await this.prisma.outboxEvent.findUnique({
      where: {
        id: outboxEventId,
      },
    })

    if (!event || event.topic !== "classroom.announcement.posted" || event.status === "PROCESSED") {
      return null
    }

    await this.prisma.outboxEvent.update({
      where: {
        id: event.id,
      },
      data: {
        status: "PROCESSING",
        lockedAt: new Date(),
        attemptCount: {
          increment: 1,
        },
        lastError: null,
      },
    })

    try {
      const payload = event.payload as {
        announcementId?: string
      }

      if (!payload.announcementId) {
        throw new Error("Announcement outbox payload is missing announcementId.")
      }

      const announcement = await this.prisma.announcementPost.findUnique({
        where: {
          id: payload.announcementId,
        },
      })

      if (!announcement) {
        throw new Error("Announcement post no longer exists.")
      }

      if (!announcement.shouldNotify) {
        await this.markProcessed(event.id)
        return announcement
      }

      const recipients =
        announcement.visibility === "STUDENT_AND_TEACHER"
          ? await this.prisma.enrollment.findMany({
              where: {
                courseOfferingId: announcement.courseOfferingId,
                status: {
                  in: ["ACTIVE", "PENDING"],
                },
              },
              include: {
                student: {
                  select: {
                    id: true,
                    email: true,
                  },
                },
              },
            })
          : []

      const notifications = recipients.map((recipient) => ({
        channel: "in-app" as const,
        recipientUserId: recipient.student.id,
        recipientEmail: recipient.student.email,
        title: announcement.title ?? "Classroom update",
        body: announcement.body,
        metadata: {
          announcementId: announcement.id,
          classroomId: announcement.courseOfferingId,
        },
      }))

      const results = await dispatchNotifications(this.adapters, notifications)

      for (const result of results) {
        await this.prisma.announcementReceipt.upsert({
          where: {
            announcementPostId_userId_channel: {
              announcementPostId: announcement.id,
              userId: result.recipientUserId,
              channel: toDbNotificationChannel(result.channel),
            },
          },
          update: {
            deliveredAt: result.deliveredAt,
          },
          create: {
            announcementPostId: announcement.id,
            userId: result.recipientUserId,
            channel: toDbNotificationChannel(result.channel),
            deliveredAt: result.deliveredAt,
          },
        })
      }

      await this.markProcessed(event.id)

      return announcement
    } catch (error) {
      await this.prisma.outboxEvent.update({
        where: {
          id: event.id,
        },
        data: {
          status: "FAILED",
          lastError: error instanceof Error ? error.message : "Announcement fanout failed.",
        },
      })

      throw error
    }
  }

  private async markProcessed(outboxEventId: string) {
    await this.prisma.outboxEvent.update({
      where: {
        id: outboxEventId,
      },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
        lockedAt: null,
        lastError: null,
      },
    })
  }
}
