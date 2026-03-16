# Authentication, Roles, and Enrollment Architecture

Maps to: [`../requirements/02-auth-roles-enrollment.md`](../requirements/02-auth-roles-enrollment.md)

## Purpose

This document defines how authentication, authorization, teacher assignment, and student enrollment are implemented in code.

## Reset Implementation Snapshot

This auth architecture is now implemented through the shared API, client contracts, and role-aware mobile/web entry layers.

- student self-registration with first-device binding is live
- teacher self-registration is live on mobile and web
- admin remains provisioned and login-only
- admin student governance and device recovery now sit on dedicated audited routes instead of hidden support seams

## Current Foundation Status

This phase is now implemented as the backend foundation for:

- student self-registration with first-device binding and immediate mobile session bootstrap
- teacher self-registration with explicit teacher profile creation and immediate session bootstrap
- password login
- Google OIDC exchange
- refresh-token rotation
- logout
- `me` session lookup
- teacher assignment lookup for the signed-in teacher
- enrollment lookup for the signed-in student
- assignment detail and filtered assignment queries for the signed-in teacher
- enrollment detail and filtered enrollment queries for the signed-in student
- login-time trusted-device evaluation and student-session gating for student accounts

The current implementation lives primarily in:

```text
apps/api/src/modules/auth/
  auth.controller.ts
  auth.service.ts
  auth.guard.ts
  roles.guard.ts
  google-oidc.service.ts
  device-binding.service.ts

apps/api/src/modules/academic/
  academic.controller.ts
  assignments.service.ts
  enrollments.service.ts

apps/api/src/modules/devices/
  devices.controller.ts
  devices.service.ts
  device-binding-policy.service.ts
  trusted-device.guard.ts

packages/auth/
packages/contracts/
packages/domain/
packages/db/
```

Client bootstrap helpers also now exist in:

```text
packages/auth/src/client.ts
apps/web/src/auth.ts
apps/mobile/src/auth.ts
```

## Core Design Choice

Authentication and authorization are handled inside `apps/api`, with shared helpers and contracts in workspace packages.

This is preferred over implementing auth independently in web and mobile because:

- permissions must behave identically on both platforms
- attendance APIs need server-side role enforcement anyway
- future SSO support is easier if one auth service owns identity exchange

## Auth Model

The auth layer uses these core tables:

- `users`
- `user_credentials`
- `user_roles`
- `oauth_accounts`
- `student_profiles`
- `teacher_profiles`
- `refresh_tokens`
- `auth_sessions`
- `devices`
- `user_device_bindings`
- `security_events`
- `teacher_assignments`
- `course_offerings`
- `enrollments`
- `classroom_join_codes`

Important persisted fields already in use:

- `auth_sessions.active_role`
- `auth_sessions.device_id`
- `refresh_tokens.rotated_from_id`
- `teacher_assignments.can_self_create_course_offering`
- `course_offerings.requires_trusted_device`

One practical Prisma quirk remains important in code: the `OAuthAccount` model generates the Prisma delegate name `oAuthAccount`.

## Reset Role Entry Map

The reset track now locks these role-entry and auth routes:

### Mobile Entry

- neutral mobile role-entry route
- student auth branch:
  - student registration
  - student sign in
- teacher auth branch:
  - teacher registration
  - teacher sign in
- no admin mobile auth branch

### Web Entry

- teacher web auth branch:
  - `/login`
  - `/register`
- admin web auth branch:
  - `/admin/login`

Teacher and admin auth still talk to the same backend auth service, but route ownership and post-login landing pages stay separate.

Current implementation note:

- `/login` now posts only the teacher sign-in flow
- `/register` now posts only the teacher registration flow
- `/admin/login` now posts only the admin sign-in flow
- web post-auth redirects now keep teacher sign-in and registration inside `/teacher/...`
- admin post-auth redirects now keep admin sign-in inside `/admin/...`

## Token Strategy

The API issues:

- short-lived access tokens
- rotating refresh tokens

Current defaults:

- access token: 15 minutes
- refresh token: 30 days

The backend currently returns token bundles in JSON so both mobile and web clients can integrate against the same session contract during early phases. Cookie-specific web handling can be layered later without changing the session service itself.

## Login Modes

The system currently supports:

- email/password login for admin and fallback/internal users
- Google OIDC exchange for teacher and student accounts
- teacher registration on mobile and web
- student registration on mobile

Current public-registration rule:

- `POST /auth/register/student` is available for student self-registration
- `POST /auth/register/teacher` is available for teacher self-registration
- no public `POST /auth/register/admin` route exists
- admin accounts remain provisioned and login-only

Google login is implemented through server-side OIDC verification, not by trusting raw client profile data.

### Google Login Flow

Mobile and web both send either:

- a Google ID token, or
- an authorization code with optional PKCE verifier and redirect URI

`GoogleOidcService` then:

1. exchanges the authorization code when needed
2. verifies the Google ID token against `GOOGLE_OIDC_CLIENT_ID`
3. requires a verified email and provider subject
4. returns a normalized identity payload to `AuthService`

### Domain Controls

The current foundation supports domain allowlists through:

- `GOOGLE_TEACHER_ALLOWED_DOMAINS`
- `GOOGLE_STUDENT_ALLOWED_DOMAINS`

Current policy:

- teacher Google login is allowed only from configured teacher domains when the allowlist is non-empty
- student Google login is allowed only from configured student domains when the allowlist is non-empty
- Google login is currently blocked for the `ADMIN` role

## Auth API Surface

The implemented foundation exposes:

- `POST /auth/register/student`
- `POST /auth/register/teacher`
- `POST /auth/login`
- `POST /auth/google/exchange`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /devices/register`
- `GET /devices/trust/attendance-ready`
- `GET /admin/students`
- `GET /admin/students/:studentId`
- `POST /admin/students/:studentId/status`
- `GET /admin/device-bindings`
- `GET /admin/device-bindings/:studentId`
- `POST /admin/device-bindings/:bindingId/revoke`
- `POST /admin/device-bindings/:studentId/delink`
- `POST /admin/device-bindings/:studentId/approve-new-device`
- `GET /academic/assignments/me`
- `GET /academic/assignments/me/:assignmentId`
- `GET /academic/enrollments/me`
- `GET /academic/enrollments/me/:enrollmentId`

The dedicated device/admin phase has now started through a real `devices` module. Device upsert and trust evaluation still happen inline during login and Google exchange, and authenticated sessions can now also re-register their current device through `POST /devices/register`.

Current query behavior:

- `GET /academic/assignments/me` accepts academic-scope filters
- `GET /academic/enrollments/me` accepts academic-scope filters plus `courseOfferingId` and `status`

## Request and Response Contracts

Shared request and response schemas live in `packages/contracts` and are enforced in controllers with Zod.

Implemented contract groups include:

- login payloads and session responses
- reset-specific student, teacher, and admin auth request aliases
- dedicated student-registration and teacher-registration contracts
- dedicated student-registration response onboarding hint for later mobile join-classroom work
- dedicated teacher-registration response onboarding hint for later teacher-home onboarding work
- Google exchange payloads
- reset-specific student and teacher Google exchange aliases
- refresh and logout payloads
- trusted-device context in the authenticated user payload
- device registration payloads and responses
- trusted-device attendance-readiness responses
- admin device-support search, detail, revoke, delink, and replacement-approval payloads
- reset-specific student-support and device-recovery aliases for those admin flows
- teacher assignment summaries
- enrollment summaries
- classroom-student query and mutation aliases over the current roster endpoints
- assignment list and detail query schemas
- enrollment list and detail query schemas
- live attendance-session discovery summaries built from current session history truth
- manual attendance action-based update payloads that map onto the current session attendance patch endpoint
- the composite `GET /auth/me` response, now split into a dedicated auth-profile contract

This keeps mobile, web, and API validation aligned around one contract source of truth.

## Reset Contract Migration Foundation

Prompt 4 locks the shared wire shapes in `packages/contracts` and the reset-friendly client seams in `packages/auth`.

Current foundation now provides:

- separate registration contracts for:
  - student mobile registration with device registration at onboarding
  - teacher registration on mobile or web
- separate password-login aliases for:
  - student mobile sign in
  - teacher sign in
  - admin web sign in
- separate Google exchange aliases for:
  - student mobile Google sign in
  - teacher Google sign in
- classroom student list/add/update aliases that reuse the current classroom student endpoints
- live attendance discovery helpers that reuse `GET /sessions` with `ACTIVE` scope and map the response to compact session summaries
- manual attendance action helpers that map `MARK_PRESENT` / `MARK_ABSENT` onto the existing `PATCH /sessions/:id/attendance` payload
- student support aliases that now target the dedicated admin student-governance endpoints while keeping device recovery on the binding endpoints

Current implementation note:

- teacher self-registration now creates:
  - the user row
  - password credential
  - explicit `TEACHER` role row
  - teacher profile row
  - authenticated teacher session
- teacher registration can accept optional device registration metadata on mobile, but the resulting trust state remains `NOT_REQUIRED`
- admin provisioning still does not expose a public registration route

Important implementation rule:

- these client helpers may temporarily map onto existing backend endpoints during the reset, but later prompts must preserve the locked request and response contracts instead of inventing new payload names inside screens.

## Authorization Strategy

Every protected endpoint passes through:

1. `AuthGuard`
2. `RolesGuard`
3. resource-scope validation inside the relevant service

Examples:

- only teachers can call `GET /academic/assignments/me`
- only students can call `GET /academic/enrollments/me`
- teacher scope is revalidated from `teacher_assignments`
- student scope is revalidated from `enrollments`
- assignment and enrollment detail endpoints only resolve rows inside the authenticated teacher or student scope

## Policy Implementation

The shared packages already provide the first reusable auth and policy building blocks:

- password hashing and verification in `packages/auth`
- access-token issuance and verification in `packages/auth`
- active-role resolution in `packages/auth`
- teacher course-offering scope checks in `packages/domain`
- student course-offering eligibility checks in `packages/domain`

These helpers are reused across controllers, services, and tests.

## Device Trust and Anti-Account-Switch Design

The product must block the abuse pattern where one student logs in, marks attendance, logs out, then another student logs in on the same phone and repeats the process.

### Important Design Decision

Do not use MAC address as the primary device lock.

Instead, the current foundation uses:

- app-scoped `install_id`
- device public key
- optional attestation metadata
- server-side device and binding records

## Reset Naming Boundaries

Architecture and product code should normalize to the reset naming system:

- `Classroom`
- `Course code`
- `Students`
- `Attendance session`
- `Present` / `Absent`
- `Device registration`

Developer-oriented wording such as `shell`, `foundation`, `readiness`, or `local verification` should not define the product-layer route and copy model.

### Current Login-Time Device Flow

1. the client includes device registration metadata in the student registration, login, or Google exchange payload
2. `DeviceBindingPolicyService` upserts the `devices` record by `install_id`
3. for student-role auth, the service checks:
   - whether the device is already bound to another student
   - whether the student is already bound to another active device
   - whether a revoked binding exists for that same student-device pair
   - whether attestation was marked failed
4. on `POST /auth/register/student`, the API preflights the device before account creation so blocked devices do not leave behind partial student accounts
5. if no conflict exists, the first active student binding is created automatically
6. if the student is trying to switch from one active phone to another, the service creates or reuses a pending replacement binding instead of silently replacing the trusted phone
7. student session creation and refresh continue only when the resolved trust state is `TRUSTED`
8. the resulting trusted-device state plus lifecycle state are returned in the auth session response when auth succeeds
9. successful student self-registration also returns an onboarding hint with `recommendedNextStep = JOIN_CLASSROOM`

### Current Post-Login Device Flow

Authenticated sessions can now also call `POST /devices/register`.

Current behavior:

- teacher and admin sessions can register a session device and receive `NOT_REQUIRED`
- student sessions can re-register or confirm the current trusted device
- second-phone student registrations now return a blocked trusted-device response plus `lifecycleState = PENDING_REPLACEMENT` and a pending binding reference instead of silently swapping the binding
- blocked or replaced student devices now keep their own lifecycle states so mobile surfaces can distinguish `Pending approval`, `Replaced`, `Blocked`, and `Unregistered`
- successful student self-registration creates the student account, trusted binding, active session, and onboarding hint in one flow

The first attendance-sensitive guard surface is also now implemented at `GET /devices/trust/attendance-ready`, which uses `TrustedDeviceGuard` plus `RolesGuard` to prove that:

- the session belongs to a student
- the request includes the expected `x-attendease-install-id`
- the presented device is registered
- the presented install context matches the session device
- the active attendance binding exists and is not revoked or blocked

Current trusted-device response states include:

- `NOT_REQUIRED`
- `TRUSTED`
- `BLOCKED`
- `MISSING_CONTEXT`

Current lifecycle-state responses include:

- `NOT_APPLICABLE`
- `UNREGISTERED`
- `TRUSTED`
- `PENDING_REPLACEMENT`
- `REPLACED`
- `BLOCKED`

Important security note:

- raw client attestation metadata is stored only as unverified device metadata in this phase
- the backend no longer upgrades device attestation to `PASSED` just because the client supplied an attestation token
- explicit server-side attestation verification is deferred to phase 15

Security events currently persisted include:

- `DEVICE_BOUND`
- `MULTI_ACCOUNT_SAME_DEVICE_ATTEMPT`
- `SECOND_DEVICE_FOR_STUDENT_ATTEMPT`
- `REVOKED_DEVICE_USED`
- `LOGIN_RISK_DETECTED`
- `ATTENDANCE_BLOCKED_UNTRUSTED_DEVICE`

The current guard implementation is intentionally attached first to the attendance-readiness endpoint. Later QR and Bluetooth mark-attendance endpoints must reuse the same `TrustedDeviceGuard` rather than reimplementing device checks.

### Current Admin Recovery Flow

The first admin recovery module is now live.

Current behavior:

- admins can search student support records through `GET /admin/students`
- admins can inspect one student support record with account state, classroom context, device context, and recent security/admin actions through `GET /admin/students/:studentId`
- admins can change student account status through `POST /admin/students/:studentId/status`
- admins can revoke one suspicious binding
- admins can delink all active student attendance bindings for a recovery reset
- admins can approve a replacement install by upserting the new device, revoking prior active bindings, and activating the replacement binding
- admin support summary/detail payloads now surface account state, enrollment counts, recent classrooms, the current attendance-device state, and any pending replacement binding so support can decide whether governance or recovery is the right next step

## Assignment and Enrollment Foundations

The academic side needs more than just class names. It must resolve exact eligibility for any session.

The current backend foundations provide:

- `AssignmentsService.listTeacherAssignments`
- `AssignmentsService.getTeacherAssignment`
- `AssignmentsService.ensureTeacherHasScope`
- `AssignmentsService.ensureTeacherCanManageCourseOffering`
- `AssignmentsService.ensureTeacherCanCreateCourseOffering`
- `EnrollmentsService.listStudentEnrollments`
- `EnrollmentsService.getStudentEnrollment`
- `EnrollmentsService.ensureStudentEnrollmentAccess`
- `EnrollmentsService.ensureStudentEligibleForCourseOffering`

These methods are the scope-validation base for later classroom, session, roster, and report APIs.

## Why Assignments Matter

Session creation will derive allowed values from `teacher_assignments`. This prevents a teacher from creating a session for arbitrary classes.

Teacher-created classroom and course-offering flows must use the same assignment boundaries. A teacher may create a course offering only inside a scope they are allowed to manage and only when `can_self_create_course_offering` permits it.

## Why Enrollment Matters

Session attendance eligibility will come from `enrollments`, but final absence calculations must not change later if enrollments change. Therefore:

1. the enrollment table is the source of truth before session start
2. a session roster snapshot is created at session start
3. all later attendance and absent counts use the snapshot, not live enrollment rows

## Mobile and Web Role Handling

The same mobile app supports student and teacher users.

Current backend behavior:

- login returns `availableRoles`
- the session persists `activeRole`
- `GET /auth/me` returns role-aware assignment and enrollment data
- web and mobile both now have shared auth bootstrap helpers that know the API base URL and optional public Google client ID
- web and mobile can now construct Google exchange payloads against the server contract without duplicating that contract in app code

The web app should support teacher and admin role groups. Student access to teacher/admin web routes is expected to be blocked at the route and API levels.

## Failure and Security Handling

The auth layer explicitly handles:

- invalid password
- invalid or expired refresh token
- inactive or blocked user
- invalid Google token
- unverified Google identity email
- Google domain mismatch
- requested-role mismatch
- resource access outside assignment or enrollment scope
- device already bound to another student
- second active device attempt for the same student
- revoked device reuse
- failed device attestation risk logging

## Testing Strategy

The current phase includes:

- `apps/api/src/modules/auth/auth.guard.test.ts`
- `apps/api/src/modules/auth/roles.guard.test.ts`
- `apps/api/src/modules/auth/auth.service.test.ts`
- `apps/api/src/modules/auth/auth.integration.test.ts`
- `apps/api/src/modules/devices/device-binding-policy.service.test.ts`
- `apps/api/src/modules/devices/trusted-device.guard.test.ts`
- `apps/api/src/modules/devices/devices.integration.test.ts`
- `apps/api/src/modules/academic/assignments.service.test.ts`
- `apps/api/src/modules/academic/enrollments.service.test.ts`

These tests now cover:

- bearer-token extraction and route protection
- role-based route blocking
- invalid role-selection rejection
- Google admin-login rejection in the current phase
- unverified Google identity rejection
- password login and `GET /auth/me`
- refresh-token rotation and logout invalidation
- refresh-time role-escalation rejection
- teacher assignment access, filtering, and detail lookup
- student enrollment access, filtering, and detail lookup
- cross-scope assignment and enrollment denial
- same-device multi-student blocking with persisted security events
- student login rejection when device context is missing or already blocked
- trusted-device registration for teacher and student sessions
- attendance-readiness success on a trusted student device
- attendance-readiness denial after binding revocation
- security-event persistence for second-device and multi-account device reuse

## Development Fixtures

The DB package now exports deterministic development fixtures for:

- admin, teacher, and student credentials
- teacher Google subject and allowed-domain identity
- academic codes such as term, semester, course offering, and join code values

`seedDevelopmentData` now persists usable password credentials for the seeded admin, teacher, and student accounts, along with teacher assignments and student enrollments for the primary seeded course offerings.

## Implementation Outcome

With the current foundation complete:

- login works consistently on mobile and web clients
- roles are enforced server-side
- Google login is supported safely
- teacher access scope is assignment-driven
- student eligibility is enrollment-driven
- student attendance flows can rely on trusted-device state already being established at login
- later attendance phases can build on stable session, role, scope, and device-trust primitives

## Deferred To Later Phases

The following are intentionally not finished in this phase:

- admin device revoke and approve-new-device endpoints
- self-service recovery flows
- web cookie session handling
- classroom CRUD and join-code management endpoints
- applying the existing trusted-device guard to the future QR and Bluetooth mark-attendance APIs
