# Authentication, Roles, and Enrollment Requirements

## Purpose

This document defines what is expected from the account system, role handling, teacher assignment model, and student enrollment model.

## Reset Implementation Status

This auth and role boundary is now implemented in the repo.

- student self-registration is live and binds the first attendance phone during signup
- teacher self-registration is live on mobile and web
- admin remains provisioned and login-only
- student, teacher, and admin now land in role-owned post-auth experiences instead of mixed entry flows
- admin student-governance and device-recovery routes are now audited and separate from normal teacher/student flows

## Account Model

The system must support at minimum:

- student accounts
- teacher accounts
- admin accounts

Each user must authenticate before accessing protected features.

The account system must keep one canonical user identity per person and then attach:

- one or more roles
- optional password credentials
- optional Google account linkage
- profile data for student or teacher context
- session and refresh-token state
- trusted-device state for student attendance usage

## Final Reset Auth Flows

The reset track locks these final auth entry paths:

### Mobile

- app opens to a neutral role-entry screen
- student entry offers:
  - create student account
  - student sign in
- teacher entry offers:
  - create teacher account
  - teacher sign in
- admin has no mobile entry path

### Web

- teacher web offers:
  - teacher sign in
  - teacher registration
- admin web offers:
  - admin sign in only
- teacher and admin auth must stay clearly separated in route structure and page framing even if they share the same backend auth service
- the final web entry URLs are:
  - `/login` for teacher sign in
  - `/register` for teacher registration
  - `/admin/login` for admin sign in
- teacher web must not ask the user to pick `Teacher` versus `Admin` from one combined form

### Cross-Role Rule

- student, teacher, and admin must each land in a role-owned post-login experience
- the product must not merge teacher and student actions into one mixed mobile home
- admin must not reuse the teacher-first login framing

## Role Requirements

### Student Role

A student account must be able to:

- access only its own attendance records
- mark attendance only for eligible sessions
- view only its own history, percentages, and records

### Teacher Role

A teacher account must be able to:

- authenticate on mobile and web
- create sessions for assigned class, section, and subject combinations
- view student lists for those assigned groups
- edit attendance within the allowed edit window
- access reports, exports, analytics, and notifications where applicable

### Admin Role

An admin account must be able to:

- sign in to protected admin surfaces
- manage recovery and support workflows
- delink blocked or replaced student devices
- inspect security and audit history relevant to auth, enrollment, and device trust
- correct classroom-student membership state through protected classroom student-management APIs when policy permits

## Same App, Different Role Experience

The mobile app must support both student and teacher users, but the UI and actions must change based on the authenticated role.

Expected behavior:

- a student should not see teacher controls
- a teacher should see teacher-only actions after login
- if a user has multiple roles in future, the system should still support clear role selection without corrupting permissions

The auth response must therefore provide:

- all roles available to the current account
- the currently active role for the current session
- enough profile and trust context for the app to render the correct role experience

The product must also expose a clean client integration seam so web and mobile can:

- call shared auth endpoints through one typed helper layer
- bootstrap Google login with platform-specific client IDs
- build Google exchange payloads without re-encoding API contract details in each app

## Enrollment Requirements

The system must support a clear mapping between:

- student
- class
- section
- subject
- semester
- course offering

Attendance eligibility must depend on this mapping.

## Enrollment Outcomes Required

The enrollment model must make it possible to determine:

- which students belong to a class/section
- which students are eligible for a subject
- which teacher can run sessions for that class/section/subject combination
- which teacher can create or manage a classroom for that scope
- how absent count is computed for a given session

## Teacher Assignment Requirements

The system must support an assignment model that maps a teacher to:

- semester
- class
- section
- subject

This assignment model must drive:

- teacher attendance-session scope
- teacher course-offering creation scope
- teacher reports and roster visibility scope
- teacher self-query APIs for the current teacher session

## Authorization Rules

The backend must enforce the following:

- students cannot mark attendance for sessions outside their eligibility
- teachers cannot start sessions for classes or subjects not assigned to them
- students cannot read another student's history
- teachers cannot modify sessions outside their allowed scope
- teachers cannot create or manage a classroom outside their active assignment scope
- admins alone can search students, inspect student account state, and apply audited student-status changes
- admins alone can perform protected device recovery actions
- teacher and student sessions must be denied from admin-only device recovery APIs

The backend must also support safe self-query endpoints for:

- current teacher assignment lists and assignment details
- current student enrollment lists and enrollment details

## Authentication Expectations

The product must support:

- student self-registration on mobile
- teacher registration on mobile and web
- teacher sign in on mobile and web
- secure password login for admin and fallback/internal users
- Google login through verified OIDC exchange
- session management
- rotating refresh tokens
- logout
- role-based API protection
- session-aware `me` lookup

Student self-registration is now a real product flow, not a seeded-development shortcut.

Required signup outcome:

- `POST /auth/register/student` must create the student account
- the same signup request must register and bind the first attendance device
- the signup response must open an authenticated student mobile session immediately
- the signup response must include an onboarding hint so the mobile app can send the student into the classroom-join step next
- duplicate email and device-conflict cases must fail without silently creating an unusable partial onboarding state

Teacher self-registration must also be a real product flow on mobile and web.

Required teacher-signup outcome:

- `POST /auth/register/teacher` must create the teacher account
- the signup flow must explicitly create:
  - password credential
  - teacher role
  - teacher profile
- mobile teacher signup may include device-registration metadata, but teacher auth must still remain non-blocking from a trusted-device perspective
- the signup response must open an authenticated teacher session immediately
- the signup response must include an onboarding hint so later reset prompts can land the teacher in the teacher-owned home flow cleanly
- duplicate email cases must fail cleanly

Admin provisioning must remain private:

- there must be no public admin self-registration route
- admin accounts remain provisioned and login-only

The final identity flow must be production-safe and server-verified. Raw client profile data must never be trusted as proof of identity.
Raw client attestation claims must also never be treated as verified device proof until the backend validates them explicitly.

## Product Naming Rules

User-facing auth and access copy must normalize to:

- `Students` instead of enrollment-only jargon when referring to people
- `Attendance session` instead of technical session or lecture-candidate jargon
- `Device registration` instead of install-id, binding, or readiness wording

Developer-facing words such as `shell`, `foundation`, `readiness`, and `local verification` must not be treated as normal product copy.

## Device Trust Expectations

Student attendance usage must support a trusted-device model.

Required outcomes:

- the first approved student registration or login on a device can establish the active attendance device binding
- a second student attempting to use the same phone for attendance must be blocked
- a student trying to switch to a second active attendance phone must be blocked from attendance immediately and create a pending replacement request instead of silently taking over the old binding
- a revoked device must not remain attendance-eligible
- student authentication on attendance-capable mobile flows must require trusted device context
- blocked or missing device context must not open a new student session

Student device state must be explicit and user-visible. The backend and mobile app must consistently surface:

- `Trusted`
- `Pending approval`
- `Replaced`
- `Blocked`
- `Unregistered`

The system must also support an admin-assisted recovery path for:

- broken phone replacement
- stolen phone replacement
- mistaken or revoked device rebinding

The backend device-trust foundation must also provide:

- an authenticated device-registration endpoint for the current session
- a trusted-device attendance-readiness endpoint for student attendance-sensitive flows
- security-event logging for same-device multi-account attempts, second-device attempts, and revoked-device use
- admin recovery endpoints for binding revoke, student-device delink, and verified replacement approval
- a web support surface where admins can search students or devices and apply recovery actions
- mobile support messaging that explains blocked-attendance states and directs the student to recovery
- admin support data that clearly distinguishes the active trusted binding from a pending replacement binding so support staff can approve or reject a phone change cleanly

The student-only trusted-device rules must not break normal teacher or admin workflows.

Required outcomes:

- teacher and admin sessions can still authenticate without attendance-device friction
- teacher and admin device registration can return a non-blocking `NOT_REQUIRED` trust state
- teacher and admin sessions must not be allowed to call the student-only attendance-readiness endpoint
- teacher and admin sessions must never be pushed into the student-only replacement approval flow

Server-side attestation verification may remain placeholder-backed during early implementation, but the trust and recovery surfaces themselves must already be enforceable before attendance APIs are introduced.

## Session and Token Expectations

The auth layer must support:

- short-lived access tokens
- longer-lived refresh tokens
- refresh-token rotation
- explicit session invalidation on logout
- session context that stores the active role

These flows must work consistently for mobile and web clients, even if token storage differs by platform.

## Reset Contract Boundary Requirements

The reset track now locks the shared contract shapes that later UI prompts must reuse.

Required contract boundaries:

- student registration uses a dedicated student-mobile payload with:
  - email
  - password
  - display name
  - platform fixed to mobile
  - device registration bundled at onboarding time
- teacher registration uses a dedicated teacher payload for mobile or web registration
- student, teacher, and admin password login must keep separate role-specific request shapes even when they still hit the same backend login endpoint
- student and teacher Google exchange flows must keep separate typed payloads so later screens do not need to infer role or device rules ad hoc
- classroom student CRUD must use `students` naming, not roster-member-only naming, on shared contracts and client helpers
- classroom student CRUD must support one shared teacher/admin contract for:
  - add by identifier or email
  - membership-state search
  - explicit remove
  - API-provided row actions
- live attendance-session discovery must expose active-session summaries suitable for mobile attendance entry without requiring later prompts to reshape history rows inline
- manual attendance editing must use action-based semantics:
  - `MARK_PRESENT`
  - `MARK_ABSENT`
  while still targeting the existing attendance records safely
- admin recovery contracts must read as student support and device recovery flows, not as hidden internal binding-management jargon
- student support contracts must also expose account status, recent classroom context, attendance-phone context, and explicit admin status-change actions

Required outcome:

- later reset prompts must be able to call stable registration, classroom-student, live-attendance, manual-attendance, and student-support client helpers without inventing new payload names or route semantics.

## Development Fixture Expectations

The system must provide deterministic development seed data for:

- admin login
- teacher login
- student logins
- teacher assignments
- student enrollments
- at least one teacher Google-linked account

This data must be usable for local development, integration tests, and later UI phases.

## Basic User Profile Expectations

### Student Profile

The system should maintain, at minimum:

- full name
- student identifier or roll number
- email address
- class and section context

### Teacher Profile

The system should maintain, at minimum:

- full name
- teacher identifier if applicable
- email address
- assigned class, section, and subject combinations

## Enrollment Input and Join Code Expectations

The system must support reliable enrollment creation through one or more of:

- classroom join codes
- bulk upload
- admin mapping
- institution sync

For v1, the requirement is that enrollments and join-code flows are controlled enough to be used for attendance eligibility and not just as informal classroom membership.

## Reliability Requirement

Enrollment and assignment data must be reliable enough to control:

- attendance eligibility
- classroom visibility
- teacher scope validation
- report ownership
- future roster snapshot generation
