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
