CREATE INDEX "semesters_status_startDate_endDate_idx"
ON "semesters"("status", "startDate", "endDate");

CREATE INDEX "course_schedule_exceptions_courseOfferingId_exceptionType_effec_idx"
ON "course_schedule_exceptions"("courseOfferingId", "exceptionType", "effectiveDate");

ALTER TABLE "semesters"
ADD CONSTRAINT "semesters_date_window_check"
CHECK (
  "startDate" <= "endDate"
  AND (
    "attendanceCutoffDate" IS NULL
    OR (
      "attendanceCutoffDate" >= "startDate"
      AND "attendanceCutoffDate" <= "endDate"
    )
  )
);

ALTER TABLE "lectures"
ADD CONSTRAINT "lectures_time_window_check"
CHECK (
  (
    ("plannedStartAt" IS NULL AND "plannedEndAt" IS NULL)
    OR (
      "plannedStartAt" IS NOT NULL
      AND "plannedEndAt" IS NOT NULL
      AND "plannedStartAt" < "plannedEndAt"
    )
  )
  AND (
    ("actualStartAt" IS NULL AND "actualEndAt" IS NULL)
    OR (
      "actualStartAt" IS NOT NULL
      AND "actualEndAt" IS NOT NULL
      AND "actualStartAt" < "actualEndAt"
    )
  )
);
