ALTER TABLE "email_dispatch_runs"
ADD COLUMN IF NOT EXISTS "filterSnapshot" JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS "email_dispatch_runs_ruleId_dispatchDate_automated_key"
ON "email_dispatch_runs" ("ruleId", "dispatchDate")
WHERE "triggerType" = 'AUTOMATED';

CREATE UNIQUE INDEX IF NOT EXISTS "email_logs_dispatchRunId_studentId_key"
ON "email_logs" ("dispatchRunId", "studentId")
WHERE "dispatchRunId" IS NOT NULL AND "studentId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "email_dispatch_runs_ruleId_status_dispatchDate_idx"
ON "email_dispatch_runs" ("ruleId", "status", "dispatchDate");

CREATE INDEX IF NOT EXISTS "email_logs_ruleId_status_createdAt_idx"
ON "email_logs" ("ruleId", "status", "createdAt");
