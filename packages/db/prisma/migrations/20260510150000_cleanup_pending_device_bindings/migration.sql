-- Clean up stale PENDING device bindings from the old replacement-request workflow.
-- The simplified device binding flow no longer creates PENDING bindings.
-- This migration revokes all existing PENDING student attendance bindings.

UPDATE "user_device_bindings"
SET
  "status" = 'REVOKED',
  "revokedAt" = NOW(),
  "revokeReason" = 'Automated cleanup: PENDING replacement workflow removed'
WHERE
  "status" = 'PENDING'
  AND "bindingType" = 'STUDENT_ATTENDANCE';
