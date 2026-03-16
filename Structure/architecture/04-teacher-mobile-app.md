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

## Route And Module Notes

The detailed current route tree, module layout, and route-facing implementation structure now live
in [`./04-teacher-mobile-app-notes.md`](./04-teacher-mobile-app-notes.md).

## Shared Visual And Copy Foundation

The reset foundation now expects teacher-mobile presentation primitives to come from
`packages/ui-mobile/src/index.ts`.

Detailed visual-system implementation notes now live in the companion teacher-mobile notes doc.

## Teacher Role Bootstrapping

When a teacher logs in on mobile:

1. auth context resolves current role
2. teacher-home queries teacher assignments
3. session creation form is built from those assignments

Teacher-specific data must use separate query keys from student data to avoid cache contamination.

Detailed bootstrapping implementation notes now live in the companion teacher-mobile notes doc.

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

Teacher-home implementation details now live in the companion teacher-mobile notes doc.

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

Detailed classroom-management implementation notes now live in the companion teacher-mobile notes doc.

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

Detailed Bluetooth setup implementation notes now live in the companion teacher-mobile notes doc.

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

Detailed active-session implementation notes now live in the companion teacher-mobile notes doc.

## Session Ending Logic

Ending a session should follow this order:

1. stop BLE advertiser locally
2. call `POST /sessions/:id/end`
3. invalidate history queries
4. navigate to session detail screen

If the API call fails after advertiser stops, the screen should retry or offer recovery because the backend session must not remain active forever.

Detailed session-end and live-polling notes now live in the companion teacher-mobile notes doc.

## Teacher History and Session Detail

History and session detail reuse the same API dataset as teacher web.

Core endpoints:

- `GET /sessions`
- `GET /sessions/:id`
- `GET /sessions/:id/students`

The mobile app should use paginated list screens to keep memory use stable.

Detailed history and correction implementation notes now live in the companion teacher-mobile notes doc.

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

Detailed roster implementation notes now live in the companion teacher-mobile notes doc.

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

Detailed schedule and lecture implementation notes now live in the companion teacher-mobile notes doc.

## Announcements / Stream Architecture

The classroom detail page should include a stream tab for:

- teacher announcements
- schedule change posts
- attendance-related notices

Teachers should be able to create a post, choose whether to notify students immediately, and view delivery state.

Detailed announcements implementation notes now live in the companion teacher-mobile notes doc.

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

Detailed report and export implementation notes now live in the companion teacher-mobile notes doc.

## Google Login Support

Teacher mobile must support Google login because the reference flows and institutional usage patterns strongly suggest Google-based identity is a common entry path.

Implementation:

- Google SDK launch from mobile
- backend token exchange
- role resolution
- teacher route bootstrap after successful exchange

Google-login implementation notes now live in the companion teacher-mobile notes doc.

## Delivery Notes

Device constraints, logging, testing, and detailed implementation outcomes now live in
[`./04-teacher-mobile-app-notes.md`](./04-teacher-mobile-app-notes.md).
