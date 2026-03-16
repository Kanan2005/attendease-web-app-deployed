import { SESv2Client, type SESv2ClientConfig, SendEmailCommand } from "@aws-sdk/client-sesv2"

export interface EmailProviderAdapter {
  sendEmail(input: {
    fromEmail: string
    toEmail: string
    subject: string
    textBody: string
    htmlBody: string
    replyToEmail?: string | null
  }): Promise<{ providerMessageId: string | null }>
}

export type SesEmailProviderConfig = {
  region: string
  accessKeyId: string
  secretAccessKey: string
  configurationSetName?: string
  endpoint?: string
}

function formatEmailLogEntry(input: {
  timestamp: string
  level: "info"
  service: "worker"
  message: string
  metadata: Record<string, unknown>
}) {
  return JSON.stringify(input)
}

export class SesEmailProviderAdapter implements EmailProviderAdapter {
  private readonly client: SESv2Client

  constructor(
    private readonly config: SesEmailProviderConfig,
    client?: Pick<SESv2Client, "send">,
  ) {
    const clientConfig: SESv2ClientConfig = {
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      ...(config.endpoint ? { endpoint: config.endpoint } : {}),
    }

    this.client = (client as SESv2Client | undefined) ?? new SESv2Client(clientConfig)
  }

  async sendEmail(input: {
    fromEmail: string
    toEmail: string
    subject: string
    textBody: string
    htmlBody: string
    replyToEmail?: string | null
  }) {
    const response = await this.client.send(
      new SendEmailCommand({
        FromEmailAddress: input.fromEmail,
        Destination: {
          ToAddresses: [input.toEmail],
        },
        Content: {
          Simple: {
            Subject: {
              Data: input.subject,
              Charset: "UTF-8",
            },
            Body: {
              Text: {
                Data: input.textBody,
                Charset: "UTF-8",
              },
              Html: {
                Data: input.htmlBody,
                Charset: "UTF-8",
              },
            },
          },
        },
        ...(input.replyToEmail ? { ReplyToAddresses: [input.replyToEmail] } : {}),
        ...(this.config.configurationSetName
          ? { ConfigurationSetName: this.config.configurationSetName }
          : {}),
      }),
    )

    return {
      providerMessageId: response.MessageId ?? null,
    }
  }
}

export class ConsoleEmailProviderAdapter implements EmailProviderAdapter {
  async sendEmail(input: {
    fromEmail: string
    toEmail: string
    subject: string
    textBody: string
    htmlBody: string
    replyToEmail?: string | null
  }) {
    console.log(
      formatEmailLogEntry({
        timestamp: new Date().toISOString(),
        level: "info",
        service: "worker",
        message: "email.console-send",
        metadata: {
          toEmail: input.toEmail,
          subject: input.subject,
          replyToEmail: input.replyToEmail ?? null,
        },
      }),
    )

    return {
      providerMessageId: `console-${Date.now()}`,
    }
  }
}
