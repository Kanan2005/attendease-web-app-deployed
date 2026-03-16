import { loadWorkerEnv } from "@attendease/config"
import { createPrismaClient, disconnectPrismaClient } from "@attendease/db"
import { ConsoleEmailProviderAdapter, SesEmailProviderAdapter } from "@attendease/email"
import { S3ExportStorageAdapter } from "@attendease/export"
import { createInAppNotificationAdapter } from "@attendease/notifications"

import { WorkerLogger } from "./infrastructure/worker-logger.js"
import { WorkerMonitoring } from "./infrastructure/worker-monitoring.js"
import { AnalyticsRefreshProcessor } from "./jobs/analytics-refresh.processor.js"
import { AnnouncementFanoutProcessor } from "./jobs/announcement-fanout.processor.js"
import { EmailAutomationProcessor } from "./jobs/email-automation.processor.js"
import { ExportJobProcessor } from "./jobs/export-job.processor.js"
import { RosterImportProcessor } from "./jobs/roster-import.processor.js"

const env = loadWorkerEnv(process.env)
const logger = new WorkerLogger(env)
const monitoring = new WorkerMonitoring(env)
const prisma = createPrismaClient({
  databaseUrl: env.DATABASE_URL,
  singleton: false,
})

const exportStorage = new S3ExportStorageAdapter({
  endpoint: env.STORAGE_ENDPOINT,
  region: env.STORAGE_REGION,
  bucket: env.STORAGE_BUCKET,
  accessKeyId: env.STORAGE_ACCESS_KEY,
  secretAccessKey: env.STORAGE_SECRET_KEY,
  forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
})
const emailProvider =
  env.EMAIL_PROVIDER_MODE === "ses"
    ? new SesEmailProviderAdapter({
        region: env.AWS_SES_REGION,
        accessKeyId: env.AWS_SES_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SES_SECRET_ACCESS_KEY,
        ...(env.AWS_SES_ENDPOINT ? { endpoint: env.AWS_SES_ENDPOINT } : {}),
        ...(env.AWS_SES_CONFIGURATION_SET
          ? { configurationSetName: env.AWS_SES_CONFIGURATION_SET }
          : {}),
      })
    : new ConsoleEmailProviderAdapter()
const rosterImportProcessor = new RosterImportProcessor(prisma, {
  stuckProcessingTimeoutMs: env.ROSTER_IMPORT_STUCK_TIMEOUT_MS,
})
const announcementFanoutProcessor = new AnnouncementFanoutProcessor(
  prisma,
  [createInAppNotificationAdapter()],
  {
    stuckProcessingTimeoutMs: env.OUTBOX_STUCK_TIMEOUT_MS,
  },
)
const analyticsRefreshProcessor = new AnalyticsRefreshProcessor(prisma, {
  stuckProcessingTimeoutMs: env.OUTBOX_STUCK_TIMEOUT_MS,
})
const exportJobProcessor = new ExportJobProcessor(
  prisma,
  exportStorage,
  env.EXPORT_FILE_TTL_HOURS,
  {
    stuckProcessingTimeoutMs: env.EXPORT_JOB_STUCK_TIMEOUT_MS,
  },
)
const emailAutomationProcessor = new EmailAutomationProcessor(prisma, emailProvider, {
  environment: env.NODE_ENV,
  fromEmail: env.EMAIL_FROM_ADDRESS,
  replyToEmail: env.EMAIL_REPLY_TO_ADDRESS ?? null,
  stuckDispatchRunTimeoutMs: env.EMAIL_AUTOMATION_STUCK_DISPATCH_TIMEOUT_MS,
})

let cycleRunning = false

async function runWorkerCycle() {
  if (cycleRunning) {
    return
  }

  cycleRunning = true
  const span = monitoring.startSpan("worker.cycle")

  try {
    const [processedImports, processedAnnouncements, processedAnalytics, processedExports] =
      await Promise.all([
        rosterImportProcessor.processPendingJobs(env.ROSTER_IMPORT_BATCH_SIZE),
        announcementFanoutProcessor.processPendingEvents(env.ANNOUNCEMENT_FANOUT_BATCH_SIZE),
        analyticsRefreshProcessor.processPendingEvents(env.ANALYTICS_REFRESH_BATCH_SIZE),
        exportJobProcessor.processQueuedJobs(env.EXPORT_JOB_BATCH_SIZE),
      ])
    const scheduledEmailRuns = env.FEATURE_EMAIL_AUTOMATION_ENABLED
      ? await emailAutomationProcessor.scheduleDueRules(
          new Date(),
          env.EMAIL_AUTOMATION_SCHEDULE_BATCH_SIZE,
        )
      : 0
    const processedEmailRuns = env.FEATURE_EMAIL_AUTOMATION_ENABLED
      ? await emailAutomationProcessor.processQueuedRuns(env.EMAIL_AUTOMATION_PROCESS_BATCH_SIZE)
      : 0

    monitoring.finishSpan(span, {
      "worker.processed_imports": processedImports,
      "worker.processed_announcements": processedAnnouncements,
      "worker.processed_analytics": processedAnalytics,
      "worker.processed_exports": processedExports,
      "worker.scheduled_email_runs": scheduledEmailRuns,
      "worker.processed_email_runs": processedEmailRuns,
    })
    logger.info("worker.cycle.complete", {
      port: env.WORKER_PORT,
      processedImports,
      processedAnnouncements,
      processedAnalytics,
      processedExports,
      scheduledEmailRuns,
      processedEmailRuns,
      featureBluetoothAttendanceEnabled: env.FEATURE_BLUETOOTH_ATTENDANCE_ENABLED,
      featureEmailAutomationEnabled: env.FEATURE_EMAIL_AUTOMATION_ENABLED,
    })
  } catch (error) {
    monitoring.recordException(span, error)
    monitoring.finishSpan(span, {
      "worker.cycle_failed": true,
    })
    logger.error("worker.cycle.failed", error)
  } finally {
    cycleRunning = false
  }
}

const interval = setInterval(() => {
  void runWorkerCycle()
}, env.WORKER_CYCLE_INTERVAL_MS)

void runWorkerCycle()

async function shutdown() {
  clearInterval(interval)
  await disconnectPrismaClient(prisma)
}

process.on("SIGINT", () => {
  void shutdown().finally(() => process.exit(0))
})

process.on("SIGTERM", () => {
  void shutdown().finally(() => process.exit(0))
})

process.on("unhandledRejection", (error) => {
  monitoring.recordException(null, error)
  logger.error("worker.unhandled-rejection", error)
})

process.on("uncaughtException", (error) => {
  monitoring.recordException(null, error)
  logger.error("worker.uncaught-exception", error)
})
