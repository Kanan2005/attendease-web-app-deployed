# AttendEase UX Redesign Audit

Last updated: 2026-03-16
Owner: Product reset track
Status: Source of truth for the implemented reset state, the premium visual direction, and the full screenshot-audit handoff

## Purpose

This document captures the original UX baseline problems that motivated the reset track and now also records the implemented reset state so later prompts do not have to rediscover what changed.

This is not a feature wishlist. It is the baseline diagnosis plus implemented-state handoff for what was confusing, overly technical, fragmented, or visibly unfinished before the reset prompts rebuilt the product surfaces.

## Evidence Sources

This audit is based on:

- the current mobile route tree in `apps/mobile/app`
- the current web route tree in `apps/web/app`
- the current mobile foundations in `apps/mobile/src/student-foundation.tsx` and `apps/mobile/src/teacher-foundation.tsx`
- the current web shell and workflow surfaces in `apps/web/src/web-shell.tsx`, `apps/web/src/web-portal.ts`, `apps/web/src/teacher-workflows-client.tsx`, and `apps/web/src/admin-workflows-client.tsx`
- the current login surfaces in `apps/mobile` session setup cards and `apps/web/app/login/page.tsx`
- the existing release-readiness findings already captured in `Structure/release-readiness-report.md`
- the deterministic screenshot inventory in `Structure/full-product-screenshot-audit.md`
- the deterministic mobile/web audit artifacts under `Structure/artifacts/full-product-audit`

## Locked Product Decisions For The Reset Track

These are locked and must not be re-decided in later prompts:

1. One shared mobile app, but with separate student and teacher entry, auth, navigation, and mental model.
2. Teacher mobile owns Bluetooth attendance only.
3. Teacher web owns QR + GPS attendance only.
4. Student onboarding is self-registration plus one-device binding.
5. Admin is login-only and holds recovery/governance powers.

Clarifications:

- "Teacher mobile Bluetooth only" means teacher mobile remains the Bluetooth attendance-session owner. It does not become the owner of QR + GPS attendance creation.
- "Teacher web QR + GPS only" means teacher web remains the QR + GPS attendance-session owner. It does not become the owner of Bluetooth attendance creation.
- "Admin login-only" means admins are provisioned and sign in; they do not follow the same self-registration flow as students.
- "One-device binding" means the reset track must preserve app/device binding and must not regress to MAC-address-only enforcement.
- Prompt 2 now locks teacher registration plus sign-in on mobile and web so later prompts can build one clear teacher-auth model instead of reopening this decision.

## Foundations Worth Preserving

The reset should not throw away these underlying strengths:

- the backend, worker, DB, export, reporting, analytics, and audit foundations are already real
- teacher web QR + GPS backend flows already exist
- teacher mobile Bluetooth backend flows already exist
- student and teacher mobile report truth now matches the backend report APIs
- session history, manual edit, export jobs, analytics refresh, and device trust are already real system capabilities
- local Docker runtime, health endpoints, and release-readiness tooling already exist

The reset should improve product clarity and workflows, not rebuild working backend truth from scratch.

## Reset Implementation Status

The repo now reflects the reset-track product decisions in shipped code rather than only in planning docs.

Implemented reset state:

- one shared mobile app now opens on a neutral role-entry screen with separate student and teacher sign in / registration flows
- student mobile now has a product-owned `Home`, `Classrooms`, `Attendance`, `Reports`, and `Profile` structure backed by live auth, classroom, attendance, history, and report APIs
- teacher mobile now has a distinct `Home`, `Classrooms`, `Bluetooth Attendance`, `Session History`, and `Reports & Exports` structure backed by live classroom CRUD, roster CRUD, Bluetooth control, correction, and report/export APIs
- teacher web now has clean teacher sign in / registration plus a working dashboard, classroom workspace, QR + GPS setup flow, live QR control/projector surfaces, session history, reports, exports, analytics, and email automation
- admin web now has login-only access plus distinct dashboard, student-support, device-recovery, imports, and semester/classroom-governance workspaces
- manual attendance correction, history, and reports now share corrected final truth across teacher mobile, teacher web, and student self-reports
- the shared mobile and web UI primitives now use a warmer premium visual system with stronger hierarchy, richer surfaces, tighter spacing rhythm, and clearer CTA emphasis
- the repo now includes a deterministic full-product screenshot audit that maps each screen in scope to a screenshot path plus a `PASS`, `FAIL`, `BLOCKED`, or `MANUAL-REQUIRED` status

## Implemented Premium Visual Direction

The reset now uses one shared visual language across mobile and web rather than placeholder-heavy shells.

Implemented direction:

- bright, high-trust layout structure with clearer task focus
- warmer premium surfaces and stronger card hierarchy
- more obvious primary CTAs with quieter secondary actions
- tighter spacing rhythm, cleaner typography scale, and shorter support copy
- role-distinct framing so student, teacher, and admin products feel related but not interchangeable

Implementation boundary:

- shared mobile primitives come from `packages/ui-mobile`
- shared web primitives come from `packages/ui-web`
- feature screens are expected to compose those primitives instead of inventing a disconnected styling layer

## Remaining Reset Gaps

What remains after the reset implementation and screenshot-audit pass is primarily validation and release hardening, not unresolved UX ownership:

- real-device QR camera and GPS signoff
- real-device Bluetooth advertiser/scanner signoff
- production environment validation for OIDC, SES, Sentry, and OTEL
- final release-readiness GO/NO-GO signoff after those hardware and environment checks

## Final Reset IA Decisions

These IA decisions are now locked for later reset prompts.

### Mobile First-Run Entry Map

1. App opens to a neutral role-entry screen, not directly into the student dashboard.
2. Student entry offers:
   - Create student account
   - Student sign in
3. Teacher entry offers:
   - Create teacher account
   - Teacher sign in
4. Admin has no mobile entry path.
5. After authentication, the app lands in the role-owned navigation tree for that role only.
6. If a person can operate in multiple roles later, the role choice happens at entry or account switching, not inside a mixed dashboard.

### Web Auth Split

- Teacher web owns:
  - teacher sign in
  - teacher registration
- Admin web owns:
  - admin sign in only
- Teacher and admin auth must not share the same primary framing, even if they still use the same backend auth service.

### Final Top-Level Navigation Sections

Student mobile:

- Home
- Classrooms
- Attendance
- Reports
- Profile

Teacher mobile:

- Home
- Classrooms
- Bluetooth Attendance
- Session History
- Reports & Exports

Teacher web:

- Dashboard
- Classrooms
- Attendance Sessions
- Reports
- Exports
- Analytics
- Email Automation

Admin web:

- Dashboard
- Student Support
- Device Recovery
- Imports
- Semesters

### Role Ownership Rules

- Student mobile owns student onboarding, classroom participation, attendance marking, self-history, self-reports, and device-registration support messaging.
- Teacher mobile owns Bluetooth attendance creation and control plus teacher classroom operations that make sense on a phone.
- Teacher web owns QR + GPS attendance creation, projector mode, richer session history, reports, exports, analytics, and email automation.
- Admin web owns governance, device recovery, imports oversight, and semester management.

## Canonical Product Naming

The reset track standardizes these product-facing terms:

- `Classroom`
  - canonical name for the teacher-owned teaching space
  - avoid exposing `course offering` in primary UI
- `Course code`
  - short identifier shown with a classroom
  - use in cards, lists, and detail headers instead of raw internal scope labels
- `Subject`
  - canonical academic discipline label shown with a classroom
  - avoid mixing subject identity with classroom naming in primary UI
- `Roster`
  - canonical name for the classroom student-management area
  - avoid exposing `enrollment` as the main teacher-facing noun
- `Students`
  - canonical name for people inside the classroom
  - backend may still use enrollment records, but the UI should talk about students
- `Class session`
  - canonical name for a scheduled or manually created teaching occurrence
  - current backend `lecture` records are an implementation detail, not the primary product label
- `Attendance session`
  - canonical name for one attendance-taking event, whether QR + GPS or Bluetooth
  - avoid `lecture candidate`, `active lecture`, or similar implementation phrasing in product copy
- `Present` / `Absent`
  - canonical final status labels
  - avoid using `marked` or `unmarked` as the primary final-state language
- `Device registration`
  - canonical student-facing phrase for binding the phone used for attendance
  - avoid exposing `install ID`, `public key`, `binding`, or `readiness` in normal user copy

Implementation note:

- current backend and route seams may still contain `courseOffering`, `enrollment`, and `lecture`
- reset-track UI work should consume the new product-facing aliases and helper vocabulary instead of reusing those internal labels directly

## Copy Cleanup Rules

Later reset prompts should remove these words from normal user-facing surfaces unless a page is explicitly developer-only:

- shell
- foundation
- readiness
- local verification
- prepared
- bootstrap
- route ready
- live API

## Current Product Inventory

### Mobile

Current route groups:

- student:
  - dashboard
  - join classroom
  - history
  - reports
  - profile
  - device status
  - attendance hub
  - QR scan
  - Bluetooth scan
  - classroom detail
  - classroom stream
  - classroom schedule
- teacher:
  - dashboard
  - classrooms list
  - classroom detail
  - roster
  - schedule
  - announcements
  - lectures
  - Bluetooth create
  - Bluetooth active session
  - session history
  - session detail / manual edit
  - reports
  - exports

### Web

Current route groups:

- teacher:
  - dashboard
  - classrooms
  - classroom create
  - classroom detail
  - roster
  - schedule
  - stream
  - lectures
  - imports
  - semesters
  - session history
  - QR active session
  - QR projector
  - reports
  - exports
  - analytics
  - email automation
- admin:
  - dashboard
  - semesters
  - devices
  - imports
- shared:
  - login
  - password login POST

## Screenshot Audit Source Of Truth

The reset now has one deterministic audit artifact set for route coverage and visual review:

- audit matrix: `Structure/full-product-screenshot-audit.md`
- mobile artifacts: `Structure/artifacts/full-product-audit/mobile`
- web artifacts: `Structure/artifacts/full-product-audit/web`

Audit interpretation rules:

- `PASS` means the expected route and screen state were captured successfully
- `FAIL` means a product defect was reproduced
- `BLOCKED` means code or environment prevented the expected route/state
- `MANUAL-REQUIRED` means hardware-only proof is still needed even when the route UI is captured

This audit improves product review speed, but it does not replace real-device validation for QR camera, GPS accuracy/range, or BLE proximity.

## Baseline Archive

The original pre-reset diagnosis, route inventories, copy audit, and baseline implications now live
in [`./ux-redesign-audit-baseline.md`](./ux-redesign-audit-baseline.md).
