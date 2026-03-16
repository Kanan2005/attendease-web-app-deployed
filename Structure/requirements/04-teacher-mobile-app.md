# Teacher Mobile App Requirements

## Purpose

This document defines what is expected from the teacher-facing mobile experience inside the shared mobile application.

## Reset Implementation Status

The reset-track teacher mobile experience is now live in the shared mobile app.

- teacher sign in and teacher registration are implemented
- teacher `Home`, `Classrooms`, `Bluetooth Attendance`, `Session History`, and `Reports & Exports` flows are implemented
- classroom CRUD, roster CRUD, Bluetooth session control, live roster review, post-session correction, reports, and mobile export entrypoints are implemented
- shared correction wording and polling now match teacher web

Remaining validation here is Bluetooth hardware signoff on real devices.

## Core Objective

The teacher mobile app must support attendance operations that make sense on a phone, especially Bluetooth-based attendance sessions and mobile access to history, reports, and edits.

## Teacher Mobile Responsibilities

The teacher mobile experience must support:

- authenticated teacher access
- classroom visibility for the teacher's assigned academic scopes
- classroom join-code lookup and reset
- classroom roster list, search, add, update, remove, and reactivation flows
- classroom stream visibility and announcement posting
- roster import status visibility for classroom onboarding
- classroom schedule visibility for recurring and date-specific lecture planning
- class, section, and subject selection
- Bluetooth attendance session creation and control
- lecture list viewing for a classroom
- session history viewing
- session-level attendance details
- manual attendance edits within the allowed edit window
- basic reports
- basic exports or share actions

## Final Reset Teacher-Mobile IA

The teacher side of the shared mobile app now has a locked reset IA:

### Entry and Auth

- app opens to a neutral role-entry screen
- teacher entry offers:
  - create teacher account
  - teacher sign in
- teacher-only routes redirect back to teacher sign in when no authenticated teacher session exists
- after successful auth, the teacher lands in the teacher-owned navigation tree

Current implementation note:

- the shared mobile app now starts on a neutral role-choice landing screen before the teacher route group
- dedicated teacher sign-in and teacher registration screens now live in the shared binary instead of keeping auth inside protected classroom surfaces
- teacher self-registration is now live through `POST /auth/register/teacher`
- teacher mobile signup can include optional device-registration metadata without triggering student-only device-binding friction
- successful teacher signup now returns an authenticated teacher session plus an `OPEN_HOME` onboarding hint

### Top-Level Sections

- Home
- Classrooms
- Bluetooth Attendance
- Session History
- Reports & Exports

Bluetooth Attendance is the teacher-mobile signature action. Classroom roster, announcements, lectures, and schedule stay nested under Classrooms rather than competing as independent top-level destinations.

## Shared Visual And Copy Foundation

The reset track now also locks these teacher-mobile presentation rules:

- shared mobile typography, spacing, color, and action emphasis should come from `packages/ui-mobile`
- Bluetooth attendance remains the strongest CTA on teacher-mobile surfaces, while classroom and reporting actions remain secondary
- classroom, report, and export screens should prefer concise titles and short support copy instead of internal implementation notes
- user-facing copy must avoid words such as `shell`, `foundation`, `readiness`, `bootstrap`, or `local verification`
- product copy should use `Classroom`, `Course code`, `Roster`, `Students`, `Class session`, and `Attendance session`; internal `course offering`, `enrollment`, and `lecture` terms must stay out of normal teacher-facing UI
- the current premium teacher-mobile look is already implemented through the shared `packages/ui-mobile` tokens, so later work should reuse that hierarchy instead of dropping back to generic cards or verbose helper text
- the current screenshot-audit source of truth for this surface is `Structure/full-product-screenshot-audit.md` plus `Structure/artifacts/full-product-audit/mobile/teacher`

Detailed teacher-mobile implementation and acceptance notes now live in
[`./04-teacher-mobile-app-notes.md`](./04-teacher-mobile-app-notes.md).

## Expected Main Screens

The teacher mobile experience is expected to include:

- login or role entry screen
- teacher home
- classroom list and classroom detail screen
- classroom stream panel or page
- classroom join-code sheet or copy action
- classroom student-list screen
- roster import status panel or review entry point
- schedule preview or schedule screen entry point for a classroom
- lecture list and lecture create flow
- start Bluetooth session flow
- active session screen
- session history list
- session detail screen
- manual edit screen
- quick reports screen
- export actions screen

## Current Implementation Status

Teacher mobile now already provides a full teacher route group with classroom, Bluetooth, history,
reports, exports, and correction workspaces inside the shared Expo Router app.

Detailed route and API-backed implementation notes now live in the companion teacher-mobile notes doc.

## Teacher Dashboard Expectations

Teacher home should provide:

- a clear teacher-home status banner
- a strong primary CTA to start or resume Bluetooth attendance
- direct access to classrooms, session history, reports, and exports
- quick access to classroom roster, schedule, and course code context
- summary cards for active classrooms, live sessions, assignments, and live course codes
- recent attendance sessions that are easy to scan and reopen
- short, product-facing copy that does not explain internal routing decisions

Detailed home-screen implementation notes now live in the companion teacher-mobile notes doc.

## Classroom Management Expectations

Teacher mobile classroom management should now let a teacher:

- scan a short classroom list without opening multiple nested tools first
- create a classroom from an allowed teaching scope
- edit classroom title and course code from the classroom detail screen
- archive a classroom from the same detail screen when policy allows it
- understand class, section, subject, and semester context from concise supporting text

Detailed classroom-management notes now live in the companion teacher-mobile notes doc.

## Schedule Expectations

Teacher mobile should expose:

- recurring weekly schedule visibility
- date-specific one-off, cancelled, and rescheduled class visibility
- lecture list access from the classroom schedule context
- a first integration path for later richer calendar editing

The current product direction allows the web app to remain the richer schedule editor, while
mobile still needs enough schedule context for teachers to understand upcoming class and lecture
state before running attendance.

Teacher mobile must not expose classrooms outside the signed-in teacher's assignment scope, and
completed classrooms or closed/archived semesters should surface schedule information as read-only
state instead of editable planning state.

Detailed schedule implementation notes now live in the companion teacher-mobile notes doc.

## Bluetooth Session Creation

The teacher must be able to:

- select class
- select section
- select subject
- optionally define session duration
- start session
- see active session state clearly
- end session manually if needed

Detailed Bluetooth route and recovery notes now live in the companion teacher-mobile notes doc.

## Active Session Expectations

During an active Bluetooth session, the app should show:

- current class and subject context
- session start time
- live present count if feasible
- a live marked-student list grouped into present and absent sections
- broadcast health
- end session action
- session status such as active, ending, or ended
- recovery guidance when the advertiser stops, fails, or loses Bluetooth availability

Detailed active-session UI notes now live in the companion teacher-mobile notes doc.

## History and Session Detail

Teacher mobile must allow teachers to:

- review live sessions separately from saved sessions
- review past sessions
- open a session detail page
- see the student list and attendance status grouped into present and absent sections
- see present and absent counts
- understand whether corrections are still locked because the session is live or open because the
  edit window is available

Detailed history and session-detail notes now live in the companion teacher-mobile notes doc.

## Roster Expectations

Teacher mobile must allow teachers to:

- view the current classroom roster
- add a student manually by identifier or email
- edit classroom-student enrollment state when policy allows
- block, drop, or reactivate a roster member when policy allows
- rotate the join code shared with students
- monitor roster-import review status when uploads were created on web or mobile
- see whether reviewed import rows were applied, skipped as duplicates, or rejected during validation
- scan roster context without opening the web app first:
  - classroom title
  - subject or course code
  - student counts by active, pending, and blocked state
- search students and filter by roster status from the same phone screen
- see the primary roster actions directly on each student row instead of navigating into a second edit workspace

Detailed roster notes now live in the companion teacher-mobile notes doc.

## Classroom Stream Expectations

Teacher mobile must allow teachers to:

- view classroom stream posts for owned classrooms
- create announcements from the phone when appropriate
- choose whether a post is teacher-only or student-visible
- optionally request notification fan-out for student-visible posts
- see teacher-only import-result notices and other operational classroom updates in the stream

Detailed stream-route notes now live in the companion teacher-mobile notes doc.

## Manual Edit Expectations

If the edit window is still open, the teacher mobile app must let the teacher:

- mark an absent student present manually
- move a present student back to absent manually
- queue multiple corrections in one draft
- save the grouped correction draft once
- see a saved-success message after the final truth refreshes

If the window has expired, the UI must present the session as read-only.

If the session is still live, the UI must keep manual corrections disabled while still surfacing
the live present and absent lists.

## Reports and Export Expectations

Teacher mobile must provide:

- day-wise summary views
- subject-wise summary views
- per-student percentage at a basic level
- session-wise PDF export
- session-wise CSV export
- student list with attendance percentage export

On mobile, export may be delivered through:

- file save
- share sheet
- direct download

Detailed reports/export notes now live in the companion teacher-mobile notes doc.

## Mobile-Specific UX Expectations

Teacher mobile should optimize for:

- fast in-class usage
- low number of taps
- clear session state
- safe handling of accidental session closure

## Platform Constraints

The app should not assume that it can force Bluetooth on or off by itself. It should guide the teacher if Bluetooth needs to be enabled by the user.

## Acceptance Expectations

This part of the app is successful when:

- a teacher can run and end a Bluetooth session from a phone
- the teacher can review the resulting attendance data later
- manual edits work within the allowed window
- reports and exports remain available without needing the web app for basic use

Detailed acceptance and deferred-work notes now live in the companion teacher-mobile notes doc.
