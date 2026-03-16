ALTER TABLE "security_events"
ADD COLUMN "bindingId" TEXT;

CREATE INDEX "devices_attestationProvider_attestationStatus_idx"
ON "devices"("attestationProvider", "attestationStatus");

CREATE INDEX "security_events_actorUserId_createdAt_idx"
ON "security_events"("actorUserId", "createdAt");

CREATE INDEX "security_events_bindingId_createdAt_idx"
ON "security_events"("bindingId", "createdAt");

CREATE INDEX "admin_action_logs_targetUserId_createdAt_idx"
ON "admin_action_logs"("targetUserId", "createdAt");

CREATE INDEX "admin_action_logs_targetDeviceId_createdAt_idx"
ON "admin_action_logs"("targetDeviceId", "createdAt");

CREATE INDEX "admin_action_logs_targetBindingId_createdAt_idx"
ON "admin_action_logs"("targetBindingId", "createdAt");

ALTER TABLE "security_events"
ADD CONSTRAINT "security_events_bindingId_fkey"
FOREIGN KEY ("bindingId") REFERENCES "user_device_bindings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
