# Reports and Export Requirements

## Purpose

This document defines what is expected from shared reporting and export features.

## Reset Implementation Status

The reset reporting and export story is now implemented across teacher mobile, teacher web, student mobile, API, and worker flows.

- teacher mobile and teacher web both render backend-owned report truth instead of local fallback calculations
- student self-reports and student attendance history now read the same finalized attendance truth
- manual corrections now refresh teacher history, teacher reports, and student self-reports consistently
- export job creation, status tracking, and ready-file access are live, with comprehensive CSV remaining web-only

## Scope

Basic reports and exports must be available on:

- teacher web app
- teacher mobile app

Comprehensive exports are web-only.

## Basic Report Expectations

The system must provide:

- day-wise attendance rollups
- subject-wise attendance rollups
- per-student attendance percentage in a basic report view
- student self-report overview
- student subject-wise self-report breakdown

## Report Behavior Expectations

Reports should:

- use finalized attendance data including manual edits
- support teacher-relevant filters
- be easy to read on both desktop and mobile
- keep suspicious-attempt signals informational only and separate from attendance truth
- refresh from corrected session truth consistently after a teacher saves a manual add or remove
  attendance action on either mobile or web

Teacher-mobile report presentation should keep three review questions obvious:

- which classroom or subject is performing well or poorly
- which students need follow-up
- whether the teacher should stay in review, open session history, or jump into exports

Teacher-web report presentation should keep the same review loop obvious:

- which course rollups need attention
- which students need follow-up
- whether the teacher should stay in reports, return to session review, or jump into exports

## Suggested Report Filters

The exact UI may vary, but the product should support practical filters such as:

- classroom
- class
- section
- subject
- date range

## Student Self-Report Expectations

The system must provide student-only report endpoints that always scope to the authenticated student.

The self-report experience should provide:

- a personal overview card with tracked classrooms, totals, present count, absent count, and attendance percentage
- subject-wise summaries
- subject detail with classroom-level breakdown where the same subject can appear in multiple classroom contexts
- a personal attendance-history view that shows recent present or absent outcomes per course from the same final attendance truth

These student views must match the same final attendance truth that teacher reports use.
If a teacher corrects a saved attendance session, teacher history, teacher reports, and student
self-report detail must all reflect that corrected truth on the next refresh without a client-side
fallback calculation.

Current implementation status:

- student mobile now uses `GET /students/me/reports/overview`, `GET /students/me/reports/subjects`, and `GET /students/me/reports/subjects/:subjectId` for overview, subject summaries, and subject detail
- student mobile history now uses `GET /students/me/history` so recent present or absent rows come from the same finalized attendance truth as reports
- teacher web now uses one shared filter scope across `GET /reports/daywise`,
  `GET /reports/subjectwise`, and `GET /reports/students/percentages`, then renders:
  - course rollups
  - student follow-up rows
  - day-wise trend rows

## Basic Export Expectations

The system must support:

- session-wise PDF export
- session-wise CSV export
- student list with attendance percentage as CSV
- export request and status tracking so teachers can wait for larger files safely
- signed download or open flow once a file is ready
- retention-aware download handling so expired files no longer appear downloadable

## Session-Wise PDF Expectations

The PDF should be suitable for sharing or record keeping and should include:

- session identity
- date and time
- class and subject context
- present and absent summary
- student attendance list

## Session-Wise CSV Expectations

The CSV should support spreadsheet use and should include:

- session metadata
- student list
- attendance status

## Student Percentage CSV Expectations

The basic percentage CSV should include:

- student identity fields
- attendance totals
- attendance percentage

## Mobile Export Expectations

On mobile, exports may be exposed through:

- save to device
- share action
- file download

The requirement is that teachers can actually obtain the export from the mobile experience, not just see a placeholder button.

Teachers must also be able to:

- request an export job from mobile
- see queued, processing, completed, and failed status
- open the finished file from the returned download link

Teacher mobile may keep exports as a secondary action, but the export entry point should stay close
to report review so the teacher does not need to hunt through a disconnected workflow after finding
the data they want to share.

## Web Comprehensive Export Expectations

The teacher web app must support a larger CSV export across a time range.

This export should include:

- student details
- session-wise attendance matrix
- totals
- percentages
- subject-wise breakup
- one downloadable file generated asynchronously through the worker path

## Data Consistency Rule

All exports and reports must be based on the same attendance logic so that counts and percentages do not conflict across screens.

Manual edits must update the same final attendance truth consumed by:

- teacher session history
- teacher reports
- student self-reports
- later export builders

Duplicate or no-op correction saves must not create fake report churn. The product may refresh data,
but the saved counts and downstream report totals must remain unchanged when the requested final
state already matched stored truth.

Export files must be generated from that same final truth. They must not rebuild attendance numbers using a separate client-side rule set.

If a generated file has passed its retention window, the API should stop returning a live download link even if cleanup has not deleted the storage object yet.

## Acceptance Expectations

This area is successful when:

- teachers can review summary attendance trends quickly
- teachers can export session-level records from both web and mobile
- the comprehensive CSV gives enough data for deeper analysis outside the app
