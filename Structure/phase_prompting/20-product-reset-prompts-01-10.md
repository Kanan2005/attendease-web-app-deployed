## Prompt 1
```text
You are executing AttendEase product reset Prompt 1 of 40.

Read these files first:
- Structure/context.md
- Structure/final-tech-stack-and-implementation.md
- Structure/testing-strategy.md
- Structure/requirements/01-system-overview.md
- Structure/architecture/01-system-overview.md
- Structure/phase_prompting/README.md

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
