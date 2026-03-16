# Student Mobile App Architecture

Maps to: [`../requirements/03-student-mobile-app.md`](../requirements/03-student-mobile-app.md)

## Purpose

This document explains how the student-facing mobile experience is implemented in code.

## Reset Implementation Snapshot

The reset-track student mobile architecture is now implemented in the shared Expo app.

- neutral role entry plus student auth screens are live
- student home, classroom discovery, attendance, reports, history, profile, and device-status flows are live
- the student shell now reads shared live-session, history, and report truth from backend-owned APIs

## Runtime Stack

The student app is part of `apps/mobile` and uses:

- React Native
- Expo prebuild
- Expo Router
- TanStack Query for server-state
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

- route names are centralized in `apps/mobile/src/student-routes.ts`
- shared entry routing and auth-form state live in `apps/mobile/src/mobile-entry-models.ts`
- `apps/mobile/app/(student)/_layout.tsx` acts as the student-session gate
- later prompts should refine this route tree instead of inventing a second student tree

## Shared Visual and Copy Foundation

The reset foundation expects student-mobile presentation primitives to come from `packages/ui-mobile/src/index.ts`.

Current implementation note:

- `mobileTheme` centralizes shared spacing, typography, surface, border, and CTA color tokens
- `findMobileContentIssues()` provides guardrails against developer-oriented copy
- `apps/mobile/src/shell.ts` plus `apps/mobile/src/mobile-entry.tsx` own the shared role-entry and auth-screen copy
- `Structure/full-product-screenshot-audit.md` plus `Structure/artifacts/full-product-audit/mobile/student` act as the deterministic visual inventory for the student route tree

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

- `apps/mobile/src/student-foundation.tsx` is the stable route-facing barrel
- `apps/mobile/src/student-foundation/index.ts` is the role-local export map
- student screens now live one-per-file inside `apps/mobile/src/student-foundation/`
- `queries.ts` and `shared-ui.tsx` hold shared fetch/state and presentational helpers
- `Structure/codebase-structure.md` is the ownership reference for this folder

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

Use local component state for the currently implemented mobile forms and transient attendance entry state. Zustand remains reserved for future high-churn mobile-only buffers such as richer BLE scan orchestration.

## Dashboard Implementation

The student home screen fetches:

- current student session and device-trust state
- joined classrooms
- live attendance opportunities
- recent class activity

Implementation details:

- session + device trust from `GET /auth/me`
- classrooms list from `GET /students/me/classrooms`
- attendance readiness from `GET /devices/trust/attendance-ready`
- open attendance opportunities from `GET /sessions/live`
- recent activity from linked classroom lecture queries

Current implementation status:

- the home screen is live and uses shared student-home model logic for open-attendance, blocked-device, no-classroom, and ready-for-class states
- open attendance now lists live QR + GPS or Bluetooth opportunities
- the home screen previews a smaller classroom set and routes into `/(student)/classrooms` for full discovery
- quick actions route into attendance, join classroom, reports, history, profile, and device status

## Classroom Discovery Architecture

The reset student shell uses a dedicated classroom-discovery route instead of burying course entry under the dashboard.

Implementation details:

- `apps/mobile/src/student-foundation.tsx` exposes `useStudentCourseDiscoveryData()`
- the discovery hook reuses `GET /students/me/classrooms`, `GET /devices/trust/attendance-ready`, and `GET /sessions/live`
- `apps/mobile/src/student-workflow-models.ts` owns `buildStudentCourseDiscoveryCards()` and `buildStudentClassroomDetailSummaryModel()`

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

Detailed join, attendance, device-trust, reports, profile, offline, security, and testing notes now live in [`03-student-mobile-app-notes.md`](./03-student-mobile-app-notes.md).
