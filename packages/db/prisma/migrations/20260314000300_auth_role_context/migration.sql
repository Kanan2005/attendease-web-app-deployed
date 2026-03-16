ALTER TABLE "auth_sessions"
ADD COLUMN "activeRole" "AppRole" NOT NULL DEFAULT 'STUDENT';

ALTER TABLE "teacher_assignments"
ADD COLUMN "canSelfCreateCourseOffering" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "auth_sessions_activeRole_status_idx"
ON "auth_sessions"("activeRole", "status");
