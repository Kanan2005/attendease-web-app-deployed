-- DropIndex
DROP INDEX IF EXISTS "attendance_sessions_mode_blePublicId_status_idx";

-- DropIndex
DROP INDEX IF EXISTS "email_dispatch_runs_ruleId_status_dispatchDate_idx";

-- DropIndex
DROP INDEX IF EXISTS "email_logs_ruleId_status_createdAt_idx";

-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "parentEmail" TEXT;

-- RenameIndex (only if old name exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'course_schedule_exceptions_courseOfferingId_exceptionType_effec') THEN
    ALTER INDEX "course_schedule_exceptions_courseOfferingId_exceptionType_effec" RENAME TO "course_schedule_exceptions_courseOfferingId_exceptionType_e_idx";
  END IF;
END $$;
