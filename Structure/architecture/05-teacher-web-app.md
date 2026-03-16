# Teacher Web App Architecture

Maps to: [`../requirements/05-teacher-web-app.md`](../requirements/05-teacher-web-app.md)

## Purpose

This document explains how the teacher and admin web portal will be implemented in code.

## Reset Implementation Snapshot

The reset-track teacher/admin web architecture is now implemented in the Next.js app.

- separate teacher and admin auth routes are live
- teacher dashboard, classrooms, QR + GPS setup/live screens, history, reports, exports, analytics, and email automation routes are live
- admin dashboard, student support, device recovery, imports, and semester/classroom governance routes are live

## Runtime Stack

`apps/web` will use:

- Next.js App Router
- TypeScript
- TanStack Query for interactive client-side data
- React Server Components for dashboard and report bootstrapping
- polling-based live session refresh with a deferred realtime seam

## Why Next.js App Router

The web app needs a mix of:

- fast authenticated navigation
- data-heavy dashboards
- interactive live session pages
- export and analytics pages

Next.js App Router supports all of these while keeping routing and server/client boundaries explicit.

## Final Web Route Map

The reset track now locks this role-separated web route shape:

```text
apps/web/app/
  login/page.tsx
  login/password/route.ts
  register/page.tsx
  register/password/route.ts
  admin/login/page.tsx
  admin/login/password/route.ts
  (teacher)/teacher/
    layout.tsx
    dashboard/page.tsx
    classrooms/
      new/page.tsx
      page.tsx
      [classroomId]/
        page.tsx
        roster/page.tsx
        imports/page.tsx
        schedule/page.tsx
        stream/page.tsx
        lectures/page.tsx
    sessions/
      start/page.tsx
      active/[sessionId]/page.tsx
      active/[sessionId]/projector/page.tsx
      history/page.tsx
      [sessionId]/page.tsx
    reports/page.tsx
    exports/page.tsx
    analytics/page.tsx
    email-automation/page.tsx
  (admin)/admin/
    layout.tsx
    dashboard/page.tsx
    support/page.tsx
    semesters/page.tsx
    devices/page.tsx
    imports/page.tsx
```

Teacher and admin auth stay separate at the route level even though both continue to use the same backend auth APIs.

Current implementation note:

- teacher signup now uses `POST /auth/register/teacher` behind the web auth client
- successful teacher registration opens a teacher-authenticated session and returns `recommendedNextStep = OPEN_HOME`
- admin still has no matching public registration route, preserving the provisioned-admin model
- `apps/web/app/login/page.tsx` now owns teacher sign in
- `apps/web/app/register/page.tsx` now owns teacher registration
- `apps/web/app/admin/login/page.tsx` now owns admin sign in
- the password form POST routes now stay separated as:
  - `apps/web/app/login/password/route.ts`
  - `apps/web/app/register/password/route.ts`
  - `apps/web/app/admin/login/password/route.ts`
- teacher and admin entry pages now share one typed auth-entry view model without reintroducing a combined role picker

## Current Route Layout

Current implementation note:

- grouped route segments are already in place under `app/(teacher)/teacher` and
  `app/(admin)/admin`
- the public auth entry pages now also stay role-separated outside those grouped portals:
  - `/login`
  - `/register`
  - `/admin/login`
- the operational web workflows now also live under the same grouped tree, including classroom
  create/detail subroutes, classroom roster/import/schedule/stream/lectures pages, and QR active
  session plus projector routes
- legacy ungrouped web routes were removed so the grouped portal layout is now the single source of
  truth
- the next web phases should extend this tree rather than introducing parallel teacher or admin
  roots

## Shared Visual And Copy Foundation

The reset foundation now expects shared web presentation primitives to come from
`packages/ui-web/src/index.ts`.

Current implementation note:

- `webTheme` now centralizes typography, spacing, surface hierarchy, CTA emphasis, and neutral
  dashboard/table/chart framing tokens
- `findWebContentIssues()` now acts as a small content guardrail for shared portal copy so web
  entry, protected-route, and page-model text stay product-facing
- `apps/web/src/web-shell.tsx`, `apps/web/src/web-portal.ts`, `apps/web/app/page.tsx`, and
  the teacher/admin auth entry pages now reuse this shared foundation for cleaner role entry and
  portal framing instead of repeating placeholder-heavy wording per page
- the teacher shell now uses a compact left rail with:
  - active-route highlighting
  - a small account summary
  - shorter navigation descriptions
- the teacher dashboard model now uses spotlight route sections instead of placeholder table/chart
  framing when the goal is to move the teacher into classroom, QR, history, or report work quickly
- `Structure/full-product-screenshot-audit.md` plus
  `Structure/artifacts/full-product-audit/web` now act as the deterministic visual inventory for
  the implemented teacher/admin web route tree

## Page Ownership

Current implementation structure:

- `apps/web/src/teacher-workflows-client.tsx` is the stable route-facing teacher workspace barrel
- `apps/web/src/admin-workflows-client.tsx` is the stable route-facing admin workspace barrel
- large multi-workspace files are now split into smaller workspace modules inside:
  - `apps/web/src/teacher-workflows-client/`
  - `apps/web/src/admin-workflows-client/`
- `shared.tsx` files in those folders now hold the shared cards, fields, bootstrap, and formatting helpers that used to inflate workspace files
- `Structure/codebase-structure.md` is the file-level ownership reference for those folders

### Dashboard

Shows:

- a compact teacher overview header
- route cards for:
  - classrooms
  - QR attendance launch
  - session history
  - reports
- quick links for exports, analytics, and classroom creation
- short status cards that help the teacher choose the next route instead of reading long explainer copy

### Session Create

Owns the teacher flow for selecting:

- classroom
- session duration
- allowed distance
- teacher browser location

Current reset implementation note:

- the teacher web QR launch flow now always uses a teacher-selected browser-location anchor so the
  setup stays short and action-focused
- optional lecture linkage and alternate anchor types remain backend capabilities, but the reset
  web setup route does not surface them in the normal teacher flow

### Classroom Pages

Own:

- course offering creation
- teacher-owned classroom management
- join code management
- schedule calendar editing
- lecture list and roster access

Reset contract behavior:

- teacher web classroom create and edit forms should prefer `courseCode` and `classroomTitle`
  instead of storage-facing field names
- classroom list and detail payloads now include user-ready scope labels plus a `permissions`
  object so teacher and admin pages can render edit, archive, scope-edit, and teacher-reassign
  affordances from the API contract directly
- teacher pages should treat `permissions.canEditAcademicScope = false` and
  `permissions.canReassignTeacher = false` as the default classroom-management boundary, while admin
  pages may surface those capabilities when the response allows them
- teacher and admin roster pages should now also use the shared classroom-student contract:
  - list through `GET /classrooms/:id/students?membershipStatus=...&search=...`
  - add through `POST /classrooms/:id/students`
  - edit membership through `PATCH /classrooms/:id/students/:enrollmentId`
  - remove through `DELETE /classrooms/:id/students/:enrollmentId`
- roster rows now expose:
  - `studentName`
  - `studentIdentifier`
  - `membershipState`
  - `actions`
- web roster tables should use the API-provided `actions` object for block, remove, and reactivate
  affordances instead of reproducing those rules in page-local logic

Current implementation note:

- `apps/web/src/teacher-roster-management.ts` now centralizes teacher-web roster:
  - filter shaping
  - add-student request shaping
  - student identity text
  - API-driven membership action modeling
- `apps/web/src/teacher-workflows-client.tsx` now uses that shared roster helper so the web route
  stays aligned with the reset-era mobile roster flow while still using denser web cards and
  classroom context summaries
- `apps/web/app/(teacher)/teacher/classrooms/[classroomId]/roster/page.tsx` now mounts a
  roster-specific teacher page model instead of reusing the generic classroom-detail shell
- explicit remove on web now goes through `DELETE /classrooms/:id/students/:enrollmentId`, while
  state changes go through `PATCH /classrooms/:id/students/:enrollmentId` with
  `membershipStatus`

### Admin Governance Pages

Own:

- admin dashboard separation for support, recovery, and academic governance
- semester definition and lifecycle
- student support case review
- device recovery actions
- imports oversight

Current reset implementation note:

- `apps/web/src/web-portal.ts` now keeps the admin dashboard focused on three separated lanes:
  - student support
  - device trust recovery
  - academic governance
- `apps/web/app/(admin)/admin/semesters/page.tsx` now combines:
  - semester lifecycle controls
  - classroom archive governance
- `apps/web/app/(admin)/admin/devices/page.tsx` now reads the route mode so:
  - `/admin/devices?view=support` opens the student-support desk with account-state and classroom-context review
  - `/admin/devices` opens the guarded device-recovery desk
- `apps/web/src/admin-workflows-client.tsx` now provides the student-support workspace so admins can search students, inspect governance state, and apply audited deactivate/reactivate/archive actions before they enter device recovery
- `apps/web/src/admin-workflows-client.tsx` now also provides the academic-governance workspace so
  admins can search classrooms, inspect history impact, and archive classrooms with a recorded
  reason after live sessions are closed
- `apps/web/src/admin-device-support-console.tsx` now treats the protected admin session as the
  normal access path and keeps token override secondary instead of making pasted tokens the main
  operating model
- high-risk recovery actions now require a recorded reason plus an explicit verification
  acknowledgement before revoke, clear, or replacement approval can run

### Active Session / Projector Page

Owns:

- rolling QR rendering
- live count display
- live marked-student roster on the teacher control view
- countdown timer
- session end controls
- projector-friendly fullscreen mode

### History and Detail Pages

Own:

- paginated past session list
- filters
- student detail list
- manual edit entry point

Current reset implementation note:

- `apps/web/src/teacher-review-workflows.ts` now centralizes teacher-web session-review filters,
  grouped present/absent roster modeling, correction-state summaries, and teacher-web report view
  models
- `apps/web/src/teacher-workflows-client.tsx` now uses those shared helpers so teacher web session
  history keeps:
  - classroom/class/section/subject/date filters
  - selected-session review
  - grouped present and absent student lists
  - pending correction summary
  - save/reset actions
  on one page instead of splitting review and correction into separate route islands

### Reports and Exports

Own:

- basic report filters
- export job creation
- export job status table

Current reset implementation note:

- `apps/web/app/(teacher)/teacher/reports/page.tsx` now mounts a live report workspace instead of a
  model-only placeholder page
- the report workspace now uses the shared teacher report APIs on one filter scope for:
  - day-wise rows
  - subject-wise rows
  - student-percentage rows
- the teacher web report flow now keeps session-review and export handoffs visible beside the
  filtered output so teachers can move through review, correction, and export without changing
  mental models

### Analytics and Email Automation

Own:

- charts
- filters
- drill-downs
- email rule management
- email log visibility

### Admin Pages

Own:

- device delink and trust review
- roster import monitoring
- semester lifecycle administration
- user support actions inside policy limits

Current implementation note:

- `apps/web/app/(admin)/admin/devices/page.tsx` now provides the first admin device-support console
- the current console now hydrates from the protected web session token, while still allowing a
  manual token fallback during local support work
- the console can search records, load recovery detail, revoke one binding, deregister the current
  trusted phone, and approve a pending or verified replacement install through the live API
- the recovery detail now surfaces the current trusted phone, pending replacement phone, latest
  risk event, latest recovery action, and the next safe admin step from the API instead of leaving
  those decisions implicit in raw binding rows

## Data Fetching Strategy

### Server Components

Use server components for:

- initial dashboard frame
- initial report filter options
- initial semester and classroom filter bootstrapping
- route-level authorization checks
- route-level page model construction

### Client Components

Use client components for:

- live session page
- calendar and schedule editing
- classroom stream interactions
- chart interactions
- filter state changes
- export status polling

This keeps first render efficient while still allowing live interactions.

The current implementation already includes a shared TanStack Query provider at the root layout so later
interactive pages can adopt live queries without a second provider layer.

Current implementation note:

- `apps/web/src/teacher-workflows-client.tsx` now owns the first live teacher web workspaces for
  classroom CRUD, classroom detail, roster management, import monitoring, schedule editing, stream
  posting, teacher QR session setup, and teacher semester visibility
- `apps/web/src/admin-workflows-client.tsx` now owns the first live admin semester-management and
  import-monitoring workspaces
- `apps/web/src/web-workflows.ts` now centralizes route helpers, query keys, schedule draft
  shaping, import parsing, import monitoring aggregation, and QR session models so later route work
  extends the same workflow layer

## Auth and Route Protection

Web auth is currently enforced in two layers:

- auth-aware App Router layouts read the expected web session cookies and evaluate teacher versus
  admin scope before rendering protected content
- the API still enforces teacher role and resource permissions

The web app must never rely on client-side hiding alone for teacher-only functionality.

The same rule applies to admin routes. Role-based route groups are for UX only; the API remains authoritative.

Current implementation note:

- `apps/web/src/web-portal.ts` owns cookie parsing, access evaluation, navigation models, and
  page models
- `apps/web/src/web-auth-entry.tsx` now owns the shared teacher/admin auth-entry models plus
  role-specific error messaging and alternate-link framing
- `apps/web/src/web-shell.tsx` owns the shared portal layout, section cards, table containers, and
  chart containers
- unauthorized users now see an explicit protected-route card with a role-matched sign-in handoff
  instead of an unhandled route failure
- Next.js middleware can still be added later, but the current protected-layout boundary is already
  live and tested
- current route protection tests now explicitly prove sign-in redirects preserve `next` context,
  teacher-only sessions cannot access admin scope, and admin-capable sessions can still enter the
  teacher route group when required for oversight

## Active QR Session Architecture

The active session page is one of the most important screens in the product.

It should be composed from:

- session metadata query
- session-student roster query
- polling or realtime subscription by session ID
- QR renderer component
- timer component
- live counter component
- live roster component

Recommended local component split:

```text
features/teacher-web/active-session/
  ActiveSessionPage.tsx
  SessionHeader.tsx
  RollingQrPanel.tsx
  LiveCounterCard.tsx
  LiveRosterCard.tsx
  SessionTimer.tsx
  EndSessionButton.tsx
```

## Fullscreen / Projector Mode

The QR view should support a dedicated projector-friendly screen with:

- large QR block
- large live count
- minimal distractions
- auto-refreshing QR token

Implementation suggestion:

- separate `active/[sessionId]/projector` client route or fullscreen state
- same underlying session subscription

Current implementation note:

- `apps/web/app/(teacher)/teacher/sessions/start/page.tsx` now owns the dedicated teacher-web QR
  setup route
- `apps/web/src/teacher-qr-session-management.ts` now centralizes QR classroom option shaping,
  setup readiness rules, and create-payload shaping for the web flow
- `apps/web/src/teacher-workflows-client.tsx` now launches QR + GPS sessions from the dedicated
  setup workspace and keeps classroom detail as a short handoff into that route
- `apps/web/src/qr-session-shell.tsx` now polls:
  - `GET /sessions/:sessionId`
  - `GET /sessions/:sessionId/students`
  every 2 seconds while the session is active
- `apps/web/src/teacher-workflows-client.tsx` now keeps teacher history polling aligned to the same
  session-status truth, so history keeps up while a QR session is live and relaxes once no live
  session remains
- the same shell now renders:
  - a large QR stage
  - always-visible timer and live counts
  - a live marked-student roster for the teacher control route
  - a stripped-down projector layout for room-facing display
- realtime transport is still deferred, so the current live-update boundary is polling rather than
  websockets
- current workflow tests now explicitly prove QR create-payload shaping, 2-second polling cadence,
  live session countdown modeling, and marked/absent roster view models
- the shared attendance API now auto-normalizes overdue active sessions on read, so teacher-web
  live QR, history, and review routes stay aligned on the same session status transitions

## Session End Behavior

Ending a QR session should:

1. call the API to mark the session ended
2. immediately disable the live QR renderer
3. transition UI from active mode to summary mode
4. keep edit actions available if inside the edit window

If the API fails, the UI must make the failure explicit because a projector still showing an apparently active QR is dangerous.

## Classroom Management Architecture

Teacher web should support the richer classroom management operations that are harder to do on a phone:

- create and edit classroom / course offering
- define semester linkage
- manage join codes
- manage schedule calendar
- view and manage roster
- upload spreadsheet imports
- create announcements and notify students

Recommended feature folders:

```text
features/teacher-web/classrooms/
features/teacher-web/roster/
features/teacher-web/schedule/
features/teacher-web/announcements/
features/teacher-web/semesters/
```

Current implementation note:

- `apps/web/app/(teacher)/teacher/classrooms/page.tsx` now mounts the live teacher classroom list
  workspace
- `apps/web/app/(teacher)/teacher/classrooms/new/page.tsx` now mounts the classroom create
  workspace
- `apps/web/app/(teacher)/teacher/classrooms/[classroomId]/page.tsx` now mounts the classroom
  detail workspace
- `apps/web/app/(teacher)/teacher/classrooms/[classroomId]/roster/page.tsx` now mounts the roster
  workspace
- `apps/web/app/(teacher)/teacher/classrooms/[classroomId]/imports/page.tsx` now mounts the
  classroom import-status workspace
- `apps/web/app/(teacher)/teacher/classrooms/[classroomId]/schedule/page.tsx` now mounts the local
  draft schedule editor with `Save & Notify`
- `apps/web/app/(teacher)/teacher/classrooms/[classroomId]/stream/page.tsx` now mounts the live
  classroom stream workspace
- `apps/web/app/(teacher)/teacher/semesters/page.tsx` now mounts teacher semester visibility
  rollups from live classroom data
- `apps/web/app/(admin)/admin/devices/page.tsx` mounts the current admin device-support console
- `apps/web/app/(admin)/admin/semesters/page.tsx` now mounts live admin semester CRUD plus
  classroom-governance lifecycle controls
- `apps/web/app/(admin)/admin/imports/page.tsx` and `apps/web/app/(teacher)/teacher/imports/page.tsx`
  now mount aggregated roster-import monitoring workspaces
- the remaining teacher/admin pages use shared page-shell models so data-heavy features can land
  incrementally without changing route ownership
- the teacher classroom list workspace now uses card-based management rows built from reset-ready
  classroom labels so course code, classroom title, teaching scope, attendance mode, join code,
  and classroom actions stay together
- the teacher classroom create workspace now hydrates allowed teaching scopes from
  `GET /teachers/me/assignments` and shapes the create request from:
  - selected teaching scope
  - `classroomTitle`
  - `courseCode`
  - attendance defaults
- the teacher classroom detail workspace now treats classroom detail as the main course-management
  view by keeping:
  - course settings
  - join-code reset
  - archive action
  - QR handoff into `/teacher/sessions/start?classroomId=...`
  - nearby classroom tools
  together inside one page instead of splitting them across route islands

## Roster Import Architecture

Spreadsheet import should be a first-class web workflow.

Flow:

1. teacher or admin uploads CSV/XLSX
2. API creates import job
3. worker parses and validates rows
4. UI shows preview, row errors, and final applied counts

This is more reliable than trying to parse large spreadsheets fully in the browser.

Current implementation note:

- the current web workflow parses normalized row text client-side into `rows` payloads using the
  shared contract schema
- raw CSV/XLSX parsing and object-storage upload are still deferred to a later adapter layer

## Reports Page Architecture

The reports page should use a shared filter state object:

- class
- section
- subject
- date range

Each report card should subscribe to the same filter state and request its own dataset from the API.

This allows independent loading states and simpler caching.

## Chart Architecture

Charts should not compute heavy analytics in the browser. The browser should receive prepared datasets from the backend.

Web chart components should focus on:

- rendering
- legend state
- drill-down interactions

## Export Workflow on Web

When a teacher requests an export:

1. web sends export request to API
2. API creates export job
3. worker builds file asynchronously
4. web polls job status or subscribes to updates
5. completed job returns signed file URL

The web UI should show:

- pending
- processing
- completed
- failed

## Code Layout

```text
apps/web/src/features/teacher-web/
  dashboard/
  classrooms/
  semesters/
  roster/
  schedule/
  announcements/
  session-create/
  active-session/
  session-history/
  session-detail/
  manual-edit/
  reports/
  exports/
  analytics/
  email-automation/

apps/web/src/features/admin/
  dashboard/
  devices/
  imports/
  semesters/
  users/
```

## Testing Strategy

Must include:

- Playwright tests for login and dashboard access
- Google login and role-routing tests
- live session page tests with mocked websocket events
- classroom CRUD and schedule-editing tests
- roster import status tests
- form tests for session creation
- report filter tests
- export job status flow tests

Current implementation note:

- Vitest currently covers portal cookie parsing and route protection in
  `apps/web/src/web-portal.test.ts`
- shared workflow helpers for classroom routes, schedule draft saves, roster-import parsing,
  semester visibility, import monitoring, and QR shell boundaries are now covered in
  `apps/web/src/web-workflows.test.ts`
- shared auth-client route shaping for semester and classroom archive flows is now covered in
  `packages/auth/src/client.test.ts`
- the closeout review also now proves classroom CRUD page-model actions, teacher/admin dashboard
  segregation, admin support shells, guarded recovery-action rules, login-routing handoff, and
  projector shell boundaries before the later QR phase

## Implementation Outcome

When this architecture is complete:

- teachers can run QR sessions from the browser reliably
- the projector view behaves as a true live attendance control surface
- teacher web also supports classroom CRUD, semester setup, roster management, schedules, and announcements
- session-backed admin support and guarded device-recovery tooling exist for device governance and
  academic operations
- reporting, exports, analytics, and email tools are all available in one web portal
