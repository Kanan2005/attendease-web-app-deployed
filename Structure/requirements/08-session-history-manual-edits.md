# Session History and Manual Edit Requirements

## Purpose

This document defines what is expected from session records, session detail views, and teacher manual attendance editing.

## Reset Implementation Status

The reset session-history and correction workflow is now implemented on teacher mobile and teacher web.

- both clients now use the same correction labels, pending-change wording, and save-result messaging
- both clients keep correction review refreshed while a session is still live or still editable
- duplicate or no-op correction saves now return concise `already aligned` feedback instead of pretending a change happened
- corrected truth now flows into history and reports consistently

## Session History Scope

Session history must be available on:

- teacher web app
- teacher mobile app

## History List Expectations

Each history record must show at minimum:

- session date
- session time
- class
- section
- subject
- present count
- absent count

The attendance mode may be shown, but it is optional in standard history views.

## Filtering Expectations

Teachers should be able to narrow session history using practical filters such as:

- class
- section
- subject
- date range

The exact filter UI may differ between mobile and web.

## Session Detail Expectations

Opening a session must show:

- session summary
- full student list
- attendance status per student
- present and absent counts
- whether manual edit window is open or closed

The current backend foundation now exposes this through shared teacher APIs:

- `GET /sessions`
- `GET /sessions/:sessionId`
- `GET /sessions/:sessionId/students`

The detail payload now includes an explicit editability object so both teacher web and teacher mobile can render the same open or locked state from backend truth.
The detail payload may also include optional suspicious-attempt summary fields for teacher awareness, but those values are informational only and must never change present or absent totals.

The current implementation now also exposes the shared save route:

- `PATCH /sessions/:sessionId/attendance`

## Manual Edit Scope

Manual edits must be available on both teacher web and teacher mobile.

Teachers must be able to:

- add a student to the attendance list
- remove a student from the attendance list

Current implementation detail:

- teacher web and teacher mobile now both save manual edits through the same `PATCH /sessions/:sessionId/attendance` API
- the request targets roster-snapshot rows by `attendanceRecordId`
- normal session and student-list UX still shows only final `PRESENT` or `ABSENT` state, not manual versus automatic labels
- teacher web and teacher mobile must use the same correction language:
  - `Mark present`
  - `Mark absent`
  - `Will save as present`
  - `Will save as absent`
- duplicate or no-op correction saves must return the same `already aligned` result to both teacher
  clients instead of pretending a change happened

## Manual Edit Time Rule

Manual edits are allowed only up to 24 hours after session end.

Expected behavior:

- before 24 hours, edit controls are available
- after 24 hours, the session becomes read-only
- the read-only state should be visible in the UI

## Reporting Rule

Manual edits must be treated as normal attendance in all user-facing outputs.

This means:

- attendance percentage should include manual edits
- reports should not highlight manual versus automatic attendance
- exports should not require a manual flag for normal user-facing use

## Silent Audit Requirement

The system may maintain an internal audit log for:

- who made the manual edit
- when the edit was made
- which student was added or removed

This log does not need to be shown in the main teacher UX unless added later.

## History Immutability Requirement

Session history is not a product-delete surface in reset v1.

- teachers and admins may archive classrooms or remove classroom-student membership
- they must not delete historical attendance sessions or final attendance records from normal product UX
- manual edits change final attendance truth, but they do not erase the fact that the session existed

## Consistency Expectations

Once a manual edit is saved:

- session counts must update
- history totals must stay consistent
- reports and exports must reflect the final data
- optional suspicious-attempt summary fields must remain separate from final attendance truth

The read-model foundation already uses the roster-snapshot `attendance_records` rows plus stored session counters, so later manual edits can update one final attendance truth without rebuilding history from raw events.
The save flow now updates that final truth transactionally, writes audit rows, writes attendance events, refreshes session counters, and returns refreshed session detail plus student rows to both teacher clients.
History rows, session detail, and session-student rows must all reflect that same final attendance truth after the save completes.
Teacher web and teacher mobile must both keep correction review refreshed while the session is still
live or the correction window is still open, so one client does not drift into stale session state
while the other is still showing editable truth.

Teacher-facing UX expectations now also include:

- live sessions still show the current present and absent student lists before the edit window opens
- saved session detail groups students into `Present Students` and `Absent Students`
- quick actions must read as `Mark Present` or `Mark Absent`
- pending changes must be visible before save
- saved-success feedback must confirm the refreshed totals
- locked, missing, or out-of-scope correction errors must stay concise and teacher-facing on both
  mobile and web
- teacher web should keep the history filters, session summary, present list, absent list, and save
  action in one review workspace instead of forcing the teacher into a separate edit tool

## Acceptance Expectations

This area is successful when:

- teachers can review past sessions easily
- teachers can review live marked-student lists before the session ends
- teachers can make corrections within 24 hours
- sessions become read-only after 24 hours
- the final corrected data is used everywhere else in the system
