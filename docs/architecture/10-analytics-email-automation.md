# Analytics and Email Automation Architecture

Maps to: [`../requirements/10-analytics-email-automation.md`](../requirements/10-analytics-email-automation.md)

## Purpose

This document explains how advanced analytics and low-attendance email automation are implemented on the web platform.

## Core Design Goals

- provide fast chart-ready data
- keep analytics consistent with final attendance records
- support manual and scheduled low-attendance emails
- avoid duplicate sends

## Analytics Read Strategy

The analytics dashboard should not compute large trend and distribution datasets on the fly from raw rows for every page load.

Instead, the system should maintain aggregate tables refreshed from attendance events.

Recommended aggregate tables:

- `analytics_daily_attendance`
- `analytics_subject_attendance`
- `analytics_student_course_summary`
- `analytics_mode_usage_daily`

## Aggregate Refresh Triggers

Analytics data must refresh when:

- a session ends
- a manual edit changes final attendance status
- academic mappings are corrected in ways that affect report scope

Implementation pattern:

1. API writes outbox events such as `attendance.session.ended`, `attendance.session.expired`, `attendance.session.edited`, or `analytics.attendance.refresh`
2. worker consumes event
3. worker recomputes affected aggregates only for impacted session scope

This avoids full-table recalculation after every small change.

## Dashboard Data Contracts

The analytics API should return chart-ready payloads such as:

- weekly trend points
- monthly trend points
- distribution buckets
- class comparison cards
- subject comparison cards

Recommended endpoints:

- `GET /analytics/trends`
- `GET /analytics/distribution`
- `GET /analytics/comparisons`
- `GET /analytics/modes`
- `GET /analytics/students/:studentId/timeline`
- `GET /analytics/sessions/:sessionId/detail`

## Filter Handling

All analytics endpoints should accept a normalized filter object:

- class
- section
- subject
- date range

This filter object should be validated once in the API layer and reused across analytics service methods.

Current implementation note:

- the API reuses the same normalized filter shape already used by reporting
- when `classroomId` is supplied, the analytics service resolves that classroom into `classId`, `sectionId`, and `subjectId` so subject-comparison queries stay scoped correctly

## Drill-Down Architecture

Drill-downs do not need their own separate analytics store. They can query:

- session detail read models
- student timeline read models

This keeps deep detail authoritative while summary charts remain pre-aggregated.

## Attendance Distribution Implementation

The distribution chart requires three stable buckets:

- above 90%
- 75% to 90%
- below 75%

The bucketing logic should live in `packages/domain/analytics` so it is not duplicated in:

- API services
- web chart code
- email selection logic

Current implementation note:

- `packages/domain/src/analytics.ts` now owns the bucket logic
- the analytics distribution endpoint intentionally reuses teacher percentage-report truth so date-range filters stay aligned with reporting

## Attendance Mode Analysis

Mode analysis should be sourced from `attendance_sessions.mode` and rolled into `analytics_mode_usage_daily`.

This allows:

- count of QR + GPS sessions
- count of Bluetooth sessions
- trend by mode over time

without scanning the full session table for every dashboard render.

## Email Automation Data Model

Core tables:

- `email_automation_rules`
- `email_dispatch_runs`
- `email_logs`

### `email_automation_rules`

Recommended fields:

- `id`
- `teacher_id`
- `class_id`
- `section_id`
- `subject_id`
- `threshold_percentage`
- `schedule_time_local`
- `timezone`
- `is_active`
- `template_version`
- `created_at`
- `updated_at`

### `email_dispatch_runs`

Stores one execution per rule per day.

Recommended fields:

- `id`
- `rule_id`
- `run_date_local`
- `status`
- `started_at`
- `completed_at`

Unique guard:

- one run per rule per local date

### `email_logs`

Stores recipient-level results:

- `dispatch_run_id`
- `student_id`
- `recipient_email`
- `status`
- `provider_message_id`
- `error_message`

## Manual Email Send Flow

1. teacher selects scope and date range
2. web calls preview endpoint to render email sample
3. teacher confirms send
4. API creates ad hoc dispatch run
5. worker resolves low-attendance recipients
6. worker sends emails and writes logs

Recommended endpoints:

- `POST /automation/email/preview`
- `POST /automation/email/send-manual`

## Automatic Daily Email Flow

1. teacher enables rule and chooses time
2. API stores automation rule
3. scheduler checks due rules every minute
4. worker creates dispatch run if that rule is due and not already run today
5. worker resolves students below threshold
6. worker sends reminder emails
7. logs are stored for teacher review

## Recipient Selection Logic

Recipient selection must use the same percentage rules as reports.

Implementation:

- resolve students in rule scope
- compute current percentage from aggregate or summary table
- include only students below threshold

For v1, threshold is fixed at 75%, but schema should still store threshold per rule to allow future flexibility.

## Duplicate Prevention

Automatic email jobs must not send duplicates for the same student and rule on the same day.

Protection layers:

- unique `dispatch_run` per rule and date
- unique `email_log` per run and student
- idempotent worker processors

## Template Architecture

Email templates should live in `packages/email`.

Needed template inputs:

- student name
- class and subject context
- current percentage
- reminder message

The preview endpoint should render from the same template code used for actual send.

## Code Layout

```text
apps/api/src/modules/analytics/
  analytics.controller.ts
  analytics.models.ts
  analytics.service.ts

apps/api/src/modules/automation/
  automation.controller.ts
  automation.service.ts
  email-preview.service.ts

apps/worker/src/jobs/
  analytics-refresh.processor.ts
  email-automation.processor.ts
  scheduler.ts

packages/email/
  templates/
  providers/
```

## Current Backend Implementation

The analytics backend is now implemented with:

- `apps/api/src/modules/analytics/analytics.controller.ts`
- `apps/api/src/modules/analytics/analytics.service.ts`
- `apps/api/src/modules/analytics/analytics.models.ts`
- `apps/worker/src/jobs/analytics-refresh.processor.ts`
- `packages/contracts/src/analytics.ts`
- `packages/domain/src/analytics.ts`

Current analytics refresh behavior:

- the worker consumes `analytics.attendance.refresh`, `attendance.session.ended`, `attendance.session.expired`, and `attendance.session.edited`
- course-level daily attendance, student-course summaries, and mode-usage rows are recomputed for the impacted course offering
- subject-level comparison rows are recomputed for the impacted semester/class/section/subject scope
- refreshes are idempotent because the worker replaces the affected aggregate rows instead of incrementally patching them

Current drill-down behavior:

- `GET /analytics/students/:studentId/timeline` reads final attendance history directly from `attendance_records` plus session metadata
- `GET /analytics/sessions/:sessionId/detail` reuses the shared session-history detail and student-list services so manual edits and suspicious-attempt summaries stay aligned

## Current Email Automation Implementation

The low-attendance automation slice is now implemented with:

- `apps/api/src/modules/automation/automation.controller.ts`
- `apps/api/src/modules/automation/automation.service.ts`
- `apps/api/src/modules/automation/automation.models.ts`
- `apps/worker/src/jobs/email-automation.processor.ts`
- `packages/contracts/src/automation.ts`
- `packages/domain/src/email-automation.ts`
- `packages/email/src/provider.ts`
- `packages/email/src/templates.ts`
- `apps/web/src/teacher-analytics-automation-client.tsx`

Current automation rule behavior:

- rules are stored in `email_automation_rules` and scoped to one classroom
- teachers can create one active or paused rule per classroom, while admins can inspect broader scope through the same API
- preview and manual-send flows validate classroom ownership through the same assignment-aware scope checks used by reporting

Current dispatch behavior:

- manual sends create `MANUAL` rows in `email_dispatch_runs`
- the worker checks active rules every cycle, schedules one `AUTOMATED` run per due local day and local minute, and updates `lastEvaluatedAt`
- duplicate scheduling is prevented by the unique DB constraint and by the worker’s same-minute evaluation guard
- recipient selection reuses the same final attendance truth and percentage logic already used by reporting
- per-recipient duplicate sending is prevented through `email_logs` uniqueness and idempotent processor behavior
- stale `PROCESSING` dispatch runs are now reclaimed once they pass the timeout window, so worker crashes do not leave email automation permanently stuck

Current template and provider behavior:

- preview rendering and live sends both use `renderLowAttendanceEmail` from `packages/email`
- the worker supports `console` and `ses` provider modes through `loadWorkerEnv`
- SES credentials, endpoint, and configuration-set settings are all driven by env configuration rather than hardcoded client setup
- per-recipient SES send failures are persisted in `email_logs`, and runs move to `FAILED` when every attempted delivery fails
- provider-side bounce/complaint feedback is still a later production hardening step, so `BOUNCED` and `DROPPED` statuses are reserved but not yet driven by a webhook pipeline

Current teacher web behavior:

- `apps/web/app/(teacher)/teacher/analytics/page.tsx` now renders the live analytics workspace
- `apps/web/app/(teacher)/teacher/email-automation/page.tsx` now renders live rule management, manual preview/send, dispatch-run monitoring, and email-log monitoring
- chart and table payloads stay compact because the server prepares summary and drill-down shapes before the browser renders them

## Testing Strategy

Must include:

- analytics aggregate refresh unit/integration coverage
- analytics API contract coverage
- email rule create/update/list scope coverage
- preview rendering coverage using the shared template code
- manual-send and automated-run lifecycle coverage
- duplicate-send prevention coverage at rule/day and run/student levels
- teacher web analytics/email helper coverage for filter and form shaping

- aggregate refresh tests after session change
- chart API tests for filter combinations
- email recipient selection tests
- duplicate-send protection tests
- email preview snapshot tests

Current analytics coverage now includes:

- worker aggregate refresh tests for seeded refresh, ended-session refresh, and manual-edit refresh
- API integration tests for trends, distribution, comparisons, mode usage, student timeline, session drill-down, and teacher/student/admin access boundaries
- shared contract tests for all analytics payloads
- shared domain tests for attendance bucket logic

## Implementation Outcome

When this architecture is complete:

- the teacher web app can render analytics quickly
- low-attendance students are identified using the same rules as reports
- manual and daily automated reminder emails can be sent safely
