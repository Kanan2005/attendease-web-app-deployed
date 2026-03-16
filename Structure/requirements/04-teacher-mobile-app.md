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

The current mobile app already provides a teacher route group and classroom workflow inside the shared Expo Router app:

- teacher home
- classroom list
- classroom create flow
- classroom detail hub
- classroom course-info edit flow
- classroom archive flow
- roster screen
- schedule screen
- announcements screen
- lecture list screen

Teacher home is already connected to live backend data for:

- teacher assignments
- teacher-visible classrooms
- shared attendance-session history routes that now back the dedicated session-history mobile flow
- quick actions that route back into classroom management flows

The current classroom flow is already connected to live backend data for:

- classroom detail
- join-code lookup and reset
- roster visibility plus shared classroom-student actions
- schedule visibility for weekly slots and date-specific exceptions
- classroom stream reads and teacher announcement posting
- lecture listing and lecture creation
- roster-import job status visibility

Reset roster contract note:

- teacher mobile roster APIs now use one shared classroom-student shape for teacher web and teacher mobile
- roster list should filter through `membershipStatus` plus `search`
- manual add should prefer:
  - `studentIdentifier`
  - `studentRollNumber`
  - `studentUniversityId`
  - `studentEmail`
- roster rows now expose:
  - `studentName`
  - `studentIdentifier`
  - `membershipState`
  - `actions`
- remove should use the explicit `DELETE /classrooms/:id/students/:enrollmentId` flow instead of treating removal as a hidden status patch

Bluetooth session creation and active-session control are now live in the teacher route group.
History and manual edits are now live in the teacher route group through the shared session APIs and
will keep extending the same route structure.
Unauthenticated teacher access is now redirected back to the dedicated teacher sign-in screen
instead of rendering teacher sign-in forms inside protected teacher pages.

The teacher operational layer now extends the current app with:

- Bluetooth session creation flow
- active Bluetooth session flow
- roster manual-add entrypoint
- roster import trigger entrypoint
- schedule draft editing with save-and-notify
- announcement composer plus classroom stream list
- API-backed teacher report overview with day-wise, subject-wise, and student-percentage sections
- export request screen hooks

Attendance-session history, manual attendance edit, report rendering, and export-job execution are
now all wired to the real shared teacher APIs and worker-backed export flow.

Reset classroom CRUD contract note:

- teacher mobile classroom create and edit flows should now use `courseCode` and `classroomTitle`
  as the primary request fields
- classroom responses now also include semester, class, section, subject, and primary-teacher
  labels plus an explicit `permissions` object
- teacher mobile should use those API-provided permissions to decide when course info can be edited
  or when an archive action should be shown, instead of inferring capability from scattered local
  classroom state
- teacher mobile classroom management should stay short and task-oriented:
  - `Create classroom`
  - `Save course info`
  - `Archive classroom`
  should be the visible actions instead of generic workspace or console language
- teaching-scope selection should show readable semester, class, section, and subject labels instead
  of raw internal IDs so a teacher can create the right classroom quickly on a phone

## Teacher Dashboard Expectations

Teacher home should provide:

- a clear teacher-home status banner
- a strong primary CTA to start or resume Bluetooth attendance
- direct access to classrooms, session history, reports, and exports
- quick access to classroom roster, schedule, and course code context
- summary cards for active classrooms, live sessions, assignments, and live course codes
- recent attendance sessions that are easy to scan and reopen
- short, product-facing copy that does not explain internal routing decisions

The current teacher home now provides:

- a teacher-home status banner for loading, empty, live-session, and ready states
- a spotlight card that either:
  - resumes a live attendance session
  - starts Bluetooth attendance
  - points the teacher to classrooms when no classroom is ready yet
- a concise `Go To` action row for:
  - Bluetooth attendance
  - Classrooms
  - Session history
  - Reports
  - Exports
- classroom highlight cards that keep:
  - open classroom
  - Bluetooth attendance
  - roster
  - schedule
  one tap away
- recent attendance-session rows backed by the real teacher session-history API instead of lecture-only fallback activity
- live-session banners, session-history rows, and active Bluetooth detail now all read the same backend session/detail/student truth so the teacher home and live roster stay aligned while class is running

## Classroom Management Expectations

Teacher mobile classroom management should now let a teacher:

- scan a short classroom list without opening multiple nested tools first
- create a classroom from an allowed teaching scope
- edit classroom title and course code from the classroom detail screen
- archive a classroom from the same detail screen when policy allows it
- understand class, section, subject, and semester context from concise supporting text

The current teacher classroom flow now provides:

- a dedicated `Classrooms` screen with:
  - a top status banner
  - a `Manage Classrooms` card
  - a short inline `Create classroom` form
- a create flow that:
  - loads the teacher's allowed teaching scopes
  - shows readable semester, class, section, and subject labels
  - creates the classroom through the live shared classroom API
  - routes directly into the newly created classroom
- classroom cards that keep:
  - `Open course`
  - `Bluetooth`
  - `Students`
  - `Schedule`
  one tap away
- a classroom detail screen that now includes:
  - a short course summary
  - an inline `Course Info` edit section
  - an `Archive Classroom` action with history-safe explanatory copy

Teacher mobile classroom management must use the shared API-provided `permissions` object as the
source of truth for:

- whether course info can be edited
- whether archive is available
- whether the classroom should present Bluetooth launch affordances

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

The current app already exposes read-only schedule context from the live classroom schedule
API, including recurring weekly slots and one-off, cancelled, or rescheduled class exceptions.
Later teacher-mobile slices will build richer editing and attendance-launch flows on top of this
same schedule data model.

Teacher mobile now also keeps a local schedule draft state on top of the live calendar data so a
teacher can stage:

- recurring slot changes
- one-off class additions
- cancellations
- reschedules
- one batched save-and-notify request

## Bluetooth Session Creation

The teacher must be able to:

- select class
- select section
- select subject
- optionally define session duration
- start session
- see active session state clearly
- end session manually if needed

The current mobile implementation now includes the create route and active-session flow for this
behavior, using live classroom and lecture context, the real Bluetooth session backend, and the
shared native advertiser boundary.

The teacher-facing Bluetooth flow is now intentionally split into two short phone-owned routes:

- `bluetooth/create`
  - select classroom context
  - confirm the current class-session context when available
  - set session duration
  - start Bluetooth attendance
- `bluetooth/[sessionId]`
  - see live session status
  - review broadcast health
  - retry Bluetooth when the advertiser fails
  - end Bluetooth attendance cleanly

The create route should feel like setup, not a generic workspace:

- a top status banner tells the teacher whether a classroom is still needed, setup is ready, or
  the start request is currently running
- the classroom list should keep the course name, course code, duration, and class-session context
  visible before the teacher commits
- the primary CTA should always read as the attendance action itself, not as a developer helper

The current active-session flow also now covers:

- advertiser start failure recovery
- Bluetooth-disabled or permission-required recovery
- stopped-advertiser retry behavior
- backend session-end retry when the first end request fails
- clean post-end handoff into session detail after the backend session closes successfully
- a live marked-student list while Bluetooth attendance is still active so the teacher can see who
  is already present without leaving the phone flow

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

The current teacher-mobile route now does this with three distinct blocks:

- a top status banner for live, stopped, failed, permission-needed, or ended states
- a `Live Student List` card that refreshes marked-present and still-absent students while the
  session remains active
- a `Broadcast Controls` card for retry, pause/resume, and refresh actions
- an `End Session` card that keeps closeout separate from advertiser recovery
- the live roster now stays aligned with the same shared `GET /sessions/:id` and `GET /sessions/:id/students` truth used by teacher web review screens

## History and Session Detail

Teacher mobile must allow teachers to:

- review live sessions separately from saved sessions
- review past sessions
- open a session detail page
- see the student list and attendance status grouped into present and absent sections
- see present and absent counts
- understand whether corrections are still locked because the session is live or open because the
  edit window is available

The current reset teacher-mobile history flow now also provides:

- an `At A Glance` summary before the session list so the teacher can see:
  - live sessions
  - saved sessions
  - open correction windows
  - total present marks across recent sessions
- a `Live Now` section that keeps each classroom row short and action-first
- a `Recently Saved` section that makes the correction-window state obvious before the teacher opens the detail view
- a session-detail summary card with:
  - present count
  - absent count
  - attendance percentage
  - correction status
- grouped `Present Students` and `Absent Students` sections whose subtitles explain whether the teacher is still reviewing a live session or correcting a saved one
- correction actions that now read as `Move To Present` and `Move To Absent`, which matches the review workflow better than generic mark buttons
- session-history polling now slows down automatically once no live session remains, so live-session and saved-session states stay trustworthy without leaving the route stale

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

Teacher mobile now also includes:

- a course-context roster header with summary counts and one-tap return to classroom, schedule, and updates
- a manual add form using the live roster API
- a roster search and filter card using the shared `membershipStatus` plus `search` contract
- direct row actions for `Mark Active`, `Mark Pending`, `Block`, and `Remove` when the API allows them
- an import trigger form that sends normalized rows to the existing backend import pipeline
- reviewed import apply actions from the phone
- a roster screen where bulk import stays below day-to-day roster work so normal classroom management remains the default path

Roster edits must follow semester and classroom lifecycle rules so closed semesters and completed
classrooms become read-only.

## Classroom Stream Expectations

Teacher mobile must allow teachers to:

- view classroom stream posts for owned classrooms
- create announcements from the phone when appropriate
- choose whether a post is teacher-only or student-visible
- optionally request notification fan-out for student-visible posts
- see teacher-only import-result notices and other operational classroom updates in the stream

The announcement composer and list view are now already wired to the live backend classroom stream
routes.

Announcement posting should follow the same lifecycle restrictions as other classroom mutations, so
completed classrooms and closed semesters become read-only for stream writes.

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

The current teacher mobile routes now include report and export screens. Reports now use the final
teacher day-wise, subject-wise, and student-percentage report APIs, and the export route remains
wired to the real export-job backend with live worker-backed job status.

The current reset teacher-mobile reporting flow now also provides:

- a top report status banner that calls out no-data, follow-up-needed, and ready states
- an overview card that keeps filter summary, subject coverage, student follow-up count, and day-wise freshness together
- a `Subject View` section with classroom-plus-subject attendance cards instead of terse list rows
- a `Student Follow-Up` section that highlights attendance risk directly on each student card
- a `Day-wise Trend` section that keeps export access nearby so a teacher can move from review into file download without leaving the reporting flow

The teacher mobile closeout pass now also guarantees that:

- teacher-only session bootstrap is verified before teacher queries run
- classroom-context navigation stays centralized so roster, schedule, stream, lecture, and
  Bluetooth routes continue sharing the same classroom hub model
- Bluetooth create and active-session screens already model ready, active, stopped, permission, and
  recovery states so the later native BLE phase can attach to the existing routes
- teacher Bluetooth setup and active-session copy now stays product-facing instead of exposing
  scaffolding language like shell, recovery console, or local verification
- ending Bluetooth attendance now routes the teacher into the saved session-detail screen so
  post-session correction work can build on one consistent handoff
- teacher cache invalidation stays shared across join-code reset, roster, schedule, stream,
  lecture, and report/export-adjacent mutations

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

For the current implementation phase, the following are now complete and verified:

- the teacher route group, classroom hub routes, and classroom subflows are live
- teacher home, classroom list, classroom detail, roster, schedule, announcements, lectures,
  Bluetooth flow, reports, and exports are all wired to the current backend surfaces
- route boundaries, role gating, query invalidation, and recovery-state handling have automated mobile
  test coverage

The following are still intentionally deferred to later phases:

- richer native-device Bluetooth hardening and real-device manual verification
- optional teacher-mobile reporting polish after the API-backed route adoption, mainly emulator and real-device verification
- optional native share-sheet or file-save polish on completed export downloads
