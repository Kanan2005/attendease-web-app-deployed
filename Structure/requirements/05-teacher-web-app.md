# Teacher Web App Requirements

## Purpose

This document defines what is expected from the teacher-facing web application.

## Reset Implementation Status

The reset-track teacher and admin web experience is now live in the repo.

- teacher sign in, teacher registration, and admin sign in are implemented as separate entry flows
- teacher dashboard, classroom management, QR + GPS session setup, live QR projector/control, session history, reports, exports, analytics, and email automation routes are implemented
- admin dashboard, student support, device recovery, imports, and semester/classroom governance routes are implemented
- classroom, roster, history, report, and correction surfaces now use the reset-era product naming and role ownership rules

Remaining release work here is validation and environment hardening, not missing reset-track web IA.

## Core Objective

The teacher web app is the primary operations and analytics console of AttendEase. It must support classroom QR sessions, history, reporting, exports, analytics, and email automation.

## Core Teacher Web Responsibilities

The teacher web app must support:

- teacher authentication
- classroom creation and editing within assignment scope
- classroom archive action when the classroom is no longer active
- classroom join-code lookup, rotation, and expiry handling
- classroom roster list, search, add, block, remove, and reactivation flows
- classroom announcement posting and stream visibility
- roster import job creation, review visibility, and apply flow
- classroom detail with schedule visibility and lecture management
- recurring weekly schedule CRUD
- one-off, cancelled, and rescheduled class management
- save-and-notify schedule publishing
- QR + GPS session creation and control
- access to history and session details
- manual attendance editing within 24 hours
- basic reports and exports
- advanced analytics dashboards
- low-attendance email tools
- comprehensive CSV exports

## Final Reset Web IA

The web reset locks separate teacher and admin auth flows plus separate top-level navigation.

### Auth Split

Teacher web:

- teacher sign in
- teacher registration

Admin web:

- admin sign in only

Teacher and admin must not share the same primary login framing.

Current implementation note:

- teacher self-registration is now live through `POST /auth/register/teacher`
- successful teacher web signup now returns an authenticated teacher session plus an `OPEN_HOME` onboarding hint
- admin remains sign-in only; there is still no public admin self-registration route
- teacher web now has a dedicated sign-in page at `/login`
- teacher web now has a dedicated registration page at `/register`
- admin now has a dedicated sign-in page at `/admin/login`
- the shared web entry no longer leads with seeded-account helper copy or a teacher/admin role dropdown
- protected teacher pages now hand off to teacher sign in, while protected admin pages hand off to admin sign in

### Teacher Web Top-Level Sections

- Dashboard
- Classrooms
- Attendance Sessions
- Reports
- Exports
- Analytics
- Email Automation

### Admin Web Top-Level Sections

- Dashboard
- Student Support
- Device Recovery
- Imports
- Semesters

Admin semester management, device recovery, and support work belong to admin web, not teacher web.

## Shared Visual And Copy Foundation

The reset track now also locks these web presentation rules:

- shared web typography, spacing, surface hierarchy, and CTA emphasis should come from `packages/ui-web`
- teacher and admin landing or sign-in surfaces should explain role ownership clearly instead of exposing internal environment or scaffold wording
- teacher portal chrome should stay compact, with a left navigation rail, a small account summary, and no oversized explainer cards that repeat what the route already says
- table, chart, and metric surfaces should use concise product-facing labels so later data can plug in without rewriting the frame
- user-facing copy must avoid words such as `shell`, `foundation`, `readiness`, `bootstrap`, or `local verification`
- product copy should use `Classroom`, `Course code`, `Roster`, `Students`, `Class session`, and `Attendance session`; internal `course offering`, `enrollment`, and `lecture` terms must stay out of normal teacher/admin-facing UI
- the current premium teacher/admin web look is already implemented through the shared `packages/ui-web` tokens, so later work should extend that foundation instead of introducing isolated per-page styling systems
- the current screenshot-audit source of truth for these surfaces is `Structure/full-product-screenshot-audit.md` plus `Structure/artifacts/full-product-audit/web`

## Expected Main Areas

The teacher web app is expected to include:

- teacher login page
- teacher registration page
- admin login page
- protected teacher route group
- protected admin route group
- dashboard
- semester management area for admin users
- classroom list and classroom detail pages
- classroom create page
- classroom roster panel or page
- classroom import-status page
- classroom stream composer or stream page
- roster import monitoring area inside classroom management
- classroom join-code management area
- classroom schedule page or schedule panel
- lecture list and lecture create flow
- start QR session flow
- active session or projector view
- session history page
- session detail page
- reports page
- exports area
- analytics dashboard
- email automation settings and logs
- admin device-support page for recovery actions

The current web app must keep these areas inside clear teacher versus admin navigation
boundaries so later operational work can extend the same route tree without restructuring the app.

The current implementation should already expose these route-level workspace pages:

- `/login`
- `/register`
- `/admin/login`
- `/teacher/classrooms`
- `/teacher/classrooms/new`
- `/teacher/classrooms/:classroomId`
- `/teacher/classrooms/:classroomId/roster`
- `/teacher/classrooms/:classroomId/imports`
- `/teacher/classrooms/:classroomId/schedule`
- `/teacher/classrooms/:classroomId/stream`
- `/teacher/classrooms/:classroomId/lectures`
- `/teacher/sessions/start`
- `/teacher/sessions/active/:sessionId`
- `/teacher/sessions/active/:sessionId/projector`
- `/admin/semesters`
- `/admin/devices`
- `/admin/imports`

If a protected route is opened without a valid web session, the UI should render an explicit
sign-in-required or role-required state instead of failing silently.

Reset classroom CRUD contract note:

- classroom create and edit flows may now submit `courseCode` and `classroomTitle` instead of
  needing internal-looking `code` and `displayTitle` fields
- classroom list and detail responses now also provide reset-ready labels for semester, class,
  section, subject, and primary teacher plus an explicit `permissions` object
- teacher web classroom forms and actions should use those response labels and permissions instead
  of re-deriving edit or archive capability locally

Current reset implementation note:

- the teacher classroom list now behaves like a single classroom-management workspace instead of a
  route index plus disconnected utilities
- classroom list cards now keep these items together:
  - `courseCode`
  - `classroomTitle`
  - teaching-scope summary
  - attendance mode
  - join-code status
  - direct actions for course, roster, schedule, updates, and QR tools
- the teacher create flow now loads allowed teaching scopes from teacher assignments and asks only
  for:
  - teaching scope
  - classroom title
  - course code
  - attendance defaults
- the teacher classroom detail flow now focuses on:
  - course settings
  - join-code reset
  - archive action
  - QR handoff
  - nearby links into roster, schedule, updates, imports, and class sessions
- the teacher QR + GPS launch flow now lives at `/teacher/sessions/start` and asks only for:
  - classroom
  - session duration
  - allowed distance
  - teacher browser location
- classroom detail should now hand off into `/teacher/sessions/start?classroomId=...` instead of
  keeping raw QR anchor fields inside the course workspace
- teacher web should keep course management short and task-oriented instead of exposing raw
  semester, class, section, or subject IDs in normal form controls

Teacher-only and admin-only areas must remain clearly segregated. Admin pages must not be reachable
from a teacher-only session, while teacher pages may still be available to an admin-capable session
when the product allows admin oversight of teacher workflows.

## Dashboard Expectations

The dashboard should provide:

- obvious teacher routes for:
  - Classrooms
  - QR attendance launch
  - Session history
  - Reports
- quick access to classroom creation
- high-level teacher-facing status cards that explain where to act next
- concise route cards for exports, analytics, and follow-up tools
- no placeholder-heavy empty table or chart cards if they do not help the teacher act yet

The current web app should already expose teacher and admin dashboard workspaces with stable quick
actions, metric cards, and table/chart surfaces so later data-heavy work plugs into the existing
pages instead of replacing them.

The teacher dashboard should now also expose quick entrypoints into classroom creation, classroom
operations, the dedicated QR setup route, session-history routes, and report review without
making the teacher open a second landing page first.

The admin dashboard should now also keep these areas visibly separate instead of mixing them into
one generic support surface:

- Student Support
- Device Recovery
- Imports
- Semesters

The admin dashboard should favor route cards and short next-step copy over placeholder table/chart
frames when the goal is to move an admin into the right governance workspace quickly.

## Schedule Management Expectations

The teacher web app must allow the teacher to:

- add recurring weekly slots for a classroom
- update recurring weekly slots
- create one-off extra classes
- create cancellation entries
- create reschedule entries
- review linked lecture rows created from schedule changes
- save a batch of schedule edits and trigger notifications through a `Save & Notify` flow

The schedule UI should keep local edits separate from published state until the teacher explicitly
saves them.

Teachers must only be able to view and edit classrooms inside their assignment scope. Schedule and
lecture planning actions should be blocked once a classroom is completed/archived or the semester
is closed/archived, with the UI reflecting that state clearly.

## Roster Management Expectations

The teacher web app must allow the teacher to:

- view the current classroom roster with member status
- add a student manually by email or student identifier
- block, drop, or reactivate a roster member where policy allows
- rotate the classroom join code when needed
- create or monitor roster import jobs for bulk onboarding
- apply reviewed valid roster import rows when the worker has finished validation
- inspect row-level import outcomes, including applied, skipped, and invalid rows

The current implementation should already support classroom roster tables with add, activate, drop,
and block actions, join-code reset from classroom detail, roster import text parsing into
normalized row payloads before API submission, and classroom-scoped import status monitoring.

Reset roster contract note:

- teacher web roster APIs now use the same classroom-student contract as teacher mobile
- roster search should use `membershipStatus` plus `search`
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
- explicit removal should use `DELETE /classrooms/:id/students/:enrollmentId` instead of relying on a hidden status patch contract

Current reset implementation note:

- the teacher web roster page now keeps course context visible with:
  - classroom title
  - course code
  - teaching-scope summary
  - attendance mode
- manual add now accepts a student email or student identifier from one field instead of leading
  with email-only copy
- roster filters now use membership-state language and stay on the same page as the add-student
  form
- roster rows now render student-focused cards with:
  - student name
  - identifier + email context
  - membership state
  - membership source
  - attendance-paused hint when applicable
  - API-driven actions for activate, mark pending, block, and remove
- remove-student UX should use the explicit remove route rather than pretending removal is just
  another generic state change

Roster and join-code actions must follow the same semester and classroom lifecycle rules as the
rest of classroom management.

## Classroom Stream Expectations

The teacher web app must allow the teacher to:

- view the classroom stream timeline for owned classrooms
- create announcements with teacher-only or student-visible visibility
- optionally request notify-on-post fan-out
- see import-result notices and other classroom activity updates in the stream when relevant
- enforce that student-visible posts are the only posts available to student clients, while teacher-only posts remain staff-facing

The current implementation should already expose a classroom stream page with a list view backed by
the live announcements API, an announcement composer with visibility and notify toggles, and clear
loading, empty, and error states.

Classroom stream writes must be blocked once the classroom is completed/archived or the semester is
closed/archived.

## QR Session Expectations

The teacher must be able to:

- choose the classroom
- set allowed distance
- set session duration
- confirm teacher browser location
- start the session
- display a rolling QR code in a view suitable for classroom projection
- monitor live marked count against total eligible students
- keep a live marked-student list visible on the teacher control view
- end the session manually when needed

The QR session web flow must keep stable active-session and projector routes so later realtime
transport work can extend the same page tree instead of replacing it.

Current implementation status:

- the teacher web app now uses a dedicated QR + GPS setup route at `/teacher/sessions/start`
- the setup flow can preselect the classroom from classroom detail and only asks for classroom,
  duration, allowed distance, and teacher browser location
- session start is blocked cleanly until the browser location has been captured successfully
- the active-session route now refreshes the live session every 2 seconds, keeps the timer visible,
  shows a large rolling QR, and keeps the marked-student list visible beside the teacher controls
- the projector route now keeps the room-facing screen minimal with the large QR, timer, and
  marked-count summary
- end-session control is now wired to the live QR end endpoint from the teacher control page
- the live control route and the teacher history route now share the same session/detail/student truth, so QR status transitions and marked-student counts do not drift between pages

## Session Management Expectations

The teacher web app must clearly show:

- whether a session is active, ended, or expired
- current attendance count
- session details after completion
- whether the manual edit window is still available

## History Expectations

The history page must allow the teacher to:

- browse past sessions
- filter by class, section, subject, or date
- open a session to view the full attendance list

Current implementation note:

- the teacher web history route now loads shared session history, session detail, and session-student list data from the live attendance API
- the same route now also saves manual attendance corrections through the shared `PATCH /sessions/:sessionId/attendance` API
- the history route now also relies on the same shared live-session status model used by the active QR screen, so `ACTIVE`, `ENDED`, and `EXPIRED` transitions stay aligned while polling
- the history filters now stay on one page and can narrow by:
  - classroom
  - class
  - section
  - subject
  - session status
  - attendance mode
  - date range
- the session-review detail now keeps:
  - present and absent student lists
  - correction-open versus read-only state
  - pending correction count
  - correction summary
  - suspicious-attempt summary
  visible together instead of pushing teachers into a generic detail table first

## Manual Edit Expectations

Within the allowed edit window, the teacher web app must allow:

- marking a student present
- removing a student's attendance record

After the window ends, the UI must clearly indicate read-only state.

Current reset implementation note:

- teacher web manual corrections now happen directly inside grouped `Present students` and `Absent students` sections
- quick actions now read as `Mark present` or `Mark absent`
- pending corrections stay visible before save
- successful save now refreshes history totals and invalidates teacher web report queries so reports stay aligned with the corrected final truth

## Reports and Export Expectations

The teacher web app must provide all basic report and export capabilities available on mobile, plus comprehensive exports and advanced analysis tools.

Current reset implementation note:

- teacher web reports now use one shared filter scope for:
  - course rollups
  - student follow-up rows
  - day-wise attendance trend rows
- the report page now keeps `Open session review` and `Open exports` close to the filtered output so teachers can move from review into correction or export without hunting through the portal

## Admin Device Support Expectations

The teacher/admin web portal must also support an admin-only area for:

- searching students and devices
- viewing trusted-device history and recent security events
- revoking a suspicious binding
- delinking a broken or replaced phone
- approving a verified replacement device

This admin area must stay isolated from teacher-only routes even when a user can operate in both
teacher and admin roles.

The admin device area should now behave as two related but separate steps:

- `Student Support` first for student identity, device state, pending replacement, and recent risk review
- `Device Recovery` second for revoke, deregister-current-phone, and replacement approval actions

The protected admin session should be the primary path into those pages. Any manual token override
must stay secondary and should not be the main experience.

High-risk recovery actions should require:

- a clear support reason
- an explicit confirmation that the request was verified
- preserved audit history after the action completes
- explicit visibility into the current trusted phone, any pending replacement, the latest risk
  event, and the latest recovery action before the admin proceeds
- a strict note that clearing the current phone does not auto-trust a pending replacement

## Analytics Expectations

The web app must provide:

- trend charts
- distribution charts
- class and subject comparisons
- drill-down views for students and sessions
- attendance mode usage analysis

## Email Tool Expectations

The teacher web app must provide:

- manual send to low-attendance students
- automatic daily reminder configuration
- email preview
- email log visibility

## Acceptance Expectations

This part of the app is successful when:

- the teacher and admin route groups are protected by auth-aware layout boundaries
- teacher-only sessions cannot open admin routes, and protected-route login handoff keeps the next-path context intact
- login, teacher, and admin routes are stable and ready for later operational feature work
- dashboard, classroom, semester, session-history, reports, exports, analytics, email automation, devices, and imports routes all bootstrap cleanly
- teacher classroom CRUD, semester management, roster, imports, schedule, stream, and admin device-support workflows are already wired to the current backend with explicit loading and error states
- the admin dashboard keeps student support, device recovery, imports, and semesters visibly separated
- the admin device area keeps student support and account governance separate from guarded recovery actions
- the admin academic-governance area lets an admin search classrooms, review archive impact, and
  archive a classroom safely with a recorded reason instead of hard-deleting history
- the active-session control route and projector route already exist with stable component boundaries for the later QR + GPS implementation
- a teacher can run a QR session from the browser
- a projected rolling QR can be used by students in class
- the teacher can manage history, edits, reports, analytics, and email operations from the same web portal
