# Student Mobile App Requirements

## Purpose

This document defines what is expected from the student-facing mobile experience.

## Reset Implementation Status

The reset-track student mobile experience is now live in the shared mobile app.

- role entry, student sign in, and student registration are implemented
- the student `Home`, `Classrooms`, `Attendance`, `Reports`, and `Profile` flows are implemented
- classroom discovery, attendance history, self-reports, profile, and device-status surfaces now read backend truth
- shared live-session discovery now keeps student home, classroom detail, and attendance routes aligned

Remaining validation here is device-specific, not IA-specific:

- real-device QR camera and GPS signoff
- real-device Bluetooth proximity signoff

## Core Objective

The student mobile app must make attendance marking simple, quick, and understandable while also letting students track their own attendance record over time.

## Supported Platforms

The student mobile app must support:

- iOS
- Android

## Primary Student Capabilities

The student experience must support:

- login and authenticated access
- access to assigned classes and subjects
- join classroom by teacher-provided join code
- classroom list visibility after joining
- classroom stream visibility for student-facing announcements
- attendance marking using QR + GPS
- attendance marking using Bluetooth mode
- personal attendance history
- present and absent totals where applicable
- attendance percentage visibility

## Final Reset Student IA

The student side of the shared mobile app now has a locked reset IA:

### Entry and Auth

- app opens to a neutral role-entry screen
- student entry offers:
  - create student account
  - student sign in
- student-only routes redirect back to student sign in when no authenticated student session exists
- after successful auth, the student lands in the student-owned navigation tree

### Top-Level Sections

- Home
- Classrooms
- Attendance
- Reports
- Profile

The reset uses these sections as the stable student-mobile map. History, subject detail, device registration, and blocked-attendance support states should sit under these sections rather than creating a second competing top-level structure.

## Shared Visual And Copy Foundation

The reset track now also locks these student-mobile presentation rules:

- shared mobile typography, spacing, color, and surface hierarchy should come from `packages/ui-mobile`
- every screen should keep one obvious primary action, with secondary actions visually quieter
- loading, empty, and error states should use short action-oriented copy instead of internal build or scaffold language
- user-facing terms must stay product-first and avoid words such as `shell`, `foundation`, `readiness`, `bootstrap`, or `local verification`
- product copy should use `Classroom`, `Course code`, `Students`, `Class session`, and `Attendance session`; internal `enrollment`, `course offering`, and `lecture` terms must stay out of normal student-facing UI
- the current premium student-mobile look is already implemented through the shared `packages/ui-mobile` tokens, so later work should refine those primitives instead of reintroducing default-looking cards or utility styling
- the current screenshot-audit source of truth for this surface is `Structure/full-product-screenshot-audit.md` plus `Structure/artifacts/full-product-audit/mobile/student`

## Expected Main Screens

The student mobile app is expected to include at minimum:

- login screen
- home/dashboard screen
- classroom list or classroom hub screen
- classroom stream screen or stream panel
- mark attendance screen
- QR scanner flow
- Bluetooth attendance flow
- attendance history screen
- subject or class-wise record view
- profile or account screen
- device-trust or blocked-attendance support state

Current implementation status:

- the shared mobile app now opens on a role-choice landing screen instead of defaulting straight into a student route
- dedicated student sign-in and student registration screens now live alongside the student route group inside the shared binary
- student auth screens now keep the initial device-registration payload behind the scenes instead of asking students to type raw device identifiers, and student registration binds the first attendance phone during signup
- the student route group now exists under `apps/mobile/app/(student)`
- dedicated student screens now exist for home, classrooms, join classroom, classroom detail, classroom stream, classroom schedule, history, reports overview, subject-wise report, profile, attendance entry, QR attendance, Bluetooth attendance, and device status
- the mobile data layer is already connected to live auth, classroom, stream, lecture, schedule, join-code, and trusted-device endpoints
- route targets, join-classroom banners, home loading or empty states, history refresh messaging, report loading or empty messaging, and attendance permission or result banners are now centralized in student-mobile helper modules instead of being scattered across screens
- true QR and Bluetooth attendance-mark submission is now live
- student mobile reports now use the final backend report APIs for overview, subject list, and subject detail without changing the route tree

## Home Screen Expectations

The home screen should clearly show:

- the most important attendance action first
- currently open attendance opportunities when any are available
- enrolled classrooms with course code context and quick navigation into the classroom
- high-level summary for classrooms, attendance availability, pending joins, and device state
- recent class activity or updates
- short empty states that clearly tell the student what to do next

Current implementation status:

- the student home now opens with a stateful spotlight card that chooses the primary action from live attendance readiness, device state, and classroom membership data
- a dedicated open-attendance section appears when live QR + GPS or Bluetooth attendance sessions are available
- the home screen now previews the top classrooms and pushes the student into a dedicated `Classrooms` route for full course discovery
- empty, blocked, and ready states now use short product-facing copy instead of scaffold-style explanations

## Classroom Discovery Expectations

The student mobile app must also make course discovery obvious once the student is signed in.

Expected behavior:

- the `Classrooms` route lists active joined classrooms cleanly
- each classroom row shows course code context and whether an attendance session is open right now
- each classroom row gives direct entry into:
  - classroom detail
  - updates
  - schedule
- classroom detail summarizes:
  - whether attendance is open
  - when the next class session is
  - how many updates are available
  - where schedule and report entry points live

Current implementation status:

- the student mobile app now has a dedicated `Classrooms` route with one card per active classroom
- classroom cards now show course code, attendance-mode context, open-attendance state when available, and the next class session when attendance is closed
- each classroom card now offers direct `Open course`, `Updates`, `Schedule`, and conditional `Attendance` actions so students do not need to hunt through unrelated screens
- classroom detail now leads with a concise attendance summary card plus follow-on sections for recent updates and class sessions

## Mark Attendance Experience

The mark attendance area must be one of the simplest flows in the app.

Expected behavior:

- student opens mark attendance
- student selects or is guided to the correct mode
- the app requests only the permissions required for that mode
- the app clearly indicates success or failure

Current implementation status:

- the mark-attendance hub, QR route, and Bluetooth route are now live in the mobile app
- these routes already enforce trusted-device checks and use the shared live attendance-session discovery API to identify candidate QR + GPS and Bluetooth sessions
- permission-state messaging and attendance-result banners are now wired into the student attendance routes, so permission denial, missing lecture context, blocked device state, and successful query-refresh follow-up all have explicit UI states
- the QR route now uses one short four-step flow:
  - choose session
  - scan QR
  - confirm location
  - mark attendance
- the QR route now requests camera access only after `Use camera` is pressed, keeps manual QR paste as the fallback when camera access is denied or unavailable, and requests location only when the student reaches the location step
- the QR route now also supports real QR mark submission, live location capture, camera-scanner integration on device builds, and explicit error mapping for expired QR, invalid QR, session closed, low-accuracy GPS, out-of-range GPS, and duplicate marks
- the Bluetooth route now uses one short four-step flow:
  - choose session
  - check Bluetooth
  - scan nearby teacher
  - mark attendance
- the Bluetooth route now uses the native scanner boundary, clear Bluetooth enable guidance, live-session refresh actions, in-range detection guidance, nearby-teacher selection, and the live `POST /attendance/bluetooth/mark` flow without changing the existing student route structure
- the Bluetooth route now also lets students clear stale scan results and preserves the selected BLE detection when multiple nearby sessions are visible
- the attendance hub now gives students a `Refresh live sessions` action, and the Bluetooth route now gives students a `Refresh Bluetooth sessions` action so a newly opened teacher session can appear without restarting the app
- the student home, classroom detail, and attendance hub now all derive open-session truth from the same shared live attendance-session API, so QR + GPS and Bluetooth counts do not drift between screens

## QR + GPS Student Requirements

In QR mode, the student must be able to:

- open the camera scanner
- scan the teacher's active QR code
- submit current GPS location
- receive a success message if valid
- receive a precise failure reason if invalid

Expected failure states include:

- invalid QR
- expired QR
- session closed
- GPS permission denied
- location unavailable
- low GPS accuracy
- outside allowed radius
- already marked
- trusted device missing or blocked

## Join Classroom Expectations

The student mobile app must allow a student to:

- enter a teacher-provided join code
- receive immediate feedback if the code is expired, invalid, or already used
- receive a clear failure state if the classroom membership is blocked, dropped, or otherwise not eligible for self-join
- see the new classroom in the classroom list after a successful join
- see the classroom stream become visible after successful membership activation
- avoid joining classrooms when the semester or classroom is no longer open for membership

## Classroom Stream Expectations

The student mobile app must allow a student to:

- open a classroom stream for joined classrooms
- see student-visible announcements in reverse chronological order
- avoid seeing teacher-only stream posts
- refresh the stream after teacher posts or roster-import results are published

Student stream access must stay limited to classrooms where the student has an active or pending
membership.

## Bluetooth Student Requirements

In Bluetooth mode, the student must be able to:

- open Bluetooth attendance flow
- grant Bluetooth-related permissions when needed
- understand when Bluetooth must be turned on before scanning can continue
- refresh live Bluetooth classroom discovery when a teacher starts attendance after the student app is already open
- scan for the teacher's active BLE session
- choose the correct nearby teacher when more than one live session is visible
- mark attendance if a valid session is found
- receive a clear status if the session cannot be validated

Expected failure states include:

- Bluetooth unavailable
- Bluetooth disabled
- permission denied
- no valid teacher session found
- session expired
- session closed
- invalid or mismatched BLE payload
- already marked
- trusted device missing or blocked

## Trusted Device and Blocked Attendance UX

For student accounts, the mobile app must:

- register the current device for attendance when needed
- check trusted-device eligibility before entering attendance-sensitive flows
- show a clear blocked-attendance message when the phone is not eligible
- explain whether the issue is same-device account misuse, second-device use, revoked device status, or missing device context
- guide the student toward admin support or replacement-device recovery when required
- show the current attendance-phone lifecycle on the device-status screen as one of:
  - trusted
  - pending approval
  - replaced
  - blocked
  - unregistered
- show attendance-readiness details on the same screen so the student can tell whether QR and Bluetooth attendance can continue on the current phone

## Attendance History Expectations

Students must be able to view:

- date of attendance record
- subject or class context
- attendance status
- running percentage or subject-wise percentage depending on design

The history should be understandable even for a non-technical user.

Current implementation status:

- the history route now reads real student-owned attendance records from `GET /students/me/history`
- the top card now explains overall attendance, recorded-session count, present count, absent count, and last recorded session in one glance
- recent history rows now show course title, subject code, attendance mode, present or absent state, and whether the session is still open or already recorded
- initial loading, refresh, empty, and error states are now explicit so the student does not confuse loading with missing history

## Attendance Percentage Expectations

The student app should show:

- current attendance percentage
- enough context so the student understands what the percentage refers to
- low-attendance indicators when the percentage is near or below the institutional threshold

Current implementation status:

- reports overview and subject-wise report screens are now live
- the mobile report routes now use `GET /students/me/reports/overview`, `GET /students/me/reports/subjects`, and `GET /students/me/reports/subjects/:subjectId`
- overview and subject detail cards now use final attendance-session totals and percentages from the backend instead of lecture-derived fallback calculations
- report overview now opens with a plain-language attendance insight plus overall attendance, tracked-classroom count, present count, absent count, and last recorded session
- subject cards and subject detail now make course attendance explicit with per-subject totals, present or absent counts, and classroom-level breakdowns
- report-loading and no-data UX states are now explicitly handled through shared student-mobile view-state helpers
- the route structure stayed unchanged during this data-source switch, so later reporting changes can keep reusing the current student navigation flow

## Permissions and Privacy

The student app must:

- request camera access only when QR scanning is needed
- request location access only when GPS attendance is needed
- request Bluetooth access only when Bluetooth attendance is needed
- avoid presenting unnecessary permission prompts too early

## UX Expectations

The student UX should be:

- fast
- low confusion
- mobile-first
- resilient to common classroom issues like poor network or denied permission
- clearly separated from teacher entry and teacher auth even though both experiences share one app binary

Current implementation status:

- the profile route now stays student-facing by focusing on account identity, joined-classroom count, attendance-phone state, and safe on-device name preferences
- the device-status route now explains whether this phone can mark attendance without exposing admin-only recovery tooling or raw internal identifiers

## Acceptance Expectations

This part of the app is successful when:

- a student can mark attendance with minimal steps
- the app gives immediate and clear feedback
- the student can later confirm that attendance in history
- students cannot use the app to access other students' data
