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
