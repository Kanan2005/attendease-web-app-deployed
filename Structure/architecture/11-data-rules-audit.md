# Data, Rules, and Audit Architecture

Maps to: [`../requirements/11-data-rules-audit.md`](../requirements/11-data-rules-audit.md)

## Purpose

This document defines the data architecture, transaction rules, consistency model, and audit strategy for AttendEase.

## Reset Implementation Snapshot

The reset-track data and audit semantics described here are now implemented in the DB schema, service layer, and admin governance surfaces.

- archive/remove semantics are locked and audited
- final attendance truth is preserved for history, reports, exports, and analytics
- admin governance now exposes safe classroom and student lifecycle actions without hard-deleting historical records

## Database Choice

PostgreSQL is the primary system of record because the product needs:

- relational academic data
- strict integrity constraints
- transactional attendance updates
- strong reporting capabilities

## Implemented Foundation

The dedicated data phase now owns a real Prisma-backed DB foundation in `packages/db`, including:

- `prisma/schema.prisma` with auth, academic, classroom, scheduling, attendance, analytics, automation, device, and audit models
- `prisma.config.ts` for Prisma 7 datasource configuration
- an initial migration under `prisma/migrations/20260314000100_initial_data_foundation/`
- a DB runtime-support migration under `prisma/migrations/20260314000200_db_runtime_support/`
- shared DB client, transaction, audit, reporting, seed, and path helpers in `packages/db/src/`
- a development seed entrypoint under `packages/db/src/scripts/seed-dev.ts`
- schema validation tests and a real Postgres integrity suite in `packages/db/src/`

This means later phases can build repositories and services on a stable schema instead of extending a placeholder scaffold.

The academic management phase now extends that DB foundation further with:

- a dedicated migration under `prisma/migrations/20260314000500_academic_management_foundation/`
- semester date-window and lecture time-window check constraints
- additional semester and schedule-exception indexes for the new classroom and lecture APIs
- a follow-up scheduling migration under `prisma/migrations/20260314000600_schedule_management_support/`
- schedule-exception time-override validation
- one slot exception per classroom slot occurrence date
- one lecture per schedule exception and one lecture per recurring slot occurrence date

The QR + GPS attendance phase now extends the same DB foundation further with:

- a dedicated migration under `prisma/migrations/20260314000700_qr_gps_attendance_core/`
- QR session fields such as `editableUntil`, `durationSeconds`, `qrSeed`, `gpsAnchorType`, `gpsAnchorLabel`, and `gpsAnchorResolvedAt`
- a new `AttendanceLocationAnchorType` enum
- an additional session index for active QR/Bluetooth session lookups

## Core Tables

The initial schema should include at minimum:

- `users`
- `user_credentials`
- `user_roles`
- `student_profiles`
- `teacher_profiles`
- `academic_terms`
- `semesters`
- `classes`
- `sections`
- `subjects`
- `course_offerings`
- `classroom_join_codes`
- `course_schedule_slots`
- `course_schedule_exceptions`
- `lectures`
- `teacher_assignments`
- `enrollments`
- `announcement_posts`
- `announcement_receipts`
- `roster_import_jobs`
- `roster_import_rows`
- `devices`
- `user_device_bindings`
- `login_events`
- `security_events`
- `admin_action_logs`
- `attendance_sessions`
- `attendance_records`
- `attendance_events`
- `attendance_edit_audit_logs`
- `export_jobs`
- `export_job_files`
- `analytics_*` aggregate tables
- `email_automation_rules`
- `email_dispatch_runs`
- `email_logs`
- `outbox_events`

## Core Relationship Rules

### Academic Relationships

- one student can have many enrollments
- one teacher can have many assignments
- one assignment links teacher to class, section, subject, and term
- one course offering belongs to one academic term or semester context
- one course offering can have many schedule slots, lectures, announcements, and enrollments
- one course offering can have one active join code and many historical join codes

### Session Relationships

- one session belongs to one teacher assignment context
- one session may optionally reference a planned lecture
- one session has many attendance records
- one attendance record belongs to one student and one session

### Device Relationships

- one device can have many historical user bindings
- one student should have at most one active attendance-eligible binding per install policy
- one binding can be revoked by admin or support action

## Attendance Record Model

The architecture uses one final attendance row per session-student pair.

Why this model:

- absent count is explicit
- history is stable
- duplicates are structurally prevented
- manual edits update final truth without reconstructing state from raw events

Implemented uniqueness:

- unique `(session_id, student_id)` on `attendance_records`
- unique `(student_id, course_offering_id)` on `enrollments`
- unique `(teacher_id, semester_id, class_id, section_id, subject_id)` on `teacher_assignments`

Roster snapshot support is implemented by storing:

- `roster_snapshot_count` on `attendance_sessions`
- one final `attendance_records` row per eligible student in the snapshot
- session-level `present_count` and `absent_count` fields for fast history/report rendering

The DB stores these values cleanly, while counter reconciliation remains a service/repository responsibility.

Phase 8 read-model note:

- shared `GET /sessions`, `GET /sessions/:sessionId`, and `GET /sessions/:sessionId/students` APIs now read directly from this final attendance state so teacher web and teacher mobile already share one stable session-history foundation

## Event Versus State Tables

The system should keep both:

- final state table: `attendance_records`
- append-only event table: `attendance_events`

### Final State Table

Used for:

- history
- reports
- exports
- analytics

### Event Table

Used for:

- auditability
- debugging
- future forensic analysis

Event types may include:

- `AUTO_MARK_QR`
- `AUTO_MARK_BLUETOOTH`
- `MANUAL_MARK_PRESENT`
- `MANUAL_MARK_ABSENT`
- `SESSION_CREATED`
- `SESSION_ENDED`
- `DEVICE_BOUND`
- `DEVICE_REVOKED`
- `JOIN_CODE_USED`
- `ANNOUNCEMENT_POSTED`

## Transaction Strategy

Critical attendance operations must run inside DB transactions:

- session creation and roster snapshot
- successful attendance mark
- manual edit save
- session end
- classroom join by code
- device bind / revoke flows

This ensures:

- counter data is never half-written
- duplicate attendance is prevented even under race conditions
- audit rows stay aligned with final state updates

## Outbox Pattern

The system should use an `outbox_events` table for reliable downstream processing.

Why:

- analytics refresh
- email automation
- export follow-up events
- realtime fan-out

Flow:

1. main transaction updates domain tables
2. same transaction inserts outbox row
3. worker reads unprocessed outbox rows
4. worker performs downstream work
5. worker marks outbox row processed

This is safer than trying to trigger background jobs outside the transaction boundary.

Implemented helper coverage:

- `createPrismaClient`, `getPrismaClient`, and `resolveDatabaseUrl` centralize Prisma client construction
- `runInTransaction` and `runSerializableTransaction` centralize transaction defaults
- typed audit helpers create attendance events, edit trails, security/admin trails, email logs, and outbox rows without duplicating raw input shape logic

The QR + GPS backend core now relies on that transaction layer for:

- session creation plus roster snapshot writes
- session end and auto-expiry
- successful QR attendance marks with counter updates

## Audit Strategy

Audit data should be append-only where possible.

Required audit coverage:

- session creation
- session end
- attendance success
- manual status changes
- export requests
- email runs and sends
- device bind and delink actions
- roster import actions
- classroom join-code resets

Audit data should store:

- actor user ID where relevant
- target entity ID
- previous value where relevant
- new value where relevant
- timestamp

Implemented audit/event persistence currently covers:

- attendance event rows
- manual edit audit rows
- security events
- admin action logs
- email logs
- outbox rows for downstream work
- admin lifecycle actions for semester archive, classroom archive, and classroom-student removal

The QR + GPS phase now adds production use of:

- `SESSION_CREATED`
- `SESSION_ENDED`
- `SESSION_EXPIRED`

Phase 8 now also adds production use of:

- `MANUAL_MARK_PRESENT`
- `MANUAL_MARK_ABSENT`
- aggregate outbox topic `attendance.session.edited`
- `AUTO_MARK_QR`
- `ATTENDANCE_LOCATION_VALIDATION_FAILED` security events for suspicious GPS failures

and outbox topics such as:

- `attendance.session.created`
- `attendance.session.ended`
- `attendance.session.expired`
- `attendance.record.marked`

Current limitation:

- invalid-token QR failures are still rejected without a dedicated `security_events` record

## Locked Reset Delete Semantics

The reset track now treats product-facing destructive actions as safe lifecycle transitions:

- semester delete => `ARCHIVED`
- classroom delete => `ARCHIVED`
- classroom-student remove => enrollment status `DROPPED`
- join-code reset => previous active codes `REVOKED`
- device delink/revoke => binding status `REVOKED`

No product API should hard-delete attendance history, session history, audit tables, export history, email history, security events, or admin action logs.

Implementation notes:

- semester archive now writes an `admin_action_logs` row with `SEMESTER_ARCHIVE`
- admin classroom archive now writes `CLASSROOM_ARCHIVE`
- admin classroom-student removal now writes `CLASSROOM_STUDENT_REMOVE`
- admin classroom archive now also records the governance reason in audit metadata
- admin classroom archive is blocked while a live attendance session exists so attendance truth
  closes before the classroom lifecycle changes
- classroom-student removal audit links use:
  - `targetCourseOfferingId`
  - `targetUserId`
  - `metadata.enrollmentId`
- semester archive currently stores the semester identifier in admin-action metadata rather than a dedicated semester foreign key

## Timestamp Strategy

Use UTC in the database for all stored timestamps.

Store additional timezone metadata where local schedule matters, especially:

- email automation rules
- reporting presets if later needed

## Idempotency Rules

Certain operations must be idempotent or safely retryable:

- refresh token rotation
- session end
- export job processing
- email dispatch runs
- roster import finalization
- announcement notification fan-out
- device revoke actions

Recommended implementation:

- unique DB constraints
- explicit job state fields
- retry-safe service methods
- outbox rows with status, attempt count, lock timestamps, and aggregate metadata

## Indexing Strategy

Important indexes include:

- `attendance_records(session_id, status)`
- `attendance_records(student_id, status)`
- `attendance_sessions(teacher_id, started_at)`
- `attendance_sessions(class_id, section_id, subject_id, started_at)`
- `course_offerings(semester_id, subject_id, class_id, section_id)`
- `classroom_join_codes(course_offering_id, status)` plus a partial unique index for one active code per classroom
- `enrollments(student_id, status)`
- `teacher_assignments(teacher_id)`
- `user_device_bindings(user_id, status)`
- `user_device_bindings(device_id, status)`
- `security_events(user_id, created_at)`
- `email_automation_rules(course_offering_id, status, schedule_hour_local, schedule_minute_local)`

Indexes should be reviewed with real query plans once the first report queries exist.

Implemented runtime-support indexes now also include:

- `auth_sessions(user_id, status, expires_at)`
- `teacher_assignments(class_id, section_id, subject_id, status)`
- `course_offerings(status, semester_id, primary_teacher_id)`
- `attendance_sessions(teacher_assignment_id, status, started_at)`
- `attendance_records(enrollment_id, session_id)`
- `attendance_events(device_id, occurred_at)`
- `attendance_events(actor_user_id, occurred_at)`
- `email_dispatch_runs(status, dispatch_date)`
- `user_device_bindings(binding_type, status, user_id)`
- `user_device_bindings(binding_type, status, device_id)`
- `security_events(course_offering_id, created_at)`
- `security_events(session_id, created_at)`
- `outbox_events(topic, status, available_at)`

## Raw SQL Integrity Rules

The initial migration also includes DB-level constraints that Prisma cannot model directly enough for our policy needs:

- partial unique index for one active join code per classroom
- partial unique index for one active student-attendance binding per device
- partial unique index for one active attendance-eligible device per student
- check constraints for recurring schedule windows
- check constraints for attendance-session numeric values
- check constraints for analytics percentages, automation schedule values, and outbox attempt counts

## Soft Delete Policy

Core academic and attendance records should avoid hard deletes because historical accuracy matters.

Reset policy:

- deactivate users when needed
- archive semesters and classrooms instead of deleting them
- inactivate or drop classroom-student membership with status flags
- keep attendance sessions and records immutable except for allowed manual status updates

Retention-sensitive timestamp/status fields already present in the schema include:

- `expiresAt`, `revokedAt`, and `revokedByUserId` on trust/security-related records
- `failedAt`, `completedAt`, and `expiresAt` on export/email processing records
- `archivedAt` on course offerings
- `droppedAt` on enrollments

The schema is intentionally ready for future retention jobs without coupling that cleanup logic into this phase.

## Migration Strategy

Use Prisma migrations as the single schema migration path.

Rules:

- no manual production schema drift
- each new feature with schema impact must include migration
- seed scripts must be separate from migrations
- raw SQL inside migrations is allowed when needed for partial indexes and check constraints that Prisma cannot express directly

## Shared DB Runtime Helpers

The current `packages/db` runtime layer now provides:

- path helpers for schema and migration files
- environment-aware Prisma client creation with optional test-URL preference
- shared transaction wrappers for default and serializable flows
- typed audit and outbox helper builders plus persistence helpers
- report-view name helpers for later repository and analytics code

This keeps later API and worker phases from re-implementing low-level DB wiring.

## Integrity Review Conclusions

After the final phase-11 review, the current schema supports these areas cleanly:

- roster snapshotting through final attendance rows plus session snapshot counters
- manual edits through final-state updates plus append-only manual edit audit trails
- exports through explicit export job and export file entities with uniqueness and expiry-ready fields
- analytics through summary tables plus initial SQL read-model views
- device trust through device records, active-binding constraints, security events, and admin action logs

Important rules intentionally left to service-layer enforcement:

- manual-edit deadline checks
- ensuring active/ended sessions always have the right timestamp combinations
- validating that session counters always match recomputed record totals
- validating deeper classroom-scope consistency across all related foreign keys in complex workflows

## Naming Conventions

Current naming is intentionally consistent:

- Prisma model names are singular domain nouns
- SQL tables are pluralized through `@@map(...)`
- enums separate closely related concepts such as `AttendanceMode` versus `AttendanceMarkSource`
- status enums are explicit per domain area instead of being shared too broadly

One practical Prisma quirk remains: the `OAuthAccount` model surfaces a generated Prisma delegate named `oAuthAccount`.

## Seed Strategy

The data phase now includes a deterministic development seed flow.

Seed behavior:

- inserts a stable admin, teacher, and student dataset
- creates semester, class, section, subject, teacher assignments, and course offerings
- creates join codes, schedule slots, lectures, announcements, enrollments, devices, bindings, attendance data, automation data, and outbox rows
- is idempotent so later phases can rerun it during local development and tests

The seed script is intentionally separate from migrations and is safe to build later auth and academic flows against.

## Initial Read Models

The runtime-support migration creates these first SQL views:

- `report_session_attendance_overview`
- `report_student_course_attendance_overview`

These views are intentionally simple and derived directly from canonical attendance state so later reporting phases can start from stable read models before deciding whether materialized views or rollup tables are needed.

## Deferred DB Optimizations

The following optimizations are intentionally deferred until real query patterns exist:

- materialized views instead of plain SQL views for heavier reports
- partitioning or archival strategies for high-volume audit/outbox/security tables
- background cleanup for expired exports and historical tokens
- query-plan tuning beyond the current first-pass index set

## Data Retention

V1 retention plan:

- attendance and audit data retained long-term
- export files retained for a limited window
- raw device telemetry retained only if needed for debugging and with privacy review
- stale join codes retained historically but marked inactive
- device-security events retained long enough for support investigation

## Implementation Outcome

When this architecture is complete:

- the database enforces the most important attendance integrity rules
- classroom, semester, schedule, roster, and device-trust data live in a coherent relational model
- events and final state remain aligned
- background processing is reliable and traceable
