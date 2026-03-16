import { loadApiEnv } from "@attendease/config"
import { type ExportStorageAdapter, S3ExportStorageAdapter } from "@attendease/export"
import { Injectable } from "@nestjs/common"

@Injectable()
export class ExportStorageService {
  private readonly adapter: ExportStorageAdapter
  private readonly signedUrlTtlSeconds: number

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
  }

  async getDownloadUrl(objectKey: string) {
    return this.adapter.getDownloadUrl({
      objectKey,
      expiresInSeconds: this.signedUrlTtlSeconds,
    })
  }
}
