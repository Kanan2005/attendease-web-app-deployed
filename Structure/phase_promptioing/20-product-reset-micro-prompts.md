# Phase Prompt: Product Reset Micro Phases

Use this playbook when you want to rebuild AttendEase into a cleaner, role-separated, user-friendly product without losing the existing backend and domain foundations.

Execution order: dedicated reset track, 40 prompts, strict order.
One chat window = one prompt.
Do not skip ahead unless all earlier prompts in this file are already implemented and merged into the repo state.

This playbook assumes the product decisions below are locked and must not be re-decided in each chat:

- one shared mobile app, but with fully separate student and teacher entry, auth, and navigation
- student and teacher support self-registration
- admin is login-only and is provisioned separately
- student one-device enforcement uses app device binding, not MAC-address-only locking
- teacher mobile owns Bluetooth attendance session creation
- teacher web owns QR + GPS attendance session creation
- admin web owns student, device, and course governance
- every prompt must update matching docs, add relevant tests, run relevant checks, and leave a concrete next pickup point in `Structure/context.md`

## Files Every Prompt Must Read First

- `Structure/context.md`
- `Structure/final-tech-stack-and-implementation.md`
- `Structure/testing-strategy.md`
- `Structure/phase_promptioing/README.md`
- `Structure/ux-redesign-audit.md` after Prompt 1 creates it

Each prompt below also names extra files that must be read before implementation starts.

## Global Rules For Every Prompt

- Inspect the current repo before making decisions.
- Implement real code, not TODO placeholders.
- Keep the current approved stack.
- Do not switch the product back to mixed teacher/student mobile UX.
- Do not switch student device enforcement back to MAC-address-only design.
- If a prompt changes user-visible behavior, update the matching requirement docs and architecture docs in the same prompt.
- Update `Structure/context.md` in every prompt with:
  - what was implemented
  - tests added or updated
  - commands run
  - blockers
  - exact next pickup point
- If setup, validation, or manual flows change, also update `README.md`, `guide.md`, and any relevant support docs.
- Every prompt must add or strengthen automated tests for the changed behavior.
- Every prompt must run relevant checks before stopping and fix safe issues discovered during those checks.

## Validation Tiers

- Tier A: docs, contracts, backend, worker, or web only
  - run targeted unit or integration tests, typecheck, and any touched web tests
  - no Android Studio validation required
- Tier B: shared mobile logic without native-runtime impact
  - run mobile typecheck and relevant mobile tests
  - no Android Studio validation required unless navigation or runtime behavior changed
- Tier C: mobile runtime changes
  - run mobile typecheck and relevant mobile tests
  - run native Android validation through `expo run:android` or Android Studio where practical
  - record results in `Structure/context.md`
- Tier D: QR, GPS, Bluetooth, device-binding, permissions, or other high-risk mobile runtime changes
  - run all Tier C checks
  - also validate Android permission handling, lifecycle recovery, logs, and relevant hardware-state flows where practical
  - capture honest evidence and blockers in `Structure/context.md`

## Prompt 1
```text
You are executing AttendEase product reset Prompt 1 of 40.

Read these files first:
- Structure/context.md
- Structure/final-tech-stack-and-implementation.md
- Structure/testing-strategy.md
- Structure/requirements/01-system-overview.md
- Structure/architecture/01-system-overview.md
- Structure/phase_promptioing/README.md

Validation tier: Tier A.

Your task is to create the reset baseline and the main issue-audit document:
- create `Structure/ux-redesign-audit.md`
- document the current-state UX, IA, copy, and workflow problems in detail
- cover mobile, web, admin, auth, device-binding, classroom management, attendance modes, reports, and support/admin flows
- explicitly state the locked product decisions for the reset track:
  - one mobile app with separate teacher and student entry
  - teacher mobile Bluetooth only
  - teacher web QR + GPS only
  - student self-registration plus one-device binding
  - admin login-only with recovery powers
- rewrite `Structure/context.md` so the current repo state and this new reset track can both be understood by later chats
- update `Structure/requirements/01-system-overview.md` and `Structure/architecture/01-system-overview.md` if the reset baseline clarifies product intent

The audit file must be detailed enough that later prompts can reuse it as the UX source of truth.

Run relevant low-cost checks, keep the docs internally consistent, and leave the next pickup point in `Structure/context.md`.
```

## Prompt 2
```text
You are executing AttendEase product reset Prompt 2 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/requirements/02-auth-roles-enrollment.md
- Structure/requirements/03-student-mobile-app.md
- Structure/requirements/04-teacher-mobile-app.md
- Structure/requirements/05-teacher-web-app.md
- Structure/architecture/02-auth-roles-enrollment.md
- Structure/architecture/03-student-mobile-app.md
- Structure/architecture/04-teacher-mobile-app.md
- Structure/architecture/05-teacher-web-app.md

Validation tier: Tier A.

Your task is to lock the final information architecture and role boundaries for the reset:
- define the final first-run entry map for mobile
- define separate student and teacher auth flows on mobile
- define separate teacher and admin auth flows on web
- define final top-level navigation sections for:
  - student mobile
  - teacher mobile
  - teacher web
  - admin web
- normalize product-facing naming:
  - classroom
  - course code
  - studentsp
  - attendance session
  - present or absent
  - device registration
- remove or de-prioritize developer-facing language such as shell, foundation, readiness, and local verification from user-facing surfaces
- update the matching requirement and architecture docs to reflect the final IA and role separation
- update `Structure/context.md` with the final IA decisions and next pickup point

This prompt is not complete if later prompts would still need to guess the route structure or role boundaries.
```

## Prompt 3
```text
You are executing AttendEase product reset Prompt 3 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/testing-strategy.md
- apps/mobile/package.json
- apps/web/package.json
- packages/ui-mobile/src/index.ts
- packages/ui-web/src/index.ts

Validation tier: Tier B.

Your task is to implement the shared visual and content foundation for the reset:
- create or refine shared mobile and web design primitives needed for the cleaner UX
- improve typography, spacing, surface hierarchy, and CTA emphasis
- establish content rules that kee copy short and user-facing
- remove placeholder-heavy or explanation-heavy UI patterns where the current shells encourage them
- keep the output aligned with the current repo design system structure instead of inventing a disconnected styling layer
- add or update tests for any shared UI helpers, theme builders, or content-shaping logic that change
- update relevant mobile and web architecture docs plus `Structure/testing-strategy.md` if test placement changes
- update `Structure/context.md`

This prompt is about reusable foundation, not final feature screens.
```

## Prompt 4
```text
You are executing AttendEase product reset Prompt 4 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- packages/contracts/src/auth.ts
- packages/contracts/src/academic.ts
- packages/contracts/src/attendance.ts
- packages/contracts/src/devices.ts
- apps/api/src/modules/auth
- apps/api/src/modules/devices
- apps/api/src/modules/academic

Validation tier: Tier A.

Your task is to lock the contract migration foundation for the reset:
- identify which existing contracts remain valid
- reshape the contracts that must change for:
  - separate registration flows
  - device-binding-at-registration
  - classroom and roster CRUD
  - live attendance-session discovery
  - manual attendance add/remove flows
  - admin recovery and governance
- implement the shared contract updates in `packages/contracts`
- update any affected auth API client helpers in `packages/auth`
- add or update contract and client tests
- update matching requirement and architecture docs
- update `Structure/context.md`

Do not leave the later prompts to invent wire shapes or naming.
```

## Prompt 5
```text
You are executing AttendEase product reset Prompt 5 of 40.

Read these files first:
- Structure/context.md
- Structure/testing-strategy.md
- package.json
- turbo.json
- apps/api/package.json
- apps/api/src/test/integration-helpers.ts
- apps/api/src/test

Validation tier: Tier A.

Your task is to stabilize the validation baseline for this reset track:
- fix the current API integration test execution pain so per-prompt checks are reliable
- make sure the repo has a practical command strategy for:
  - targeted API integration tests
  - targeted mobile tests
  - targeted web tests
  - native Android validation for mobile runtime prompts
- update `Structure/testing-strategy.md` with the reset-track expectations
- update `README.md` if command guidance changes materially
- add or update tests for any new helper logic or execution wrapper logic
- run the improved targeted checks and confirm they are usable
- update `Structure/context.md`

Do not continue the feature prompts until the validation story is dependable enough to use after each micro-phase.
```

## Prompt 6
```text
You are executing AttendEase product reset Prompt 6 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/requirements/02-auth-roles-enrollment.md
- Structure/architecture/02-auth-roles-enrollment.md
- Structure/architecture/15-device-trust-and-admin-controls.md
- packages/contracts/src/auth.ts
- apps/api/src/modules/auth
- packages/db/prisma/schema.prisma

Validation tier: Tier A.

Your task is to implement student self-registration:
- add final student registration contracts
- implement API endpoint and service logic
- create the required DB write flow for student account creation
- bind the initial device-registration payload at signup time
- reject incomplete or invalid registration requests cleanly
- ensure the response shape supports later mobile onboarding work
- add or extend auth integration tests, DB tests, and contract tests
- update the matching auth and device-trust requirement and architecture docs
- update `Structure/context.md`

Student registration is not complete if it still behaves like a developer-only seeded login path.
```

## Prompt 7
```text
You are executing AttendEase product reset Prompt 7 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/requirements/02-auth-roles-enrollment.md
- Structure/architecture/02-auth-roles-enrollment.md
- apps/api/src/modules/auth
- packages/contracts/src/auth.ts
- packages/db/prisma/schema.prisma

Validation tier: Tier A.

Your task is to implement teacher self-registration while keeping admin provisioned and login-only:
- add final teacher registration contracts
- implement API endpoint and service logic
- keep teacher role creation, profile creation, and security rules explicit
- confirm admin registration remains unavailable through public routes
- update client helpers that need the teacher registration path
- add or extend auth integration tests, policy tests, and contract tests
- update the matching auth and web/mobile requirement and architecture docs
- update `Structure/context.md`

Do not blur teacher registration and admin provisioning.
```

## Prompt 8
```text
You are executing AttendEase product reset Prompt 8 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/requirements/03-student-mobile-app.md
- Structure/requirements/04-teacher-mobile-app.md
- Structure/architecture/03-student-mobile-app.md
- Structure/architecture/04-teacher-mobile-app.md
- apps/mobile/app
- apps/mobile/src/auth.ts
- apps/mobile/src/student-session.tsx
- apps/mobile/src/teacher-session.tsx

Validation tier: Tier C.

Your task is to rebuild the mobile unauthenticated entry flow:
- add a true first-run landing page
- separate the student and teacher entry choices clearly
- add separate login and registration screens for each role
- stop defaulting the whole app into the student route group
- keep session bootstrapping logic compatible with the new entry flow
- remove or de-prioritize dev-oriented auth UX
- add or update mobile tests for route selection, session gating, and auth-screen state
- run native Android validation for the new entry flow
- update matching mobile requirement and architecture docs
- update `Structure/context.md`

The mobile app should feel like two clearly separated products sharing one binary.
```

## Prompt 9
```text
You are executing AttendEase product reset Prompt 9 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/requirements/05-teacher-web-app.md
- Structure/architecture/05-teacher-web-app.md
- apps/web/app/login
- apps/web/src/auth.ts
- apps/web/src/web-portal.ts
- apps/web/src/web-auth-session.ts

Validation tier: Tier A.

Your task is to rebuild the web authentication experience:
- create a clean teacher web login and registration flow
- create a clean admin login flow
- remove the current local-verification feel from the web entry screens
- keep cookie/session behavior correct while making the UX product-ready
- make role handoff to teacher or admin portal explicit
- add or update web tests for auth routing, session cookies, and role gating
- update the matching requirement and architecture docs
- update `README.md` and `guide.md` if login setup or manual verification changed
- update `Structure/context.md`

Do not expose seeded-account helper copy as the primary experience.
```

## Prompt 10
```text
You are executing AttendEase product reset Prompt 10 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/requirements/02-auth-roles-enrollment.md
- Structure/architecture/15-device-trust-and-admin-controls.md
- apps/api/src/modules/devices
- apps/api/src/modules/admin
- packages/contracts/src/devices.ts
- apps/mobile/src/device-trust.ts

Validation tier: Tier D.

Your task is to finish the student one-device lifecycle:
- enforce the final registration-time device binding rules
- ensure attendance-sensitive student flows use the bound device state
- keep teacher and admin outside the strict student attendance-device gate
- implement the clean replacement-device lifecycle expected by the reset
- expose clear state for blocked, replaced, pending, and trusted device cases
- add or extend API integration tests, mobile device-state tests, and admin recovery tests
- run native Android validation for registration and device-state UX
- update the matching device-trust, auth, and admin docs
- update `Structure/context.md`

Do not regress into vague device identity or hidden admin recovery behavior.
```

## Prompt 11
```text
You are executing AttendEase product reset Prompt 11 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/architecture/13-academic-management-and-scheduling.md
- Structure/architecture/14-classroom-communications-and-roster.md
- packages/domain/src
- packages/contracts/src/academic.ts
- apps/api/src/modules/academic

Validation tier: Tier A.

Your task is to normalize the academic and classroom language plus domain boundaries:
- settle the final product-facing naming model for classroom, course, subject, roster, and session concepts
- make sure API models, domain helpers, and UI text can all speak the same language
- remove confusing overlap where the current model leaks internal distinctions into UX
- update contracts or mapping helpers as needed
- add or extend tests for any new mapping or naming logic
- update the matching academic and classroom architecture docs
- update `Structure/context.md`

This prompt should reduce later UX confusion, not increase it.
```

## Prompt 12
```text
You are executing AttendEase product reset Prompt 12 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/requirements/05-teacher-web-app.md
- Structure/architecture/13-academic-management-and-scheduling.md
- apps/api/src/modules/academic
- packages/contracts/src/academic.ts

Validation tier: Tier A.

Your task is to implement final classroom and course CRUD behavior:
- create classroom
- edit classroom
- archive classroom
- edit course info and course code
- ensure teacher and admin permissions are correct
- shape response data for the simpler reset UX
- add or extend API integration tests and contract tests
- update the matching academic, teacher-web, and teacher-mobile docs
- update `Structure/context.md`

These APIs should be ready for both teacher mobile and teacher web CRUD UX.
```

## Prompt 13
```text
You are executing AttendEase product reset Prompt 13 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/architecture/14-classroom-communications-and-roster.md
- apps/api/src/modules/academic
- packages/contracts/src/academic.ts

Validation tier: Tier A.

Your task is to implement final roster and enrollment CRUD behavior:
- add student to classroom
- edit student enrollment data relevant to the product
- remove student from classroom
- list and search classroom students cleanly
- preserve scope and permission rules
- ensure the data shapes support both mobile and web teacher flows
- add or extend integration tests and contract tests
- update matching roster, teacher-mobile, teacher-web, and admin docs
- update `Structure/context.md`

Do not leave roster behavior split awkwardly between platforms.
```

## Prompt 14
```text
You are executing AttendEase product reset Prompt 14 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/architecture/11-data-rules-audit.md
- Structure/architecture/14-classroom-communications-and-roster.md
- Structure/architecture/15-device-trust-and-admin-controls.md
- packages/db/src
- apps/api/src/modules/academic
- apps/api/src/modules/admin

Validation tier: Tier A.

Your task is to finalize archive, delete, and audit semantics for the reset:
- decide which product delete actions are true deletes and which are archive or soft-delete actions
- preserve attendance history and auditability
- keep UI language simple while backend behavior stays safe
- write or update any DB helper or service logic needed for safe deletion behavior
- add or extend DB tests and integration tests for destructive actions
- update matching data, roster, admin, and history docs
- update `Structure/context.md`

This prompt is not complete if later prompts still need to guess how delete works.
```

## Prompt 15
```text
You are executing AttendEase product reset Prompt 15 of 40.

Read these files first:
- Structure/context.md
- Structure/testing-strategy.md
- packages/db/src/fixtures.ts
- packages/db/src/seed.ts
- apps/api/src/test/integration-helpers.ts

Validation tier: Tier A.

Your task is to refresh the seed and fixture foundation for the reset flows:
- make sure registration, device binding, roster CRUD, session truth, and admin recovery have realistic seed data
- update helper factories used by API and mobile or web tests
- keep the fixture language aligned with the final UX naming
- add or update fixture and seed tests where needed
- update `Structure/testing-strategy.md` if test-seeding guidance changes
- update `Structure/context.md`

Later prompts should not waste time repairing weak test data.
```

## Prompt 16
```text
You are executing AttendEase product reset Prompt 16 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/requirements/03-student-mobile-app.md
- Structure/architecture/03-student-mobile-app.md
- apps/mobile/app/(student)
- apps/mobile/src/student-foundation.tsx
- apps/mobile/src/student-routes.ts

Validation tier: Tier C.

Your task is to redesign the student mobile shell:
- create the final student home/dashboard experience
- make enrolled courses and active attendance opportunities the focus
- simplify navigation, labels, and empty states
- make sure unauthenticated users cannot leak into student routes
- keep query and data loading behavior stable while improving UX
- add or update mobile tests for navigation, loading, and empty-state behavior
- run native Android validation for the student shell
- update matching student mobile docs
- update `Structure/context.md`

This prompt should make the student app feel intentional, not scaffold-like.
```

## Prompt 17
```text
You are executing AttendEase product reset Prompt 17 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/requirements/03-student-mobile-app.md
- Structure/architecture/03-student-mobile-app.md
- apps/mobile/src/student-foundation.tsx
- apps/mobile/src/student-workflow-models.ts

Validation tier: Tier C.

Your task is to implement the student course discovery flows:
- clean course list
- clear classroom or course detail
- active-session indicators by enrolled course
- better schedule and stream entry points where they still matter
- concise attendance summary context so the student knows where to act
- add or update mobile tests for course list, detail, and active-session state
- run native Android validation for the course-discovery UX
- update matching student and classroom docs
- update `Structure/context.md`

Do not leave the student to hunt through unrelated screens to find attendance actions.
```

## Prompt 18
```text
You are executing AttendEase product reset Prompt 18 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/requirements/03-student-mobile-app.md
- Structure/requirements/06-qr-gps-attendance.md
- Structure/architecture/03-student-mobile-app.md
- Structure/architecture/06-qr-gps-attendance.md
- apps/mobile/src/student-attendance.ts
- apps/mobile/app/(student)/attendance/qr-scan.tsx

Validation tier: Tier D.

Your task is to redesign the student QR attendance UX:
- clean QR scan entry
- clean camera permission flow
- clean location permission flow
- clean success, expired, invalid, duplicate, and out-of-range states
- make the flow short and obvious once a QR session is live
- keep existing security and validation behavior intact
- add or extend mobile tests for QR state handling
- run native Android validation for camera, location, and QR UX
- update matching student and QR docs
- update `Structure/context.md`

This prompt is not complete if the QR flow is still verbose or confusing.
```

## Prompt 19
```text
You are executing AttendEase product reset Prompt 19 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/requirements/03-student-mobile-app.md
- Structure/requirements/07-bluetooth-attendance.md
- Structure/architecture/03-student-mobile-app.md
- Structure/architecture/07-bluetooth-attendance.md
- apps/mobile/src/bluetooth-attendance.ts
- apps/mobile/app/(student)/attendance/bluetooth-scan.tsx

Validation tier: Tier D.

Your task is to redesign the student Bluetooth attendance UX:
- clear Bluetooth enable guidance
- clear scan-in-progress state
- clear in-range detection state
- clear multi-session selection when more than one valid teacher session is visible
- clear blocked, duplicate, expired, or invalid result states
- keep the attendance truth and security rules unchanged unless the docs require an explicit improvement
- add or extend mobile tests for Bluetooth scan and mark states
- run native Android validation for Bluetooth-related UX and lifecycle behavior where practical
- update matching student and Bluetooth docs
- update `Structure/context.md`

Do not fake real-device Bluetooth certainty if the environment cannot provide it. Record blockers honestly.
```

## Prompt 20
```text
You are executing AttendEase product reset Prompt 20 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/requirements/03-student-mobile-app.md
- Structure/requirements/09-reports-exports.md
- Structure/architecture/03-student-mobile-app.md
- Structure/architecture/09-reports-exports.md
- apps/mobile/src/student-foundation.tsx

Validation tier: Tier C.

Your task is to redesign student history, reports, and profile surfaces:
- make history easier to read
- make report summaries easier to understand
- surface subject or course attendance clearly
- keep profile and device-status useful without turning them into admin tools
- add or extend mobile tests for history, reports, and profile state
- run native Android validation for these student flows
- update matching student and report docs
- update `Structure/context.md`

The student should be able to understand personal attendance truth quickly.
```

## Prompt 21
```text
You are executing AttendEase product reset Prompt 21 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/requirements/04-teacher-mobile-app.md
- Structure/architecture/04-teacher-mobile-app.md
- apps/mobile/app/(teacher)
- apps/mobile/src/teacher-foundation.tsx
- apps/mobile/src/teacher-routes.ts

Validation tier: Tier C.

Your task is to redesign the teacher mobile shell:
- create a clean teacher home/dashboard
- simplify navigation
- keep classroom operations, active Bluetooth session, history, and reports easy to reach
- remove shell-like or placeholder-heavy copy
- add or update mobile tests for teacher shell navigation and loading states
- run native Android validation for the teacher shell
- update matching teacher mobile docs
- update `Structure/context.md`

This prompt should make teacher mobile feel separate from student mobile immediately.
```

## Prompt 22
```text
You are executing AttendEase product reset Prompt 22 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/requirements/04-teacher-mobile-app.md
- Structure/architecture/04-teacher-mobile-app.md
- Structure/architecture/13-academic-management-and-scheduling.md
- apps/mobile/src/teacher-foundation.tsx

Validation tier: Tier C.

Your task is to implement teacher mobile classroom and course management:
- classroom list
- create classroom
- edit classroom
- archive classroom
- edit course info and course code
- keep the UX short and task-oriented
- add or update mobile tests for classroom CRUD and edit state
- run native Android validation for teacher classroom management
- update matching teacher mobile and academic docs
- update `Structure/context.md`

Do not leave classroom management buried behind generic cards or placeholder workspaces.
```

## Prompt 23
```text
You are executing AttendEase product reset Prompt 23 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/requirements/04-teacher-mobile-app.md
- Structure/architecture/04-teacher-mobile-app.md
- Structure/architecture/14-classroom-communications-and-roster.md
- apps/mobile/src/teacher-foundation.tsx

Validation tier: Tier C.

Your task is to implement clean teacher mobile roster management:
- view student roster
- add student
- edit student enrollment details
- remove student
- make course-context and roster actions obvious
- add or update mobile tests for roster workflows
- run native Android validation for roster screens
- update matching teacher mobile and roster docs
- update `Structure/context.md`

The teacher should not need the web app just to manage a normal classroom roster.
```

## Prompt 24
```text
You are executing AttendEase product reset Prompt 24 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/requirements/04-teacher-mobile-app.md
- Structure/requirements/07-bluetooth-attendance.md
- Structure/architecture/04-teacher-mobile-app.md
- Structure/architecture/07-bluetooth-attendance.md
- apps/mobile/src/bluetooth-attendance.ts
- apps/mobile/src/teacher-operational.ts

Validation tier: Tier D.

Your task is to implement the final teacher mobile Bluetooth session setup and control flow:
- start Bluetooth attendance for a selected classroom
- configure the session cleanly
- show clear active-session state
- allow teacher to end the session cleanly
- preserve the current security and domain behavior while improving UX
- add or update mobile tests for session setup and state handling
- run native Android validation for Bluetooth session setup
- update matching teacher mobile and Bluetooth docs
- update `Structure/context.md`

Teacher mobile must clearly own Bluetooth attendance.
```

## Prompt 25
```text
You are executing AttendEase product reset Prompt 25 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/requirements/04-teacher-mobile-app.md
- Structure/requirements/08-session-history-manual-edits.md
- Structure/architecture/04-teacher-mobile-app.md
- Structure/architecture/08-session-history-manual-edits.md
- apps/mobile/src/teacher-foundation.tsx

Validation tier: Tier D.

Your task is to implement the teacher mobile live attendance and post-session correction flow:
- live marked-student list while the Bluetooth session is active
- clean session-detail view after session end
- add student as present when allowed
- remove or correct marked attendance when allowed
- make present and absent lists easy to read
- add or update mobile tests for live session and manual edit states
- run native Android validation for live-session behavior and correction screens
- update matching teacher mobile and history docs
- update `Structure/context.md`

This prompt is not complete if teachers still cannot clearly see who is marked and fix mistakes quickly.
```

## Prompt 26
```text
You are executing AttendEase product reset Prompt 26 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/requirements/04-teacher-mobile-app.md
- Structure/requirements/09-reports-exports.md
- Structure/architecture/04-teacher-mobile-app.md
- Structure/architecture/09-reports-exports.md
- apps/mobile/src/teacher-foundation.tsx

Validation tier: Tier C.

Your task is to redesign teacher mobile history and reporting surfaces:
- clearer session history
- clearer session detail
- clearer present and absent summaries
- cleaner report views
- keep export entry points sensible if they still belong on mobile
- add or update mobile tests for teacher history and reports
- run native Android validation for these teacher flows
- update matching teacher mobile and report docs
- update `Structure/context.md`

The teacher mobile app should support review and correction work cleanly, not just session launch.
```

## Prompt 27
```text
You are executing AttendEase product reset Prompt 27 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/requirements/05-teacher-web-app.md
- Structure/architecture/05-teacher-web-app.md
- apps/web/app/(teacher)
- apps/web/src/web-shell.tsx
- apps/web/src/web-portal.ts

Validation tier: Tier A.

Your task is to redesign the teacher web shell and dashboard:
- create a cleaner teacher dashboard
- simplify portal chrome
- put classrooms, live QR session launch, history, and reports in obvious places
- remove shell-heavy or explanatory cards that do not help the teacher act
- add or update web tests for teacher dashboard routing and page models
- update matching teacher-web docs
- update `Structure/context.md`

The teacher web app should feel like a working portal, not a placeholder surface.
```

## Prompt 28
```text
You are executing AttendEase product reset Prompt 28 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/requirements/05-teacher-web-app.md
- Structure/architecture/05-teacher-web-app.md
- Structure/architecture/13-academic-management-and-scheduling.md
- apps/web/src/teacher-workflows-client.tsx

Validation tier: Tier A.

Your task is to implement teacher web classroom and course management:
- classroom list
- create classroom
- edit classroom
- archive classroom
- edit course info and course code
- keep the UX aligned with teacher mobile while still using the web's strengths
- add or update web tests for classroom management workflows
- update matching teacher-web and academic docs
- update `Structure/context.md`

Do not leave classroom management split into confusing route islands.
```

## Prompt 29
```text
You are executing AttendEase product reset Prompt 29 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/requirements/05-teacher-web-app.md
- Structure/architecture/05-teacher-web-app.md
- Structure/architecture/14-classroom-communications-and-roster.md
- apps/web/src/teacher-workflows-client.tsx

Validation tier: Tier A.

Your task is to implement teacher web roster and student management:
- view class roster
- add student
- edit student enrollment details
- remove student
- keep student and course context visible
- add or update web tests for roster management
- update matching teacher-web and roster docs
- update `Structure/context.md`

This prompt should make web roster management as clear as the final mobile teacher flow.
```

## Prompt 30
```text
You are executing AttendEase product reset Prompt 30 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/requirements/05-teacher-web-app.md
- Structure/requirements/06-qr-gps-attendance.md
- Structure/architecture/05-teacher-web-app.md
- Structure/architecture/06-qr-gps-attendance.md
- apps/web/src/qr-session-shell.tsx
- apps/web/app/(teacher)/teacher/sessions/active

Validation tier: Tier A.

Your task is to implement the final teacher web QR + GPS setup flow:
- choose classroom
- set duration
- set allowed distance
- request teacher browser geolocation
- block session start cleanly when required preconditions fail
- keep the setup short and action-focused
- add or update web tests for setup form behavior and payload shaping
- update matching teacher-web and QR docs
- update `Structure/context.md`

Do not hide the key QR session controls under verbose explanatory UX.
```

## Prompt 31
```text
You are executing AttendEase product reset Prompt 31 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/requirements/05-teacher-web-app.md
- Structure/requirements/06-qr-gps-attendance.md
- Structure/architecture/05-teacher-web-app.md
- Structure/architecture/06-qr-gps-attendance.md
- apps/web/src/qr-session-shell.tsx
- apps/web/app/(teacher)/teacher/sessions/active/[sessionId]/projector/page.tsx

Validation tier: Tier A.

Your task is to implement the final teacher web live QR attendance screen:
- large QR display
- QR rotation every 2 seconds
- continuously visible timer
- live marked-student list
- clear end-session control
- clean layout for projector or classroom display use
- add or update web tests for QR rotation and live-session view models
- update matching teacher-web and QR docs
- update `Structure/context.md`

This screen is a flagship surface and should feel deliberately designed.
```

## Prompt 32
```text
You are executing AttendEase product reset Prompt 32 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/requirements/05-teacher-web-app.md
- Structure/requirements/08-session-history-manual-edits.md
- Structure/requirements/09-reports-exports.md
- Structure/architecture/05-teacher-web-app.md
- Structure/architecture/08-session-history-manual-edits.md
- Structure/architecture/09-reports-exports.md

Validation tier: Tier A.

Your task is to redesign teacher web history, reports, and manual-edit flows:
- session history
- session detail
- present and absent lists
- post-session manual add or remove attendance actions
- cleaner report filters and report outputs
- add or update web tests for history, reports, and manual edit view logic
- update matching teacher-web, history, and report docs
- update `Structure/context.md`

Teacher review and correction work should be efficient on web.
```

## Prompt 33
```text
You are executing AttendEase product reset Prompt 33 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/architecture/15-device-trust-and-admin-controls.md
- apps/web/app/(admin)
- apps/web/src/admin-workflows-client.tsx
- apps/web/src/admin-device-support-console.tsx

Validation tier: Tier A.

Your task is to redesign the admin web shell and dashboard:
- clean admin login handoff
- cleaner admin dashboard
- clearer separation of student, device, and course governance tools
- safer high-risk action UX
- add or update web tests for admin routing and page model behavior
- update matching admin and device-trust docs
- update `Structure/context.md`

The admin experience should feel controlled and powerful, not generic.
```

## Prompt 34
```text
You are executing AttendEase product reset Prompt 34 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/architecture/15-device-trust-and-admin-controls.md
- apps/api/src/modules/admin
- apps/web/src/admin-workflows-client.tsx

Validation tier: Tier A.

Your task is to implement the final admin student-management flow:
- search students
- inspect student account state
- archive or deactivate student where the product needs it
- expose enough context to support device-recovery decisions
- keep destructive actions safe and auditable
- add or extend admin integration tests and web tests
- update matching admin, auth, and roster docs
- update `Structure/context.md`

Admin student management should support recovery and governance, not only lookup.
```

## Prompt 35
```text
You are executing AttendEase product reset Prompt 35 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/architecture/15-device-trust-and-admin-controls.md
- apps/api/src/modules/admin
- apps/web/src/admin-device-support-console.tsx

Validation tier: Tier A.

Your task is to implement the final admin device-recovery flow:
- deregister current student device
- approve replacement device
- expose the right trust and audit context
- keep student one-device enforcement strict while recovery is possible
- add or extend admin integration tests, device-policy tests, and web tests
- update matching device-trust and admin docs
- update `Structure/context.md`

Do not leave device recovery half-hidden or policy-ambiguous.
```

## Prompt 36
```text
You are executing AttendEase product reset Prompt 36 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/architecture/13-academic-management-and-scheduling.md
- Structure/architecture/15-device-trust-and-admin-controls.md
- apps/api/src/modules/admin
- apps/web/src/admin-workflows-client.tsx

Validation tier: Tier A.

Your task is to implement the final admin course and classroom governance flow:
- archive or delete classroom or course safely
- preserve attendance history when required
- make the governance UX understandable to the admin
- add or extend integration tests and web tests for destructive governance actions
- update matching admin, academic, and data-rule docs
- update `Structure/context.md`

This prompt should complete the admin control surface required by the reset.
```

## Prompt 37
```text
You are executing AttendEase product reset Prompt 37 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/architecture/06-qr-gps-attendance.md
- Structure/architecture/07-bluetooth-attendance.md
- Structure/architecture/08-session-history-manual-edits.md
- apps/api/src/modules/attendance
- apps/mobile/src/student-foundation.tsx
- apps/mobile/src/teacher-foundation.tsx
- apps/web/src/qr-session-shell.tsx

Validation tier: Tier D.

Your task is to make live attendance session truth consistent across all clients:
- student sees active sessions correctly
- teacher mobile sees Bluetooth live roster correctly
- teacher web sees QR live roster correctly
- polling or realtime seams stay aligned
- session status transitions remain trustworthy across platforms
- add or extend API integration tests plus web and mobile tests for live session state
- run native Android validation for the mobile live-session behavior affected by this prompt
- update matching attendance, teacher-mobile, teacher-web, and student-mobile docs
- update `Structure/context.md`

This prompt should remove cross-client drift in live attendance state.
```

## Prompt 38
```text
You are executing AttendEase product reset Prompt 38 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/requirements/08-session-history-manual-edits.md
- Structure/requirements/09-reports-exports.md
- Structure/architecture/08-session-history-manual-edits.md
- Structure/architecture/09-reports-exports.md
- apps/api/src/modules/attendance
- apps/api/src/modules/reports
- apps/mobile/src/teacher-foundation.tsx
- apps/web/src

Validation tier: Tier D.

Your task is to harden shared session truth and correction behavior:
- manual add or remove attendance should behave the same across mobile and web
- reports and history should reflect corrected session truth consistently
- edge cases around edit windows, locked sessions, and duplicate actions must stay correct
- error messages should be concise and role-appropriate
- add or extend integration tests for manual edits and report consistency
- add or extend mobile and web tests where correction UX changed
- run native Android validation for any affected mobile correction flows
- update matching history, reports, and attendance docs
- update `Structure/context.md`

This prompt is not complete if correction behavior still differs by client.
```

## Prompt 39
```text
You are executing AttendEase product reset Prompt 39 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- Structure/testing-strategy.md
- README.md
- guide.md
- all requirement and architecture docs touched during the reset so far

Validation tier: Tier A.

Your task is to do the full documentation sync for the reset track:
- update all touched requirement docs
- update all touched architecture docs
- update `Structure/ux-redesign-audit.md` so it matches the implemented repo state
- update `Structure/context.md` with a clean reset-track handoff
- update `README.md`, `guide.md`, and `Structure/testing-strategy.md` where needed
- remove stale doc statements that still describe the pre-reset UX
- run any low-cost checks needed to keep docs and commands trustworthy

This prompt should leave the documentation good enough that Prompt 40 can validate, not rediscover, the final product story.
```

## Prompt 40
```text
You are executing AttendEase product reset Prompt 40 of 40.

Read these files first:
- Structure/context.md
- Structure/ux-redesign-audit.md
- README.md
- guide.md
- Structure/testing-strategy.md
- all requirement and architecture docs touched during the reset track

Validation tier: Tier D.

Your task is to run the final reset-track regression and acceptance pass:
- run the relevant targeted backend, web, mobile, and integration suites
- run the relevant typecheck and build or smoke commands
- run Android native validation for the mobile runtime flows changed by the reset
- verify:
  - split student and teacher mobile entry
  - teacher web auth and QR session flow
  - teacher mobile Bluetooth session flow
  - student QR marking UX
  - student Bluetooth marking UX
  - teacher session history and manual correction
  - teacher reports on mobile and web
  - student reports on mobile
  - admin device recovery and governance
- capture honest pass, fail, or blocked status
- update `Structure/context.md` with final completion notes
- update any release or guide docs if the final evidence changed user instructions

In the final summary, report:
- what is complete
- what commands were run
- what tests passed
- what Android-native checks were completed
- what still requires real-device validation or future work

Do not claim completion if the reset still has major UX, device, or attendance gaps.
```
