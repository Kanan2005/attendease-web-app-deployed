-- Extend AdminActionType enum with values used by the admin panel buildout
-- (Phase 1: Records archive/unarchive; Phase 2: student attendance toggle;
--  Phase 3: communication audience preview; Phase 5: admin invite/remove,
--  academic config, system settings).
-- All values are additive; existing rows are unaffected.

ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'COURSE_OFFERING_ARCHIVE';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'COURSE_OFFERING_UNARCHIVE';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'STUDENT_ATTENDANCE_DISABLE';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'STUDENT_ATTENDANCE_ENABLE';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'COMMUNICATION_AUDIENCE_PREVIEW';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'COMMUNICATION_GMAIL_DISPATCH_PREPARED';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'ADMIN_INVITE';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'ADMIN_ROLE_REVOKE';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'SYSTEM_SETTING_UPDATE';
