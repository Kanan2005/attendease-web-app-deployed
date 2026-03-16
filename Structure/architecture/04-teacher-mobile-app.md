# Teacher Mobile App Architecture

Maps to: [`../requirements/04-teacher-mobile-app.md`](../requirements/04-teacher-mobile-app.md)

## Purpose

This document explains how the teacher-facing mobile experience will be implemented.

## Reset Implementation Snapshot

The reset-track teacher mobile architecture is now implemented in the shared Expo app.

- teacher role entry and teacher registration/sign-in are live
- classroom CRUD, roster management, Bluetooth session control, session review, correction, reports, and export entrypoints are live
- teacher mobile now shares correction-review wording and polling semantics with teacher web

## Scope

Teacher mobile lives inside the same React Native application as the student experience, but uses a separate route group, query keys, and permission set.

## Final Teacher-Mobile Route Map

The reset track now locks this teacher-mobile route shape:

```text
apps/mobile/app/
  index.tsx
  (entry)/
    student/sign-in.tsx
    student/register.tsx
    teacher/sign-in.tsx
    teacher/register.tsx
  (teacher)/
    index.tsx
    classrooms/
      index.tsx
      [classroomId].tsx
      [classroomId]/roster.tsx
      [classroomId]/schedule.tsx
      [classroomId]/announcements.tsx
      [classroomId]/lectures.tsx
    bluetooth/
      create.tsx
      active/[sessionId].tsx
    sessions/
      index.tsx
      [sessionId].tsx
      [sessionId]/edit.tsx
    reports/
      index.tsx
    exports/
      index.tsx
```

## Current Route Structure

The current teacher route group is already implemented as:

```text
apps/mobile/app/
  index.tsx
  (entry)/
    student/sign-in.tsx
    student/register.tsx
    teacher/sign-in.tsx
    teacher/register.tsx
  (teacher)/
    index.tsx
    bluetooth/create.tsx
    bluetooth/active/[sessionId].tsx
    classrooms/index.tsx
    classrooms/[classroomId].tsx
    classrooms/[classroomId]/roster.tsx
    classrooms/[classroomId]/schedule.tsx
    classrooms/[classroomId]/announcements.tsx
    classrooms/[classroomId]/lectures.tsx
    reports/index.tsx
    exports/index.tsx
```

## Feature Modules

```text
apps/mobile/src/
  teacher-foundation.tsx
  teacher-classroom-management.ts
  teacher-roster-management.ts
  teacher-session.tsx
  teacher-query.ts
  teacher-routes.ts
  teacher-models.ts
  teacher-view-state.ts
  teacher-operational.ts
  teacher-schedule-draft.ts
```

Current implementation structure:

- `apps/mobile/src/teacher-foundation.tsx` is now the stable route-facing barrel
- `apps/mobile/src/teacher-foundation/index.ts` is the role-local export map
- teacher screens now live one-per-file inside `apps/mobile/src/teacher-foundation/` wherever a multi-screen file previously hid several workflows together
- `queries.ts` and `shared-ui.tsx` now act as the support boundary for shared teacher data and UI primitives
- `Structure/codebase-structure.md` is the file-level ownership reference for this folder

Later slices should keep extending this existing route group instead of building a second teacher
navigation tree.

The shared entry layer now sits in front of that route group:

- `apps/mobile/app/index.tsx` renders the neutral role-choice landing screen
- `apps/mobile/app/(entry)` owns the teacher and student sign-in/register screens
- `apps/mobile/app/(teacher)/_layout.tsx` redirects unauthenticated teacher access back to the teacher sign-in screen

## Shared Visual And Copy Foundation

The reset foundation now expects teacher-mobile presentation primitives to come from
`packages/ui-mobile/src/index.ts`.

Current implementation note:

- teacher-mobile now shares `mobileTheme` spacing, typography, color, and surface hierarchy tokens
- shared entry-copy helpers in `apps/mobile/src/shell.ts` now keep student and teacher first-run
  language aligned with the reset IA instead of repeating developer-facing wording in screen-local
  components
- later teacher-mobile prompts should continue reusing these shared content helpers rather than
  introducing one-off copy rules inside feature screens
- `Structure/full-product-screenshot-audit.md` plus
  `Structure/artifacts/full-product-audit/mobile/teacher` now act as the deterministic visual
  inventory for the implemented teacher-mobile route tree

## Teacher Role Bootstrapping

When a teacher logs in on mobile:

1. auth context resolves current role
2. teacher-home queries teacher assignments
3. session creation form is built from those assignments

Teacher-specific data must use separate query keys from student data to avoid cache contamination.

The current implementation already uses a dedicated `TeacherSessionProvider`, teacher-only query
keys in `teacher-query.ts`, and a separate teacher route helper module in `teacher-routes.ts` to
keep teacher navigation and cache state isolated from the student route group.

Teacher self-registration now also uses the same bootstrapping boundary:

1. mobile signup calls `POST /auth/register/teacher`
2. backend creates the teacher user, role, credential, and profile
3. auth response returns an active teacher session plus `recommendedNextStep = OPEN_HOME`
4. the mobile app can then land directly in the teacher-owned navigation tree without a mixed-role or student-default bootstrap layer

## Teacher Home Implementation

Teacher home is now composed from:

- `GET /auth/me`
- `GET /academic/assignments/me`
- `GET /classrooms`
- `GET /sessions` for live and recent attendance-session history

It should show:

- a teacher-home status banner derived from session, loading, and classroom/live-session state
- one spotlight card with the strongest next action
- a concise top-level action row for Bluetooth attendance, classrooms, history, reports, and exports
- classroom highlight cards with direct links into classroom detail, roster, schedule, and Bluetooth attendance
- summary metrics
- recent attendance-session rows backed by the teacher session-history API

Current implementation note:

- `apps/mobile/src/teacher-foundation.tsx` now uses `useTeacherAttendanceSessionsQuery()` on home
  instead of lecture-only fallback activity for the recent-session section
- `apps/mobile/src/teacher-models.ts` now shapes:
  - spotlight actions
  - classroom highlight cards
  - recent session preview rows
- `apps/mobile/src/teacher-view-state.ts` now owns the teacher-home loading, empty, live-session,
  and ready-state copy so screen components do not duplicate status logic
- `apps/mobile/src/teacher-routes.ts` now exposes `teacherRoutes.home` as the canonical teacher
  root route alias, while keeping `teacherRoutes.dashboard` compatible for existing internal calls

## Teacher Classroom Management

Teacher mobile should support a classroom-centric flow similar to the reference product:

- create or open classroom
- view join code
- view stream / announcements
- view lecture list
- view student roster
- view schedule context
- inspect roster-import status
- later start Bluetooth attendance from classroom context

Recommended classroom endpoints:

- `GET /classrooms`
- `POST /classrooms`
- `GET /classrooms/:id`
- `POST /classrooms/:id/join-code/reset`
- `GET /classrooms/:id/students`
- `PATCH /classrooms/:id/students/:enrollmentId`
- `DELETE /classrooms/:id/students/:enrollmentId`
- `GET /classrooms/:id/schedule`
- `GET /classrooms/:id/stream`
- `POST /classrooms/:id/announcements`
- `GET /classrooms/:id/lectures`
- `POST /classrooms/:id/lectures`
- `GET /classrooms/:id/roster-imports`

The current mobile app already follows this classroom-centric navigation pattern and exposes
roster, schedule, announcements, lectures, and join-code reset as classroom-owned subroutes.

Reset contract behavior:

- teacher mobile classroom create and edit requests should prefer `courseCode` and
  `classroomTitle`
- `GET /classrooms` and `GET /classrooms/:id` now return classroom labels and a `permissions`
  object so mobile screens can show or hide edit and archive affordances without duplicating policy
  logic
- teacher-mobile classroom flows should treat `permissions.canEditCourseInfo` and
  `permissions.canArchive` as the source of truth for course-edit and archive controls

Current implementation note:

- `apps/mobile/src/teacher-classroom-management.ts` now owns the pure draft, scope-label, request,
  dirty-state, and supporting-text helpers for teacher classroom create/edit/archive flows
- `apps/mobile/src/teacher-foundation.tsx` now uses those helpers to keep classroom-management UI
  logic small while still calling the live shared classroom APIs
- `apps/mobile/src/teacher-view-state.ts` now also owns the loading, empty, and ready-state copy
  for the teacher classroom-management screen

Teacher-mobile classroom management now works like this:

1. `Classrooms` loads teacher assignments plus teacher-visible classrooms
2. scope options are derived from labeled assignment summaries
3. teacher can create a classroom inline with:
   - selected teaching scope
   - classroom title
   - course code
4. on success, the app routes directly to the new classroom detail screen
5. classroom detail uses the shared classroom `permissions` object to decide whether:
   - course info edit controls are shown
   - archive controls are shown
6. course-info save uses `PATCH /classrooms/:id`
7. archive uses `POST /classrooms/:id/archive`

This keeps teacher mobile aligned with teacher web on API shape while preserving a shorter
task-oriented phone flow.

## Bluetooth Session Creation Architecture

The teacher starts from `bluetooth/create.tsx`.

Flow:

1. fetch teacher assignments
2. select class, section, subject
3. set optional duration
4. call `POST /sessions/bluetooth`
5. receive session metadata and BLE broadcast config
6. initialize native BLE advertiser
7. navigate to active session screen

This separation matters because a session should exist in the backend before device advertising starts.

Teachers should be able to launch the Bluetooth session either:

- directly from a classroom detail page, or
- from a quick create session flow

This Bluetooth flow is now implemented on top of the current teacher-mobile
tree, so later BLE hardening can extend the existing routes instead of replacing them.

The current operational slice now adds:

- a Bluetooth create route that uses live classroom plus lecture context
- a setup-status model that turns create-route state into short teacher-facing guidance for:
  - classroom required
  - setup ready
  - setup in progress
  - setup failed
- a live active-session route that keeps native BLE advertiser state and backend session state in
  one place
- an active-status model that separates:
  - live broadcast
  - stopped broadcast
  - permission-required
  - failed broadcast
  - ended session
- a native BLE bridge wrapper so later advertiser hardening can stay behind the same TypeScript
  service boundary
- a classroom-context route helper so dashboard, detail, roster, schedule, stream, lecture, and
  Bluetooth links all stay inside one classroom-centric navigation contract
- teacher-session enforcement helpers so teacher mobile queries reject any session that is not
  actually operating in the `TEACHER` role

The create route is now intentionally task-shaped instead of generic:

- a top banner shows whether the selected classroom context is ready for Bluetooth start
- the setup card keeps classroom, class-session, duration, and token-rotation context visible
- the classroom picker uses selectable course cards so the teacher can choose and start from the
  same phone flow without leaving the route

## Active Bluetooth Session Screen

The active session screen should coordinate three things:

- backend session state
- local BLE advertiser state
- optional live count subscription

Recommended hooks:

- `useTeacherBluetoothSession(sessionId)`
- `useBluetoothAdvertiser(sessionConfig)`
- `useSessionRealtimeCounter(sessionId)`

The screen must protect against accidental exit by showing a confirmation dialog before leaving an active session.

The current active-session route already models:

- ready
- advertising
- stopped
- permission required
- failure / retry
- backend session-end retry

The current operational slice also already exposes recovery actions for:

- advertiser start failure
- Bluetooth-disabled or unavailable state
- stopped advertiser recovery without leaving the active-session route
- retrying session end after a failed backend request

The active route now separates those concerns into:

- a live-session summary card with status, counts, and last payload snapshot
- a `Broadcast Controls` card for retry, refresh, and pause/resume actions
- an `End Session` card that keeps teardown explicit and away from transient advertiser recovery
- a post-session navigation card that links back to setup, session history, and classroom detail

This keeps the screen ready for the later BLE hardening phase without forcing a route or state-model
rewrite.

## Session Ending Logic

Ending a session should follow this order:

1. stop BLE advertiser locally
2. call `POST /sessions/:id/end`
3. invalidate history queries
4. navigate to session detail screen

If the API call fails after advertiser stops, the screen should retry or offer recovery because the backend session must not remain active forever.

The current route now keeps that retry model in a shared teacher-operational helper so later native
BLE hardening does not need to redesign the active-session contract. The current implementation now
also performs the clean handoff automatically: once the session-end request succeeds, the route
replaces itself with the teacher session-detail screen for the saved attendance session.

The active Bluetooth route now also polls `GET /sessions/:id/students` while the session is live
and renders a grouped present-versus-absent roster card so the teacher can confirm marked students
before closing Bluetooth attendance.

The current mobile live-session seam is now intentionally aligned with the other clients:

- `GET /sessions` drives teacher home and history summaries
- `GET /sessions/:id` drives live-detail status and session-summary cards
- `GET /sessions/:id/students` drives grouped live roster truth
- polling now stays short only while the session is active, then relaxes automatically once the
  backend status is no longer live

## Teacher History and Session Detail

History and session detail reuse the same API dataset as teacher web.

Core endpoints:

- `GET /sessions`
- `GET /sessions/:id`
- `GET /sessions/:id/students`

The mobile app should use paginated list screens to keep memory use stable.

Current mobile behavior:

- history splits `Live Now` and `Past Sessions` so the teacher can open the correct context quickly
- session detail keeps polling the shared detail API while a session is active
- the mobile screen derives grouped present and absent sections from the shared student-list API
- the same active/live status model now drives teacher home, history, live detail, and correction detail so `ACTIVE`, `ENDED`, and `EXPIRED` transitions do not drift between screens
- once the edit window opens, row actions toggle draft state between present and absent without
  mutating the backend immediately
- one save request sends the accumulated draft through `PATCH /sessions/:id/attendance`
- successful save leaves the screen on the same session detail and refreshes grouped counts
- the history route now also derives a top summary block from the same session list so the teacher
  can see live count, saved count, open correction windows, and marked-student totals before
  opening a row
- session detail now derives a compact review-summary model from the shared detail plus student APIs
  so present/absent totals, attendance percentage, correction status, and timing stay visible
  without reading every list row first
- present/absent row actions now use correction-oriented labels (`Move To Present`,
  `Move To Absent`) while still submitting the same shared attendance diff payload

## Student Roster Management

Teacher mobile should let teachers inspect and manage class rosters.

Expected capabilities:

- view current student list
- manually add student by email or identifier when allowed
- search and filter by roster state without leaving the roster route
- see course-context counts so the teacher knows which class they are editing
- edit membership state from the same screen when the API exposes a matching action
- trigger spreadsheet import from document picker
- remove or deactivate a student from the classroom roster when policy allows

The heavy validation still belongs in the backend import or roster service.

The current teacher-mobile app already supports live roster listing, roster state changes,
join-code reset, and roster-import status visibility. Raw document-picker upload remains a later
UI slice even though the backend import lifecycle is already live.

The current teacher roster route now also includes:

- a course-context summary card with classroom title, support text, and active/pending/blocked counts
- manual add against `POST /classrooms/:id/students`
- student search through `GET /classrooms/:id/students?membershipStatus=...&search=...`
- a dedicated filter bar for `All`, `Active`, `Pending`, `Blocked`, and `Removed`
- explicit student removal against `DELETE /classrooms/:id/students/:enrollmentId`
- direct roster member action buttons rendered from the shared API action model
- import trigger against `POST /classrooms/:id/roster-imports`
- reviewed import apply against `POST /classrooms/:id/roster-imports/:jobId/apply`
- a layout where bulk import sits below normal roster work so normal classroom operations stay short and phone-first

Reset roster contract behavior:

- manual add can now resolve a student from:
  - `studentIdentifier`
  - `studentRollNumber`
  - `studentUniversityId`
  - `studentEmail`
- roster rows now return:
  - `studentName`
  - `studentIdentifier`
  - `membershipState`
  - `actions`
- teacher-mobile row actions should be driven by the API-provided `actions` object rather than by
  recreating block/remove/reactivate rules locally
- `apps/mobile/src/teacher-roster-management.ts` now owns the pure filter, request-shaping, row-action,
  and result-summary helpers so the roster route can stay product-focused without duplicating API rules

## Schedule and Lecture Architecture

Teacher mobile should support lightweight schedule editing from a calendar-style flow:

- add recurring weekly slot
- add extra one-off class
- cancel or reschedule a date
- save and notify students

A lecture list page should also allow:

- manual lecture creation
- viewing past and planned lectures
- drilling into lecture/session detail

The detailed scheduling rules live in the dedicated academic and scheduling architecture doc, but mobile must expose the teacher-facing controls.

The current app exposes the read side of this architecture through:

- `GET /classrooms/:id/schedule`
- `GET /classrooms/:id/lectures`
- `POST /classrooms/:id/lectures`

It also reuses the earlier scheduling preview helper so weekly slots and date-specific exceptions
already render in a teacher-friendly schedule screen.

The current teacher schedule route now also introduces a local draft layer in
`teacher-schedule-draft.ts` so the mobile client can:

- stage recurring slot changes
- stage one-off, cancelled, and rescheduled exceptions
- batch those changes into the existing `save-and-notify` endpoint
- discard the local draft without mutating the backend

## Announcements / Stream Architecture

The classroom detail page should include a stream tab for:

- teacher announcements
- schedule change posts
- attendance-related notices

Teachers should be able to create a post, choose whether to notify students immediately, and view delivery state.

The current teacher-mobile app already provides a classroom announcements route that reads
the live stream and posts announcements with visibility and notify options against the real API.

That route now acts as the classroom stream composer and list view for teacher mobile.

## Manual Edit Architecture

If a session is still editable:

- session detail screen shows an `Edit Attendance` action
- edit screen fetches the roster snapshot
- each student row allows toggling present or absent
- save action sends a diff payload to `PATCH /sessions/:id/attendance`

The backend remains the only source of truth for the 24-hour rule. The mobile UI should only hide controls as a convenience, not as a security boundary.

## Reports and Exports

Teacher mobile should not try to reproduce the full analytics dashboard. Instead it will focus on compact read models and shareable exports.

API endpoints:

- `GET /reports/daywise`
- `GET /reports/subjectwise`
- `GET /reports/students/percentages`
- `POST /exports`
- `GET /exports/:jobId`

For file delivery, the mobile client should:

- poll export status
- receive signed download URL when ready
- open native share sheet or save location

Session history, manual-edit, and export-job flows are now live in the teacher-mobile phase.
Bluetooth session creation and active-session control are also live. Teacher mobile reports now use
the final teacher report APIs instead of lecture-coverage fallback cards.

The current operational slice now adds:

- a teacher reports route that consumes day-wise, subject-wise, and student-percentage report rows
  from the shared backend with mobile-friendly classroom and subject filters
- an exports route that now queues real export jobs and opens signed downloads from the shared
  backend instead of hardcoding fake success
- an export request state helper that already models disabled and submitting button states so the
  live export-job phase can keep reusing the existing route
- teacher query-key coverage for Bluetooth, reports, and export route invalidation boundaries
- report row mapping now also derives:
  - attendance labels
  - follow-up labels
  - freshness labels
  - tone hints
  so the teacher-report screen can stay card-based and readable without duplicating formatting logic
- the reports route now keeps the export entry point next to the review summary instead of making
  export a disconnected follow-up screen

## Google Login Support

Teacher mobile must support Google login because the reference flows and institutional usage patterns strongly suggest Google-based identity is a common entry path.

Implementation:

- Google SDK launch from mobile
- backend token exchange
- role resolution
- teacher route bootstrap after successful exchange

The current mobile app already includes teacher development bootstrap envs and a dedicated
teacher session provider, so Google-based teacher bootstrap can slot into the same role-aware route
group without changing the surrounding navigation model.

## Device Constraints

Teacher mobile is the most hardware-sensitive client in the system.

Important implementation rules:

- Bluetooth advertising is foreground-only in v1
- the app must not assume it can power Bluetooth on by itself
- if the teacher backgrounds the app, the UI should warn that session reliability may be affected
- document picker integration is needed if mobile supports roster spreadsheet import

## Logging and Recovery

Teacher mobile should emit client telemetry for:

- advertiser failed to start
- session create succeeded but advertiser failed
- session end attempted while offline

This is useful because classroom failures on mobile are hard to reproduce otherwise.

## Testing Strategy

Must include:

- unit tests for session create and end controllers
- unit tests for classroom create and join-code reset UI flows
- unit tests for teacher-session role gating, classroom-context navigation, query invalidation
  targets, Bluetooth recovery-state handling, and export-request state handling
- mocked native BLE tests
- integration tests for manual edit API flows
- E2E tests for teacher Google login, classroom creation, session creation, and history review

## Implementation Outcome

When this architecture is complete:

- teachers can run Bluetooth sessions from their phones
- teachers can manage classrooms, roster views, schedules, and announcements from mobile where appropriate
- the app stays aligned with backend session state
- history, manual edits, and exports remain available on mobile

The current implementation closes the current teacher-mobile phase with:

- a stable teacher route group plus classroom-centric navigation tree
- verified teacher-role bootstrap and query boundaries
- live classroom, roster, schedule, stream, lecture, and join-code management
- Bluetooth create plus active-session routes that are already structured for later native BLE
  refinement
- report and export workflow routes that now consume the live report and export backends
