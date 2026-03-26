# QR + GPS Attendance Requirements

## Purpose

This document defines the product expectation and the currently implemented backend baseline for QR + GPS attendance.

## Reset Implementation Status

The reset QR + GPS flow is now implemented across teacher web, backend, and student mobile.

- teacher web now owns the short QR + GPS setup flow and the live control/projector screens
- student mobile now owns the short QR scan, location confirmation, and mark-attendance flow
- shared session truth, history truth, and report truth now stay aligned after QR attendance and later corrections

Remaining validation for this mode is real-device camera and GPS signoff.

## Objective

QR + GPS mode must allow teachers to run fast classroom attendance while reducing proxy attendance through short-lived QR rotation and deterministic location validation.

## Current Implemented Baseline

The API now supports:

- `POST /sessions/qr` for teacher/admin QR session creation
- `GET /sessions/:sessionId` for teacher/admin active-session polling
- `POST /sessions/:sessionId/end` for teacher/admin QR session ending
- `POST /attendance/qr/mark` for trusted student QR attendance marking

The first client flows are also now wired:

- teacher web now has a dedicated QR + GPS setup route at `/teacher/sessions/start`
- classroom detail can hand off into that setup route with the classroom preselected
- teacher web active-session and projector routes now poll live session state for marked count, timer, and QR rotation updates
- student mobile QR route now supports camera-scan integration points, live location capture, and real QR mark submission
- student mobile now maps expired QR, invalid QR, low-accuracy GPS, out-of-range GPS, and duplicate-mark failures into explicit UX banners

The backend already persists:

- session start, scheduled end, end time, and session status
- `editableUntil` for the later 24-hour manual-edit phase
- QR seed, QR rotation window, GPS anchor metadata, and GPS radius
- one attendance record per eligible student at session creation time
- session counters for present, absent, and roster snapshot size

## Session Ownership

QR + GPS sessions must be created from the teacher web flow and remain tied to:

- one classroom
- one teacher assignment context
- one subject/class/section/semester scope
- one active attendance session record

## Session Configuration

Before the session starts, the teacher must be able to configure:

- classroom
- GPS validation radius
- session duration
- teacher browser location
- optional lecture linkage inputs

Current reset implementation note:

- teacher web now keeps the setup flow short by always using a teacher-selected browser-location anchor
- the backend still supports:
  - `CLASSROOM_FIXED`
  - `CAMPUS_ZONE`
  - `TEACHER_SELECTED`
- the current teacher web launch flow uses `TEACHER_SELECTED` and stores the captured coordinates on the session at creation time

## QR Behavior Requirements

The QR used for attendance must be:

- generated for the active session only
- short-lived and rolling
- invalid after its slice expires
- invalid after the session ends or expires
- signed on the backend with a per-session secret seed

The current payload shape is timestamp-slice based and includes:

- version
- session ID
- slice timestamp index
- HMAC signature

The allowed clock-skew window is server-configured with `ATTENDANCE_QR_ALLOWED_CLOCK_SKEW_SLICES`.

## Student Flow Expectations

The student flow in this mode is:

1. open mark attendance
2. open QR scanner
3. scan the current QR
4. collect current latitude, longitude, and accuracy
5. submit the QR payload plus GPS data
6. receive immediate success or rejection

The attendance-mark endpoint is student-only and additionally protected by trusted-device enforcement.

## Validation Requirements

An attendance mark must succeed only when all checks pass:

- student session is authenticated
- trusted-device guard allows attendance-sensitive access
- session exists and is `QR_GPS`
- session is still active
- QR token is valid for the current slice window
- student is part of the session roster snapshot
- GPS anchor exists
- location accuracy is acceptable
- student is within the allowed radius
- student has not already marked attendance for the session

## GPS Validation Expectations

Backend validation must be deterministic and consistent.

The current backend rule is:

- reject missing anchor data
- reject missing or invalid accuracy
- reject if `accuracyMeters` exceeds `ATTENDANCE_GPS_MAX_ACCURACY_METERS`
- compute haversine distance to the session anchor
- reject if distance is greater than the session radius

The successful mark response includes the accepted distance and accuracy values.

## Teacher Active Session Expectations

During an active QR session, the teacher should be able to view:

- classroom and lecture context
- configured radius and anchor label
- time remaining until scheduled end
- present count
- absent count
- roster snapshot size
- live marked-student list on the teacher control view
- current QR payload and QR expiry timestamp
- end session action

The current session-create response already returns the first rolling QR payload and its expiry time.

The current web implementation now also includes:

- dedicated QR setup route at `/teacher/sessions/start`
- browser-location request as a required setup step before session start
- classroom-detail handoff into `/teacher/sessions/start?classroomId=...`
- active control route at `/teacher/sessions/active/:sessionId`
- projector route at `/teacher/sessions/active/:sessionId/projector`
- 2-second live refresh for QR rotation checks, timer updates, and marked-student roster updates
- large QR control surface with visible timer, present/absent summary, and end-session control
- projector layout with the large rolling QR, timer, and room-facing marked-count summary

## Student Mobile QR Flow Expectations

The current student-mobile implementation now includes:

- QR route inside the existing student attendance group
- one short four-step mobile flow:
  - choose session
  - scan QR
  - confirm location
  - mark attendance
- manual QR payload entry for fallback testing when camera access is denied or unavailable
- device-build camera scanner integration seam using Expo Camera
- location capture through Expo Location only when the student reaches the location step
- concise result states for success, expired QR, invalid QR, session closed, low-accuracy GPS, out-of-range GPS, and duplicate marks
- successful mark submission through the real QR attendance API
- post-success refresh of dashboard, classroom, report, history, and trusted-device queries

## Failure Handling Expectations

Common failure reasons that must be supported include:

- session not found
- session not active
- QR expired
- QR invalid
- session mismatch in the QR payload
- out of allowed radius
- low GPS accuracy
- location anchor missing
- student not eligible
- duplicate attendance attempt

## Anti-Proxy Expectations

This mode must resist common abuse methods such as:

- sharing a screenshot of a QR
- reusing an old QR token
- marking attendance from outside the classroom zone
- submitting attendance multiple times
- attempting attendance from an untrusted student device

## Data Expectations

The session record for this mode must retain:

- mode as `QR_GPS`
- teacher, semester, class, section, subject, and classroom context
- session duration and scheduled end
- QR seed and QR rotation window
- GPS anchor type, label, coordinates, and resolved timestamp
- roster snapshot count
- present and absent counters
- attendance records linked to the session
- audit/outbox events for creation, end, expiry, and successful marks
- security events for suspicious location-validation failures without changing attendance truth

## Session End and Edit-Window Expectation

When a QR session ends manually or auto-expires, the backend must set:

- `endedAt`
- final session status
- `editableUntil = endedAt + 24 hours`

This is already required by the current backend so the later manual-edit phase can build on the same session truth.

Current hardening detail:

- timed-out sessions now auto-expire consistently during teacher polling and student mark attempts
- those auto-expiry paths still preserve the same `editableUntil` rule and final session truth

## Acceptance Expectations

This mode is successful when:

- the teacher can start it quickly from the web app
- students can mark attendance only while physically in the approved area
- expired or reused QR values stop working
- duplicate marks are rejected transactionally
- successful marks update session counters and downstream event streams
- suspicious GPS failures are logged for support/security review without changing the stored attendance result
- the final attendance list becomes available for later history, report, and export phases
