# Bluetooth Attendance Requirements

## Purpose

This document defines the detailed expectation for Bluetooth-based attendance.

## Reset Implementation Status

The reset Bluetooth attendance flow is now implemented across teacher mobile, student mobile, backend, and the shared native BLE boundary.

- teacher mobile owns session start, active control, live roster review, and clean end-session flow
- student mobile owns Bluetooth guidance, discovery refresh, nearby-session selection, and mark-attendance flow
- history and reports now consume finalized Bluetooth attendance truth the same way they consume QR truth

Remaining validation for this mode is real-device BLE proximity signoff on physical hardware.

## Objective

Bluetooth attendance must allow a teacher to verify proximity-based presence through a mobile session that students can detect only when physically near the teacher device.

## Session Ownership

Bluetooth attendance sessions must be created from the teacher mobile app.

Each session must be tied to:

- one class
- one section
- one subject
- one teacher

## Session Lifecycle

The teacher must be able to:

- configure or confirm class, section, and subject
- optionally define session duration
- start the session
- keep the broadcast active only during the session
- end the session manually
- let the session auto-end when duration expires if configured

## BLE Broadcast Expectations

The session should use BLE broadcasting with rotating identifiers where feasible.

Expected behavior:

- the broadcast must represent the currently active session
- the identifier should not be trivially reusable
- the broadcast must stop being valid after session end

## Student Detection Expectations

Students must be able to:

- enter Bluetooth attendance mode
- refresh live classroom session discovery without restarting the app
- scan for valid teacher sessions nearby
- submit attendance if a valid session is detected

## Validation Requirements

An attendance mark must succeed only when:

- the session is active
- the BLE session detected is valid
- the student is eligible for the class session
- the student has not already marked attendance

## Proximity Requirement

The product expectation is that attendance should depend on real proximity to the teacher device. The implementation should not treat a remote or replayed session identifier as valid.

## Platform Constraints

The app must account for mobile platform limitations:

- the app may need the user to enable Bluetooth manually
- permission behavior differs across iOS and Android
- foreground and background BLE behavior may differ by platform version

The requirement is not to hide these realities. The requirement is to design a stable user flow around them.

## Teacher UX Expectations

During an active Bluetooth session, the teacher should see:

- current session context
- clear active status
- running present count if available
- end session action

## Student UX Expectations

Students should receive clear feedback for cases such as:

- Bluetooth off
- permission denied
- scan in progress
- teacher found nearby
- more than one nearby teacher session
- no valid session nearby
- session expired
- session closed
- invalid session payload
- duplicate submission

## Anti-Proxy Expectations

This mode must resist:

- QR forwarding
- remote attendance attempts from outside proximity range
- duplicate marking attempts
- stale BLE identifier reuse

## Acceptance Expectations

This mode is successful when:

- a teacher can run it from the mobile app
- students near the teacher can mark attendance
- students not near the teacher cannot successfully mark attendance
- the final session appears in history, reports, and exports

## Current Implementation Status

The current repo now includes the real Bluetooth attendance operational slice:

- backend endpoints for `POST /sessions/bluetooth` and `POST /attendance/bluetooth/mark`
- rotating BLE payload generation and validation with timestamp slices plus HMAC
- trusted-device enforcement on student Bluetooth marks
- duplicate-mark protection and roster-snapshot based attendance truth
- security-event logging for invalid, expired, and mismatched Bluetooth payloads
- native BLE bridge scaffolding for Android and iOS with a shared TypeScript wrapper
- teacher mobile advertiser boundaries and student mobile scanner boundaries wired into the
  existing attendance routes
- teacher mobile Bluetooth start, active status, stop, advertiser recovery, and session-end retry
  flows
- teacher Bluetooth setup now uses one short create flow with:
  - classroom selection
  - class-session context when available
  - duration selection
  - a single `Start Bluetooth Attendance` action
- teacher Bluetooth active control now uses one focused route with:
  - live session context
  - broadcast health
  - retry or refresh controls
  - a dedicated `End Bluetooth Attendance` action
- student BLE scan now uses a short four-step student flow:
  - choose session
  - check Bluetooth
  - scan nearby teacher
  - mark attendance
- the attendance hub and Bluetooth route now expose explicit refresh actions so students can pull in a newly opened teacher Bluetooth session without restarting the app
- student BLE scan, detected-session selection, and mark-attendance submit flow now includes explicit
  status banners for Bluetooth unavailable, Bluetooth off, scan in progress, nearby teacher found,
  multi-session choice, invalid, expired, session-closed, duplicate, mismatched, and blocked-attendance outcomes
- Android emulator validation now proves the live session card can appear for the student route, but the actual nearby scan and detection path still remains real-device-only
- Android emulator validation now also proves the teacher can:
  - open the Bluetooth setup route
  - start a classroom-scoped Bluetooth session
  - reach the active-session control route
  - end the session and land in session detail
  while actual nearby advertising success still remains real-device-only

What still remains for later Bluetooth closeout work:

- real native-device manual verification in Android and iOS builds
- later session-history and report surfaces reading Bluetooth attendance truth

The repo now also includes a short manual BLE verification checklist in
`Structure/bluetooth-device-test-checklist.md`.
