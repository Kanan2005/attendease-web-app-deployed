# Bluetooth Attendance Architecture

Maps to: [`../requirements/07-bluetooth-attendance.md`](../requirements/07-bluetooth-attendance.md)

## Purpose

This document explains how Bluetooth attendance will be implemented across mobile and backend.

## Reset Implementation Snapshot

This Bluetooth architecture is now implemented across backend, shared native BLE boundaries, teacher mobile, and student mobile.

- teacher mobile owns start, live control, and end-session flow
- student mobile owns guided Bluetooth discovery and mark-attendance flow
- finalized Bluetooth truth now feeds the same history/report pipeline as QR truth

## Core Design Goals

- make attendance depend on physical proximity to teacher device
- avoid permanent BLE identifiers
- keep the implementation foreground-only and reliable for classroom use
- keep server-side verification authoritative

## Key Technical Constraint

Bluetooth attendance requires capabilities that are partly platform-native. The TypeScript app alone is not enough.

Therefore `apps/mobile` will include a native BLE bridge layer:

- Android implementation in Kotlin
- iOS implementation in Swift
- shared TypeScript wrapper for app code

## BLE Roles

### Teacher Device

Acts as BLE advertiser during an active session.

### Student Device

Acts as BLE scanner during the attendance-marking flow.

## Session Creation Flow

1. teacher selects class, section, and subject
2. mobile app calls `POST /sessions/bluetooth`
3. API validates teacher assignment
4. API creates session and roster snapshot
5. API generates `ble_seed`
6. API returns session public ID, duration, and broadcast config
7. teacher mobile starts BLE advertiser with rotating identifier logic

## Required Session Fields

Bluetooth sessions use the same `attendance_sessions` table plus BLE-specific fields:

- `ble_seed`
- `ble_protocol_version`
- `ble_public_id`
- `bluetooth_rotation_window_seconds`

## Rotating BLE Identifier Design

The teacher app should broadcast an advertisement payload containing:

- protocol version
- public session ID
- current time slice
- rotating signature or ephemeral identifier

Recommended logical payload:

```json
{
  "v": 1,
  "pid": "session_public_id",
  "ts": 12345678,
  "eid": "rotating_ephemeral_id"
}
```

`eid` is generated from:

- session public ID
- current time slice
- `ble_seed`

using HMAC or equivalent keyed hashing.

## Beacon Technology Choice

The Bluetooth mode should use BLE beacon-style advertising, not classic Bluetooth pairing.

Reason:

- pairing adds unnecessary friction
- beacon-like advertisements are better for one-to-many classroom discovery
- students only need to detect a short-lived nearby signal, not establish a full device connection

The architecture should keep the payload proprietary to AttendEase rather than pretending to be a public iBeacon or Eddystone deployment unless later interoperability is explicitly required.

## Native Module Design

### Android

Use platform primitives:

- `BluetoothLeAdvertiser` for teacher broadcast
- `BluetoothLeScanner` for student discovery

### iOS

Use platform primitives:

- `CBPeripheralManager` for teacher broadcast
- `CBCentralManager` for student scanning

### TypeScript Wrapper

Expose a clean shared interface:

- `startAdvertising(config)`
- `stopAdvertising()`
- `startScanning()`
- `stopScanning()`
- `subscribeToDetections(callback)`

This keeps app screens independent from platform-specific details.

Current implementation note:

- the shared wrapper now uses explicit TypeScript command-result and event types from
  `apps/mobile/src/native/bluetooth/types.ts`
- Android and iOS bridge differences stay below that wrapper so teacher or student routes never
  consume raw native-state strings directly

## Why A Native Wrapper Is Important

BLE advertising and scanning behavior differs across platforms and OS versions. If UI code talks directly to low-level APIs, the app becomes hard to maintain and test.

The native wrapper should normalize:

- permission status
- Bluetooth enabled status
- scan result format
- advertiser lifecycle callbacks

## Student Mark Flow

1. student opens Bluetooth attendance mode
2. app checks permission and Bluetooth availability
3. app scans for nearby AttendEase advertisements
4. student app parses candidate payload
5. app submits detected payload to `POST /attendance/bluetooth/mark`
6. API validates active session and rotating identifier
7. API marks student present if eligible
8. app shows success and refreshes history

## Validation Pipeline

The backend should validate in this order:

1. student auth
2. session exists and is mode `BLUETOOTH`
3. session is active
4. rotating identifier matches `ble_seed` for current or previous slice
5. student has snapshot attendance row for the session
6. student is not already `PRESENT`
7. update attendance record
8. insert attendance event and outbox event
9. publish live count update if teacher subscribed

## Proximity Enforcement

BLE is used as the proximity proof. In v1:

- foreground scanning is required
- rotating identifiers reduce stale replay
- session must be live
- repeated invalid or replay-like BLE submissions should be logged as security events

Optional telemetry to store:

- RSSI value
- platform
- OS version

This is useful for tuning later, but RSSI should not be a hard fail rule in v1 unless field testing proves it reliable.

## Session Lifecycle on Teacher Mobile

The mobile app should keep advertiser state synchronized with backend session state.

Rules:

- advertiser starts only after session create API succeeds
- advertiser stops immediately when session ends locally
- app retries backend session end if the network was temporarily unavailable

## Failure Scenarios

The architecture must support recovery for:

- advertiser failed to start
- Bluetooth turned off during active session
- app moved to background
- network lost while session is still active

Recommended behavior:

- teacher sees clear warning banner
- app offers retry or end session
- API session is never silently abandoned

## Foreground-Only Rule

V1 should explicitly require that the teacher and student keep the app in the foreground during Bluetooth attendance.

This avoids:

- background BLE inconsistencies
- OS-specific throttling surprises
- difficult cross-platform bugs in early versions

## API Surface

Primary endpoints:

- `POST /sessions/bluetooth`
- `POST /attendance/bluetooth/mark`
- `POST /sessions/:id/end`
- `GET /sessions/:id`

Current implemented behavior:

- teacher/admin Bluetooth session create validates classroom scope and creates a roster snapshot
- student Bluetooth mark uses `TrustedDeviceGuard`
- successful marks write `attendance_events`, queue outbox rows, and publish the live counter seam
- invalid, expired, or mismatched Bluetooth payloads write
  `ATTENDANCE_BLUETOOTH_VALIDATION_FAILED` security events without mutating attendance truth
- `GET /sessions/live?mode=BLUETOOTH` is now the shared discovery route for student Bluetooth entry,
  while `GET /sessions/:id` and `GET /sessions/:id/students` stay the live-roster truth for teacher
  mobile

## Current Operational Mobile Slice

The current mobile implementation now goes beyond transport scaffolding:

- teacher mobile can create a Bluetooth session against the live backend, cache the returned
  advertiser config, and move into the active-session route without changing the existing teacher
  navigation tree
- teacher mobile now keeps setup and live control distinct:
  - the setup route chooses classroom, class-session context, and duration
  - the live route owns advertiser state, recovery, refresh, and end-session control
- the active-session route keeps backend session state and native advertiser state together so the
  teacher can see present count, session status, advertiser payload, and recovery actions in one
  place
- teacher recovery now handles advertiser start failure, Bluetooth-disabled or permission-required
  state, stopped advertiser state, and backend session-end retry without leaving the active-session
  route
- ending the teacher Bluetooth session now stops the local advertiser, ends the backend session, and
  routes directly into session detail when the closeout succeeds
- student mobile scans through the shared native BLE wrapper, de-duplicates detections, lets the
  student explicitly select a detected session payload when multiple candidates are visible, and
  then submits the live `POST /attendance/bluetooth/mark` request
- the student Bluetooth route now keeps one short flow for:
  - choose session
  - check Bluetooth
  - scan nearby teacher
  - mark attendance
- the student attendance hub and Bluetooth route now both expose explicit refresh actions so live teacher sessions can appear without restarting the app
- the route now separates Bluetooth-availability guidance, scan-in-progress guidance, nearby-teacher
  detection, and multi-session choice into explicit student-facing banners instead of controller
  copy
- Bluetooth error mapping now stays aligned with the shared student attendance controller contract,
  so expired, invalid, session-closed, mismatched, duplicate, and blocked-device failures surface as
  explicit attendance banners instead of route-specific ad hoc errors
- Android emulator validation now proves:
  - teacher setup can choose a classroom and start Bluetooth attendance from the phone
  - teacher active control can show recovery state without leaking raw native BLE errors
  - teacher end-session flow can land in saved session detail after closeout
  - live Bluetooth session discovery can appear in the student attendance hub and Bluetooth route
  - permission guidance no longer leaks raw Android BLE exceptions
  - actual nearby detection still remains blocked by emulator BLE limitations and must be closed on physical devices

## Security-Event Expectations

Suspicious Bluetooth failures must stay out of final attendance truth.

Current implementation already logs `ATTENDANCE_BLUETOOTH_VALIDATION_FAILED` events for:

- invalid signatures
- expired BLE identifiers
- BLE payloads that point at the wrong or missing public session
- other replay-like or mismatched Bluetooth attempts

These failures do not increment counts, change the student attendance row, or create a visible
manual-vs-automatic distinction in later history or reports.

## Manual Device Verification Still Required

Automated tests cover token logic, backend validation, wrapper boundaries, and mobile state models,
but real-device BLE verification is still required for:

- Android teacher advertiser start, stop, and retry flows
- Android student scan, detection selection, and mark submission
- iOS teacher advertiser start, stop, and retry flows
- iOS student scan, detection selection, and mark submission
- Bluetooth-disabled recovery, advertiser-start failure, and session-end retry under real device
  lifecycle conditions

## Code Layout

```text
apps/mobile/src/native/bluetooth/
  AttendEaseBluetooth.ts
  types.ts

apps/mobile/modules/attendease-bluetooth/android/src/main/java/expo/modules/attendeasebluetooth/
  AttendeaseBluetoothModule.kt

apps/mobile/modules/attendease-bluetooth/ios/
  AttendeaseBluetoothModule.swift

apps/mobile/src/
  bluetooth-attendance.ts

apps/api/src/modules/attendance/
  bluetooth-attendance.controller.ts
  bluetooth-attendance.service.ts
  bluetooth-token.service.ts
```

## Testing Strategy

Must include:

- unit tests for rotating identifier generation
- mocked native module tests in mobile
- integration tests for successful and duplicate Bluetooth mark
- device-level manual test checklist for iOS and Android combinations

Current automated coverage now includes:

- `apps/api/src/modules/attendance/bluetooth-token.service.test.ts`
- `apps/api/src/modules/attendance/bluetooth-attendance.integration.test.ts`
- `apps/mobile/src/bluetooth-attendance.test.ts`
- `apps/mobile/src/native/bluetooth/AttendEaseBluetooth.test.ts`
- `packages/auth/src/client.test.ts`

Manual device verification checklist:

- `Structure/bluetooth-device-test-checklist.md`

## Implementation Outcome

When this architecture is complete:

- teacher mobile can run BLE attendance sessions reliably
- student mobile can discover active nearby sessions from the same live-session source used by the
  rest of the product
- backend remains the final authority on whether a BLE mark is valid
