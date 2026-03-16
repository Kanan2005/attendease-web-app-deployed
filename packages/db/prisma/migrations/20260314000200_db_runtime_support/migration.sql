-- CreateIndex
CREATE INDEX "auth_sessions_userId_status_expiresAt_idx"
ON "auth_sessions"("userId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "teacher_assignments_classId_sectionId_subjectId_status_idx"
ON "teacher_assignments"("classId", "sectionId", "subjectId", "status");

-- CreateIndex
CREATE INDEX "course_offerings_status_semesterId_primaryTeacherId_idx"
ON "course_offerings"("status", "semesterId", "primaryTeacherId");

-- CreateIndex
CREATE INDEX "attendance_sessions_teacherAssignmentId_status_startedAt_idx"
ON "attendance_sessions"("teacherAssignmentId", "status", "startedAt");

-- CreateIndex
CREATE INDEX "attendance_records_enrollmentId_sessionId_idx"
ON "attendance_records"("enrollmentId", "sessionId");

-- CreateIndex
CREATE INDEX "attendance_events_deviceId_occurredAt_idx"
ON "attendance_events"("deviceId", "occurredAt");

-- CreateIndex
CREATE INDEX "attendance_events_actorUserId_occurredAt_idx"
ON "attendance_events"("actorUserId", "occurredAt");

-- CreateIndex
CREATE INDEX "email_dispatch_runs_status_dispatchDate_idx"
ON "email_dispatch_runs"("status", "dispatchDate");

-- CreateIndex
CREATE INDEX "user_device_bindings_bindingType_status_userId_idx"
ON "user_device_bindings"("bindingType", "status", "userId");

-- CreateIndex
CREATE INDEX "user_device_bindings_bindingType_status_deviceId_idx"
ON "user_device_bindings"("bindingType", "status", "deviceId");

-- CreateIndex
CREATE INDEX "security_events_courseOfferingId_createdAt_idx"
ON "security_events"("courseOfferingId", "createdAt");

-- CreateIndex
CREATE INDEX "security_events_sessionId_createdAt_idx"
ON "security_events"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "outbox_events_topic_status_availableAt_idx"
ON "outbox_events"("topic", "status", "availableAt");

-- CreateView
CREATE VIEW "report_session_attendance_overview" AS
SELECT
  session.id AS session_id,
  session."courseOfferingId" AS course_offering_id,
  course.code AS course_offering_code,
  course."displayTitle" AS course_offering_title,
  session."teacherAssignmentId" AS teacher_assignment_id,
  session."teacherId" AS teacher_id,
  teacher."displayName" AS teacher_name,
  teacher.email AS teacher_email,
  session.mode AS attendance_mode,
  session.status AS session_status,
  session."startedAt" AS started_at,
  session."endedAt" AS ended_at,
  lecture.id AS lecture_id,
  lecture."lectureDate" AS lecture_date,
  session."rosterSnapshotCount" AS roster_snapshot_count,
  session."presentCount" AS present_count,
  session."absentCount" AS absent_count,
  session."semesterId" AS semester_id,
  semester.code AS semester_code,
  session."classId" AS class_id,
  class.code AS class_code,
  class.title AS class_title,
  session."sectionId" AS section_id,
  section.code AS section_code,
  section.title AS section_title,
  session."subjectId" AS subject_id,
  subject.code AS subject_code,
  subject.title AS subject_title
FROM "attendance_sessions" AS session
JOIN "course_offerings" AS course ON course.id = session."courseOfferingId"
JOIN "users" AS teacher ON teacher.id = session."teacherId"
JOIN "semesters" AS semester ON semester.id = session."semesterId"
JOIN "classes" AS class ON class.id = session."classId"
JOIN "sections" AS section ON section.id = session."sectionId"
JOIN "subjects" AS subject ON subject.id = session."subjectId"
LEFT JOIN "lectures" AS lecture ON lecture.id = session."lectureId";

-- CreateView
CREATE VIEW "report_student_course_attendance_overview" AS
SELECT
  enrollment."courseOfferingId" AS course_offering_id,
  course.code AS course_offering_code,
  course."displayTitle" AS course_offering_title,
  enrollment."studentId" AS student_id,
  student.email AS student_email,
  student."displayName" AS student_name,
  enrollment.status AS enrollment_status,
  COUNT(record.id)::INTEGER AS total_sessions,
  COUNT(record.id) FILTER (WHERE record.status = 'PRESENT')::INTEGER AS present_sessions,
  COUNT(record.id) FILTER (WHERE record.status = 'ABSENT')::INTEGER AS absent_sessions,
  CASE
    WHEN COUNT(record.id) = 0 THEN 0::NUMERIC(5,2)
    ELSE ROUND(
      (
        COUNT(record.id) FILTER (WHERE record.status = 'PRESENT')::NUMERIC
        / COUNT(record.id)::NUMERIC
      ) * 100,
      2
    )
  END AS attendance_percentage,
  MAX(session."startedAt") AS last_session_at
FROM "enrollments" AS enrollment
JOIN "course_offerings" AS course ON course.id = enrollment."courseOfferingId"
JOIN "users" AS student ON student.id = enrollment."studentId"
LEFT JOIN "attendance_records" AS record ON record."enrollmentId" = enrollment.id
LEFT JOIN "attendance_sessions" AS session ON session.id = record."sessionId"
GROUP BY
  enrollment."courseOfferingId",
  course.code,
  course."displayTitle",
  enrollment."studentId",
  student.email,
  student."displayName",
  enrollment.status;
