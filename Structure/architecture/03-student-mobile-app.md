# Student Mobile App Architecture

Maps to: [`../requirements/03-student-mobile-app.md`](../requirements/03-student-mobile-app.md)

## Purpose

This document explains how the student-facing mobile experience will be implemented in code.

## Reset Implementation Snapshot

The reset-track student mobile architecture is now implemented in the shared Expo app.

- neutral role entry plus student auth screens are live
- student home, classroom discovery, attendance, reports, history, profile, and device-status flows are live
- the student shell now reads shared live-session, history, and report truth from backend-owned APIs

## Runtime Stack

The student app is part of `apps/mobile` and will use:

- React Native
- Expo prebuild
- Expo Router
- TanStack Query for server-state
- Zustand for local UI/session state
- secure storage for auth
- native QR and BLE modules where required

## Why Expo Prebuild

Expo prebuild gives:

- easier mobile project setup
- simpler OTA and release workflow later
- access to native modules when BLE support needs custom code

If BLE implementation requires deeper native control, the app can still continue in prebuild mode without changing the product architecture.

## Final Student Route Map

The reset track now locks this student-mobile route shape:

```text
apps/mobile/app/
  index.tsx
  (entry)/
    student/sign-in.tsx
    student/register.tsx
    teacher/sign-in.tsx
    teacher/register.tsx
  (student)/
    index.tsx
    classrooms/
      index.tsx
      join.tsx
      [classroomId].tsx
      [classroomId]/stream.tsx
      [classroomId]/schedule.tsx
    attendance/
      index.tsx
      qr-scan.tsx
      bluetooth-scan.tsx
    reports/
      index.tsx
      history.tsx
      subject/[subjectId].tsx
    profile/
      index.tsx
      device-registration.tsx
```

Current implemented route group:

```text
apps/mobile/app/
  index.tsx
  (entry)/
    student/sign-in.tsx
    student/register.tsx
    teacher/sign-in.tsx
    teacher/register.tsx
  (student)/
    index.tsx
    classrooms/
      index.tsx
    join.tsx
    history.tsx
    reports.tsx
    reports/
      subject/[subjectId].tsx
    profile.tsx
    device-status.tsx
    attendance/
      index.tsx
      qr-scan.tsx
      bluetooth-scan.tsx
    classrooms/
      [classroomId].tsx
      [classroomId]/stream.tsx
      [classroomId]/schedule.tsx
```

Current implementation note:

- route names are now centralized in `apps/mobile/src/student-routes.ts` so home, reports, classroom, attendance, and device-status navigation stays consistent as later phases add richer mobile UI
- shared entry routing and auth-form state now live in `apps/mobile/src/mobile-entry-models.ts`
- `apps/mobile/app/(student)/_layout.tsx` now acts as a student-session gate and redirects unauthenticated student access back to the student sign-in screen
- later reset prompts should refine the current student routes toward the final route map above instead of inventing a second student tree

## Shared Visual And Copy Foundation

The reset foundation now expects student-mobile presentation primitives to come from
`packages/ui-mobile/src/index.ts`.

Current implementation note:

- `mobileTheme` now centralizes shared spacing, typography, surface, border, and CTA color tokens
- `findMobileContentIssues()` now provides a small content guardrail for user-facing copy so
  student entry and shared shell content stop reintroducing developer terms
- `apps/mobile/src/shell.ts` plus `apps/mobile/src/mobile-entry.tsx` now own the shared role-entry
  landing screen and the student or teacher auth-screen copy that sits in front of protected routes
- `Structure/full-product-screenshot-audit.md` plus
  `Structure/artifacts/full-product-audit/mobile/student` now act as the deterministic visual
  inventory for the implemented student-mobile route tree

## Feature Modules

Recommended feature folders:

```text
apps/mobile/src/features/student/
  attendance/
  classrooms/
  history/
  dashboard/
  reports/
  profile/
  announcements/
  onboarding/
  security/

apps/mobile/src/services/
  api/
  auth/
  location/
  camera/
  bluetooth/
  permissions/
  device-trust/
  attestation/
```

Current implementation structure:

- `apps/mobile/src/student-foundation.tsx` is now the stable route-facing barrel
- `apps/mobile/src/student-foundation/index.ts` is the role-local export map
- student screens now live one-per-file inside `apps/mobile/src/student-foundation/`
- `queries.ts` and `shared-ui.tsx` hold the shared fetch/state and presentational helpers instead of mixing those concerns into a single `3000+` line screen file
- `Structure/codebase-structure.md` is the file-level ownership reference for this folder

## State Management Rules

### Server-State

Use TanStack Query for:

- current student profile
- current device trust state
- classroom memberships
- eligible classes and subjects
- personal history
- session detail
- attendance summary
- student report summaries

### Local UI State

Use Zustand for:

- active attendance mode selection
- scan-in-progress state
- temporary BLE scan results
- permission banners
- pending join-code modal state
- current classroom tab selection

Do not duplicate server data in local stores unless it is truly transient UI state.

Current implementation note:

- the current student app uses TanStack Query for live server-state and React component state for temporary mobile form inputs and attendance-entry controller state
- Zustand is still reserved for later mobile-specific transient state such as live BLE scan buffers and richer permission orchestration

## Dashboard Implementation

The student home screen should fetch:

- current student session and device-trust state
- joined classrooms
- live attendance opportunities
- recent class activity

Implementation details:

- session + device trust from `GET /auth/me`
- classrooms list from `GET /students/me/classrooms`
- attendance readiness from `GET /devices/trust/attendance-ready`
- open attendance opportunities from `GET /sessions/live`
- recent activity from the same classroom lecture queries so the home screen and attendance entry stay aligned

The home screen should support the reset flow where students can immediately see:

- whether attendance is open right now
- whether the phone is allowed to mark attendance
- which classroom to open next
- where to join a classroom if they are not enrolled yet

Current implementation status:

- the home screen is live and now pulls `GET /auth/me`, `GET /students/me/classrooms`, `GET /devices/trust/attendance-ready`, `GET /sessions/live`, and linked classroom lecture lists
- the new spotlight card is derived from shared student-home model logic so open-attendance, blocked-device, no-classroom, and ready-for-class states stay deterministic across later route work
- a dedicated open-attendance section now lists live QR + GPS or Bluetooth opportunities when any attendance sessions are open
- the home screen now previews a smaller classroom set and routes the student into `/(student)/classrooms` for full course discovery
- home loading, blocked, ready, and no-classroom states are now derived from shared `student-view-state` helpers with product-facing copy
- quick actions now route into attendance, join classroom, reports, attendance history, profile, and device-status flows

## Classroom Discovery Architecture

The reset student shell now uses a dedicated classroom-discovery route instead of burying course entry under the dashboard.

Implementation details:

- `apps/mobile/src/student-foundation.tsx` exposes `useStudentCourseDiscoveryData()`
- the discovery hook reuses:
  - `GET /students/me/classrooms`
  - `GET /devices/trust/attendance-ready`
  - `GET /sessions/live`
- `apps/mobile/src/student-workflow-models.ts` now owns:
  - `buildStudentCourseDiscoveryCards()`
  - `buildStudentClassroomDetailSummaryModel()`
- these shared mappers keep the classroom list and classroom-detail attendance summary aligned with the same attendance-session truth used by the marking flows

The course-discovery route is responsible for:

- ordering classrooms with open attendance first
- showing course code and attendance-mode context
- surfacing the next class session when no attendance session is open
- exposing direct entry points into classroom detail, updates, and schedule

The classroom-detail route is responsible for:

- the top attendance-summary card
- recent student-visible announcements
- linked class sessions
- report entry for the current subject

## Join Classroom Flow

Student classroom membership should not be hardcoded only through admin provisioning. The app must support classroom join flows.

Recommended flow:

1. student opens `Join Classroom`
2. enters class or join code
3. app calls `POST /classrooms/join`
4. API validates active join code, eligibility rules, semester status, and duplicate membership
5. classroom list refreshes and schedule or stream becomes visible

This supports the reference-app pattern while still allowing admin or bulk enrollment flows.

Current backend status:

- `POST /classrooms/join` is now live for student self-join
- `GET /students/me/classrooms` is now live for student classroom membership refresh
- the student join screen now uses a shared join-banner model for pending, success, and failure feedback, while query invalidation happens through the shared student query layer
- duplicate joins, expired codes, blocked memberships, dropped memberships, closed semesters, and completed classrooms are rejected before the app updates local state

## Mark Attendance Flow Architecture

The mark attendance screen is the entry point. It should:

- let the student choose QR or Bluetooth mode when both are available
- redirect into the required permission flow
- send the final validation request only after required device signals are available

The UI should use a coordinator hook such as:

- `useAttendanceMarkingController()`

This controller owns:

- selected mode
- permission status
- scan started state
- submission started state
- result banner state
- device-trust gate state

Current implementation status:

- `apps/mobile/src/student-foundation.tsx` now exposes a student attendance overview hook plus a mode-specific attendance controller
- the controller now resolves trusted-device gate state, shared live-session candidates, selected session context, permission state, QR payload draft state, result banners, and post-success cache invalidation targets
- reusable attendance-controller contracts now live in `apps/mobile/src/student-attendance.ts` so later QR and Bluetooth native work can plug into the same route-level state machine
- the QR route now also attaches the real `POST /attendance/qr/mark` call, the short four-step QR flow, location capture, and QR-specific banner mapping without changing the controller contract
- the Bluetooth route now also attaches the native BLE scanner boundary, detected-payload submission
  to `POST /attendance/bluetooth/mark`, trusted-device readiness checks, and Bluetooth-specific
  error mapping without changing the controller contract

## Device Trust and Blocked Attendance Architecture

The mobile app now has a dedicated trusted-device bootstrap layer in `apps/mobile/src/device-trust.ts`.

Current implementation responsibilities:

- build a device registration payload for the signed-in install
- expose placeholder attestation provider descriptions for Android and iOS
- call `POST /devices/register` through the shared auth client
- call `GET /devices/trust/attendance-ready` before student attendance-sensitive actions
- map blocked trust states into student-facing UX messages
- preserve the lifecycle-state labels returned by the backend instead of re-deriving trust status from lecture or session state

The current app also includes a blocked-attendance preview card so the support messaging can be iterated before the real QR and Bluetooth screens are implemented.

Current implementation status:

- device trust is now visible both on the dedicated device-status screen and inside the student attendance routes
- when `GET /devices/trust/attendance-ready` fails, the attendance controller now converts that into a blocked student flow instead of quietly falling back to auth-only device state
- the dedicated device-status screen now shows both the coarse trust state and the student-specific attendance lifecycle state, including `Trusted`, `Pending approval`, `Replaced`, `Blocked`, and `Unregistered`
- native Android validation now proves that student sign-in on the trusted seeded phone drives both the dashboard card and device-status screen from the same lifecycle-aware backend payload

## QR Scan Flow

### Mobile Client Steps

1. Choose the active attendance session when one is available.
2. Open the camera scanner or paste the live QR manually.
3. Decode or enter the QR payload from the teacher projector.
4. Request current location from the device only when the student reaches the location step.
5. Build the request object with QR payload, lat/lng, accuracy, and device timestamp.
6. Call `POST /attendance/qr/mark`.
7. Show concise success or failure state.
8. Invalidate student history, classroom, and summary queries.

### Modules Involved

- `features/student/attendance/qr-scan-screen.tsx`
- `services/camera/qrScanner.ts`
- `services/location/getCurrentPosition.ts`
- `services/api/attendanceApi.ts`

Current implementation status:

- the QR attendance route is already live and uses real trusted-device checks plus shared live-session candidates from `GET /sessions/live`
- the route already owns QR payload draft state, QR scan banners, location banners, attendance-result banners, shared cache invalidation wiring, and real QR submit integration
- the route now keeps the QR flow short by separating camera, location, and submission into one ordered screen instead of a single verbose card
- the route now also maps expired QR, invalid QR, session-closed, duplicate, low-accuracy GPS, and out-of-range failures into dedicated student-facing banners instead of a generic submission error
- Expo Camera is now the on-device scanner seam and Expo Location is now the on-device GPS capture seam
- web preview intentionally keeps manual QR payload entry so the same route can still be exercised in exported builds

## Bluetooth Scan Flow

### Mobile Client Steps

1. Open Bluetooth attendance screen.
2. Confirm Bluetooth is available on the phone.
3. Start foreground BLE scan for nearby AttendEase broadcasts.
4. Let the student choose the nearby teacher session if more than one is visible.
5. Submit the detected rotating identifier to `POST /attendance/bluetooth/mark`.
6. Show a concise result state.
7. Invalidate student history and summary queries.

### Modules Involved

- `features/student/attendance/bluetooth-scan-screen.tsx`
- `services/bluetooth/studentScanner.ts`
- `services/api/attendanceApi.ts`

Current implementation status:

- the Bluetooth attendance route is already live and uses the same trusted-device and open-lecture foundations as the QR route
- the route now shares the same permission and result-banner controller contract as QR, which keeps BLE-native integration work focused on scanning and submission rather than screen rewrites
- the route now uses a short student-facing flow for choose session, check Bluetooth, scan nearby teacher, and mark attendance
- the route now uses the native BLE scanner adapter and the live Bluetooth mark endpoint without changing the current student navigation or query structure
- the attendance hub and Bluetooth route now expose refresh actions so a teacher-started Bluetooth session can appear without restarting the student app
- the route now gives explicit student-facing states for Bluetooth unavailable, Bluetooth off, scan in progress, nearby teacher found, and multi-session selection
- the route now lets the student explicitly select a detected BLE payload when multiple nearby sessions are visible, and clear stale scan results without leaving the attendance screen
- expired, invalid, session-closed, duplicate, and blocked-device outcomes now stay in dedicated Bluetooth attendance banners instead of controller-style copy
- remaining Bluetooth work is now focused on real-device verification and later history or report reuse, not on replacing the current route structure

## Permissions Architecture

Permissions must be requested only when needed.

Implementation service:

- `services/permissions/permissionOrchestrator.ts`

This service should expose:

- `ensureCameraPermission()`
- `ensureLocationPermission()`
- `ensureBluetoothPermission()`

The UI must translate low-level permission errors into student-friendly messages.

## Student Reports Architecture

Students need more than raw history rows. The mobile app should offer a proper report view with:

- overall attendance percentage
- subject-wise percentage cards
- semester progress
- recent absences or low-attendance warnings

Recommended endpoints:

- `GET /students/me/reports/overview`
- `GET /students/me/reports/subjects`
- `GET /students/me/reports/subjects/:subjectId`

These report screens should be optimized for reading, not editing.

Current implementation status:

- report overview and subject-wise routes are now implemented in the mobile app
- the mobile report routes now use `GET /students/me/reports/overview`, `GET /students/me/reports/subjects`, and `GET /students/me/reports/subjects/:subjectId` directly
- the history route now uses `GET /students/me/history` directly so recent present or absent rows stay aligned with the same backend attendance truth as the report screens
- the report overview now leads with a plain-language attendance insight plus overall attendance, tracked classrooms, present sessions, absent sessions, and last recorded session
- subject detail now keeps classroom-level attendance easy to read by surfacing totals, present or absent counts, and last recorded session per classroom
- report-ready, loading, no-session, and no-attendance-history UX states are centralized so the routes stay stable while the data remains aligned to backend truth
- the current route structure was preserved, with only the report data source and copy updated to reflect final attendance percentages and session counts

## Classroom Stream and Schedule Views

The student classroom detail area should support:

- announcement stream
- class schedule/calendar
- lecture or session list
- quick entry into attendance-marking when applicable

This means the student app should include modular screens for:

- stream timeline
- schedule calendar
- lecture/session history list

The UI can be tabbed, but the data contracts should stay separate.

Current implementation status:

- student classroom detail, schedule, and lecture reads now use the shared classroom endpoints with enrollment-scoped backend access
- the backend now hides active join codes from student detail responses while still allowing joined students to read their own classroom detail, schedule, lectures, and student-visible stream data

## Profile and Account Management

The student profile screen should support:

- view and edit safe profile fields
- show roll number and institutional identity
- logout
- account deletion request flow if institution policy allows it
- device binding status view

Deletion should usually be a soft-request workflow, not immediate destructive deletion of attendance history.

Current implementation status:

- the profile route now exposes live auth identity plus safe local-only editable fields for display name and preferred short name
- institutional identifiers, role, email, and device-binding trust state remain read-only until the server-backed profile API exists
- the profile summary now focuses on joined-classroom count plus whether the current phone is trusted for attendance
- the device-status route now surfaces the live attendance-readiness check in student-facing language without turning the screen into an admin recovery console

## Device Trust UX

Because attendance integrity depends on device binding, the mobile app must make device state visible and understandable.

Expected UX:

- first login may show `This device is being linked to your account`
- another-student login attempt on the same device should be blocked or made read-only for attendance
- student can see if device is trusted, pending review, or revoked
- support screen explains how to request device change if the old phone is lost

## Error Handling Architecture

The student app should use a shared error mapper:

- `features/shared/error-map.ts`

It converts API error codes into messages such as:

- session expired
- already marked
- GPS permission denied
- outside allowed radius
- Bluetooth unavailable

This keeps consistent messaging across screens.

## Offline Behavior

Attendance marking must not complete offline because final validation depends on live backend checks.

Accepted offline behavior:

- cached history view
- cached last-known summary
- cached classroom stream and schedule
- queued navigation into mark flow

Not accepted:

- offline attendance submission that syncs later as final truth

## Security and Privacy in Mobile Code

The app must:

- store refresh tokens only in secure storage
- avoid logging raw GPS coordinates in debug logs
- avoid storing BLE raw identifiers longer than necessary
- clear transient scan data when a screen unmounts
- avoid allowing attendance actions from an untrusted or mismatched device binding

## Testing Strategy

Must include:

- unit tests for attendance flow hooks
- unit tests for join-classroom and device-status flows
- integration tests for permission orchestration
- mocked API tests for success and failure states
- E2E tests for login, Google login, join classroom, QR flow, Bluetooth flow, and history refresh

Current implementation status:

- mobile unit coverage now explicitly covers route helpers, dashboard and join/report history state builders, attendance permission and result-banner helpers, query invalidation keys, attendance candidate selection, schedule shaping, and subject-report shaping

## Implementation Outcome

When this architecture is complete:

- students can mark attendance with either supported mode
- the app gives fast, clear feedback
- the app safely handles permissions and device capabilities
- students can join classrooms, view schedules, stream updates, and read their reports
- untrusted-device attendance abuse is blocked in the mobile UX and backend
- history updates reliably after successful marking
