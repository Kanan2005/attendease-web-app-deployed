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

Additional implementation detail, policy notes, device-trust flow rules, fixture coverage, and deferred work now live in [`02-auth-roles-enrollment-notes.md`](./02-auth-roles-enrollment-notes.md).
