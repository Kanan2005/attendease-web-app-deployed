# QR + GPS Attendance Architecture

Maps to: [`../requirements/06-qr-gps-attendance.md`](../requirements/06-qr-gps-attendance.md)

## Purpose

This document explains how QR + GPS attendance is implemented in the current backend plus the first teacher-web and student-mobile client flows.

## Reset Implementation Snapshot

This QR + GPS architecture is now implemented across backend, teacher web, and student mobile.

- teacher web owns the short setup route plus live control/projector routes
- student mobile owns the QR scan and location-confirmation flow
- shared live-session, history, and report truth now stay aligned after QR attendance and later corrections

## Core Design Goals

- prevent screenshot-based reuse of the QR
- prevent attendance from outside the allowed location zone
- keep the classroom flow fast for both teacher and student
- preserve deterministic validation on the backend

## Implemented Backend Module

The QR + GPS backend core now lives in:

```text
apps/api/src/modules/attendance/
  attendance.module.ts
  attendance-realtime.service.ts
  gps-validator.service.ts
  location-anchor.service.ts
  qr-attendance.controller.ts
  qr-attendance.service.ts
  qr-token.service.ts
```

It is mounted through the main API app module and already exposes the first real QR attendance endpoints.

## Session Creation Flow

QR + GPS sessions are created through `POST /sessions/qr` by teacher or admin sessions.

Implemented backend flow:

1. teacher/admin submits classroom ID, anchor data, radius, duration, and optional lecture-link inputs
2. API validates classroom access using the existing classroom scope layer
3. API expires stale active QR sessions for the same classroom if their scheduled end has already passed
4. API blocks creation if another active QR session still exists for the classroom
5. API resolves the matching teacher assignment for the classroom scope
6. API resolves the session anchor through `LocationAnchorService`
7. API optionally links or creates the lecture through `SchedulingService.ensureLectureLinkForAttendanceSession`
8. API generates a per-session `qrSeed`
9. API snapshots active enrollments into `attendance_records` with default status `ABSENT`
10. API creates the `attendance_sessions` row with counters and QR/GPS fields
11. API writes `SESSION_CREATED` attendance audit data and `attendance.session.created` outbox data
12. API returns session metadata plus the current rolling QR payload

The roster snapshot at creation time is critical because absent counts must not change if enrollment changes later.

## Required Session Fields

The current `attendance_sessions` schema now includes the QR + GPS core fields:

- `mode`
- `status`
- `startedAt`
- `scheduledEndAt`
- `endedAt`
- `editableUntil`
- `durationSeconds`
- `qrSeed`
- `gpsAnchorType`
- `gpsCenterLatitude`
- `gpsCenterLongitude`
- `gpsAnchorLabel`
- `gpsAnchorResolvedAt`
- `gpsRadiusMeters`
- `qrRotationWindowSeconds`
- `rosterSnapshotCount`
- `presentCount`
- `absentCount`

## Location Anchor Model

The current architecture supports three anchor types:

- `CLASSROOM_FIXED`
- `CAMPUS_ZONE`
- `TEACHER_SELECTED`

The schema already supports all three.

Current V1 implementation detail:

- the create-session request supplies the anchor latitude and longitude directly
- `anchorType` defaults to `TEACHER_SELECTED`
- `LocationAnchorService` normalizes radius, label, and resolved timestamp
- there is no separate campus/classroom anchor registry table yet

### How Each Anchor Type Works

#### `CLASSROOM_FIXED`

- coordinates come from teacher assignment or academic config
- teacher cannot move them during session start unless permitted

#### `CAMPUS_ZONE`

- coordinates point to a central campus location
- radius is usually larger

#### `TEACHER_SELECTED`

- teacher selects live device/browser location at session start
- API stores that as session anchor for the full session

## Rolling QR Token Strategy

The QR token service is implemented in `qr-token.service.ts`.

The QR does not contain a permanent reusable token. It generates rolling payloads from:

- session ID
- version
- current time slice
- HMAC SHA-256 signature derived from `qrSeed`

Recommended QR payload structure:

```json
{
  "v": 1,
  "sid": "session_public_id",
  "ts": 12345678,
  "sig": "hmac_signature"
}
```

### Rotation Rules

The current implementation uses:

- the session's stored `qrRotationWindowSeconds`
- `ATTENDANCE_QR_ALLOWED_CLOCK_SKEW_SLICES` for clock-drift tolerance
- acceptance of only the current slice and configured prior slices
- immediate invalidation when the session is no longer active

## Teacher Web QR Rendering Boundary

The backend currently returns the current QR payload and its expiry timestamp inside the session summary returned by `POST /sessions/qr`.

What is implemented now:

- `GET /sessions/live` is now the shared attendance-session discovery route used by student mobile
  to decide whether QR + GPS attendance is open
- teacher web can create a session from `/teacher/sessions/start` and immediately route into the live control page
- `GET /sessions/:id` now returns the current session summary for polling-based teacher/projector refresh
- the session summary already contains counts, status, anchor data, and QR expiry
- teacher web active-session now also reads `GET /sessions/:id/students` for the live marked roster
- the teacher web live shell now refreshes every 2 seconds while the session is active so QR state, timer state, and live roster state stay aligned

What is intentionally deferred:

- dedicated token-refresh endpoint
- websocket-driven QR rotation transport
- dedicated `GET /sessions/:id/live` transport-optimized route

The current realtime service is still a no-op seam, so teacher web currently uses polling as the live-update boundary.

## Student Mark Flow

Student mobile sends to `POST /attendance/qr/mark`:

- raw QR payload
- current latitude
- current longitude
- location accuracy
- optional device timestamp

Current client implementation detail:

- the student QR screen now keeps one ordered on-device flow:
  - choose session
  - scan QR
  - confirm location
  - mark attendance
- the student QR screen can now open a device-camera scanner through Expo Camera only when the student presses `Use camera`
- manual QR payload entry stays available as the fallback when camera access is denied or unavailable
- location capture uses Expo Location only when the student reaches the location step
- the route keeps using the shared student attendance controller so later BLE work still plugs into the same route-level state model
- the route now maps success, expired, invalid, session-closed, low-accuracy, out-of-range, and duplicate results into short mobile banners instead of verbose scaffold copy

The endpoint is guarded by:

- `AuthGuard`
- `RolesGuard`
- `TrustedDeviceGuard`

## Validation Pipeline

The implemented service validates in this order:

1. request schema is valid
2. user is authenticated as student
3. session exists
4. session mode is `QR_GPS`
5. session is active and not ended
6. if the scheduled end has already passed, auto-expire the session before continuing
7. QR signature matches the stored session seed
8. QR time slice is valid
9. student has an attendance record row for that session
10. student record is not already `PRESENT`
11. GPS coordinates and accuracy pass validation
12. update attendance record from `ABSENT` to `PRESENT` transactionally
13. increment/decrement session counters transactionally
14. write attendance audit and outbox data
15. publish the live counter update through the realtime seam

## GPS Validation Rule

The location validator is implemented in `gps-validator.service.ts` and uses:

- haversine distance between student location and session anchor
- optional accuracy check

Implemented rule:

- reject if anchor data is missing
- reject if `accuracyMeters` is missing or non-positive
- reject if `accuracyMeters` exceeds `ATTENDANCE_GPS_MAX_ACCURACY_METERS`
- reject if haversine distance exceeds the session radius

The successful mark audit event currently stores:

- latitude
- longitude
- location accuracy
- distance to anchor
- QR slice
- optional device timestamp

## Current Client Boundaries

### Teacher Web

Current teacher-web flow:

1. open `/teacher/sessions/start` directly or from classroom detail
2. choose the classroom
3. set duration and allowed distance
4. request browser geolocation for the teacher-selected anchor
5. block start cleanly if classroom, timing, distance, or location preconditions fail
6. submit `POST /sessions/qr`
7. route into `active/[sessionId]`
8. poll `GET /sessions/:sessionId` and `GET /sessions/:sessionId/students` every 2 seconds while active
9. keep the large QR, timer, live summary, and marked roster visible on the teacher control route
10. optionally open `active/[sessionId]/projector` for the room-facing display
11. end the session through `POST /sessions/:sessionId/end`

### Student Mobile

Current student-mobile flow:

1. open the QR attendance route from the existing student attendance group
2. select the open QR attendance session from `GET /sessions/live`
3. capture QR payload through camera scan or manual fallback input
4. capture current location
5. submit `POST /attendance/qr/mark`
6. invalidate dashboard, classroom, history, report, and trusted-device queries after success
7. map API failures into explicit banners for expired, invalid, low-accuracy, out-of-range, and duplicate cases

## GPS Service Layer

The GPS part is already separated into dedicated service boundaries:

- `location-anchor.service.ts`
- `gps-validator.service.ts`

The suspicious-location layer is now also implemented:

- `OUT_OF_RADIUS` and `ACCURACY_TOO_LOW` QR failures create `security_events`
- those events use `ATTENDANCE_LOCATION_VALIDATION_FAILED`
- metadata stores reason, accuracy, distance, radius, anchor type, and QR slice
- raw student latitude and longitude are intentionally not copied into `security_events`

## Duplicate Prevention

Duplicate prevention exists in two layers:

- service-layer check before update
- unique and transactional DB protection

Implemented DB pattern:

- one `attendance_records` row per student per session
- service first checks the existing record
- transaction updates only where current status is `ABSENT`
- if `updateMany` affects zero rows, treat the request as already marked

## Session End and Auto-Expiry

Manual session end is implemented through `POST /sessions/:sessionId/end`.

Current behavior:

- only QR sessions can be ended here
- ending an already ended/expired/cancelled QR session is idempotent
- active sessions become `ENDED`
- `endedAt`, `endedByUserId`, and `editableUntil` are set
- linked lectures are completed
- `attendance.session.ended` is queued

Auto-expiry is also implemented:

- mark requests check whether the scheduled end has already passed
- teacher polling now also auto-expires timed-out sessions on read
- shared live discovery and history reads now also auto-expire timed-out sessions on read
- timed-out active sessions become `EXPIRED`
- `editableUntil` is still set for the future manual-edit window
- `attendance.session.expired` is queued
- linked lectures are completed
- live session-state publishing also fires when the session auto-expires during polling or a mark attempt

This keeps student mobile discovery, teacher web QR control, teacher mobile history, and later
manual-edit views on the same session-status boundary instead of letting one client keep stale
`ACTIVE` state after another client has already observed expiry.

## Live Counter Updates

When a student is successfully marked present:

1. transaction commits
2. outbox event `attendance.record.marked` is inserted
3. realtime publisher emits a counter update through `AttendanceRealtimeService`
4. later teacher web live-session screens can consume that event transport

The live counter should not be derived only in the browser.

## Security and Abuse Controls

Current protections:

- short QR rotation window
- session must be active
- student must be enrolled in the roster snapshot
- trusted-device guard must pass for the student request
- GPS must be within radius
- low-accuracy locations are rejected
- duplicate marks are blocked transactionally
- suspicious GPS failures are persisted to `security_events` without mutating attendance truth

Still deferred:

- projector/websocket transport

The current implementation already raises difficulty substantially compared with static QR flows.

## API Surface

Implemented endpoints:

- `POST /sessions/qr`
- `GET /sessions/:id`
- `POST /sessions/:sessionId/end`
- `POST /attendance/qr/mark`

Still deferred:

- `GET /sessions/:id/live`
- any dedicated QR-token refresh route

## Testing Strategy

The current backend core now has dedicated automated coverage for:

- rolling QR issuance and slice-window validation
- tamper detection and session mismatch rejection
- GPS anchor resolution
- GPS radius and accuracy rejection
- QR session creation with roster snapshot records
- successful attendance mark with counter updates, audit rows, outbox rows, and realtime seam calls
- duplicate mark rejection
- expired token rejection
- future-slice rejection
- low-accuracy GPS rejection
- out-of-radius rejection
- suspicious-location `security_events` without counter corruption
- auto-expiry during student mark attempts with session-state publish
- session-end rejection after the session closes

Current test files:

- `apps/api/src/modules/attendance/qr-token.service.test.ts`
- `apps/api/src/modules/attendance/gps-validator.service.test.ts`
- `apps/api/src/modules/attendance/location-anchor.service.test.ts`
- `apps/api/src/modules/attendance/qr-attendance.integration.test.ts`
- `apps/mobile/src/student-attendance.test.ts`
- `apps/web/src/web-workflows.test.ts`

Current automated coverage is unit plus integration coverage only; browser and device verification are still manual until later E2E phases land.

## Implementation Outcome

When this architecture is complete:

- teachers can run rolling QR projector sessions
- students can only mark while within the valid time and location window
- live count updates correctly on teacher web
