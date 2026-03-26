# Reports and Export Architecture

Maps to: [`../requirements/09-reports-exports.md`](../requirements/09-reports-exports.md)

## Purpose

This document explains how teacher and student reporting plus teacher-facing exports will be implemented across web, mobile, API, worker, and storage.

## Reset Implementation Snapshot

This reporting and export architecture is now implemented across API, worker, teacher mobile, teacher web, and student mobile.

- clients now consume backend-owned reporting truth instead of client-side attendance rollups
- manual corrections now refresh teacher history, teacher reports, and student self-reports from the same finalized data
- mobile and web export entrypoints now route into the same queued export lifecycle

## Core Design Goals

- keep report numbers consistent with session history
- make exports reliable even for larger time ranges
- support both mobile and web consumers without duplicating reporting logic

## Reporting Architecture Principle

Reports should not be calculated independently on every client. The backend will own all report calculations and expose read-optimized APIs.

This avoids situations where:

- mobile and web percentages differ
- analytics and basic reports disagree
- export files do not match what teachers saw on screen
- student self-view does not match teacher view

## Read Models

The reporting layer should expose dedicated read models built from final `attendance_records`.

Recommended read models:

- `vw_session_summary`
- `vw_daywise_attendance_rollup`
- `vw_subject_attendance_rollup`
- `vw_student_attendance_percentage`
- `vw_student_report_overview`
- `vw_student_subject_report`

These can be implemented as SQL views first and upgraded to materialized tables later if scale requires.

Current Phase 9 reporting backend implementation:

- `report_daywise_attendance_rollup`
- `report_subject_attendance_rollup`
- `report_student_attendance_percentage`
- `report_student_report_overview`

The current implementation uses SQL views for the durable read models plus service-level aggregation for student subject summaries and detail responses.

Phase 8 dependency now implemented:

- shared teacher session history endpoints already read from finalized `attendance_records`
- shared teacher manual-edit saves now also update that finalized attendance truth before reports or exports consume it
- report and export services should reuse the same final attendance truth and edit-window corrected session state rather than rebuilding session totals independently
- optional suspicious-attempt summary fields from session detail remain informational only and must not be mixed into report or export attendance totals

## Basic Report Endpoints

Recommended endpoints:

- `GET /reports/daywise`
- `GET /reports/subjectwise`
- `GET /reports/students/percentages`

Common filters:

- `classId`
- `sectionId`
- `subjectId`
- `from`
- `to`

The API should validate that the requesting teacher is allowed to access the requested academic scope.

Current implementation detail:

- teacher and admin reporting routes now live in `apps/api/src/modules/reports/reports.controller.ts`
- teacher day-wise reads query `report_daywise_attendance_rollup`
- teacher subject-wise reads aggregate `report_daywise_attendance_rollup` so date filters stay accurate
- teacher student-percentage reads use one backend query path that still preserves zero-session enrollments in scope
- teacher student-percentage rows and student self-report detail responses now have direct integration coverage proving they read the same finalized attendance truth for the same student and subject scope
- teacher mobile now reshapes those same report rows into:
  - subject review cards
  - student follow-up cards
  - day-wise trend cards
  without introducing any mobile-only attendance calculations
- teacher web now reshapes those same report rows into one review workspace with:
  - course rollups
  - student follow-up rows
  - day-wise trend rows
  - one shared filter state plus direct handoffs back to session review or forward to exports
- prompt-38 integration coverage now proves one saved manual correction flows through:
  - `GET /sessions`
  - `GET /reports/subjectwise`
  - `GET /reports/students/percentages`
  - `GET /students/me/reports/subjects/:subjectId`
  from the same corrected final attendance truth

## Student Report Endpoints

Students need dedicated self-service report endpoints.

Recommended endpoints:

- `GET /students/me/reports/overview`
- `GET /students/me/reports/subjects`
- `GET /students/me/reports/subjects/:subjectId`
- `GET /students/me/history`

These endpoints must always scope to the authenticated student and never allow arbitrary student IDs.

Current implementation detail:

- student self-report routes now live in `apps/api/src/modules/reports/student-reports.controller.ts`
- student attendance-history reads now live in `apps/api/src/modules/attendance/student-attendance-history.controller.ts`
- overview reads use `report_student_report_overview`
- subject summary and detail reads aggregate `report_student_attendance_percentage`
- history reads shape finalized `attendance_records` into student-owned recent present or absent rows grouped by classroom and subject context
- dropped enrollments are excluded from the current self-report presentation

## Percentage Calculation Source

All percentage calculations must use the same shared helper in `packages/domain`.

Inputs:

- total eligible sessions in scope
- total present sessions in scope

Output:

- normalized percentage value

This same helper should be reused in:

- reports API
- student summary API
- analytics aggregates
- export builders
- notification or low-attendance risk views

Current implementation:

- the shared helper now lives in `packages/domain/src/attendance-percentage.ts`
- report DTO shaping now uses that helper instead of trusting DB-side percentage formatting
- correction review now reuses shared `attendance-edit` helpers for save-copy and review-poll
  timing, so teacher mobile and teacher web stay aligned while reports are being refreshed from the
  same corrected truth

## Report API Implementation

The report service should:

1. resolve teacher scope permissions
2. normalize filter range
3. query the read model
4. transform DB rows into API DTOs
5. return compact payloads tuned for UI rendering

Do not return raw large joined graphs if the UI only needs summary cards and tables.

## Teacher Versus Student Presentation

The same underlying calculations should support two presentation styles:

- teacher-facing views for classroom monitoring, student comparison, and exports
- student-facing views for personal trend, subject breakdown, and low-attendance warning

This should be solved through separate DTOs, not separate percentage logic.

## Export Job Model

Exports should run as asynchronous jobs because:

- PDF generation can be heavy
- larger CSV files may take time
- mobile clients need resumable status instead of one long request

Core tables:

- `export_jobs`
- `export_job_files`

### `export_jobs`

Recommended fields:

- `id`
- `requested_by_user_id`
- `type`
- `status`
- `filters_json`
- `created_at`
- `started_at`
- `completed_at`
- `failed_at`
- `error_message`

## Export Types

V1 should support:

- `SESSION_PDF`
- `SESSION_CSV`
- `STUDENT_PERCENTAGE_CSV`
- `COMPREHENSIVE_ATTENDANCE_CSV`

Optional later export types may include suspicious-attempt logs, but that is not required for the first teacher-facing export set.

## Export Flow

1. teacher submits export request
2. API validates permission and filters
3. API inserts `export_jobs` row
4. worker cycle picks queued export jobs from the database
5. worker fetches data from final `attendance_records` or the reporting read model
6. worker generates file
7. worker uploads file to object storage
8. worker marks job completed and stores file metadata
9. client polls or refreshes status

Current implementation detail:

- API export routes now live in `apps/api/src/modules/exports`
- worker export processor now lives in `apps/worker/src/jobs/export-job.processor.ts`
- v1 uses DB-backed queued jobs consumed by the worker polling loop already present in `apps/worker/src/index.ts`
- BullMQ remains part of the long-term stack direction, but it is not required for the current export-contract surface

## PDF Export Implementation

Session-wise PDF should be rendered from a dedicated template, not from a live screen scrape.

Current implementation:

- session PDF is generated in `packages/export/src/pdf.ts`
- the worker uses `pdf-lib` to create a compact shareable session PDF directly from export data rows

Later optimization:

- if richer branding or pagination becomes necessary, the worker can move to a template-to-PDF renderer without changing the export job API

## CSV Export Implementation

CSV generation should stream rows rather than building giant strings in memory.

Current implementation:

- `packages/export/src/csv.ts` builds the session, student-percentage, and comprehensive CSV files in memory
- the worker uploads the generated buffer to object storage and records checksum, size, and expiry metadata

Later optimization:

- larger time ranges can move to a streaming CSV writer without changing the API contract or job lifecycle tables

## File Delivery

Clients should not directly read local worker files.

Instead:

- worker uploads finished files to object storage
- API returns signed URL or proxied download route
- files can expire after a retention window

Current implementation:

- object storage is S3-compatible and currently wired through `S3ExportStorageAdapter`
- API detail and list responses return signed download URLs for ready files
- file metadata is stored in `export_job_files`
- if `expiresAt` is already in the past, the API now surfaces the file as effectively expired and suppresses signed download URLs even before a cleanup worker updates storage or DB state

## Mobile Export Handling

Mobile app flow:

1. request export
2. poll `GET /exports/:jobId`
3. when ready, open signed file URL through download or share flow

This keeps mobile behavior aligned with web and avoids long request timeouts.

Current implementation detail:

- teacher mobile keeps the export entry point next to the report overview so export remains a
  direct follow-up to review work
- the shared mobile route still opens the ready signed URL rather than recreating a second export
  delivery path

## Web Export Handling

Web app flow:

1. request export
2. show export jobs list with statuses
3. allow retry on failure
4. download when complete

Current implementation:

- teacher web export flow is live in `apps/web/app/(teacher)/teacher/exports/page.tsx`
- teacher mobile export flow is live in `apps/mobile/src/teacher-foundation.tsx`
- both clients reuse the shared auth API client methods for create/list/detail and show queued/processing/completed states

## Code Layout

```text
apps/api/src/modules/reports/
  reports.controller.ts
  student-reports.controller.ts
  reports.service.ts
  reports.models.ts

apps/api/src/modules/exports/
  exports.controller.ts
  exports.service.ts

apps/worker/src/jobs/
  export.processor.ts

packages/export/
  csv/
  pdf/
  file-naming.ts
```

## Testing Strategy

Must include:

- unit tests for percentage calculations
- integration tests for report filters
- integration tests for student self-report endpoints
- export job integration tests
- golden-file tests for PDF structure
- CSV column order tests

Current implementation coverage now includes:

- DB view coverage for the four report read models
- unit tests for report DTO mapping and shared percentage calculation
- integration tests for teacher day-wise, subject-wise, and student-percentage routes
- integration tests for student self-report overview and subject routes
- integration tests for teacher/student/admin access-control boundaries
- integration tests proving teacher and student report views stay aligned to the same finalized attendance truth
- export integration tests for lifecycle filters and expired-file download suppression
- worker tests for export file metadata, retention timestamps, and CSV header structure

## Implementation Outcome

When this architecture is complete:

- teachers see consistent numbers across history, reports, and exports
- students see personal report views that match teacher-visible attendance truth
- exports work from both mobile and web
- large exports do not block live attendance traffic

Current phase outcome:

- reporting backend is live
- export job create/list/detail endpoints are live
- worker-side session PDF, session CSV, student-percentage CSV, and comprehensive CSV generation is live
- signed download delivery is live for teacher web and teacher mobile
- expired export files no longer surface signed download links through the API response layer
