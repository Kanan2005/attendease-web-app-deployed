# Classroom Communications and Roster Architecture

Extends architecture coverage based on the reference-app gap review.

## Purpose

This document defines how classroom join codes, roster management, imports, announcements, and notification fan-out should work.

## Reset Implementation Snapshot

The reset-track classroom hub architecture is now implemented across API, worker, teacher mobile, teacher web, and student mobile.

- join-code, roster CRUD, imports, and classroom-stream flows are live
- student classroom discovery and teacher classroom detail now treat the classroom as the primary product hub
- admin support now reads classroom context without hiding roster changes inside governance-only tools

## Classroom Detail as a Product Hub

The sample reference screens show that a classroom is more than an attendance shell. It is also the place where users expect to find:

- join code
- student list
- stream / announcements
- class session list
- export actions

The architecture should treat classroom detail as a hub backed by multiple focused services.

## Reset Language Model

This area should use one stable product vocabulary:

- `Classroom` in place of `course offering`
- `Roster` and `Students` in place of enrollment-only wording
- `Class session` in place of `lecture` for user-facing copy

Implementation note:

- backend tables and routes may still use `courseOffering`, `enrollment`, and `lecture`
- contracts and mapping helpers should expose classroom, membership, and class-session aliases so UI layers can stay product-first without forcing a storage rename

## Join Code Architecture

Students should be able to join a classroom by entering a teacher-provided code.

Core rules:

- join code belongs to one classroom
- join code can expire or be rotated
- join code may be single active plus historical inactive codes
- join action must validate semester status and duplicate membership

### Join Flow

1. teacher opens classroom and copies active join code
2. student enters code in mobile app
3. API validates code and classroom status
4. API inserts the classroom membership row
5. API logs `JOIN_CODE_USED`
6. student dashboard refreshes

Recommended endpoints:

- `GET /classrooms/:id/join-code`
- `POST /classrooms/:id/join-code/reset`
- `POST /classrooms/join`

Current implementation status:

- join-code lookup and reset now live in `apps/api/src/modules/academic/join-codes.service.ts`
- only one active code remains valid at a time; reset revokes the previous active code
- stale active codes are normalized to `EXPIRED` on read or join attempt before the API returns
- resets emit `classroom.join_code.reset` outbox events for later notifications or stream entries
- duplicate active memberships are rejected during self-join, and `DROPPED` or `BLOCKED` rows cannot be reactivated through join-code reuse

## Enrollment and Membership States

Roster rows should support more than a simple yes/no.

Recommended statuses:

- `ACTIVE`
- `PENDING`
- `DROPPED`
- `BLOCKED`

This helps with scenarios such as:

- imported student not yet activated
- student dropped from course mid-semester
- blocked student account

## Roster Management

Teachers and admins need multiple roster-management modes:

- manual add by email or student identifier
- join code based self-join
- spreadsheet import for bulk onboarding
- remove or deactivate from class

The backend should own all validation for:

- duplicate student rows
- invalid email or identifier formats
- student not found versus auto-invite policy
- semester mismatch

Current implementation status:

- roster list, add, update, and remove flows now live in `apps/api/src/modules/academic/roster.service.ts`
- teacher/admin roster endpoints are exposed under `GET/POST/PATCH/DELETE /classrooms/:id/students`
- self-join lives under `POST /classrooms/join`, and student classroom list lives under `GET /students/me/classrooms`
- `PENDING` members can self-activate through join code, while `DROPPED` and `BLOCKED` members cannot self-reactivate
- teacher/admin manual add can reactivate `PENDING` or `DROPPED` rows but still rejects `BLOCKED`
- manual add now accepts:
  - `studentEmail`
  - `studentIdentifier`
  - `studentRollNumber`
  - `studentUniversityId`
- roster list now accepts `membershipStatus` plus free-text `search`
- roster rows now return shared teacher-surface fields:
  - `studentName`
  - `studentIdentifier`
  - `membershipState`
  - `actions.canBlock`
  - `actions.canRemove`
  - `actions.canReactivate`
- admin student-support detail now reuses roster truth as read-only classroom context so support can see the student's recent memberships without turning account governance into hidden roster mutation
- admin student account deactivate/archive actions do not silently change classroom memberships; roster changes stay on the classroom-student CRUD surface
- teacher mobile now treats roster management as first-class classroom work:
  - a course-context header shows classroom counts and nearby course actions
  - manual add and roster search/filter stay on the same screen as the live roster list
  - row actions such as `Mark Pending`, `Block`, and `Remove` stay visible on each roster card
  - bulk import remains available but sits below normal roster work so the phone flow stays short
- teacher web now treats roster management as first-class classroom work too:
  - a course-context header keeps classroom title, course code, teaching scope, and attendance
    mode visible on the roster page
  - manual add accepts student email or student identifier from the same field
  - filters stay next to the add flow instead of sending the teacher into a separate tool
  - roster rows render student-focused cards with API-driven `Activate`, `Mark Pending`, `Block`,
    and `Remove` actions
  - explicit remove now uses the dedicated classroom-student delete route instead of presenting
    removal as a generic membership-state patch
- `DELETE /classrooms/:id/students/:enrollmentId` now performs the explicit remove flow by moving the classroom-student membership to `DROPPED`
- `PATCH /classrooms/:id/students/:enrollmentId` with `membershipStatus = DROPPED` remains a compatibility alias, but reset-era UI should prefer the explicit remove route
- roster changes emit outbox events so later stream/notification work can build on the same audit trail
- removal emits `classroom.roster.member_removed` so later classroom stream, admin audit, and notification work can distinguish removal from generic status edits
- admin-driven classroom-student removal now also writes `CLASSROOM_STUDENT_REMOVE` audit rows

## Spreadsheet Import Architecture

Bulk roster import should be asynchronous.

Core tables:

- `roster_import_jobs`
- `roster_import_rows`

Flow:

1. teacher or admin uploads CSV/XLSX
2. API stores file metadata and creates import job
3. worker parses rows
4. worker validates each row against user and academic data
5. UI shows preview and row-level errors
6. confirmed rows are applied transactionally

Suggested statuses:

- `UPLOADED`
- `PROCESSING`
- `REVIEW_REQUIRED`
- `APPLIED`
- `FAILED`

Implementation note:

- roster import job creation and detail/list/apply endpoints now live in `apps/api/src/modules/academic/roster-imports.service.ts`
- the worker now validates uploaded roster rows in `apps/worker/src/jobs/roster-import.processor.ts`
- row-level results are persisted to `roster_import_rows`, and reviewed valid rows flow through the same enrollment write rules as manual roster management
- import apply now creates a teacher-only `IMPORT_RESULT` stream post and emits `classroom.roster.import_applied`
- the current API accepts normalized row payloads plus file metadata; raw CSV/XLSX upload parsing and object-storage ingestion are deferred to a later adapter layer

## Classroom Stream / Announcement Architecture

Each classroom should have a stream of teacher-visible and student-visible posts.

Supported post types:

- teacher announcement
- schedule update
- attendance reminder
- import result notice if relevant to teachers

Core table:

- `announcement_posts`

Optional companion table:

- `announcement_receipts` for delivery or read-state tracking

## Announcement Create Flow

1. teacher writes message in classroom stream UI
2. teacher optionally selects `Notify students`
3. API stores announcement post
4. API writes outbox event
5. worker fans out push, in-app, or email notifications
6. stream updates in realtime or on refresh

Current implementation status:

- classroom stream read and create now live in `apps/api/src/modules/academic/announcements.service.ts`
- `GET /classrooms/:id/stream` enforces teacher/admin scope checks and student membership checks
- `POST /classrooms/:id/announcements` supports `TEACHER_ONLY` and `STUDENT_AND_TEACHER` visibility
- student-visible notify-on-post actions emit `classroom.announcement.posted`, which the worker consumes in `apps/worker/src/jobs/announcement-fanout.processor.ts`
- notification fan-out currently uses the `packages/notifications` abstraction with an in-app adapter and stores `announcement_receipts`
- stream writes now follow classroom and semester lifecycle rules, blocking completed/archived classrooms and closed/archived semesters
- student stream reads only return `STUDENT_AND_TEACHER` posts, while teacher and admin reads can include teacher-only operational posts such as import results
- reset v1 keeps announcement posts append-only so classroom history remains simple and auditable

## Notification Channels

The architecture should support:

- in-app notifications
- push notifications
- email fallback for important classroom updates

Channel selection should be policy-driven. Not every stream post must send an email.

## Save and Notify Coupling

Schedule edits and roster imports may create automatic stream entries and notifications.

Examples:

- recurring class added
- extra lecture added for a date
- class cancelled
- roster import completed

This creates a coherent classroom activity timeline instead of silent backend changes.

## Classroom Page Contracts

Recommended classroom detail endpoints:

- `GET /classrooms/:id`
- `GET /classrooms/:id/students`
- `GET /classrooms/:id/stream`
- `GET /classrooms/:id/lectures`
- `GET /classrooms/:id/schedule`

Product note:

- the current `lectures` endpoint is the transport seam for the classroom's class-session list

Recommended post endpoints:

- `POST /classrooms/:id/announcements`

Deferred after reset:

- `PATCH /classrooms/:id/announcements/:postId`
- `DELETE /classrooms/:id/announcements/:postId`

## Realtime Considerations

Realtime is optional but useful for:

- teacher seeing stream updates after posting
- student seeing new announcements without full reload
- roster count updating after imports complete

If realtime is not enabled for stream initially, polling can be used with an upgrade path later.

## UI Architecture

### Student Mobile

Should expose:

- join-classroom modal
- classroom stream
- lecture list
- schedule view

Current integration status:

- `apps/mobile/src/classroom-communications.ts` now provides the first student stream integration seam and preview modeling
- the mobile shell now surfaces joined-classroom stream preview copy and explains that teacher-only posts stay hidden from student views
- `apps/mobile/app/(student)/classrooms/index.tsx` plus `apps/mobile/src/student-foundation.tsx` now provide a dedicated student classroom-discovery route
- `apps/mobile/src/student-workflow-models.ts` now shapes classroom discovery cards and classroom-detail summary cards from the same classroom, lecture, schedule, and announcement queries used elsewhere in the student app
- student classroom cards now surface active attendance-session state and direct `Updates` / `Schedule` entry points so attendance actions stay attached to the right classroom context

### Teacher Mobile

Should expose:

- join code view and copy
- announcement composer
- student list
- import trigger if supported on device

Current integration status:

- `apps/mobile/src/classroom-communications.ts` now also provides teacher stream and roster-import preview helpers
- the shared mobile shell now exposes roster-import and classroom-stream integration copy for later teacher mobile screens

### Teacher Web

Should expose:

- richer roster tables
- spreadsheet import monitoring
- more comfortable announcement and schedule management

Current integration status:

- `apps/web/src/teacher-classroom-console.tsx` and `apps/web/app/teacher/classrooms/page.tsx` now provide the first working teacher/admin classroom hub
- the web shell can load classrooms, join codes, roster counts, announcements, import-job summaries, and post new classroom announcements through the live API

## Code Layout

```text
apps/api/src/modules/academic/
  join-codes.service.ts
  roster.service.ts
  roster-imports.service.ts
  classroom-communications.controller.ts
  announcements.service.ts

apps/worker/src/jobs/
  roster-import.processor.ts
  announcement-fanout.processor.ts

apps/web/src/
  classroom-communications.ts
  teacher-classroom-console.tsx

apps/mobile/src/
  classroom-communications.ts

packages/notifications/
  src/index.ts
```

## Testing Strategy

Must include:

- join code success and expiry tests
- duplicate membership tests
- spreadsheet import parsing and validation tests
- announcement post and notify tests
- classroom stream visibility tests for student versus teacher
- import apply tests for valid, duplicate, and rejected rows

Current coverage status:

- API integration tests now cover join-code rotation and expiry, stream visibility, notify-event creation, roster import creation, and apply-guard behavior
- API unit tests now also cover duplicate, blocked, and dropped self-join rejection, teacher-only versus student-visible stream filtering, notify-on-post outbox creation, and import apply outcomes for valid and duplicate rows
- worker tests now cover roster import row validation, duplicate-row detection, announcement fan-out, and receipt persistence
- shared client tests now cover classroom stream and roster import route shaping for web/mobile consumers

## Implementation Outcome

When this architecture is complete:

- classrooms support self-join, managed rosters, announcements, and imports
- teachers can manage students and communications without leaving the platform
- students receive a clearer classroom experience than a bare attendance-only app
