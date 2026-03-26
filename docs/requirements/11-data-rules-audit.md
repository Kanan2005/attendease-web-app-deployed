# Data, Rules, and Audit Requirements

## Purpose

This document defines the shared logical data expectations and business rules that all app surfaces must follow.

## Reset Implementation Status

The reset-track data, archive, and audit semantics are now implemented.

- semester and classroom lifecycle removal now means archive, not hard delete
- classroom-student remove now means membership status `DROPPED`
- device revoke and delink now preserve recovery history instead of deleting it
- session history, attendance records, audit rows, exports, and security history remain append-only in normal product flows

## Minimum Logical Entities

The system must support at minimum these logical entities:

- User
- User Credential
- User Role
- OAuth Account
- Student Profile
- Teacher Profile
- Academic Term
- Semester
- Class
- Section
- Subject
- Teacher Assignment
- Course Offering / Classroom
- Classroom Join Code
- Course Schedule Slot
- Course Schedule Exception
- Lecture
- Enrollment
- Announcement Post
- Announcement Receipt
- Roster Import Job
- Roster Import Row
- Device
- User Device Binding
- Login Event
- Security Event
- Admin Action Log
- Attendance Session
- Attendance Record
- Attendance Event
- Manual Edit Audit Log
- Export Job
- Export Job File
- Analytics rollup tables
- Outbox Event
- Email Automation Rule
- Email Dispatch Run
- Email Log

These are logical requirements, not final database table names.

## Core Entity Relationships

The system must be able to determine:

- which students are enrolled in which class, section, and subject context
- which teacher owns a given session
- which attendance records belong to which session
- which sessions belong to which reporting scopes

## Session Rules

Each attendance session must:

- belong to one mode
- belong to one class, section, and subject combination
- have a start time
- have an end state
- have a final attendance list

## Attendance Record Rules

The system must enforce:

- at most one attendance record per student per session
- no duplicate success for the same student and session
- eligibility checks before attendance is saved
- one final attendance row per eligible student in a session roster snapshot so absent counts remain stable

## Manual Edit Rules

The system must enforce:

- manual edits allowed only within 24 hours after session end
- edits update the final attendance outcome for reporting
- edits may be logged internally for audit

The 24-hour edit window is a business rule enforced in service logic using session timestamps and actor permissions. The database must store enough state and audit detail to let that rule be enforced consistently.

## Reporting Rules

The system must calculate at minimum:

- present count
- absent count
- attendance percentage

Definitions:

- present count = students marked present for the session
- absent count = eligible students for the session minus present count
- attendance percentage = present sessions divided by total eligible sessions for the selected scope

The data layer must also support initial read models for:

- session-level attendance overview
- student-per-course attendance overview

These read models may be implemented as SQL views or equivalent derived storage, but they must always derive from the same final attendance truth used by history, reports, and exports.

## Mode Visibility Rule

Attendance mode may be stored and used for analytics, but it does not need to be emphasized in standard reports.

## Email Rule

The low-attendance threshold for the current product version is 75%.

## Audit Expectations

The system should preserve enough internal audit information to support:

- session creation and completion tracing
- attendance submission tracing
- manual edit tracing
- email send tracing
- device bind / revoke tracing
- roster import tracing
- join-code rotation tracing

## Consistency Rule

All product surfaces must use the same underlying rules so that:

- mobile and web show the same session totals
- reports match history
- exports match reports
- analytics are based on the same final attendance data
- derived read models stay aligned with canonical attendance records

## Database Integrity Expectations

The data layer must enforce the highest-risk invariants in the database itself, not only in service code.

This includes at minimum:

- unique student-course enrollment per classroom
- unique student-session attendance record
- one active join code per classroom at a time
- one active student attendance binding per device
- one active attendance-eligible device per student
- schedule and automation value checks for obviously invalid times and percentages
- semester date windows and lecture time windows for obviously invalid academic planning data

## Retention-Sensitive Data Expectations

The data layer must preserve timestamps and status fields needed for later cleanup and retention workflows, including at minimum:

- session and refresh-token expiry/revocation tracking
- join-code expiry and revocation tracking
- export-file readiness and expiry tracking
- device-binding activation and revocation tracking
- enrollment drop tracking
- archive markers where classroom data is retired without destroying history

## Locked Reset Deletion and Archive Rules

The reset track now locks these product-delete semantics:

- semester delete means archive, not row deletion
- classroom delete means archive, not row deletion
- classroom-student remove means membership status `DROPPED`, not row deletion
- join-code reset revokes prior codes instead of deleting them
- device delink or revoke revokes bindings instead of deleting them
- session history, attendance records, audit rows, exports, email logs, security events, admin action logs, and outbox rows are not user-deleted from normal product flows
- announcement posts remain append-only in reset v1

Hard deletes are reserved for developer fixtures, tests, or explicit operations work outside normal product APIs.

## Academic Planning Consistency Expectations

The data layer must also support:

- semester lifecycle state used by admin controls
- classroom join-code creation at classroom creation time
- recurring weekly slots with overlap prevention at the service layer
- one exception per weekly slot occurrence date for cancellations and reschedules
- lecture records that stay inside the semester date window
- lecture linkage that allows one schedule exception or one slot occurrence to resolve to one lecture record
- save-and-notify outbox events for schedule publishing
- outbox events for semester, classroom, and lecture changes so later notifications and timeline automation can be added safely
- service-layer enforcement that blocks classroom, schedule, and lecture mutations when semester or classroom lifecycle state makes that unsafe

## Open Data Decisions

The following decisions still need refinement during design:

- exact audit retention policy
- later reporting/materialized-view optimization strategy
- automated cleanup jobs for expired exports, stale tokens, and long-term audit archives
