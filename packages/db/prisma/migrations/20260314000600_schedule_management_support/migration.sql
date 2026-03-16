ALTER TABLE "course_schedule_exceptions"
  ADD CONSTRAINT "course_schedule_exceptions_time_override_check"
  CHECK (
    (
      "startMinutes" IS NULL
      AND "endMinutes" IS NULL
    )
    OR (
      "startMinutes" IS NOT NULL
      AND "endMinutes" IS NOT NULL
      AND "startMinutes" < "endMinutes"
    )
  );

CREATE UNIQUE INDEX "course_schedule_exceptions_one_slot_exception_per_day_idx"
  ON "course_schedule_exceptions" ("courseOfferingId", "scheduleSlotId", "effectiveDate")
  WHERE "scheduleSlotId" IS NOT NULL;

CREATE UNIQUE INDEX "lectures_one_schedule_exception_idx"
  ON "lectures" ("scheduleExceptionId")
  WHERE "scheduleExceptionId" IS NOT NULL;

CREATE UNIQUE INDEX "lectures_one_slot_occurrence_idx"
  ON "lectures" ("courseOfferingId", "lectureDate", "scheduleSlotId")
  WHERE "scheduleSlotId" IS NOT NULL AND "scheduleExceptionId" IS NULL;
