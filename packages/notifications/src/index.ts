export const notificationChannels = ["in-app", "email", "push"] as const

export type NotificationChannel = (typeof notificationChannels)[number]

export interface NotificationEnvelope {
  channel: NotificationChannel
  recipientUserId: string
  recipientEmail?: string | null
  title: string
  body: string
  metadata?: Record<string, unknown>
}

export interface NotificationDispatchResult {
  channel: NotificationChannel
  recipientUserId: string
  deliveredAt: Date | null
}

export interface NotificationAdapter {
  readonly channel: NotificationChannel
  send(envelope: NotificationEnvelope): Promise<NotificationDispatchResult>
}

export async function dispatchNotifications(
  adapters: readonly NotificationAdapter[],
  envelopes: readonly NotificationEnvelope[],
): Promise<NotificationDispatchResult[]> {
  const adapterMap = new Map(adapters.map((adapter) => [adapter.channel, adapter]))
  const results: NotificationDispatchResult[] = []

  for (const envelope of envelopes) {
    const adapter = adapterMap.get(envelope.channel)

    if (!adapter) {
      continue
    }

    results.push(await adapter.send(envelope))
  }

  return results
}

export function createInAppNotificationAdapter(
  clock: () => Date = () => new Date(),
): NotificationAdapter {
  return {
    channel: "in-app",
    async send(envelope) {
      return {
        channel: envelope.channel,
        recipientUserId: envelope.recipientUserId,
        deliveredAt: clock(),
      }
    },
  }
}
