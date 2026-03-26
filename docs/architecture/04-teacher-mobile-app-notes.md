# Teacher Mobile App Notes

This companion note keeps detailed implementation, recovery, and validation notes for the teacher-mobile architecture.

## Route And Module Notes

Current route tree:

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

Supporting modules:

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

## Visual And Bootstrapping Notes

- teacher mobile reuses shared `mobileTheme` tokens from `packages/ui-mobile`
- shared entry copy stays aligned through common shell/content helpers
- `TeacherSessionProvider`, teacher-only query keys, and teacher route helpers keep teacher state isolated from the student route group
- teacher registration returns an authenticated teacher session plus `OPEN_HOME`

## Classroom, Bluetooth, History, And Roster Notes

- classroom management uses shared API permissions for edit/archive affordances
- Bluetooth create is task-shaped around classroom context, duration, and readiness
- active-session routes model ready, advertising, stopped, permission-required, failure, and retry states
- live Bluetooth polling stays aligned with `GET /sessions`, `GET /sessions/:id`, and `GET /sessions/:id/students`
- history, correction, and grouped present/absent sections reuse the same session truth as teacher web
- roster routes drive actions from the API-provided `actions` model and keep bulk import secondary to day-to-day roster work

## Schedule, Stream, Reports, And Exports Notes

- schedule routes layer local draft editing on top of live schedule data
- announcements routes already act as the teacher-mobile classroom stream composer and list view
- report routes use the final teacher report APIs with card-based mobile summaries
- export routes queue real export jobs and open signed downloads from the shared backend

## Google Login Notes

Teacher mobile Google login is expected to use:

- Google SDK launch from mobile
- backend token exchange
- role resolution
- teacher route bootstrap after successful exchange

## Device Constraints

Teacher mobile is the most hardware-sensitive client in the system.

Important rules:

- Bluetooth advertising is foreground-only in v1
- the app must not assume it can power Bluetooth on by itself
- if the teacher backgrounds the app, the UI should warn that session reliability may be affected
- document picker integration is needed if mobile supports roster spreadsheet import

## Logging And Recovery

Teacher mobile should emit client telemetry for:

- advertiser failed to start
- session create succeeded but advertiser failed
- session end attempted while offline

## Testing Strategy

Must include:

- unit tests for session create/end controllers
- unit tests for classroom create and join-code reset flows
- unit tests for teacher-session role gating, classroom navigation, query invalidation, Bluetooth recovery states, and export-request states
- mocked native BLE tests
- integration tests for manual edit API flows
- E2E tests for teacher Google login, classroom creation, session creation, and history review

## Implementation Outcome

When complete, teacher mobile provides:

- Bluetooth attendance sessions from the phone
- classroom, roster, schedule, stream, and join-code management
- backend-aligned live session state
- history, manual edits, reports, and exports on mobile
