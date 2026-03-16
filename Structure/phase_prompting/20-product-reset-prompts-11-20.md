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
