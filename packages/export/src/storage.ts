import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export interface ExportStorageAdapter {
  uploadObject(input: {
    objectKey: string
    body: Uint8Array
    contentType: string
  }): Promise<void>
  getDownloadUrl(input: { objectKey: string; expiresInSeconds: number }): Promise<string>
}

export type S3ExportStorageConfig = {
  endpoint: string
  publicEndpoint?: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  forcePathStyle?: boolean
}

export function resolveSignedUrlEndpoint(endpoint: string, publicEndpoint?: string): string {
  return publicEndpoint ?? endpoint
}

function createS3ClientConfig(input: {
  endpoint: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  forcePathStyle: boolean | undefined
}): S3ClientConfig {
  return {
    endpoint: input.endpoint,
    region: input.region,
    forcePathStyle: input.forcePathStyle ?? true,
    credentials: {
      accessKeyId: input.accessKeyId,
      secretAccessKey: input.secretAccessKey,
    },
  }
}

export class S3ExportStorageAdapter implements ExportStorageAdapter {
  private readonly client: S3Client
  private readonly downloadClient: S3Client
  private bucketEnsured = false

  constructor(private readonly config: S3ExportStorageConfig) {
    const clientConfig = createS3ClientConfig({
      endpoint: config.endpoint,
      region: config.region,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      forcePathStyle: config.forcePathStyle,
    })
    const downloadClientConfig = createS3ClientConfig({
      endpoint: resolveSignedUrlEndpoint(config.endpoint, config.publicEndpoint),
      region: config.region,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      forcePathStyle: config.forcePathStyle,
    })

    this.client = new S3Client(clientConfig)
    this.downloadClient = new S3Client(downloadClientConfig)
  }

  async uploadObject(input: {
    objectKey: string
    body: Uint8Array
    contentType: string
  }): Promise<void> {
    await this.ensureBucket()

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: input.objectKey,
        Body: input.body,
        ContentType: input.contentType,
      }),
    )
  }

  async getDownloadUrl(input: { objectKey: string; expiresInSeconds: number }): Promise<string> {
    await this.ensureBucket()

    return getSignedUrl(
      this.downloadClient,
      new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: input.objectKey,
      }),
      {
        expiresIn: input.expiresInSeconds,
      },
    )
  }

  private async ensureBucket() {
    if (this.bucketEnsured) {
      return
    }

    try {
      await this.client.send(
        new HeadBucketCommand({
          Bucket: this.config.bucket,
        }),
      )
    } catch {
      await this.client.send(
        new CreateBucketCommand({
          Bucket: this.config.bucket,
        }),
      )
    }

    this.bucketEnsured = true
  }
}
