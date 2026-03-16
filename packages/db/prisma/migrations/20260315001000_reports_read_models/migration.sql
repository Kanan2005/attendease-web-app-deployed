CREATE VIEW "report_daywise_attendance_rollup" AS
SELECT
  COALESCE(lecture."lectureDate", session."startedAt"::date, session."endedAt"::date, session."createdAt"::date) AS attendance_date,
  session."courseOfferingId" AS course_offering_id,
  course.code AS course_offering_code,
  course."displayTitle" AS course_offering_title,
  session."teacherAssignmentId" AS teacher_assignment_id,
  session."teacherId" AS teacher_id,
  session."semesterId" AS semester_id,
  semester.code AS semester_code,
  semester.title AS semester_title,
  session."classId" AS class_id,
  class.code AS class_code,
  class.title AS class_title,
  session."sectionId" AS section_id,
  section.code AS section_code,
  section.title AS section_title,
  session."subjectId" AS subject_id,
  subject.code AS subject_code,
  subject.title AS subject_title,
  COUNT(session.id)::INTEGER AS session_count,
  COALESCE(SUM(session."rosterSnapshotCount"), 0)::INTEGER AS total_students,
  COALESCE(SUM(session."presentCount"), 0)::INTEGER AS present_count,
  COALESCE(SUM(session."absentCount"), 0)::INTEGER AS absent_count,
  MAX(COALESCE(session."endedAt", session."startedAt")) AS last_session_at
FROM "attendance_sessions" AS session
JOIN "course_offerings" AS course ON course.id = session."courseOfferingId"
JOIN "semesters" AS semester ON semester.id = session."semesterId"
JOIN "classes" AS class ON class.id = session."classId"
JOIN "sections" AS section ON section.id = session."sectionId"
JOIN "subjects" AS subject ON subject.id = session."subjectId"
LEFT JOIN "lectures" AS lecture ON lecture.id = session."lectureId"
WHERE session.status IN ('ENDED', 'EXPIRED')
GROUP BY
  attendance_date,
  session."courseOfferingId",
  course.code,
  course."displayTitle",
  session."teacherAssignmentId",
  session."teacherId",
  session."semesterId",
  semester.code,
  semester.title,
  session."classId",
  class.code,
  class.title,
  session."sectionId",
  section.code,
  section.title,
  session."subjectId",
  subject.code,
  subject.title;

CREATE VIEW "report_subject_attendance_rollup" AS
SELECT
  session."courseOfferingId" AS course_offering_id,
  course.code AS course_offering_code,
  course."displayTitle" AS course_offering_title,
  session."teacherAssignmentId" AS teacher_assignment_id,
  session."teacherId" AS teacher_id,
  session."semesterId" AS semester_id,
  semester.code AS semester_code,
  semester.title AS semester_title,
  session."classId" AS class_id,
  class.code AS class_code,
  class.title AS class_title,
  session."sectionId" AS section_id,
  section.code AS section_code,
  section.title AS section_title,
  session."subjectId" AS subject_id,
  subject.code AS subject_code,
  subject.title AS subject_title,
  COUNT(session.id)::INTEGER AS total_sessions,
  COALESCE(SUM(session."rosterSnapshotCount"), 0)::INTEGER AS total_students,
  COALESCE(SUM(session."presentCount"), 0)::INTEGER AS present_count,
  COALESCE(SUM(session."absentCount"), 0)::INTEGER AS absent_count,
  MAX(COALESCE(session."endedAt", session."startedAt")) AS last_session_at
FROM "attendance_sessions" AS session
JOIN "course_offerings" AS course ON course.id = session."courseOfferingId"
JOIN "semesters" AS semester ON semester.id = session."semesterId"
JOIN "classes" AS class ON class.id = session."classId"
JOIN "sections" AS section ON section.id = session."sectionId"
JOIN "subjects" AS subject ON subject.id = session."subjectId"
WHERE session.status IN ('ENDED', 'EXPIRED')
GROUP BY
  session."courseOfferingId",
  course.code,
  course."displayTitle",
  session."teacherAssignmentId",
  session."teacherId",
  session."semesterId",
  semester.code,
  semester.title,
  session."classId",
  class.code,
  class.title,
  session."sectionId",
  section.code,
  section.title,
  session."subjectId",
  subject.code,
  subject.title;

CREATE VIEW "report_student_attendance_percentage" AS
SELECT
  enrollment.id AS enrollment_id,
  enrollment."courseOfferingId" AS course_offering_id,
  course.code AS course_offering_code,
  course."displayTitle" AS course_offering_title,
  course."primaryTeacherId" AS teacher_id,
  enrollment."semesterId" AS semester_id,
  semester.code AS semester_code,
  semester.title AS semester_title,
  enrollment."classId" AS class_id,
  class.code AS class_code,
  class.title AS class_title,
  enrollment."sectionId" AS section_id,
  section.code AS section_code,
  section.title AS section_title,
  enrollment."subjectId" AS subject_id,
  subject.code AS subject_code,
  subject.title AS subject_title,
  enrollment."studentId" AS student_id,
  student.email AS student_email,
  student."displayName" AS student_name,
  student_profile."rollNumber" AS student_roll_number,
  enrollment.status AS enrollment_status,
  COUNT(session.id)::INTEGER AS total_sessions,
  COUNT(session.id) FILTER (WHERE record.status = 'PRESENT')::INTEGER AS present_sessions,
  COUNT(session.id) FILTER (WHERE record.status = 'ABSENT')::INTEGER AS absent_sessions,
  MAX(COALESCE(session."endedAt", session."startedAt")) AS last_session_at
FROM "enrollments" AS enrollment
JOIN "course_offerings" AS course ON course.id = enrollment."courseOfferingId"
JOIN "semesters" AS semester ON semester.id = enrollment."semesterId"
JOIN "classes" AS class ON class.id = enrollment."classId"
JOIN "sections" AS section ON section.id = enrollment."sectionId"
JOIN "subjects" AS subject ON subject.id = enrollment."subjectId"
JOIN "users" AS student ON student.id = enrollment."studentId"
LEFT JOIN "student_profiles" AS student_profile ON student_profile."userId" = student.id
LEFT JOIN "attendance_records" AS record ON record."enrollmentId" = enrollment.id
LEFT JOIN "attendance_sessions" AS session ON session.id = record."sessionId" AND session.status IN ('ENDED', 'EXPIRED')
GROUP BY
  enrollment.id,
  enrollment."courseOfferingId",
  course.code,
  course."displayTitle",
  course."primaryTeacherId",
  enrollment."semesterId",
  semester.code,
  semester.title,
  enrollment."classId",
  class.code,
  class.title,
  enrollment."sectionId",
  section.code,
  section.title,
  enrollment."subjectId",
  subject.code,
  subject.title,
  enrollment."studentId",
  student.email,
  student."displayName",
  student_profile."rollNumber",
  enrollment.status;

CREATE VIEW "report_student_report_overview" AS
SELECT
  report.student_id,
  COUNT(report.course_offering_id)::INTEGER AS tracked_classroom_count,
  COALESCE(SUM(report.total_sessions), 0)::INTEGER AS total_sessions,
  COALESCE(SUM(report.present_sessions), 0)::INTEGER AS present_sessions,
  COALESCE(SUM(report.absent_sessions), 0)::INTEGER AS absent_sessions,
  MAX(report.last_session_at) AS last_session_at
FROM "report_student_attendance_percentage" AS report
WHERE report.enrollment_status <> 'DROPPED'
GROUP BY report.student_id;
