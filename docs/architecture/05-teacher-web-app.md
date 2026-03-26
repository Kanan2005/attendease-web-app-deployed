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

The reset foundation expects shared web presentation primitives to come from
`packages/ui-web/src/index.ts`.

Detailed implementation notes for the visual system, route workspaces, QR live shell, reporting,
and validation now live in
[`./05-teacher-web-app-implementation-notes.md`](./05-teacher-web-app-implementation-notes.md).

## Page Ownership

Current implementation structure is documented in the companion implementation note so this main
architecture doc can stay focused on route boundaries and data ownership.

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

Implementation-specific roster notes now live in the companion web implementation note.

### Admin Governance Pages

Own:

- admin dashboard separation for support, recovery, and academic governance
- semester definition and lifecycle
- student support case review
- device recovery actions
- imports oversight

Current admin implementation notes now live in the companion web implementation note.

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

Current history/detail implementation notes now live in the companion web implementation note.

### Reports and Exports

Own:

- basic report filters
- export job creation
- export job status table

Current reporting implementation notes now live in the companion web implementation note.

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

Use server components for route-level authorization and first-pass page bootstrapping, and use
client components for live session control, editing, and interactive filters.

More detailed implementation notes now live in the companion web implementation note.

## Auth and Route Protection

Web auth is currently enforced in two layers:

- auth-aware App Router layouts read the expected web session cookies and evaluate teacher versus
  admin scope before rendering protected content
- the API still enforces teacher role and resource permissions

The web app must never rely on client-side hiding alone for teacher-only functionality.

The same rule applies to admin routes. Role-based route groups are for UX only; the API remains authoritative.

Detailed route-protection implementation notes now live in the companion web implementation note.

## Active QR Session Architecture

The active QR screen remains a flagship surface built from session metadata, roster state, a live
count, timer, and a projector-friendly presentation mode.

The implementation-specific shell split, polling details, and projector notes now live in the
companion web implementation note.

## Session End Behavior

Ending a QR session should:

1. call the API to mark the session ended
2. immediately disable the live QR renderer
3. transition UI from active mode to summary mode
4. keep edit actions available if inside the edit window

If the API fails, the UI must make the failure explicit because a projector still showing an apparently active QR is dangerous.

## Classroom Management Architecture

Teacher web remains the richer classroom-management surface for CRUD, schedule editing, roster
work, announcements, and import oversight.

Detailed workspace ownership notes now live in the companion web implementation note.

## Roster Import Architecture

Roster import remains a first-class teacher/admin web workflow backed by async import processing and
clear status reporting.

## Delivery Notes

Reports, charts, exports, code layout, testing, and detailed implementation notes now live in
[`./05-teacher-web-app-implementation-notes.md`](./05-teacher-web-app-implementation-notes.md).
