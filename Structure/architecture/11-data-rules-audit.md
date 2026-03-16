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
- initial and follow-up migrations for runtime support, academic management, scheduling, and QR + GPS attendance
- shared DB client, transaction, audit, reporting, seed, and path helpers in `packages/db/src/`
- a development seed entrypoint under `packages/db/src/scripts/seed-dev.ts`
- schema validation tests and a Postgres integrity suite in `packages/db/src/`

## Core Tables

The initial schema includes:

- auth and profile tables such as `users`, `user_credentials`, `user_roles`, `student_profiles`, and `teacher_profiles`
- academic tables such as `academic_terms`, `semesters`, `subjects`, `course_offerings`, `course_schedule_slots`, `course_schedule_exceptions`, and `lectures`
- classroom and roster tables such as `teacher_assignments`, `enrollments`, and `classroom_join_codes`
- communication/import tables such as `announcement_posts`, `announcement_receipts`, `roster_import_jobs`, and `roster_import_rows`
- device and security tables such as `devices`, `user_device_bindings`, `login_events`, and `security_events`
- attendance truth and audit tables such as `attendance_sessions`, `attendance_records`, `attendance_events`, and `attendance_edit_audit_logs`
- admin and background-processing tables such as `admin_action_logs`, `export_jobs`, `export_job_files`, analytics aggregates, automation tables, email logs, and `outbox_events`

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
- one student should have at most one active attendance-eligible binding
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

## Event Versus State Tables

The system keeps both:

- final state table: `attendance_records`
- append-only event table: `attendance_events`

Final state powers history, reports, exports, and analytics. Event tables preserve auditability, debugging, and future forensic analysis.

## Transaction Strategy

Critical operations run inside DB transactions:

- session creation and roster snapshot
- successful attendance mark
- manual edit save
- session end
- classroom join by code
- device bind / revoke flows

This ensures counters, final truth, and audit rows stay aligned.

## Outbox Pattern

The system uses an `outbox_events` table for reliable downstream processing such as analytics refresh, email automation, export follow-up work, and realtime fan-out.

Implemented helper coverage includes shared Prisma client construction, transaction wrappers, and typed audit/outbox persistence helpers.

## Audit Strategy

Audit data stays append-only where possible.

Required audit coverage includes:

- session creation and end
- attendance success
- manual status changes
- export requests
- email runs and sends
- device bind and delink actions
- roster import actions
- classroom join-code resets

Implemented audit/event persistence covers attendance events, manual edit audit rows, security events, admin action logs, email logs, outbox rows, and governance actions for semester archive, classroom archive, and classroom-student removal.

## Locked Reset Delete Semantics

The reset track now treats product-facing destructive actions as safe lifecycle transitions:

- semester delete => `ARCHIVED`
- classroom delete => `ARCHIVED`
- classroom-student remove => enrollment status `DROPPED`
- join-code reset => previous active codes `REVOKED`
- device delink/revoke => binding status `REVOKED`

No product API should hard-delete attendance history, session history, audit tables, export history, email history, security events, or admin action logs.

Implementation notes:

- semester archive writes an `admin_action_logs` row with `SEMESTER_ARCHIVE`
- admin classroom archive writes `CLASSROOM_ARCHIVE`
- admin classroom-student removal writes `CLASSROOM_STUDENT_REMOVE`
- classroom archive is blocked while a live attendance session exists
- classroom-student removal audit metadata links the target classroom, user, and enrollment

Additional timestamp, idempotency, indexing, migration, retention, seed, and optimization notes now live in [`11-data-rules-audit-notes.md`](./11-data-rules-audit-notes.md).
