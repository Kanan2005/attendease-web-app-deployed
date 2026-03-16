# Authentication, Roles, and Enrollment Implementation Notes

Companion to: [`02-auth-roles-enrollment.md`](./02-auth-roles-enrollment.md)

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

The product must block the abuse pattern where one student logs in, marks attendance, logs out, then another student logs in on the same phone and repeats the flow.

Important design decision:

- do not use MAC address as the primary device lock

The current foundation instead uses:

- app-scoped `install_id`
- device public key
- optional attestation metadata
- server-side device and binding records

### Current Login-Time Device Flow

1. the client includes device registration metadata in the student registration, login, or Google exchange payload
2. `DeviceBindingPolicyService` upserts the `devices` record by `install_id`
3. for student-role auth, the service checks for same-device multi-account attempts, second-device attempts, revoked pairs, and attestation risk
4. `POST /auth/register/student` preflights the device before account creation so blocked installs do not leave partial student accounts behind
5. if no conflict exists, the first active student binding is created automatically
6. second-phone attempts create or reuse a pending replacement binding instead of silently replacing the trusted phone
7. student session creation and refresh continue only when the resolved trust state is `TRUSTED`
8. auth responses return trusted-device state plus lifecycle state
9. successful student self-registration returns `recommendedNextStep = JOIN_CLASSROOM`

### Current Post-Login Device Flow

Authenticated sessions can also call `POST /devices/register`.

Current behavior:

- teacher and admin sessions can register a session device and receive `NOT_REQUIRED`
- student sessions can re-register or confirm the current trusted device
- second-phone student registrations return blocked trust with `PENDING_REPLACEMENT`
- blocked or replaced student devices preserve lifecycle-aware states for mobile UX
- successful student self-registration creates the account, trusted binding, active session, and onboarding hint in one flow

The first attendance-sensitive guard surface is `GET /devices/trust/attendance-ready`, which proves that:

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

Security events currently persisted include:

- `DEVICE_BOUND`
- `MULTI_ACCOUNT_SAME_DEVICE_ATTEMPT`
- `SECOND_DEVICE_FOR_STUDENT_ATTEMPT`
- `REVOKED_DEVICE_USED`
- `LOGIN_RISK_DETECTED`
- `ATTENDANCE_BLOCKED_UNTRUSTED_DEVICE`

## Reset Naming Boundaries

Architecture and product code should normalize to:

- `Classroom`
- `Course code`
- `Students`
- `Attendance session`
- `Present` / `Absent`
- `Device registration`

Developer-oriented wording such as `shell`, `foundation`, `readiness`, or `local verification` should not define product-layer routes or copy.

## Current Admin Recovery Flow

The first admin recovery module is now live.

Current behavior:

- admins can search student support records through `GET /admin/students`
- admins can inspect student support detail through `GET /admin/students/:studentId`
- admins can change student account status through `POST /admin/students/:studentId/status`
- admins can revoke one suspicious binding
- admins can delink all active student attendance bindings for a recovery reset
- admins can approve a replacement install by upserting the new device, revoking prior active bindings, and activating the replacement binding

## Assignment and Enrollment Foundations

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

Session creation derives allowed values from `teacher_assignments`, preventing teachers from creating sessions for arbitrary classes.

## Why Enrollment Matters

Attendance eligibility comes from `enrollments`, but final absence truth must not change later if membership changes. The product therefore uses live enrollments before session start and a roster snapshot after session start.

## Mobile and Web Role Handling

Current backend behavior:

- login returns `availableRoles`
- the session persists `activeRole`
- `GET /auth/me` returns role-aware assignment and enrollment data
- web and mobile both use shared auth bootstrap helpers
- web and mobile both construct Google exchange payloads against the shared server contract

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

Coverage includes token extraction, role blocking, invalid role selection, Google restrictions, refresh rotation, assignment and enrollment scoping, multi-account device blocking, trusted-device readiness, and security-event persistence.

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

The following are intentionally still deferred:

- self-service recovery UX
- web cookie session hardening beyond the implemented local/prod split
- broader classroom CRUD and join-code management expansion
- applying the trusted-device guard to every future QR and Bluetooth mark-attendance edge
