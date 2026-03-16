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

## Original Pre-Reset Baseline Problems

### 1. Before the reset, the product spoke like a scaffold

Before the reset prompts, the repo already worked in many places, but the UI still talked like an implementation scaffold instead of a finished product.

Common user-facing phrases still include:

- shell
- foundation
- route ready
- later
- local verification
- prepared
- bootstrapping
- attendance readiness
- live API
- Web Login Foundation
- Open Login Shell

This language forces users to understand the build process instead of the task they are trying to complete.

### 2. The information architecture is route-first, not role-first

The route trees exist, but the product mental model is still weak:

- mobile defaults directly into the student side instead of making role entry explicit
- teacher/admin web uses a shared layout, but the role value proposition is not clearly separated
- attendance mode ownership is technically implemented but not explained product-wise
- the product still expects users to discover workflows from page lists more than from clear primary actions

### 3. The UI still explains internal plumbing

Many screens describe:

- query invalidation
- future phases
- backend readiness
- route stability
- native scanner wiring
- shell states

That may have been useful during phased implementation, but it is poor end-user UX and weak product copy.

### 4. Dev bootstrap is too visible

The current product often exposes:

- seeded credentials
- install ID fields
- public key fields
- login helper wording
- local password verification language
- "development" framing in entry screens

These surfaces are useful for testing, but the product needs role-appropriate onboarding and sign-in, not visible developer scaffolding.

## Detailed Audit By Area

## Auth, Entry, And First-Run

### Pre-reset baseline

- the mobile root route redirected straight to the student dashboard
- student and teacher mobile both exposed session-setup cards instead of first-run auth/product entry
- the web home page was a scaffold landing page
- the web login page worked locally but was framed as a dev helper

### Problems

- there is no deliberate first-run choice between student and teacher inside the mobile app
- there is no clean student registration journey in the app
- teacher sign-in and student sign-in do not yet feel like distinct product paths
- admin is technically separate but not clearly positioned as a governance/recovery role
- local password login is now functional, but the page still reads like a temporary support surface instead of a finished sign-in experience

### Reset implications

- later prompts must establish distinct first-run entry for student and teacher
- student registration must become a real product flow
- admin web login must read like a support/governance sign-in, not an alternate teacher sign-in
- developer bootstrap inputs must move behind dev-only tooling, not remain the visible primary UX

## Student Mobile

### Pre-reset baseline

Student mobile already covers:

- dashboard
- classroom detail
- stream
- schedule
- profile
- device status
- reports
- history
- join classroom
- QR attendance
- Bluetooth attendance

### Problems

1. Entry is wrong.
   - the app opens into the student route by default, even though the reset requires explicit student vs teacher entry

2. Session setup is developer-facing.
   - the student setup card exposes email, password, install ID, and public key inputs
   - the copy says "Use seeded student credentials to connect the mobile shell to the live API"

3. Attendance is still overly technical.
   - the attendance hub and attendance mode routes mention trusted-device readiness, lecture candidates, query invalidation, and native wiring
   - Bluetooth currently exposes detected payloads, service UUIDs, RSSI, and selection mechanics in a way that is useful for debugging but not polished for students

4. Device trust is not explained in user terms.
   - the product talks about trust/readiness states, but not clearly enough about what the student must do, why one device is allowed, and how replacement works

5. Navigation is feature-complete but not task-prioritized.
   - dashboard, classroom, attendance, reports, history, profile, and device status exist, but the product still feels like a collection of validated routes rather than a clear student journey

6. Empty and support states often sound procedural instead of reassuring.
   - many screens tell the user what backend/data condition is missing instead of what to do next in plain product language

### Reset implications

- student mobile should become registration-first, attendance-first, and classroom-first
- Bluetooth attendance should stay student-visible as a marking path, but teacher ownership of Bluetooth creation must stay on teacher mobile
- device binding must be presented as a product rule during onboarding, not as technical bootstrap state

## Teacher Mobile

### Pre-reset baseline

Teacher mobile already covers:

- dashboard
- classrooms
- roster
- schedule
- announcements
- lectures
- Bluetooth create
- Bluetooth active session
- session history and manual edit
- reports
- exports

### Problems

1. Teacher entry is not explicit enough.
   - the product still uses a session setup card with seeded credentials instead of a deliberate teacher sign-in flow

2. Bluetooth ownership exists technically, but the UX still sounds provisional.
   - Bluetooth create and active-session surfaces still reference shell states, recovery scaffolding, and classroom-only fallback candidates

3. The product mix is too broad on small screens.
   - history, reports, exports, announcements, roster, schedules, and Bluetooth all exist, but the current IA does not make the teacher mobile core mission feel clear

4. Teacher copy still leaks implementation thinking.
   - examples mention lecture-backed candidates, shell fallback, route stability, and future swaps

5. Session history and manual edit are powerful, but the product language is still mostly operational rather than teacher-friendly.

### Reset implications

- teacher mobile must clearly own Bluetooth attendance initiation
- Bluetooth creation and active-session flows should become primary teacher-mobile actions
- the rest of teacher mobile should support daily teaching operations without sounding like a debug console

## Teacher Web

### Pre-reset baseline

Teacher web already covers:

- dashboards
- classrooms
- semester visibility
- QR sessions and projector
- session history/manual edits
- reports
- exports
- analytics
- email automation

### Problems

1. The landing and login pages still look like internal tools.
   - the web home page introduced the portal as a shell
   - the login page used strings such as "Web Login Foundation" and "Local Password Sign-In"

2. Dashboard content is placeholder-heavy.
   - metrics like `Live API`, `Route ready`, `Web only`, and `Automation-ready` communicate implementation status instead of actual teacher value

3. Many pages are generic container pages rather than strong task workflows.
   - the shared page shell is useful technically, but it flattens important teacher tasks into the same visual weight

4. QR + GPS ownership is implemented, but the workflow still over-explains the architecture.
   - projector and active-session pages talk about polling today, later realtime transport, stable route boundaries, and prepared sections

5. Reports/exports/analytics are present, but the hierarchy between:
   - daily attendance work
   - history and corrections
   - reporting
   - analytics
   - email automation
   is not strong enough yet

### Reset implications

- teacher web should feel like the main teacher operations surface
- QR + GPS session creation and projector flow must become the obvious attendance path on web
- reporting and analytics should stay on web, but with clearer progression from overview to detail to action

## Admin Web And Support/Governance

### Pre-reset baseline

Admin web already covers:

- dashboard
- devices
- imports
- semesters

### Problems

1. Admin still feels like "teacher web with different pages" instead of a distinct governance console.
2. Device recovery power is implemented, but the UI language does not strongly communicate audit, risk, or support responsibility.
3. Imports, device recovery, and semester governance do not yet read as a connected support workflow.
4. Admin login should remain separate from student/teacher self-registration, but the current top-level framing does not emphasize that enough.

### Reset implications

- admin must stay login-only
- admin needs a clearer governance/support identity than teacher web
- device recovery, student support, imports, and academic governance should read like intentional admin tools, not leftovers from teacher flows

## Device Binding And Registration

### Pre-reset baseline

- device trust backend rules are strong
- one-device enforcement exists
- admin recovery exists
- attendance readiness checks exist

### Problems

1. The current student-facing setup exposes technical artifacts:
   - install ID
   - public key
   - readiness states

2. One-device policy is not currently introduced through product onboarding.
3. Recovery is possible, but the end-user story is not yet clear:
   - what happens on a phone change
   - what happens on a reinstall
   - when admin support is needed

4. The product must not regress to MAC-address-only enforcement, but the current UX still does not clearly express the real device-binding rule.

### Reset implications

- student self-registration must include device-binding at onboarding time
- device binding must be explained with plain language and explicit recovery pathways
- admin recovery powers must remain real but be framed as exceptional support actions

## Classroom, Roster, Join Code, And Scheduling

### Pre-reset baseline

Current flows already exist for:

- classroom list and detail
- roster management
- join codes
- semester views
- schedule editing
- lectures
- imports
- stream/announcements

### Problems

1. Terminology is inconsistent.
   - classroom
   - course offering
   - class
   - section
   - subject
   - semester
   are all present in the model, but the UX is not disciplined enough about what users actually see

2. Join-code and roster flows are split across multiple surfaces without a clear "manage students" mental model.
3. Schedule and lectures are linked correctly technically, but the product copy still sounds like route-level tooling.
4. Classroom detail pages are often more like nav containers than fully shaped task pages.

### Reset implications

- later prompts must lock a final naming system and reuse it consistently
- roster, imports, join code, and attendance session ownership should become easier to discover from classroom detail

## Attendance Modes

### Pre-reset baseline

- student has QR and Bluetooth attendance routes
- teacher mobile owns Bluetooth session creation
- teacher web owns QR + GPS session creation
- backend truth for both attendance modes exists

### Problems

1. Attendance mode ownership is not obvious from the UX itself.
2. Student attendance screens still expose too much verification detail.
3. QR + GPS and Bluetooth permission states are functional, but the product language is still more technical than reassuring.
4. The product needs a simpler rule:
   - if the teacher starts Bluetooth, students use Bluetooth on mobile
   - if the teacher starts QR + GPS, students use QR on mobile

### Reset implications

- teacher mobile must stay the Bluetooth owner
- teacher web must stay the QR + GPS owner
- later prompts should simplify student mode choice and surface whichever attendance session is actually available

## Reports, Exports, And Analytics

### Pre-reset baseline

- backend truth is correct
- student mobile reports are API-backed
- teacher mobile reports are API-backed
- web reports, exports, analytics, and email automation are live

### Problems

1. The data truth is good, but the presentation hierarchy is still weak.
2. Mobile reports need concise progress-first framing, not dense workflow framing.
3. Teacher mobile exports are real, but mobile should not feel like a secondary analytics workstation.
4. Web analytics and exports still inherit some generic shell language and placeholder chart language.

### Reset implications

- student mobile reports should emphasize simple attendance understanding
- teacher mobile reports should emphasize classroom action, not data exploration
- teacher web should own richer filtering, exports, analytics, and automation depth

## Copy And Content Audit

### Problem pattern

The biggest copy issue is that the product still narrates its own implementation.

### Current anti-patterns to remove

- "shell"
- "foundation"
- "ready for the later..."
- "route is stable..."
- "prepared dataset"
- "polling today"
- "query invalidation"
- "dev bootstrap"
- "local verification"
- "seeded credentials"
- "connect the shell to the live API"
- "Open Login Shell"

### Replacement rule

User-facing copy in the reset track should:

- describe the user goal
- describe the next action
- explain failure in plain product language
- avoid architecture/process explanations
- avoid future-phase framing

## Reset Baseline Decisions For Later Prompts

Later prompts should treat these as baseline product intent:

1. The mobile app must open into a neutral role entry, not directly into the student dashboard.
2. Student onboarding must be real self-registration with device binding, not dev session bootstrap.
3. Teacher mobile must feel like the Bluetooth attendance owner plus supporting classroom toolset.
4. Teacher web must feel like the QR + GPS attendance owner plus the richer reporting/analytics workspace.
5. Admin must feel like a governance and recovery console, not a second teacher shell.
6. The product must stop exposing implementation-phase copy and placeholder status labels.
7. Classroom, attendance, reporting, and recovery terminology must be normalized once and reused everywhere.

## What Later Prompts Must Not Preserve

- automatic mobile redirect into the student side
- visible install ID / public key fields in normal user onboarding
- local-verification framing on the main web login page
- dashboard metrics that describe implementation readiness instead of product value
- "shell" and "foundation" language in user-facing screens
- dual ownership ambiguity between teacher web and teacher mobile attendance modes
- any regression back to MAC-address-only device enforcement

## Open Questions To Resolve In Later Prompts

These are not locked in Prompt 1, but later prompts must settle them explicitly:

- final first-run mobile entry layout
- exact student registration fields and verification order
- exact teacher sign-in/onboarding path on mobile
- final teacher web landing page and dashboard CTA order
- final admin dashboard information architecture
- final product vocabulary for classroom/course code/subject/attendance session/device registration
