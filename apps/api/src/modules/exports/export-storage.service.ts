import { loadApiEnv } from "@attendease/config"
import { type ExportStorageAdapter, S3ExportStorageAdapter } from "@attendease/export"
import { Injectable } from "@nestjs/common"

@Injectable()
export class ExportStorageService {
  private readonly adapter: ExportStorageAdapter
  private readonly signedUrlTtlSeconds: number
  /**
   * When true, callers must use the inline data-URL fallback path instead of
   * uploading to and reading from S3. Driven by `STORAGE_INLINE_FALLBACK`.
   * Used in deployments without a configured S3-compatible bucket.
   */
  readonly inlineFallbackEnabled: boolean

  constructor() {
    const env = loadApiEnv(process.env)

    this.adapter = new S3ExportStorageAdapter({
      endpoint: env.STORAGE_ENDPOINT,
      publicEndpoint: env.STORAGE_PUBLIC_ENDPOINT ?? env.STORAGE_ENDPOINT,
      region: env.STORAGE_REGION,
      bucket: env.STORAGE_BUCKET,
      accessKeyId: env.STORAGE_ACCESS_KEY,
      secretAccessKey: env.STORAGE_SECRET_KEY,
      forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
    })
    this.signedUrlTtlSeconds = env.STORAGE_SIGNED_URL_TTL_SECONDS
    this.inlineFallbackEnabled = env.STORAGE_INLINE_FALLBACK
  }

  async getDownloadUrl(objectKey: string) {
    return this.adapter.getDownloadUrl({
      objectKey,
      expiresInSeconds: this.signedUrlTtlSeconds,
    })
  }

  async uploadObject(input: {
    objectKey: string
    body: Uint8Array
    contentType: string
  }): Promise<void> {
    await this.adapter.uploadObject(input)
  }

  /**
   * Builds a base64 `data:` URL that can be served directly to the browser
   * without any storage backend. Suitable for files up to a few MB.
   */
  buildInlineDataUrl(input: { body: Uint8Array; contentType: string }): string {
    const base64 = Buffer.from(input.body).toString("base64")
    return `data:${input.contentType};base64,${base64}`
  }
}
