# Data, Rules, and Audit Implementation Notes

Companion to: [`11-data-rules-audit.md`](./11-data-rules-audit.md)

## Timestamp Strategy

Use UTC in the database for all stored timestamps. Store extra timezone metadata only where local schedule or automation timing matters.

## Idempotency Rules

Certain operations must be idempotent or safely retryable:

- refresh token rotation
- session end
- export job processing
- email dispatch runs
- roster import finalization
- announcement notification fan-out
- device revoke actions

Recommended implementation remains unique DB constraints, explicit job-state fields, retry-safe service methods, and outbox rows with status, attempts, and aggregate metadata.

## Indexing Strategy

Important indexes include attendance, classroom, enrollment, assignment, device-binding, security-event, auth-session, and outbox lookup patterns. The runtime-support migrations now also cover query shapes used by current auth, attendance, report, email, and queue-health flows.

## Raw SQL Integrity Rules

The initial migrations include DB-level rules Prisma cannot model cleanly enough for product policy, including:

- one active join code per classroom
- one active student-attendance binding per device
- one active attendance-eligible device per student
- recurring schedule and attendance-session check constraints
- analytics, automation, and outbox check constraints

## Soft Delete Policy

Core academic and attendance records avoid hard deletes because historical accuracy matters.

Reset policy:

- deactivate users when needed
- archive semesters and classrooms instead of deleting them
- inactivate or drop classroom-student membership with status flags
- keep attendance sessions and records immutable except for allowed manual status updates

## Migration Strategy

Use Prisma migrations as the single schema migration path. No manual production drift, feature work with schema impact must ship a migration, and raw SQL inside migrations is allowed when needed for partial indexes and check constraints.

## Shared DB Runtime Helpers

The current `packages/db` runtime layer provides:

- path helpers for schema and migration files
- environment-aware Prisma client creation with optional test-URL preference
- shared transaction wrappers for default and serializable flows
- typed audit and outbox helper builders plus persistence helpers
- report-view naming helpers for repositories and analytics code

## Integrity Review Conclusions

The current schema cleanly supports:

- roster snapshotting through final attendance rows plus session snapshot counters
- manual edits through final-state updates plus append-only manual edit audit trails
- exports through explicit export job and export file entities
- analytics through summary tables plus initial SQL read-model views
- device trust through device records, active-binding constraints, security events, and admin action logs

Important rules intentionally left to service-layer enforcement include manual-edit deadlines, valid session timestamp combinations, counter reconciliation, and deeper classroom-scope consistency checks.

## Naming Conventions

Current naming is intentionally consistent:

- Prisma model names are singular domain nouns
- SQL tables are pluralized through `@@map(...)`
- enums separate closely related concepts instead of sharing one ambiguous status model

One practical Prisma quirk remains: the `OAuthAccount` model surfaces a generated Prisma delegate named `oAuthAccount`.

## Seed Strategy

The deterministic seed flow:

- inserts stable admin, teacher, and student data
- creates semester, class, section, subject, teacher assignments, and course offerings
- creates join codes, schedule slots, lectures, announcements, enrollments, devices, bindings, attendance data, automation data, and outbox rows
- stays idempotent for local development and tests

## Initial Read Models

The runtime-support migration creates these first SQL views:

- `report_session_attendance_overview`
- `report_student_course_attendance_overview`

These views stay derived from canonical attendance state so reporting can start from stable read models.

## Deferred DB Optimizations

The following are intentionally deferred:

- materialized views for heavier reports
- partitioning or archival strategies for high-volume audit/outbox/security tables
- background cleanup for expired exports and historical tokens
- deeper query-plan tuning beyond the current first-pass index set

## Data Retention

V1 retention plan:

- attendance and audit data retained long-term
- export files retained for a limited window
- raw device telemetry retained only when needed for debugging and after privacy review
- stale join codes retained historically but marked inactive
- device-security events retained long enough for support investigation

## Implementation Outcome

When this architecture is complete:

- the database enforces the most important attendance integrity rules
- classroom, semester, schedule, roster, and device-trust data live in a coherent relational model
- events and final state remain aligned
- background processing is reliable and traceable
