# Academic Management and Scheduling Architecture

Extends architecture coverage based on the reference-app gap review.

## Purpose

This document defines how semesters, classrooms, schedules, class sessions, and academic CRUD flows should be implemented.

## Reset Implementation Snapshot

The reset-track academic management architecture is now implemented in backend services plus teacher/admin clients.

- classroom CRUD, schedule flows, class-session linkage, and admin classroom archive governance are live
- teacher mobile and teacher web now share the same classroom/course-code vocabulary and contract shapes
- archived classrooms preserve attendance history and governance audit context

## Current Backend Foundation Status

Implemented now:

- admin semester CRUD and lifecycle endpoints
- teacher/admin classroom CRUD endpoints
- admin classroom-governance list/detail/archive endpoints for safe lifecycle review
- recurring weekly slot create and update endpoints
- one-off, cancelled, and rescheduled class exception endpoints
- schedule `Save & Notify` transaction flow with `schedule.changed` outbox events
- teacher/admin lecture list and lecture create endpoints
- lecture-link helper logic for future attendance-session attachment
- shared Zod contracts for semesters, classrooms, schedule structures, and lectures
- automatic active join-code creation during classroom creation
- outbox events for semester, classroom, and lecture mutations
- outbox events for slot, exception, and save-and-notify schedule changes
- service-layer scope validation using the existing assignment rules
- verified service-layer rejection for out-of-scope teacher classroom and schedule access
- verified lifecycle enforcement so classroom creation/update, schedule editing, and lecture creation stop in closed/archived semesters, and schedule editing also stops for completed/archived classrooms
- DB refinements for semester-window, lecture-time, schedule-exception, and lecture-link integrity
- teacher web and teacher mobile integration helpers for schedule and lecture screens
- reset-friendly classroom CRUD request and response shaping:
  - `courseCode` and `classroomTitle` request aliases for create and edit
  - response labels for semester, class, section, subject, and primary teacher
  - explicit classroom CRUD permissions for teacher versus admin surfaces
- admin academic-governance behavior for classroom archive:
  - `GET /admin/classrooms`
  - `GET /admin/classrooms/:id`
  - `POST /admin/classrooms/:id/archive`
  - archive requires an admin reason
  - archive is blocked while a live attendance session exists
  - archive preserves attendance history, roster history, and audit trail

Current code lives in:

```text
apps/api/src/modules/academic/
  academic.controller.ts
  semesters.controller.ts
  semesters.service.ts
  classrooms.controller.ts
  classrooms.service.ts
  scheduling.service.ts
  lectures.service.ts

apps/web/app/teacher/academics/page.tsx
apps/web/src/teacher-academic-console.tsx
apps/web/src/academic-management.ts
apps/mobile/src/academic-management.ts
apps/mobile/src/teacher-classroom-management.ts
apps/web/src/admin-classroom-governance.ts
apps/web/app/(admin)/admin/semesters/page.tsx

packages/contracts/src/academic.ts
packages/db/prisma/schema.prisma
packages/db/prisma/migrations/20260314000500_academic_management_foundation/
packages/db/prisma/migrations/20260314000600_schedule_management_support/
```

Still intentionally deferred beyond the verified phase-13 foundation:

- richer teacher web schedule editing UX beyond the first console route
- richer teacher mobile schedule editing UX beyond the first preview integration
- worker-side notification handling for `schedule.changed` outbox rows
- attendance-session endpoints consuming the new lecture-link helper directly

## Why This Layer Matters

Attendance does not exist in isolation. To run the product in a real college environment, the system must also model:

- semester boundaries
- which courses are active in a given term
- which teacher owns which classroom
- which schedule slots exist
- which dates are extra, cancelled, or rescheduled

Without this layer, attendance becomes hard to organize, report, and support at scale.

## Reset Language Model

The reset track locks these product-facing names for this area:

- `Classroom`: the teacher-owned teaching space students join
- `Course code`: the short code shown with a classroom
- `Subject`: the academic discipline linked to the classroom
- `Class session`: the scheduled or manually created teaching occurrence
- `Attendance session`: the present/absent attendance-taking event linked to a classroom or class session

Implementation note:

- `course_offering` remains the backend record that powers a classroom
- `lecture` remains the current backend record that powers a class session
- new contracts and mapping helpers should expose classroom- and class-session-friendly aliases so UI layers do not need to speak in internal table terms

## Domain Model

The academic layer should distinguish between:

- `subjects`: the catalog identity, such as Mathematics
- `classes` and `sections`: the academic cohort identity
- `semesters` or `academic_terms`: the time boundary
- `course_offerings`: the implementation record backing the operational classroom a teacher and students actually use

In practice, a `course_offering` is the same thing the product surfaces as a classroom card.

## Semester Lifecycle

The semester model should support:

- code and title
- start date
- end date
- status such as draft, active, archived
- optional exam or attendance cutoff dates

Recommended statuses:

- `DRAFT`
- `ACTIVE`
- `CLOSED`
- `ARCHIVED`

Attendance, schedule editing, and join-code behavior should respect semester status.

## Course Offering / Classroom Model

Each course offering should capture:

- semester
- subject
- class
- section
- one or more teachers
- display title
- default attendance settings
- join-code policy
- classroom status

Recommended course-offering statuses:

- `DRAFT`
- `ACTIVE`
- `COMPLETED`
- `ARCHIVED`

## Teacher Course Creation

Teacher-created course offerings should be allowed only when the teacher is permitted by assignment policy.

Supported creation paths:

- admin creates course offering and assigns teacher
- teacher creates course offering inside allowed class-section-subject scope

Recommended flow:

1. teacher opens `Create Classroom`
2. UI loads teacher assignments and active semester choices
3. teacher selects allowed academic scope
4. API validates scope and creates `course_offering`
5. API generates initial join code and default schedule shell

## CRUD Operations

### Semesters

Allowed mainly to admin.

Endpoints:

- `POST /admin/semesters`
- `PATCH /admin/semesters/:id`
- `GET /admin/semesters`
- `POST /admin/semesters/:id/activate`
- `POST /admin/semesters/:id/archive`

### Course Offerings

Allowed to teacher or admin depending on scope.

Endpoints:

- `POST /classrooms`
- `PATCH /classrooms/:id`
- `GET /classrooms`
- `GET /classrooms/:id`
- `POST /classrooms/:id/archive`
- `GET /admin/classrooms`
- `GET /admin/classrooms/:id`
- `POST /admin/classrooms/:id/archive`

Reset contract behavior:

- `POST /classrooms` and `PATCH /classrooms/:id` now accept `courseCode` and `classroomTitle` so
  UI clients do not have to send storage-facing `code` and `displayTitle` names
- classroom summary and detail responses now include:
  - `courseCode`
  - `classroomTitle`
  - `semesterCode` and `semesterTitle`
  - `classCode` and `classTitle`
  - `sectionCode` and `sectionTitle`
  - `subjectCode` and `subjectTitle`
  - `primaryTeacherDisplayName`
  - `permissions`
- teacher responses should surface editable course information but keep academic-scope and teacher
  reassignment permissions false
- admin responses should surface the same classroom data with academic-scope and teacher
  reassignment permissions true
- `POST /classrooms/:id/archive` should reject repeat archive attempts instead of silently
  succeeding on already archived classrooms
- `POST /admin/classrooms/:id/archive` should:
  - require a governance reason
  - reject archive while a live attendance session exists
  - preserve attendance history and roster history
  - write `CLASSROOM_ARCHIVE` audit context with the admin reason

Teacher-mobile reset implementation note:

- teacher mobile now uses the same classroom CRUD APIs for:
  - classroom list
  - classroom create
  - course-info edit
  - classroom archive
- assignment summaries now include readable semester, class, section, and subject labels so mobile
  create flows do not need to expose raw IDs
- the teacher-mobile classroom create path is intentionally inline and short, but it still relies
  on the same backend scope validation and classroom permission shaping as teacher web

Teacher-web reset implementation note:

- teacher web now uses the same classroom CRUD contract for:
  - classroom list
  - classroom create
  - course-info edit
  - classroom archive
- the teacher-web create path now loads allowed teaching scopes from teacher assignments instead
  of asking the teacher to type raw semester, class, section, or subject IDs
- the teacher-web classroom list now keeps course code, classroom title, teaching scope,
  attendance mode, join code, and main classroom actions together in one card-based workspace
- the teacher-web classroom detail route now acts as the main course-management page by keeping
  course settings, join-code reset, archive, QR launch, and related classroom routes in one place

Admin reset implementation note:

- `/admin/semesters` now acts as the admin academic-governance workspace for both:
  - semester lifecycle controls
  - classroom archive governance
- the admin classroom-governance lane now lets admins:
  - search classrooms by course or scope
  - inspect roster/session/history impact before archive
  - archive a classroom safely with a recorded reason

### Student Membership

Managed through roster APIs, join codes, or imports.

Endpoints:

- `GET /classrooms/:id/students`
- `POST /classrooms/:id/students`
- `PATCH /classrooms/:id/students/:studentId`
- `DELETE /classrooms/:id/students/:studentId`

## Scheduling Model

The calendar architecture should support both recurring and date-specific rules.

Core tables:

- `course_schedule_slots`
- `course_schedule_exceptions`
- `lectures`

### `course_schedule_slots`

Stores recurring weekly slots such as:

- Friday, 10:00 AM to 11:00 AM
- room or location label if needed
- recurrence status

### `course_schedule_exceptions`

Stores date-specific overrides:

- cancelled class
- rescheduled class
- one-off extra class
- room or timing change

Recommended exception types:

- `CANCELLED`
- `RESCHEDULED`
- `ONE_OFF`

## Calendar Save and Notify Flow

The sample screens show a calendar with `Save & Notify`, which is a good product pattern.

Implementation flow:

1. teacher edits recurring slot or date exception in UI
2. UI keeps changes local until save
3. API persists slot and exception updates transactionally
4. API writes outbox event such as `schedule.changed`
5. worker sends notifications to enrolled students
6. classroom stream receives a generated schedule update post if configured

This separation keeps the teacher UI fast while ensuring notifications happen reliably.

## Class Session Model

The system should separate:

- planned class session
- actual attendance session

Recommended approach:

- `lectures` represent the implementation record for calendar-backed or manually created class sessions
- `attendance_sessions` may optionally reference `lecture_id`

This makes it possible to:

- show a class-session list even before attendance happens
- create ad hoc class sessions manually
- connect reports to either scheduled or unscheduled sessions

### Class Session States

Suggested states:

- `PLANNED`
- `OPEN_FOR_ATTENDANCE`
- `COMPLETED`
- `CANCELLED`

## Schedule-to-Session Relationship

When the teacher starts attendance:

- a class session may already exist for that date and classroom
- a new attendance session should attach to that class session when possible
- ad hoc sessions can create a class-session record if none exists

This keeps class-session history and attendance history aligned.

## API Design

Recommended scheduling endpoints:

- `GET /classrooms/:id/schedule`
- `POST /classrooms/:id/schedule/weekly-slots`
- `PATCH /classrooms/:id/schedule/weekly-slots/:slotId`
- `POST /classrooms/:id/schedule/exceptions`
- `PATCH /classrooms/:id/schedule/exceptions/:exceptionId`
- `POST /classrooms/:id/schedule/save-and-notify`

Recommended lecture endpoints:

- `GET /classrooms/:id/lectures`
- `POST /classrooms/:id/lectures`

Implemented lecture-link support:

- scheduling logic now auto-creates or updates linked `lectures` rows for one-off, cancelled, and rescheduled exceptions
- scheduling logic now exposes a helper that can resolve or create the correct `lecture_id` when a future attendance session starts
- DB uniqueness now protects one lecture per exception and one lecture per slot occurrence
- `GET /lectures/:id`
- `POST /lectures/:id/start-attendance`

## UI Architecture

### Teacher Mobile

Should support:

- quick classroom creation
- calendar view
- one-off and recurring schedule edits
- lecture list

### Teacher Web

Should support:

- richer semester and classroom CRUD
- larger calendar UI
- import and schedule admin workflows

## Code Layout

```text
apps/api/src/modules/academic/
  semesters.controller.ts
  semesters.service.ts
  classrooms.controller.ts
  classrooms.service.ts

apps/api/src/modules/scheduling/
  scheduling.controller.ts
  scheduling.service.ts
  lecture-planner.service.ts

apps/web/src/features/teacher-web/semesters/
apps/web/src/features/teacher-web/classrooms/
apps/web/src/features/teacher-web/schedule/
apps/mobile/src/features/teacher/scheduling/
```

## Testing Strategy

Must include:

- CRUD tests for semesters and classrooms
- schedule recurrence and exception tests
- lecture linking tests
- save-and-notify outbox tests

## Implementation Outcome

When this architecture is complete:

- semesters, classrooms, and lectures are first-class objects
- teachers can manage recurring and one-off class schedules
- attendance sessions fit cleanly into the academic calendar instead of floating independently
