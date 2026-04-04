-- DropIndex
DROP INDEX "attendance_sessions_mode_blePublicId_status_idx";

-- DropIndex
DROP INDEX "email_dispatch_runs_ruleId_status_dispatchDate_idx";

-- DropIndex
DROP INDEX "email_logs_ruleId_status_createdAt_idx";

-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN     "parentEmail" TEXT;

-- RenameIndex
ALTER INDEX "course_schedule_exceptions_courseOfferingId_exceptionType_effec" RENAME TO "course_schedule_exceptions_courseOfferingId_exceptionType_e_idx";
