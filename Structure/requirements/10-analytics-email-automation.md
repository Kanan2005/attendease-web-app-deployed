# Analytics and Email Automation Requirements

## Purpose

This document defines the web-only advanced analytics and low-attendance email features.

## Scope

These requirements apply only to the teacher web app.

## Advanced Analytics Objective

The analytics area must help teachers understand attendance patterns, identify low-attendance students, and compare performance across classes and subjects.

## Dashboard Expectations

The analytics dashboard must provide at minimum:

- attendance trend by week
- attendance trend by month
- attendance percentage distribution
- class-wise comparisons
- subject-wise comparisons

## Distribution Expectations

The attendance distribution should support at least these buckets:

- above 90%
- 75% to 90%
- below 75%

## Filter Expectations

Analytics should support filters for:

- class
- section
- subject
- date range

## Drill-Down Expectations

The dashboard should allow drill-down from summary data into:

- student attendance timeline
- session-level attendance detail

## Attendance Mode Analysis

The teacher web app must also provide analytics on attendance mode usage, including:

- QR + GPS session count
- Bluetooth session count
- trend over time by mode

## Low-Attendance Email Objective

The system must help teachers notify students whose attendance is below 75%.

## Manual Email Send Expectations

The teacher must be able to:

- choose class and/or subject scope
- choose date range
- preview the email content
- send emails to students below threshold

## Automatic Email Expectations

The teacher must be able to:

- enable or disable automatic daily reminders per class or subject
- choose the send time
- preview the email template
- inspect email logs

## Daily Automation Rule

When automation is enabled:

- the system checks each day for students below 75%
- eligible students receive a reminder email
- reminders continue daily while the student remains below threshold
- reminders stop once the student reaches or exceeds 75%

## Email Log Expectations

The teacher should be able to inspect:

- sent emails
- failed emails
- enough context to understand which run or rule produced them

## Acceptance Expectations

This area is successful when:

- a teacher can understand attendance trends without exporting raw data first
- low-attendance students are easy to identify
- teachers can send manual warning emails
- daily automation can continue without manual intervention until the percentage improves

## Current Analytics Backend Status

The analytics backend slice is now implemented for the teacher/admin web platform.

Live analytics endpoints:

- `GET /analytics/trends`
- `GET /analytics/distribution`
- `GET /analytics/comparisons`
- `GET /analytics/modes`
- `GET /analytics/students/:studentId/timeline`
- `GET /analytics/sessions/:sessionId/detail`

Current analytics behavior:

- trend payloads are returned as compact weekly and monthly chart-ready series
- distribution buckets use the same finalized attendance truth already used by reports
- class and subject comparison payloads are server-prepared for direct chart rendering
- mode usage analytics are refreshed into aggregate tables from session-change outbox events
- student timeline and session drill-down continue to read authoritative finalized attendance records rather than a second analytics-specific truth

## Current Email Automation Status

The low-attendance email automation slice is now implemented for the teacher/admin web platform.

Live email automation endpoints:

- `GET /automation/email/rules`
- `POST /automation/email/rules`
- `PATCH /automation/email/rules/:ruleId`
- `POST /automation/email/preview`
- `POST /automation/email/send-manual`
- `GET /automation/email/runs`
- `GET /automation/email/logs`

Current email automation behavior:

- one low-attendance rule can be managed per classroom, with active or paused state, local send time, threshold, and template fields
- preview rendering and manual send use the same final attendance truth already exposed through teacher/student reports
- recipient selection stays aligned with the same percentage logic already used by reporting
- automatic daily runs are scheduled by the worker using the rule timezone and local clock time
- duplicate automated scheduling is blocked per rule and local day, and duplicate recipient sends are blocked per dispatch run
- stale processing runs are safely reclaimed by the worker after the timeout window instead of being left stuck forever
- dispatch runs persist aggregate send counts and execution status in `email_dispatch_runs`
- recipient-level delivery outcomes persist in `email_logs`
- teacher web now includes live analytics and email-automation workspaces backed by these endpoints
