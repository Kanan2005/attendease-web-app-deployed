# Session History and Manual Edit Architecture

Maps to: [`../requirements/08-session-history-manual-edits.md`](../requirements/08-session-history-manual-edits.md)

## Purpose

This document explains how session history, session detail, and manual attendance editing will be implemented.

## Reset Implementation Snapshot

This history and correction architecture is now implemented in the shared teacher APIs plus teacher mobile and teacher web clients.

- teacher mobile and teacher web now share correction labels, polling rules, and save-result messaging
- duplicate/no-op correction saves now skip audit and realtime churn while still returning refreshed truth
- corrected final attendance truth now propagates consistently into history, reports, and student self-report detail

## Core Design Choice

History, reports, and exports will all read from the same finalized attendance dataset. To make that stable, each session will snapshot its roster at creation time and maintain one final attendance row per student in the session.

This is the key architecture decision that keeps the whole system consistent.

## Data Model

### `attendance_sessions`

Stores session-level metadata such as:

- teacher
- class
- section
- subject
- mode
- start and end timestamps
- editable window

The QR + GPS and Bluetooth backends already write `editableUntil` on manual end and timed expiry, and the live manual-edit API now reuses that same stored session lock boundary instead of recalculating it.

### `attendance_records`

One row per eligible student in the session.

Recommended fields:

- `id`
- `session_id`
- `student_id`
- `status` with values `ABSENT` or `PRESENT`
- `marked_at`
- `marked_via` with values like `QR_GPS`, `BLUETOOTH`, `MANUAL`
- `updated_at`

This model makes absent counts cheap and deterministic because every eligible student already has a row.

The QR + GPS backend core already uses this model in production code by snapshotting active enrollments into `attendance_records` at session creation time with default `ABSENT` state.

### `attendance_edit_audit_logs`

Stores manual edit events:

- `id`
- `session_id`
- `student_id`
- `edited_by_teacher_id`
- `before_status`
- `after_status`
- `edited_at`

## Why Snapshot Roster At Session Start

If we do not snapshot the roster, absent counts can drift when:

- a student changes section later
- an enrollment is removed later
- a subject assignment changes later

By snapshotting:

- history remains historically accurate
- manual edits operate on a stable student list
- exports and analytics stay consistent

This is no longer only a design choice. The QR session creation transaction already does this today.

## Session List Read Model

Teacher history list needs a compact query result, not a huge joined object graph.

Create a read model query that returns:

- session ID
- date and time
- class, section, subject labels
- mode
- present count
- absent count
- editability flag

This can be implemented as:

- optimized SQL query
- or a database view such as `vw_session_history_summary`

Current implementation:

- `apps/api/src/modules/attendance/attendance-history.controller.ts`
- `apps/api/src/modules/attendance/attendance-history.service.ts`
- `packages/contracts/src/attendance.ts`

The live `GET /sessions` route currently returns compact history rows with:

- classroom labels
- lecture labels when linked
- present and absent counts
- backend-derived editability state

## Session Detail Read Model

Session detail needs:

- session metadata
- summary counts
- full student list
- per-student status
- edit window state
- optional suspicious-attempt summary such as blocked or proxy-risk events

Recommended API endpoints:

- `GET /sessions`
- `GET /sessions/:id`
- `GET /sessions/:id/students`

Current implementation detail:

- `GET /sessions/:id` now returns an expanded session-detail DTO that extends the existing session summary used by live QR and Bluetooth polling routes
- `GET /sessions/:id/students` reads directly from `attendance_records` plus student profile data so teacher web and teacher mobile can share one final roster view

## Suspicious Attempt Metrics

If the product wants to display cards like `Proxies Detected`, those numbers should come from `security_events`, not from mutating attendance truth.

Recommended derived fields:

- `blocked_attempt_count`
- `untrusted_device_attempt_count`
- `invalid_qr_or_ble_attempt_count`

These values are useful for teacher insight, but they must remain informational and separate from the final present or absent roster.

Current implementation:

- session detail now returns informational counts for:
  - blocked untrusted-device attempts
  - location validation failures
  - Bluetooth validation failures
  - revoked-device attempts
- these counts are aggregated from attendance-risk `security_events` only and do not alter `attendance_records`

## Edit Window Enforcement

The 24-hour rule must be enforced in backend service code and never only in UI.

Implementation:

- `editable_until = ended_at + 24h`
- session detail response includes `is_editable`
- manual edit service rejects updates after `editable_until`

Current dependency from the QR phase:

- `POST /sessions/:sessionId/end` already sets `editableUntil`
- timed-out QR sessions also become `EXPIRED` with `editableUntil` set
- Phase 8 should reuse this stored window rather than invent a second edit-lock rule

Current implementation:

- `AttendanceHistoryService` now derives `editability` from `endedAt` and `editableUntil`
- the shared `GET /sessions/:id` route reuses the QR attendance service read path so overdue active QR and Bluetooth sessions still auto-expire before detail responses are returned

## Manual Edit API Design

Recommended endpoint:

- `PATCH /sessions/:id/attendance`

Request payload:

```json
{
  "changes": [
    {
      "attendanceRecordId": "record_1",
      "status": "PRESENT"
    },
    {
      "attendanceRecordId": "record_2",
      "status": "ABSENT"
    }
  ]
}
```

## Manual Edit Transaction Flow

For each request:

1. verify teacher can manage the session
2. verify session is still editable
3. load targeted attendance records
4. update changed rows only
5. insert audit log rows for changed statuses
6. recompute and persist final present/absent counters
7. insert outbox event for aggregate refresh
8. return refreshed session detail plus refreshed student rows

This must happen in one transaction.

Current implementation:

- `AttendanceHistoryController` now exposes `PATCH /sessions/:sessionId/attendance`
- `AttendanceHistoryService` executes the save path inside a serializable DB transaction
- changed rows write:
  - `attendance_records` final-status updates
  - `attendance_edit_audit_logs`
  - `attendance_events` with `MANUAL_MARK_PRESENT` or `MANUAL_MARK_ABSENT`
  - one aggregate `attendance.session.edited` outbox row when at least one change is applied
- successful saves also publish refreshed session counters through `AttendanceRealtimeService`
- duplicate or no-op saves now skip:
  - audit-row writes
  - `attendance.session.edited` outbox writes
  - realtime counter publishes
  while still returning refreshed session detail plus refreshed student rows

## Reporting Rule Implementation

The product requirement says manual edits are treated as normal attendance and are not specially exposed in UX.

Implementation consequence:

- reports read only final `status`
- exports read only final `status`
- UI shows only present or absent

Internal systems may still inspect `marked_via` or audit log rows when needed.

## Cross-Platform Consistency

Teacher web and teacher mobile should use the same session detail API and same manual edit API.

Only the UI differs:

- web can show a wider table
- mobile shows grouped `Present Students` and `Absent Students` sections with one-tap toggles
- mobile keeps corrections disabled while a session is active, but it still shows the live roster

The business logic must not fork.

Current implementation detail:

- `packages/domain/src/attendance-edit.ts` now owns the shared correction-review helpers used by
  both teacher clients for:
  - action labels
  - pending-change labels
  - saved-success copy
  - review polling while a session is still live or still editable

## Caching Strategy

History and detail queries should be cached at the API and client levels only briefly because manual edits can change results.

Recommended client behavior:

- invalidate session detail after edit save
- invalidate session history after edit save
- invalidate reports related to the same teacher filter scope

Current mobile behavior now follows that rule by:

- rebuilding its draft from refreshed session-student rows after save
- clearing pending changes after the API returns updated student rows
- keeping session detail polling short while the session is active, then relying on normal refetches
- consuming the same live session-status truth used by student discovery, teacher-mobile live
  Bluetooth, and teacher-web live QR so correction screens do not reopen stale live sessions

Current web behavior now follows that rule by:

- rebuilding the selected session review draft from refreshed session-student rows after save
- updating the selected session detail and session-student caches immediately from the save response
- invalidating teacher session-history query keys after save
- invalidating teacher-web report query keys after save so session review and report outputs stay
  aligned to the same corrected final truth
  after the session ends
- polling session detail and session-student rows while the selected session is still live or still
  editable, so the review screen does not drift across the live-to-ended-to-locked boundary

## Code Layout

```text
apps/api/src/modules/attendance/
  attendance-history.controller.ts
  attendance-history.service.ts
  attendance-history.models.ts

apps/web/app/(teacher)/teacher/sessions/history/page.tsx
apps/web/src/teacher-workflows-client.tsx

apps/mobile/app/(teacher)/sessions/index.tsx
apps/mobile/app/(teacher)/sessions/[sessionId].tsx
apps/mobile/src/teacher-foundation.tsx
```

## Testing Strategy

Must include:

- integration tests for editable and locked sessions
- integration tests for manual add and manual remove flows
- tests that verify reports reflect edited final state
- tests that verify audit log rows are created only when status actually changes

Current implementation coverage:

- `apps/api/src/modules/attendance/attendance-history.models.test.ts`
- `apps/api/src/modules/attendance/attendance-history.integration.test.ts`
- `packages/auth/src/client.test.ts`
- current review coverage now explicitly proves:
  - editable versus locked session behavior
  - manual add and manual remove flows
  - duplicate/no-op manual save behavior
  - history, detail, and student-list consistency after edits
  - suspicious-attempt summary fields stay separate from final attendance truth

## Implementation Outcome

When this architecture is complete:

- teachers can reliably review session history
- corrections are possible for 24 hours
- all downstream data uses the corrected final attendance state
